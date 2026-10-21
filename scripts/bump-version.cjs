const fs = require('node:fs');
const path = require('node:path');

const VERSION_FILE = path.join(__dirname, '..', 'version.json');
const VALID_BUMPS = new Set(['patch', 'minor', 'major']);

function bumpVersion(version, bump) {
  if (!VALID_BUMPS.has(bump)) {
    throw new Error(`Unknown version increment "${bump}". Use patch, minor, or major.`);
  }

  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Invalid version "${version}". Expected major.minor.patch.`);
  }

  let [, major, minor, patch] = match.map(Number);
  if (bump === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bump === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }

  return `${major}.${minor}.${patch}`;
}

function main() {
  const bump = process.argv[2];
  const current = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
  const nextVersion = bumpVersion(current.version, bump);

  fs.writeFileSync(
    VERSION_FILE,
    `${JSON.stringify({ version: nextVersion }, null, 2)}\n`,
  );
  console.log(`Version ${current.version} -> ${nextVersion}`);
  console.log(`Mention v${nextVersion} in the branch commit and push summary.`);
}

if (require.main === module) main();

module.exports = { bumpVersion };
