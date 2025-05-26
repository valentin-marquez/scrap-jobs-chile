const BaseScraper = require('./base-scraper');
const TurndownService = require('turndown');

/**
 * Scraper para trabajos de Banco Estado
 * API simple sin autenticación
 */
class BancoEstadoScraper extends BaseScraper {
  constructor(config = {}) {
    super({
      maxRetries: 3,
      retryDelay: 2000,
      timeout: 10000,
      maxAgeDays: 14,
      ...config,
    });

    this.baseUrl = 'https://bancoestado.trabajando.cl';
    this.searchUrl = `${this.baseUrl}/api/searchjob`;
    this.detailUrl = `${this.baseUrl}/api/ofertas`;
    this.turndownService = new TurndownService();
  }

  /**
   * Método principal de scraping
   */
  async scrape() {
    try {
      console.log('🔍 Obteniendo trabajos de Banco Estado...');

      // Obtener trabajos tech usando búsquedas específicas
      const jobListings = await this.getJobListings();
      console.log(`✅ Se encontraron ${jobListings.length} trabajos relevantes`);

      // Obtener detalles de cada trabajo
      for (let i = 0; i < jobListings.length; i++) {
        const job = jobListings[i];
        console.log(`📋 Obteniendo detalles ${i + 1}/${jobListings.length}: ${job.nombreCargo}`);

        try {
          const details = await this.getJobDetails(job.idOferta);
          const processedJob = this.processJob({ ...job, ...details }, 'Banco Estado');
          if (processedJob) {
            this.jobs.push(processedJob);
          }
        } catch (error) {
          console.error(`Error obteniendo detalles de ${job.nombreCargo}: ${error.message}`);
          this.errors.push({
            type: 'job_detail_error',
            message: error.message,
            job: job.nombreCargo,
          });
        }

        // Pausa para evitar rate limiting
        if (i < jobListings.length - 1) {
          await this.delay(1000);
        }
      }

      console.log(`✅ Procesados ${this.jobs.length} trabajos de Banco Estado`);
    } catch (error) {
      console.error(`Error en scraping de Banco Estado: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener trabajos usando diferentes búsquedas tech
   */
  async getJobListings() {
    try {
      const allJobs = [];
      let totalPages = 1;

      // Primera búsqueda general para obtener todos los trabajos
      console.log('📥 Obteniendo todos los trabajos disponibles...');

      for (let page = 1; page <= totalPages; page++) {
        try {
          const requestOptions = {
            method: 'GET',
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              Accept: 'application/json, text/plain, */*',
              'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
              'Accept-Encoding': 'gzip, deflate, br',
              Connection: 'keep-alive',
              Referer: 'https://bancoestado.trabajando.cl/',
            },
          };

          const url = `${this.searchUrl}?palabraClave=&pagina=${page}&orden=FECHA_PUBLICACION&tipoOrden=DESC&ofertaConfidencial=false&idDominio=160`;
          const response = await this.makeRequest(url, requestOptions);

          const data = response.data;

          if (page === 1) {
            totalPages = Math.min(data.cantidadPaginas || 1, 5); // Limitamos a 5 páginas
            console.log(
              `📊 Total de páginas: ${totalPages}, Total ofertas: ${data.cantidadRegistros}`
            );
          }

          if (data.ofertas && Array.isArray(data.ofertas)) {
            allJobs.push(...data.ofertas);
          } else {
            console.warn(`⚠️ Página ${page}: No se encontraron ofertas o formato inesperado`);
            console.log('Response data:', JSON.stringify(data, null, 2));
          }

          await this.delay(500); // Pausa entre páginas
        } catch (error) {
          console.error(`Error obteniendo página ${page}: ${error.message}`);
          if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
          }

          // Si es la primera página y falla, intentar con búsquedas específicas
          if (page === 1) {
            console.log('🔄 API principal falló, intentando búsquedas específicas...');
            return await this.getFallbackSearches();
          }
        }
      }

      console.log(`📥 Obtenidos ${allJobs.length} trabajos totales`);

      // Filtrar solo trabajos tech
      const techJobs = this.filterTechJobs(allJobs);

      // Filtrar por fecha (solo trabajos recientes)
      const recentJobs = this.filterRecentJobs(techJobs);

      console.log(`🔍 Filtrados ${techJobs.length} trabajos tech de ${allJobs.length} totales`);
      console.log(
        `📅 ${recentJobs.length} trabajos tech recientes (últimos ${this.config.maxAgeDays} días)`
      );

      return recentJobs;
    } catch (error) {
      console.error('Error obteniendo trabajos:', error.message);
      console.log('🔄 Intentando método de respaldo...');
      return await this.getFallbackSearches();
    }
  }

  /**
   * Método de respaldo cuando la API principal falla
   */
  async getFallbackSearches() {
    console.log('🔄 Usando búsquedas específicas como respaldo...');

    const techSearchTerms = [
      'sistemas',
      'tecnología',
      'ingeniero',
      'analista',
      'datos',
      'ciberseguridad',
      'automatización',
      'programador',
      'desarrollador',
    ];

    const allJobs = [];

    for (const term of techSearchTerms) {
      try {
        console.log(`🔍 Buscando: "${term}"`);

        const url = `${this.searchUrl}?palabraClave=${encodeURIComponent(term)}&pagina=1&orden=FECHA_PUBLICACION&tipoOrden=DESC&ofertaConfidencial=false&idDominio=160`;
        const response = await this.makeRequest(url);

        if (response.data.ofertas && Array.isArray(response.data.ofertas)) {
          // Evitar duplicados basándose en idOferta
          const newJobs = response.data.ofertas.filter(
            (job) => !allJobs.some((existing) => existing.idOferta === job.idOferta)
          );
          allJobs.push(...newJobs);
          console.log(`   ✅ ${newJobs.length} trabajos nuevos encontrados`);
        }

        await this.delay(1000); // Pausa entre búsquedas
      } catch (error) {
        console.error(`   ❌ Error buscando "${term}": ${error.message}`);
      }
    }

    console.log(`📥 Total obtenido via búsquedas específicas: ${allJobs.length} trabajos`);

    // Filtrar solo trabajos tech
    const techJobs = this.filterTechJobs(allJobs);
    const recentJobs = this.filterRecentJobs(techJobs);

    console.log(`🔍 Filtrados ${techJobs.length} trabajos tech de ${allJobs.length} totales`);
    console.log(`📅 ${recentJobs.length} trabajos tech recientes`);

    return recentJobs;
  }

  /**
   * Filtrar solo trabajos tech reales
   */
  filterTechJobs(jobs) {
    return jobs.filter((job) => {
      const titleLower = (job.nombreCargo || '').toLowerCase();
      const descLower = (job.descripcionOferta || '').toLowerCase();
      const fullText = `${titleLower} ${descLower}`;

      // Palabras que excluyen (no tech) - más específicas
      const excludeKeywords = [
        'jefatura de oficina',
        'jefe/a de estrategia',
        'estrategia de clientes y marketing',
        'encargado/a de sostenibilidad',
        'asistente de servicios',
        'asistente de finanzas',
        'gestor/a operacional',
        'ejecutivo/a emprende',
        'ejecutivo comercial',
        'asistente de growth marketing',
        'growth marketing',
      ];

      const isExcluded = excludeKeywords.some((keyword) => titleLower.includes(keyword));
      if (isExcluded) return false;

      // Palabras que incluyen (tech específicos) - más precisas para Banco Estado
      const techKeywords = [
        // Ingeniería y sistemas específicos
        'ingeniero procesos sistemas y tecnología',
        'ingeniero procesos sistemas',
        'sistemas y tecnología',
        'desarrollo tec',
        'gcia desarrollo tec',

        // Análisis de datos específicos
        'analista de automatización y visualización de dato',
        'automatización y visualización',
        'visualización de dato',
        'analista de datos',
        'automatización',

        // Seguridad específicos
        'especialista en ciberseguridad para ecosistemas digitales',
        'ciberseguridad',
        'ecosistemas digitales',
        'coordinador/a de operaciones de seguridad',
        'operaciones de seguridad',
        'seguridad informática',

        // Innovación y riesgo tech
        'analista de riesgo e innovación',
        'riesgo e innovación',

        // Términos técnicos generales
        'desarrollador',
        'developer',
        'programador',
        'software engineer',
        'analista de sistemas',
        'técnico en computación',
        'técnico en administración de redes',
        'análisis de sistemas',
        'analista programador',

        // Tecnologías y herramientas
        'java',
        'python',
        'javascript',
        'sql',
        'cloud',
        'aws',
        'azure',
        'machine learning',
        'artificial intelligence',
        'data science',

        // Roles tech específicos
        'scrum master',
        'product owner',
        'devops',
        'qa engineer',
        'arquitecto software',
        'tech lead',
      ];

      return techKeywords.some((keyword) => fullText.includes(keyword));
    });
  }

  /**
   * Filtrar trabajos por fecha de publicación
   */
  filterRecentJobs(jobs) {
    const maxAge = this.config.maxAgeDays;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);

    return jobs.filter((job) => {
      if (!job.fechaPublicacion) return true; // Si no hay fecha, incluir

      try {
        // Formato: "2025-05-22 16:48"
        const jobDate = new Date(job.fechaPublicacion);
        return jobDate >= cutoffDate;
      } catch (error) {
        return true; // Si hay error parseando fecha, incluir
      }
    });
  }

  /**
   * Obtener detalles de un trabajo específico
   */
  async getJobDetails(jobId) {
    try {
      const response = await this.makeRequest(`${this.detailUrl}/${jobId}`);
      const jobDetail = response.data;

      // Extraer y limpiar descripción
      let description = jobDetail.descripcionOferta || '';

      // Convertir HTML breaks a markdown
      description = description
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/?[^>]+(>|$)/g, '') // Remover otros tags HTML
        .replace(/&nbsp;/g, ' ')
        .trim();

      // Extraer requisitos
      let requirements = jobDetail.requisitosMinimos || '';
      requirements = requirements
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/?[^>]+(>|$)/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim();

      // Determinar modalidad de trabajo
      const workMode = this.extractWorkMode(`${description} ${requirements}`);

      return {
        fullDescription: description,
        requirements: requirements,
        workMode: workMode,
        salaryRange: this.extractSalaryInfo(jobDetail),
        experience: jobDetail.aniosExperiencia || 0,
        contract: jobDetail.tiempoContrato || 'No especificado',
        education: jobDetail.nombreNivelAcademico || 'No especificado',
        area: jobDetail.nombreArea || 'Tecnología',
        vacancies: jobDetail.cantidadVacantes || 1,
        applications: jobDetail.candidadPostulaciones || 0,
        views: jobDetail.candidadVisualizaciones || 0,
        expirationDate: jobDetail.fechaExpiracionFormatoIngles || null,
        location: this.extractLocation(jobDetail.ubicacion),
      };
    } catch (error) {
      console.error(`Error obteniendo detalles del trabajo ${jobId}: ${error.message}`);
      return {
        fullDescription: '',
        requirements: '',
        workMode: 'Presencial',
        salaryRange: '',
        experience: 0,
        contract: 'No especificado',
        education: 'No especificado',
        area: 'Tecnología',
        vacancies: 1,
        applications: 0,
        views: 0,
        expirationDate: null,
        location: 'Chile',
      };
    }
  }

  /**
   * Extraer modalidad de trabajo del texto
   */
  extractWorkMode(text) {
    const textLower = text.toLowerCase();
    if (
      textLower.includes('remoto') ||
      textLower.includes('home office') ||
      textLower.includes('teletrabajo')
    ) {
      return 'Remoto';
    }
    if (
      textLower.includes('híbrido') ||
      textLower.includes('hibrido') ||
      textLower.includes('mixto')
    ) {
      return 'Híbrido';
    }
    if (textLower.includes('presencial') || textLower.includes('oficina')) {
      return 'Presencial';
    }
    return 'No especificado';
  }

  /**
   * Extraer información de salario
   */
  extractSalaryInfo(jobDetail) {
    if (jobDetail.mostrarSueldo && jobDetail.sueldo > 0) {
      return `${jobDetail.nombreMoneda} ${jobDetail.sueldo.toLocaleString()}`;
    }
    return 'No especificado';
  }

  /**
   * Extraer ubicación
   */
  extractLocation(ubicacion) {
    if (!ubicacion) return 'Chile';

    const region = ubicacion.nombreRegion || '';
    const comuna = ubicacion.nombreComuna || '';

    if (comuna && region) {
      return `${comuna}, ${region}, Chile`;
    }
    if (region) {
      return `${region}, Chile`;
    }

    return 'Chile';
  }

  /**
   * Procesar trabajo específico de Banco Estado
   */
  processJob(rawJob, companyName) {
    try {
      // Extraer tags del contenido
      const { extractTags } = require('../utils/common_tags');
      const titleTags = extractTags(rawJob.nombreCargo || '');
      const descriptionTags = extractTags(rawJob.fullDescription || '');

      const allTags = [...new Set([...titleTags, ...descriptionTags])];

      // Agregar tags específicos del contexto bancario
      const titleLower = (rawJob.nombreCargo || '').toLowerCase();
      if (titleLower.includes('senior') || titleLower.includes('especialista'))
        allTags.push('senior');
      if (titleLower.includes('junior') || titleLower.includes('asistente')) allTags.push('junior');
      if (titleLower.includes('jefe') || titleLower.includes('líder')) allTags.push('leadership');
      if (titleLower.includes('coordinador')) allTags.push('coordination');
      if (titleLower.includes('analista')) allTags.push('analysis');

      // Tags específicos de banca/fintech
      allTags.push('fintech', 'banking', 'financial-services');

      // Crear descripción completa estructurada
      let completeDescription = `# ${rawJob.nombreCargo}\n\n`;

      if (rawJob.fullDescription) {
        completeDescription += `## Descripción del Puesto\n\n${rawJob.fullDescription}\n\n`;
      }

      if (rawJob.requirements) {
        completeDescription += `## Requisitos\n\n${rawJob.requirements}\n\n`;
      }

      if (rawJob.experience > 0) {
        completeDescription += `## Experiencia Requerida\n\n${rawJob.experience} años de experiencia\n\n`;
      }

      if (rawJob.education !== 'No especificado') {
        completeDescription += `## Nivel Académico\n\n${rawJob.education}\n\n`;
      }

      completeDescription += '## Información Adicional\n\n';
      completeDescription += `- **Modalidad:** ${rawJob.workMode}\n`;
      completeDescription += `- **Tipo de contrato:** ${rawJob.contract}\n`;
      completeDescription += `- **Vacantes:** ${rawJob.vacancies}\n`;

      if (rawJob.salaryRange !== 'No especificado') {
        completeDescription += `- **Rango salarial:** ${rawJob.salaryRange}\n`;
      }

      if (rawJob.applications > 0) {
        completeDescription += `- **Postulaciones:** ${rawJob.applications}\n`;
      }

      completeDescription +=
        '\n## Sobre Banco Estado\n\nBanco Estado es el banco público de Chile, líder en innovación financiera y transformación digital. Comprometido con la inclusión financiera y el desarrollo tecnológico del país.\n\n';

      return {
        id: rawJob.idOferta?.toString() || this.generateJobId(rawJob),
        title: rawJob.nombreCargo,
        description: completeDescription,
        company: companyName,
        location: rawJob.location || 'Chile',
        jobType: rawJob.workMode || 'Presencial',
        department: rawJob.area || 'Tecnología',
        publishedDate: rawJob.fechaPublicacion
          ? new Date(rawJob.fechaPublicacion).toISOString()
          : new Date().toISOString(),
        expiresAt: rawJob.expirationDate
          ? new Date(rawJob.expirationDate).toISOString()
          : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        jobUrl: `${this.baseUrl}/empleos/${rawJob.idOferta}`,
        tags: [...new Set(allTags)],
        metadata: {
          scrapedAt: new Date().toISOString(),
          scraper: this.constructor.name,
          source: 'Banco Estado Jobs',
          originalId: rawJob.idOferta,
          applications: rawJob.applications || 0,
          views: rawJob.views || 0,
          salaryRange: rawJob.salaryRange,
          experience: rawJob.experience,
          contract: rawJob.contract,
          education: rawJob.education,
          vacancies: rawJob.vacancies,
        },
      };
    } catch (error) {
      console.error(`Error procesando trabajo de Banco Estado: ${error.message}`);
      this.errors.push({
        type: 'processing_error',
        message: error.message,
        job: rawJob,
      });
      return null;
    }
  }
}

module.exports = BancoEstadoScraper;
