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

JSONEditor.defaults.custom_validators.push(function (schema, value, path) {
  // Only validate the buildParameters array
  if (schema.title !== "Build Process Parameters") {
    return [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();
  const duplicates = new Set();

  value.forEach(item => {
    if (item && item.type) {
      if (seen.has(item.type)) {
        duplicates.add(item.type);
      }
      seen.add(item.type);
    }
  });

  if (duplicates.size > 0) {
    return [{
      path: path,
      property: 'type',
      message: `Duplicate build parameter type(s) not allowed: ${[...duplicates].join(', ')}. 
Each type (upskin, downskin, infill, contouring) may only appear once.`
    }];
  }

  return [];
});


JSONEditor.defaults.custom_validators.push(function (schema, value, path) {
  // Only validate the IGSNs field
  if (schema.title !== "IGSNs") {
    return [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();
  const duplicates = new Set();

  value.forEach(v => {
    if (seen.has(v)) {
      duplicates.add(v);
    }
    seen.add(v);
  });

  if (duplicates.size > 0) {
    return [{
      path: path,
      message: `Duplicate IGSN(s) are not allowed: ${[...duplicates].join(', ')}`
    }];
  }

  return [];
});