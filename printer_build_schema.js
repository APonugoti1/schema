Handlebars.registerHelper('replaceAll', function (string, search, replacement) {
    return (string !== undefined && string !== null) ? string.replaceAll(search, replacement) : '';
});

Handlebars.registerHelper('joinarray', function (a, sep, prefix=false) {
    if (!a || !Array.isArray(a) || a.length === 0) {
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


JSONEditor.defaults.callbacks = JSONEditor.defaults.callbacks || {};
JSONEditor.defaults.callbacks.button = JSONEditor.defaults.callbacks.button || {};

Handlebars.registerHelper('generateMatrix', function(setNumber, totalCounts) {
    const rows = setNumber || 4;
    const cols = totalCounts || 40;
    const matrix = [];

    for (let i = 0; i < rows; i++) {
        const row = {};
        for (let j = 1; j <= cols; j++) {
            row[`G${j}`] = false; // default unchecked
        }
        matrix.push(row);
    }

    // Return as JSON string so JSONEditor can parse it
    return JSON.stringify(matrix);
});


Handlebars.registerHelper('trimMatrix', function(matrix, totalCounts) {
    const total = totalCounts || 40; // fallback to 40 if not provided
    if (!matrix || !Array.isArray(matrix)) {
        return JSON.stringify([]);
    }

    const trimmed = matrix.map(row => {
        const newRow = {};
        for (let i = 1; i <= total; i++) {
            newRow[`G${i}`] = row[`G${i}`] || false;
        }
        return newRow;
    });

    return JSON.stringify(trimmed);
});
