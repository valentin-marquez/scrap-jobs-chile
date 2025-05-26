const fs = require('node:fs');
const path = require('node:path');
const { validateAndCleanTags } = require('../utils/common_tags');

/**
 * Pipeline unificado para ejecutar múltiples scrapers
 * Maneja la orquestación, consolidación y análisis de datos
 */
class ScrapingPipeline {
  constructor(config = {}) {
    this.config = {
      outputDir: './output',
      consolidatedFile: 'consolidated_jobs.json',
      statsFile: 'scraping_stats.json',
      parallel: false,
      maxConcurrent: 3,
      ...config,
    };

    this.scrapers = new Map();
    this.results = new Map();
    this.errors = [];
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Registrar un scraper en el pipeline
   */
  registerScraper(name, scraperInstance, config = {}) {
    if (!scraperInstance || typeof scraperInstance.run !== 'function') {
      throw new Error(`Scraper ${name} debe tener un método run()`);
    }

    this.scrapers.set(name, {
      instance: scraperInstance,
      config: {
        enabled: true,
        filters: {},
        priority: 1,
        ...config,
      },
    });

    console.log(`✅ Scraper '${name}' registrado en el pipeline`);
  }

  /**
   * Ejecutar todos los scrapers registrados
   */
  async run(globalFilters = {}) {
    try {
      console.log(`🚀 Iniciando pipeline con ${this.scrapers.size} scrapers`);
      this.startTime = new Date();

      // Crear directorio de salida
      this.ensureOutputDirectory();

      // Ejecutar scrapers
      if (this.config.parallel) {
        await this.runScrapersInParallel(globalFilters);
      } else {
        await this.runScrapersSequentially(globalFilters);
      }

      // Consolidar resultados
      const consolidatedJobs = await this.consolidateResults();

      // Aplicar filtros globales
      const filteredJobs = this.applyGlobalFilters(consolidatedJobs, globalFilters);

      // Guardar resultados
      await this.saveConsolidatedResults(filteredJobs);

      // Generar estadísticas
      const stats = this.generatePipelineStats(filteredJobs);
      await this.savePipelineStats(stats);

      this.endTime = new Date();

      console.log(`✅ Pipeline completado en ${stats.totalDuration}ms`);
      console.log(`📊 Total de trabajos: ${filteredJobs.length}`);
      console.log(`🏢 Empresas únicas: ${stats.uniqueCompanies}`);
      console.log(`🏷️ Tags únicos: ${stats.uniqueTags}`);

      return {
        jobs: filteredJobs,
        stats,
        results: this.results,
        errors: this.errors,
      };
    } catch (error) {
      this.endTime = new Date();
      console.error(`❌ Error en pipeline: ${error.message}`);
      this.errors.push({
        type: 'pipeline_error',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Ejecutar scrapers secuencialmente
   */
  async runScrapersSequentially(globalFilters) {
    const enabledScrapers = Array.from(this.scrapers.entries())
      .filter(([, config]) => config.config.enabled)
      .sort((a, b) => b[1].config.priority - a[1].config.priority);

    for (const [name, { instance, config }] of enabledScrapers) {
      try {
        console.log(`\n🔄 Ejecutando scraper: ${name}`);

        // Combinar filtros globales con filtros específicos del scraper
        const filters = { ...globalFilters, ...config.filters };

        const result = await instance.run(filters);
        this.results.set(name, {
          ...result,
          scraperName: name,
          executedAt: new Date().toISOString(),
        });

        console.log(`✅ ${name}: ${result.jobs.length} trabajos obtenidos`);
      } catch (error) {
        console.error(`❌ Error en scraper ${name}: ${error.message}`);
        this.errors.push({
          type: 'scraper_error',
          scraper: name,
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Ejecutar scrapers en paralelo
   */
  async runScrapersInParallel(globalFilters) {
    const enabledScrapers = Array.from(this.scrapers.entries()).filter(
      ([, config]) => config.config.enabled
    );

    // Dividir en lotes según maxConcurrent
    const batches = this.chunkArray(enabledScrapers, this.config.maxConcurrent);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(
        `\n🔄 Ejecutando lote ${batchIndex + 1}/${batches.length} (${batch.length} scrapers)`
      );

      const promises = batch.map(async ([name, { instance, config }]) => {
        try {
          const filters = { ...globalFilters, ...config.filters };
          const result = await instance.run(filters);

          this.results.set(name, {
            ...result,
            scraperName: name,
            executedAt: new Date().toISOString(),
          });

          console.log(`✅ ${name}: ${result.jobs.length} trabajos obtenidos`);
          return { name, success: true, jobCount: result.jobs.length };
        } catch (error) {
          console.error(`❌ Error en scraper ${name}: ${error.message}`);
          this.errors.push({
            type: 'scraper_error',
            scraper: name,
            message: error.message,
            timestamp: new Date().toISOString(),
          });
          return { name, success: false, error: error.message };
        }
      });

      await Promise.all(promises);
    }
  }

  /**
   * Consolidar resultados de todos los scrapers
   */
  async consolidateResults() {
    const allJobs = [];
    const seenJobs = new Set();

    for (const [scraperName, result] of this.results) {
      for (const job of result.jobs) {
        // Crear identificador único para detectar duplicados
        const jobSignature = this.createJobSignature(job);

        if (!seenJobs.has(jobSignature)) {
          seenJobs.add(jobSignature);

          // Agregar metadatos del pipeline
          const consolidatedJob = {
            ...job,
            metadata: {
              ...job.metadata,
              consolidatedAt: new Date().toISOString(),
              pipeline: this.constructor.name,
            },
          };

          allJobs.push(consolidatedJob);
        } else {
          console.log(`⚠️ Trabajo duplicado omitido: ${job.title} - ${job.company}`);
        }
      }
    }

    console.log(
      `🔗 Consolidados ${allJobs.length} trabajos únicos de ${this.results.size} scrapers`
    );
    return allJobs;
  }

  /**
   * Crear firma única para un trabajo
   */
  createJobSignature(job) {
    const signature = `${job.title.toLowerCase().trim()}-${job.company.toLowerCase().trim()}-${job.location.toLowerCase().trim()}`;
    return signature.replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Aplicar filtros globales a todos los trabajos
   */
  applyGlobalFilters(jobs, filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return jobs;
    }

    const originalCount = jobs.length;

    const filteredJobs = jobs.filter((job) => {
      // Filtro por tags requeridos
      if (filters.requiredTags && filters.requiredTags.length > 0) {
        const hasRequiredTag = filters.requiredTags.some((tag) =>
          job.tags.includes(tag.toLowerCase())
        );
        if (!hasRequiredTag) return false;
      }

      // Filtro por tags excluidos
      if (filters.excludeTags && filters.excludeTags.length > 0) {
        const hasExcludedTag = filters.excludeTags.some((tag) =>
          job.tags.includes(tag.toLowerCase())
        );
        if (hasExcludedTag) return false;
      }

      // Filtro por ubicaciones
      if (filters.locations && filters.locations.length > 0) {
        const matchesLocation = filters.locations.some((location) =>
          job.location.toLowerCase().includes(location.toLowerCase())
        );
        if (!matchesLocation) return false;
      }

      // Filtro por empresas
      if (filters.companies && filters.companies.length > 0) {
        const matchesCompany = filters.companies.some((company) =>
          job.company.toLowerCase().includes(company.toLowerCase())
        );
        if (!matchesCompany) return false;
      }

      return true;
    });

    console.log(
      `🔍 Filtros globales aplicados: ${originalCount} → ${filteredJobs.length} trabajos`
    );
    return filteredJobs;
  }

  /**
   * Generar estadísticas del pipeline
   */
  generatePipelineStats(jobs) {
    const stats = {
      pipeline: this.constructor.name,
      executedAt: new Date().toISOString(),
      totalDuration: this.endTime - this.startTime,
      scrapers: {
        total: this.scrapers.size,
        executed: this.results.size,
        errors: this.errors.filter((e) => e.type === 'scraper_error').length,
      },
      jobs: {
        total: jobs.length,
        byCompany: this.getJobsByCompany(jobs),
        byLocation: this.getJobsByLocation(jobs),
        byDepartment: this.getJobsByDepartment(jobs),
      },
      tags: {
        total: this.getUniqueTags(jobs).length,
        topTags: this.getTopTags(jobs, 20),
        byCategory: this.getTagsByCategory(jobs),
      },
      uniqueCompanies: [...new Set(jobs.map((job) => job.company))].length,
      uniqueTags: this.getUniqueTags(jobs).length,
      errors: this.errors,
    };

    return stats;
  }

  /**
   * Métodos auxiliares para estadísticas
   */
  getJobsByCompany(jobs) {
    return jobs.reduce((acc, job) => {
      acc[job.company] = (acc[job.company] || 0) + 1;
      return acc;
    }, {});
  }

  getJobsByLocation(jobs) {
    return jobs.reduce((acc, job) => {
      acc[job.location] = (acc[job.location] || 0) + 1;
      return acc;
    }, {});
  }

  getJobsByDepartment(jobs) {
    return jobs.reduce((acc, job) => {
      const dept = job.department || 'Sin especificar';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});
  }

  getUniqueTags(jobs) {
    const allTags = new Set();
    for (const job of jobs) {
      for (const tag of job.tags) {
        allTags.add(tag);
      }
    }
    return Array.from(allTags);
  }

  getTopTags(jobs, limit = 20) {
    const tagCounts = {};
    for (const job of jobs) {
      for (const tag of job.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .reduce((acc, [tag, count]) => {
        acc[tag] = count;
        return acc;
      }, {});
  }

  getTagsByCategory(jobs) {
    const categories = {
      languages: new Set(),
      frameworks: new Set(),
      databases: new Set(),
      cloud: new Set(),
      other: new Set(),
    };

    for (const job of jobs) {
      if (job.categorizedTags) {
        for (const category of Object.keys(categories)) {
          if (job.categorizedTags[category]) {
            for (const tag of job.categorizedTags[category]) {
              categories[category].add(tag);
            }
          }
        }
      }
    }

    // Convertir Sets a arrays con conteos
    const result = {};
    for (const category of Object.keys(categories)) {
      result[category] = Array.from(categories[category]);
    }

    return result;
  }

  /**
   * Métodos auxiliares
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  ensureOutputDirectory() {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  async saveConsolidatedResults(jobs) {
    const filepath = path.join(this.config.outputDir, this.config.consolidatedFile);
    const jsonData = JSON.stringify(jobs, null, 2);

    fs.writeFileSync(filepath, jsonData);
    console.log(`💾 Resultados consolidados guardados: ${filepath}`);

    return filepath;
  }

  async savePipelineStats(stats) {
    const filepath = path.join(this.config.outputDir, this.config.statsFile);
    const jsonData = JSON.stringify(stats, null, 2);

    fs.writeFileSync(filepath, jsonData);
    console.log(`📊 Estadísticas guardadas: ${filepath}`);

    return filepath;
  }

  /**
   * Obtener información del estado del pipeline
   */
  getStatus() {
    return {
      scrapers: this.scrapers.size,
      results: this.results.size,
      errors: this.errors.length,
      isRunning: this.startTime && !this.endTime,
      lastRun: this.endTime || this.startTime,
    };
  }
}

module.exports = ScrapingPipeline;
