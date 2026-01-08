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

// --- Generate matrix as actual boolean objects ---
function generateMatrix(editor) {
    try {
        const value = editor.getValue();
        const rows = value.setNumber || 1; // number of sets
        const geoms = value.buildGeometries || [];
        const cols = geoms.reduce((sum, g) => sum + (g.count || 0), 0);
        
        if (cols < 1) {
            console.log('No columns to generate (totalCounts is 0)');
            return;
        }
        
        console.log(`Generating matrix: ${rows} rows x ${cols} columns`);
        
        const current = editor.getEditor('root.setsMatrixUI')?.getValue() || [];
        const matrix = [];
        
        // Generate rows
        for (let i = 0; i < rows; i++) {
            const row = {};
            // Generate columns (G1, G2, G3, etc.)
            for (let j = 1; j <= cols; j++) {
                const key = `G${j}`;
                // Preserve existing value if available, otherwise false
                if (current[i] && current[i][key] !== undefined) {
                    row[key] = current[i][key];
                } else {
                    row[key] = false;
                }
            }
            matrix.push(row);
        }
        
        // Update the UI editor
        const uiEditor = editor.getEditor('root.setsMatrixUI');
        if (uiEditor) {
            uiEditor.setValue(matrix);
            console.log('Matrix updated in UI');
        }
        
        // Also update setsMatrixData if it exists
        const dataEditor = editor.getEditor('root.setsMatrixData');
        if (dataEditor) {
            dataEditor.setValue(matrix);
        }
        
    } catch (error) {
        console.error('Error generating matrix:', error);
    }
}

// --- Button callback for generating matrix ---
function generateMatrixCB(editor) {
    generateMatrix(editor);
}

// --- Initialize when editor is ready ---
editor.on('ready', function() {
    // Initial matrix generation
    setTimeout(() => {
        generateMatrix(editor);
    }, 100);
    
    // Watch for changes to setNumber and buildGeometries
    let lastSetNumber = null;
    let lastGeometriesHash = null;
    
    editor.on('change', function() {
        const value = editor.getValue();
        const currentSetNumber = value.setNumber || 1;
        const geoms = value.buildGeometries || [];
        const geometriesHash = JSON.stringify(geoms);
        
        // Only regenerate matrix if setNumber or geometries changed
        if (currentSetNumber !== lastSetNumber || geometriesHash !== lastGeometriesHash) {
            lastSetNumber = currentSetNumber;
            lastGeometriesHash = geometriesHash;
            
            // Update totalCounts silently
            const totalCounts = geoms.reduce((sum, g) => sum + (g.count || 0), 0);
            if (value.totalCounts !== totalCounts) {
                value.totalCounts = totalCounts;
                // Use a small timeout to avoid infinite loop
                setTimeout(() => {
                    editor.setValue(value, false);
                }, 0);
            }
            
            // Regenerate matrix
            setTimeout(() => {
                generateMatrix(editor);
            }, 50);
        }
    });
});