// Phase 11 verification — Delay becomes real (Part A, Chunk 11).
// One basis: itemization reconciles to its headline; delay shifts the whole stream
// and re-discounts (ΔNPV, payback moves out by the delay), not monthly × months.
//   node test/phase11_verify.js
const fs = require('fs');
const path = require('path');
const { loadApp } = require('./harness.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { (cond ? pass++ : fail++); console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? '  — ' + detail : ''}`); };
const abs = (...p) => path.resolve(__dirname, ...p);
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const V2 = abs('fixtures', 'v2_multitech_warehouse.json');

(async () => {
  console.log('\n── Chunk 11: delay becomes real ──');

  const w = loadApp().window; w.applyEngagement(readJSON(V2)); w.ensureCosts(); w.renderROI();
  const r = w.eval('state.nrvResult');

  // ── 1) ONE BASIS: per-lever ny1 is the NORMALIZED Year-1 benefit, and Σ ny1 equals
  //    the normalized Y1 total (netBenefit[0] − decayAvoided[0]) — so the itemization
  //    is on the same basis as the model, not gross-ramped.
  {
    const rows = w.eval('state.benefits.rows.map(r=>({id:r.sc.id, y1:r.y1, ny1:r.ny1, type:r.sc.rampType}))');
    const sumNy1 = rows.reduce((s, x) => s + x.ny1, 0);
    const normY1 = r.yearlyData[0].netBenefit - r.yearlyData[0].decayAvoided;
    ok('Σ ny1 == normalized Year-1 total (netBenefit[0] − decay[0]) to the cent', Math.abs(sumNy1 - normY1) < 1e-6, `Σny1=${Math.round(sumNy1)} norm=${Math.round(normY1)}`);
    // Any lever carrying access decay / overlap / finance credit has ny1 < y1.
    const shrunk = rows.find(x => x.ny1 < x.y1 - 1);
    ok('ny1 is normalized, not gross (some lever: ny1 < y1)', !!shrunk, shrunk ? `${shrunk.id}: ${Math.round(shrunk.ny1)} < ${Math.round(shrunk.y1)}` : 'none');
  }

  // ── 2) ITEMS SUM TO HEADLINE to the dollar (right card). Recompute the rendered
  //    items independently and confirm they sum to the rendered headline.
  {
    const months = 12;
    w.document.getElementById('sl-delay').value = String(months);
    w.syncDelay();
    const itemSum = w.eval(`(function(){
      const months=12, r=state.nrvResult, b=state.benefits;
      let items=b.rows.map(row=>Math.round((row.ny1||0)/12)*months);
      if(r.useDecay && r.yearlyData[0].decayAvoided>0) items.push(Math.round(r.yearlyData[0].decayAvoided/12)*months);
      return { sum: items.reduce((s,x)=>s+x,0), n: items.length };
    })()`);
    // The code builds the headline AS Σ items, so this is the contract; assert the DOM
    // headline string matches the independently summed value.
    const missed = w.document.getElementById('missed-items').textContent;
    const expectStr = w.eval(`fmt(${itemSum.sum})`);
    ok('right-card items sum to the rendered headline (to the dollar)', missed.includes('-' + expectStr), `Σitems=-${expectStr} present=${missed.includes('-'+expectStr)}`);
    const nLevers = w.eval('state.benefits.rows.length');
    ok('right card itemizes all levers (+ Decay line when on)', itemSum.n === nLevers + (r.yearlyData[0].decayAvoided > 0 ? 1 : 0), `n=${itemSum.n} levers=${nLevers}`);
  }

  // ── 3) DELAY = 0 reproduces the baseline exactly (NPV and payback).
  {
    const d0 = w.eval('delayImpact(state.nrvResult, 0)');
    ok('delay=0: npvDelayed == baseline NPV exactly', d0.npvDelayed === r.nrv, `${d0.npvDelayed} vs ${r.nrv}`);
    ok('delay=0: ΔNPV == 0', d0.dNPV === 0, String(d0.dNPV));
    ok('delay=0: payback unchanged', d0.paybackDelayed === r.paybackMo, `${d0.paybackDelayed} vs ${r.paybackMo}`);
  }

  // ── 4) DELAY = 12: payback moves out ~12 discounted months; ΔNPV negative; the
  //    re-discount matches the closed form NPV_delayed = NPV_baseline / (1+w)^(N/12).
  {
    const d12 = w.eval('delayImpact(state.nrvResult, 12)');
    ok('delay=12: ΔNPV is negative', d12.dNPV < 0, fmtN(d12.dNPV));
    ok('delay=12: payback moves out by ~12 months', d12.paybackDelayed !== null && Math.abs(d12.paybackDelayed - (r.paybackMo + 12)) < 0.05, `${r.paybackMo} → ${d12.paybackDelayed}`);
    const closed = Math.round(r.nrv / Math.pow(1 + r.wacc, 1));
    ok('delay=12: re-discounted NPV matches closed form NPV/(1+w)', Math.abs(d12.npvDelayed - closed) <= 1, `${d12.npvDelayed} vs ${closed}`);
    ok('delay=12: value foregone == −ΔNPV and is shown in the panel', d12.valueForegone === -d12.dNPV, fmtN(d12.valueForegone));
  }

  // ── 5) The LEFT panel renders the discounted impact (not monthly × months).
  {
    w.document.getElementById('sl-delay').value = '12'; w.syncDelay();
    const out = w.document.getElementById('delay-output').textContent;
    ok('left card shows discounted "VALUE FOREGONE (NPV)" + ΔNPV + PAYBACK', /VALUE FOREGONE \(NPV\)/.test(out) && /ΔNPV/.test(out) && /PAYBACK/.test(out), out.replace(/\s+/g,' ').slice(0,80));
    ok('left card states re-discount at WACC (connected to the model)', /re-discounted/.test(out));
  }

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();

function fmtN(n){ return (n<0?'-':'')+'$'+Math.abs(n).toLocaleString(); }
