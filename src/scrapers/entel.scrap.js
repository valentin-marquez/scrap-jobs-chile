const BaseScraper = require('./base-scraper');
const cheerio = require('cheerio');
const TurndownService = require('turndown');

/**
 * Scraper para trabajos de Entel
 * Obtiene ofertas laborales desde el feed JSON de Aira Virtual
 */
class EntelScraper extends BaseScraper {
  constructor(config = {}) {
    super({
      maxRetries: 3,
      retryDelay: 2000,
      timeout: 10000,
      maxAgeDays: 7,
      ...config,
    });

    // Configuración específica de Entel - Nueva API de Aira Virtual
    this.feedUrl = 'https://gcs-storage.airavirtual.com/public/feeds/offers_feed.entel.json';
    this.baseAiraUrl = 'https://login.airavirtual.com';
    this.turndownService = new TurndownService();
  }

  /**
   * Método principal de scraping
   */
  async scrape() {
    try {
      console.log('🔍 Obteniendo trabajos de Entel (Aira Virtual)...');

      // Obtener lista de trabajos desde el feed JSON
      const jobListings = await this.getJobListings();
      console.log(`✅ Se encontraron ${jobListings.length} trabajos relevantes`);

      // Obtener detalles de cada trabajo
      for (let i = 0; i < jobListings.length; i++) {
        const job = jobListings[i];
        console.log(`📋 Obteniendo detalles ${i + 1}/${jobListings.length}: ${job.name}`);

        try {
          const details = await this.getJobDetails(job);
          const processedJob = this.processJob({ ...job, ...details }, 'Entel');
          if (processedJob) {
            this.jobs.push(processedJob);
          }
        } catch (error) {
          console.error(`Error obteniendo detalles de ${job.name}: ${error.message}`);
          this.errors.push({
            type: 'job_detail_error',
            message: error.message,
            job: job.name,
          });
        }

        // Pausa para evitar rate limiting
        if (i < jobListings.length - 1) {
          await this.delay(1500);
        }
      }

      console.log(`✅ Procesados ${this.jobs.length} trabajos de Entel`);
    } catch (error) {
      console.error(`Error en scraping de Entel: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener lista de trabajos desde el feed JSON
   */
  async getJobListings() {
    try {
      const response = await this.makeRequest(this.feedUrl);

      // La estructura correcta es: response.data.data.offers
      const feedData = response.data;
      const jobs = feedData?.data?.offers || [];

      console.log(`📥 Obtenidos ${jobs.length} trabajos del feed JSON`);

      // Filtrar trabajos por criterios relevantes
      const filteredJobs = jobs.filter((job) => {
        // Filtrar solo trabajos de TI/Tecnología basándose en el nombre del puesto
        const titleLower = job.name?.toLowerCase() || '';

        // Palabras clave que EXCLUYEN trabajos (no tech)
        const excludeKeywords = [
          'ejecutivo desarrollo',
          'ejecutivo comercial',
          'ejecutivo atención',
          'ejecutivo gestión',
          'ejecutivo senior ventas',
          'ejecutivo ventas',
          'sales specialist',
          'ventas remotas',
          'atención preferencial',
          'atención empresas',
          'gestión comercial',
          'negocios internacionales',
          'estrategia canales',
          'evaluación económica',
          'controlling',
          'marketing',
          'desarrollo organizacional',
          'gestión clientes',
          'práctica psicología',
          'psicología',
          'selección y experiencia',
          'atracción de talentos',
          'apoyo clúster',
        ];

        // Si contiene palabras excluidas, descartar
        const isExcluded = excludeKeywords.some((keyword) => titleLower.includes(keyword));
        if (isExcluded) return false;

        // Palabras clave ESPECÍFICAS para roles tech reales
        const techKeywords = [
          // Desarrollo y programación específicos
          'desarrollador',
          'developer',
          'programador',
          'software engineer',
          'fullstack',
          'frontend',
          'backend',
          'mobile',
          'web developer',
          'outsystems',

          // Análisis técnico y datos (específicos)
          'analista datos',
          'data analyst',
          'data scientist',
          'analista senior datos',
          'ml engineer',
          'machine learning',
          'especialista ml',
          'analytics',
          'planific demanda y analytics',
          'control carga de datos',

          // Roles de infraestructura y sistemas
          'devops',
          'sysadmin',
          'administrador sistemas',
          'ingeniero sistemas',
          'cloud engineer',
          'infraestructura',
          'servicios ti',
          'explotación servicios ti',
          'jefe área explotación servicios ti',
          'supervisor control carga',

          // Metodologías y gestión técnica específica
          'scrum master',
          'agile team facilitator',
          'tech lead',
          'technical lead',
          'arquitecto software',
          'architect',
          'consultor pmo',
          'pmo',

          // QA y testing específicos
          'qa engineer',
          'quality assurance',
          'testing',
          'analista calidad monitoring',
          'monitoring',
          'qa analyst',

          // Tecnologías y plataformas específicas
          'salesforce',
          'netsuite',
          'consultor salesforce',
          'jefe de proyectos salesforce',
          'consultor netsuite',
          'consultor implementación soluciones',

          // Seguridad informática específica
          'ciberseguridad',
          'cybersecurity',
          'security engineer',
          'infosec',

          // Roles de ingeniería técnica
          'ingeniero preventa',
          'ingeniero regulación',
          'technical consultant',
          'consultor técnico',
          'ingeniero software',

          // Automatización específica
          'analista automatización',
          'automatización',
          'automation engineer',
          'analista senior automatizacion',
        ];

        // Solo incluir si contiene palabras tech específicas
        const isTechJob = techKeywords.some((keyword) => titleLower.includes(keyword));

        // Verificar que tenga los campos necesarios
        const hasRequiredFields = job.id && job.name && job.link;

        // Filtrar por días de publicación (trabajos recientes)
        const isRecent = !job.publication_days || job.publication_days <= this.config.maxAgeDays;

        return isTechJob && hasRequiredFields && isRecent;
      });

      console.log(
        `🔍 Filtrados ${filteredJobs.length} trabajos tech específicos de ${jobs.length} totales`
      );

      return filteredJobs;
    } catch (error) {
      console.error('Error obteniendo feed de trabajos de Entel:', error.message);
      return [];
    }
  }

  /**
   * Obtener detalles de un trabajo específico desde Aira Virtual
   */
  async getJobDetails(job) {
    try {
      const response = await this.makeRequest(job.link);
      const $ = cheerio.load(response.data);

      // Extraer información de la página de Aira Virtual
      const fullTitle = $('h1.job-title, .job-header h1, h1').first().text().trim() || job.name;

      // Buscar diferentes selectores para la descripción del trabajo
      let jobDescription = '';
      const descriptionSelectors = [
        '.job-description',
        '.job-content',
        '.description',
        '[class*="description"]',
        '.job-details',
        'main .content',
      ];

      for (const selector of descriptionSelectors) {
        const element = $(selector);
        if (element.length > 0 && element.text().trim()) {
          jobDescription = element.html();
          break;
        }
      }

      // Convertir HTML a Markdown si encontramos contenido
      let jobDescriptionMarkdown = '';
      if (jobDescription) {
        jobDescriptionMarkdown = this.turndownService.turndown(jobDescription);
      }

      // Extraer modalidad de trabajo
      let workMode = 'No especificado';
      const fullText = $.text().toLowerCase();
      if (fullText.includes('remoto')) workMode = 'Remoto';
      else if (fullText.includes('híbrido')) workMode = 'Híbrido';
      else if (fullText.includes('presencial')) workMode = 'Presencial';

      // Crear descripción completa estructurada
      let completeDescription = `# ${fullTitle}\n\n`;

      if (jobDescriptionMarkdown) {
        completeDescription += `## Descripción del Puesto\n\n${jobDescriptionMarkdown}\n\n`;
      } else {
        completeDescription += `## Descripción del Puesto\n\nPuesto: ${job.name}\nUbicación: ${job.city || 'No especificada'}\n\n`;
      }

      // Agregar información de Entel
      completeDescription +=
        '## Sobre Entel\n\nEntel es una empresa líder en telecomunicaciones en Chile y Latinoamérica. Nos enfocamos en la transformación digital y en brindar soluciones tecnológicas innovadoras. En Entel encontrarás un espacio de desarrollo diverso e inclusivo donde tu talento es valorado.\n\n';

      // Agregar información adicional disponible
      if (job.city) {
        completeDescription += `## Ubicación\n\n${job.city}\n\n`;
      }

      if (job.publication_days !== undefined) {
        completeDescription += `## Información Adicional\n\nPublicado hace ${job.publication_days} días\n\n`;
      }

      return {
        fullTitle,
        description: completeDescription,
        jobType: workMode,
        city: job.city,
        publicationDays: job.publication_days,
        originalDescription: jobDescriptionMarkdown,
      };
    } catch (error) {
      console.error(`Error obteniendo detalles de ${job.name}: ${error.message}`);
      return {
        description: `# ${job.name}\n\nPuesto disponible en Entel.\nUbicación: ${job.city || 'No especificada'}\n\n## Sobre Entel\n\nEntel es una empresa líder en telecomunicaciones en Chile y Latinoamérica.`,
        jobType: 'No especificado',
        city: job.city,
        publicationDays: job.publication_days,
        originalDescription: '',
      };
    }
  }

  /**
   * Procesar trabajo específico de Entel
   */
  processJob(rawJob, companyName) {
    try {
      // Extraer tags del contenido
      const { extractTags } = require('../utils/common_tags');
      const titleTags = extractTags(rawJob.name || '');
      const descriptionTags = extractTags(rawJob.originalDescription || '');

      const allTags = [...new Set([...titleTags, ...descriptionTags])];

      // Agregar tags específicos basados en el título
      const titleLower = rawJob.name?.toLowerCase() || '';
      if (titleLower.includes('práctica') || titleLower.includes('intern')) {
        allTags.push('intern', 'internship', 'práctica');
      }
      if (titleLower.includes('senior')) allTags.push('senior');
      if (titleLower.includes('junior')) allTags.push('junior');
      if (titleLower.includes('líder') || titleLower.includes('lead')) allTags.push('leadership');
      if (titleLower.includes('manager') || titleLower.includes('gerente'))
        allTags.push('management');

      // Determinar ubicación
      let location = rawJob.city || 'Chile';
      if (rawJob.city && !rawJob.city.includes('Chile')) {
        location = `${rawJob.city}, Chile`;
      }

      return {
        id: rawJob.id?.toString() || this.generateJobId(rawJob),
        title: rawJob.fullTitle || rawJob.name,
        description: rawJob.description || '',
        company: companyName,
        location: location,
        jobType: rawJob.jobType || 'Full-time',
        department: 'Tecnología',
        publishedDate: this.calculatePublishedDate(rawJob.publicationDays),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        jobUrl: rawJob.link,
        tags: [...new Set(allTags)],
        metadata: {
          scrapedAt: new Date().toISOString(),
          scraper: this.constructor.name,
          source: 'Entel Jobs (Aira Virtual)',
          publicationDays: rawJob.publicationDays,
          originalCity: rawJob.city,
        },
      };
    } catch (error) {
      console.error(`Error procesando trabajo de Entel: ${error.message}`);
      this.errors.push({
        type: 'processing_error',
        message: error.message,
        job: rawJob,
      });
      return null;
    }
  }

  /**
   * Calcular fecha de publicación basada en días desde publicación
   */
  calculatePublishedDate(publicationDays) {
    if (publicationDays === undefined || publicationDays === null) {
      return new Date().toISOString();
    }

    const publishedDate = new Date();
    publishedDate.setDate(publishedDate.getDate() - publicationDays);
    return publishedDate.toISOString();
  }
}

module.exports = EntelScraper;
