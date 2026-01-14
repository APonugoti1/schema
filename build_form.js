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
          return `${result.igsn} - ${result._id} - ${localId.alternateIdentifier}`;
        } catch (e) {
          return `${result.igsn} - ${result._id} - no localId`;
        }
    }
};

Handlebars.registerHelper('split', function (string, separator, index) {
    try {
        return string.split(separator)[index].trim();
    } catch (e) {
        return '';
    }
});

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

Handlebars.registerHelper('formatBuildParams', function (params) {
    if (!params || !Array.isArray(params) || params.length === 0) {
        return '';
    }
    
    return params
        .map(p => `${p.type}:${p.laserSpeed}:${p.laserPower}:${p.layerThickness}:${p.hatchSpacing}`)
        .join('_');
});

Handlebars.registerHelper('isTypeUsed', function (selectedType, allParams) {
    if (!allParams || !Array.isArray(allParams)) return false;
    return allParams.some(p => p.type === selectedType);
});

// Custom validator for duplicate build parameter types
if (!window.JSONEditor.defaults.options.validators) {
    window.JSONEditor.defaults.options.validators = [];
}

window.JSONEditor.defaults.options.validators.push(function(schema, data, output) {
    if (data && data.buildParameters && Array.isArray(data.buildParameters)) {
        const types = data.buildParameters.map(p => p.type).filter(t => t);
        const uniqueTypes = new Set(types);
        
        if (types.length !== uniqueTypes.size) {
            output.push({
                path: 'buildParameters',
                property: 'buildParameters',
                message: 'Error: Duplicate build parameter types are not allowed. Each type (upskin, downskin, infill, contouring) can only be used once.',
                schema: schema
            });
        }
    }
});