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


JSONEditor.defaults.callbacks = JSONEditor.defaults.callbacks || {};
JSONEditor.defaults.callbacks.button = JSONEditor.defaults.callbacks.button || {};

JSONEditor.defaults.callbacks.button.generateMatrix = function (editor) {
  const value = editor.getValue();

  const m = value.setNumber || 1;
  const n = value.totalCounts || 0;

  if (n < 1) {
    alert('Total geometry count must be at least 1');
    return;
  }

  const matrix = [];

  for (let i = 0; i < m; i++) {
    const row = {};
    for (let j = 1; j <= n; j++) {
      row[`G${j}`] = false;
    }
    matrix.push(row);
  }

  // Populate visible UI
  editor.getEditor('root.setsMatrixUI').setValue(matrix);

  // Persist hidden copy (optional but recommended)
  editor.getEditor('root.setsMatrixData').setValue(matrix);
};


editor.on('change', () => {
  const total = editor.getValue().totalCounts;
  const matrixEditor = editor.getEditor('root.setsMatrixUI');

  if (!matrixEditor) return;

  const current = matrixEditor.getValue() || [];
  const trimmed = current.map(row => {
    const newRow = {};
    for (let i = 1; i <= total; i++) {
      newRow[`G${i}`] = row[`G${i}`] || false;
    }
    return newRow;
  });

  matrixEditor.setValue(trimmed);
});
