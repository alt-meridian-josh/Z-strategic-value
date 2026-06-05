// Phase 14 verification — Part B, Chunk 14: lever-pack loader.
// Validation discipline, registration into SCENARIOS, formula calc, evidence grades,
// registryId@version pinning, and offline-complete round-trip (embedded snapshot
// reproduces identically with NO pack present).
//   node test/phase14_verify.js
const fs = require('fs');
const path = require('path');
const { loadApp, diff, ready } = require('./harness.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { (cond ? pass++ : fail++); console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? '  — ' + detail : ''}`); };
const abs = (...p) => path.resolve(__dirname, ...p);
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const PACK = abs('..', 'examples', 'lever_pack_rfid_retail_v1.json');
const throws = fn => { try { fn(); return false; } catch (e) { return e.message; } };
const loadPack = (w, pack) => w.eval(`loadLeverPack(${JSON.stringify(pack)})`);

(async () => {
  console.log('\n── Chunk 14: lever-pack loader ──');
  const pack = readJSON(PACK);

  // ── 1) BUNDLED PACK is well-formed and validates.
  {
    const w = loadApp().window; await ready(w);
    ok('bundled examples/lever_pack_rfid_retail_v1.json validates', w.eval(`validateLeverPack(${JSON.stringify(pack)})`) === true);
    ok('pack is verified-only: no formula carries a magic number', pack.levers.every(lv => w.lintFormula(lv.formula).ok));
  }

  // ── 2) VALIDATION DISCIPLINE — malformed packs throw.
  {
    const w = loadApp().window; await ready(w);
    ok('rejects wrong _type', !!throws(() => w.eval('validateLeverPack({_type:"nope",packId:"p",version:"1",levers:[]})')));
    ok('rejects missing registryId/version', !!throws(() => w.eval('validateLeverPack({_type:"lever-pack",packId:"p",version:"1",levers:[{formula:"a"}]})')));
    ok('rejects magic-number formula (verified-only)', !!throws(() => w.eval('validateLeverPack({_type:"lever-pack",packId:"p",version:"1",levers:[{registryId:"R",version:"1",formula:"a*0.37",inputs:{a:{value:1}},evidence:[{id:"E",tier:"Tier 2"}],rampType:"hard_cost",haircut:0.1}]})')));
    ok('rejects undeclared formula input', !!throws(() => w.eval('validateLeverPack({_type:"lever-pack",packId:"p",version:"1",levers:[{registryId:"R",version:"1",formula:"a*b",inputs:{a:{value:1}},evidence:[{id:"E",tier:"Tier 2"}],rampType:"hard_cost",haircut:0.1}]})')));
    ok('rejects missing/invalid evidence tier', !!throws(() => w.eval('validateLeverPack({_type:"lever-pack",packId:"p",version:"1",levers:[{registryId:"R",version:"1",formula:"a",inputs:{a:{value:1}},evidence:[{id:"E",tier:"gold"}],rampType:"hard_cost",haircut:0.1}]})')));
    ok('rejects invalid rampType', !!throws(() => w.eval('validateLeverPack({_type:"lever-pack",packId:"p",version:"1",levers:[{registryId:"R",version:"1",formula:"a",inputs:{a:{value:1}},evidence:[{id:"E",tier:"Tier 1"}],rampType:"bogus",haircut:0.1}]})')));
  }

  // ── 3) LOAD registers levers into SCENARIOS (supplements the hardcoded set).
  {
    const w = loadApp().window; await ready(w);
    const before = w.eval('SCENARIOS.length');
    const n = loadPack(w, pack);
    ok('loadLeverPack returns the count registered', n === pack.levers.length);
    ok('pack levers are added to SCENARIOS', w.eval('SCENARIOS.length') === before + pack.levers.length);
    ok('a pack lever is now resolvable by registryId', w.eval(`!!SCENARIOS.find(s=>s.id==='REG-RET-CYCLECOUNT' && s.pack===true)`));
    ok('loadedLeverPacks records packId@version', w.eval(`loadedLeverPacks.some(p=>p.packId==='rfid_retail' && p.version==='v1')`));
  }

  // ── 4) calcSc evaluates the pack lever's formula over its resolved inputs.
  {
    const w = loadApp().window; await ready(w); loadPack(w, pack);
    const v = w.eval(`calcSc(SCENARIOS.find(s=>s.id==='REG-RET-CYCLECOUNT'))`);
    // 12 * 50000 * (0.05 - 0.0033) * 24 = 672,480
    ok('pack lever computes via formula (REG-RET-CYCLECOUNT = 672,480)', Math.abs(v - 672480) < 1e-6, String(v));
    const v2 = w.eval(`calcSc(SCENARIOS.find(s=>s.id==='REG-RET-RECEIVING'))`);
    ok('REG-RET-RECEIVING = 76,800', Math.abs(v2 - 76800) < 1e-6, String(v2));
  }

  // ── 5) Pack evidence registered → computed grade resolves against tiers.
  {
    const w = loadApp().window; await ready(w); loadPack(w, pack);
    ok('pack evidence registered into EVIDENCE', w.eval(`!!EVIDENCE.find(e=>e.id==='EV-RET-LABOR-01')`));
    ok('REG-RET-CYCLECOUNT grades Proven (Tier 1 + Tier 3)', w.eval(`computeEvidenceGrade(SCENARIOS.find(s=>s.id==='REG-RET-CYCLECOUNT')).key`) === 'proven');
    ok('REG-RET-SHRINK grades Emerging (single Tier 2)', w.eval(`computeEvidenceGrade(SCENARIOS.find(s=>s.id==='REG-RET-SHRINK')).key`) === 'emerging');
  }

  // ── 6) Pins registryId@version on the registered lever.
  {
    const w = loadApp().window; await ready(w); loadPack(w, pack);
    const lv = w.eval(`(function(){const s=SCENARIOS.find(x=>x.id==='REG-RET-CYCLECOUNT');return {rid:s.registryId,ver:s.registryVersion};})()`);
    ok('lever pins registryId@version', lv.rid === 'REG-RET-CYCLECOUNT' && lv.ver === 'v1', JSON.stringify(lv));
  }

  // ── 7) OFFLINE-COMPLETE round-trip: select a pack lever, save, reopen in a FRESH app
  //    with NO pack loaded — the embedded snapshot re-registers and computes identically.
  {
    const wa = loadApp().window; await ready(wa); loadPack(wa, pack);
    wa.eval("state.selectedIds = new Set(['REG-RET-CYCLECOUNT','REG-RET-SHRINK']); activeIndustries.clear(); activeIndustries.add('retail');");
    const A = wa.gatherEngagement();
    ok('save embeds resolved pack-lever snapshots (pinned)', Array.isArray(A.packLevers) && A.packLevers.length === 2 && A.packLevers[0].registryId && A.packLevers[0].version);
    const valA = wa.eval(`calcSc(SCENARIOS.find(s=>s.id==='REG-RET-CYCLECOUNT'))`);

    const wb = loadApp().window; await ready(wb);          // fresh app, pack NOT loaded
    ok('fresh app has no pack lever before load', wb.eval(`!SCENARIOS.find(s=>s.id==='REG-RET-CYCLECOUNT')`));
    wb.applyEngagement(A); wb.ensureCosts();
    ok('reopened engagement re-registers the pack lever from the embedded snapshot', wb.eval(`!!SCENARIOS.find(s=>s.id==='REG-RET-CYCLECOUNT' && s.pack===true)`));
    const valB = wb.eval(`calcSc(SCENARIOS.find(s=>s.id==='REG-RET-CYCLECOUNT'))`);
    ok('pack lever reproduces identically offline (same value)', Math.abs(valA - valB) < 1e-9, `${valA} vs ${valB}`);
    wb.renderROI();
    ok('reopened pack lever contributes to the model', wb.eval(`state.nrvResult.yearlyData[2].netBenefit`) > 0);

    // Fixpoint with packs embedded.
    const B = wb.gatherEngagement();
    ok('pack-bearing engagement reaches a save/load fixpoint', diff(A, B) === null, diff(A, B) || '');
  }

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
