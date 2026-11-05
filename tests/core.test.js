import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROFILES,
  analyzeBatch,
  buildCsv,
  buildReport,
  closestSpec,
  formatBytes,
  formatDimensions,
  getMimeType,
  matchSpecs,
  normalizeFilename,
  validateAsset
} from '../src/core.js';

const policy = { maxSizeMB: 10, allowedTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/avif'] };
const validAsset = (overrides = {}) => ({
  name: 'instagram-portrait.png',
  type: 'image/png',
  size: 900_000,
  width: 1080,
  height: 1350,
  hash: 'abc123',
  ...overrides
});

test('formats bytes and pixel dimensions for reports', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1024), '1.0 KB');
  assert.equal(formatDimensions(1080, 1350), '1,080 × 1,350 px');
});

test('normalizes filenames and detects common raster MIME types', () => {
  assert.equal(normalizeFilename('  BRAND Final.PNG '), 'brand final.png');
  assert.equal(getMimeType({ name: 'asset.JPG', type: '' }), 'image/jpeg');
  assert.equal(getMimeType({ name: 'asset.svg', type: '' }), '');
});

test('matches only exact required pixel dimensions', () => {
  const specs = PROFILES.social.specs;
  assert.equal(matchSpecs(validAsset(), specs)[0].id, 'ig-portrait');
  assert.equal(matchSpecs(validAsset({ width: 1080, height: 1349 }), specs).length, 0);
});

test('suggests the closest aspect-ratio requirement for a mismatch', () => {
  const closest = closestSpec({ width: 1080, height: 1920 }, PROFILES.social.specs);
  assert.equal(closest.id, 'story');
});

test('passes an asset that matches a size and policy', () => {
  const result = validateAsset(validAsset(), PROFILES.social.specs, policy);
  assert.equal(result.status, 'pass');
  assert.equal(result.matches.length, 1);
});

test('blocks an asset that exceeds the configured file-size budget', () => {
  const result = validateAsset(validAsset({ size: 11 * 1024 * 1024 }), PROFILES.social.specs, policy);
  assert.equal(result.status, 'fail');
  assert.ok(result.issues.some((issue) => issue.code === 'file-too-large'));
});

test('blocks formats excluded by the delivery policy', () => {
  const result = validateAsset(validAsset({ type: 'image/webp' }), PROFILES.social.specs, { ...policy, allowedTypes: ['image/png'] });
  assert.equal(result.status, 'fail');
  assert.ok(result.issues.some((issue) => issue.code === 'format-policy'));
});

test('warns about temporary filenames and unmatched dimensions', () => {
  const result = validateAsset(validAsset({ name: 'final-final-copy.png', width: 1000, height: 1000 }), PROFILES.social.specs, policy);
  assert.equal(result.status, 'warn');
  assert.ok(result.issues.some((issue) => issue.code === 'weak-filename'));
  assert.ok(result.issues.some((issue) => issue.code === 'size-mismatch'));
});

test('detects duplicate names and identical content across the batch', () => {
  const batch = analyzeBatch([
    validAsset({ name: 'same.png', hash: 'same-hash' }),
    validAsset({ name: 'same.png', hash: 'same-hash', width: 1280, height: 720 })
  ], PROFILES.social.specs, policy);
  assert.ok(batch.results.every((item) => item.issues.some((issue) => issue.code === 'duplicate-name')));
  assert.ok(batch.results.every((item) => item.issues.some((issue) => issue.code === 'duplicate-content')));
});

test('reports missing required output dimensions', () => {
  const batch = analyzeBatch([validAsset()], PROFILES.social.specs, policy);
  assert.equal(batch.summary.missing, 4);
  assert.equal(batch.coverage.find((item) => item.id === 'ig-portrait').status, 'found');
});

test('escapes commas and quotes in CSV output', () => {
  const batch = analyzeBatch([validAsset({ name: 'brand, "launch".png' })], PROFILES.social.specs, policy);
  const csv = buildCsv(batch);
  assert.match(csv, /"brand, ""launch""\.png"/);
});

test('exports a structured report without file bytes', () => {
  const batch = analyzeBatch([validAsset()], PROFILES.social.specs, policy);
  const report = buildReport(batch, PROFILES.social, policy);
  assert.equal(report.tool, 'Creative Pack Preflight');
  assert.equal(report.assets[0].sizeBytes, 900_000);
  assert.equal('data' in report.assets[0], false);
  assert.equal(report.requirements.length, PROFILES.social.specs.length);
});
