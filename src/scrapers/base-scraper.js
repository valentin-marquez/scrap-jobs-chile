const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { extractTags, validateAndCleanTags, categorizeTags } = require('../utils/common_tags');

/**
 * Clase base para todos los scrapers
 * Proporciona funcionalidad común y estándar para el scraping de trabajos
 */
class BaseScraper {
  constructor(config = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 2000,
      timeout: 10000,
      maxAgeDays: 7,
      outputDir: './output',
      ...config
    };

    this.jobs = [];
    this.errors = [];
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Método abstracto que debe ser implementado por cada scraper
   */
  async scrape() {
    throw new Error('scrape() method must be implemented by subclass');
  }

  /**
   * Realizar petición HTTP con reintentos automáticos
   */
  async makeRequest(url, options = {}) {
    const {
      method = 'GET',
      headers = {},
      data = null,
      timeout = this.config.timeout
    } = options;

    let lastError;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`Intento ${attempt}/${this.config.maxRetries} para: ${url}`);

        const requestConfig = {
          method,
          url,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            ...headers
          },
          timeout,
          ...(data && { data })
        };

        const response = await axios(requestConfig);
        return response;

      } catch (error) {
        lastError = error;
        console.error(`Error en intento ${attempt}: ${error.message}`);

        if (error.response) {
          console.error(`  Status: ${error.response.status}`);
        }

        if (attempt < this.config.maxRetries) {
          console.log(`Esperando ${this.config.retryDelay/1000} segundos antes del siguiente intento...`);
          await this.delay(this.config.retryDelay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Función para esperar un tiempo determinado
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verificar si una fecha está dentro del rango de días especificado
   */
  isWithinDays(dateString, days = this.config.maxAgeDays) {
    try {
      const jobDate = new Date(dateString);
      const currentDate = new Date();
      const diffTime = currentDate - jobDate;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays <= days;
    } catch (error) {
      console.warn(`Warning: Could not parse date "${dateString}". Including job by default.`);
      return true;
    }
  }

  /**
   * Procesar y normalizar un trabajo individual
   */
  processJob(rawJob, companyName) {
    try {
      // Extraer tags del contenido
      const titleTags = extractTags(rawJob.title || '');
      const descriptionTags = extractTags(rawJob.description || '');
      const requirementsTags = extractTags(rawJob.requirements || '');

      // Combinar todos los tags y limpiarlos
      const allTags = [...titleTags, ...descriptionTags, ...requirementsTags];
      const cleanTags = validateAndCleanTags(allTags);

      // Categorizar tags
      const categorizedTags = categorizeTags(cleanTags);

      // Crear estructura normalizada
      const normalizedJob = {
        id: rawJob.id || this.generateJobId(rawJob),
        title: rawJob.title || '',
        description: rawJob.description || '',
        company: companyName,
        location: rawJob.location || '',
        jobType: rawJob.jobType || 'Full-time',
        department: rawJob.department || '',
        publishedDate: rawJob.publishedDate || new Date().toISOString(),
        expiresAt: rawJob.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        jobUrl: rawJob.jobUrl || '',
        tags: cleanTags,
        categorizedTags,
        metadata: {
          scrapedAt: new Date().toISOString(),
          scraper: this.constructor.name,
          source: rawJob.source || companyName
        },
        ...rawJob // Permitir campos adicionales específicos del scraper
      };

      return normalizedJob;
    } catch (error) {
      console.error(`Error processing job: ${error.message}`);
      this.errors.push({
        type: 'processing_error',
        message: error.message,
        job: rawJob
      });
      return null;
    }
  }

  /**
   * Generar ID único para un trabajo
   */
  generateJobId(job) {
    const source = `${job.title}-${job.company}-${job.location}`;
    return Buffer.from(source).toString('base64').substring(0, 16);
  }

  /**
   * Filtrar trabajos por criterios
   */
  filterJobs(jobs, filters = {}) {
    const {
      maxAge = this.config.maxAgeDays,
      requiredTags = [],
      excludeTags = [],
      locations = [],
      jobTypes = []
    } = filters;

    return jobs.filter(job => {
      // Filtro por edad
      if (maxAge && !this.isWithinDays(job.publishedDate, maxAge)) {
        return false;
      }

      // Filtro por tags requeridos
      if (requiredTags.length > 0) {
        const hasRequiredTag = requiredTags.some(tag =>
          job.tags.includes(tag.toLowerCase())
        );
        if (!hasRequiredTag) return false;
      }

      // Filtro por tags excluidos
      if (excludeTags.length > 0) {
        const hasExcludedTag = excludeTags.some(tag =>
          job.tags.includes(tag.toLowerCase())
        );
        if (hasExcludedTag) return false;
      }

      // Filtro por ubicación
      if (locations.length > 0) {
        const matchesLocation = locations.some(location =>
          job.location.toLowerCase().includes(location.toLowerCase())
        );
        if (!matchesLocation) return false;
      }

      // Filtro por tipo de trabajo
      if (jobTypes.length > 0) {
        const matchesJobType = jobTypes.some(type =>
          job.jobType.toLowerCase().includes(type.toLowerCase())
        );
        if (!matchesJobType) return false;
      }

      return true;
    });
  }

  /**
   * Guardar trabajos en archivo JSON
   */
  async saveJobs(filename, jobs = this.jobs) {
    try {
      // Crear directorio de salida si no existe
      if (!fs.existsSync(this.config.outputDir)) {
        fs.mkdirSync(this.config.outputDir, { recursive: true });
      }

      const filepath = path.join(this.config.outputDir, filename);
      const jsonData = JSON.stringify(jobs, null, 2);

      fs.writeFileSync(filepath, jsonData);
      console.log(`✅ ${jobs.length} trabajos guardados en: ${filepath}`);

      return filepath;
    } catch (error) {
      console.error(`Error guardando trabajos: ${error.message}`);
      this.errors.push({
        type: 'save_error',
        message: error.message,
        filename
      });
      throw error;
    }
  }

  /**
   * Generar estadísticas de scraping
   */
  generateStats() {
    const stats = {
      scraper: this.constructor.name,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.endTime - this.startTime,
      totalJobs: this.jobs.length,
      errors: this.errors.length,
      errorTypes: this.errors.reduce((acc, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1;
        return acc;
      }, {}),
      tags: this.getTagStatistics(),
      companies: this.getCompanyStatistics()
    };

    return stats;
  }

  /**
   * Obtener estadísticas de tags
   */
  getTagStatistics() {
    const tagCounts = {};
    this.jobs.forEach(job => {
      job.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .reduce((acc, [tag, count]) => {
        acc[tag] = count;
        return acc;
      }, {});
  }

  /**
   * Obtener estadísticas de empresas
   */
  getCompanyStatistics() {
    const companyCounts = {};
    this.jobs.forEach(job => {
      companyCounts[job.company] = (companyCounts[job.company] || 0) + 1;
    });

    return companyCounts;
  }

  /**
   * Ejecutar el proceso completo de scraping
   */
  async run(filters = {}) {
    try {
      console.log(`🚀 Iniciando scraper: ${this.constructor.name}`);
      this.startTime = new Date();

      // Ejecutar scraping específico
      await this.scrape();

      // Aplicar filtros si se proporcionan
      if (Object.keys(filters).length > 0) {
        const originalCount = this.jobs.length;
        this.jobs = this.filterJobs(this.jobs, filters);
        console.log(`📊 Filtros aplicados: ${originalCount} → ${this.jobs.length} trabajos`);
      }

      this.endTime = new Date();

      // Generar estadísticas
      const stats = this.generateStats();
      console.log(`✅ Scraping completado en ${stats.duration}ms`);
      console.log(`📈 Trabajos encontrados: ${stats.totalJobs}`);
      console.log(`❌ Errores: ${stats.errors}`);

      return {
        jobs: this.jobs,
        stats,
        errors: this.errors
      };

    } catch (error) {
      this.endTime = new Date();
      console.error(`❌ Error en scraper ${this.constructor.name}: ${error.message}`);
      this.errors.push({
        type: 'scraper_error',
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

module.exports = BaseScraper;