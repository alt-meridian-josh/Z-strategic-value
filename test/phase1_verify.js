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
const abs = (...p) => path.resolve(__dirname, ...p);
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));

const V1 = abs('..', 'examples', 'sample_engagement.json');
const V2 = abs('fixtures', 'v2_multitech_warehouse.json');
const BASE = abs('fixtures', 'v1_compute_baseline.json');

// Load a fresh app, apply an object, settle costs. Returns the window.
function applied(obj) {
  const w = loadApp().window;
  w.applyEngagement(obj); w.ensureCosts();
  return w;
}
// Round-trip a file/object to its save/load fixpoint; return [A, B, diff].
function fixpoint(obj) {
  const w = applied(obj);
  const A = w.gatherEngagement();
  w.applyEngagement(A); w.ensureCosts();
  const B = w.gatherEngagement();
  return [A, B, diff(A, B)];
}
const norm = s => (s || '').replace(/\s+/g, ' ').trim();
function compute(obj) {
  const w = applied(obj); w.renderROI();
  return {
    kpi: norm(w.document.getElementById('kpi-grid')?.textContent),
    walkdown: norm(w.document.getElementById('nrv-walkdown-body')?.textContent),
  };
}

console.log('\n── Harness ──');
{
  const { window, errors } = loadApp();
  ok('index.html loads headless with zero jsdom errors', errors.length === 0, `${errors.length} errors`);
  ok('save/load/calc functions reachable',
    ['applyEngagement','gatherEngagement','calcNRV','calcSc','ensureCosts','renderROI','migrateEngagement'].every(f => typeof window[f] === 'function'));
}

console.log('\n── v1 backward compatibility (must hold every chunk) ──');
{
  const v1 = readJSON(V1);
  ok('v1 sample file on disk is still _version 1 (real v1 artifact)', v1._version === 1);
  const [A, , d] = fixpoint(v1);
  ok('v1 sample loads + round-trips losslessly (fixpoint)', d === null, d || '');
  ok('v1 sample migrates to _version 2 on save', A._version === 2);
  const base = readJSON(BASE), now = compute(v1);
  ok('v1 compute UNCHANGED vs pre-edit baseline (kpi)', now.kpi === base.kpi, now.kpi === base.kpi ? '' : now.kpi.slice(0,80));
  ok('v1 compute UNCHANGED vs pre-edit baseline (walkdown)', now.walkdown === base.walkdown);
}

console.log('\n── Chunk 1: envelope v2 + migration shim + nrvOverrides fix ──');
{
  // Migration fills additive defaults for a bare v1 object.
  const w = loadApp().window;
  const m = w.migrateEngagement({ _type: 'strategic-value-engagement', _version: 1 });
  ok('migration fills additive v2 defaults', Array.isArray(m.technologies) && Array.isArray(m.dedup)
     && m.overlay && m._provenance && m.annotations && m.nrvOverrides && m.mode === 'analyst');
}
{
  // nrvOverrides now round-trips (was read-but-never-written in v1).
  const v1 = readJSON(V1);
  v1.nrvOverrides = { 'RET-01': { profile: 'hardware', access: 'infra', h: 0.2 } };
  const w = applied(v1);
  const g = w.gatherEngagement();
  ok('nrvOverrides round-trips through Save', diff(g.nrvOverrides, v1.nrvOverrides) === null, JSON.stringify(g.nrvOverrides));
}
{
  // mode round-trips; default is analyst.
  const def = fixpoint(readJSON(V1))[0];
  ok('mode defaults to analyst', def.mode === 'analyst', def.mode);
  const cust = readJSON(V1); cust.mode = 'customer';
  ok('mode:"customer" round-trips', applied(cust).gatherEngagement().mode === 'customer');
}

console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
