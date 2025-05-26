// Fintual Careers Web Scraper
const BaseScraper = require('./base-scraper');
const cheerio = require('cheerio');
const TurndownService = require('turndown');

/**
 * Scraper para trabajos de Fintual
 * Obtiene ofertas laborales desde múltiples páginas de Lever
 */
class FintualScraper extends BaseScraper {
  constructor(config = {}) {
    super({
      maxRetries: 3,
      retryDelay: 2000,
      timeout: 10000,
      maxAgeDays: 7,
      ...config
    });

    // Configuración específica de Fintual
    this.urls = [
      'https://jobs.lever.co/fintual?location=Chile&team=Producto',
      'https://jobs.lever.co/fintual?location=Chile&team=Devs',
      'https://jobs.lever.co/fintual?location=Chile&team=Ops',
      'https://jobs.lever.co/fintual?location=Gran%20Santiago%2C%20Regi%C3%B3n%20Metropolitana%20de%20Santiago&team=Producto',
      'https://jobs.lever.co/fintual?location=Gran%20Santiago%2C%20Regi%C3%B3n%20Metropolitana%20de%20Santiago&team=Devs',
      'https://jobs.lever.co/fintual?location=Gran%20Santiago%2C%20Regi%C3%B3n%20Metropolitana%20de%20Santiago&team=Ops',

    ];

    this.baseUrl = 'https://jobs.lever.co';
    this.turndownService = new TurndownService();
    this.processedJobs = new Map();
  }

  /**
   * Método principal de scraping
   */
  async scrape() {
    try {
      console.log('🔍 Obteniendo trabajos de Fintual...');

      const jobListings = [];

      // Procesar cada URL
      for (let i = 0; i < this.urls.length; i++) {
        const url = this.urls[i];
        console.log(`📄 Procesando página ${i+1}/${this.urls.length}: ${url}`);
        const pageJobs = await this.scrapeJobsPage(url);
        jobListings.push(...pageJobs);
      }

      console.log(`✅ Se encontraron ${jobListings.length} trabajos únicos`);

      // Obtener detalles de cada trabajo
      for (let i = 0; i < jobListings.length; i++) {
        const job = jobListings[i];
        console.log(`📋 Obteniendo detalles ${i+1}/${jobListings.length}: ${job.title}`);

        try {
          const details = await this.scrapeJobDetails(job);
          const processedJob = this.processJob({...job, ...details}, 'Fintual');
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

      console.log(`✅ Procesados ${this.jobs.length} trabajos de Fintual`);

    } catch (error) {
      console.error(`Error en scraping de Fintual: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener trabajos de una página específica
   */
  async scrapeJobsPage(url) {
    try {
      const response = await this.makeRequest(url);
      const $ = cheerio.load(response.data);
      const jobs = [];

      const postingGroups = $('.postings-group');
      console.log(`📝 Encontrados ${postingGroups.length} grupos de trabajos`);

      postingGroups.each((groupIndex, groupElement) => {
        const category = $(groupElement).find('.posting-category-title').text().trim();
        const postings = $(groupElement).find('.posting');

        postings.each((postingIndex, postingElement) => {
          const postingId = $(postingElement).attr('data-qa-posting-id');

          // Evitar duplicados
          if (this.processedJobs.has(postingId)) {
            return;
          }

          const title = $(postingElement).find('[data-qa="posting-name"]').text().trim();
          const jobUrl = $(postingElement).find('.posting-title').attr('href');

          // Extraer ubicación y equipo
          const categories = $(postingElement).find('.posting-categories .posting-category');
          let location = '';
          let team = '';

          categories.each((i, catElement) => {
            const categoryText = $(catElement).text().trim();
            if ($(catElement).hasClass('sort-by-location')) {
              location = categoryText;
            } else if ($(catElement).hasClass('sort-by-team')) {
              team = categoryText;
            }
          });

          jobs.push({
            id: postingId,
            title,
            jobUrl,
            location,
            team,
            category
          });

          this.processedJobs.set(postingId, true);
        });
      });

      return jobs;
    } catch (error) {
      console.error(`Error procesando página ${url}: ${error.message}`);
      return [];
    }
  }

  /**
   * Obtener detalles de un trabajo específico
   */
  async scrapeJobDetails(job) {
    try {
      const response = await this.makeRequest(job.jobUrl);
      const $ = cheerio.load(response.data);

      // Extraer información del headline
      const headline = $('.posting-headline').text().trim();

      // Extraer categorías
      const categories = {};
      $('.posting-categories .posting-category').each((i, element) => {
        const categoryClass = $(element).attr('class');
        const categoryText = $(element).text().trim();

        if (categoryClass.includes('location')) {
          categories.location = categoryText;
        } else if (categoryClass.includes('department')) {
          categories.department = categoryText.replace('/', '').trim();
        } else if (categoryClass.includes('commitment')) {
          categories.commitment = categoryText.replace('/', '').trim();
        } else if (categoryClass.includes('workplaceTypes')) {
          categories.workplaceType = categoryText;
        }
      });

      // Extraer descripción del trabajo
      const jobDescription = $('.section-wrapper .section[data-qa="job-description"]').html();
      const jobDescriptionMarkdown = this.turndownService.turndown(jobDescription || '');

      // Extraer secciones adicionales
      const sections = {};
      $('.section-wrapper .section:not([data-qa="job-description"]):not([data-qa="closing-description"]):not(.last-section-apply)').each((i, element) => {
        const sectionTitle = $(element).find('h3').text().trim();
        const sectionContent = $(element).html();
        if (sectionTitle) {
          sections[sectionTitle] = this.turndownService.turndown(sectionContent || '');
        }
      });

      // Extraer descripción de cierre
      const closingDescription = $('.section-wrapper .section[data-qa="closing-description"]').html();
      const closingDescriptionMarkdown = this.turndownService.turndown(closingDescription || '');

      // Crear descripción completa
      let completeDescription = `# ${job.title}\n\n## Descripción\n\n${jobDescriptionMarkdown}\n\n`;

      if (sections['Requisitos']) {
        completeDescription += `## Requisitos\n\n${sections['Requisitos']}\n\n`;
      }

      if (sections['Qué harás?']) {
        completeDescription += `## Responsabilidades\n\n${sections['Qué harás?']}\n\n`;
      }

      // Agregar otras secciones
      for (const [title, content] of Object.entries(sections)) {
        if (title !== 'Requisitos' && title !== 'Qué harás?') {
          completeDescription += `## ${title}\n\n${content}\n\n`;
        }
      }

      if (closingDescriptionMarkdown) {
        completeDescription += `## Beneficios\n\n${closingDescriptionMarkdown}\n\n`;
      }

      completeDescription += `## Sobre la Empresa\n\nFintual es una fintech que permite a cualquier persona invertir de forma simple y transparente. Nacimos con la idea de que cualquiera, sin importar el dinero que tenga, pueda invertir bien sus ahorros y hacer crecer su patrimonio.\n\n`;

      return {
        description: completeDescription,
        headline,
        categories,
        sections,
        closingDescription: closingDescriptionMarkdown
      };

    } catch (error) {
      console.error(`Error obteniendo detalles de ${job.title}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Procesar trabajo específico de Fintual
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
        const sectionText = Object.values(rawJob.sections).join(' ');
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
        id: rawJob.id,
        title: rawJob.title,
        description: rawJob.description || '',
        company: companyName,
        location: rawJob.location || 'Chile',
        jobType: rawJob.categories?.workplaceType || 'Full-time',
        department: rawJob.categories?.department || rawJob.category || rawJob.team || '',
        publishedDate: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        jobUrl: rawJob.jobUrl,
        tags: [...new Set(allTags)],
        metadata: {
          scrapedAt: new Date().toISOString(),
          scraper: this.constructor.name,
          source: 'Fintual Lever'
        },
        details: {
          headline: rawJob.headline,
          categories: rawJob.categories || {},
          sections: rawJob.sections || {},
          closingDescription: rawJob.closingDescription || ''
        }
      };
    } catch (error) {
      console.error(`Error procesando trabajo de Fintual: ${error.message}`);
      this.errors.push({
        type: 'processing_error',
        message: error.message,
        job: rawJob
      });
      return null;
    }
  }
}

module.exports = FintualScraper;