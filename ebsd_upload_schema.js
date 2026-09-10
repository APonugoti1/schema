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
        });
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
            result.metadata.alternateIdentifiers.find(
                (id) => id.alternateIdentifierType.toLowerCase() === 'local'
            );
            return `${result.igsn}`;
        } catch (e) {
            return `${result.igsn}`;
        }
    }
};

// Small synchronous, deterministic hash (FNV-1a, 32-bit) rendered as base36.
function shortHash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36).padStart(6, '0');
}

function sanitizeSegment(value) {
    return String(value || '').replace(/[^A-Za-z0-9_-]/g, '_');
}

Handlebars.registerHelper('formatEbsdParamsShort', function (lookup) {
    if (!lookup || !Array.isArray(lookup) || lookup.length === 0) {
        return '';
    }

    const igsns = lookup.map((entry) => {
        if (typeof entry !== 'string') {
            return '';
        }
        return entry.split(' - ')[0].trim();
    }).filter(Boolean);

    if (igsns.length === 0) {
        return '';
    }

    const readable = igsns.length === 1
        ? sanitizeSegment(igsns[0])
        : `${sanitizeSegment(igsns[0])}_M${igsns.length}`;

    const canonical = igsns.join('||');
    return `EBSD_${readable}_${shortHash(canonical)}`;
});

function getFirstIgsn(lookup) {
    if (!Array.isArray(lookup) || lookup.length === 0) return null;
    const first = lookup[0];
    if (typeof first !== 'string') return null;
    const igsn = first.split(' - ')[0].trim();
    return igsn || null;
}

// EBSD upload marker - backend upload hook reads this "reference"
function buildEbsdUploadReference(formData) {
    return {
        formType: 'ebsd',
        ebsd: true,
        igsn: getFirstIgsn(formData.lookup),
        ebsd_id: formData.ebsd_id,
        sampleId: formData.sampleId || formData.ebsd_id,
        lookup: Array.isArray(formData.lookup) ? formData.lookup : [],
        type: 'ebsd'
    };
}

// Accepts single File, FileList, or array of Files.
function submitEbsdUpload(formData, files, itemId) {
    const ref = buildEbsdUploadReference(formData);
    const fileList = Array.isArray(files)
        ? files
        : (files && typeof files.length === 'number' ? Array.from(files) : [files]);

    const uploads = fileList.filter(Boolean).map((file) => {
        return restRequest({
            url: 'file',
            method: 'POST',
            data: {
                parentType: 'item',
                parentId: itemId,
                file: file,
                reference: JSON.stringify(ref)
            }
        });
    });

    return Promise.all(uploads);
}