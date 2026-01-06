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

// Global storage for matrix data and form reference
let matrixFormInstance = null;
let matrixGlobalData = {};

// Register the button action callback
if (typeof rison !== 'undefined' && rison && rison.button1CB) {
    // Already registered
} else {
    // Register custom button action for matrix generation
    window.generateMatrix = function(evt, form) {
        console.log('Generate Matrix button clicked', form);
        
        if (!form) {
            console.error('Form instance not available');
            return;
        }
        
        matrixFormInstance = form;
        populateMatrixGrid(form);
    };
}

// Main function to populate the matrix grid
function populateMatrixGrid(form) {
    console.log('Starting matrix generation...');
    
    // Get form data with multiple fallback strategies
    let data = {};
    
    if (typeof form.getValue === 'function') {
        try {
            data = form.getValue();
        } catch(e) {
            console.log('getValue error, trying alternative:', e);
            data = form.data || {};
        }
    } else if (form.data) {
        data = form.data;
    } else if (form.formData) {
        data = form.formData;
    } else {
        // Last resort: try to extract from DOM
        console.warn('Could not get form data from standard methods');
        return;
    }
    
    console.log('Form data retrieved:', data);
    
    // Get geometries
    const buildGeometries = data.buildGeometries || [];
    const setNumber = Math.max(1, Number(data.setNumber) || 1);
    
    if (!buildGeometries || buildGeometries.length === 0) {
        alert('Error: Please add at least one Geometry with a count before generating the matrix.');
        return;
    }
    
    // Calculate total counts
    const totalCounts = buildGeometries.reduce((sum, geom) => {
        const count = Number(geom.count) || 0;
        console.log(`Geometry count: ${count}`);
        return sum + count;
    }, 0);
    
    console.log(`Total counts: ${totalCounts}, Sets: ${setNumber}`);
    
    if (totalCounts === 0) {
        alert('Error: Total geometry counts is 0. Please add counts to your geometries.');
        return;
    }
    
    // Create matrix data structure
    matrixGlobalData = {};
    for (let i = 0; i < setNumber; i++) {
        matrixGlobalData[`set_${i}`] = {};
        for (let j = 0; j < totalCounts; j++) {
            matrixGlobalData[`set_${i}`][`part_${j}`] = false;
        }
    }
    
    console.log('Matrix data created:', matrixGlobalData);
    
    // Generate HTML table
    let html = '<div style="overflow-x: auto; margin: 20px 0; border: 3px solid #4CAF50; padding: 15px; border-radius: 6px; background-color: #f5f5f5;">';
    html += '<p style="margin: 0 0 15px 0; font-weight: bold; color: #333;">Matrix: ' + setNumber + ' Sets × ' + totalCounts + ' Parts = ' + (setNumber * totalCounts) + ' Checkboxes</p>';
    html += '<table style="border-collapse: collapse; font-family: Arial, sans-serif; background-color: white;">';
    
    // Header row
    html += '<tr style="background-color: #4CAF50; color: white;">';
    html += '<th style="border: 2px solid #333; padding: 12px; font-weight: bold; text-align: center; min-width: 70px;">Set</th>';
    for (let j = 0; j < totalCounts; j++) {
        html += `<th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold; min-width: 38px; font-size: 11px;">P${j + 1}</th>`;
    }
    html += '</tr>';
    
    // Data rows with checkboxes
    for (let i = 0; i < setNumber; i++) {
        html += `<tr style="background-color: ${i % 2 === 0 ? '#fafafa' : '#ffffff'};">`;
        html += `<td style="border: 2px solid #333; padding: 12px; font-weight: bold; background-color: #e8f5e9; text-align: center;">Set ${i + 1}</td>`;
        
        for (let j = 0; j < totalCounts; j++) {
            const checkboxId = `matrix_set${i}_part${j}`;
            html += `<td style="border: 1px solid #ddd; padding: 10px; text-align: center; background-color: white;">
                <input type="checkbox" 
                       id="${checkboxId}" 
                       data-set="${i}" 
                       data-part="${j}" 
                       style="width: 18px; height: 18px; cursor: pointer; accent-color: #4CAF50;" 
                       onchange="window.handleMatrixCheckboxChange(this)">
            </td>`;
        }
        html += '</tr>';
    }
    
    html += '</table>';
    html += '</div>';
    
    console.log('HTML generated, updating form...');
    
    // Update form fields
    updateFormField(form, 'totalCounts', totalCounts);
    updateFormField(form, 'setsMatrixData', JSON.stringify(matrixGlobalData));
    updateFormField(form, 'setsMatrix', html);
    
    console.log('Form fields updated, rendering...');
    
    // Force re-render
    if (typeof form.render === 'function') {
        setTimeout(() => {
            try {
                form.render();
                console.log('Form rendered successfully');
            } catch(e) {
                console.log('Render error (may be normal):', e);
            }
        }, 50);
    } else if (typeof form.refresh === 'function') {
        form.refresh();
    } else if (typeof form.rebuild === 'function') {
        form.rebuild();
    }
}

// Handle checkbox state changes
window.handleMatrixCheckboxChange = function(checkbox) {
    const setIdx = parseInt(checkbox.dataset.set);
    const partIdx = parseInt(checkbox.dataset.part);
    
    console.log(`Checkbox changed: Set ${setIdx}, Part ${partIdx}, Checked: ${checkbox.checked}`);
    
    if (matrixGlobalData[`set_${setIdx}`]) {
        matrixGlobalData[`set_${setIdx}`][`part_${partIdx}`] = checkbox.checked;
        
        // Update form data if available
        if (matrixFormInstance) {
            updateFormField(matrixFormInstance, 'setsMatrixData', JSON.stringify(matrixGlobalData));
        }
    }
};

// Helper function to update form fields with proper error handling
function updateFormField(form, fieldName, value) {
    try {
        if (typeof form.setValue === 'function') {
            form.setValue(fieldName, value);
            console.log(`Field '${fieldName}' updated via setValue`);
        } else if (form.data) {
            form.data[fieldName] = value;
            console.log(`Field '${fieldName}' updated via data property`);
        } else if (form.formData) {
            form.formData[fieldName] = value;
            console.log(`Field '${fieldName}' updated via formData property`);
        }
    } catch(e) {
        console.error(`Error updating field '${fieldName}':`, e);
        // Fallback: try to update via form.data
        if (form.data) {
            form.data[fieldName] = value;
        }
    }
}
