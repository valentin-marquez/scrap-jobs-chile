const BaseScraper = require('./base-scraper');
const cheerio = require('cheerio');
const TurndownService = require('turndown');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

/**
 * Scraper para trabajos de Betterfly
 * Obtiene ofertas laborales desde el portal de carreras de Betterfly
 */
class BetterflyScraper extends BaseScraper {
  constructor(config = {}) {
    super({
      maxRetries: 3,
      retryDelay: 2000,
      timeout: 10000,
      maxAgeDays: 7,
      ...config
    });

    // Configuración específica de Betterfly
    this.baseUrl = 'https://careers.betterfly.com';
    this.jobsUrl = `${this.baseUrl}/jobs`;
    this.turndownService = new TurndownService();

    // Cookie jar para manejar cookies
    this.jar = new CookieJar();
    this.client = wrapper(require('axios').create({ jar: this.jar }));
  }

  /**
   * Método principal de scraping
   */
  async scrape() {
    try {
      console.log('🔍 Obteniendo trabajos de Betterfly...');

      // Obtener lista de trabajos
      const jobListings = await this.getJobListings();
      console.log(`✅ Se encontraron ${jobListings.length} trabajos en Chile`);

      // Obtener detalles de cada trabajo
      for (let i = 0; i < jobListings.length; i++) {
        const job = jobListings[i];
        console.log(`📋 Obteniendo detalles ${i+1}/${jobListings.length}: ${job.title}`);

        try {
          const details = await this.getJobDetails(job);
          const processedJob = this.processJob({...job, ...details}, 'Betterfly');
          if (processedJob) {
            this.jobs.push(processedJob);
          }
        } catch (error) {
          console.error(`Error obteniendo detalles de ${job.title}: ${error.message}`);
          this.errors.push({
            type: 'job_detail_error',
            message: error.message,
            job: job.title
          });
        }

        // Pausa para evitar rate limiting
        if (i < jobListings.length - 1) {
          await this.delay(1000);
        }
      }

      console.log(`✅ Procesados ${this.jobs.length} trabajos de Betterfly`);

    } catch (error) {
      console.error(`Error en scraping de Betterfly: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener lista de trabajos
   */
  async getJobListings() {
    try {
      const response = await this.client.get(this.jobsUrl);
      const $ = cheerio.load(response.data);
      const jobs = [];

      $('#jobs_list_container li').each((i, element) => {
        const $element = $(element);
        const jobLink = $element.find('a').attr('href');
        const fullJobUrl = jobLink?.startsWith('http') ? jobLink : this.baseUrl + jobLink;
        const title = $element.find('.text-block-base-link').text().trim();

        // Extraer información del departamento, ubicación y modalidad
        let department = '';
        let location = '';
        let workMode = '';

        const jobInfo = $element.find('.text-md').text().trim();
        const infoItems = jobInfo.split('·').map(item => item.trim());

        infoItems.forEach(item => {
          if (item.includes('Híbrido') || item.includes('Remoto') || item.includes('Presencial')) {
            workMode = item.replace(/[\n\t]/g, '').trim();
          } else if (item.includes('Chile') || item.includes('México') ||
                    item.includes('Colombia') || item.includes('Perú')) {
            location = item;
          } else {
            department = item;
          }
        });

        // Solo agregar trabajos en Chile
        if (location.includes('Chile') && title && fullJobUrl) {
          jobs.push({
            title,
            jobUrl: fullJobUrl,
            department,
            location,
            jobType: workMode
          });
        }
      });

      return jobs;
    } catch (error) {
      console.error('Error obteniendo lista de trabajos de Betterfly:', error.message);
      return [];
    }
  }

  /**
   * Obtener detalles de un trabajo específico
   */
  async getJobDetails(job) {
    try {
      const response = await this.client.get(job.jobUrl);
      const $ = cheerio.load(response.data);

      // Obtener título completo
      const fullTitle = $('h1.font-company-header').text().trim();
      const shortDescription = $('h2.block.mt-2').text().trim();

      // Extraer contenido principal
      const contentSection = $('section.pt-20.pb-12 .prose');
      const fullDescriptionHtml = contentSection.html();
      const fullDescriptionMarkdown = this.turndownService.turndown(fullDescriptionHtml || '');

      // Extraer listas estructuradas
      const responsibilities = [];
      const requirements = [];
      const benefits = [];

      contentSection.find('ul').each((i, ul) => {
        const previousHeading = $(ul).prev('p').text().toLowerCase();

        if (previousHeading.includes('esperamos') ||
            previousHeading.includes('tareas') ||
            previousHeading.includes('responsabilidades')) {
          $(ul).find('li').each((j, li) => {
            responsibilities.push($(li).text().trim());
          });
        } else if (previousHeading.includes('buscamos') ||
                  previousHeading.includes('requisitos') ||
                  previousHeading.includes('perfil')) {
          $(ul).find('li').each((j, li) => {
            requirements.push($(li).text().trim());
          });
        } else if (previousHeading.includes('ofrecemos') ||
                  previousHeading.includes('beneficios')) {
          $(ul).find('li').each((j, li) => {
            benefits.push($(li).text().trim());
          });
        }
      });

      // Crear descripción completa
      let completeDescription = `# ${fullTitle}\n\n${shortDescription}\n\n`;
      completeDescription += `${fullDescriptionMarkdown}\n\n`;

      if (responsibilities.length > 0) {
        completeDescription += `## Responsabilidades\n\n${responsibilities.map(r => `- ${r}`).join('\n')}\n\n`;
      }

      if (requirements.length > 0) {
        completeDescription += `## Requisitos\n\n${requirements.map(r => `- ${r}`).join('\n')}\n\n`;
      }

      if (benefits.length > 0) {
        completeDescription += `## Beneficios\n\n${benefits.map(b => `- ${b}`).join('\n')}\n\n`;
      }

      return {
        fullTitle,
        description: completeDescription,
        sections: {
          responsibilities,
          requirements,
          benefits
        }
      };

    } catch (error) {
      console.error(`Error obteniendo detalles de ${job.title}: ${error.message}`);
      return {
        description: '',
        sections: {}
      };
    }
  }

  /**
   * Procesar trabajo específico de Betterfly
   */
  processJob(rawJob, companyName) {
    try {
      // Extraer tags del contenido
      const { extractTags } = require('../utils/common_tags');
      const titleTags = extractTags(rawJob.title || '');
      const descriptionTags = extractTags(rawJob.description || '');

      // Extraer tags de secciones
      let sectionTags = [];
      if (rawJob.sections) {
        const allSections = [
          ...(rawJob.sections.responsibilities || []),
          ...(rawJob.sections.requirements || []),
          ...(rawJob.sections.benefits || [])
        ];
        const sectionText = allSections.join(' ');
        sectionTags = extractTags(sectionText);
      }

      const allTags = [...new Set([...titleTags, ...descriptionTags, ...sectionTags])];

      // Agregar tags específicos basados en el título
      const titleLower = rawJob.title.toLowerCase();
      if (titleLower.includes('intern') || titleLower.includes('práctica')) {
        allTags.push('intern', 'internship', 'práctica');
      }
      if (titleLower.includes('senior')) allTags.push('senior');
      if (titleLower.includes('junior')) allTags.push('junior');
      if (titleLower.includes('líder') || titleLower.includes('lead')) allTags.push('leadership');
      if (titleLower.includes('manager') || titleLower.includes('gerente')) allTags.push('management');

      return {
        id: this.generateJobId(rawJob),
        title: rawJob.fullTitle || rawJob.title,
        description: rawJob.description || '',
        company: companyName,
        location: rawJob.location || 'Chile',
        jobType: rawJob.jobType || 'Full-time',
        department: rawJob.department || '',
        publishedDate: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        jobUrl: rawJob.jobUrl,
        tags: [...new Set(allTags)],
        metadata: {
          scrapedAt: new Date().toISOString(),
          scraper: this.constructor.name,
          source: 'Betterfly Careers'
        },
        details: {
          sections: rawJob.sections || {}
        }
      };
    } catch (error) {
      console.error(`Error procesando trabajo de Betterfly: ${error.message}`);
      this.errors.push({
        type: 'processing_error',
        message: error.message,
        job: rawJob
      });
      return null;
    }
  }
}

module.exports = BetterflyScraper;