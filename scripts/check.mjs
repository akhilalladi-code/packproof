import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const required = ['profile-select', 'file-input', 'dropzone', 'results-section', 'export-json', 'export-csv', 'coverage-list'];
const missing = required.filter((id) => !html.includes(`id="${id}"`));
if (missing.length) {
  console.error(`HTML check failed. Missing required element IDs: ${missing.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`HTML structure check passed (${required.length} required interface elements).`);
}
