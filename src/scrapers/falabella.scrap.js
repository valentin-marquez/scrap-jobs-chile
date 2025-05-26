const BaseScraper = require('./base-scraper');

/**
 * Scraper para trabajos de Falabella
 * Obtiene ofertas laborales del área de Tecnología e Informática
 */
class FalabellaScraper extends BaseScraper {
  constructor(config = {}) {
    super({
      maxRetries: 3,
      retryDelay: 2000,
      timeout: 10000,
      maxAgeDays: 7,
      ...config,
    });

    // Configuración específica de Falabella
    this.authToken = '329E7hbFSYyGUJrFlk2DqmW6sirxjvt4T2Sh0jWReX8';
    this.apiUrl =
      'https://ftc-hr-tama-atrc.falabella.tech/bff-sgdt-job-offer/api/ofertalaboral/filter';
    this.filters = {
      country: ['Chile'],
      area: ['Tecnología e Informática'],
      company: [],
      jobtype: [],
      tags: [],
      search: '',
      page: 1,
      perPage: 100,
      type: 'external',
    };
  }

  /**
   * Método principal de scraping
   */
  async scrape() {
    try {
      console.log('🔍 Obteniendo trabajos de Falabella...');

      const headers = {
        authorization: this.authToken,
        'content-type': 'application/json',
        accept: 'application/json, text/plain, */*',
      };

      const response = await this.makeRequest(this.apiUrl, {
        method: 'POST',
        headers,
        data: this.filters,
      });

      if (response.status === 200 && response.data.data && response.data.data.list) {
        const rawJobs = response.data.data.list;
        console.log(`✅ Se obtuvieron ${rawJobs.length} trabajos de Falabella`);

        // Filtrar trabajos recientes
        const recentJobs = rawJobs.filter((job) =>
          this.isWithinDays(job.date, this.config.maxAgeDays)
        );
        console.log(
          `📅 ${recentJobs.length} trabajos dentro de los últimos ${this.config.maxAgeDays} días`
        );

        // Procesar cada trabajo
        this.jobs = recentJobs
          .map((job) => this.processJob(job, 'Falabella'))
          .filter((job) => job !== null);

        console.log(`✅ Procesados ${this.jobs.length} trabajos de Falabella`);
      } else {
        throw new Error('Respuesta inesperada de la API de Falabella');
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.error('❌ Token de autenticación expirado o inválido');
      } else if (error.response && error.response.status === 403) {
        console.error('❌ Acceso prohibido - IP bloqueada o endpoint cambiado');
      }
      throw error;
    }
  }

  /**
   * Procesar trabajo específico de Falabella
   */
  processJob(rawJob, companyName) {
    try {
      // Extraer y combinar tags de diferentes campos
      const { extractTags } = require('../utils/common_tags');
      const titleTags = extractTags(rawJob.title || '');
      const descriptionTags = extractTags(rawJob.description || '');
      const requirementsTags = extractTags(rawJob.requirements || '');
      const allTags = [...new Set([...titleTags, ...descriptionTags, ...requirementsTags])];

      return {
        id: rawJob.offer_id,
        title: rawJob.title,
        description: rawJob.description || '',
        company: companyName,
        location: `${rawJob.city}, ${rawJob.state}, ${rawJob.country}`,
        jobType: rawJob.jobtype || 'Full-time',
        department: rawJob.area || 'Tecnología e Informática',
        publishedDate: rawJob.date,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        jobUrl: rawJob.url,
        tags: allTags,
        metadata: {
          scrapedAt: new Date().toISOString(),
          scraper: this.constructor.name,
          source: 'Falabella API',
        },
        // Campos específicos de Falabella
        details: {
          headline: `${rawJob.title} - ${companyName} - ${rawJob.city}, ${rawJob.state}`,
          categories: {
            location: `${rawJob.city}, ${rawJob.state}, ${rawJob.country}`,
            department: rawJob.area || '',
            commitment: rawJob.jobtype || '',
            workplaceType: rawJob.job_location_type || '',
          },
          sections: {
            Requisitos: rawJob.requirements || '',
            Proceso: rawJob.process || '',
          },
        },
      };
    } catch (error) {
      console.error(`Error procesando trabajo de Falabella: ${error.message}`);
      this.errors.push({
        type: 'processing_error',
        message: error.message,
        job: rawJob,
      });
      return null;
    }
  }
}

module.exports = FalabellaScraper;
