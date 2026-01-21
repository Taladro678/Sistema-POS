// Script para limpiar categorías duplicadas
// Ejecutar en la consola del navegador (F12)

(function cleanDuplicateCategories() {
    // Obtener categorías del localStorage
    const categoriesStr = localStorage.getItem('categories');
    if (!categoriesStr) {
        console.log('❌ No hay categorías en localStorage');
        return;
    }

    const categories = JSON.parse(categoriesStr);
    console.log(`📊 Total de categorías antes: ${categories.length}`);

    // Crear un mapa para detectar duplicados por ID
    const uniqueCategories = new Map();
    const duplicates = [];

    categories.forEach(cat => {
        if (uniqueCategories.has(cat.id)) {
            duplicates.push(cat);
            console.log(`🔍 Duplicado encontrado: ${cat.label} (ID: ${cat.id})`);
        } else {
            uniqueCategories.set(cat.id, cat);
        }
    });

    if (duplicates.length === 0) {
        console.log('✅ No se encontraron categorías duplicadas');
        return;
    }

    // Guardar solo las categorías únicas
    const cleanedCategories = Array.from(uniqueCategories.values());
    localStorage.setItem('categories', JSON.stringify(cleanedCategories));

    console.log(`✅ Limpieza completada:`);
    console.log(`   - Categorías antes: ${categories.length}`);
    console.log(`   - Categorías después: ${cleanedCategories.length}`);
    console.log(`   - Duplicados eliminados: ${duplicates.length}`);
    console.log('🔄 Recarga la página para ver los cambios');

    return {
        before: categories.length,
        after: cleanedCategories.length,
        removed: duplicates.length,
        duplicates: duplicates
    };
})();
