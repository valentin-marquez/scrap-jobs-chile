// APIUX Tech Jobs Scraper
const BaseScraper = require('./base-scraper');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('node:fs');
const TurndownService = require('turndown');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

/**
 * Scraper para trabajos de APIUX Tech
 * Obtiene ofertas laborales desde el portal de TeamTailor de APIUX
 */
class ApiuxTechScraper extends BaseScraper {
  constructor(config = {}) {
    super({
      maxRetries: 3,
      retryDelay: 2000,
      timeout: 10000,
      maxAgeDays: 7,
      ...config,
    });

    // Configuración específica de APIUX Tech
    this.baseUrl = 'https://apiuxtech.na.teamtailor.com';
    this.jobsUrl = `${this.baseUrl}/jobs`;
    this.turndownService = new TurndownService();

    // Cookie jar para manejar cookies
    this.jar = new CookieJar();
    this.client = wrapper(
      axios.create({
        jar: this.jar,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
        },
        timeout: 10000,
      })
    );
  }

  /**
   * Método principal de scraping
   */
  async scrape() {
    try {
      console.log('🔍 Obteniendo trabajos de APIUX Tech...');

      // Obtener lista de trabajos
      const jobListings = await this.getJobListings();
      console.log(`✅ Se encontraron ${jobListings.length} trabajos en Santiago/Chile`);

      // Obtener detalles de cada trabajo
      for (let i = 0; i < jobListings.length; i++) {
        const job = jobListings[i];
        console.log(`📋 Obteniendo detalles ${i + 1}/${jobListings.length}: ${job.title}`);

        try {
          const details = await this.getJobDetails(job);
          const processedJob = this.processJob({ ...job, ...details }, 'APIUX');
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

        // Pausa más larga para APIUX para evitar rate limiting
        if (i < jobListings.length - 1) {
          await this.delay(2000);
        }
      }

      console.log(`✅ Procesados ${this.jobs.length} trabajos de APIUX Tech`);
    } catch (error) {
      console.error(`Error en scraping de APIUX Tech: ${error.message}`);
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

      const jobElements = $('#jobs_list_container li');
      console.log(`📝 Encontrados ${jobElements.length} elementos de trabajo`);

      jobElements.each((i, element) => {
        const $element = $(element);
        const jobLink = $element.find('a').attr('href');
        const title = $element.find('.text-block-base-link, span[title]').text().trim();

        if (!jobLink || !title) {
          return;
        }

        const fullJobUrl = jobLink.startsWith('http') ? jobLink : `${this.baseUrl}${jobLink}`;

        // Extraer información del departamento, ubicación y modalidad
        let department = '';
        let location = '';
        let workMode = '';

        const jobInfoElement = $element.find('.mt-1.text-md, div.text-md');
        const jobInfo = jobInfoElement.text().trim();
        const infoItems = jobInfo.split('·').map((item) => item.trim());

        if (infoItems.length > 0) department = infoItems[0];
        if (infoItems.length > 1) location = infoItems[1];
        if (infoItems.length > 2) workMode = infoItems[2].replace(/[\n\t]/g, '').trim();

        // Solo agregar si el trabajo es en Santiago o Chile
        if (location.includes('Santiago') || location.includes('Chile')) {
          jobs.push({
            title,
            jobUrl: fullJobUrl,
            department,
            location,
            jobType: workMode,
          });
        }
      });

      return jobs;
    } catch (error) {
      console.error('Error obteniendo lista de trabajos de APIUX Tech:', error.message);
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
      const titleElement = $('h1.font-company-header, h1.textFitted, h1');
      const fullTitle = titleElement.text().trim();

      // Extraer contenido principal
      let contentSection = $('section.pt-20.pb-12 .prose, .prose.font-company-body');

      if (contentSection.length === 0) {
        contentSection = $('.prose, .block-px, [data-controller="careersite--responsive-video"]');
      }

      const fullDescriptionHtml = contentSection.html() || '';
      const fullDescriptionMarkdown = this.turndownService.turndown(fullDescriptionHtml);

      // Extraer secciones específicas
      const sections = {};
      const functions = [];
      const requirements = [];
      const benefits = [];

      const extractSections = (container) => {
        container.find('h3, h2').each((i, header) => {
          const sectionTitle = $(header).text().trim();
          let sectionContent = '';

          let nextElement = $(header).next();
          while (nextElement.length && !nextElement.is('h3, h2')) {
            sectionContent += nextElement.prop('outerHTML') || '';
            nextElement = nextElement.next();
          }

          if (sectionContent) {
            sections[sectionTitle] = sectionContent;
          }
        });
      };

      if (contentSection.length > 0) {
        extractSections(contentSection);
      }

      // Procesar secciones para extraer listas
      Object.keys(sections).forEach((title) => {
        const sectionHtml = sections[title];
        const sectionElement = cheerio.load(sectionHtml);
        const lowercaseTitle = title.toLowerCase();

        if (lowercaseTitle.includes('funciones') || lowercaseTitle.includes('responsabilidades')) {
          sectionElement('li').each((i, li) => {
            const text = sectionElement(li).text().trim();
            if (text) functions.push(text);
          });
        }

        if (
          lowercaseTitle.includes('esperamos') ||
          lowercaseTitle.includes('requisitos') ||
          lowercaseTitle.includes('perfil')
        ) {
          sectionElement('li').each((i, li) => {
            const text = sectionElement(li).text().trim();
            if (text) requirements.push(text);
          });
        }

        if (lowercaseTitle.includes('beneficios') || lowercaseTitle.includes('ofrecemos')) {
          sectionElement('li').each((i, li) => {
            const text = sectionElement(li).text().trim();
            if (text) benefits.push(text);
          });
        }
      });

      // Crear descripción completa
      let completeDescription = `# ${fullTitle || job.title}\n\n`;

      if (functions.length > 0) {
        completeDescription += `## Funciones\n\n${functions.map((f) => `- ${f}`).join('\n')}\n\n`;
      }

      if (requirements.length > 0) {
        completeDescription += `## Requisitos\n\n${requirements.map((r) => `- ${r}`).join('\n')}\n\n`;
      }

      if (benefits.length > 0) {
        completeDescription += `## Beneficios\n\n${benefits.map((b) => `- ${b}`).join('\n')}\n\n`;
      }

      // Si no hay secciones específicas, usar la descripción completa
      if (functions.length === 0 && requirements.length === 0 && benefits.length === 0) {
        completeDescription += fullDescriptionMarkdown;
      }

      return {
        fullTitle,
        description: completeDescription,
        sections: {
          functions,
          requirements,
          benefits,
        },
        originalDescription: fullDescriptionMarkdown,
      };
    } catch (error) {
      console.error(`Error obteniendo detalles de ${job.title}: ${error.message}`);
      return {
        description: '',
        sections: {},
        originalDescription: '',
      };
    }
  }

  /**
   * Procesar trabajo específico de APIUX Tech
   */
  processJob(rawJob, companyName) {
    try {
      // Extraer tags del contenido
      const { extractTags } = require('../utils/common_tags');
      const titleTags = extractTags(rawJob.title || '');
      const descriptionTags = extractTags(rawJob.originalDescription || '');

      // Extraer tags de secciones
      let sectionTags = [];
      if (rawJob.sections) {
        const allSections = [
          ...(rawJob.sections.functions || []),
          ...(rawJob.sections.requirements || []),
          ...(rawJob.sections.benefits || []),
        ];
        const sectionText = allSections.join(' ');
        sectionTags = extractTags(sectionText);
      }

      const allTags = [...new Set([...titleTags, ...descriptionTags, ...sectionTags])];

      // Agregar tags específicos basados en el título
      const titleLower = rawJob.title.toLowerCase();
      if (titleLower.includes('junior')) allTags.push('junior');
      if (titleLower.includes('senior')) allTags.push('senior');
      if (titleLower.includes('full') && titleLower.includes('stack')) allTags.push('fullstack');
      if (
        titleLower.includes('frontend') ||
        titleLower.includes('front-end') ||
        titleLower.includes('front end')
      ) {
        allTags.push('frontend');
      }
      if (
        titleLower.includes('backend') ||
        titleLower.includes('back-end') ||
        titleLower.includes('back end')
      ) {
        allTags.push('backend');
      }

      return {
        id: this.generateJobId(rawJob),
        title: rawJob.fullTitle || rawJob.title,
        description: rawJob.description || '',
        company: companyName,
        location: rawJob.location || 'Santiago, Chile',
        jobType: rawJob.jobType || 'Full-time',
        department: rawJob.department || '',
        publishedDate: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        jobUrl: rawJob.jobUrl,
        tags: [...new Set(allTags)],
        metadata: {
          scrapedAt: new Date().toISOString(),
          scraper: this.constructor.name,
          source: 'APIUX Tech TeamTailor',
        },
        details: {
          sections: rawJob.sections || {},
        },
      };
    } catch (error) {
      console.error(`Error procesando trabajo de APIUX Tech: ${error.message}`);
      this.errors.push({
        type: 'processing_error',
        message: error.message,
        job: rawJob,
      });
      return null;
    }
  }
}

module.exports = ApiuxTechScraper;
