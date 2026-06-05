// Phase 12 verification — Part B, Chunk 12: formula evaluator + per-input provenance.
// Safe evaluator (no eval/Function/calls/property access), formula feeds the full
// normalization chain, named-constants gate blocks customer export, and a formula
// lever with sourced inputs round-trips and renders its citation in a customer export.
//   node test/phase12_verify.js
const fs = require('fs');
const path = require('path');
const { loadApp, diff, exportStandalone, ready } = require('./harness.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { (cond ? pass++ : fail++); console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? '  — ' + detail : ''}`); };
const abs = (...p) => path.resolve(__dirname, ...p);
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const V2 = abs('fixtures', 'v2_multitech_warehouse.json');
const throws = fn => { try { fn(); return false; } catch (e) { return e.message; } };
// `state`/`engagementProvenance` are inline-scope vars, reachable only via w.eval.
const pushLever = (w, lever) => w.eval(`state.customScenarios.push(${JSON.stringify(lever)})`);
const setProv = (w, scId, obj) => w.eval(`engagementProvenance[${JSON.stringify(scId)}]=${JSON.stringify(obj)}`);

// A clean, fully-named formula lever (no magic numbers → customer-exportable).
function formulaLever() {
  return {
    id: 'CUSTOM-F1', name: 'Putaway labor recovery (formula)', custom: true, active: true,
    rampType: 'hard_labor', accessibilityTier: 'configured', haircut: 0.10,
    formula: 'pallets_per_week * minutes_saved / 60 * loaded_rate * 52',
    inputs: { pallets_per_week: 400, minutes_saved: 3, loaded_rate: 30 },
    ranges: { minutes_saved: [1, 5] },
    evidence: { confidence: 'B', citation: 'GS1 putaway time-and-motion study (2022)', formulaSource: 'Labor-recovery: volume × time saved × rate' }
  };
}

(async () => {
  console.log('\n── Chunk 12: formula evaluator + per-input provenance ──');
  const w0 = loadApp().window;

  // ── 1) SAFE EVALUATOR.
  {
    ok('arithmetic + precedence + parens', w0.evalFormula('(a+b)*c', { a: 1, b: 2, c: 3 }) === 9);
    ok('unary minus', w0.evalFormula('-a + b', { a: 5, b: 8 }) === 3);
    ok('rejects function calls', !!throws(() => w0.evalFormula('a()', { a: 1 })));
    ok('rejects property access (.)', !!throws(() => w0.evalFormula('a.b', { a: 1 })));
    ok('rejects unknown identifier', !!throws(() => w0.evalFormula('a*b', { a: 1 })));
    ok('rejects illegal characters (; , [])', !!throws(() => w0.evalFormula('a;b', { a: 1, b: 2 })) && !!throws(() => w0.evalFormula('a[0]', { a: 1 })));
    ok('division by zero collapses to 0 (no Infinity)', w0.evalFormula('a/b', { a: 5, b: 0 }) === 0);
    ok('does NOT use eval/Function (source uses neither in evaluator)', /function evalFormula[\s\S]*?\n}/.test(fs.readFileSync(abs('..','index.html'),'utf8')) && !/eval\(|new Function/.test(fs.readFileSync(abs('..','index.html'),'utf8').match(/function tokenizeFormula[\s\S]*?function calcSc/)[0]));
  }

  // ── 2) LINT (named-constants rule).
  {
    ok('lint: unit constants pass (52, 60, 100)', w0.lintFormula('a*b/60*52').ok === true);
    ok('lint: magic coefficient flagged', w0.lintFormula('a*0.37').ok === false && w0.lintFormula('a*0.37').literals[0] === '0.37');
    ok('identifiers are the named inputs (first-seen order)', w0.formulaIdentifiers('a*b + a*c').join(',') === 'a,b,c');
  }

  // ── 3) calcSc uses the formula and it FEEDS the normalization chain.
  {
    const w = loadApp().window; w.applyEngagement(readJSON(V2)); w.ensureCosts();
    const lever = formulaLever();
    pushLever(w, lever);
    const gross = w.calcSc(lever);
    ok('calcSc evaluates the formula to gross annual', Math.abs(gross - (400 * 3 / 60 * 30 * 52)) < 1e-6, String(gross));
    // Y3 normalized contribution = gross × ramp × access × overlap × finance (hard_labor: fc=1, haircut 0.10)
    w.renderROI();
    const rows2 = w.calcDriverWalkdown(lever, w.eval('state.nrvResult'));
    const y3 = rows2[2];
    ok('formula lever flows through ramp×access×overlap (normalized < gross)', y3.afterHaircut < y3.gross && y3.gross === gross, `Y3 ${Math.round(y3.afterHaircut)} < gross ${Math.round(gross)}`);
    // It actually moves the engine total.
    const before = w.eval('(function(){const a=SCENARIOS.filter(s=>state.selectedIds.has(s.id));return calcNRV(a, state.costs, {wacc:0.1,useDecay:false,g:0.035,financeCredit:{enabled:true,rate:0.4}}).yearlyData[2].netBenefit;})()');
    const withF = w.eval('(function(){const a=SCENARIOS.filter(s=>state.selectedIds.has(s.id)).concat(state.customScenarios.filter(s=>s.active));return calcNRV(a, state.costs, {wacc:0.1,useDecay:false,g:0.035,financeCredit:{enabled:true,rate:0.4}}).yearlyData[2].netBenefit;})()');
    ok('formula lever increases the modeled Y3 net benefit', withF > before, `${Math.round(before)} → ${Math.round(withF)}`);
  }

  // ── 4) CUSTOMER-EXPORT GATE: magic numbers block; named inputs clear it.
  {
    const w = loadApp().window; w.applyEngagement(readJSON(V2)); w.ensureCosts();
    w.eval('window.__alert=null; window.alert=function(m){window.__alert=m;}');
    pushLever(w, { id: 'CUSTOM-BAD', name: 'magic', custom: true, active: true, rampType: 'hard_cost', accessibilityTier: 'configured', haircut: 0.1, formula: 'revenue * 0.013', inputs: { revenue: 1000000 } });
    ok('formulaExportFindings flags the magic number', w.formulaExportFindings().some(f => f.leverId === 'CUSTOM-BAD' && f.literals.includes('0.013')));
    ok('customerExportAllowed() returns false and alerts', w.customerExportAllowed('Deck') === false && /magic number/i.test(w.eval('window.__alert') || ''));
    // Replace with a named input → gate clears.
    w.eval("var b=state.customScenarios.find(s=>s.id==='CUSTOM-BAD'); b.formula='revenue * shrink_rate'; b.inputs.shrink_rate=0.013;");
    ok('gate clears once the coefficient is a named input', w.formulaExportFindings().length === 0 && w.customerExportAllowed('Deck') === true);
  }

  // ── 5) ROUND-TRIP: formula + ranges + per-input provenance survive save/load.
  {
    const w = loadApp().window; w.applyEngagement(readJSON(V2)); w.ensureCosts();
    pushLever(w, formulaLever());
    setProv(w, 'CUSTOM-F1', { minutes_saved: { source: 'GS1 study', confidence: 'B' } });
    const A = w.gatherEngagement();
    const w2 = loadApp().window; w2.applyEngagement(A); w2.ensureCosts();
    const B = w2.gatherEngagement();
    ok('formula-lever engagement reaches a save/load fixpoint', diff(A, B) === null, diff(A, B) || '');
    const cf = B.customScenarios.find(s => s.id === 'CUSTOM-F1');
    ok('formula string round-trips', cf && cf.formula === formulaLever().formula);
    ok('input range round-trips', cf && cf.ranges && cf.ranges.minutes_saved.join(',') === '1,5');
    ok('per-input provenance round-trips in _provenance', B._provenance['CUSTOM-F1'] && B._provenance['CUSTOM-F1'].minutes_saved.confidence === 'B' && B._provenance['CUSTOM-F1'].minutes_saved.source === 'GS1 study');
  }

  // ── 6) CUSTOMER MODE: bounded slider for a ranged formula input; structure locked.
  {
    const w = loadApp().window; const v2 = readJSON(V2);
    v2.customScenarios = (v2.customScenarios || []).concat([formulaLever()]);
    v2.mode = 'customer';
    w.applyEngagement(v2); w.ensureCosts();
    ok('lookupInputRange resolves a custom formula input range', w.lookupInputRange('CUSTOM-F1', 'minutes_saved').join(',') === '1,5');
    const html = w.valueInputHTML('CUSTOM-F1', 'minutes_saved', 3, '', '');
    ok('customer mode renders a bounded slider for the ranged input', /type="range"/.test(html) && /min="1"/.test(html) && /max="5"/.test(html));
  }

  // ── 7) Citation renders in a customer-facing export (whole-phase acceptance).
  {
    const w = loadApp().window; const v2 = readJSON(V2);
    v2.customScenarios = (v2.customScenarios || []).concat([formulaLever()]);
    w.applyEngagement(v2); w.ensureCosts(); w.renderROI();
    const wd = w.document.getElementById('nrv-walkdown-body').textContent;
    ok('formula lever renders its citation in the walk-down', /GS1 putaway time-and-motion study/.test(wd), wd.replace(/\s+/g,' ').slice(0,60));
    const exported = await exportStandalone(w);
    ok('customer export embeds the formula + citation (offline-complete)', /pallets_per_week \* minutes_saved/.test(exported) && /GS1 putaway time-and-motion study/.test(exported));
  }

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
