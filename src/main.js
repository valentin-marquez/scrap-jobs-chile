const ScrapingPipeline = require('./scrapers/scraping-pipeline');

// Importar todos los scrapers
const FalabellaScraper = require('./scrapers/falabella.scrap');
const FintualScraper = require('./scrapers/fintual.scrap');
const EntelScraper = require('./scrapers/entel.scrap');
const BetterflyScraper = require('./scrapers/betterfly.scrap');
const SonaScraper = require('./scrapers/sona.scrap');
const ApiuxTechScraper = require('./scrapers/apiuxtech.scrap');
const BancoEstadoScraper = require('./scrapers/bancoestado.scrap');
const DesafioLatamScraper = require('./scrapers/desafiolatam.scrap');
const BancoChileScraper = require('./scrapers/bancochile.scrap');

/**
 * Archivo principal para ejecutar el pipeline de scraping
 * Sistema modular y escalable con todos los scrapers registrados
 */

async function main() {
  try {
    console.log('🚀 Iniciando sistema de scraping modular con TODOS los scrapers\n');

    // Crear pipeline con configuración
    const pipeline = new ScrapingPipeline({
      outputDir: './output',
      parallel: false, // Cambiar a true para ejecución paralela (cuidado con rate limiting)
      maxConcurrent: 2,
      consolidatedFile: 'all_jobs.json',
      statsFile: 'pipeline_stats.json',
    });

    // Registrar todos los scrapers en el pipeline
    console.log('📝 Registrando todos los scrapers disponibles...');

    // 1. Falabella - API con autenticación
    const falabellaScraper = new FalabellaScraper({
      maxAgeDays: 7,
      outputDir: './output',
    });
    pipeline.registerScraper('falabella', falabellaScraper, {
      enabled: true,
      priority: 1,
      filters: {
        locations: ['chile', 'santiago'],
        excludeTags: [],
      },
    });

    // 2. Fintual - Lever integration
    const fintualScraper = new FintualScraper({
      maxAgeDays: 7,
      outputDir: './output',
    });
    pipeline.registerScraper('fintual', fintualScraper, {
      enabled: true,
      priority: 2,
      filters: {
        locations: ['chile', 'santiago'],
        excludeTags: [],
      },
    });

    // 3. Entel - Portal de empleos corporativo
    const entelScraper = new EntelScraper({
      maxAgeDays: 7,
      outputDir: './output',
    });
    pipeline.registerScraper('entel', entelScraper, {
      enabled: true,
      priority: 3,
      filters: {
        locations: ['chile'],
        excludeTags: [],
      },
    });

    // 4. Betterfly - Portal de carreras moderno
    const betterflyScraper = new BetterflyScraper({
      maxAgeDays: 7,
      outputDir: './output',
    });
    pipeline.registerScraper('betterfly', betterflyScraper, {
      enabled: true,
      priority: 4,
      filters: {
        locations: ['chile', 'santiago'],
        excludeTags: [],
      },
    });

    // 5. SONDA - Portal de carreras tech
    const sonaScraper = new SonaScraper({
      maxAgeDays: 7,
      outputDir: './output',
    });
    pipeline.registerScraper('sonda', sonaScraper, {
      enabled: true,
      priority: 5,
      filters: {
        locations: ['chile'],
        excludeTags: [],
      },
    });

    // 6. APIUX Tech - TeamTailor integration
    const apiuxTechScraper = new ApiuxTechScraper({
      maxAgeDays: 7,
      outputDir: './output',
      retryDelay: 3000, // Más tiempo entre requests para APIUX
    });
    pipeline.registerScraper('apiux-tech', apiuxTechScraper, {
      enabled: true,
      priority: 6,
      filters: {
        locations: ['chile', 'santiago'],
        excludeTags: [],
      },
    });

    // 7. Banco Estado - API simple sin autenticación
    const bancoEstadoScraper = new BancoEstadoScraper({
      maxAgeDays: 14,
      outputDir: './output',
      retryDelay: 2000,
    });
    pipeline.registerScraper('banco-estado', bancoEstadoScraper, {
      enabled: true,
      priority: 7,
      filters: {
        locations: ['chile', 'santiago'],
        excludeTags: [],
      },
    });

    // 8. Desafío Latam - Scraper personalizado
    const desafioLatamScraper = new DesafioLatamScraper({
      maxAgeDays: 7,
      outputDir: './output',
    });
    pipeline.registerScraper('desafio-latam', desafioLatamScraper, {
      enabled: true,
      priority: 8,
      filters: {
        locations: ['chile', 'santiago'],
        excludeTags: [],
      },
    });

    // 9. Banco de Chile - Nuevo scraper para Banco de Chile
    const bancoChileScraper = new BancoChileScraper({
      maxAgeDays: 14,
      outputDir: './output',
      retryDelay: 2000,
    });
    pipeline.registerScraper('banco-chile', bancoChileScraper, {
      enabled: true,
      priority: 9,
      filters: {
        locations: ['chile', 'santiago'],
        excludeTags: [],
      },
    });

    console.log('✅ Todos los scrapers registrados:');
    console.log('   1. 🛒 Falabella (API)');
    console.log('   2. 💰 Fintual (Lever)');
    console.log('   3. 📡 Entel (Portal Corporativo)');
    console.log('   4. 🦋 Betterfly (Portal Moderno)');
    console.log('   5. 🔧 SONDA (Portal Tech)');
    console.log('   6. 🎨 APIUX Tech (TeamTailor)');
    console.log('   7. 🏦 Banco Estado (API Simple)');
    console.log('   8. 🚀 Desafío Latam (Scraper Personalizado)');
    console.log('   9. 🏦 Banco de Chile (Nuevo Scraper)');

    // Definir filtros globales mejorados
    const globalFilters = {
      requiredTags: [], // Ejemplo: ['javascript', 'python'] - solo trabajos con estos tags
      excludeTags: [], // Ejemplo: ['senior'] - excluir trabajos senior
      locations: ['chile'], // Solo trabajos en Chile
      companies: [], // Filtrar por empresas específicas
      maxAge: 7, // Solo trabajos de los últimos 7 días
    };

    console.log('🔧 Filtros globales configurados:', globalFilters);
    console.log(`\n${'='.repeat(60)}`);

    // Ejecutar pipeline completo
    console.log('🚀 Iniciando scraping de TODAS las empresas...');
    console.log('⚠️  Este proceso puede tomar varios minutos...\n');

    const results = await pipeline.run(globalFilters);

    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 RESUMEN COMPLETO DE RESULTADOS');
    console.log('='.repeat(60));
    console.log(`✅ Total de trabajos encontrados: ${results.jobs.length}`);
    console.log(`🏢 Empresas únicas: ${results.stats.uniqueCompanies}`);
    console.log(`🏷️ Tags únicos encontrados: ${results.stats.uniqueTags}`);
    console.log(
      `⏱️ Tiempo total de ejecución: ${(results.stats.totalDuration / 1000).toFixed(2)} segundos`
    );

    if (results.errors.length > 0) {
      console.log(`❌ Errores encontrados: ${results.errors.length}`);
      console.log('   (Ver archivo de stats para detalles)');
    }

    // Mostrar top tags encontrados
    console.log('\n📈 TOP 15 TAGS MÁS FRECUENTES:');
    const topTags = Object.entries(results.stats.tags.topTags).slice(0, 15);
    for (const [index, [tag, count]] of topTags.entries()) {
      console.log(`${String(index + 1).padStart(2)}. ${tag.padEnd(15)}: ${count} trabajos`);
    }

    // Mostrar distribución por empresa
    console.log('\n🏢 TRABAJOS POR EMPRESA:');
    for (const [company, count] of Object.entries(results.stats.jobs.byCompany)
      .sort(([, a], [, b]) => b - a)) { // Ordenar por cantidad descendente
      console.log(`   ${company.padEnd(15)}: ${count} trabajos`);
    }

    // Mostrar distribución por tipo de trabajo
    if (results.stats.jobs.byJobType) {
      console.log('\n💼 DISTRIBUCIÓN POR TIPO DE TRABAJO:');
      for (const [jobType, count] of Object.entries(results.stats.jobs.byJobType)
        .sort(([, a], [, b]) => b - a)) {
        console.log(`   ${jobType.padEnd(15)}: ${count} trabajos`);
      }
    }

    // Mostrar distribución por ubicación
    if (results.stats.jobs.byLocation) {
      console.log('\n📍 DISTRIBUCIÓN POR UBICACIÓN:');
      for (const [location, count] of Object.entries(results.stats.jobs.byLocation)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)) { // Top 10 ubicaciones
        console.log(`   ${location.padEnd(20)}: ${count} trabajos`);
      }
    }

    console.log('\n✅ Pipeline completado exitosamente!');
    console.log(
      `📁 Resultados consolidados guardados en: ${pipeline.config.outputDir}/${pipeline.config.consolidatedFile}`
    );
    console.log(
      `📊 Estadísticas detalladas en: ${pipeline.config.outputDir}/${pipeline.config.statsFile}`
    );

    // Sugerencias para el usuario
    console.log('\n💡 SUGERENCIAS:');
    console.log(
      '   • Para ejecutar solo algunos scrapers, deshabilita los otros cambiando enabled: false'
    );
    console.log('   • Para filtrar solo trabajos junior, agrega "junior" a requiredTags');
    console.log('   • Para excluir trabajos senior, agrega "senior" a excludeTags');
    console.log(
      '   • Puedes cambiar parallel: true para scraping más rápido (cuidado con rate limits)'
    );
  } catch (error) {
    console.error('❌ Error ejecutando pipeline:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Función para demostrar el filtrado mejorado de tags
function demonstrateTagFiltering() {
  const { extractTags } = require('./utils/common_tags');

  console.log('\n🧪 DEMOSTRACIÓN DEL FILTRADO MEJORADO DE TAGS');
  console.log('='.repeat(50));

  const testTexts = [
    'Desarrollador Rust con experiencia en sistemas rústicos', // Antes: falso positivo con "rústicos"
    'Buscamos programador JavaScript para desarrollo frontend',
    'Senior Python Developer with Django experience',
    'Necesitamos experto en React y Node.js para startup',
    'Analista de datos con conocimientos en SQL y Python',
  ];

  testTexts.forEach((text, index) => {
    console.log(`\n${index + 1}. Texto: "${text}"`);
    const tags = extractTags(text);
    console.log(`   Tags extraídos: [${tags.join(', ')}]`);
  });

  console.log('\n✅ Como puedes ver, ya no hay falsos positivos como "rust" en "rústicos"');
}

// Ejecutar demostración y pipeline
if (require.main === module) {
  demonstrateTagFiltering();
  main().catch(console.error);
}
