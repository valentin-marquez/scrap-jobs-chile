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
      ...config,
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
   * Extraer datos JSON-LD de la página de trabajo
   */
  extractJsonLd($) {
    let jsonText = '';
    try {
      const jsonLdScript = $('script[type="application/ld+json"]').first();
      if (jsonLdScript.length > 0) {
        jsonText = jsonLdScript.html().trim();
        
        // Limpiar caracteres problemáticos de manera más agresiva
        jsonText = jsonText
          .replace(/^\s*[\r\n\t\f\v]+/, '') // Remover whitespace al inicio
          .replace(/[\r\n\t\f\v]+\s*$/, '') // Remover whitespace al final
          .replace(/\r\n/g, '\\n')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t')
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remover caracteres de control
          .replace(/\\n\s*\\n/g, '\\n') // Remover dobles saltos de línea
          .replace(/^\uFEFF/, '') // Remover BOM si existe
          .trim();
        
        // Intentar encontrar el inicio real del JSON si hay caracteres extra
        const jsonStart = jsonText.indexOf('{');
        const jsonEnd = jsonText.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
        }
        
        console.log('🔍 JSON-LD encontrado, intentando parsear...');
        console.log('📝 Primeros 100 caracteres:', jsonText.substring(0, 100));
        
        // El problema parece ser que los \n no están siendo interpretados correctamente
        // Vamos a intentar un enfoque diferente: usar el contenido crudo sin procesar caracteres de escape
        let rawJsonText = jsonLdScript.html().trim();
        
        // Remover solo los caracteres de control problemáticos pero mantener saltos de línea reales
        rawJsonText = rawJsonText
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remover caracteres de control
          .replace(/^\uFEFF/, '') // Remover BOM si existe
          .trim();
        
        // Buscar el JSON válido dentro del contenido
        const rawJsonStart = rawJsonText.indexOf('{');
        const rawJsonEnd = rawJsonText.lastIndexOf('}');
        
        if (rawJsonStart !== -1 && rawJsonEnd !== -1 && rawJsonEnd > rawJsonStart) {
          rawJsonText = rawJsonText.substring(rawJsonStart, rawJsonEnd + 1);
        }
        
        console.log('🔧 Intentando con contenido crudo...');
        const jsonData = JSON.parse(rawJsonText);
        
        // Validar que sea un JobPosting
        if (jsonData['@type'] === 'JobPosting') {
          console.log('✅ JSON-LD válido extraído:', jsonData.title);
          return {
            title: jsonData.title,
            description: jsonData.description,
            datePosted: jsonData.datePosted,
            employmentType: jsonData.employmentType,
            hiringOrganization: jsonData.hiringOrganization,
            jobLocation: jsonData.jobLocation,
            validThrough: jsonData.validThrough,
            identifier: jsonData.identifier,
          };
        }
      }
    } catch (error) {
      console.log('❌ No se pudo extraer JSON-LD:', error.message.substring(0, 100));
      console.log('🔍 Contenido problemático (primeros 50 chars):', jsonText?.substring(0, 50));
    }
    return null;
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
        console.log(`📋 Obteniendo detalles ${i + 1}/${jobListings.length}: ${job.title}`);

        try {
          const details = await this.getJobDetails(job);
          const processedJob = this.processJob({ ...job, ...details }, 'Betterfly');
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
        const infoItems = jobInfo.split('·').map((item) => item.trim());

        for (const item of infoItems) {
          if (item.includes('Híbrido') || item.includes('Remoto') || item.includes('Presencial')) {
            workMode = item.replace(/[\n\t]/g, '').trim();
          } else if (
            item.includes('Chile') ||
            item.includes('México') ||
            item.includes('Colombia') ||
            item.includes('Perú')
          ) {
            location = item;
          } else {
            department = item;
          }
        }

        // Solo agregar trabajos en Chile
        if (location.includes('Chile') && title && fullJobUrl) {
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

      // Intentar extraer datos JSON-LD primero
      const jsonLdData = this.extractJsonLd($);

      // Obtener título completo
      const fullTitle = $('h1.font-company-header').text().trim();
      const shortDescription = $('h2.block.mt-2').text().trim();

      // Extraer contenido principal
      const contentSection = $('section.pt-20.pb-12 .prose');
      let fullDescriptionHtml = contentSection.html();
      let fullDescriptionMarkdown = '';

      // Usar descripción de JSON-LD si está disponible y es más completa
      if (jsonLdData && jsonLdData.description) {
        // Limpiar HTML entities y convertir a markdown
        const cleanDescription = jsonLdData.description
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&nbsp;/g, ' ')
          .replace(/&quot;/g, '"');

        fullDescriptionMarkdown = this.turndownService.turndown(cleanDescription);
      } else {
        fullDescriptionMarkdown = this.turndownService.turndown(fullDescriptionHtml || '');
      }

      // Extraer listas estructuradas
      const responsibilities = [];
      const requirements = [];
      const benefits = [];

      contentSection.find('ul').each((i, ul) => {
        const previousHeading = $(ul).prev('p').text().toLowerCase();

        if (
          previousHeading.includes('esperamos') ||
          previousHeading.includes('tareas') ||
          previousHeading.includes('responsabilidades')
        ) {
          $(ul)
            .find('li')
            .each((j, li) => {
              responsibilities.push($(li).text().trim());
            });
        } else if (
          previousHeading.includes('buscamos') ||
          previousHeading.includes('requisitos') ||
          previousHeading.includes('perfil')
        ) {
          $(ul)
            .find('li')
            .each((j, li) => {
              requirements.push($(li).text().trim());
            });
        } else if (
          previousHeading.includes('ofrecemos') ||
          previousHeading.includes('beneficios')
        ) {
          $(ul)
            .find('li')
            .each((j, li) => {
              benefits.push($(li).text().trim());
            });
        }
      });

      // Crear descripción completa
      let completeDescription = `# ${jsonLdData?.title || fullTitle}\n\n`;

      if (shortDescription) {
        completeDescription += `${shortDescription}\n\n`;
      }

      completeDescription += `${fullDescriptionMarkdown}\n\n`;

      if (responsibilities.length > 0) {
        completeDescription += `## Responsabilidades\n\n${responsibilities.map((r) => `- ${r}`).join('\n')}\n\n`;
      }

      if (requirements.length > 0) {
        completeDescription += `## Requisitos\n\n${requirements.map((r) => `- ${r}`).join('\n')}\n\n`;
      }

      if (benefits.length > 0) {
        completeDescription += `## Beneficios\n\n${benefits.map((b) => `- ${b}`).join('\n')}\n\n`;
      }

      // Extraer datos adicionales del JSON-LD
      let publishedDate = null;
      let location = job.location;
      let employmentType = job.jobType;
      let identifier = null;

      if (jsonLdData) {
        if (jsonLdData.datePosted) {
          publishedDate = new Date(jsonLdData.datePosted).toISOString();
        }
        if (jsonLdData.jobLocation && Array.isArray(jsonLdData.jobLocation) && jsonLdData.jobLocation.length > 0) {
          const jobLoc = jsonLdData.jobLocation[0];
          if (jobLoc.address?.addressLocality) {
            location = `${jobLoc.address.addressLocality}, Chile`;
          }
        }
        if (jsonLdData.employmentType) {
          employmentType = jsonLdData.employmentType === 'FULL_TIME' ? 'Full-time' : jsonLdData.employmentType;
        }
        if (jsonLdData.identifier?.value) {
          identifier = jsonLdData.identifier.value;
        }
      }

      return {
        fullTitle: jsonLdData?.title || fullTitle,
        description: completeDescription,
        sections: {
          responsibilities,
          requirements,
          benefits,
        },
        jsonLdData,
        publishedDate,
        location,
        employmentType,
        identifier,
      };
    } catch (error) {
      console.error(`Error obteniendo detalles de ${job.title}: ${error.message}`);
      return {
        description: '',
        sections: {},
        jsonLdData: null,
        publishedDate: null,
        location: job.location,
        employmentType: job.jobType,
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
          ...(rawJob.sections.benefits || []),
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
      if (titleLower.includes('manager') || titleLower.includes('gerente'))
        allTags.push('management');
      if (titleLower.includes('reemplazo') || titleLower.includes('temporal')) {
        allTags.push('temporal', 'reemplazo');
      }
      if (titleLower.includes('pre') && titleLower.includes('post') && titleLower.includes('natal')) {
        allTags.push('licencia-maternal', 'temporal');
      }

      // Usar datos mejorados del JSON-LD
      const publishedDate = rawJob.publishedDate || new Date().toISOString();
      const location = rawJob.location || 'Chile';
      const employmentType = rawJob.employmentType || 'Full-time';

      return {
        id: rawJob.identifier || this.generateJobId(rawJob),
        title: rawJob.fullTitle || rawJob.title,
        description: rawJob.description || '',
        company: companyName,
        location,
        jobType: employmentType,
        department: rawJob.department || '',
        publishedDate,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        jobUrl: rawJob.jobUrl,
        tags: [...new Set(allTags)],
        metadata: {
          scrapedAt: new Date().toISOString(),
          scraper: this.constructor.name,
          source: 'Betterfly Careers',
          hasJsonLd: !!rawJob.jsonLdData,
        },
        details: {
          sections: rawJob.sections || {},
          jsonLdData: rawJob.jsonLdData,
        },
      };
    } catch (error) {
      console.error(`Error procesando trabajo de Betterfly: ${error.message}`);
      this.errors.push({
        type: 'processing_error',
        message: error.message,
        job: rawJob,
      });
      return null;
    }
  }
}

module.exports = BetterflyScraper;
