// Phase 19 verification — BD Peripheral Intervention drop-in engagement JSON.
// Confirms the authored examples/bd_peripheral_intervention.json loads cleanly,
// registers 12 active custom levers whose formulas reproduce the documented
// loss_pool × recovery_rate benefits, carries the exact cost model ($1,525,400
// Year 0 / $270,000 recurring), lints clean (no magic constants → customer
// export allowed), computes a positive NRV, and round-trips through save/load.
//   node test/phase19_verify.js
const fs = require('fs');
const path = require('path');
const { loadApp, diff, ready } = require('./harness.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { (cond ? pass++ : fail++); console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? '  — ' + detail : ''}`); };
const abs = (...p) => path.resolve(__dirname, ...p);
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const BD = abs('..', 'examples', 'bd_peripheral_intervention.json');

// Documented full annual benefit per lever (loss_pool × recovery_rate), and the total.
const EXPECTED = {
  'BD-01': 63000, 'BD-02': 27913, 'BD-03': 270000, 'BD-04': 885000,
  'BD-05': 188798, 'BD-06': 10577.25, 'BD-07': 27500, 'BD-08': 85050,
  'BD-09': 109200, 'BD-10': 780000, 'BD-11': 31200, 'BD-12': 87500,
};
const TOTAL = 2565738.25;

(async () => {
  console.log('\n── BD Peripheral Intervention drop-in JSON ──');
  const data = readJSON(BD);

  // ── 0) The file is a well-formed v2 engagement.
  ok('file is a strategic-value-engagement v2', data._type === 'strategic-value-engagement' && data._version === 2);
  ok('healthcare vertical, no library levers, 12 custom levers',
     JSON.stringify(data.verticals) === '["healthcare"]' && data.selectedIds.length === 0 && data.customScenarios.length === 12);

  // ── 1) Loads into the app and registers all 12 active custom levers.
  const w = loadApp().window; await ready(w);
  ok('applyEngagement accepts the file', w.applyEngagement(data) === true);
  w.ensureCosts();
  const actives = w.eval('(state.customScenarios||[]).filter(s=>s.active).length');
  ok('12 active custom levers registered', actives === 12, String(actives));

  // ── 2) Each formula reproduces its documented benefit (loss_pool × recovery_rate).
  let sum = 0;
  Object.entries(EXPECTED).forEach(([id, exp]) => {
    const v = w.eval(`calcSc((state.customScenarios||[]).find(s=>s.id==='${id}'))`);
    sum += v;
    ok(`${id} computes ${exp.toLocaleString()}`, Math.abs(v - exp) < 0.5, String(v));
  });
  ok('twelve levers sum to the documented $2,565,738', Math.abs(sum - TOTAL) < 1, String(Math.round(sum)));

  // ── 3) Formulas are lint-clean (named inputs only) → customer export is allowed.
  ok('every custom formula lints clean (no magic constants)',
     w.eval('(state.customScenarios||[]).every(s=>lintFormula(s.formula).ok)'));
  ok('formulaExportFindings is empty (customer export gate clear)', w.eval('formulaExportFindings().length') === 0);

  // ── 4) Cost model matches the business case exactly.
  ok('Year-0 investment = $1,525,400', w.eval('state.costs.yr0') === 1525400, String(w.eval('state.costs.yr0')));
  ok('annual recurring = $270,000', w.eval('state.costs.yr1') === 270000, String(w.eval('state.costs.yr1')));
  ok('attrition + training excluded (per the business case)', w.eval('state.costs.attritionRate') === 0 && w.eval('state.costs.annualTraining') === 0);

  // ── 5) Full model computes a positive, sensible NRV through the tool's own chain.
  w.renderROI();
  const r = w.eval('state.nrvResult');
  ok('NRV (5-yr NPV) is positive', r.nrv > 0, '$' + r.nrv.toLocaleString());
  ok('MIRR present and finite', r.mirr != null && isFinite(r.mirr), (r.mirr * 100).toFixed(1) + '%');
  ok('BCR under the 10x credibility cap', r.bcr != null && r.bcr < 10, r.bcr ? r.bcr.toFixed(1) + 'x' : 'n/a');
  ok('discounted payback resolves', r.paybackMo != null && r.paybackMo > 0, r.paybackMo + ' mo');

  // ── 6) Data Status panel lights up from the embedded provenance (B/C inputs).
  w.renderDataStatus();
  ok('Data Status panel renders provenance', /confidence|estimated|benchmarked|Springer|Auburn|Zipper/i.test(w.document.getElementById('data-status-body').textContent));

  // ── 7) Save/load fixpoint — the engagement round-trips byte-stable.
  const A = w.gatherEngagement();
  const w2 = loadApp().window; await ready(w2); w2.applyEngagement(A); w2.ensureCosts();
  const B = w2.gatherEngagement();
  ok('engagement reaches a save/load fixpoint', diff(A, B) === null, diff(A, B) || '');

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
