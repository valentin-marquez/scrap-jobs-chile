const BaseScraper = require('./base-scraper');
const FormData = require('form-data');
const TurndownService = require('turndown');

/**
 * Scraper para trabajos de Accenture
 * Obtiene ofertas laborales desde la API de Accenture Chile
 */
class AccentureScraper extends BaseScraper {
  constructor(config = {}) {
    super({
      maxRetries: 3,
      retryDelay: 2000,
      timeout: 15000,
      maxAgeDays: 14,
      ...config,
    });

    this.baseUrl = 'https://www.accenture.com';
    this.apiUrl = `${this.baseUrl}/api/accenture/jobsearch/result`;
    this.turndownService = new TurndownService();
    
    // Headers específicos para Accenture
    this.defaultHeaders = {
      'accept': '*/*',
      'accept-encoding': 'gzip, deflate, br, zstd',
      'accept-language': 'es-ES,es;q=0.9,en;q=0.8,zh-CN;q=0.7,zh-TW;q=0.6,zh;q=0.5',
      'cache-control': 'no-cache',
      'origin': 'https://www.accenture.com',
      'pragma': 'no-cache',
      'referer': 'https://www.accenture.com/cl-es/careers/jobsearch?jk=&sb=1&vw=1&is_rj=0&pg=1&ba=technology',
      'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
    };
  }

  /**
   * Método principal de scraping
   */
  async scrape() {
    try {
      console.log('🔍 Obteniendo trabajos de Accenture...');

      // Obtener trabajos de technology
      const allJobs = [];
      let startIndex = 0;
      const maxResultSize = 15;
      let hasMoreResults = true;

      while (hasMoreResults && startIndex < 100) { // Límite de seguridad
        console.log(`📋 Obteniendo página ${Math.floor(startIndex / maxResultSize) + 1}...`);
        
        const pageJobs = await this.getJobsPage(startIndex, maxResultSize);
        
        if (pageJobs.length === 0) {
          hasMoreResults = false;
          break;
        }

        allJobs.push(...pageJobs);
        startIndex += maxResultSize;

        // Si obtenemos menos resultados que el máximo, es la última página
        if (pageJobs.length < maxResultSize) {
          hasMoreResults = false;
        }

        // Pausa entre requests
        await this.delay(1500);
      }

      console.log(`✅ Se encontraron ${allJobs.length} trabajos en total`);

      // Filtrar trabajos recientes
      const recentJobs = allJobs.filter(job => 
        this.isWithinDays(new Date(job.postedDate).toISOString(), this.config.maxAgeDays)
      );
      
      console.log(`📅 ${recentJobs.length} trabajos dentro de los últimos ${this.config.maxAgeDays} días`);

      // Procesar cada trabajo
      this.jobs = recentJobs
        .map(job => this.processJob(job, 'Accenture'))
        .filter(job => job !== null);

      console.log(`✅ Procesados ${this.jobs.length} trabajos de Accenture`);
    } catch (error) {
      console.error(`Error en scraping de Accenture: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener una página de trabajos
   */
  async getJobsPage(startIndex = 0, maxResultSize = 15) {
    try {
      // Crear FormData como lo hace el navegador
      const formData = new FormData();
      formData.append('startIndex', startIndex.toString());
      formData.append('maxResultSize', maxResultSize.toString());
      formData.append('jobKeyword', '');
      formData.append('jobLanguage', 'es');
      formData.append('countrySite', 'cl-es');
      formData.append('jobFilters', JSON.stringify([{"fieldName":"businessArea","items":["technology"]}]));
      formData.append('aggregations', JSON.stringify([
        {"fieldName":"location"},
        {"fieldName":"postedDate"},
        {"fieldName":"jobTypeDescription"},
        {"fieldName":"workforceEntity"},
        {"fieldName":"businessArea"},
        {"fieldName":"skill"},
        {"fieldName":"travelPercentage"},
        {"fieldName":"yearsOfExperience"},
        {"fieldName":"specialization"},
        {"fieldName":"employeeType"},
        {"fieldName":"remoteType"}
      ]));
      formData.append('jobCountry', 'Chile');
      formData.append('sortBy', '1');
      formData.append('componentId', 'careerjobsearchresults-07f5d1decf');

      const response = await this.makeRequest(this.apiUrl, {
        method: 'POST',
        headers: {
          ...this.defaultHeaders,
          ...formData.getHeaders()
        },
        data: formData
      });

      if (response.status === 200 && response.data?.data) {
        return response.data.data || [];
      }
        console.warn('Respuesta inesperada de la API de Accenture');
        return [];
    } catch (error) {
      console.error(`Error obteniendo página de Accenture: ${error.message}`);
      this.errors.push({
        type: 'api_error',
        message: error.message,
        startIndex
      });
      return [];
    }
  }

  /**
   * Procesar trabajo específico de Accenture
   */
  processJob(rawJob, companyName) {
    try {
      // Extraer tags del contenido
      const { extractTags } = require('../utils/common_tags');
      const titleTags = extractTags(rawJob.title || '');
      const descriptionTags = extractTags(rawJob.jobDescription || '');
      const skillTags = extractTags(rawJob.skill || '');

      const allTags = [...new Set([...titleTags, ...descriptionTags, ...skillTags])];

      // Agregar tags específicos del contexto de Accenture
      const titleLower = (rawJob.title || '').toLowerCase();
      if (titleLower.includes('senior') || titleLower.includes('especialista')) allTags.push('senior');
      if (titleLower.includes('junior') || titleLower.includes('trainee')) allTags.push('junior');
      if (titleLower.includes('lead') || titleLower.includes('líder')) allTags.push('leadership');
      if (titleLower.includes('manager') || titleLower.includes('gerente')) allTags.push('management');
      if (titleLower.includes('consultant') || titleLower.includes('consultor')) allTags.push('consulting');
      if (titleLower.includes('analyst') || titleLower.includes('analista')) allTags.push('analysis');

      // Tags específicos de tecnología/consulting
      allTags.push('technology', 'consulting', 'multinacional');

      // Agregar tags por skill/especialización
      const skill = rawJob.skill || '';
      if (skill.includes('Software Engineering')) allTags.push('software-engineering');
      if (skill.includes('Information Technology')) allTags.push('it-operations');
      if (skill.includes('Data')) allTags.push('data');
      if (skill.includes('AI')) allTags.push('artificial-intelligence');
      if (skill.includes('Cloud')) allTags.push('cloud');

      // Convertir HTML description a markdown
      let description = '';
      if (rawJob.jobDescription) {
        // Limpiar HTML entities
        const cleanHtml = rawJob.jobDescription
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&nbsp;/g, ' ')
          .replace(/&quot;/g, '"');
        
        description = this.turndownService.turndown(cleanHtml);
      }

      // Crear descripción completa estructurada
      let completeDescription = `# ${rawJob.title}\n\n`;
      
      if (description) {
        completeDescription += `## Descripción del Puesto\n\n${description}\n\n`;
      }

      // Agregar información adicional disponible
      if (rawJob.skill) {
        completeDescription += `## Área de Especialización\n\n${rawJob.skill}\n\n`;
      }

      if (rawJob.yearsOfExperience) {
        completeDescription += `## Experiencia Requerida\n\n${rawJob.yearsOfExperience} años\n\n`;
      }

      if (rawJob.employeeType) {
        completeDescription += `## Tipo de Empleo\n\n${rawJob.employeeType}\n\n`;
      }

      // Determinar ubicación
      let location = 'Chile';
      if (rawJob.jobCityState && rawJob.jobCityState.length > 0) {
        location = `${rawJob.jobCityState[0]}, Chile`;
      }

      // Determinar modalidad de trabajo
      let jobType = rawJob.employeeType || 'Full-time';
      let remoteType = rawJob.jobRemoteType || 'Hybrid';

      return {
        id: rawJob.jobId || rawJob.requisitionId || this.generateJobId(rawJob),
        title: rawJob.title,
        description: completeDescription,
        company: companyName,
        location: location,
        jobType: jobType,
        department: rawJob.businessArea || 'Technology',
        publishedDate: new Date(rawJob.postedDate).toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        jobUrl: rawJob.jobDetailUrl || `${this.baseUrl}/cl-es/careers/jobdetails?id=${rawJob.jobId}`,
        tags: [...new Set(allTags)],
        metadata: {
          scrapedAt: new Date().toISOString(),
          scraper: this.constructor.name,
          source: 'Accenture Careers API',
          originalId: rawJob.jobId,
          requisitionId: rawJob.requisitionId,
          skill: rawJob.skill,
          yearsOfExperience: rawJob.yearsOfExperience,
          businessArea: rawJob.businessArea,
          careerLevel: rawJob.careerLevelCd,
          remoteType: remoteType,
          postedDateText: rawJob.postedDateText
        },
        details: {
          skill: rawJob.skill,
          yearsOfExperience: rawJob.yearsOfExperience,
          businessArea: rawJob.businessArea,
          specialization: rawJob.specialization,
          careerLevel: rawJob.careerLevelCd,
          remoteType: remoteType,
          orgUnits: [
            rawJob.orgUnit1,
            rawJob.orgUnit2,
            rawJob.orgUnit3,
            rawJob.orgUnit4,
            rawJob.orgUnit5,
            rawJob.orgUnit6
          ].filter(unit => unit && unit.trim() !== ''),
          internalReferUrl: rawJob.internalReferUrl
        }
      };
    } catch (error) {
      console.error(`Error procesando trabajo de Accenture: ${error.message}`);
      this.errors.push({
        type: 'processing_error',
        message: error.message,
        job: rawJob,
      });
      return null;
    }
  }
}

module.exports = AccentureScraper;