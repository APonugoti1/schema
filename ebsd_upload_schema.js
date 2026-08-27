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

Handlebars.registerHelper('selectedIgsnList', function (lookup) {
  if (!Array.isArray(lookup)) {
    return [];
  }

  return lookup
    .map((entry) => {
      if (typeof entry !== 'string') {
        return '';
      }

      return entry.split(' - ')[0].trim();
    })
    .filter(Boolean);
});

function ebsdFolderToken(folderId) {
  if (typeof folderId !== 'string' || folderId.trim() === '') {
    return 'pending';
  }

  return `DIR_${folderId.trim().slice(-6)}`;
}

function sanitizeSegment(value) {
  return value.replace(/[^A-Za-z0-9_-]/g, '_');
}

Handlebars.registerHelper('ebsdFolderToken', function (folderId) {
  return ebsdFolderToken(folderId);
});

Handlebars.registerHelper('ebsdBatchId', function (lookup, folderId) {
  const entries = Array.isArray(lookup) ? lookup : [];
  const igsns = entries
    .map((entry) => {
      if (typeof entry !== 'string') {
        return '';
      }

      return entry.split(' - ')[0].trim();
    })
    .filter(Boolean);

  const igsnToken = igsns.length === 0
    ? 'pending'
    : igsns.length === 1
      ? sanitizeSegment(igsns[0])
      : `${sanitizeSegment(igsns[0])}_M${igsns.length}`;

  return `${igsnToken}_${ebsdFolderToken(folderId)}`;
});

function extractSelectedIgsns(lookup) {
  if (!Array.isArray(lookup)) {
    return [];
  }

  return lookup
    .map((entry) => {
      if (typeof entry !== 'string') {
        return '';
      }

      return entry.split(' - ')[0].trim();
    })
    .filter(Boolean);
}

function getEditorValue(editor, path, fallback) {
  try {
    const field = editor.getEditor(path);
    return field ? field.getValue() : fallback;
  } catch (e) {
    return fallback;
  }
}

function getUploadFolderId(editor) {
  return getEditorValue(editor, 'root.uploadFolder.folder', '');
}

function showAlert(message) {
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(message);
  }
}

window.JSONEditor.defaults.callbacks = window.JSONEditor.defaults.callbacks || {};
window.JSONEditor.defaults.callbacks.button = window.JSONEditor.defaults.callbacks.button || {};

window.JSONEditor.defaults.callbacks.button.assignSelectedIgsnsRecursiveCB = async function (jseditor) {
  const folderId = getUploadFolderId(jseditor);
  const lookup = getEditorValue(jseditor, 'root.lookup', []);
  const igsns = extractSelectedIgsns(lookup);

  if (!folderId) {
    showAlert('Upload an EBSD folder before assigning IGSNs.');
    return;
  }

  if (igsns.length === 0) {
    showAlert('Select at least one IGSN before assigning recursively.');
    return;
  }

  const results = [];

  for (const igsn of igsns) {
    try {
      await restRequest({
        url: `folder/${folderId}/assign_igsn`,
        method: 'PUT',
        data: {
          igsn,
          progress: false
        }
      });

      results.push({ igsn, status: 'ok' });
    } catch (error) {
      results.push({
        igsn,
        status: 'error',
        error: error && error.responseJSON ? error.responseJSON.message : String(error)
      });
    }
  }

  const failures = results.filter((result) => result.status === 'error');
  if (failures.length > 0) {
    const failedList = failures.map((result) => result.igsn).join(', ');
    showAlert(`IGSN assignment finished with errors for: ${failedList}`);
    return;
  }

  showAlert(`Assigned ${igsns.length} IGSN(s) recursively.`);
};

window.JSONEditor.defaults.callbacks.button.assignEbsdMetadataCB = async function (jseditor) {
  const folderId = getUploadFolderId(jseditor);

  if (!folderId) {
    showAlert('Upload an EBSD folder before adding EBSD metadata.');
    return;
  }

  try {
    await restRequest({
      url: `folder/${folderId}/assign_ebsd_metadata`,
      method: 'PUT',
      data: {
        progress: false
      }
    });

    showAlert('EBSD metadata assignment started successfully.');
  } catch (error) {
    const message = error && error.responseJSON ? error.responseJSON.message : String(error);
    showAlert(`Failed to add EBSD metadata: ${message}`);
  }
};
