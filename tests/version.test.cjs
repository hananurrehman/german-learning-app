const assert = require('node:assert/strict');
const { test } = require('node:test');
const { bumpVersion } = require('../scripts/bump-version.cjs');

test('increments semantic app versions', () => {
  assert.equal(bumpVersion('1.2.3', 'patch'), '1.2.4');
  assert.equal(bumpVersion('1.2.3', 'minor'), '1.3.0');
  assert.equal(bumpVersion('1.2.3', 'major'), '2.0.0');
});

test('rejects invalid versions and increment types', () => {
  assert.throws(() => bumpVersion('1.2', 'patch'), /Invalid version/);
  assert.throws(() => bumpVersion('1.2.3', 'build'), /Unknown version increment/);
});
