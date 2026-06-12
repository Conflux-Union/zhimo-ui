const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const checkedFiles = [
  'README.md',
  'index.html',
  'src/base.js',
  'src/layout.js',
  'src/feedback.js',
  'src/nav.js',
  'src/ink.js',
  'src/tokens.css',
];

const combined = checkedFiles
  .map((file) => fs.readFileSync(path.join(root, file), 'utf8'))
  .join('\n');

const legacy = String.fromCharCode(109, 121);

const forbiddenPatterns = [
  new RegExp(`\\b${legacy}-[a-z0-9-]+\\b`),
  new RegExp(`--${legacy}-[a-z0-9-]+`),
  new RegExp(`\\b${legacy[0].toUpperCase()}${legacy[1]}[A-Z][A-Za-z0-9]*\\b`),
  new RegExp(`\\b${legacy.toUpperCase()}-[A-Z0-9-]+\\b`),
  new RegExp(`\\b${legacy}_(?:[a-z0-9_]+)\\b`),
  new RegExp(`@keyframes\\s+${legacy}-[a-z0-9-]+`),
  new RegExp(`animation:\\s+${legacy}-[a-z0-9-]+`),
];

for (const pattern of forbiddenPatterns) {
  assert.equal(
    pattern.test(combined),
    false,
    `found forbidden legacy prefix matching ${pattern}`
  );
}

for (const required of [
  '<zhimo-button',
  'customElements.define(\'zhimo-button\'',
  '--zhimo-bg',
  'class ZhimoButton',
]) {
  assert.ok(combined.includes(required), `missing required zhimo API: ${required}`);
}
