// Lista común de keywords para extraer como tags
const techKeywords = [
  // Lenguajes de programación
  'python',
  'java',
  'javascript',
  'typescript',
  'c#',
  'c++',
  'c',
  'ruby',
  'go',
  'golang',
  'php',
  'swift',
  'kotlin',
  'rust',
  'scala',
  'perl',
  'r',
  'matlab',
  'objective-c',
  'dart',
  'lua',
  'julia',
  'groovy',
  'assembly',
  'fortran',
  'haskell',
  'powershell',
  'bash',
  'shell',
  'solidity',
  'clojure',
  'lisp',
  'elixir',
  'erlang',

  // Frontend - Librerías y frameworks
  'html',
  'css',
  'sass',
  'less',
  'react',
  'angular',
  'vue',
  'svelte',
  'jquery',
  'bootstrap',
  'tailwind',
  'material-ui',
  'redux',
  'ember',
  'gatsby',
  'next.js',
  'nuxt',
  'webpack',
  'babel',
  'vite',
  'storybook',
  'styled-components',
  'css-in-js',
  'webgl',
  'three.js',
  'd3',
  'chart.js',
  'canvas',
  'svg',
  'pwa',
  'web components',
  'electron',
  'ionic',
  'capacitor',
  'cordova',
  'flutter',

  // Backend - Librerías y frameworks
  'node',
  'nodejs',
  'express',
  'nestjs',
  'spring',
  'django',
  'flask',
  'laravel',
  'rails',
  'asp.net',
  '.net',
  'servlet',
  'fastapi',
  'graphql',
  'rest',
  'soap',
  'grpc',
  'api',
  'microservices',
  'serverless',
  'lambda',
  'azure functions',
  'symfony',
  'codeigniter',
  'zend',
  'play framework',
  'akka',
  'gin',
  'echo',

  // Bases de datos
  'sql',
  'mysql',
  'postgresql',
  'oracle',
  'sql server',
  'sqlserver',
  'sqlite',
  'db2',
  'mongo',
  'mongodb',
  'dynamodb',
  'cassandra',
  'redis',
  'couchdb',
  'firestore',
  'bigtable',
  'influxdb',
  'neo4j',
  'graph database',
  'time series',
  'database',
  'mariadb',
  'hbase',
  'cockroachdb',
  'elasticsearch',
  'solr',
  'lucene',

  // Cloud & DevOps - Herramientas específicas
  'aws',
  'azure',
  'gcp',
  'google cloud',
  'docker',
  'kubernetes',
  'k8s',
  'jenkins',
  'gitlab-ci',
  'github actions',
  'terraform',
  'ansible',
  'puppet',
  'chef',
  'vagrant',
  'prometheus',
  'grafana',
  'datadog',
  'elk',
  'cloudformation',
  'pulumi',
  'openshift',
  'istio',
  'envoy',
  'consul',
  'vault',
  'helm',
  'argo',
  'tekton',
  'digitalocean',
  'heroku',
  'netlify',
  'vercel',
  'cloudflare',
  'akamai',
  'fastly',
  'openstack',

  // Herramientas y librerías para móviles
  'android',
  'ios',
  'react native',
  'flutter',
  'xamarin',
  'cordova',
  'ionic',
  'capacitor',
  'android studio',
  'xcode',
  'cocoapods',
  'firebase',
  'realm',

  // Control de versiones - Herramientas específicas
  'git',
  'github',
  'gitlab',
  'bitbucket',
  'svn',
  'mercurial',
  'perforce',

  // Herramientas para testing
  'selenium',
  'cypress',
  'playwright',
  'jest',
  'mocha',
  'jasmine',
  'junit',
  'pytest',
  'testng',
  'cucumber',
  'appium',
  'postman',
  'soapui',
  'loadrunner',
  'jmeter',
  'gatling',
  'locust',
  'karma',
  'enzyme',
  'rtl',
  'testing-library',

  // Big Data & IA - Librerías y herramientas específicas
  'hadoop',
  'spark',
  'kafka',
  'airflow',
  'tableau',
  'power bi',
  'looker',
  'data studio',
  'qlik',
  'tensorflow',
  'pytorch',
  'keras',
  'scikit-learn',
  'opencv',
  'pandas',
  'numpy',
  'scipy',
  'matplotlib',
  'seaborn',
  'plotly',
  'dask',
  'pyspark',
  'jupyter',
  'databricks',
  'sagemaker',
  'hugging face',
  'langchain',
  'llama',
  'spacy',
  'nltk',
  'gensim',

  // Seguridad - Herramientas específicas
  'burp suite',
  'metasploit',
  'wireshark',
  'nmap',
  'kali linux',
  'snort',
  'splunk',
  'openvas',
  'owasp zap',
  'nessus',
  'palo alto',
  'fortinet',
  'checkpoint',
  'crowdstrike',
  'carbon black',
  'cyberark',
  'okta',
  'auth0',
  'keycloak',
  'hashicorp vault',

  // Sistemas operativos y entornos
  'linux',
  'windows',
  'macos',
  'unix',
  'freebsd',
  'openbsd',
  'ubuntu',
  'debian',
  'centos',
  'rhel',
  'fedora',
  'alpine',
  'arch linux',
  'kali linux',
  'raspbian',
  'windows server',
  'active directory',
  'vmware',
  'virtualbox',
  'hyper-v',

  // UX/UI - Herramientas y tecnologías específicas
  'figma',
  'sketch',
  'adobe xd',
  'invision',
  'zeplin',
  'framer',
  'principle',
  'protopie',
  'balsamiq',
  'axure',
  'miro',
  'user research',
  'usability testing',
  'wireframing',
  'prototyping',
  'design system',
  'accessibility',
  'wcag',
  'a11y',
  'interaction design',
  'visual design',
  'user-centered design',
  'information architecture',
  'photoshop',
  'illustrator',
  'indesign',
  'after effects',
  'premiere pro',

  // Tecnologías emergentes - Herramientas específicas
  'ethereum',
  'solidity',
  'web3.js',
  'truffle',
  'hardhat',
  'ganache',
  'metamask',
  'iot',
  'arduino',
  'raspberry pi',
  'mqtt',
  'zigbee',
  'lorawan',
  'bluetooth le',
  'ar kit',
  'ar core',
  'unity',
  'unreal engine',
  'babylon.js',
  'vuforia',
  'oculus',
  'hololens',
  'tensorflow lite',
  'edge impulse',
  'ros',
  'drone kit',

  // Herramientas de desarrollo
  'visual studio code',
  'intellij',
  'pycharm',
  'webstorm',
  'eclipse',
  'netbeans',
  'vim',
  'emacs',
  'sublime text',
  'atom',
  'jira',
  'confluence',
  'slack',
  'teams',
  'notion',
  'obsidian',
  'docker desktop',
  'kubernetes dashboard',
  'lens',
  'pgadmin',
  'dbeaver',
  'mongodb compass',
  'robo 3t',
  'redis desktop manager',
  'insomnia',
  'postman',
  'soapui',
  'swagger',
  'openapi',
  'charles proxy',
  'fiddler',
];

// Mapeo de variaciones y sinónimos para mejorar la detección
const tagVariations = {
  javascript: ['js', 'javascript', 'ecmascript'],
  typescript: ['ts', 'typescript'],
  python: ['python', 'py'],
  java: ['java'],
  'c#': ['c#', 'csharp', 'c sharp'],
  'c++': ['c++', 'cpp', 'cplusplus'],
  nodejs: ['node', 'nodejs', 'node.js'],
  react: ['react', 'reactjs', 'react.js'],
  angular: ['angular', 'angularjs'],
  vue: ['vue', 'vuejs', 'vue.js'],
  'next.js': ['next', 'next.js', 'nextjs'],
  'sql server': ['sql server', 'sqlserver', 'mssql'],
  mongodb: ['mongo', 'mongodb'],
  postgresql: ['postgres', 'postgresql'],
  kubernetes: ['k8s', 'kubernetes'],
  'github actions': ['github actions', 'github-actions'],
  'google cloud': ['gcp', 'google cloud', 'google cloud platform'],
  'react native': ['react native', 'react-native'],
  'machine learning': ['ml', 'machine learning'],
  'artificial intelligence': ['ai', 'artificial intelligence'],
  'user experience': ['ux', 'user experience'],
  'user interface': ['ui', 'user interface'],
};

/**
 * Sistema avanzado de funciones para tags
 * Maneja normalización, agrupación y equivalencias de tags
 */
class TagSystem {
  constructor() {
    this.tagVariations = tagVariations;
    this.tagAliases = this.buildAliasMap();
    this.tagGroups = this.buildTagGroups();
    this.tagCategories = this.buildTagCategories();
  }

  /**
   * Construir mapa de aliases bidireccional
   */
  buildAliasMap() {
    const aliasMap = new Map();

    Object.entries(this.tagVariations).forEach(([canonical, variations]) => {
      // El tag canónico se mapea a sí mismo
      aliasMap.set(canonical, canonical);

      // Todas las variaciones se mapean al tag canónico
      variations.forEach((variation) => {
        aliasMap.set(variation.toLowerCase(), canonical);
      });
    });

    return aliasMap;
  }

  /**
   * Construir grupos de tags relacionados
   */
  buildTagGroups() {
    return {
      'cloud-platforms': {
        canonical: 'cloud platforms',
        tags: ['aws', 'azure', 'google cloud', 'digitalocean', 'heroku'],
        description: 'Plataformas de cloud computing',
      },
      'frontend-frameworks': {
        canonical: 'frontend frameworks',
        tags: ['react', 'angular', 'vue', 'svelte', 'ember'],
        description: 'Frameworks para desarrollo frontend',
      },
      'backend-frameworks': {
        canonical: 'backend frameworks',
        tags: ['express', 'django', 'flask', 'spring', 'laravel', 'rails'],
        description: 'Frameworks para desarrollo backend',
      },
      'databases-sql': {
        canonical: 'sql databases',
        tags: ['mysql', 'postgresql', 'sql server', 'oracle', 'sqlite'],
        description: 'Bases de datos relacionales',
      },
      'databases-nosql': {
        canonical: 'nosql databases',
        tags: ['mongodb', 'redis', 'cassandra', 'dynamodb', 'elasticsearch'],
        description: 'Bases de datos no relacionales',
      },
      containerization: {
        canonical: 'containerization',
        tags: ['docker', 'kubernetes', 'openshift', 'helm'],
        description: 'Tecnologías de contenedores',
      },
      'mobile-development': {
        canonical: 'mobile development',
        tags: ['react native', 'flutter', 'ionic', 'xamarin', 'android', 'ios'],
        description: 'Desarrollo móvil',
      },
      'data-science': {
        canonical: 'data science',
        tags: ['python', 'pandas', 'numpy', 'scikit-learn', 'tensorflow', 'pytorch'],
        description: 'Ciencia de datos y machine learning',
      },
      'testing-tools': {
        canonical: 'testing tools',
        tags: ['jest', 'selenium', 'cypress', 'junit', 'pytest', 'mocha'],
        description: 'Herramientas de testing',
      },
    };
  }

  /**
   * Construir categorías de tags
   */
  buildTagCategories() {
    return {
      languages: ['python', 'javascript', 'java', 'c#', 'go', 'rust', 'php', 'ruby'],
      frameworks: ['react', 'angular', 'vue', 'django', 'spring', 'express'],
      databases: ['mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch'],
      cloud: ['aws', 'azure', 'google cloud', 'docker', 'kubernetes'],
      tools: ['git', 'jenkins', 'webpack', 'babel', 'eslint'],
      concepts: ['machine learning', 'microservices', 'api', 'rest', 'graphql'],
    };
  }

  /**
   * Normalizar un tag individual a su forma canónica
   */
  normalizeTag(tag) {
    if (!tag || typeof tag !== 'string') return null;

    const cleanTag = tag.toLowerCase().trim();
    return this.tagAliases.get(cleanTag) || cleanTag;
  }

  /**
   * Normalizar array de tags
   */
  normalizeTags(tags) {
    if (!Array.isArray(tags)) return [];

    const normalized = tags
      .map((tag) => this.normalizeTag(tag))
      .filter((tag) => tag !== null)
      .filter((tag, index, arr) => arr.indexOf(tag) === index); // Eliminar duplicados

    return normalized;
  }

  /**
   * Obtener tags relacionados por grupo
   */
  getRelatedTags(tag) {
    const normalizedTag = this.normalizeTag(tag);
    const related = new Set();

    // Buscar en grupos
    Object.values(this.tagGroups).forEach((group) => {
      if (group.tags.includes(normalizedTag)) {
        group.tags.forEach((groupTag) => {
          if (groupTag !== normalizedTag) {
            related.add(groupTag);
          }
        });
      }
    });

    return Array.from(related);
  }

  /**
   * Obtener el grupo al que pertenece un tag
   */
  getTagGroup(tag) {
    const normalizedTag = this.normalizeTag(tag);

    for (const [groupKey, group] of Object.entries(this.tagGroups)) {
      if (group.tags.includes(normalizedTag)) {
        return {
          key: groupKey,
          name: group.canonical,
          description: group.description,
          tags: group.tags,
        };
      }
    }

    return null;
  }

  /**
   * Obtener la categoría de un tag
   */
  getTagCategory(tag) {
    const normalizedTag = this.normalizeTag(tag);

    for (const [category, tags] of Object.entries(this.tagCategories)) {
      if (tags.includes(normalizedTag)) {
        return category;
      }
    }

    return 'other';
  }

  /**
   * Sugerir tags basado en texto parcial
   */
  suggestTags(partialText, limit = 10) {
    const query = partialText.toLowerCase();
    const suggestions = [];

    // Buscar en tags canónicos
    Object.keys(this.tagVariations).forEach((canonical) => {
      if (canonical.includes(query)) {
        suggestions.push({
          tag: canonical,
          type: 'canonical',
          relevance: canonical.indexOf(query) === 0 ? 1 : 0.8,
        });
      }
    });

    // Buscar en variaciones
    Object.entries(this.tagVariations).forEach(([canonical, variations]) => {
      variations.forEach((variation) => {
        if (
          variation.toLowerCase().includes(query) &&
          !suggestions.find((s) => s.tag === canonical)
        ) {
          suggestions.push({
            tag: canonical,
            type: 'variation',
            matchedVariation: variation,
            relevance: variation.toLowerCase().indexOf(query) === 0 ? 0.9 : 0.6,
          });
        }
      });
    });

    return suggestions.sort((a, b) => b.relevance - a.relevance).slice(0, limit);
  }

  /**
   * Analizar tags de un trabajo y sugerir mejoras
   */
  analyzeTags(tags) {
    const normalized = this.normalizeTags(tags);
    const analysis = {
      original: tags,
      normalized,
      duplicatesRemoved: tags.length - normalized.length,
      categories: {},
      groups: {},
      relatedSuggestions: [],
      missingCommonTags: [],
    };

    // Categorizar tags
    normalized.forEach((tag) => {
      const category = this.getTagCategory(tag);
      if (!analysis.categories[category]) {
        analysis.categories[category] = [];
      }
      analysis.categories[category].push(tag);
    });

    // Agrupar tags
    normalized.forEach((tag) => {
      const group = this.getTagGroup(tag);
      if (group) {
        if (!analysis.groups[group.key]) {
          analysis.groups[group.key] = {
            name: group.name,
            tags: [],
          };
        }
        analysis.groups[group.key].tags.push(tag);
      }
    });

    // Sugerir tags relacionados
    normalized.forEach((tag) => {
      const related = this.getRelatedTags(tag);
      related.forEach((relatedTag) => {
        if (!normalized.includes(relatedTag)) {
          analysis.relatedSuggestions.push({
            suggested: relatedTag,
            basedOn: tag,
            reason: `Related to ${tag}`,
          });
        }
      });
    });

    return analysis;
  }

  /**
   * Buscar tags por categoría
   */
  getTagsByCategory(category) {
    return this.tagCategories[category] || [];
  }

  /**
   * Obtener estadísticas de tags
   */
  getTagStats(tagArray) {
    const stats = {
      total: tagArray.length,
      unique: [...new Set(tagArray)].length,
      byCategory: {},
      byGroup: {},
      mostCommon: {},
    };

    // Contar por categoría
    tagArray.forEach((tag) => {
      const category = this.getTagCategory(tag);
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    });

    // Contar por grupo
    tagArray.forEach((tag) => {
      const group = this.getTagGroup(tag);
      if (group) {
        stats.byGroup[group.key] = (stats.byGroup[group.key] || 0) + 1;
      }
    });

    // Tags más comunes
    const tagCounts = {};
    tagArray.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });

    stats.mostCommon = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reduce((acc, [tag, count]) => {
        acc[tag] = count;
        return acc;
      }, {});

    return stats;
  }
}

// Crear instancia global del sistema de tags
const tagSystem = new TagSystem();

/**
 * Función mejorada para extraer tags de texto con sistema de normalización
 */
function extractTags(text, options = {}) {
  if (!text || typeof text !== 'string') return [];

  const {
    minWordLength = 2,
    caseSensitive = false,
    includeVariations = true,
    maxTags = 50,
    normalize = true,
  } = options;

  const normalizedText = caseSensitive ? text : text.toLowerCase();
  const foundTags = new Set();

  // Función para verificar si una palabra coincide exactamente
  const isExactMatch = (keyword, text) => {
    const wordBoundaryRegex = new RegExp(
      `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
      caseSensitive ? 'g' : 'gi'
    );
    return wordBoundaryRegex.test(text);
  };

  // Buscar keywords principales
  techKeywords.forEach((keyword) => {
    if (keyword.length >= minWordLength && isExactMatch(keyword, normalizedText)) {
      foundTags.add(keyword);
    }
  });

  // Buscar variaciones si está habilitado
  if (includeVariations) {
    Object.entries(tagVariations).forEach(([mainTag, variations]) => {
      variations.forEach((variation) => {
        if (variation.length >= minWordLength && isExactMatch(variation, normalizedText)) {
          foundTags.add(normalize ? mainTag : variation);
        }
      });
    });
  }

  // Convertir a array y normalizar si se solicita
  let tagsArray = Array.from(foundTags).slice(0, maxTags);

  if (normalize) {
    tagsArray = tagSystem.normalizeTags(tagsArray);
  }

  return tagsArray;
}

/**
 * Función para validar y limpiar tags
 * @param {Array} tags - Array de tags a validar
 * @returns {Array} - Array de tags validados y limpiados
 */
function validateAndCleanTags(tags) {
  if (!Array.isArray(tags)) return [];

  return tags
    .filter((tag) => tag && typeof tag === 'string')
    .map((tag) => tag.toLowerCase().trim())
    .filter((tag) => tag.length >= 2)
    .filter((tag, index, arr) => arr.indexOf(tag) === index); // Eliminar duplicados
}

/**
 * Función para categorizar tags por tipo
 * @param {Array} tags - Array de tags
 * @returns {Object} - Objeto con tags categorizados
 */
function categorizeTags(tags) {
  const categories = {
    languages: [],
    frameworks: [],
    databases: [],
    cloud: [],
    tools: [],
    other: [],
  };

  const languageKeywords = [
    'python',
    'java',
    'javascript',
    'typescript',
    'c#',
    'c++',
    'c',
    'ruby',
    'go',
    'golang',
    'php',
    'swift',
    'kotlin',
    'rust',
    'scala',
    'perl',
    'r',
    'matlab',
  ];
  const frameworkKeywords = [
    'react',
    'angular',
    'vue',
    'svelte',
    'django',
    'flask',
    'laravel',
    'rails',
    'spring',
    'express',
    'nestjs',
  ];
  const databaseKeywords = [
    'mysql',
    'postgresql',
    'mongodb',
    'redis',
    'sqlite',
    'oracle',
    'cassandra',
    'elasticsearch',
  ];
  const cloudKeywords = ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ansible'];

  tags.forEach((tag) => {
    if (languageKeywords.includes(tag)) {
      categories.languages.push(tag);
    } else if (frameworkKeywords.includes(tag)) {
      categories.frameworks.push(tag);
    } else if (databaseKeywords.includes(tag)) {
      categories.databases.push(tag);
    } else if (cloudKeywords.includes(tag)) {
      categories.cloud.push(tag);
    } else {
      categories.other.push(tag);
    }
  });

  return categories;
}

/**
 * Función para obtener tags relacionados
 * @param {string} tag - Tag principal
 * @returns {Array} - Array de tags relacionados
 */
function getRelatedTags(tag) {
  const relatedTags = {
    javascript: ['frontend', 'web development', 'nodejs'],
    python: ['backend', 'data science', 'machine learning'],
    react: ['frontend', 'javascript', 'web development'],
    django: ['backend', 'python', 'web framework'],
    aws: ['cloud', 'devops', 'infrastructure'],
    docker: ['containerization', 'devops', 'deployment'],
    // Agregar más relaciones según sea necesario
  };

  return relatedTags[tag] || [];
}

// Exportar funciones y datos
module.exports = {
  techKeywords,
  tagVariations,
  extractTags,
  validateAndCleanTags,
  categorizeTags,
  getRelatedTags,
  tagSystem,
  TagSystem,
};
