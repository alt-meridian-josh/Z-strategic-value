// Phase 15 verification — Part B, Chunk 15: reconciliation + hardcoded retirement.
// The RFID-retail pack reproduces the hardcoded levers to the dollar; only the
// reconciled levers (RET-01/03/05) are retired from the calcSc switch and now compute
// as data (formula). Uncovered levers (RET-02/04) stay hardcoded — gap reported.
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

// registry → in-app lever the pack reproduces
const MAPPING = [
  { registryId: 'REG-RET-CYCLECOUNT', leverId: 'RET-01' },
  { registryId: 'REG-RET-SHRINK',     leverId: 'RET-03' },
  { registryId: 'REG-RET-RECEIVING',  leverId: 'RET-05' },
];

// Independent recompute of the ORIGINAL switch arithmetic (the pre-retirement code).
const ORIGINAL_SWITCH = {
  'RET-01': p => p.annual_count_cycles * p.total_sku_locations * (p.hours_per_sku_manual - p.hours_per_sku_rfid) * p.loaded_rate,
  'RET-03': p => p.annual_store_revenue * p.shrink_pct_baseline * p.shrink_reduction_pct,
  'RET-05': p => p.annual_receiving_labor_hours * p.labor_reduction_pct * p.loaded_rate,
};

(async () => {
  console.log('\n── Chunk 15: reconciliation + hardcoded retirement ──');
  const pack = readJSON(PACK);
  const src = fs.readFileSync(abs('..', 'index.html'), 'utf8');

  // Two input sets ("both fixtures"): the v1 sample inputs, and the SCENARIOS defaults.
  const w = loadApp().window; w.applyEngagement(readJSON(V1)); w.ensureCosts();
  const v1Inputs = {}; MAPPING.forEach(m => { v1Inputs[m.leverId] = w.eval(`Object.assign({}, state.inputs['${m.leverId}'])`); });
  const defInputs = {};
  MAPPING.forEach(m => {
    defInputs[m.leverId] = w.eval(`(function(){const s=SCENARIOS.find(x=>x.id==='${m.leverId}');const o={};Object.entries(s.inputs).forEach(([k,v])=>o[k]=(v&&typeof v==='object')?v.value:v);return o;})()`);
  });

  // ── 1) RETIREMENT happened: the switch no longer carries RET-01/03/05; they carry a formula.
  {
    ok('RET-01/03/05 removed from the calcSc switch', !/case"RET-01":/.test(src) && !/case"RET-03":/.test(src) && !/case"RET-05":/.test(src));
    ok('RET-02 / RET-04 remain hardcoded (not pack-covered — gap, no force-fit)', /case"RET-02":/.test(src) && /case"RET-04":/.test(src));
    ok('retired levers now carry a formula in SCENARIOS', MAPPING.every(m => w.eval(`!!(SCENARIOS.find(s=>s.id==='${m.leverId}')||{}).formula`)));
  }

  // ── 2) THE GATE: formula reproduces the ORIGINAL switch arithmetic to the dollar,
  //    on BOTH input sets. (This is what licensed the deletion.)
  for (const setName of ['v1', 'defaults']) {
    const inputs = setName === 'v1' ? v1Inputs : defInputs;
    MAPPING.forEach(m => {
      const original = ORIGINAL_SWITCH[m.leverId](inputs[m.leverId]);
      const now = w.eval(`(function(){const sc=SCENARIOS.find(s=>s.id==='${m.leverId}');const sv=state.inputs['${m.leverId}'];state.inputs['${m.leverId}']=${JSON.stringify(inputs[m.leverId])};const v=calcSc(sc);state.inputs['${m.leverId}']=sv;return v;})()`);
      ok(`${m.leverId} formula == original switch (${setName})`, Math.abs(original - now) < 1e-6, `${original} vs ${now}`);
    });
  }

  // ── 3) reconcileLeverPack(): pack reproduces the in-app levers to the dollar, both sets.
  {
    const rec1 = w.eval(`reconcileLeverPack(${JSON.stringify(pack)}, ${JSON.stringify(MAPPING)}, ${JSON.stringify(v1Inputs)})`);
    ok('pack reconciles to in-app levers on the v1 fixture (all)', rec1.every(r => r.reconciled), rec1.map(r => `${r.leverId}:${r.reconciled}`).join(' '));
    const recD = w.eval(`reconcileLeverPack(${JSON.stringify(pack)}, ${JSON.stringify(MAPPING)}, ${JSON.stringify(defInputs)})`);
    ok('pack reconciles to in-app levers on the defaults fixture (all)', recD.every(r => r.reconciled));
    ok('reconciled values are non-trivial (e.g. RET-01 v1 = 672,480)', Math.abs(rec1.find(r => r.leverId === 'RET-01').packValue - 672480) < 1e-6);
  }

  // ── 4) GAP REPORT: an unmapped lever does NOT reconcile (so it stays hardcoded).
  {
    const recBad = w.eval(`reconcileLeverPack(${JSON.stringify(pack)}, [{registryId:'REG-RET-CYCLECOUNT',leverId:'RET-02'}], ${JSON.stringify({ 'RET-02': v1Inputs['RET-01'] })})`);
    ok('mismatched mapping is flagged NOT reconciled (no force-fit)', recBad[0].reconciled === false);
  }

  // ── 5) END-TO-END: v1 sample computes byte-identically after retirement (the real gate).
  {
    const w2 = loadApp().window; w2.applyEngagement(readJSON(V1)); w2.ensureCosts(); w2.renderROI();
    ok('RET-01 computes 672,480 as data (v1)', Math.abs(w2.eval(`calcSc(SCENARIOS.find(s=>s.id==='RET-01'))`) - 672480) < 1e-6);
    ok('RET-05 computes 76,800 as data (v1)', Math.abs(w2.eval(`calcSc(SCENARIOS.find(s=>s.id==='RET-05'))`) - 76800) < 1e-6);
  }

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
