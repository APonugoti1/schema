Handlebars.registerHelper('replaceAll', function (string, search, replacement) {
    return (string !== undefined && string !== null) ? string.replaceAll(search, replacement) : '';
});
Handlebars.registerHelper('joinarray', function (a, sep, prefix=false) {
    if (!a || !Array.isArray(a) || a.length === 0) {
        // Handle empty or undefined array
        return '';
    }
    const result = a.join(sep);
    if (result !== '' && prefix) {
        return `${sep}${result}`;
    }
    return result;
});
Handlebars.registerHelper('sumGeometryCounts', function (geoms) {
    if (!geoms || !Array.isArray(geoms) || geoms.length === 0) {
        return 0;
    }
    return geoms.reduce((sum, geom) => sum + (Number(geom.count) || 0), 0);
});

// Callback to populate sets matrix from geometry counts
window.populateSetsCB = function (form) {
    // Get current form data
    const data = (typeof form.getValue === 'function') ? form.getValue() : (form.data || {});
    const geoms = data.buildGeometries || [];
    
    // Calculate total counts from all geometries by summing their count properties
    const totalCounts = geoms.reduce((sum, geom) => sum + (Number(geom.count) || 0), 0);
    
    // Get number of sets from user input
    const numSets = Math.max(1, Number(data.setNumber) || 1);
    
    // Build m × n matrix: array of objects where each object represents a row
    // m = numSets (rows), n = totalCounts (columns)
    // Each row object has properties: "Part 1", "Part 2", ..., "Part n" with boolean values
    const setsMatrix = [];
    for (let i = 0; i < numSets; i++) {
        const row = {};
        for (let j = 1; j <= totalCounts; j++) {
            row[`Part ${j}`] = false;
        }
        setsMatrix.push(row);
    }
    
    // Write values back to form
    if (typeof form.setValue === 'function') {
        form.setValue('totalCounts', totalCounts);
        form.setValue('setsMatrix', setsMatrix);
    } else if (form.data) {
        form.data.totalCounts = totalCounts;
        form.data.setsMatrix = setsMatrix;
        if (typeof form.render === 'function') {
            form.render();
        }
    }
};
