// Desafío Latam Careers Web Scraper
const BaseScraper = require('./base-scraper');
const cheerio = require('cheerio');
const TurndownService = require('turndown');

/**
 * Scraper para trabajos de Desafío Latam
 * Obtiene ofertas laborales desde Lever
 */
class DesafioLatamScraper extends BaseScraper {
  constructor(config = {}) {
    super({
      maxRetries: 3,
      retryDelay: 2000,
      timeout: 10000,
      maxAgeDays: 7,
      ...config,
    });

    // Configuración específica de Desafío Latam
    this.urls = ['https://jobs.lever.co/desafiolatam'];

    this.baseUrl = 'https://jobs.lever.co';
    this.turndownService = new TurndownService();
    this.processedJobs = new Map();
  }

  /**
   * Extraer datos JSON-LD de la página de trabajo
   */
  extractJsonLd($) {
    try {
      const jsonLdScript = $('script[type="application/ld+json"]').first();
      if (jsonLdScript.length > 0) {
        let jsonText = jsonLdScript.html().trim();
        
        // Limpiar caracteres de control y problemas comunes
        jsonText = jsonText
          .replace(/\r\n/g, '\\n')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t')
          .replace(/[\x00-\x1F\x7F]/g, '') // Remover caracteres de control
          .replace(/\\n\s*\\n/g, '\\n') // Remover dobles saltos de línea
          .trim();
        
        console.log('🔍 JSON-LD encontrado, intentando parsear...');
        const jsonData = JSON.parse(jsonText);
        
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
    }
    return null;
  }

  /**
   * Método principal de scraping
   */
  async scrape() {
    try {
      console.log('🔍 Obteniendo trabajos de Desafío Latam...');

      const jobListings = [];

      // Procesar cada URL
      for (let i = 0; i < this.urls.length; i++) {
        const url = this.urls[i];
        console.log(`📄 Procesando página ${i + 1}/${this.urls.length}: ${url}`);
        const pageJobs = await this.scrapeJobsPage(url);
        jobListings.push(...pageJobs);
      }

      console.log(`✅ Se encontraron ${jobListings.length} trabajos únicos`);

      // Obtener detalles de cada trabajo
      for (let i = 0; i < jobListings.length; i++) {
        const job = jobListings[i];
        console.log(`📋 Obteniendo detalles ${i + 1}/${jobListings.length}: ${job.title}`);

        try {
          const details = await this.scrapeJobDetails(job);
          const processedJob = this.processJob({ ...job, ...details }, 'Desafío Latam');
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

      console.log(`✅ Procesados ${this.jobs.length} trabajos de Desafío Latam`);
    } catch (error) {
      console.error(`Error en scraping de Desafío Latam: ${error.message}`);
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
        // Obtener la categoría del grupo
        const largeCategory = $(groupElement).find('.large-category-header').text().trim();
        const category = $(groupElement).find('.posting-category-title').text().trim();
        const departmentName = largeCategory || category;

        const postings = $(groupElement).find('.posting');
        console.log(`  📂 Departamento "${departmentName}": ${postings.length} trabajos`);

        postings.each((postingIndex, postingElement) => {
          const postingId = $(postingElement).attr('data-qa-posting-id');

          // Evitar duplicados
          if (this.processedJobs.has(postingId)) {
            return;
          }

          const title = $(postingElement).find('[data-qa="posting-name"]').text().trim();
          const jobUrl = $(postingElement).find('.posting-title').attr('href');

          // Extraer información de las categorías
          const categories = $(postingElement).find('.posting-categories span');
          let workplaceType = '';
          let commitment = '';
          let location = '';

          categories.each((i, catElement) => {
            const categoryText = $(catElement).text().trim();
            const categoryClass = $(catElement).attr('class') || '';

            if (categoryClass.includes('workplaceTypes')) {
              workplaceType = categoryText.replace(/[^\w\s]/g, '').trim(); // Remover caracteres especiales
            } else if (categoryClass.includes('commitment')) {
              commitment = categoryText;
            } else if (categoryClass.includes('location')) {
              location = categoryText;
            }
          });

          const job = {
            id: postingId,
            title,
            jobUrl,
            location: location || 'Chile',
            department: departmentName,
            workplaceType,
            commitment,
            category: departmentName,
          };

          jobs.push(job);
          this.processedJobs.set(postingId, true);

          console.log(`    ✓ ${title} - ${location} (${workplaceType})`);
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

      // Intentar extraer datos JSON-LD primero
      const jsonLdData = this.extractJsonLd($);

      // Extraer información del headline
      const headline = $('.posting-headline').text().trim();

      // Extraer categorías detalladas
      const categories = {};
      $('.posting-categories .posting-category').each((i, element) => {
        const categoryClass = $(element).attr('class');
        const categoryText = $(element).text().trim();

        if (categoryClass?.includes('location')) {
          categories.location = categoryText;
        } else if (categoryClass?.includes('department')) {
          categories.department = categoryText.replace('/', '').trim();
        } else if (categoryClass?.includes('commitment')) {
          categories.commitment = categoryText.replace('/', '').trim();
        } else if (categoryClass?.includes('workplaceTypes')) {
          categories.workplaceType = categoryText.replace(/[^\w\s]/g, '').trim();
        }
      });

      // Extraer descripción del trabajo
      const jobDescription = $('.section-wrapper .section[data-qa="job-description"]').html();
      let jobDescriptionText = '';

      // Usar descripción de JSON-LD si está disponible, sino usar la extraída
      if (jsonLdData && jsonLdData.description) {
        // Limpiar HTML entities en la descripción JSON-LD
        jobDescriptionText = jsonLdData.description
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/\\n/g, '\n')
          .replace(/<[^>]*>/g, '') // Remover tags HTML
          .trim();
      } else {
        jobDescriptionText = this.turndownService.turndown(jobDescription || '');
      }

      // Extraer secciones adicionales
      const sections = {};
      $(
        '.section-wrapper .section:not([data-qa="job-description"]):not([data-qa="closing-description"]):not(.last-section-apply)'
      ).each((i, element) => {
        const sectionTitle = $(element).find('h3').text().trim();
        const sectionContent = $(element).html();
        if (sectionTitle) {
          sections[sectionTitle] = this.turndownService.turndown(sectionContent || '');
        }
      });

      // Extraer descripción de cierre
      const closingDescription = $(
        '.section-wrapper .section[data-qa="closing-description"]'
      ).html();
      const closingDescriptionMarkdown = this.turndownService.turndown(closingDescription || '');

      // Crear descripción completa
      let completeDescription = `# ${jsonLdData?.title || job.title}\n\n## Descripción\n\n${jobDescriptionText}\n\n`;

      // Agregar secciones comunes de Desafío Latam
      if (sections.Requisitos || sections['Requisitos mínimos']) {
        completeDescription += `## Requisitos\n\n${sections.Requisitos || sections['Requisitos mínimos']}\n\n`;
      }

      if (sections['Funciones principales'] || sections.Responsabilidades) {
        completeDescription += `## Funciones principales\n\n${sections['Funciones principales'] || sections.Responsabilidades}\n\n`;
      }

      if (sections['Qué ofrecemos'] || sections.Beneficios) {
        completeDescription += `## Qué ofrecemos\n\n${sections['Qué ofrecemos'] || sections.Beneficios}\n\n`;
      }

      // Agregar otras secciones no procesadas
      for (const [title, content] of Object.entries(sections)) {
        if (
          ![
            'Requisitos',
            'Requisitos mínimos',
            'Funciones principales',
            'Responsabilidades',
            'Qué ofrecemos',
            'Beneficios',
          ].includes(title)
        ) {
          completeDescription += `## ${title}\n\n${content}\n\n`;
        }
      }

      if (closingDescriptionMarkdown) {
        completeDescription += `## Información adicional\n\n${closingDescriptionMarkdown}\n\n`;
      }

      completeDescription +=
        '## Sobre la Empresa\n\nDesafío Latam es una institución educativa líder en Latinoamérica especializada en tecnología y transformación digital. Ofrecemos programas de capacitación en áreas como Data Science, Desarrollo Web, UX/UI y más, con el objetivo de formar profesionales preparados para los desafíos del futuro digital.\n\n';

      // Extraer fecha de publicación y ubicación desde JSON-LD
      let publishedDate = null;
      let location = categories.location || job.location;
      let employmentType = categories.commitment || job.commitment;

      if (jsonLdData) {
        if (jsonLdData.datePosted) {
          publishedDate = new Date(jsonLdData.datePosted).toISOString();
        }
        if (jsonLdData.jobLocation?.address?.addressLocality) {
          location = jsonLdData.jobLocation.address.addressLocality;
        }
        if (jsonLdData.employmentType) {
          employmentType = jsonLdData.employmentType;
        }
      }

      return {
        description: completeDescription,
        headline,
        categories,
        sections,
        closingDescription: closingDescriptionMarkdown,
        jsonLdData,
        publishedDate,
        location,
        employmentType,
      };
    } catch (error) {
      console.error(`Error obteniendo detalles de ${job.title}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Procesar trabajo específico de Desafío Latam
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

      // Agregar tags específicos basados en el título y contexto de Desafío Latam
      const titleLower = rawJob.title.toLowerCase();

      // Tags de nivel
      if (titleLower.includes('senior') || titleLower.includes('líder')) allTags.push('senior', 'leadership');
      if (titleLower.includes('junior')) allTags.push('junior');

      // Tags de modalidad
      if (titleLower.includes('remoto') || rawJob.workplaceType?.toLowerCase().includes('remote')) {
        allTags.push('remote', 'trabajo-remoto');
      }
      if (
        titleLower.includes('presencial') ||
        rawJob.workplaceType?.toLowerCase().includes('on-site')
      ) {
        allTags.push('presencial', 'on-site');
      }
      if (
        titleLower.includes('híbrido') ||
        rawJob.workplaceType?.toLowerCase().includes('hybrid')
      ) {
        allTags.push('hybrid', 'híbrido');
      }

      // Tags específicos de educación/tecnología
      if (titleLower.includes('docente') || titleLower.includes('profesor')) {
        allTags.push('docente', 'educación', 'profesor');
      }
      if (titleLower.includes('territorial') || titleLower.includes('territorio')) {
        allTags.push('territorial', 'gestión-territorial');
      }
      if (titleLower.includes('proyecto')) {
        allTags.push('gestión-proyectos', 'project-management');
      }
      if (titleLower.includes('backup')) {
        allTags.push('backup', 'suplente');
      }

      // Tags de áreas específicas
      if (titleLower.includes('talento digital')) {
        allTags.push('talento-digital', 'capacitación-digital');
      }
      if (titleLower.includes('seguridad') && titleLower.includes('redes')) {
        allTags.push('cybersecurity', 'network-security', 'seguridad-informatica');
      }

      // Usar fecha de publicación de JSON-LD si está disponible
      const publishedDate = rawJob.publishedDate || new Date().toISOString();
      
      // Usar ubicación mejorada
      const location = rawJob.location || rawJob.categories?.location || 'Chile';
      
      // Usar tipo de empleo mejorado
      const employmentType = rawJob.employmentType || rawJob.categories?.commitment || rawJob.commitment;

      return {
        id: rawJob.id,
        title: rawJob.jsonLdData?.title || rawJob.title,
        description: rawJob.description || '',
        company: companyName,
        location,
        jobType: this.normalizeJobType(employmentType, rawJob.workplaceType),
        department: rawJob.department || rawJob.category || '',
        publishedDate,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        jobUrl: rawJob.jobUrl,
        tags: [...new Set(allTags)],
        metadata: {
          scrapedAt: new Date().toISOString(),
          scraper: this.constructor.name,
          source: 'Desafío Latam Lever',
          hasJsonLd: !!rawJob.jsonLdData,
        },
        details: {
          headline: rawJob.headline,
          categories: rawJob.categories || {},
          sections: rawJob.sections || {},
          closingDescription: rawJob.closingDescription || '',
          workplaceType: rawJob.workplaceType,
          commitment: employmentType,
          jsonLdData: rawJob.jsonLdData,
        },
      };
    } catch (error) {
      console.error(`Error procesando trabajo de Desafío Latam: ${error.message}`);
      this.errors.push({
        type: 'processing_error',
        message: error.message,
        job: rawJob,
      });
      return null;
    }
  }

  /**
   * Normalizar el tipo de trabajo basado en commitment y workplaceType
   */
  normalizeJobType(commitment, workplaceType) {
    const parts = [];

    if (commitment) {
      if (commitment.toLowerCase().includes('honorarios')) {
        parts.push('Freelance');
      } else if (commitment.toLowerCase().includes('presencial')) {
        parts.push('Presencial');
      } else {
        parts.push(commitment);
      }
    }

    if (workplaceType) {
      if (workplaceType.toLowerCase().includes('remote')) {
        parts.push('Remoto');
      } else if (workplaceType.toLowerCase().includes('hybrid')) {
        parts.push('Híbrido');
      } else if (workplaceType.toLowerCase().includes('on-site')) {
        parts.push('Presencial');
      }
    }

    return parts.length > 0 ? parts.join(' - ') : 'Full-time';
  }
}

module.exports = DesafioLatamScraper;
