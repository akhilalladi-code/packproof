export const FORMAT_LABELS = Object.freeze({
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
  'image/webp': 'WebP',
  'image/avif': 'AVIF'
});

export const PROFILES = Object.freeze({
  social: {
    id: 'social',
    label: 'Social launch pack',
    description: 'A practical mix of feed, story, LinkedIn and video placements.',
    specs: [
      { id: 'ig-portrait', label: 'Instagram feed · Portrait', width: 1080, height: 1350 },
      { id: 'ig-square', label: 'Instagram feed · Square', width: 1080, height: 1080 },
      { id: 'story', label: 'Story / Reel', width: 1080, height: 1920 },
      { id: 'linkedin', label: 'LinkedIn · Landscape', width: 1200, height: 627 },
      { id: 'youtube', label: 'YouTube thumbnail', width: 1280, height: 720 }
    ]
  },
  creator: {
    id: 'creator',
    label: 'Creator video pack',
    description: 'Thumbnail and vertical cover assets for video publishing.',
    specs: [
      { id: 'youtube-thumb', label: 'YouTube thumbnail', width: 1280, height: 720 },
      { id: 'youtube-banner', label: 'YouTube channel banner', width: 2560, height: 1440 },
      { id: 'vertical-cover', label: 'Short-form cover', width: 1080, height: 1920 }
    ]
  },
  web: {
    id: 'web',
    label: 'Web launch pack',
    description: 'Core image sizes for sharing, hero sections and square previews.',
    specs: [
      { id: 'og', label: 'Open Graph image', width: 1200, height: 630 },
      { id: 'hero', label: 'Desktop hero', width: 1920, height: 1080 },
      { id: 'square', label: 'Square preview', width: 1200, height: 1200 },
      { id: 'app-icon', label: 'App / brand icon', width: 512, height: 512 }
    ]
  },
  custom: {
    id: 'custom',
    label: 'Custom checklist',
    description: 'Build a one-off delivery checklist with your own dimensions.',
    specs: []
  }
});

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** index);
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatDimensions(width, height) {
  return `${Number(width).toLocaleString('en-US')} × ${Number(height).toLocaleString('en-US')} px`;
}

export function normalizeFilename(name) {
  return String(name || '').trim().toLocaleLowerCase('en-US').normalize('NFKC');
}

export function getMimeType(file) {
  if (file?.type && FORMAT_LABELS[file.type]) return file.type;
  const extension = String(file?.name || '').split('.').pop()?.toLowerCase();
  const byExtension = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', avif: 'image/avif' };
  return byExtension[extension] || file?.type || '';
}

export function matchSpecs(asset, specs) {
  return specs.filter((spec) => spec.width === asset.width && spec.height === asset.height);
}

export function closestSpec(asset, specs) {
  if (!specs.length || !asset.width || !asset.height) return null;
  const ratio = asset.width / asset.height;
  return [...specs]
    .map((spec) => ({ spec, distance: Math.abs(ratio - spec.width / spec.height) }))
    .sort((a, b) => a.distance - b.distance)[0]?.spec ?? null;
}

export function validateAsset(asset, specs, policy = {}) {
  const allowedTypes = policy.allowedTypes || Object.keys(FORMAT_LABELS);
  const maxBytes = Number(policy.maxSizeMB ?? 10) * 1024 * 1024;
  const matches = matchSpecs(asset, specs);
  const issues = [];
  const mime = getMimeType({ name: asset.name, type: asset.type });

  if (!FORMAT_LABELS[mime]) {
    issues.push({ level: 'fail', code: 'unsupported-format', message: 'Use PNG, JPEG, WebP or AVIF.' });
  } else if (!allowedTypes.includes(mime)) {
    issues.push({ level: 'fail', code: 'format-policy', message: `${FORMAT_LABELS[mime]} is not allowed by this delivery policy.` });
  }

  if (asset.size > maxBytes) {
    issues.push({ level: 'fail', code: 'file-too-large', message: `Exceeds the ${Number(policy.maxSizeMB ?? 10)} MB project budget.` });
  }

  if (!matches.length) {
    const nearest = closestSpec(asset, specs);
    issues.push({
      level: 'warn',
      code: 'size-mismatch',
      message: nearest
        ? `Does not match a required size. Closest aspect ratio: ${nearest.label} (${formatDimensions(nearest.width, nearest.height)}).`
        : 'No required dimensions have been added yet.'
    });
  }

  if (/(final[-_ ]?final|copy\s*\d*|untitled|screenshot|image\s*\d+)/i.test(asset.name)) {
    issues.push({ level: 'warn', code: 'weak-filename', message: 'Filename looks temporary. Rename it before handoff.' });
  }

  if (!issues.length) issues.push({ level: 'pass', code: 'ready', message: `Matches ${matches.map((spec) => spec.label).join(', ')}.` });

  const status = issues.some((issue) => issue.level === 'fail')
    ? 'fail'
    : issues.some((issue) => issue.level === 'warn') ? 'warn' : 'pass';

  return { ...asset, mime, format: FORMAT_LABELS[mime] || 'Unknown', matches, issues, status };
}

export function analyzeBatch(assets, specs, policy = {}) {
  const filenameCounts = new Map();
  const hashCounts = new Map();
  for (const asset of assets) {
    const key = normalizeFilename(asset.name);
    filenameCounts.set(key, (filenameCounts.get(key) || 0) + 1);
    if (asset.hash) hashCounts.set(asset.hash, (hashCounts.get(asset.hash) || 0) + 1);
  }

  const results = assets.map((asset) => {
    const result = validateAsset(asset, specs, policy);
    const duplicateName = filenameCounts.get(normalizeFilename(asset.name)) > 1;
    const duplicateContent = Boolean(asset.hash && hashCounts.get(asset.hash) > 1);
    if (duplicateName) result.issues.push({ level: 'warn', code: 'duplicate-name', message: 'Another file in this batch uses the same filename.' });
    if (duplicateContent) result.issues.push({ level: 'warn', code: 'duplicate-content', message: 'Identical file content detected (SHA-256).' });
    if (result.issues.some((issue) => issue.level === 'fail')) result.status = 'fail';
    else if (result.issues.some((issue) => issue.level === 'warn')) result.status = 'warn';
    return result;
  });

  const coverage = specs.map((spec) => {
    const files = results.filter((asset) => asset.matches.some((match) => match.id === spec.id));
    return { ...spec, files, count: files.length, status: files.length ? 'found' : 'missing' };
  });

  const summary = {
    total: results.length,
    pass: results.filter((asset) => asset.status === 'pass').length,
    warn: results.filter((asset) => asset.status === 'warn').length,
    fail: results.filter((asset) => asset.status === 'fail').length,
    missing: coverage.filter((item) => item.status === 'missing').length
  };

  return { results, coverage, summary };
}

export function escapeCsv(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function buildCsv(analysis) {
  const rows = [
    ['Filename', 'Status', 'Format', 'Width', 'Height', 'File size (bytes)', 'Matched requirements', 'Issues'],
    ...analysis.results.map((asset) => [
      asset.name,
      asset.status.toUpperCase(),
      asset.format,
      asset.width,
      asset.height,
      asset.size,
      asset.matches.map((spec) => spec.label).join('; '),
      asset.issues.map((issue) => issue.message).join('; ')
    ])
  ];
  return rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
}

export function buildReport(analysis, profile, policy) {
  return {
    tool: 'Creative Pack Preflight',
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    profile: { id: profile.id, label: profile.label },
    policy: { maxSizeMB: Number(policy.maxSizeMB), allowedTypes: policy.allowedTypes },
    summary: analysis.summary,
    requirements: analysis.coverage.map(({ id, label, width, height, count, status }) => ({ id, label, width, height, count, status })),
    assets: analysis.results.map((asset) => ({
      name: asset.name,
      status: asset.status,
      format: asset.format,
      mime: asset.mime,
      width: asset.width,
      height: asset.height,
      sizeBytes: asset.size,
      matchedRequirements: asset.matches.map((spec) => spec.id),
      issues: asset.issues
    }))
  };
}
