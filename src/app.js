import { FORMAT_LABELS, PROFILES, analyzeBatch, buildCsv, buildReport, formatBytes, formatDimensions, getMimeType } from './core.js';

const $ = (selector) => document.querySelector(selector);
const state = { profileId: 'social', customSpecs: [], assets: [], analysis: null, toastTimer: null };
const fileInput = $('#file-input');

function currentProfile() {
  const profile = PROFILES[state.profileId];
  return { ...profile, specs: state.profileId === 'custom' ? state.customSpecs : profile.specs };
}

function policy() {
  const selected = [...document.querySelectorAll('#format-pills input:checked')].map((input) => input.value);
  return { maxSizeMB: Number($('#max-size').value || 10), allowedTypes: selected };
}

function announce(message) {
  $('#status-message').textContent = message;
}

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => element.classList.remove('visible'), 2800);
}

function safeText(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

async function fingerprint(file) {
  if (file.size > 20 * 1024 * 1024 || !globalThis.crypto?.subtle) return null;
  try {
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

async function readDimensions(file) {
  if (!('createImageBitmap' in window)) throw new Error('This browser cannot inspect image dimensions. Try a current version of Chrome, Edge, Firefox or Safari.');
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap?.close?.();
  }
}

async function inspectFile(file) {
  const mime = getMimeType(file);
  if (!FORMAT_LABELS[mime]) throw new Error('Unsupported format. Use PNG, JPEG, WebP or AVIF.');
  const dimensions = await readDimensions(file);
  const hash = await fingerprint(file);
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    type: mime,
    size: file.size,
    lastModified: file.lastModified,
    width: dimensions.width,
    height: dimensions.height,
    hash
  };
}

function refreshAnalysis() {
  state.analysis = analyzeBatch(state.assets, currentProfile().specs, policy());
  render();
}

async function addFiles(fileList) {
  const files = [...fileList];
  if (!files.length) return;
  let added = 0;
  const errors = [];
  announce(`Inspecting ${files.length} file${files.length === 1 ? '' : 's'} locally…`);
  $('#dropzone').classList.add('is-busy');
  for (const file of files) {
    try {
      const asset = await inspectFile(file);
      state.assets.push(asset);
      added += 1;
    } catch (error) {
      errors.push(`${file.name}: ${error.message}`);
    }
  }
  $('#dropzone').classList.remove('is-busy');
  fileInput.value = '';
  refreshAnalysis();
  const message = `${added} file${added === 1 ? '' : 's'} added${errors.length ? ` · ${errors.length} could not be inspected` : ''}.`;
  announce(errors.length ? `${message} ${errors.slice(0, 2).join(' ')}` : message);
  if (errors.length) toast(`${errors.length} file${errors.length === 1 ? '' : 's'} skipped. See the status message.`);
  else if (added) toast('Your files have been checked.');
}

function statusLabel(status) {
  return status === 'pass' ? 'READY' : status === 'warn' ? 'REVIEW' : 'BLOCKED';
}

function renderFile(asset) {
  const issueMarkup = asset.issues.map((issue) => `<li class="issue issue-${issue.level}"><span aria-hidden="true">${issue.level === 'fail' ? '×' : issue.level === 'warn' ? '!' : '✓'}</span>${safeText(issue.message)}</li>`).join('');
  const matches = asset.matches.length ? asset.matches.map((item) => item.label).join(' · ') : 'No exact size match';
  return `<article class="file-row">
    <div class="file-type-icon" aria-hidden="true">${safeText(asset.format.slice(0, 3))}</div>
    <div class="file-main"><div class="file-name-line"><strong title="${safeText(asset.name)}">${safeText(asset.name)}</strong><span class="status-pill status-${asset.status}">${statusLabel(asset.status)}</span></div>
      <div class="file-meta">${formatDimensions(asset.width, asset.height)} <span>·</span> ${formatBytes(asset.size)} <span>·</span> ${safeText(asset.format)}</div>
      <div class="file-match">${safeText(matches)}</div>
      ${issueMarkup ? `<ul class="issue-list">${issueMarkup}</ul>` : ''}
    </div>
    <button class="remove-file" type="button" data-remove="${safeText(asset.id)}" aria-label="Remove ${safeText(asset.name)}">×</button>
  </article>`;
}

function renderCoverage(item) {
  const found = item.status === 'found';
  return `<div class="coverage-item ${found ? 'is-found' : 'is-missing'}">
    <span class="coverage-icon" aria-hidden="true">${found ? '✓' : '—'}</span>
    <div class="coverage-copy"><strong>${safeText(item.label)}</strong><span>${formatDimensions(item.width, item.height)}</span></div>
    <span class="coverage-state">${found ? `${item.count} ${item.count === 1 ? 'file' : 'files'}` : 'Missing'}</span>
  </div>`;
}

function render() {
  const analysis = state.analysis || analyzeBatch([], currentProfile().specs, policy());
  const hasAssets = state.assets.length > 0;
  $('#results-section').hidden = !hasAssets;
  $('#session-label').textContent = hasAssets ? `${state.assets.length} asset${state.assets.length === 1 ? '' : 's'} loaded` : 'New session';
  $('#metric-total').textContent = analysis.summary.total;
  $('#metric-pass').textContent = analysis.summary.pass;
  $('#metric-warn').textContent = analysis.summary.warn;
  $('#metric-fail').textContent = analysis.summary.fail;
  $('#metric-missing').textContent = analysis.summary.missing;
  $('#file-count').textContent = state.assets.length;
  $('#coverage-total').textContent = `${analysis.coverage.filter((item) => item.status === 'found').length} / ${analysis.coverage.length}`;
  $('#file-list').innerHTML = analysis.results.map(renderFile).join('');
  $('#coverage-list').innerHTML = analysis.coverage.map(renderCoverage).join('');
  $('#file-empty').hidden = hasAssets;
  $('#custom-count').textContent = `${state.customSpecs.length} added`;
  $('#custom-list').innerHTML = state.customSpecs.map((spec) => `<span class="custom-chip">${safeText(spec.label)} <b>${spec.width}×${spec.height}</b><button type="button" data-remove-spec="${safeText(spec.id)}" aria-label="Remove ${safeText(spec.label)}">×</button></span>`).join('');
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportReport(kind) {
  if (!state.assets.length) return;
  const profile = currentProfile();
  const analysis = state.analysis || analyzeBatch(state.assets, profile.specs, policy());
  const stamp = new Date().toISOString().slice(0, 10);
  if (kind === 'csv') {
    downloadFile(`packproof-assets-${stamp}.csv`, buildCsv(analysis), 'text/csv;charset=utf-8');
  } else {
    downloadFile(`packproof-report-${stamp}.json`, JSON.stringify(buildReport(analysis, profile, policy()), null, 2), 'application/json');
  }
  toast(`${kind.toUpperCase()} report exported.`);
}

function setProfile(profileId) {
  state.profileId = profileId;
  $('#profile-description').textContent = PROFILES[profileId].description;
  $('#custom-builder').hidden = profileId !== 'custom';
  refreshAnalysis();
  announce(profileId === 'custom' ? 'Add one or more required sizes, then drop your export files.' : `${PROFILES[profileId].label} selected. Add your export files to inspect the pack.`);
}

$('#profile-select').addEventListener('change', (event) => setProfile(event.target.value));
$('#max-size').addEventListener('change', () => {
  const input = $('#max-size');
  input.value = Math.min(500, Math.max(0.1, Number(input.value) || 10));
  refreshAnalysis();
});
document.querySelectorAll('#format-pills input').forEach((input) => input.addEventListener('change', () => {
  if (!document.querySelector('#format-pills input:checked')) input.checked = true;
  refreshAnalysis();
}));

$('#custom-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const label = $('#custom-label').value.trim();
  const width = Number($('#custom-width').value);
  const height = Number($('#custom-height').value);
  if (!label || !Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 20000 || height > 20000) {
    toast('Enter a name and valid dimensions (1–20,000 px).');
    return;
  }
  const id = `custom-${Date.now()}-${state.customSpecs.length}`;
  state.customSpecs.push({ id, label, width, height });
  $('#custom-form').reset();
  refreshAnalysis();
  toast('Custom requirement added.');
});

$('#custom-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove-spec]');
  if (!button) return;
  state.customSpecs = state.customSpecs.filter((spec) => spec.id !== button.dataset.removeSpec);
  refreshAnalysis();
});

$('#file-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  state.assets = state.assets.filter((asset) => asset.id !== button.dataset.remove);
  refreshAnalysis();
  if (!state.assets.length) announce('All files removed. Add your export pack whenever you are ready.');
});

function openPicker() { fileInput.click(); }
$('#browse-button').addEventListener('click', (event) => { event.stopPropagation(); openPicker(); });
$('#add-more').addEventListener('click', openPicker);
$('#dropzone').addEventListener('click', (event) => {
  if (event.target.closest('button')) return;
  openPicker();
});
$('#dropzone').addEventListener('keydown', (event) => {
  if (event.target === $('#dropzone') && ['Enter', ' '].includes(event.key)) { event.preventDefault(); openPicker(); }
});
fileInput.addEventListener('change', (event) => addFiles(event.target.files));
for (const name of ['dragenter', 'dragover']) $('#dropzone').addEventListener(name, (event) => {
  event.preventDefault();
  $('#dropzone').classList.add('drag-active');
});
for (const name of ['dragleave', 'drop']) $('#dropzone').addEventListener(name, (event) => {
  event.preventDefault();
  $('#dropzone').classList.remove('drag-active');
});
$('#dropzone').addEventListener('drop', (event) => addFiles(event.dataTransfer?.files));
$('#export-json').addEventListener('click', () => exportReport('json'));
$('#export-csv').addEventListener('click', () => exportReport('csv'));
$('#clear-session').addEventListener('click', () => {
  state.assets = [];
  state.analysis = null;
  render();
  announce('Session cleared. No files were uploaded or saved.');
  toast('Local session cleared.');
});

render();
