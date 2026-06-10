// Phase 21 verification — technology-composed SOLUTIONS + capability matrix.
// A solution bundles technologies; its cost aggregates from them and each value lever's
// activation is COMPUTED from the technology×value capability matrix (overridable).
//   node test/phase21_verify.js
const fs = require('fs');
const path = require('path');
const { loadApp, ready } = require('./harness.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { (cond ? pass++ : fail++); console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? '  — ' + detail : ''}`); };
const abs = (...p) => path.resolve(__dirname, ...p);
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const EX = abs('..', 'examples', 'retail_solution_comparison.json');

// Expected per-solution costs (RFID / BLE / MV), aggregated from bundled + shared lines.
const CAPEX = [2500000, 1900000, 3300000];
const RECUR = [1100000, 650000, 750000];
// Expected computed activation (technology capability, max across the bundle).
const ACT = {
  'RC-01': [1.0, 0.1, 0.3], 'RC-02': [0.8, 0.2, 0.5], 'RC-03': [0.5, 0.2, 0.9],
  'RC-04': [0.2, 0.9, 0.3], 'RC-05': [0.1, 0.1, 0.9],
};
const gate = (w, id, k) => w.eval(`tierGateFor(state.customScenarios.find(s=>s.id==='${id}'), ${k})`);

(async () => {
  console.log('\n── Technology-composed solutions + capability matrix ──');
  const data = readJSON(EX);
  ok('file declares 3 technology-composed solutions',
     data.tiers.length === 3 && data.tiers.every(t => Array.isArray(t.technologyIds) && t.technologyIds.length) &&
     !!data.capability);

  const w = loadApp().window; await ready(w);
  ok('applyEngagement accepts the solution-comparison file', w.applyEngagement(data) === true);
  w.ensureCosts();
  ok('bundles loaded (RFID / BLE / MV + platform)',
     w.eval("state.tiers.map(t=>t.technologyIds.join('+')).join('|')") === 'rfid+platform|ble+platform|mv+platform');

  // ── 1) Cost AGGREGATES from each solution's technology bundle (+ shared lines).
  for (let k = 0; k < 3; k++) {
    const c = w.eval(`tierCostsFor(costRows, ${k}, tierCostOpts())`);
    ok(`solution ${k} capex aggregates to $${CAPEX[k].toLocaleString()}`, Math.round(c.yr0) === CAPEX[k], String(Math.round(c.yr0)));
    ok(`solution ${k} recurring aggregates to $${RECUR[k].toLocaleString()}`, Math.round(c.yr1) === RECUR[k], String(Math.round(c.yr1)));
  }

  // ── 2) Activation is COMPUTED from the capability matrix (best-suited tech in bundle).
  let allAct = true;
  Object.entries(ACT).forEach(([id, row]) => {
    row.forEach((exp, k) => { if (Math.abs(gate(w, id, k) - exp) > 1e-9) allAct = false; });
  });
  ok('every lever activation matches the computed capability matrix', allAct,
     'RC-04 = ' + [0,1,2].map(k=>gate(w,'RC-04',k)).join('/'));
  ok('each solution wins a different value case (RFID→accuracy, BLE→flow, MV→shrink/shelf)',
     gate(w,'RC-01',0) === 1.0 && gate(w,'RC-04',1) === 0.9 && gate(w,'RC-03',2) === 0.9 && gate(w,'RC-05',2) === 0.9);

  // ── 3) Comparison yields three distinct positive NPVs.
  const comp = w.eval('computeTierComparison()');
  const npvs = comp.map(t => t.result.nrv);
  ok('three distinct NPVs', new Set(npvs).size === 3 && npvs.every(n => isFinite(n)), npvs.map(n=>'$'+n.toLocaleString()).join(' / '));

  // ── 4) Manual override wins over the computed value; clearing reverts to computed.
  w.setGating('RC-04', 0, 95);
  ok('override beats computed activation (RFID RC-04: 20% → 95%)', Math.abs(gate(w,'RC-04',0) - 0.95) < 1e-9, String(gate(w,'RC-04',0)));
  ok('override is sparse — other tiers stay computed', gate(w,'RC-04',1) === 0.9, String(gate(w,'RC-04',1)));
  w.clearGating('RC-04', 0);
  ok('clearGating reverts the cell to computed (→ 20%)', Math.abs(gate(w,'RC-04',0) - 0.2) < 1e-9, String(gate(w,'RC-04',0)));

  // ── 5) Editing the capability matrix re-computes activation live.
  w.setCapability('rfid', 'RC-04', 80);
  ok('setCapability updates computed activation (RFID RC-04 → 80%)', Math.abs(gate(w,'RC-04',0) - 0.8) < 1e-9, String(gate(w,'RC-04',0)));
  w.setCapability('rfid', 'RC-04', '');   // clear → no matrix entry + no required tech ⇒ tech-agnostic default 100%
  ok('clearing the only capability source falls back to the tech-agnostic default (→ 100%)', gate(w,'RC-04',0) === 1, String(gate(w,'RC-04',0)));
  w.setCapability('rfid', 'RC-04', 20);   // restore for the round-trip checks below

  // ── 6) Toggling a technology in a solution changes its cost and activation.
  const beforeCap = w.eval('tierCostsFor(costRows,1,tierCostOpts()).yr0');   // BLE Suite capex
  w.setSolutionTech(1, 'rfid', true);   // add RFID to the BLE solution
  const afterCap = w.eval('tierCostsFor(costRows,1,tierCostOpts()).yr0');
  ok('adding RFID to a solution raises its capex by the RFID line ($1.8M)', afterCap - beforeCap === 1800000, String(afterCap - beforeCap));
  ok('adding RFID lifts that solution\'s inventory-accuracy activation to 100%', gate(w,'RC-01',1) === 1.0, String(gate(w,'RC-01',1)));
  w.setSolutionTech(1, 'rfid', false);

  // ── 7) Round-trip preserves tier technologyIds + capability matrix.
  const saved = w.eval('gatherEngagement()');
  ok('save emits tiers with technologyIds and the capability matrix',
     saved.tiers.every(t => Array.isArray(t.technologyIds)) && !!saved.capability && saved.capability.rfid['RC-01'] === 1.0);
  const w2 = loadApp().window; await ready(w2);
  w2.applyEngagement(saved); w2.ensureCosts();
  ok('reload reproduces identical computed activation', gate(w2,'RC-03',2) === 0.9 && gate(w2,'RC-01',0) === 1.0);

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
