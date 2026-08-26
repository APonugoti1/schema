window.JSONEditor.defaults.callbacks.autocomplete = {
  search_deposition: function (editor, input) {
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
    });
  },

  render_deposition: function (editor, result, props) {
    try {
      const localId = result.metadata.alternateIdentifiers.find(
        (id) => id.alternateIdentifierType.toLowerCase() === 'local'
      );

      return `<li ${props}>${result.igsn} (localId: ${localId.alternateIdentifier})</li>`;
    } catch (e) {
      return `<li ${props}>${result.igsn}</li>`;
    }
  },

  get_deposition_value: function (editor, result) {
    try {
      return `${result.igsn} - ${result._id}`;
    } catch (e) {
      return '';
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
