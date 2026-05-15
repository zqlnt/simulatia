/**
 * Lightweight smoke checks — run after build: npm run build && npm test
 */
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  failed += 1;
}

function assertIncludes(file, needle, label) {
  const path = join(root, file);
  if (!existsSync(path)) {
    fail(`${file} missing`);
    return;
  }
  const src = readFileSync(path, 'utf8');
  if (!src.includes(needle)) fail(`${label || needle} not found in ${file}`);
  else ok(label || `${file} contains ${needle}`);
}

console.log('Simulatia smoke checks\n');

assertIncludes('src/main.js', '__simulatiaBootstrapStarted', 'boot single-flight guard');
assertIncludes('src/main.js', 'BOOT_DONE_KEY', 'boot session persistence');
assertIncludes('src/main.js', 'import.meta.hot', 'HMR boot guard');
assertIncludes('src/ui/loading.js', 'bootAlreadyComplete', 'noop boot shell when done');
assertIncludes('src/ui/chrome.js', 'collapsePanelsAtLaunch', 'panels collapsed on launch');
assertIncludes('index.html', 'panel--collapsed', 'HTML panels start collapsed');
assertIncludes('src/simulation/scene.js', 'isRoomContext', 'room pick context');
assertIncludes('src/simulation/scene.js', 'bootSequenceRan', 'boot tour runs once');
assertIncludes('index.html', 'class="boot-glass"', 'boot glass without liquid-soft refraction');

if (!existsSync(join(root, 'dist/index.html'))) {
  console.log('\nBuilding…');
  execSync('npm run build', { cwd: root, stdio: 'inherit' });
} else {
  ok('dist/ present (run npm run build to refresh)');
}

const distIndex = join(root, 'dist/index.html');
if (existsSync(distIndex)) {
  const html = readFileSync(distIndex, 'utf8');
  if (html.includes('/assets/index-') && html.includes('type="module"')) ok('dist entry bundle referenced');
  else fail('dist/index.html missing entry bundle');
}

console.log('');
if (failed) {
  console.error(`Failed: ${failed} check(s)\n`);
  process.exit(1);
}
console.log('All smoke checks passed.\n');
