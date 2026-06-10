// Phase 22 verification — Macy's deck: value gated by READ MECHANISM (one technology).
// Good/Better/Best are all RFID; what changes per tier is the read mechanism (snapshot →
// event → continuous), provided cumulatively. Each lever's None/Partial/Full activation is
// computed from the capability×value matrix. The capability axis is general — a technology
// (Machine Vision) slots in next to the read-mechanisms.
//   node test/phase22_verify.js
const fs = require('fs');
const path = require('path');
const { loadApp, ready } = require('./harness.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { (cond ? pass++ : fail++); console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? '  — ' + detail : ''}`); };
const abs = (...p) => path.resolve(__dirname, ...p);
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const EX = abs('..', 'examples', 'macys_deck_read_mechanism.json');

// Computed activation per lever, by tier (Good / Better / Best) — the deck's None/Partial/Full,
// with partials calibrated so each tier's credited total reconciles to the deck headline.
const ACT = {
  'MD-01': [0,1,1],      'MD-02': [0.30,0.30,1], 'MD-03': [0.15,0.15,1], 'MD-04': [0,0.39,1],
  'MD-05': [0.95,1,1],   'MD-06': [0,1,1],       'MD-07': [0.50,0.50,1], 'MD-08': [0.80,1,1],
};
const gate = (w, id, k) => w.eval(`tierGateFor(state.customScenarios.find(s=>s.id==='${id}'), ${k})`);
const credited = (w, k) => w.eval(`(function(){var fc=getFinanceCreditState();return activeScenariosForNRV().reduce((s,sc)=>s+Math.max(0,calcSc(sc))*financeCreditFactor(sc,fc)*tierGateFor(sc,${k}),0);})()`);

(async () => {
  console.log('\n── Macy\'s deck: value gated by read mechanism ──');
  const data = readJSON(EX);
  ok('declares 3 read-mechanism capabilities + 8 levers',
     data.capabilities.length === 3 && data.capabilities.every(c => c.kind === 'mechanism') && data.customScenarios.length === 8);

  const w = loadApp().window; await ready(w);
  ok('applyEngagement accepts the deck file', w.applyEngagement(data) === true);
  w.ensureCosts();
  ok('tiers provide read mechanisms cumulatively (snapshot → +event → +continuous)',
     w.eval("state.tiers.map(t=>t.capabilityIds.join('+')).join('|')") === 'snapshot|snapshot+event|snapshot+event+continuous');

  // ── 1) Activation reproduces the deck's None/Partial/Full per lever per tier.
  let allAct = true;
  Object.entries(ACT).forEach(([id, row]) => row.forEach((exp, k) => { if (Math.abs(gate(w, id, k) - exp) > 1e-9) allAct = false; }));
  ok('every lever activation matches the deck (None/Partial/Full)', allAct);
  ok('shrink & chargeback are None at Good, Full from Better (need event reads)',
     gate(w,'MD-01',0) === 0 && gate(w,'MD-01',1) === 1 && gate(w,'MD-06',0) === 0 && gate(w,'MD-06',1) === 1);
  ok('out-of-stock / BOPIS / safety reach Full only at Best (need continuous stream)',
     gate(w,'MD-03',2) === 1 && gate(w,'MD-03',1) < 1 && gate(w,'MD-04',2) === 1 && gate(w,'MD-04',1) < 1 && gate(w,'MD-07',2) === 1 && gate(w,'MD-07',1) < 1);

  // ── 2) Steady-state credited reconciles to the deck headline on ALL THREE tiers.
  ok('Good steady-state credited = the deck\'s $23.6M', Math.abs(credited(w,0) - 23.6e6) < 0.1e6, '$' + (credited(w,0)/1e6).toFixed(2) + 'M');
  ok('Better steady-state credited = the deck\'s $67.3M', Math.abs(credited(w,1) - 67.3e6) < 0.1e6, '$' + (credited(w,1)/1e6).toFixed(2) + 'M');
  ok('Best steady-state credited = the deck\'s $99.0M', Math.abs(credited(w,2) - 99.0e6) < 0.1e6, '$' + (credited(w,2)/1e6).toFixed(2) + 'M');

  // ── 3) Cost aggregates cumulatively from the read-mechanism hardware.
  const cap = k => Math.round(w.eval(`tierCostsFor(costRows,${k},tierCostOpts()).yr0`));
  ok('Good capex = handheld + shared, ×441 = $20,771,100', cap(0) === 20771100, String(cap(0)));
  ok('capex rises cumulatively (event adds readers, continuous adds RTLS grid)', cap(0) < cap(1) && cap(1) < cap(2),
     [0,1,2].map(cap).map(n=>'$'+n.toLocaleString()).join(' < '));

  // ── 4) Three ordered NPVs (Good thin/negative under conservatism, Best richest).
  const npvs = w.eval('computeTierComparison().map(t=>t.result.nrv)');
  ok('NPVs are ordered Good < Better < Best', npvs[0] < npvs[1] && npvs[1] <= npvs[2], npvs.map(n=>'$'+n.toLocaleString()).join(' < '));

  // ── 5) EXPANDABILITY: a technology capability (Machine Vision) slots into the same axis.
  w.setCapability('mv', 'MD-01', 90);     // MV is strong on shrink/asset protection
  w.setSolutionCap(0, 'mv', true);        // add MV to the Good solution
  ok('adding Machine Vision as a capability lifts Good shrink activation 0% → 90%', Math.abs(gate(w,'MD-01',0) - 0.9) < 1e-9, String(gate(w,'MD-01',0)));
  ok('the new capability appears in the bundle alongside read-mechanisms',
     w.eval("state.tiers[0].capabilityIds.join('+')") === 'snapshot+mv');
  w.setSolutionCap(0, 'mv', false);

  // ── 6) Round-trip preserves the capability catalog, bundles, and matrix.
  const saved = w.eval('gatherEngagement()');
  ok('save emits capabilities catalog + capabilityIds + capability matrix',
     Array.isArray(saved.capabilities) && saved.capabilities.length === 3 &&
     saved.tiers.every(t => Array.isArray(t.capabilityIds)) &&
     saved.capability.event['MD-01'] === 1);
  const w2 = loadApp().window; await ready(w2);
  w2.applyEngagement(saved); w2.ensureCosts();
  ok('reload reproduces identical activation', gate(w2,'MD-01',1) === 1 && gate(w2,'MD-03',2) === 1 && gate(w2,'MD-04',0) === 0);

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
