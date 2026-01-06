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

// Global storage for matrix data
let formInstance = null;
let matrixData = {};

// Main function to generate the matrix
window.generateMatrix = function(form) {
    formInstance = form;
    
    // Get form data
    let data;
    if (typeof form.getValue === 'function') {
        try {
            data = form.getValue();
        } catch(e) {
            data = form.data || {};
        }
    } else {
        data = form.data || {};
    }
    
    const buildGeometries = data.buildGeometries || [];
    const setNumber = Math.max(1, Number(data.setNumber) || 1);
    
    // Calculate total counts from geometries
    const totalCounts = buildGeometries.reduce((sum, geom) => {
        return sum + (Number(geom.count) || 0);
    }, 0);
    
    if (totalCounts === 0) {
        alert('Error: No geometries with counts found. Please add at least one geometry with a count.');
        return;
    }
    
    // Create matrix data structure
    matrixData = {};
    for (let i = 0; i < setNumber; i++) {
        matrixData[`set_${i}`] = {};
        for (let j = 0; j < totalCounts; j++) {
            matrixData[`set_${i}`][`part_${j}`] = false;
        }
    }
    
    // Generate HTML table
    let html = '<div style="overflow-x: auto; margin: 20px 0; border: 2px solid #333; padding: 10px; border-radius: 4px;">';
    html += '<table style="border-collapse: collapse; font-family: Arial, sans-serif;">';
    
    // Header row
    html += '<tr style="background-color: #4CAF50; color: white;">';
    html += '<th style="border: 1px solid #333; padding: 12px; font-weight: bold; text-align: center; min-width: 70px;">Set</th>';
    for (let j = 0; j < totalCounts; j++) {
        html += `<th style="border: 1px solid #333; padding: 8px; text-align: center; font-weight: bold; min-width: 45px; font-size: 12px;">P${j + 1}</th>`;
    }
    html += '</tr>';
    
    // Data rows with checkboxes
    for (let i = 0; i < setNumber; i++) {
        html += `<tr style="background-color: ${i % 2 === 0 ? '#f9f9f9' : '#ffffff'};">`;
        html += `<td style="border: 1px solid #333; padding: 12px; font-weight: bold; background-color: #e8f5e9; text-align: center;">Set ${i + 1}</td>`;
        
        for (let j = 0; j < totalCounts; j++) {
            const checkboxId = `matrix_set${i}_part${j}`;
            html += `<td style="border: 1px solid #333; padding: 10px; text-align: center;">
                <input type="checkbox" 
                       id="${checkboxId}" 
                       data-set="${i}" 
                       data-part="${j}" 
                       style="width: 20px; height: 20px; cursor: pointer;" 
                       onchange="window.onMatrixCheckboxChange(this)">
            </td>`;
        }
        html += '</tr>';
    }
    
    html += '</table>';
    html += '</div>';
    
    // Update form fields
    updateFormField(form, 'totalCounts', totalCounts);
    updateFormField(form, 'setsMatrixData', JSON.stringify(matrixData));
    updateFormField(form, 'setsMatrix', html);
    
    // Re-render if needed
    if (typeof form.render === 'function') {
        setTimeout(() => form.render(), 100);
    }
};

// Handle checkbox changes
window.onMatrixCheckboxChange = function(checkbox) {
    const setIdx = parseInt(checkbox.dataset.set);
    const partIdx = parseInt(checkbox.dataset.part);
    
    if (matrixData[`set_${setIdx}`]) {
        matrixData[`set_${setIdx}`][`part_${partIdx}`] = checkbox.checked;
        
        // Update form data
        if (formInstance) {
            updateFormField(formInstance, 'setsMatrixData', JSON.stringify(matrixData));
        }
    }
};

// Helper function to update form fields
function updateFormField(form, fieldName, value) {
    if (typeof form.setValue === 'function') {
        try {
            form.setValue(fieldName, value);
        } catch(e) {
            if (form.data) {
                form.data[fieldName] = value;
            }
        }
    } else if (form.data) {
        form.data[fieldName] = value;
    }
}
