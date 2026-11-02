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
        return `${result.igsn}`;
    }
};

// Cross-sectional area (mm^2) of a round coupon from its diameter in inches.
Handlebars.registerHelper('circleArea', function (diameterIn) {
    const d = parseFloat(diameterIn);
    if (isNaN(d)) {
        return '';
    }
    const dMm = d * 25.4;
    return (Math.PI * dMm * dMm / 4).toFixed(2);
});
