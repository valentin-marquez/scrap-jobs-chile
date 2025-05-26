// Sonda Careers Web Scraper
const BaseScraper = require('./base-scraper');
const cheerio = require('cheerio');
const TurndownService = require('turndown');

/**
 * Scraper para trabajos de SONDA
 * Obtiene ofertas laborales desde el portal de carreras de SONDA
 */
class SonaScraper extends BaseScraper {
  constructor(config = {}) {
    super({
      maxRetries: 3,
      retryDelay: 2000,
      timeout: 10000,
      maxAgeDays: 7,
      ...config,
    });

    // Configuración específica de SONDA
    this.baseUrl = 'https://carrera.sonda.com';
    this.mainUrl =
      'https://carrera.sonda.com/go/Desarrollo-de-SW/8798400/?q=&q2=&alertId=&title=&location=Chile';
    this.turndownService = new TurndownService();
  }

  /**
   * Método principal de scraping
   */
  async scrape() {
    try {
      console.log('🔍 Obteniendo trabajos de SONDA...');

      // Obtener lista de trabajos
      const jobListings = await this.getJobListings();
      console.log(`✅ Se encontraron ${jobListings.length} trabajos`);

      // Obtener detalles de cada trabajo
      for (let i = 0; i < jobListings.length; i++) {
        const job = jobListings[i];
        console.log(`📋 Obteniendo detalles ${i + 1}/${jobListings.length}: ${job.title}`);

        try {
          const details = await this.getJobDetails(job);
          const processedJob = this.processJob({ ...job, ...details }, 'SONDA');
          if (processedJob) {
            this.jobs.push(processedJob);
          }
        } catch (error) {
          console.error(`Error obteniendo detalles de ${job.title}: ${error.message}`);
          this.errors.push({
            type: 'job_detail_error',
            message: error.message,
            job: job.title,
          });
        }

        // Pausa para evitar rate limiting
        if (i < jobListings.length - 1) {
          await this.delay(1000);
        }
      }

      console.log(`✅ Procesados ${this.jobs.length} trabajos de SONDA`);
    } catch (error) {
      console.error(`Error en scraping de SONDA: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener lista de trabajos
   */
  async getJobListings() {
    try {
      const response = await this.makeRequest(this.mainUrl);
      const $ = cheerio.load(response.data);
      const jobs = [];

      const jobRows = $('tr.data-row');
      console.log(`📝 Encontrados ${jobRows.length} trabajos listados`);

      for (let i = 0; i < jobRows.length; i++) {
        const row = jobRows[i];
        const title = $(row).find('.jobTitle a.jobTitle-link').first().text().trim();
        const link = this.baseUrl + $(row).find('.jobTitle a.jobTitle-link').first().attr('href');
        const location = $(row).find('.colLocation .jobLocation').first().text().trim();
        const department = $(row).find('.colDepartment .jobDepartment').first().text().trim();

        if (title && link) {
          jobs.push({
            title,
            jobUrl: link,
            location,
            department,
          });
        }
      }

      return jobs;
    } catch (error) {
      console.error('Error obteniendo lista de trabajos de SONDA:', error.message);
      return [];
    }
  }

  /**
   * Obtener detalles de un trabajo específico
   */
  async getJobDetails(job) {
    try {
      const response = await this.makeRequest(job.jobUrl);
      const $ = cheerio.load(response.data);

      // Extraer ID del trabajo
      const jobId = $('[data-careersite-propertyid="adcode"]').text().trim();

      // Extraer descripción del trabajo
      const jobDescriptionHtml = $('[data-careersite-propertyid="description"]').html();
      const jobDescription = jobDescriptionHtml
        ? this.turndownService.turndown(jobDescriptionHtml)
        : '';

      // Crear descripción completa estructurada
      let completeDescription = `# ${job.title}\n\n`;

      if (jobDescription) {
        completeDescription += `## Descripción\n\n${jobDescription}\n\n`;
      }

      completeDescription +=
        '## Sobre la Empresa\n\nSONDA es una empresa líder en servicios de tecnología de la información en Latinoamérica, con presencia en múltiples países de la región.\n\n';

      return {
        jobId,
        description: completeDescription,
        originalDescription: jobDescription,
      };
    } catch (error) {
      console.error(`Error obteniendo detalles de ${job.title}: ${error.message}`);
      return {
        description: '',
        originalDescription: '',
      };
    }
  }

  /**
   * Procesar trabajo específico de SONDA
   */
  processJob(rawJob, companyName) {
    try {
      // Extraer tags del contenido
      const { extractTags } = require('../utils/common_tags');
      const titleTags = extractTags(rawJob.title || '');
      const descriptionTags = extractTags(rawJob.originalDescription || '');

      const allTags = [...new Set([...titleTags, ...descriptionTags])];

      // Agregar tags específicos basados en el título
      const titleLower = rawJob.title.toLowerCase();
      if (titleLower.includes('práctica') || titleLower.includes('intern')) {
        allTags.push('intern', 'internship', 'práctica');
      }
      if (titleLower.includes('senior')) allTags.push('senior');
      if (titleLower.includes('junior')) allTags.push('junior');
      if (titleLower.includes('líder') || titleLower.includes('lead')) allTags.push('leadership');
      if (titleLower.includes('manager') || titleLower.includes('gerente'))
        allTags.push('management');

      return {
        id: rawJob.jobId || this.generateJobId(rawJob),
        title: rawJob.title,
        description: rawJob.description || '',
        company: companyName,
        location: rawJob.location || 'Chile',
        jobType: 'Full-time',
        department: rawJob.department || 'Desarrollo de Software',
        publishedDate: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        jobUrl: rawJob.jobUrl,
        tags: [...new Set(allTags)],
        metadata: {
          scrapedAt: new Date().toISOString(),
          scraper: this.constructor.name,
          source: 'SONDA Careers',
        },
      };
    } catch (error) {
      console.error(`Error procesando trabajo de SONDA: ${error.message}`);
      this.errors.push({
        type: 'processing_error',
        message: error.message,
        job: rawJob,
      });
      return null;
    }
  }
}

module.exports = SonaScraper;
