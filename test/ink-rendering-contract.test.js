const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const ink = fs.readFileSync(path.join(root, 'src/ink.js'), 'utf8');

assert.match(
  ink,
  /const GPU_QUALITY_TIERS = \[\s*\{\s*name: 'full',\s*scale: 1,\s*pressureIter: PRESSURE_ITER\s*\}/,
  'GPU rendering must keep the existing full quality tier as the first/default tier'
);

for (const requiredTier of [
  "{ name: 'balanced'",
  "{ name: 'compat'",
]) {
  assert.ok(ink.includes(requiredTier), `missing GPU compatibility tier: ${requiredTier}`);
}

assert.ok(
  ink.includes('gl.checkFramebufferStatus(gl.FRAMEBUFFER)'),
  'half-float render targets must be checked for framebuffer completeness'
);

assert.ok(
  ink.includes('throw new Error(`Framebuffer incomplete: ${status}`)'),
  'incomplete GPU framebuffers must throw so the component can downgrade cleanly'
);

assert.ok(
  ink.includes('_downgradeGpu()'),
  'runtime GPU failures must downgrade instead of leaving a broken WebGL path'
);

assert.ok(
  ink.includes('_switchToCPU()'),
  'all exhausted GPU tiers must fall back to the CPU canvas renderer'
);
