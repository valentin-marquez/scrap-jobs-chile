# 🇨🇱 Scrap Jobs Chile

Sistema modular de web scraping para ofertas de trabajo tecnológicas en Chile. Automatiza la recolección de oportunidades laborales desde múltiples empresas chilenas del sector tech.

## 🚀 Características

- **Sistema Modular**: Scrapers independientes para cada empresa
- **Pipeline Unificado**: Consolidación automática de resultados
- **Filtrado Inteligente**: Sistema avanzado de tags y filtros
- **Ejecución Paralela**: Soporte para scraping concurrente
- **Detección de Duplicados**: Eliminación automática de ofertas repetidas
- **Estadísticas Detalladas**: Análisis completo de los datos recolectados

## 🏢 Empresas Soportadas

- **🛒 Falabella** - API con autenticación
- **💰 Fintual** - Integración con Lever
- **📡 Entel** - Portal corporativo
- **🦋 Betterfly** - Portal moderno de carreras
- **🔧 SONDA** - Portal tech especializado
- **🎨 APIUX Tech** - Integración TeamTailor
- **🏦 Banco Estado** - API simple

## 📋 Requisitos

- Node.js >= 14.0.0
- npm o yarn

## 🛠️ Instalación

```bash
# Clonar el repositorio
git clone https://github.com/valentin-marquez/scrap-jobs-chile.git
cd scrap-jobs-chile

# Instalar dependencias
npm install

# Crear directorio de salida
npm run setup
```

## 🚀 Uso

### Ejecutar todos los scrapers

```bash
# Modo secuencial (recomendado)
npm start

# Modo paralelo (más rápido, pero cuidado con rate limits)
npm run scrape:parallel
```

### Ejecutar scrapers individuales

```bash
# Scraper específico (legacy)
npm run scrape:falabella
npm run scrape:fintual
npm run scrape:entel
```

### Scripts útiles

```bash
# Limpiar archivos de salida
npm run clean

# Probar sistema de tags
npm run test:tags

# Demostración del sistema de tags
npm run demo:tags
```

## 📊 Resultados

Los datos se guardan en el directorio `output/`:

- `all_jobs.json` - Todas las ofertas consolidadas
- `pipeline_stats.json` - Estadísticas detalladas
- Archivos individuales por scraper

### Formato de datos

```json
{
  "id": "unique-job-id",
  "title": "Desarrollador Full Stack",
  "company": "Empresa Tech",
  "location": "Santiago, Chile",
  "description": "Descripción del trabajo...",
  "url": "https://empresa.com/job/123",
  "tags": ["javascript", "react", "node.js"],
  "department": "Tecnología",
  "jobType": "Tiempo completo",
  "postedDate": "2025-05-25",
  "metadata": {
    "source": "falabella",
    "scrapedAt": "2025-05-25T10:00:00Z"
  }
}
```

## ⚙️ Configuración

### Filtros Globales

Puedes modificar los filtros en `src/main.js`:

```javascript
const globalFilters = {
  requiredTags: ['javascript', 'python'], // Solo trabajos con estos tags
  excludeTags: ['senior'], // Excluir trabajos senior
  locations: ['chile', 'santiago'], // Solo ubicaciones específicas
  companies: [], // Filtrar por empresas
  maxAge: 7 // Solo trabajos de los últimos N días
};
```

### Configuración del Pipeline

```javascript
const pipeline = new ScrapingPipeline({
  outputDir: './output',
  parallel: false, // true para ejecución paralela
  maxConcurrent: 2, // Scrapers concurrentes en modo paralelo
  consolidatedFile: 'all_jobs.json',
  statsFile: 'pipeline_stats.json'
});
```

## 🏷️ Sistema de Tags

El sistema extrae automáticamente tecnologías del texto de las ofertas:

- **Lenguajes**: JavaScript, Python, Java, C#, Go, Rust, etc.
- **Frameworks**: React, Angular, Vue, Django, Express, etc.
- **Bases de datos**: PostgreSQL, MongoDB, MySQL, Redis, etc.
- **Cloud**: AWS, Azure, GCP, Docker, Kubernetes, etc.

### Filtrado inteligente

- Evita falsos positivos (ej: "rust" en "rústicos")
- Normaliza variaciones (ej: "JS" → "javascript")
- Categorización automática por tipo de tecnología

## 📈 Estadísticas

El pipeline genera estadísticas detalladas:

- Total de trabajos encontrados
- Distribución por empresa
- Top tags más frecuentes
- Distribución geográfica
- Tipos de trabajo
- Errores y warnings

## 🔧 Desarrollo

### Estructura del proyecto

```
src/
├── main.js                 # Punto de entrada principal
├── config/
│   └── config.js          # Configuraciones globales
├── scrapers/
│   ├── base-scraper.js    # Clase base para scrapers
│   ├── scraping-pipeline.js # Pipeline unificado
│   ├── falabella.scrap.js # Scraper de Falabella
│   ├── fintual.scrap.js   # Scraper de Fintual
│   └── ...                # Otros scrapers
└── utils/
    ├── common_tags.js     # Sistema de tags
    └── tag-system-demo.js # Demostración de tags
```

### Crear un nuevo scraper

1. Extiende la clase `BaseScraper` de `base-scraper.js`
2. Implementa el método `run(filters)`
3. Registra el scraper en `main.js`

```javascript
const MiScraper = require('./scrapers/mi-scraper.js');

const miScraper = new MiScraper({
  maxAgeDays: 7,
  outputDir: './output'
});

pipeline.registerScraper('mi-empresa', miScraper, {
  enabled: true,
  priority: 1
});
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-empresa`)
3. Commit tus cambios (`git commit -am 'Agregar scraper para NuevaEmpresa'`)
4. Push a la rama (`git push origin feature/nueva-empresa`)
5. Abre un Pull Request

## 📝 Notas importantes

- **Rate Limiting**: Algunos sitios tienen límites de velocidad. Usar modo secuencial si hay errores.
- **Términos de Uso**: Asegúrate de cumplir con los términos de servicio de cada sitio.
- **Ética**: Usa este proyecto de manera responsable y ética.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🐛 Problemas conocidos

- Algunos scrapers pueden fallar si las empresas cambian su estructura web
- El modo paralelo puede causar rate limiting en sitios sensibles
- Las APIs pueden requerir autenticación adicional

## 📞 Soporte

Si encuentras problemas o tienes sugerencias:

1. Revisa los [Issues existentes](https://github.com/valentin-marquez/scrap-jobs-chile/issues)
2. Abre un nuevo Issue con detalles del problema
3. Incluye logs y configuración relevante

---

⭐ **¡Si este proyecto te resulta útil, dale una estrella!** ⭐