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

  // ── 7) Comparison UI: renders, tier selection drives the headline, gating is live.
  const w3 = loadApp().window; await ready(w3);
  w3.applyEngagement(data); w3.ensureCosts();
  w3.eval("document.getElementById('panel-4').classList.add('active')");
  w3.renderROI();
  ok('tier-comparison panel is visible', w3.eval("document.getElementById('tier-comparison').style.display") === 'block');
  const ui = w3.eval("document.getElementById('tier-comparison').innerHTML");
  ok('comparison shows all three tier names',
     ['Good (Handheld)','Better (+ Control Points)','Best (Full RTLS)'].every(n => ui.includes(n)));
  ok('headline defaults to the best-NPV tier (Best)', w3.eval('state.selectedTier') === 2 && w3.eval('state.nrvResult.nrv') === npvs[2]);
  w3.selectTier(0);
  ok('selectTier(0) drives the headline to the Good column',
     w3.eval('state.selectedTier') === 0 && w3.eval('state.nrvResult.nrv') === npvs[0], String(w3.eval('state.nrvResult.nrv')));
  const beforeG = w3.eval('state.nrvResult.nrv');
  w3.setGating('MCY-03', 0, 0);   // zero the OOS lever for the Good tier
  ok('setGating lowers the live NPV and persists on the lever',
     w3.eval('state.nrvResult.nrv') < beforeG && w3.eval("state.customScenarios.find(s=>s.id==='MCY-03').gatingByTier[0]") === 0);

  // ── 8) Tiered cost editor: per-tier columns, reconciled totals, live edits.
  const w4 = loadApp().window; await ready(w4);
  w4.applyEngagement(data);
  w4.eval("document.getElementById('panel-3').classList.add('active')");
  w4.ensureCosts(); w4.renderCost();
  const head = w4.eval("document.getElementById('cost-head-row').innerHTML");
  ok('cost header carries a column per tier',
     ['Good (Handheld)','Better (+ Control Points)','Best (Full RTLS)'].every(n => head.includes(n)));
  const foot = w4.eval("document.getElementById('cost-tfoot').innerHTML.replace(/<[^>]+>/g,' ')");
  ok('cost footer shows each tier capex (fmt) reconciled to workbook',
     CAPEX.every(v => foot.includes(w4.eval(`fmt(${v})`))),
     CAPEX.map(v=>w4.eval(`fmt(${v})`)).join(' / '));
  ok('cost footer shows each tier recurring (fmt)',
     RECUR.every(v => foot.includes(w4.eval(`fmt(${v})`))));
  const gi = w4.eval("costRows.findIndex(r=>r.label==='Overhead grid reader')");
  const capBefore = w4.eval('tierCostsFor(costRows,2,tierCostOpts()).yr0');
  w4.setTierQty(gi, 2, 25);   // 20 → 25 grid readers, Best tier only
  const capAfter = w4.eval('tierCostsFor(costRows,2,tierCostOpts()).yr0');
  ok('editing a per-tier quantity updates that tier capex (+5×$2,200×441)',
     capAfter - capBefore === 5 * 2200 * 441, String(capAfter - capBefore));

  // ── 9) Non-tiered cost tab is byte-unchanged (legacy header + totals).
  const w5 = loadApp().window; await ready(w5);
  w5.applyEngagement(readJSON(BD));
  w5.eval("document.getElementById('panel-3').classList.add('active')");
  w5.ensureCosts(); w5.renderCost();
  const h2 = w5.eval("document.getElementById('cost-head-row').innerHTML");
  ok('legacy cost header restored (Qty/Total, no tier names)',
     h2.includes('Qty') && h2.includes('Total') && !h2.includes('Handheld'));
  ok('legacy cost rollup intact ($1,525,400 Yr 0)', w5.eval('state.costs.yr0') === 1525400, String(w5.eval('state.costs.yr0')));

  // ── 10) Enable tiers on ANY analysis from the UI — incl. a library-lever sample.
  const HC = abs('..', 'examples', 'healthcare_starter.json');
  const w6 = loadApp().window; await ready(w6);
  w6.applyEngagement(readJSON(HC));   // 4 library levers, no tiers
  w6.eval("document.getElementById('panel-4').classList.add('active')");
  w6.renderROI();
  ok('library sample starts non-tiered with an enable button',
     w6.eval('tiersActive()') === false &&
     w6.eval("document.getElementById('tier-controls-roi').innerHTML").includes('Enable solution tiers'));
  const baseHC = w6.eval('state.nrvResult.nrv');
  w6.enableTiers();
  ok('enableTiers creates Good/Better/Best and shows the comparison',
     w6.eval("state.tiers.map(t=>t.name).join('/')") === 'Good/Better/Best' &&
     w6.eval("document.getElementById('tier-comparison').style.display") === 'block');
  ok('all tiers start identical to the single-analysis baseline',
     w6.eval('computeTierComparison().every(t=>t.result.nrv===' + baseHC + ')'), String(baseHC));
  const lid = w6.eval('activeScenariosForNRV()[0].id');
  w6.setGating(lid, 0, 50);   // a LIBRARY lever, gated via state.gating
  ok('a library lever is gatable via state.gating (Good drops below Best)',
     JSON.stringify(w6.eval(`state.gating['${lid}']`)) === JSON.stringify([0.5,1,1]) &&
     w6.eval('computeTierComparison()[0].result.nrv') < w6.eval('computeTierComparison()[2].result.nrv'));
  w6.addTier();
  ok('addTier grows tiers and every gating array', w6.eval('state.tiers.length') === 4 && w6.eval(`state.gating['${lid}'].length`) === 4);
  w6.removeTier(3);
  ok('removeTier shrinks back to 3', w6.eval('state.tiers.length') === 3 && w6.eval(`state.gating['${lid}'].length`) === 3);
  const savedHC = w6.eval('gatherEngagement()');
  ok('enabled tiers + gating round-trip through save', Array.isArray(savedHC.tiers) && savedHC.tiers.length === 3 && !!savedHC.gating);
  w6.disableTiers();
  ok('disableTiers collapses back to the single analysis at the baseline NPV',
     w6.eval('tiersActive()') === false && w6.eval('state.nrvResult.nrv') === baseHC, String(w6.eval('state.nrvResult.nrv')));

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
