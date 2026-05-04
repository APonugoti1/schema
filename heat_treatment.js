window.JSONEditor.defaults.callbacks.autocomplete = {
    'search_deposition': function (editor, input) {
        if (input.length < 3) {
            return [];
        }

        return restRequest({
            url: 'deposition',
            method: 'GET',
            data: {
                q: input,
                limit: 10
            }
        })
    },
    'render_deposition': function (editor, result, props) {
        try {
          const localId = result.metadata.alternateIdentifiers.find(
              (id) => id.alternateIdentifierType.toLowerCase() === 'local'
          );
          return `<li ${props}> ${result.igsn} (localId: ${localId.alternateIdentifier})</li>`;
        } catch (e) {
          return `<li ${props}> ${result.igsn} (title: ${result.metadata.titles[0]['title']})</li>`;
        }
    },
    'get_deposition_value': function (editor, result) {
        try {
          const localId = result.metadata.alternateIdentifiers.find(
            (id) => id.alternateIdentifierType.toLowerCase() === 'local'
          );
          return `${result.igsn}`;
        } catch (e) {
          return `${result.igsn}`;
        }
    }
};

Handlebars.registerHelper('formatHTParamsShort', function (stress_relief, heat_treatment) {
    if (!stress_relief) {
        return '';
    }
    
    // Build SR params array - include units/labels with values
    const srPartsArray = [];
    
    if (stress_relief.time_hr) srPartsArray.push(`${stress_relief.time_hr}hr`);
    if (stress_relief.temperature_C) srPartsArray.push(`${stress_relief.temperature_C}C`);
    if (stress_relief.ramp_up_C_per_min) srPartsArray.push(`${stress_relief.ramp_up_C_per_min}rpm`);
    if (stress_relief.cool) srPartsArray.push(`${stress_relief.cool.substring(0, 1).toUpperCase()}${stress_relief.cool.substring(1).toLowerCase()}`);
    if (stress_relief.environment) srPartsArray.push(`${stress_relief.environment}`);
    
    const srParams = srPartsArray.join('-');
    
    // Heat Treatment parameters
    let htParams = '';
    let hasHIP = false;
    
    if (heat_treatment && Array.isArray(heat_treatment) && heat_treatment.length > 0) {
        const htPartsArray = heat_treatment.map(ht => {
            // Check if HIP was applied
            if (ht.HIP && typeof ht.HIP === 'object' && ht.HIP.pressure_MPa) {
                hasHIP = true;
            }
            
            // Build HT params array - include units/labels with values
            const htSubArray = [];
            if (ht.time_hr) htSubArray.push(`${ht.time_hr}hr`);
            if (ht.temperature_C) htSubArray.push(`${ht.temperature_C}C`);
            if (ht.ramp_up_C_per_min) htSubArray.push(`${ht.ramp_up_C_per_min}rpm`);
            if (ht.cool) htSubArray.push(`${ht.cool.substring(0, 1).toUpperCase()}${ht.cool.substring(1).toLowerCase()}`);
            if (ht.environment) htSubArray.push(`${ht.environment}`);
            
            return htSubArray.join('-');
        });
        
        htParams = htPartsArray.join('_');
    }
    
    // Final format: HT_[SR params]_SR[_HT params][_hipped]
    let result = `HT_${srParams}_SR`;
    
    if (htParams) {
        result += `_${htParams}`;
    }
    
    if (hasHIP) {
        result += `_hipped`;
    }
    
    return result;
});

// Validator to prevent changing HeattreatmentID to a completely different value
JSONEditor.defaults.custom_validators.push(function (schema, value, path) {
  // Only validate HeattreatmentID field
  if (!schema.title || schema.title !== "Heat Treatment ID") {
    return [];
  }

  if (!value) {
    return [];
  }

  // Check if value starts with HT_ format
  if (typeof value === 'string' && !value.startsWith('HT_')) {
    // If someone tries to set it to something that doesn't look like the format, reject it
    return [{
      path: path,
      message: `Invalid Heat Treatment ID format. Format must be: HT_[parameters]_SR`
    }];
  }

  return [];
});