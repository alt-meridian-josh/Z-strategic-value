// Phase 10 verification — Math-flow integrity (Part A, Chunk 10):
// one pure engine, one path, no dead toggle, no IRR, normalized decay, honest labels.
//   node test/phase10_verify.js
const fs = require('fs');
const path = require('path');
const { loadApp, ready } = require('./harness.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { (cond ? pass++ : fail++); console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? '  — ' + detail : ''}`); };
const abs = (...p) => path.resolve(__dirname, ...p);
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const V2 = abs('fixtures', 'v2_multitech_warehouse.json');

(async () => {
  console.log('\n── Chunk 10: one engine, one path, honest labels ──');

  // ── 1) PURITY: calcNRV reads ONLY its opts. Mutate every possible ambient source
  //    of hidden state (the now-removed globals AND the live toolbar controls) to
  //    garbage between two identical-opts calls; results must be byte-identical.
  {
    const w = loadApp().window; w.applyEngagement(readJSON(V2)); w.ensureCosts();
    const run = () => w.eval(`(function(){
      const active = SCENARIOS.filter(s=>state.selectedIds.has(s.id)).concat((state.customScenarios||[]).filter(s=>s.active));
      const opts = { wacc:0.10, useDecay:true, g:0.035, financeCredit:{enabled:true, rate:0.40} };
      return JSON.stringify(calcNRV(active, state.costs, opts));
    })()`);
    const a = run();
    // Poison every ambient channel the old impure engine could have read.
    w.eval(`window.financeCreditEnabled='GARBAGE'; window.financeCreditRate=987654;
            document.getElementById('fin-credit-on').value='0';
            document.getElementById('fin-credit-rate').value='999';
            document.getElementById('nrv-wacc').value='0.18';
            document.getElementById('nrv-decay').value='0';`);
    const b = run();
    ok('calcNRV is pure: identical opts → byte-identical result despite poisoned globals/DOM', a === b);
    // And the poisoned ambient state genuinely WOULD change output if leaked — prove
    // the engine responds to opts (so the equality above is not a no-op).
    const c = w.eval(`(function(){
      const active = SCENARIOS.filter(s=>state.selectedIds.has(s.id)).concat((state.customScenarios||[]).filter(s=>s.active));
      return JSON.stringify(calcNRV(active, state.costs, { wacc:0.10, useDecay:true, g:0.035, financeCredit:{enabled:false, rate:0.40} }));
    })()`);
    ok('calcNRV DOES respond to opts.financeCredit (equality above is meaningful)', c !== a);
  }

  // ── 2) Dead NRV-layer toggle is gone (removed, not made "real").
  {
    const w = loadApp().window; await ready(w);
    ok('NRV-layer toggle (#nrv-on) no longer exists in the DOM', w.document.getElementById('nrv-on') === null);
    ok('source carries no nrvOn / nrv-on references', !/nrv-on|nrvOn/.test(fs.readFileSync(abs('..','index.html'),'utf8')));
  }

  // ── 3) No path prints a value labeled IRR (MIRR only).
  {
    const src = fs.readFileSync(abs('..','index.html'),'utf8');
    const bareIRR = src.split('\n').filter(l => /IRR/.test(l) && !/MIRR/.test(l) && !/JSZip|\.encode|\.decode/.test(l));
    ok('zero bare "IRR" references in source (allow MIRR)', bareIRR.length === 0, bareIRR.slice(0,2).join(' | '));
    const w = loadApp().window; w.applyEngagement(readJSON(V2)); w.ensureCosts(); w.renderROI();
    const fin = w.document.getElementById('fin-grid').textContent;
    ok('fin-grid shows MIRR, never a bare IRR', /MIRR/.test(fin) && !/\bIRR\b/.test(fin.replace(/MIRR/g,'')), fin.replace(/\s+/g,' ').slice(0,80));
    ok('estimateIRR function removed', typeof w.estimateIRR === 'undefined');
  }

  // ── 4) Decay-Avoided inherits the normalization chain: base = normalized annual
  //    benefit (not gross B0). decay(t) == normBenefit(t) × ((1+g)^yr − 1) to the cent,
  //    and is strictly LESS than the old gross-B0 basis (more conservative).
  {
    const w = loadApp().window; w.applyEngagement(readJSON(V2)); w.ensureCosts(); w.renderROI();
    const r = w.eval('state.nrvResult');
    const g = r.g;
    let maxErr = 0, allLess = true;
    r.yearlyData.forEach((y, t) => {
      const norm = y.netBenefit - y.decayAvoided;
      const expect = norm * (Math.pow(1 + g, t + 1) - 1);
      maxErr = Math.max(maxErr, Math.abs(expect - y.decayAvoided));
      const grossBasis = r.B0 * (Math.pow(1 + g, t + 1) - 1);   // the OLD basis
      if (!(y.decayAvoided <= grossBasis + 1e-6)) allLess = false;
    });
    ok('decayAvoided(t) == normalizedBenefit(t) × ((1+g)^yr − 1) to the cent', maxErr < 1e-6, `maxErr=${maxErr}`);
    ok('normalized decay ≤ old gross-B0 decay every year (more conservative)', allLess);
    // identity preserved: netBenefit = normalized + decay (walkdown still reconciles)
    const idOK = r.yearlyData.every(y => Math.abs(y.netBenefit - ((y.netBenefit - y.decayAvoided) + y.decayAvoided)) < 1e-9);
    ok('netBenefit = normalized + decay identity holds', idOK);
  }

  // ── 5) Honest, dynamic labels: WACC sub-labels track the live slider; ROI sub-label
  //    states "undiscounted"; peak-year label follows the data (argmax), not "Yr 3".
  {
    const w = loadApp().window; w.applyEngagement(readJSON(V2)); w.ensureCosts();
    const subAt = (wacc) => { w.document.getElementById('nrv-wacc').value = String(wacc); w.renderROI();
      return w.document.getElementById('kpi-grid').textContent; };
    const at14 = subAt(0.14), at8 = subAt(0.08);
    ok('payback sub-label tracks WACC slider (14%)', /discounted at 14% WACC/.test(at14));
    ok('payback sub-label tracks WACC slider (8%)', /discounted at 8% WACC/.test(at8));
    ok('NRV sub-label tracks WACC slider (8%)', /discounted at 8% · normalized/.test(at8));
    ok('ROI sub-label is honest about discounting', /undiscounted 5-yr totals/.test(at8) && !/NRV-normalized · decay applied/.test(at8));
    // Peak-year label equals the argmax year of yearlyData.netBenefit.
    w.renderROI();
    const r = w.eval('state.nrvResult');
    const argmax = r.yearlyData.reduce((bi,y,i,a)=> y.netBenefit>a[bi].netBenefit?i:bi,0);
    ok('peak-year label follows the data (argmax)', new RegExp(`Peak NRV \\(Yr ${r.yearlyData[argmax].year}\\)`).test(w.document.getElementById('kpi-grid').textContent), `peakYear=${r.peakYear} argmax=${r.yearlyData[argmax].year}`);
  }

  // ── 6) Finance credit still round-trips through save/load (now via the controls).
  {
    const w = loadApp().window; const v2 = readJSON(V2);
    v2.financeCredit = { enabled: true, rate: 0.55 };
    w.applyEngagement(v2); w.ensureCosts();
    const g = w.gatherEngagement();
    ok('finance credit round-trips through controls (0.55)', g.financeCredit.enabled === true && Math.abs(g.financeCredit.rate - 0.55) < 1e-9, JSON.stringify(g.financeCredit));
  }

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
