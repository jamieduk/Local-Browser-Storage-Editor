let entries = [];
let dirty = false;

const searchInput = document.getElementById('search');
const saveBtn = document.getElementById('save-btn');
const refreshBtn = document.getElementById('refresh-btn');
const exportBtn = document.getElementById('export-btn');
const importFile = document.getElementById('import-file');
const tableContainer = document.getElementById('table-container');
const statusEl = document.getElementById('status');
const countEl = document.getElementById('count');

function setStatus(msg, isError = false) {
  statusEl.textContent = msg || '';
  statusEl.classList.toggle('error', !!isError);
}

function loadFromStorage() {
  entries = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    entries.push({ key, value: localStorage.getItem(key) ?? '' });
  }
  entries.sort((a, b) => a.key.localeCompare(b.key));
  dirty = false;
  render();
  setStatus('Loaded from localStorage.');
}

function getFiltered() {
  const q = searchInput.value.toLowerCase();
  if (!q) return entries;
  return entries.filter(e => e.key.toLowerCase().includes(q) || e.value.toLowerCase().includes(q));
}

function render() {
  const filtered = getFiltered();
  countEl.textContent = `${filtered.length} / ${entries.length} entries` + (dirty ? ' (unsaved changes)' : '');
  if (!filtered.length) {
    tableContainer.innerHTML = '<div class="empty">No entries found.</div>';
    return;
  }
  let html = '<table><thead><tr><th>Key</th><th>Value (editable)</th><th>Actions</th></tr></thead><tbody>';
  filtered.forEach((e) => {
    const idx = entries.indexOf(e);
    html += `<tr data-idx="${idx}">
      <td class="key">${escapeHtml(e.key)}</td>
      <td class="value" contenteditable="true" data-idx="${idx}">${escapeHtml(e.value)}</td>
      <td class="actions-cell"><button class="del-btn" data-idx="${idx}">Delete</button></td>
    </tr>`;
  });
  html += '</tbody></table>';
  tableContainer.innerHTML = html;

  tableContainer.querySelectorAll('td.value').forEach(td => {
    td.addEventListener('input', () => {
      const i = Number(td.getAttribute('data-idx'));
      if (entries[i]) {
        entries[i].value = td.textContent;
        dirty = true;
        countEl.textContent = `${getFiltered().length} / ${entries.length} entries (unsaved changes)`;
      }
    });
  });
  tableContainer.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = Number(btn.getAttribute('data-idx'));
      if (i >= 0 && entries[i]) {
        entries.splice(i, 1);
        dirty = true;
        render();
        setStatus('Entry removed (not saved yet).');
      }
    });
  });
}

function saveToStorage() {
  try {
    localStorage.clear();
    for (const e of entries) {
      localStorage.setItem(e.key, e.value);
    }
    dirty = false;
    render();
    setStatus('Saved to localStorage.');
  } catch (err) {
    setStatus('Save failed: ' + err.message, true);
  }
}

function exportJson() {
  const obj = {};
  for (const e of entries) obj[e.key] = e.value;
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'localStorage-export.json';
  a.click();
  URL.revokeObjectURL(a.href);
  setStatus('Exported JSON.');
}

importFile.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      throw new Error('Expected a JSON object of key-value pairs');
    }
    entries = Object.keys(data).sort().map(k => ({ key: String(k), value: String(data[k]) }));
    dirty = true;
    render();
    setStatus(`Imported ${entries.length} entries (not saved yet). Click Save to apply.`);
  } catch (err) {
    setStatus('Import failed: ' + err.message, true);
  } finally {
    importFile.value = '';
  }
});

searchInput.addEventListener('input', render);
saveBtn.addEventListener('click', saveToStorage);
refreshBtn.addEventListener('click', () => {
  if (dirty && !confirm('Discard unsaved changes and reload from localStorage?')) return;
  loadFromStorage();
});
exportBtn.addEventListener('click', exportJson);

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

loadFromStorage();
