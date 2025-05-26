const BaseScraper = require('./base-scraper');
const puppeteer = require('puppeteer');

/**
 * Scraper para Banco de Chile usando Puppeteer
 * Navega por https://www.trabajaenelchile.cl/ofertas
 */
class BancoChileScraper extends BaseScraper {
  constructor(config = {}) {
    super({
      ...config,
      maxRetries: 2,
      timeout: 30000,
      headless: true,
      ...config,
    });
    
    this.baseUrl = 'https://www.trabajaenelchile.cl/ofertas';
    this.browser = null;
    this.page = null;
  }

  /**
   * Inicializar el navegador Puppeteer
   */
  async initBrowser() {
    try {
      console.log('🚀 Iniciando navegador Puppeteer...');
      this.browser = await puppeteer.launch({
        headless: this.config.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ],
      });

      this.page = await this.browser.newPage();
      
      // Configurar User Agent y viewport
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      );
      await this.page.setViewport({ width: 1366, height: 768 });

      console.log('✅ Navegador inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando navegador:', error.message);
      throw error;
    }
  }

  /**
   * Cerrar el navegador
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Navegador cerrado');
    }
  }

  /**
   * Navegar a la página principal y aplicar filtros
   */
  async navigateAndFilter() {
    try {
      console.log(`📍 Navegando a: ${this.baseUrl}`);
      await this.page.goto(this.baseUrl, { 
        waitUntil: 'networkidle2',
        timeout: this.config.timeout 
      });

      // Esperar a que cargue la página completamente
      await this.delay(5000);

      // Verificar si el elemento existe y es clickeable
      const filterExists = await this.page.$('#checkFamilia1');
      if (!filterExists) {
        console.log('⚠️ Filtro #checkFamilia1 no encontrado, continuando sin filtro...');
        return;
      }

      // Hacer scroll hasta el elemento para asegurar que sea visible
      await this.page.evaluate(() => {
        const element = document.getElementById('checkFamilia1');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

      await this.delay(2000);

      // Aplicar filtro de Marketing, Tecnología y Digital
      console.log('🔍 Aplicando filtro de Marketing, Tecnología y Digital...');
      
      // Usar JavaScript click en lugar de Puppeteer click para evitar problemas de visibilidad
      await this.page.evaluate(() => {
        const checkbox = document.getElementById('checkFamilia1');
        if (checkbox) {
          checkbox.click();
        }
      });
      
      // Esperar a que se aplique el filtro
      await this.delay(5000);

      console.log('✅ Filtro aplicado correctamente');
    } catch (error) {
      console.error('❌ Error navegando y aplicando filtros:', error.message);
      console.log('⚠️ Continuando sin filtro...');
      // No lanzar error, continuar sin filtro
    }
  }

  /**
   * Obtener el número total de páginas (limitado a un máximo razonable)
   */
  async getTotalPages() {
    try {
      // Buscar el elemento data-total-pages o el paginador
      const totalPages = await this.page.evaluate(() => {
        // Intentar obtener desde el atributo data-total-pages
        const stuffDiv = document.getElementById('stuff');
        if (stuffDiv?.getAttribute('data-total-pages')) {
          return Number.parseInt(stuffDiv.getAttribute('data-total-pages'), 10);
        }

        // Si no, intentar desde el paginador
        const pagination = document.getElementById('pagination');
        if (pagination) {
          const pageLinks = pagination.querySelectorAll('a.page-link[data-page]');
          let maxPage = 1;
          for (const link of pageLinks) {
            const pageNum = Number.parseInt(link.getAttribute('data-page'), 10);
            if (pageNum > maxPage) maxPage = pageNum;
          }
          return maxPage;
        }

        return 1; // Default a 1 página si no se encuentra
      });

      // Limitar a un máximo de 5 páginas para evitar timeouts
      const limitedPages = Math.min(totalPages, 5);
      console.log(`📄 Total de páginas encontradas: ${totalPages}, limitando a ${limitedPages} páginas`);
      return limitedPages;
    } catch (error) {
      console.warn('⚠️ No se pudo determinar el número de páginas, usando 1 por defecto');
      return 1;
    }
  }

  /**
   * Extraer trabajos de la página actual
   */
  async extractJobsFromCurrentPage() {
    try {
      const jobs = await this.page.evaluate(() => {
        const jobCards = document.querySelectorAll('#stuff .card-vacante');
        const extractedJobs = [];

        for (const card of jobCards) {
          try {
            // Extraer información básica
            const titleElement = card.querySelector('.card-vacante-cargo');
            const title = titleElement ? titleElement.textContent.trim() : '';

            const departmentElement = card.querySelector('.card-vacante-division');
            const department = departmentElement ? departmentElement.textContent.trim() : '';

            const locationElement = card.querySelector('.card-body .c-gray');
            const location = locationElement ? locationElement.textContent.trim() : '';

            const publishedElement = card.querySelector('.card-header-home .c-gray.text--small');
            const publishedText = publishedElement ? publishedElement.textContent.trim() : '';

            const linkElement = card.getAttribute('href');
            const jobUrl = linkElement ? linkElement : '';

            // Extraer ID del trabajo
            const idMatch = card.id ? card.id.match(/card-oferta-(\d+)/) : null;
            const jobId = idMatch ? idMatch[1] : '';

            // Procesar fecha de publicación
            let publishedDate = new Date().toISOString();
            if (publishedText.includes('hoy')) {
              publishedDate = new Date().toISOString();
            } else if (publishedText.includes('ayer')) {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              publishedDate = yesterday.toISOString();
            } else {
              const daysMatch = publishedText.match(/hace (\d+) días?/);
              if (daysMatch) {
                const daysAgo = Number.parseInt(daysMatch[1], 10);
                const date = new Date();
                date.setDate(date.getDate() - daysAgo);
                publishedDate = date.toISOString();
              }
            }

            if (title && jobUrl) {
              extractedJobs.push({
                id: jobId,
                title,
                department,
                location,
                publishedDate,
                jobUrl: jobUrl.startsWith('http') ? jobUrl : `https://www.trabajaenelchile.cl${jobUrl}`,
                publishedText
              });
            }
          } catch (error) {
            console.error('Error extrayendo trabajo individual:', error);
          }
        }

        return extractedJobs;
      });

      console.log(`📋 Extraídos ${jobs.length} trabajos de la página actual`);
      return jobs;
    } catch (error) {
      console.error('❌ Error extrayendo trabajos:', error.message);
      return [];
    }
  }

  /**
   * Navegar a la siguiente página
   */
  async navigateToPage(pageNumber) {
    try {
      console.log(`📄 Navegando a la página ${pageNumber}...`);
      
      // Buscar y hacer click en el enlace de la página
      const pageSelector = `#pagination a[data-page="${pageNumber}"]`;
      await this.page.waitForSelector(pageSelector, { timeout: 5000 });
      await this.page.click(pageSelector);
      
      // Esperar a que cargue la nueva página usando delay en lugar de waitForTimeout
      await this.delay(3000);
      await this.page.waitForSelector('#stuff', { timeout: 10000 });
      
      console.log(`✅ Navegación a página ${pageNumber} completada`);
    } catch (error) {
      console.error(`❌ Error navegando a página ${pageNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Extraer detalles de un trabajo específico
   */
  async extractJobDetails(jobUrl) {
    try {
      const detailPage = await this.browser.newPage();
      await detailPage.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      );

      await detailPage.goto(jobUrl, { 
        waitUntil: 'networkidle2',
        timeout: this.config.timeout 
      });

      const details = await detailPage.evaluate(() => {
        // Extraer descripción completa
        const descriptionElement = document.querySelector('.container p.c-gray');
        const description = descriptionElement ? descriptionElement.innerHTML : '';

        // Extraer ID del proceso usando XPath o búsqueda de texto
        let processId = '';
        const allParagraphs = document.querySelectorAll('p');
        for (const p of allParagraphs) {
          const text = p.textContent || p.innerText;
          if (text.includes('ID:')) {
            const idMatch = text.match(/ID:\s*(\S+)/);
            if (idMatch) {
              processId = idMatch[1];
              break;
            }
          }
        }

        // Extraer fecha de publicación más precisa
        let publishedDate = '';
        for (const p of allParagraphs) {
          const text = p.textContent || p.innerText;
          if (text.includes('Fecha de publicación')) {
            const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
            if (dateMatch) {
              const [day, month, year] = dateMatch[1].split('/');
              publishedDate = new Date(`${year}-${month}-${day}`).toISOString();
              break;
            }
          }
        }

        return {
          description: description.replace(/<[^>]*>/g, '').trim(), // Remover HTML tags
          processId,
          publishedDate
        };
      });

      await detailPage.close();
      return details;
    } catch (error) {
      console.error(`❌ Error extrayendo detalles de ${jobUrl}:`, error.message);
      return {
        description: '',
        processId: '',
        publishedDate: ''
      };
    }
  }

  /**
   * Método principal de scraping
   */
  async scrape() {
    try {
      await this.initBrowser();
      await this.navigateAndFilter();

      const totalPages = await this.getTotalPages();
      console.log(`🔍 Iniciando scraping de ${totalPages} página(s)...`);

      const allJobs = [];

      // Procesar cada página
      for (let page = 1; page <= totalPages; page++) {
        try {
          if (page > 1) {
            await this.navigateToPage(page);
          }

          const pageJobs = await this.extractJobsFromCurrentPage();
          
          // Extraer detalles de cada trabajo (limitar para evitar sobrecarga)
          const jobsWithDetails = [];
          for (const job of pageJobs.slice(0, 10)) { // Limitar a 10 por página para evitar rate limiting
            try {
              const details = await this.extractJobDetails(job.jobUrl);
              
              const enhancedJob = {
                ...job,
                description: details.description || '',
                processId: details.processId || job.id,
                publishedDate: details.publishedDate || job.publishedDate,
                company: 'Banco de Chile',
                jobType: 'Full-time',
                source: 'trabajaenelchile.cl'
              };

              jobsWithDetails.push(enhancedJob);
              
              // Pequeña pausa entre solicitudes
              await this.delay(1000);
            } catch (error) {
              console.error(`⚠️ Error procesando trabajo ${job.title}:`, error.message);
              // Agregar trabajo sin detalles si falla
              jobsWithDetails.push({
                ...job,
                description: '',
                company: 'Banco de Chile',
                jobType: 'Full-time',
                source: 'trabajaenelchile.cl'
              });
            }
          }

          allJobs.push(...jobsWithDetails);
          console.log(`✅ Página ${page} procesada: ${jobsWithDetails.length} trabajos`);

          // Pausa entre páginas
          if (page < totalPages) {
            await this.delay(2000);
          }

        } catch (error) {
          console.error(`❌ Error procesando página ${page}:`, error.message);
          this.errors.push({
            type: 'page_error',
            message: `Error en página ${page}: ${error.message}`,
            page
          });
        }
      }

      // Procesar trabajos con el sistema de tags
      this.jobs = allJobs.map(job => this.processJob(job, 'Banco de Chile'));
      this.jobs = this.jobs.filter(job => job !== null);

      console.log(`🎉 Scraping completado: ${this.jobs.length} trabajos procesados`);

    } catch (error) {
      console.error('❌ Error en scraping principal:', error.message);
      throw error;
    } finally {
      await this.closeBrowser();
    }
  }
}

module.exports = BancoChileScraper;

// Permitir ejecución directa del scraper
if (require.main === module) {
  const scraper = new BancoChileScraper();
  scraper.run()
    .then(result => {
      console.log('\n📊 Resultados finales:');
      console.log(`✅ Trabajos encontrados: ${result.jobs.length}`);
      console.log(`❌ Errores: ${result.errors.length}`);
      
      return scraper.saveJobs('bancochile_jobs.json');
    })
    .then(filepath => {
      console.log(`💾 Trabajos guardados en: ${filepath}`);
    })
    .catch(error => {
      console.error('💥 Error ejecutando scraper:', error.message);
      process.exit(1);
    });
}