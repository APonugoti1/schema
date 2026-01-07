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
let columnHeaders = []; // Store dynamic column headers

// Geometry type code mapping
const geometryCodeMap = {
    '4PTF': '4PTF',
    'TEN': 'TEN',
    'AXFT': 'AXFT',
    'CP': 'CP',
    'IPYR': 'IPYR',
    'FCG': 'FCG'
};

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
    
    // Calculate total counts and build column headers dynamically
    columnHeaders = [];
    let totalCounts = 0;
    
    buildGeometries.forEach((geom) => {
        const count = Number(geom.count) || 0;
        const geometryType = geom.geometryType || 'UNKNOWN';
        const typeCode = geometryCodeMap[geometryType] || geometryType;
        
        console.log(`Geometry: ${typeCode}, Count: ${count}`);
        
        // Create column headers: 4PTF1, 4PTF2, ..., 4PTF5
        for (let i = 1; i <= count; i++) {
            columnHeaders.push(`${typeCode}${i}`);
        }
        totalCounts += count;
    });
    
    console.log(`Total counts: ${totalCounts}, Sets: ${setNumber}`);
    console.log('Column headers:', columnHeaders);
    
    if (totalCounts === 0) {
        alert('Error: Total geometry counts is 0. Please add counts to your geometries.');
        return;
    }
    
    // Create matrix data structure with dynamic column names
    matrixGlobalData = {};
    for (let i = 0; i < setNumber; i++) {
        matrixGlobalData[`set_${i}`] = {};
        for (let j = 0; j < columnHeaders.length; j++) {
            matrixGlobalData[`set_${i}`][columnHeaders[j]] = false;
        }
    }
    
    console.log('Matrix data created:', matrixGlobalData);
    
    // Generate HTML table with dynamic headers
    let html = '<div style="overflow-x: auto; margin: 20px 0; border: 3px solid #4CAF50; padding: 15px; border-radius: 6px; background-color: #f5f5f5;">';
    html += '<p style="margin: 0 0 15px 0; font-weight: bold; color: #333; font-size: 16px;">Matrix: ' + setNumber + ' Sets × ' + totalCounts + ' Parts = ' + (setNumber * totalCounts) + ' Checkboxes</p>';
    html += '<table style="border-collapse: collapse; font-family: Arial, sans-serif; background-color: white; border: 2px solid #333;">';
    
    // Header row with dynamic column names
    html += '<tr style="background-color: #4CAF50; color: white;">';
    html += '<th style="border: 2px solid #333; padding: 12px; font-weight: bold; text-align: center; min-width: 70px;">Set</th>';
    columnHeaders.forEach((header, idx) => {
        html += `<th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold; min-width: 50px; font-size: 12px;">${header}</th>`;
    });
    html += '</tr>';
    
    // Data rows with checkboxes for sets (S1, S2, etc.)
    for (let i = 0; i < setNumber; i++) {
        html += `<tr style="background-color: ${i % 2 === 0 ? '#fafafa' : '#ffffff'};">`;
        html += `<td style="border: 2px solid #333; padding: 12px; font-weight: bold; background-color: #e8f5e9; text-align: center; font-size: 14px;">S${i + 1}</td>`;
        
        columnHeaders.forEach((header, idx) => {
            const checkboxId = `matrix_set${i}_${header}`;
            html += `<td style="border: 1px solid #ddd; padding: 10px; text-align: center; background-color: white;">
                <input type="checkbox" 
                       id="${checkboxId}" 
                       data-set="${i}" 
                       data-column="${header}" 
                       style="width: 18px; height: 18px; cursor: pointer; accent-color: #4CAF50;" 
                       onchange="window.handleMatrixCheckboxChange(this)">
            </td>`;
        });
        html += '</tr>';
    }
    
    html += '</table>';
    html += '</div>';
    
    console.log('HTML generated:', html.substring(0, 200) + '...');
    
    // Update form fields
    console.log('Updating totalCounts to:', totalCounts);
    updateFormField(form, 'totalCounts', totalCounts);
    
    console.log('Updating setsMatrixData...');
    updateFormField(form, 'setsMatrixData', JSON.stringify(matrixGlobalData));
    
    console.log('Updating setsMatrix (HTML)...');
    updateFormField(form, 'setsMatrix', html);
    
    console.log('Form fields updated, forcing display...');
    
    // Try multiple methods to ensure rendering
    setTimeout(() => {
        // Method 1: Direct field update and render
        if (typeof form.render === 'function') {
            try {
                form.render();
                console.log('Form rendered via render()');
            } catch(e) {
                console.log('Render error:', e);
            }
        }
        
        // Method 2: Refresh
        if (typeof form.refresh === 'function') {
            try {
                form.refresh();
                console.log('Form refreshed via refresh()');
            } catch(e) {
                console.log('Refresh error:', e);
            }
        }
        
        // Method 3: Rebuild
        if (typeof form.rebuild === 'function') {
            try {
                form.rebuild();
                console.log('Form rebuilt via rebuild()');
            } catch(e) {
                console.log('Rebuild error:', e);
            }
        }
        
        // Method 4: Try to find and update the DOM directly
        const setsMatrixField = document.querySelector('[name="setsMatrix"]');
        if (setsMatrixField) {
            setsMatrixField.innerHTML = html;
            console.log('Direct DOM update applied to setsMatrix field');
        }
        
        // Method 5: Try to update parent container
        const matrixContainer = document.getElementById('setsMatrix');
        if (matrixContainer) {
            matrixContainer.innerHTML = html;
            console.log('Direct DOM update applied to setsMatrix container');
        }
        
        // Log success
        console.log('Matrix table generation complete. Table should be visible on the page.');
    }, 100);
}

// Handle checkbox state changes
window.handleMatrixCheckboxChange = function(checkbox) {
    const setIdx = parseInt(checkbox.dataset.set);
    const columnName = checkbox.dataset.column;
    
    console.log(`Checkbox changed: Set ${setIdx}, Column ${columnName}, Checked: ${checkbox.checked}`);
    
    if (matrixGlobalData[`set_${setIdx}`]) {
        matrixGlobalData[`set_${setIdx}`][columnName] = checkbox.checked;
        
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
