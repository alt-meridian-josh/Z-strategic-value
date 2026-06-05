// Phase 15 verification — Part B, Chunk 15 (reopened): full retail retirement.
// All 11 retail levers (RET-01…RET-11) are retired from the calcSc switch and now
// compute as data (formula). The pack covers all 11; byte-identical on SCENARIOS
// defaults. The v1 sample fixture covers RET-01/02/03/05 (it selects only those four).
// packLevers is emitted only when non-empty. TECH_KEY_MAP is marked transitional.
//   node test/phase15_verify.js
const fs = require('fs');
const path = require('path');
const { loadApp, ready } = require('./harness.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { (cond ? pass++ : fail++); console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? '  — ' + detail : ''}`); };
const abs = (...p) => path.resolve(__dirname, ...p);
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const PACK = abs('..', 'examples', 'lever_pack_rfid_retail_v1.json');
const V1 = abs('..', 'examples', 'sample_engagement.json');

// All 11 retail levers: registry → in-app lever.
const MAPPING = [
  { registryId: 'REG-RET-CYCLECOUNT', leverId: 'RET-01' },
  { registryId: 'REG-RET-OSA',        leverId: 'RET-02' },
  { registryId: 'REG-RET-SHRINK',     leverId: 'RET-03' },
  { registryId: 'REG-RET-MARKDOWN',   leverId: 'RET-04' },
  { registryId: 'REG-RET-RECEIVING',  leverId: 'RET-05' },
  { registryId: 'REG-RET-ASSOCIATE',  leverId: 'RET-06' },
  { registryId: 'REG-RET-OMNI',       leverId: 'RET-07' },
  { registryId: 'REG-RET-SAFETY',     leverId: 'RET-08' },
  { registryId: 'REG-RET-DATAFND',    leverId: 'RET-09' },
  { registryId: 'REG-RET-CHARGEBACK', leverId: 'RET-10' },
  { registryId: 'REG-RET-AP',         leverId: 'RET-11' },
];

// The v1 sample only carries inputs for these 4; only test "v1 fixture" for them.
const V1_MAPPING = MAPPING.filter(m => ['RET-01','RET-02','RET-03','RET-05'].includes(m.leverId));

// Independent recompute of the ORIGINAL switch arithmetic (pre-retirement reference).
const ORIGINAL_SWITCH = {
  'RET-01': p => p.annual_count_cycles * p.total_sku_locations * (p.hours_per_sku_manual - p.hours_per_sku_rfid) * p.loaded_rate,
  'RET-02': p => p.annual_store_revenue * p.out_of_stock_baseline_pct * p.osa_improvement_pct * p.gross_margin_pct,
  'RET-03': p => p.annual_store_revenue * p.shrink_pct_baseline * p.shrink_reduction_pct,
  'RET-04': p => p.annual_markdown_spend * p.markdown_reduction_pct * p.gm_recovery_pct,
  'RET-05': p => p.annual_receiving_labor_hours * p.labor_reduction_pct * p.loaded_rate,
  'RET-06': p => p.num_stores * p.associates_per_store * p.hours_recovered_per_week * p.weeks_per_year * p.loaded_rate,
  'RET-07': p => p.annual_omni_orders * p.cancellation_rate_baseline * p.cancellation_reduction_pct * p.avg_order_value * p.gm_pct,
  'RET-08': p => p.total_inventory_value * p.safety_stock_reduction_pct * p.carrying_cost_pct,
  'RET-09': p => p.annual_analytics_budget * p.data_quality_uplift_pct,
  'RET-10': p => p.annual_chargeback_exposure * p.chargeback_reduction_pct,
  'RET-11': p => p.annual_ap_investigation_cost * p.reduction_pct,
};

// Expected default values (spot-check anchors).
const EXPECTED_DEFAULTS = {
  'RET-01': 672480,   // 12 * 50000 * (0.05 - 0.0033) * 24
  'RET-02': 50000,    // 5000000 * 0.05 * 0.50 * 0.40
  'RET-03': 14000,    // 5000000 * 0.014 * 0.20
  'RET-04': 15000,    // 750000 * 0.10 * 0.20
  'RET-05': 76800,    // 8000 * 0.40 * 24
  'RET-06': 360000,   // 50 * 3 * 2 * 50 * 24
  'RET-07': 291600,   // 180000 * 0.09 * 0.60 * 75 * 0.40
  'RET-08': 100000,   // 10000000 * 0.05 * 0.20
  'RET-09': 75000,    // 500000 * 0.15
  'RET-10': 150000,   // 600000 * 0.25
  'RET-11': 90000,    // 300000 * 0.30
};

(async () => {
  console.log('\n── Chunk 15 (reopened): full retail retirement (RET-01…RET-11) ──');
  const pack = readJSON(PACK);
  const src = fs.readFileSync(abs('..', 'index.html'), 'utf8');

  // Load app + v1 engagement once, then extract both input sets.
  const w = loadApp().window; w.applyEngagement(readJSON(V1)); w.ensureCosts();

  // v1 inputs: only the 4 levers present in the v1 sample.
  const v1Inputs = {};
  V1_MAPPING.forEach(m => { v1Inputs[m.leverId] = w.eval(`Object.assign({}, state.inputs['${m.leverId}'])`); });

  // Default inputs: extract .value from every lever's SCENARIOS inputs (all 11).
  const defInputs = {};
  MAPPING.forEach(m => {
    defInputs[m.leverId] = w.eval(`(function(){const s=SCENARIOS.find(x=>x.id==='${m.leverId}');const o={};Object.entries(s.inputs).forEach(([k,v])=>o[k]=(v&&typeof v==='object')?v.value:v);return o;})()`);
  });

  // ── 1) RETIREMENT: no retail switch cases remain; all 11 carry formulas.
  {
    const retIds = ['RET-01','RET-02','RET-03','RET-04','RET-05','RET-06','RET-07','RET-08','RET-09','RET-10','RET-11'];
    const allGone = retIds.every(id => !new RegExp(`case"${id}":`).test(src));
    ok('all 11 RET levers removed from the calcSc switch', allGone, retIds.filter(id => new RegExp(`case"${id}":`).test(src)).join(' ') || 'none remain');
    ok('all 11 retired levers carry a formula in SCENARIOS', MAPPING.every(m => w.eval(`!!(SCENARIOS.find(s=>s.id==='${m.leverId}')||{}).formula`)));
    ok('TECH_KEY_MAP is marked as a transitional shim (comment present)', /Transitional inference shim/.test(src));
  }

  // ── 2) GATE: formula reproduces ORIGINAL switch arithmetic to the dollar.
  //    v1 inputs: 4 levers that have actual v1 data.
  //    Defaults: all 11.
  const runGate = (setName, mapping, inputs) => {
    mapping.forEach(m => {
      const original = ORIGINAL_SWITCH[m.leverId](inputs[m.leverId]);
      const now = w.eval(`(function(){const sc=SCENARIOS.find(s=>s.id==='${m.leverId}');const sv=state.inputs['${m.leverId}'];state.inputs['${m.leverId}']=${JSON.stringify(inputs[m.leverId])};const v=calcSc(sc);state.inputs['${m.leverId}']=sv;return v;})()`);
      ok(`${m.leverId} formula == original switch (${setName})`, Math.abs(original - now) < 1e-6, `${original} vs ${now}`);
    });
  };
  runGate('v1', V1_MAPPING, v1Inputs);
  runGate('defaults', MAPPING, defInputs);

  // ── 3) RECONCILE: pack reproduces in-app levers to the dollar on defaults (all 11).
  {
    const recD = w.eval(`reconcileLeverPack(${JSON.stringify(pack)}, ${JSON.stringify(MAPPING)}, ${JSON.stringify(defInputs)})`);
    ok('pack reconciles to in-app levers on the defaults fixture (all 11)', recD.every(r => r.reconciled), recD.filter(r=>!r.reconciled).map(r=>`${r.leverId}:${r.packValue}!=${r.leverValue}`).join(' ') || 'all ok');
    // Spot-check a few expected values via reconciliation.
    ok('RET-01 defaults = 672,480', Math.abs(recD.find(r => r.leverId === 'RET-01').packValue - 672480) < 1e-6);
    ok('RET-06 defaults = 360,000', Math.abs(recD.find(r => r.leverId === 'RET-06').packValue - 360000) < 1e-6);
    ok('RET-07 defaults = 291,600', Math.abs(recD.find(r => r.leverId === 'RET-07').packValue - 291600) < 1e-6);
    ok('RET-10 defaults = 150,000', Math.abs(recD.find(r => r.leverId === 'RET-10').packValue - 150000) < 1e-6);
    // Also test the 4 v1-covered levers on v1 inputs.
    const recV1 = w.eval(`reconcileLeverPack(${JSON.stringify(pack)}, ${JSON.stringify(V1_MAPPING)}, ${JSON.stringify(v1Inputs)})`);
    ok('pack reconciles to in-app levers on the v1 fixture (4 v1-covered levers)', recV1.every(r => r.reconciled), recV1.map(r=>`${r.leverId}:${r.reconciled}`).join(' '));
  }

  // ── 4) EXPECTED DEFAULT SPOT-CHECKS: all 11 values match independent arithmetic.
  {
    Object.entries(EXPECTED_DEFAULTS).forEach(([id, expected]) => {
      const actual = ORIGINAL_SWITCH[id](defInputs[id]);
      ok(`${id} default = ${expected.toLocaleString()}`, Math.abs(actual - expected) < 1e-6, String(actual));
    });
  }

  // ── 5) GAP REPORT: a mismatched mapping does NOT reconcile (no force-fit).
  {
    const recBad = w.eval(`reconcileLeverPack(${JSON.stringify(pack)}, [{registryId:'REG-RET-CYCLECOUNT',leverId:'RET-02'}], ${JSON.stringify({ 'RET-02': v1Inputs['RET-01'] })})`);
    ok('mismatched mapping is flagged NOT reconciled', recBad[0].reconciled === false);
  }

  // ── 6) END-TO-END: app computes all 11 retired levers correctly at defaults.
  {
    const w2 = loadApp().window; await ready(w2); w2.renderROI();
    ok('RET-01 defaults = 672,480 (data path)', Math.abs(w2.eval(`calcSc(SCENARIOS.find(s=>s.id==='RET-01'))`) - 672480) < 1e-6);
    ok('RET-05 defaults = 76,800 (data path)',  Math.abs(w2.eval(`calcSc(SCENARIOS.find(s=>s.id==='RET-05'))`) - 76800) < 1e-6);
    ok('RET-07 defaults = 291,600 (data path)', Math.abs(w2.eval(`calcSc(SCENARIOS.find(s=>s.id==='RET-07'))`) - 291600) < 1e-6);
    ok('RET-10 defaults = 150,000 (data path)', Math.abs(w2.eval(`calcSc(SCENARIOS.find(s=>s.id==='RET-10'))`) - 150000) < 1e-6);
    ok('RET-11 defaults = 90,000 (data path)',  Math.abs(w2.eval(`calcSc(SCENARIOS.find(s=>s.id==='RET-11'))`) - 90000) < 1e-6);
  }

  // ── 7) packLevers conditional: not emitted when no pack levers selected; emitted when present.
  {
    const wc = loadApp().window; await ready(wc);
    // No pack loaded → no pack levers selected → packLevers key must be absent.
    const gNoPackLevers = wc.gatherEngagement();
    ok('packLevers absent when no pack levers are selected', !Object.prototype.hasOwnProperty.call(gNoPackLevers, 'packLevers'));

    // Load the pack and select a lever → packLevers must appear.
    wc.eval(`loadLeverPack(${JSON.stringify(pack)})`);
    wc.eval("state.selectedIds.add('REG-RET-CYCLECOUNT'); activeIndustries.clear(); activeIndustries.add('retail');");
    const gWithPackLevers = wc.gatherEngagement();
    ok('packLevers present and non-empty after selecting a pack lever', Array.isArray(gWithPackLevers.packLevers) && gWithPackLevers.packLevers.length > 0);
  }

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
