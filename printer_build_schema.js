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

// Global variable to store the matrix data
let globalSetsMatrix = [];

// Function to handle the populate sets logic
function populateMatrix(form) {
    // Get current form data
    const data = (typeof form.getValue === 'function') ? form.getValue() : (form.data || {});
    const geoms = data.buildGeometries || [];
    
    // Calculate total counts from all geometries by summing their count properties
    const totalCounts = geoms.reduce((sum, geom) => sum + (Number(geom.count) || 0), 0);
    
    // Get number of sets from user input
    const numSets = Math.max(1, Number(data.setNumber) || 1);
    
    if (totalCounts === 0) {
        console.error('Total counts is 0. Please add geometries with counts.');
        return;
    }
    
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
    
    globalSetsMatrix = setsMatrix;
    
    // Generate HTML table with checkboxes
    let html = '<div style="overflow-x: auto; margin-top: 10px;"><table style="border-collapse: collapse; border: 2px solid #333;">';
    
    // Create header row with Part 1, Part 2, ... Part n
    html += '<tr style="background-color: #e8e8e8;">';
    html += '<th style="border: 1px solid #999; padding: 10px; font-weight: bold; min-width: 60px;">Set</th>';
    for (let j = 1; j <= totalCounts; j++) {
        html += `<th style="border: 1px solid #999; padding: 8px; text-align: center; font-weight: bold; min-width: 40px;">P${j}</th>`;
    }
    html += '</tr>';
    
    // Create rows for each set with checkboxes
    for (let i = 0; i < numSets; i++) {
        html += '<tr>';
        html += `<td style="border: 1px solid #999; padding: 10px; font-weight: bold; background-color: #f5f5f5; min-width: 60px;">Set ${i + 1}</td>`;
        for (let j = 1; j <= totalCounts; j++) {
            const checkboxId = `checkbox_set${i}_part${j}`;
            html += `<td style="border: 1px solid #999; padding: 8px; text-align: center; background-color: white;">
                <input type="checkbox" id="${checkboxId}" name="setsMatrix_${i}_${j}" data-set="${i}" data-part="${j}" style="width: 18px; height: 18px; cursor: pointer;">
            </td>`;
        }
        html += '</tr>';
    }
    
    html += '</table></div>';
    
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
        checkboxes.forEach((checkbox) => {
            checkbox.addEventListener('change', function() {
                const setIdx = parseInt(this.dataset.set);
                const partIdx = parseInt(this.dataset.part);
                if (globalSetsMatrix[setIdx]) {
                    const partKey = `Part ${partIdx}`;
                    globalSetsMatrix[setIdx][partKey] = this.checked;
                    // Update the hidden data field
                    if (typeof form.setValue === 'function') {
                        form.setValue('setsMatrixData', globalSetsMatrix);
                    } else if (form.data) {
                        form.data.setsMatrixData = globalSetsMatrix;
                    }
                }
            });
        });
    }, 100);
}

// Watch for populateSets checkbox change and trigger matrix generation
window.addEventListener('load', function() {
    const observer = new MutationObserver(function(mutations) {
        // Check if populateSets checkbox exists and is checked
        const populateSetsCheckbox = document.querySelector('input[name="populateSets"]');
        if (populateSetsCheckbox && populateSetsCheckbox.checked) {
            // Get form instance from the document
            if (window.currentForm) {
                populateMatrix(window.currentForm);
            }
            // Uncheck it after processing
            populateSetsCheckbox.checked = false;
        }
    });
    
    observer.observe(document.body, { subtree: true, attributes: true });
});

// Callback for when populateSets value changes
window.populateSetsCB = function (form) {
    window.currentForm = form;
    populateMatrix(form);
};
