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
          const localId = result.metadata.alternateIdentifiers.find(
            (id) => id.alternateIdentifierType.toLowerCase() === 'local'
          );
          return `${result.igsn}`;
        } catch (e) {
          return `${result.igsn}`;
        }
    }
};

// Small synchronous, deterministic hash (FNV-1a, 32-bit) rendered as base36.
// Used to guarantee ID uniqueness across the full selected IGSN set while
// keeping the human-readable portion short.
function shortHash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36).padStart(6, '0');
}

function sanitizeSegment(value) {
    return value.replace(/[^A-Za-z0-9_-]/g, '_');
}

Handlebars.registerHelper('formatEbsdParamsShort', function (lookup) {
    if (!lookup || !Array.isArray(lookup) || lookup.length === 0) {
        return '';
    }

    const igsns = lookup.map(entry => {
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

// EBSD upload marker - attach this to the upload reference
function buildEbsdUploadReference(formData) {
    return {
        formType: "ebsd",
        ebsd_id: formData.ebsd_id,
        lookup: Array.isArray(formData.lookup) ? formData.lookup : [],
        type: "ebsd"
    };
}

// Example usage in your upload callback:
// Accepts a single File, FileList, or array of Files and uploads them one by one.
function submitEbsdUpload(formData, files, itemId) {
    const ref = buildEbsdUploadReference(formData);
    const fileList = Array.isArray(files)
        ? files
        : (files && typeof files.length === 'number' ? Array.from(files) : [files]);

    const uploads = fileList.filter(Boolean).map(file => {
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

function extractFileId(uploadResult) {
    if (!uploadResult || typeof uploadResult !== 'object') {
        return null;
    }
    if (typeof uploadResult._id === 'string') {
        return uploadResult._id;
    }
    if (uploadResult.file && typeof uploadResult.file._id === 'string') {
        return uploadResult.file._id;
    }
    if (uploadResult.data && typeof uploadResult.data._id === 'string') {
        return uploadResult.data._id;
    }
    return null;
}

function resolveItemId(formData) {
    const candidates = [
        formData && formData.itemId,
        formData && formData.item_id,
        formData && formData.parentId,
        window.currentItemId,
        window.itemId
    ];
    const found = candidates.find(v => typeof v === 'string' && v.length > 0);
    if (found) {
        return found;
    }

    const match = (window.location && window.location.pathname)
        ? window.location.pathname.match(/\/item\/([a-f\d]{24})/i)
        : null;
    return match ? match[1] : null;
}

function dedupeFiles(files) {
    const seen = new Set();
    const out = [];

    files.forEach(file => {
        const relative = (file && typeof file.webkitRelativePath === 'string') ? file.webkitRelativePath : '';
        const key = [relative || file.name, file.size, file.lastModified].join('|');
        if (!seen.has(key)) {
            seen.add(key);
            out.push(file);
        }
    });

    return out;
}

function readAllEntryFiles(entry) {
    if (!entry) {
        return Promise.resolve([]);
    }

    if (entry.isFile) {
        return new Promise((resolve, reject) => {
            entry.file(resolve, reject);
        }).then(file => [file]);
    }

    if (!entry.isDirectory) {
        return Promise.resolve([]);
    }

    const reader = entry.createReader();

    const readEntries = () => new Promise((resolve, reject) => {
        reader.readEntries(resolve, reject);
    });

    const walk = () => {
        return readEntries().then(entries => {
            if (!entries || entries.length === 0) {
                return [];
            }
            return Promise.all(entries.map(readAllEntryFiles)).then(chunks => {
                const first = chunks.flat();
                return walk().then(rest => first.concat(rest));
            });
        });
    };

    return walk();
}

function getFilesFromDataTransfer(dataTransfer) {
    if (!dataTransfer) {
        return Promise.resolve([]);
    }

    const items = dataTransfer.items ? Array.from(dataTransfer.items) : [];
    const entryPromises = items
        .filter(item => item && item.kind === 'file')
        .map(item => {
            if (typeof item.webkitGetAsEntry === 'function') {
                return readAllEntryFiles(item.webkitGetAsEntry());
            }
            const file = item.getAsFile ? item.getAsFile() : null;
            return Promise.resolve(file ? [file] : []);
        });

    if (entryPromises.length > 0) {
        return Promise.all(entryPromises).then(chunks => dedupeFiles(chunks.flat().filter(Boolean)));
    }

    const fallback = dataTransfer.files ? Array.from(dataTransfer.files) : [];
    return Promise.resolve(dedupeFiles(fallback.filter(Boolean)));
}

function getTargetFileEditor(rootEditor, buttonEditor, uploadFor) {
    if (buttonEditor && buttonEditor.parent && buttonEditor.parent.editors && buttonEditor.parent.editors[uploadFor]) {
        return buttonEditor.parent.editors[uploadFor];
    }

    if (rootEditor && typeof rootEditor.getEditor === 'function') {
        const nested = rootEditor.getEditor(`root.files.${uploadFor}`);
        if (nested) {
            return nested;
        }
    }

    return null;
}

function openEbsdFolderUploadDialog(buttonEditor, uploadFor) {
    const rootEditor = (buttonEditor && buttonEditor.jsoneditor) || null;
    if (!rootEditor || typeof rootEditor.getValue !== 'function') {
        window.alert('Upload form is not ready. Please reload and try again.');
        return;
    }

    const targetEditor = getTargetFileEditor(rootEditor, buttonEditor, uploadFor);
    if (!targetEditor || typeof targetEditor.setValue !== 'function' || typeof targetEditor.getValue !== 'function') {
        window.alert('Could not find the upload field for storing file IDs.');
        return;
    }

    const backdrop = document.createElement('div');
    backdrop.style.position = 'fixed';
    backdrop.style.inset = '0';
    backdrop.style.background = 'rgba(0, 0, 0, 0.45)';
    backdrop.style.zIndex = '10000';
    backdrop.style.display = 'flex';
    backdrop.style.alignItems = 'center';
    backdrop.style.justifyContent = 'center';

    const panel = document.createElement('div');
    panel.style.width = 'min(760px, 92vw)';
    panel.style.maxHeight = '88vh';
    panel.style.overflow = 'auto';
    panel.style.background = '#fff';
    panel.style.borderRadius = '10px';
    panel.style.boxShadow = '0 18px 50px rgba(0, 0, 0, 0.3)';
    panel.style.padding = '18px';

    const title = document.createElement('h3');
    title.textContent = 'Upload from multiple folders';
    title.style.margin = '0 0 10px 0';

    const help = document.createElement('p');
    help.textContent = 'Drop one or more folders/files here, or use Add Folder and Add Files. Nested files are included and uploaded as a flattened file list.';
    help.style.margin = '0 0 12px 0';
    help.style.fontSize = '14px';

    const dropZone = document.createElement('div');
    dropZone.textContent = 'Drop folders or files here';
    dropZone.style.border = '2px dashed #4a8';
    dropZone.style.borderRadius = '8px';
    dropZone.style.padding = '26px';
    dropZone.style.textAlign = 'center';
    dropZone.style.fontWeight = '600';
    dropZone.style.color = '#255';
    dropZone.style.background = '#f7fffb';

    const status = document.createElement('p');
    status.textContent = 'No files queued yet.';
    status.style.margin = '10px 0';
    status.style.fontSize = '13px';

    const list = document.createElement('div');
    list.style.border = '1px solid #ddd';
    list.style.borderRadius = '6px';
    list.style.padding = '10px';
    list.style.maxHeight = '220px';
    list.style.overflow = 'auto';
    list.style.fontSize = '12px';
    list.style.background = '#fafafa';

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    actions.style.flexWrap = 'wrap';
    actions.style.marginTop = '12px';

    const addFolderBtn = document.createElement('button');
    addFolderBtn.type = 'button';
    addFolderBtn.textContent = 'Add Folder';

    const addFilesBtn = document.createElement('button');
    addFilesBtn.type = 'button';
    addFilesBtn.textContent = 'Add Files';

    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.textContent = 'Upload queued files';
    uploadBtn.style.background = '#0a6';
    uploadBtn.style.color = '#fff';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';

    actions.appendChild(addFolderBtn);
    actions.appendChild(addFilesBtn);
    actions.appendChild(uploadBtn);
    actions.appendChild(cancelBtn);

    panel.appendChild(title);
    panel.appendChild(help);
    panel.appendChild(dropZone);
    panel.appendChild(status);
    panel.appendChild(list);
    panel.appendChild(actions);
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);

    const queued = [];

    function refreshQueue() {
        const unique = dedupeFiles(queued);
        queued.length = 0;
        unique.forEach(f => queued.push(f));

        status.textContent = queued.length === 0
            ? 'No files queued yet.'
            : `${queued.length} file(s) queued.`;

        list.innerHTML = '';
        if (queued.length === 0) {
            return;
        }

        const ul = document.createElement('ul');
        ul.style.margin = '0';
        ul.style.padding = '0 0 0 18px';

        queued.slice(0, 300).forEach(file => {
            const li = document.createElement('li');
            const rel = (file && file.webkitRelativePath) ? file.webkitRelativePath : file.name;
            li.textContent = rel;
            ul.appendChild(li);
        });

        list.appendChild(ul);
        if (queued.length > 300) {
            const more = document.createElement('p');
            more.style.margin = '8px 0 0 0';
            more.textContent = `${queued.length - 300} more file(s) hidden.`;
            list.appendChild(more);
        }
    }

    function closeDialog() {
        if (backdrop && backdrop.parentNode) {
            backdrop.parentNode.removeChild(backdrop);
        }
    }

    function attachFiles(files) {
        files.filter(Boolean).forEach(f => queued.push(f));
        refreshQueue();
    }

    const folderInput = document.createElement('input');
    folderInput.type = 'file';
    folderInput.multiple = true;
    folderInput.setAttribute('webkitdirectory', '');
    folderInput.setAttribute('directory', '');
    folderInput.style.display = 'none';

    const filesInput = document.createElement('input');
    filesInput.type = 'file';
    filesInput.multiple = true;
    filesInput.style.display = 'none';

    panel.appendChild(folderInput);
    panel.appendChild(filesInput);

    folderInput.addEventListener('change', () => {
        attachFiles(Array.from(folderInput.files || []));
        folderInput.value = '';
    });

    filesInput.addEventListener('change', () => {
        attachFiles(Array.from(filesInput.files || []));
        filesInput.value = '';
    });

    addFolderBtn.addEventListener('click', () => folderInput.click());
    addFilesBtn.addEventListener('click', () => filesInput.click());
    cancelBtn.addEventListener('click', closeDialog);

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.background = '#eafff1';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.background = '#f7fffb';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.background = '#f7fffb';
        getFilesFromDataTransfer(e.dataTransfer)
            .then(files => attachFiles(files))
            .catch(() => window.alert('Could not read dropped folder contents.'));
    });

    uploadBtn.addEventListener('click', () => {
        if (queued.length === 0) {
            window.alert('Please add at least one file or folder first.');
            return;
        }

        const formData = rootEditor.getValue();
        const itemId = resolveItemId(formData);
        if (!itemId) {
            window.alert('Could not determine item ID for upload. Please ensure the form is opened from an item page.');
            return;
        }

        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';

        submitEbsdUpload(formData, queued, itemId)
            .then(results => {
                const newIds = results.map(extractFileId).filter(Boolean);
                const existing = Array.isArray(targetEditor.getValue()) ? targetEditor.getValue() : [];
                targetEditor.setValue(existing.concat(newIds));
                closeDialog();
            })
            .catch((err) => {
                const msg = (err && err.message) ? err.message : 'Upload failed.';
                window.alert(msg);
            })
            .finally(() => {
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Upload queued files';
            });
    });
}

window.JSONEditor.defaults.callbacks = window.JSONEditor.defaults.callbacks || {};
window.JSONEditor.defaults.callbacks.button = window.JSONEditor.defaults.callbacks.button || {};
window.JSONEditor.defaults.callbacks.button.ebsdFolderUploadCB = function () {
    const buttonEditor = this;
    const uploadFor = buttonEditor && buttonEditor.options && buttonEditor.options.button
        ? buttonEditor.options.button.uploadFor
        : 'file';
    openEbsdFolderUploadDialog(buttonEditor, uploadFor);
};