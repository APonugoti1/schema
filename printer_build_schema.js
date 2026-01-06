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

// Callback to populate sets matrix from geometry counts
window.populateSetsCB = function (form) {
    // Get current form data
    const data = (typeof form.getValue === 'function') ? form.getValue() : (form.data || {});
    const geoms = data.buildGeometries || [];
    
    // Calculate total counts from all geometries by summing their count properties
    const totalCounts = geoms.reduce((sum, geom) => sum + (Number(geom.count) || 0), 0);
    
    // Get number of sets from user input
    const numSets = Math.max(1, Number(data.setNumber) || 1);
    
    // Build m × n matrix: array of arrays where each inner array represents a row of checkboxes
    // m = numSets (rows), n = totalCounts (columns)
    const setsMatrix = [];
    for (let i = 0; i < numSets; i++) {
        // Each row is an array of booleans (checkboxes), initialized to false
        const row = new Array(totalCounts).fill(false);
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
