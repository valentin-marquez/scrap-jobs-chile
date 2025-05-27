// APIUX Tech Jobs Scraper
const BaseScraper = require('./base-scraper');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('node:fs');
const TurndownService = require('turndown');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
const { ContextParser } = require('jsonld-context-parser');

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
    this.contextParser = new ContextParser();

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
   * Limpiar texto de caracteres problemáticos de manera más robusta
   */
  cleanJsonText(text) {
    // Remover BOM si existe
    text = text.replace(/^\uFEFF/, '');
    
    // Estrategia más agresiva para limpiar caracteres problemáticos
    // Remover caracteres de control ASCII (0-31) excepto espacios permitidos
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Limpiar caracteres Unicode problemáticos adicionales
    text = text.replace(/[\u0080-\u009F]/g, ''); // Caracteres de control C1
    text = text.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Zero-width spaces y BOM
    
    // Normalizar espacios en blanco
    text = text.replace(/\s+/g, ' ');
    
    // Escapar caracteres que pueden causar problemas en JSON
    text = text.replace(/\n/g, '\\n');
    text = text.replace(/\r/g, '\\r');
    text = text.replace(/\t/g, '\\t');
    
    return text.trim();
  }

  /**
   * Extraer datos JSON-LD de la página de trabajo usando jsonld-context-parser
   */
  async extractJsonLd($) {
    try {
      const jsonLdScript = $('script[type="application/ld+json"]').first();
      if (jsonLdScript.length === 0) {
        console.log('⚠️ No se encontró script JSON-LD');
        return null;
      }

      let jsonText = jsonLdScript.html().trim();
      
      console.log('🔍 JSON-LD encontrado, procesando con jsonld-context-parser...');
      console.log('📝 Primeros 100 caracteres:', jsonText.substring(0, 100));

      // Limpiar caracteres problemáticos
      jsonText = this.cleanJsonText(jsonText);

      // Buscar el JSON válido dentro del contenido
      const jsonStart = jsonText.indexOf('{');
      const jsonEnd = jsonText.lastIndexOf('}');
      
      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        console.log('❌ No se encontraron delimitadores JSON válidos');
        return null;
      }

      jsonText = jsonText.substring(jsonStart, jsonEnd + 1);

      // Parsear el JSON directamente primero
      let jsonData;
      try {
        jsonData = JSON.parse(jsonText);
      } catch (parseError) {
        console.log('❌ Error parseando JSON básico:', parseError.message);
        return null;
      }

      // Verificar que sea un JobPosting
      if (!jsonData || jsonData['@type'] !== 'JobPosting') {
        console.log('⚠️ El JSON-LD no es un JobPosting válido');
        return null;
      }

      // Si tiene contexto, normalizarlo con jsonld-context-parser
      if (jsonData['@context']) {
        try {
          console.log('🔧 Normalizando contexto JSON-LD...');
          const normalizedContext = await this.contextParser.parse(jsonData['@context']);
          
          // Expandir términos clave usando el contexto normalizado
          const expandedData = {};
          
          for (const [key, value] of Object.entries(jsonData)) {
            if (key === '@context') continue;
            
            try {
              // Intentar expandir el término
              const expandedKey = normalizedContext.expandTerm(key, true);
              expandedData[expandedKey || key] = value;
            } catch (expandError) {
              // Si no se puede expandir, usar la clave original
              expandedData[key] = value;
            }
          }
          
          console.log('✅ JSON-LD normalizado exitosamente');
          
          return {
            title: expandedData.title || expandedData.name || jsonData.title,
            description: expandedData.description || jsonData.description,
            datePosted: expandedData.datePosted || jsonData.datePosted,
            employmentType: expandedData.employmentType || jsonData.employmentType,
            hiringOrganization: expandedData.hiringOrganization || jsonData.hiringOrganization,
            jobLocation: expandedData.jobLocation || jsonData.jobLocation,
            validThrough: expandedData.validThrough || jsonData.validThrough,
            identifier: expandedData.identifier || jsonData.identifier,
            originalData: jsonData,
            normalizedData: expandedData,
          };
        } catch (contextError) {
          console.log('⚠️ Error normalizando contexto, usando datos originales:', contextError.message);
        }
      }

      // Si no hay contexto o falló la normalización, usar los datos originales
      console.log('✅ JSON-LD básico extraído:', jsonData.title);
      return {
        title: jsonData.title,
        description: jsonData.description,
        datePosted: jsonData.datePosted,
        employmentType: jsonData.employmentType,
        hiringOrganization: jsonData.hiringOrganization,
        jobLocation: jsonData.jobLocation,
        validThrough: jsonData.validThrough,
        identifier: jsonData.identifier,
        originalData: jsonData,
      };

    } catch (error) {
      console.log('❌ Error general extrayendo JSON-LD:', error.message);
      return null;
    }
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

      jobElements.each((_i, element) => {
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

      // Intentar extraer datos JSON-LD primero
      const jsonLdData = this.extractJsonLd($);

      // Obtener título completo
      const titleElement = $('h1.font-company-header, h1.textFitted, h1');
      const fullTitle = titleElement.text().trim();

      // Extraer contenido principal
      let contentSection = $('section.pt-20.pb-12 .prose, .prose.font-company-body');

      if (contentSection.length === 0) {
        contentSection = $('.prose, .block-px, [data-controller="careersite--responsive-video"]');
      }

      let fullDescriptionHtml = contentSection.html() || '';
      let fullDescriptionMarkdown = '';

      // Usar descripción de JSON-LD si está disponible y es más completa
      if (jsonLdData?.description) {
        // Limpiar HTML entities y convertir a markdown
        const cleanDescription = jsonLdData.description
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&nbsp;/g, ' ')
          .replace(/&quot;/g, '"');

        fullDescriptionMarkdown = this.turndownService.turndown(cleanDescription);
      } else {
        fullDescriptionMarkdown = this.turndownService.turndown(fullDescriptionHtml);
      }

      // Extraer secciones específicas
      const sections = {};
      const functions = [];
      const requirements = [];
      const benefits = [];

      const extractSections = (container) => {
        container.find('h3, h2').each((_i, header) => {
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
      for (const title of Object.keys(sections)) {
        const sectionHtml = sections[title];
        const sectionElement = cheerio.load(sectionHtml);
        const lowercaseTitle = title.toLowerCase();

        if (lowercaseTitle.includes('funciones') || lowercaseTitle.includes('responsabilidades')) {
          sectionElement('li').each((_i, li) => {
            const text = sectionElement(li).text().trim();
            if (text) functions.push(text);
          });
        }

        if (
          lowercaseTitle.includes('esperamos') ||
          lowercaseTitle.includes('requisitos') ||
          lowercaseTitle.includes('perfil')
        ) {
          sectionElement('li').each((_i, li) => {
            const text = sectionElement(li).text().trim();
            if (text) requirements.push(text);
          });
        }

        if (lowercaseTitle.includes('beneficios') || lowercaseTitle.includes('ofrecemos')) {
          sectionElement('li').each((_i, li) => {
            const text = sectionElement(li).text().trim();
            if (text) benefits.push(text);
          });
        }
      }

      // Crear descripción completa usando datos JSON-LD cuando estén disponibles
      let completeDescription = `# ${jsonLdData?.title || fullTitle || job.title}\n\n`;

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

      // Extraer datos adicionales del JSON-LD
      let publishedDate = null;
      let location = job.location;
      let employmentType = job.jobType;
      let identifier = null;

      if (jsonLdData) {
        if (jsonLdData.datePosted) {
          publishedDate = new Date(jsonLdData.datePosted).toISOString();
        }
        if (
          jsonLdData.jobLocation &&
          Array.isArray(jsonLdData.jobLocation) &&
          jsonLdData.jobLocation.length > 0
        ) {
          const jobLoc = jsonLdData.jobLocation[0];
          if (jobLoc.address?.addressLocality) {
            location = `${jobLoc.address.addressLocality}, Chile`;
          }
        }
        if (jsonLdData.employmentType) {
          employmentType =
            jsonLdData.employmentType === 'FULL_TIME'
              ? 'Full-time'
              : jsonLdData.employmentType;
        }
        if (jsonLdData.identifier?.value) {
          identifier = jsonLdData.identifier.value;
        }
      }

      return {
        fullTitle: jsonLdData?.title || fullTitle,
        description: completeDescription,
        sections: {
          functions,
          requirements,
          benefits,
        },
        originalDescription: fullDescriptionMarkdown,
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
        originalDescription: '',
        jsonLdData: null,
        publishedDate: null,
        location: job.location,
        employmentType: job.jobType,
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

      // Usar datos mejorados del JSON-LD
      const publishedDate = rawJob.publishedDate || new Date().toISOString();
      const location = rawJob.location || 'Santiago, Chile';
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
          source: 'APIUX Tech TeamTailor',
          hasJsonLd: !!rawJob.jsonLdData,
        },
        details: {
          sections: rawJob.sections || {},
          jsonLdData: rawJob.jsonLdData,
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
