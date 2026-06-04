// Phase 1 verification runner. Grows one section per chunk. Drives the real
// index.html in jsdom (offline) and asserts behavior with evidence, not claims.
//   node test/phase1_verify.js
const fs = require('fs');
const path = require('path');
const { loadApp, diff } = require('./harness.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  (cond ? pass++ : fail++);
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? '  — ' + detail : ''}`);
};
const readJSON = p => JSON.parse(fs.readFileSync(path.resolve(__dirname, p), 'utf8'));

const V1 = path.resolve(__dirname, '..', 'examples', 'sample_engagement.json');
const V2 = path.resolve(__dirname, 'fixtures', 'v2_multitech_warehouse.json');

// Round-trip a file to its save/load fixpoint and return [A, B, diff].
function fixpoint(file) {
  const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
  const w = loadApp().window;
  w.applyEngagement(obj); w.ensureCosts();
  const A = w.gatherEngagement();
  w.applyEngagement(A); w.ensureCosts();
  const B = w.gatherEngagement();
  return [A, B, diff(A, B)];
}

console.log('\n── Chunk 0: harness + v1 control ──');
{
  const { window, errors } = loadApp();
  ok('harness loads index.html with zero jsdom errors', errors.length === 0, `${errors.length} errors`);
  ok('save/load/calc functions reachable',
    ['applyEngagement','gatherEngagement','calcNRV','calcSc','ensureCosts','renderROI'].every(f => typeof window[f] === 'function'));
}
{
  const [A, , d] = fixpoint(V1);
  ok('v1 sample loads + round-trips losslessly (fixpoint)', d === null, d || `_version ${A._version}`);
  ok('v1 sample is _version 1', A._version === 1);
}
{
  const w = loadApp().window;
  w.applyEngagement(readJSON(V1)); w.ensureCosts(); w.renderROI();
  const kpi = w.document.getElementById('kpi-grid');
  const txt = (kpi && kpi.textContent || '').replace(/\s+/g, ' ').trim();
  ok('v1 sample computes (kpi-grid rendered with a $ figure)', /\$\s?[\d,]/.test(txt), txt.slice(0, 80));
}
{
  // v2 fixture is well-formed and carries the target v2 keys (behavior tested in later chunks).
  let obj = null, err = '';
  try { obj = readJSON(path.relative(__dirname, V2)); } catch (e) { err = e.message; }
  const keys = obj ? ['technologies','overlay','dedup','_provenance','annotations','mode'].filter(k => k in obj) : [];
  ok('v2 target fixture is valid JSON', !!obj, err);
  ok('v2 target fixture carries v2 keys', keys.length === 6, keys.join(','));
}

console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
