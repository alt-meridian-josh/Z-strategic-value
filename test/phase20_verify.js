// Phase 20 verification — tiered (Good/Better/Best) value model.
// Confirms the tier engine added in Chunk 20 is correct and backward-compatible:
//   1. calcNRV gating defaults to 1 → existing (non-tiered) engagements are byte-stable.
//   2. The authored examples/macys_tiered_value_model.json loads and registers a
//      shared 6-lever list across 3 tiers.
//   3. tierCostsFor rolls the per-store cost columns × 441 stores into the workbook's
//      exact per-tier company-wide capex and recurring opex.
//   4. The tier MECHANISM (calcSc × financeCreditFactor × gatingByTier) reconciles to
//      the workbook's steady-state credited-benefit column to the dollar.
//   5. calcTiers produces three distinct, sensibly-ordered, positive-NPV columns under
//      this tool's standard conservatism.
//   6. The engagement round-trips through save/load (tiers + per-tier arrays survive).
//   node test/phase20_verify.js
const fs = require('fs');
const path = require('path');
const { loadApp, diff, ready } = require('./harness.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { (cond ? pass++ : fail++); console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? '  — ' + detail : ''}`); };
const abs = (...p) => path.resolve(__dirname, ...p);
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const MACYS = abs('..', 'examples', 'macys_tiered_value_model.json');
const BD = abs('..', 'examples', 'bd_peripheral_intervention.json');

// Workbook targets (Macy's Tiered Value Model).
const CAPEX   = [20771100, 42247800, 92071980];   // upfront, company-wide (per-store × 441)
const RECUR   = [7071435, 9408735, 11790135];      // recurring/yr, company-wide
const STEADY  = [20272013.12, 57332527.4, 81867420.8]; // credited steady-state benefit / tier

(async () => {
  console.log('\n── Tiered value model (Good / Better / Best) ──');
  const data = readJSON(MACYS);

  // ── 0) Well-formed tiered v2 engagement.
  ok('file is a strategic-value-engagement v2', data._type === 'strategic-value-engagement' && data._version === 2);
  ok('declares 3 tiers + costPerSite, 6 shared levers, 45 cost rows',
     data.tiers.length === 3 && data.costPerSite === true &&
     data.customScenarios.length === 6 && data.costRows.length === 45);

  const w = loadApp().window; await ready(w);

  // ── 1) Backward-compat: gating defaults to 1 → the non-tiered BD model is unchanged.
  const bd = readJSON(BD);
  ok('BD (non-tiered) still applies', w.applyEngagement(bd) === true);
  w.ensureCosts();
  const bdNRV = w.eval('calcNRV(activeScenariosForNRV(), state.costs, {wacc:0.10, financeCredit:getFinanceCreditState()}).nrv');
  ok('BD NRV unchanged at $4,692,335 (gating no-op)', bdNRV === 4692335, String(bdNRV));

  // ── 2) Load the tiered engagement.
  ok('applyEngagement accepts the tiered file', w.applyEngagement(data) === true);
  w.ensureCosts();
  ok('3 tiers + 6 active levers registered in state',
     w.eval('state.tiers.length') === 3 && w.eval('(state.customScenarios||[]).filter(s=>s.active).length') === 6);

  // ── 3) Per-tier costs reconcile to the workbook (per-store × 441).
  const opts = { costPerSite: true, sites: 441, contingencyRate: 0, attritionRate: 0, annualTraining: 0 };
  for (let k = 0; k < 3; k++) {
    const c = w.eval(`tierCostsFor(costRows, ${k}, ${JSON.stringify(opts)})`);
    ok(`tier ${k} capex = $${CAPEX[k].toLocaleString()}`, Math.round(c.yr0) === CAPEX[k], String(Math.round(c.yr0)));
    ok(`tier ${k} recurring = $${RECUR[k].toLocaleString()}/yr`, Math.round(c.yr1) === RECUR[k], String(Math.round(c.yr1)));
  }

  // ── 4) Mechanism reconciliation: Σ calcSc × financeCredit × gatingByTier == workbook
  //      steady-state credited column, to the dollar (the exact tier-gating anchor).
  for (let k = 0; k < 3; k++) {
    const credited = w.eval(`
      (function(){
        var fc = getFinanceCreditState();
        return activeScenariosForNRV().reduce(function(s, sc){
          var g = Array.isArray(sc.gatingByTier) ? sc.gatingByTier[${k}] : 1;
          return s + Math.max(0, calcSc(sc)) * financeCreditFactor(sc, fc) * g;
        }, 0);
      })()`);
    ok(`tier ${k} steady-state credited = $${STEADY[k].toLocaleString()}`,
       Math.abs(credited - STEADY[k]) < 1, String(credited));
  }

  // ── 5) calcTiers → three distinct, ordered, positive-NPV columns (our conservatism).
  const comp = w.eval(`computeTierComparison()`);
  ok('computeTierComparison returns one entry per tier', Array.isArray(comp) && comp.length === 3);
  const npvs = comp.map(t => t.result.nrv);
  ok('every tier NPV is positive', npvs.every(n => n > 0), npvs.map(n=>'$'+n.toLocaleString()).join(' / '));
  ok('NPV rises Good < Better < Best', npvs[0] < npvs[1] && npvs[1] < npvs[2],
     npvs.map(n=>'$'+n.toLocaleString()).join(' < '));
  ok('each tier carries its own payback + BCR', comp.every(t => t.result.paybackMo > 0 && t.result.bcr > 0),
     comp.map(t=>t.result.paybackMo+'mo/'+t.result.bcr.toFixed(2)+'x').join('  '));

  // ── 6) Round-trip: tiers + per-tier arrays survive save/load.
  const saved = w.eval('gatherEngagement()');
  ok('gatherEngagement emits tiers + costPerSite', Array.isArray(saved.tiers) && saved.tiers.length === 3 && saved.costPerSite === true);
  ok('gatherEngagement preserves gatingByTier on levers',
     JSON.stringify(saved.customScenarios.find(s=>s.id==='MCY-01').gatingByTier) === JSON.stringify([0.2,0.75,1]));
  ok('gatherEngagement preserves qtyByTier on cost rows',
     JSON.stringify(saved.costRows[0].qtyByTier) === JSON.stringify([6,6,6]));
  const w2 = loadApp().window; await ready(w2);
  w2.applyEngagement(saved); w2.ensureCosts();
  const comp2 = w2.eval('computeTierComparison()');
  ok('reload reproduces identical tier NPVs (fixpoint)',
     JSON.stringify(comp2.map(t=>t.result.nrv)) === JSON.stringify(npvs));

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
