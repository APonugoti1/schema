// --- Your existing Handlebars helpers for string and array manipulations ---
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

// --- Generate matrix as actual boolean objects, not JSON strings ---
function generateMatrix(editor) {
    const value = editor.getValue();
    const rows = value.setNumber || 4; // number of sets
    const cols = value.totalCounts || 40; // sum of geometry counts

    if (cols < 1) return;

    const current = editor.getEditor('root.setsMatrixUI')?.getValue() || [];
    const matrix = [];

    for (let i = 0; i < rows; i++) {
        const row = {};
        for (let j = 1; j <= cols; j++) {
            row[`G${j}`] = (current[i] && current[i][`G${j}`]) || false; // boolean
        }
        matrix.push(row);
    }

    const uiEditor = editor.getEditor('root.setsMatrixUI');
    const dataEditor = editor.getEditor('root.setsMatrixData');

    if (uiEditor) uiEditor.setValue(matrix);
    if (dataEditor) dataEditor.setValue(matrix);
}

// --- Auto-update matrix whenever editor changes ---
editor.on('change', () => {
    // Update totalCounts from geometry counts
    const value = editor.getValue();
    value.totalCounts = (value.buildGeometries || []).reduce((sum, g) => sum + (g.count || 0), 0);
    editor.setValue(value, false); // update silently

    // Generate or resize the checkbox matrix
    generateMatrix(editor);
});

// --- Initialize matrix on load ---
generateMatrix(editor);
