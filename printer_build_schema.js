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
    
    // Generate HTML table with checkboxes
    let html = '<table style="border-collapse: collapse; width: 100%; margin-top: 10px;">';
    
    // Create header row with Part 1, Part 2, ... Part n
    html += '<tr style="background-color: #f0f0f0;">';
    html += '<th style="border: 1px solid #ccc; padding: 8px; font-weight: bold;">Set</th>';
    for (let j = 1; j <= totalCounts; j++) {
        html += `<th style="border: 1px solid #ccc; padding: 8px; text-align: center; font-weight: bold;">P${j}</th>`;
    }
    html += '</tr>';
    
    // Create rows for each set with checkboxes
    for (let i = 0; i < numSets; i++) {
        html += '<tr>';
        html += `<td style="border: 1px solid #ccc; padding: 8px; font-weight: bold; background-color: #f9f9f9;">Set ${i + 1}</td>`;
        for (let j = 1; j <= totalCounts; j++) {
            const partKey = `Part ${j}`;
            const checkboxId = `checkbox_set${i + 1}_part${j}`;
            html += `<td style="border: 1px solid #ccc; padding: 8px; text-align: center;">
                <input type="checkbox" id="${checkboxId}" name="setsMatrix_${i}_${j}" data-set="${i}" data-part="${j}" style="width: 18px; height: 18px; cursor: pointer;">
            </td>`;
        }
        html += '</tr>';
    }
    
    html += '</table>';
    
    // Write values back to form
    if (typeof form.setValue === 'function') {
        form.setValue('totalCounts', totalCounts);
        form.setValue('setsMatrixData', setsMatrix);
        form.setValue('setsMatrix', html);
    } else if (form.data) {
        form.data.totalCounts = totalCounts;
        form.data.setsMatrixData = setsMatrix;
        form.data.setsMatrix = html;
        if (typeof form.render === 'function') {
            form.render();
        }
    }
    
    // Attach event listeners to checkboxes after rendering
    setTimeout(() => {
        const checkboxes = document.querySelectorAll('input[name^="setsMatrix_"]');
        checkboxes.forEach((checkbox, index) => {
            checkbox.addEventListener('change', function() {
                const setIdx = parseInt(this.dataset.set);
                const partIdx = parseInt(this.dataset.part) - 1;
                if (setsMatrix[setIdx]) {
                    const partKey = `Part ${this.dataset.part}`;
                    setsMatrix[setIdx][partKey] = this.checked;
                    // Update the hidden data field
                    if (typeof form.setValue === 'function') {
                        form.setValue('setsMatrixData', setsMatrix);
                    } else if (form.data) {
                        form.data.setsMatrixData = setsMatrix;
                    }
                }
            });
        });
    }, 100);
};
