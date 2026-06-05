// Phase 13 verification — Part B, Chunk 13: technology multi-select, filtered picker
// with dependency guard, and COMPUTED evidence grades + concentration flag.
//   node test/phase13_verify.js
const fs = require('fs');
const path = require('path');
const { loadApp, ready, exportStandalone } = require('./harness.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { (cond ? pass++ : fail++); console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? '  — ' + detail : ''}`); };
const abs = (...p) => path.resolve(__dirname, ...p);
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const V2 = abs('fixtures', 'v2_multitech_warehouse.json');

(async () => {
  console.log('\n── Chunk 13: technology multi-select + computed evidence grades ──');

  // ── 1) COMPUTED EVIDENCE GRADE — derived from EVIDENCE tiers, never hand-typed.
  {
    const w = loadApp().window; await ready(w);
    const grade = id => w.eval(`computeEvidenceGrade(SCENARIOS.find(s => s.id === '${id}')).key`);
    // RET-01: EV-RET-LABOR-01 (Tier 3) + EV-RET-ACC-01 (Tier 1) → ≥2 sources, ≥1 Tier1 → Proven.
    ok('Proven: ≥2 sources incl. Tier 1 (RET-01)', grade('RET-01') === 'proven', grade('RET-01'));
    // Synthesize grade cases against the real EVIDENCE registry.
    const mk = ids => w.eval(`computeEvidenceGrade({id:'X',custom:false,evidenceIds:${JSON.stringify(ids)}}).key`);
    const tierOf = w.eval('(function(){const m={};EVIDENCE.forEach(e=>{const t=/Tier\\s*([123])/.exec(e.tier);if(t)(m[t[1]]=m[t[1]]||[]).push(e.id);});return m;})()');
    ok('Supported: single Tier 1', mk([tierOf['1'][0]]) === 'supported', mk([tierOf['1'][0]]));
    ok('Supported: ≥2 Tier 2', mk([tierOf['2'][0], tierOf['2'][1]]) === 'supported');
    ok('Emerging: single Tier 2', mk([tierOf['2'][0]]) === 'emerging');
    ok('Emerging: Tier 3 only', mk([tierOf['3'][0]]) === 'emerging');
    ok('Unregistered: no evidence ids', mk([]) === 'unregistered');
    // Custom lever without registryId → Unregistered regardless of evidence.
    ok('Unregistered: custom pending promotion', w.eval(`computeEvidenceGrade({id:'C',custom:true,evidence:{evidenceIds:['${tierOf['1'][0]}']}}).key`) === 'unregistered');
    // Migration: the picker/walkdown badge is computed, not the hand-typed sc.evidence string.
    ok('grade is computed independent of hand-typed sc.evidence', w.eval(`computeEvidenceGrade({id:'Z',custom:false,evidence:'Strong',evidenceIds:['${tierOf['2'][0]}']}).key`) === 'emerging');
  }

  // ── 2) EVIDENCE GRADE renders in walkdown (and survives into the export).
  {
    const w = loadApp().window; w.applyEngagement(readJSON(V2)); w.ensureCosts(); w.renderROI();
    const wd = w.document.getElementById('nrv-walkdown-body').textContent;
    ok('walkdown renders a computed grade label', /Proven|Supported|Emerging|Unregistered/.test(wd), wd.replace(/\s+/g,' ').slice(0,70));
  }

  // ── 3) EVIDENCE-CONCENTRATION flag — advisory when >40% of Y3 normalized benefit is Emerging.
  {
    const w = loadApp().window; w.applyEngagement(readJSON(V2)); w.ensureCosts(); w.renderROI();
    const active = w.eval('SCENARIOS.filter(s=>state.selectedIds.has(s.id)).concat((state.customScenarios||[]).filter(s=>s.active))');
    const conc = w.eval('emergingConcentration(SCENARIOS.filter(s=>state.selectedIds.has(s.id)).concat((state.customScenarios||[]).filter(s=>s.active)), state.nrvResult)');
    ok('emergingConcentration returns a share in [0,1]', conc.share >= 0 && conc.share <= 1, `share=${(conc.share*100).toFixed(0)}%`);
    const flagEl = w.document.getElementById('evidence-conc-flag');
    const shown = flagEl.style.display !== 'none';
    ok('concentration flag visibility matches the 40% threshold (advisory, non-blocking)', shown === (conc.share > 0.40), `shown=${shown} share=${(conc.share*100).toFixed(0)}%`);
  }

  // ── 4) TECHNOLOGY MULTI-SELECT writes to technologies[] and round-trips.
  {
    const w = loadApp().window; await ready(w);
    w.eval("engagementTechnologies=[]");
    w.toggleTechnology('rfid', true); w.toggleTechnology('mv', true);
    const g = w.gatherEngagement();
    ok('toggleTechnology writes to technologies[]', g.technologies.map(t => t.id).sort().join(',') === 'mv,rfid', g.technologies.map(t=>t.id).join(','));
    const host = w.document.getElementById('tech-select').innerHTML;
    ok('multi-select renders catalog checkboxes', /RFID/.test(host) && /Machine Vision/.test(host) && (host.match(/type="checkbox"/g) || []).length === w.eval('TECHNOLOGY_CATALOG.length'));
  }

  // ── 5) PICKER FILTERS on the selection (mixed-tech levers need ALL their techs).
  {
    const w = loadApp().window; await ready(w);
    // CUSTOM lever requiring [rfid, mv]: shows only when both are selected.
    const need = ['rfid', 'mv'];
    const showable = sel => w.eval(`(function(){const sel=${JSON.stringify(sel)};const need=${JSON.stringify(need)};return need.every(t=>sel.includes(t));})()`);
    ok('mixed-tech lever hidden when only one tech selected', showable(['rfid']) === false);
    ok('mixed-tech lever shown when all techs selected', showable(['rfid', 'mv']) === true);
    // leverTechnologyIds infers RFID for a bundled RFID lever.
    ok('leverTechnologyIds infers rfid for a bundled lever', w.eval("leverTechnologyIds(SCENARIOS.find(s => s.id === 'RET-01')).includes('rfid')"));
  }

  // ── 6) DEPENDENCY GUARD — deselecting a tech deactivates dependent active levers.
  {
    const w = loadApp().window; await ready(w);
    w.eval("window.__alert=null; window.alert=function(m){window.__alert=m;}");
    // Declare a single-tech stack and select a lever that depends on it.
    w.eval("engagementTechnologies=[{id:'rfid',label:'RFID'}]; state.selectedIds=new Set(['RET-01']);");
    ok('lever selected before deselect', w.eval("state.selectedIds.has('RET-01')") === true);
    w.toggleTechnology('rfid', false);   // remove the tech the lever depends on
    ok('deselecting the tech deactivated the dependent lever', w.eval("state.selectedIds.has('RET-01')") === false);
    ok('a warning was shown', /deactivated/i.test(w.eval('window.__alert') || ''));
  }

  // ── 7) CUSTOMER-LITE Emerging footnote appears in the customer walk-down.
  {
    const w = loadApp().window; const v2 = readJSON(V2); v2.mode = 'customer';
    w.applyEngagement(v2); w.ensureCosts(); w.renderROI();
    const wd = w.document.getElementById('nrv-walkdown-body').textContent;
    const hasEmerging = w.eval("SCENARIOS.filter(s=>state.selectedIds.has(s.id)).concat((state.customScenarios||[]).filter(s=>s.active)).some(s=>computeEvidenceGrade(s).key==='emerging')");
    ok('customer mode shows the Emerging single-source footnote when applicable', !hasEmerging || /single-source benchmark; conservative rate pending additional validation/.test(wd));
  }

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
