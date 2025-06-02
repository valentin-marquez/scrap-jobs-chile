# 🇨🇱 Scrap Jobs Chile

Sistema modular de web scraping para ofertas de trabajo tecnológicas en Chile. Automatiza la recolección de oportunidades laborales desde múltiples empresas chilenas del sector tech con **salida simple en archivos JSON**.

## 🚀 Características

- **Sistema Modular**: Scrapers independientes para cada empresa
- **Pipeline Unificado**: Consolidación automática de resultados
- **Filtrado Inteligente**: Sistema avanzado de tags y filtros
- **Ejecución Paralela**: Soporte para scraping concurrente
- **Detección de Duplicados**: Eliminación automática de ofertas repetidas
- **Estadísticas Detalladas**: Análisis completo de los datos recolectados
- **Sin Base de Datos**: Todo se guarda en archivos JSON simples
- **Zero Config**: Funciona inmediatamente sin configuraciones complejas

## 🏢 Empresas Soportadas

- **🛒 Falabella** - API con autenticación
- **💰 Fintual** - Integración con Lever
- **📡 Entel** - Portal corporativo
- **🦋 Betterfly** - Portal moderno de carreras
- **🔧 SONDA** - Portal tech especializado
- **🎨 APIUX Tech** - Integración TeamTailor
- **🏦 Banco Estado** - API simple
- **🚀 Desafío Latam** - Portal educativo con Lever
- **🌟 Accenture** - Portal de carreras multinacional

## 📋 Requisitos

- **Bun** >= 1.0.0 (recomendado) o Node.js >= 14.0.0

## 🛠️ Instalación

```bash
# Clonar el repositorio
git clone https://github.com/valentin-marquez/scrap-jobs-chile.git
cd scrap-jobs-chile

# Instalar dependencias con Bun (recomendado)
bun install

# O con npm si prefieres
npm install

# Crear directorio de salida
bun run setup
```

## 🚀 Uso

### Ejecutar todos los scrapers

```bash
# Ejecutar pipeline completo (modo secuencial recomendado)
bun start

# Modo paralelo (más rápido, pero cuidado con rate limits)
bun run scrape:parallel
```

### Ejecutar scrapers individuales

```bash
# Scraper específico
bun run scrape:accenture
bun run scrape:falabella
bun run scrape:bancochile
bun run scrape:desafiolatam
```

### Scripts útiles

```bash
# Limpiar archivos de salida
bun run clean

# Probar sistema de tags
bun run test:tags

# Demostración del sistema de tags
bun run demo:tags
```

## 📊 Resultados

Los datos se guardan automáticamente en el directorio `output/`:

```
output/
├── all_jobs.json           # 📄 Todas las ofertas consolidadas
├── pipeline_stats.json     # 📊 Estadísticas detalladas del scraping
├── accenture_jobs.json     # 🌟 Solo trabajos de Accenture
├── falabella_jobs.json     # 🛒 Solo trabajos de Falabella
└── ...                     # Otros archivos por empresa
```

### Formato de datos

```json
{
  "id": "unique-job-id",
  "title": "Desarrollador Full Stack",
  "company": "Accenture",
  "location": "Santiago, Chile",
  "description": "# Desarrollador Full Stack\n\n## Descripción del Puesto...",
  "jobUrl": "https://accenture.com/careers/job/123",
  "tags": ["javascript", "react", "nodejs", "consulting", "technology"],
  "department": "Technology",
  "jobType": "Full-time",
  "publishedDate": "2025-06-02T10:00:00Z",
  "metadata": {
    "source": "Accenture Careers API",
    "scraper": "AccentureScraper",
    "scrapedAt": "2025-06-02T15:30:00Z"
  }
}
```

## ⚙️ Configuración Simple

### Filtros Globales

Puedes modificar los filtros directamente en `src/main.js`:

```javascript
const globalFilters = {
  requiredTags: [], // Solo trabajos con estos tags: ['javascript', 'python']
  excludeTags: [],  // Excluir trabajos: ['senior', 'lead']
  locations: ['chile'], // Solo ubicaciones: ['chile', 'santiago']
  maxAge: 7 // Solo trabajos de los últimos 7 días
};
```

### Habilitar/Deshabilitar Scrapers

```javascript
// En src/main.js, cambia enabled: true/false
pipeline.registerScraper('accenture', accentureScraper, {
  enabled: true,  // ← Cambiar a false para deshabilitar
  priority: 10,
  filters: {
    locations: ['chile', 'santiago'],
    excludeTags: [],
  },
});
```

## 🏷️ Sistema de Tags Inteligente

El sistema extrae automáticamente tecnologías del texto de las ofertas:

- **Lenguajes**: JavaScript, Python, Java, C#, Go, Rust, etc.
- **Frameworks**: React, Angular, Vue, Django, Express, etc.
- **Bases de datos**: PostgreSQL, MongoDB, MySQL, Redis, etc.
- **Cloud**: AWS, Azure, GCP, Docker, Kubernetes, etc.
- **Metodologías**: Agile, Scrum, DevOps, etc.

### Filtrado inteligente

- ✅ Evita falsos positivos (ej: "rust" en "rústicos")
- ✅ Normaliza variaciones (ej: "JS" → "javascript")
- ✅ Categorización automática por tipo de tecnología
- ✅ Específico para el mercado tech chileno

## 📈 Estadísticas Automáticas

El pipeline genera estadísticas detalladas en `pipeline_stats.json`:

```json
{
  "totalJobs": 28,
  "uniqueCompanies": 6,
  "uniqueTags": 72,
  "topTags": {
    "sql": 7,
    "technology": 6,
    "consulting": 6,
    "java": 6
  },
  "byCompany": {
    "SONDA": 7,
    "Falabella": 7,
    "Accenture": 6
  }
}
```

## 🔧 Desarrollo y Calidad de Código

Este proyecto utiliza **Biome.js** como linter y formateador:

```bash
# Verificar problemas de linting
bun run lint

# Corregir problemas automáticamente
bun run lint:fix

# Formatear código
bun run format:write

# Verificar y aplicar todas las correcciones
bun run check:fix
```

## 🏗️ Estructura del Proyecto

```
src/
├── main.js                 # 🚀 Punto de entrada principal
├── config/
│   └── config.js          # ⚙️ Configuraciones (opcional)
├── scrapers/
│   ├── base-scraper.js    # 🏗️ Clase base para scrapers
│   ├── scraping-pipeline.js # 🔄 Pipeline unificado
│   ├── accenture.scrap.js # 🌟 Scraper de Accenture
│   ├── falabella.scrap.js # 🛒 Scraper de Falabella
│   └── ...                # Otros scrapers
└── utils/
    ├── common_tags.js     # 🏷️ Sistema de tags
    └── tag-system-demo.js # 🧪 Demostración de tags
```

## ✨ Ventajas del Sistema

- **🚀 Rápido**: Powered by Bun para máximo rendimiento
- **📦 Simple**: Sin bases de datos, sin configuraciones complejas
- **🔧 Modular**: Fácil agregar nuevos scrapers
- **📊 Completo**: Estadísticas detalladas automáticas
- **🏷️ Inteligente**: Sistema avanzado de extracción de tags
- **🇨🇱 Local**: Optimizado para el mercado tech chileno

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

## 🐛 Problemas conocidos

- Algunos scrapers pueden fallar si las empresas cambian su estructura web
- El modo paralelo puede causar rate limiting en sitios sensibles

## 📞 Soporte

Si encuentras problemas o tienes sugerencias:

1. Revisa los [Issues existentes](https://github.com/valentin-marquez/scrap-jobs-chile/issues)
2. Abre un nuevo Issue con detalles del problema
3. Incluye logs y configuración relevante

---

⭐ **¡Si este proyecto te resulta útil, dale una estrella!** ⭐

**✨ Sistema simple, potente y listo para usar ✨**