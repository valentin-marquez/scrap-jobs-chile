const { tagSystem, extractTags } = require('./common_tags');

/**
 * Demostración del sistema avanzado de tags
 * Muestra normalización, agrupación y análisis de equivalencias
 */

console.log('🧪 DEMOSTRACIÓN DEL SISTEMA AVANZADO DE TAGS');
console.log('='.repeat(60));

// 1. Demostrar normalización de tags equivalentes
console.log('\n1. 📝 NORMALIZACIÓN DE TAGS EQUIVALENTES');
console.log('-'.repeat(40));

const equivalentTags = [
  'gcp',
  'google cloud',
  'Google Cloud Platform',
  'js',
  'javascript',
  'JavaScript',
  'k8s',
  'kubernetes',
  'Kubernetes',
  'ts',
  'typescript',
  'TypeScript',
  'react-native',
  'React Native',
];

console.log('Tags originales:', equivalentTags);
const normalizedTags = tagSystem.normalizeTags(equivalentTags);
console.log('Tags normalizados:', normalizedTags);
console.log('✅ Duplicados eliminados:', equivalentTags.length - normalizedTags.length);

// 2. Analizar texto con diferentes variaciones
console.log('\n2. 🔍 ANÁLISIS DE TEXTO CON VARIACIONES');
console.log('-'.repeat(40));

const jobDescriptions = [
  'Desarrollador con experiencia en GCP y K8s para microservicios',
  'Frontend developer with React.js and TypeScript knowledge',
  'Buscamos experto en Google Cloud Platform y React Native',
  'Backend engineer: Node.js, PostgreSQL, Docker, AWS',
];

for (const [index, desc] of jobDescriptions.entries()) {
  console.log(`\n${index + 1}. "${desc}"`);
  const tags = extractTags(desc);
  console.log(`   Tags extraídos: [${tags.join(', ')}]`);
}

// 3. Demostrar agrupación de tags
console.log('\n3. 🏷️ AGRUPACIÓN DE TAGS POR CATEGORÍAS');
console.log('-'.repeat(40));

const sampleTags = ['react', 'python', 'aws', 'postgresql', 'docker', 'jest'];
for (const tag of sampleTags) {
  const group = tagSystem.getTagGroup(tag);
  const category = tagSystem.getTagCategory(tag);
  console.log(`${tag} → Categoría: ${category}, Grupo: ${group ? group.name : 'ninguno'}`);
}

// 4. Sugerir tags relacionados
console.log('\n4. 🔗 TAGS RELACIONADOS');
console.log('-'.repeat(40));

const baseTag = 'react';
const relatedTags = tagSystem.getRelatedTags(baseTag);
console.log(`Tags relacionados con "${baseTag}":`, relatedTags);

// 5. Análisis completo de tags de un trabajo
console.log('\n5. 📊 ANÁLISIS COMPLETO DE TAGS');
console.log('-'.repeat(40));

const jobTags = ['js', 'react', 'gcp', 'postgres', 'k8s', 'javascript', 'google cloud'];
const analysis = tagSystem.analyzeTags(jobTags);

console.log('Tags originales:', analysis.original);
console.log('Tags normalizados:', analysis.normalized);
console.log('Duplicados eliminados:', analysis.duplicatesRemoved);
console.log('Por categorías:', analysis.categories);
console.log('Por grupos:', Object.keys(analysis.groups));

// 6. Sugerencias de búsqueda
console.log('\n6. 💡 SUGERENCIAS DE BÚSQUEDA');
console.log('-'.repeat(40));

const searchQueries = ['react', 'cloud', 'data'];
for (const query of searchQueries) {
  const suggestions = tagSystem.suggestTags(query, 5);
  console.log(`\nBúsqueda: "${query}"`);
  for (const suggestion of suggestions) {
    console.log(`  → ${suggestion.tag} (${suggestion.type}, relevancia: ${suggestion.relevance})`);
  }
}

// 7. Estadísticas de una colección de tags
console.log('\n7. 📈 ESTADÍSTICAS DE TAGS');
console.log('-'.repeat(40));

const allJobTags = [
  'javascript',
  'python',
  'react',
  'aws',
  'docker',
  'js',
  'gcp',
  'kubernetes',
  'postgresql',
  'typescript',
  'google cloud',
  'k8s',
  'node.js',
  'mongo',
];

const stats = tagSystem.getTagStats(allJobTags);
console.log('Total de tags:', stats.total);
console.log('Tags únicos (después de normalización):', stats.unique);
console.log('Por categoría:', stats.byCategory);
console.log('Por grupo:', stats.byGroup);
console.log('Más comunes:', stats.mostCommon);

// 8. Casos de uso prácticos
console.log('\n8. 🎯 CASOS DE USO PRÁCTICOS');
console.log('-'.repeat(40));

// Caso 1: Filtrar trabajos de cloud
console.log('\n• Trabajos de Cloud Computing:');
const cloudTags = tagSystem.getTagsByCategory('cloud');
console.log('  Tags de cloud:', cloudTags);

// Caso 2: Buscar trabajos de frontend
console.log('\n• Trabajos de Frontend:');
const frontendGroup = tagSystem.tagGroups['frontend-frameworks'];
console.log('  Frameworks frontend:', frontendGroup.tags);

// Caso 3: Normalizar lista de skills de CV
console.log('\n• Normalizar skills de CV:');
const cvSkills = ['React.js', 'Node', 'GCP', 'MongoDB', 'K8s'];
const normalizedSkills = tagSystem.normalizeTags(cvSkills);
console.log('  Skills originales:', cvSkills);
console.log('  Skills normalizados:', normalizedSkills);

console.log(`\n${'='.repeat(60)}`);
console.log('✅ Demostración completada. El sistema maneja:');
console.log('   • Normalización automática de equivalencias');
console.log('   • Eliminación inteligente de duplicados');
console.log('   • Agrupación por categorías y grupos');
console.log('   • Sugerencias basadas en contexto');
console.log('   • Análisis estadístico avanzado');
console.log('='.repeat(60));

module.exports = {
  runDemo: () => {
    // Esta función puede ser llamada desde otros archivos
    console.log('Ejecutando demostración del sistema de tags...');
  },
};
