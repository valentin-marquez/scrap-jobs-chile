/**
 * Configuración centralizada para el sistema de scraping
 * Permite ajustar fácilmente todos los parámetros sin modificar código
 */

module.exports = {
  // Configuración global del pipeline
  pipeline: {
    outputDir: './output',
    parallel: false, // true para ejecución paralela
    maxConcurrent: 3,
    consolidatedFile: 'all_jobs.json',
    statsFile: 'pipeline_stats.json',
  },

  // Configuración por defecto para scrapers
  scraperDefaults: {
    maxRetries: 3,
    retryDelay: 2000,
    timeout: 10000,
    maxAgeDays: 7,
    outputDir: './output',
  },

  // Configuración específica por scraper
  scrapers: {
    falabella: {
      enabled: true,
      priority: 1,
      maxAgeDays: 3,
      authToken: process.env.FALABELLA_TOKEN || '329E7hbFSYyGUJrFlk2DqmW6sirxjvt4T2Sh0jWReX8',
      filters: {
        locations: ['chile', 'santiago'],
        excludeTags: ['intern'], // Excluir prácticas si no se desean
      },
    },
    fintual: {
      enabled: true,
      priority: 2,
      maxAgeDays: 7,
      filters: {
        locations: ['chile'],
        requiredTags: [], // Solo trabajos con ciertos tags
        excludeTags: [],
      },
    },
    entel: {
      enabled: false, // Deshabilitado por defecto
      priority: 3,
      maxAgeDays: 5,
      filters: {
        locations: ['chile'],
        excludeTags: [],
      },
    },
    sonda: {
      enabled: false,
      priority: 4,
      maxAgeDays: 5,
      filters: {
        locations: ['chile'],
        excludeTags: [],
      },
    },
  },

  // Filtros globales aplicados a todos los resultados
  globalFilters: {
    // Tags que DEBEN estar presentes (OR entre ellos)
    requiredTags: [], // Ej: ['javascript', 'python', 'react']

    // Tags que NO deben estar presentes
    excludeTags: [], // Ej: ['senior', 'lead']

    // Ubicaciones permitidas
    locations: ['chile'], // Solo trabajos en Chile

    // Empresas específicas (vacío = todas)
    companies: [], // Ej: ['falabella', 'fintual']

    // Tipos de trabajo
    jobTypes: [], // Ej: ['full-time', 'part-time']

    // Edad máxima en días (sobrescribe configuración individual)
    maxAgeDays: null, // null = usar configuración individual
  },

  // Configuración de tags mejorada
  tagExtraction: {
    minWordLength: 2,
    caseSensitive: false,
    includeVariations: true,
    maxTags: 50,

    // Tags personalizados específicos del mercado chileno
    customTags: [
      'sence',
      'corfo',
      'startup chile',
      'fintech',
      'insurtech',
      'proptech',
      'edtech',
      'healthtech',
      'remote work',
      'trabajo remoto',
      'híbrido',
    ],

    // Variaciones específicas para el mercado local
    localVariations: {
      'full-stack': ['fullstack', 'full stack'],
      frontend: ['front-end', 'front end'],
      backend: ['back-end', 'back end'],
      'machine learning': ['ml', 'aprendizaje automático'],
      'data science': ['ciencia de datos'],
      'product manager': ['product owner', 'po', 'pm'],
    },
  },

  // Configuración para servicios cloud (preparación futura)
  cloud: {
    // Configuración para Cloudflare Workers
    cloudflare: {
      enabled: false,
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
      workerName: 'job-scraper',
    },

    // Configuración para Supabase
    supabase: {
      enabled: false,
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
      serviceKey: process.env.SUPABASE_SERVICE_KEY,
      tableName: 'jobs',
    },

    // Configuración para Hono backend
    hono: {
      enabled: false,
      port: process.env.PORT || 3000,
      cors: {
        origin: ['http://localhost:3000'],
        credentials: true,
      },
    },
  },

  // Configuración de notificaciones (preparación futura)
  notifications: {
    enabled: false,
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: '#job-alerts',
    },
    email: {
      enabled: false,
      service: 'gmail',
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASSWORD,
      recipients: [],
    },
  },

  // Configuración de logging
  logging: {
    level: 'info', // debug, info, warn, error
    saveToFile: true,
    logFile: './output/scraping.log',
    maxLogSize: '10MB',
    maxFiles: 5,
  },
};
