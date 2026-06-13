const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

// The frosted-surface tokens must exist in both light (:root) and dark themes,
// so every floating panel that occludes the ink background degrades consistently.
const tokens = read('src/tokens.css');
for (const token of ['--zhimo-surface-bg', '--zhimo-surface-blur']) {
  const occurrences = tokens.split(token).length - 1;
  assert.ok(
    occurrences >= 2,
    `${token} must be declared in both light and dark themes (found ${occurrences})`
  );
}

// Every surface that floats over the ink layer must pull from the shared token,
// never hardcode its own blur — one knob in tokens.css tunes them all.
const frostedSurfaces = ['src/nav.js', 'src/layout.js', 'src/feedback.js', 'src/menu.js'];
for (const file of frostedSurfaces) {
  const source = read(file);
  assert.ok(
    source.includes('backdrop-filter: var(--zhimo-surface-blur)'),
    `${file} must frost its surface via var(--zhimo-surface-blur)`
  );
  assert.ok(
    /backdrop-filter:\s*blur\(/.test(source) === false,
    `${file} must not hardcode a blur(); use var(--zhimo-surface-blur)`
  );
}
