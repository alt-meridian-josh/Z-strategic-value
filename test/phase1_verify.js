// Phase 1 verification runner. Grows one section per chunk. Drives the real
// index.html in jsdom (offline) and asserts behavior with evidence, not claims.
//   node test/phase1_verify.js
const fs = require('fs');
const path = require('path');
const { loadApp, diff, exportStandalone } = require('./harness.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  (cond ? pass++ : fail++);
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? '  — ' + detail : ''}`);
};
const abs = (...p) => path.resolve(__dirname, ...p);
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));

const V1 = abs('..', 'examples', 'sample_engagement.json');
const V2 = abs('fixtures', 'v2_multitech_warehouse.json');
const BASE = abs('fixtures', 'v1_compute_baseline.json');

function applied(obj) {
  const w = loadApp().window;
  w.applyEngagement(obj); w.ensureCosts();
  return w;
}
function fixpoint(obj) {
  const w = applied(obj);
  const A = w.gatherEngagement();
  w.applyEngagement(A); w.ensureCosts();
  const B = w.gatherEngagement();
  return [A, B, diff(A, B)];
}
const norm = s => (s || '').replace(/\s+/g, ' ').trim();
const txt = (w, id) => norm(w.document.getElementById(id)?.textContent);
function compute(obj) {
  const w = applied(obj); w.renderROI(); w.renderCost();
  return { kpi: txt(w, 'kpi-grid'), walkdown: txt(w, 'nrv-walkdown-body'),
           cost: txt(w, 'cost-tbody') + ' || ' + txt(w, 'cost-tfoot') };
}

(async () => {
  console.log('\n── Harness ──');
  {
    const { window, errors } = loadApp();
    ok('index.html loads headless with zero jsdom errors', errors.length === 0, `${errors.length} errors`);
    ok('save/load/calc functions reachable',
      ['applyEngagement','gatherEngagement','calcNRV','calcSc','ensureCosts','renderROI','migrateEngagement'].every(f => typeof window[f] === 'function'));
  }

  console.log('\n── v1 backward compatibility (must hold every chunk) ──');
  {
    const v1 = readJSON(V1);
    ok('v1 sample file on disk is still _version 1 (real v1 artifact)', v1._version === 1);
    const [A, , d] = fixpoint(v1);
    ok('v1 sample loads + round-trips losslessly (fixpoint)', d === null, d || '');
    ok('v1 sample migrates to _version 2 on save', A._version === 2);
    const base = readJSON(BASE), now = compute(v1);
    ok('v1 compute UNCHANGED vs pre-edit baseline (kpi)', now.kpi === base.kpi, now.kpi === base.kpi ? '' : now.kpi.slice(0,80));
    ok('v1 compute UNCHANGED vs pre-edit baseline (walkdown)', now.walkdown === base.walkdown);
    ok('v1 cost table UNCHANGED vs pre-edit baseline', now.cost === base.cost, now.cost === base.cost ? '' : now.cost.slice(0,80));
  }

  console.log('\n── Chunk 1: envelope v2 + migration shim + nrvOverrides fix ──');
  {
    const w = loadApp().window;
    const m = w.migrateEngagement({ _type: 'strategic-value-engagement', _version: 1 });
    ok('migration fills additive v2 defaults', Array.isArray(m.technologies) && Array.isArray(m.dedup)
       && m.overlay && m._provenance && m.annotations && m.nrvOverrides && m.mode === 'analyst');
  }
  {
    const v1 = readJSON(V1);
    v1.nrvOverrides = { 'RET-01': { profile: 'hardware', access: 'infra', h: 0.2 } };
    const g = applied(v1).gatherEngagement();
    ok('nrvOverrides round-trips through Save', diff(g.nrvOverrides, v1.nrvOverrides) === null, JSON.stringify(g.nrvOverrides));
  }
  {
    ok('mode defaults to analyst', fixpoint(readJSON(V1))[0].mode === 'analyst');
    const cust = readJSON(V1); cust.mode = 'customer';
    ok('mode:"customer" round-trips', applied(cust).gatherEngagement().mode === 'customer');
  }

  console.log('\n── Chunk 2: technologies block + technology-driven copy ──');
  {
    const g = applied(readJSON(V2)).gatherEngagement();
    ok('technologies[] round-trips (3 techs)', g.technologies.map(t => t.id).join(',') === 'rfid,mv,platform', g.technologies.map(t=>t.id).join(','));
    ok('costRows[].technologyId survives Save', g.costRows.filter(r => r.technologyId).length === 6);
  }
  {
    ok('techScopeLabel() falls back to "RFID" with no technologies', applied(readJSON(V1)).techScopeLabel() === 'RFID');
    ok('techScopeLabel() reflects the declared stack',
       applied(readJSON(V2)).techScopeLabel() === 'RFID, Machine Vision & Software Platform');
  }
  {
    const w2 = applied(readJSON(V2)); w2.renderCost();
    const cost2 = txt(w2, 'cost-tbody');
    ok('v2 cost table shows per-technology section headers',
       /RFID/.test(cost2) && /MACHINE VISION/i.test(cost2) && /SOFTWARE PLATFORM/i.test(cost2));
    const w1 = applied(readJSON(V1)); w1.renderCost();
    ok('v1 cost table has NO technology headers', !/cost-tech-header/.test(w1.document.getElementById('cost-tbody').innerHTML));
  }
  {
    const w1 = applied(readJSON(V1)); w1.renderExec();
    ok('exec subtitle names "RFID" for v1', /^Technologies in scope: RFID ·/.test(txt(w1, 'exec-sub')), txt(w1,'exec-sub').slice(0,50));
    const w2 = applied(readJSON(V2)); w2.renderExec();
    ok('exec subtitle follows the stack for v2',
       /^Technologies in scope: RFID, Machine Vision & Software Platform ·/.test(txt(w2, 'exec-sub')));
  }

  console.log('\n── Chunk 3: full-discipline custom levers + §B overlay ──');
  {
    const g = applied(readJSON(V2)).gatherEngagement();
    const c1 = g.customScenarios.find(s => s.id === 'CUSTOM-01');
    ok('custom lever evidence{confidence} round-trips', c1.evidence && c1.evidence.confidence === 'B', JSON.stringify(c1.evidence && c1.evidence.confidence));
    ok('custom lever technologyIds round-trips', Array.isArray(c1.technologyIds) && c1.technologyIds.join(',') === 'mv');
    ok('custom lever still enters calcSc (formula intact)', typeof applied(readJSON(V2)).calcSc(c1) === 'number');
    ok('overlay{} round-trips losslessly', diff(g.overlay, readJSON(V2).overlay) === null);
  }
  {
    const w = applied(readJSON(V2));
    const evC = w.leverEvidence({ id: 'CUSTOM-01', custom: true, evidence: { confidence: 'B' } });
    const evL = w.leverEvidence({ id: 'WH-01' });
    ok('leverEvidence() reads custom inline + library overlay',
       evC && evC.confidence === 'B' && evL && evL.confidence === 'A', `custom=${evC&&evC.confidence} lib=${evL&&evL.confidence}`);
  }
  {
    // §B condition: overlay + custom evidence APPEAR in the standalone export.
    const w = applied(readJSON(V2));
    const html = await exportStandalone(w);
    ok('standalone export embeds the engagement', /id="embedded-engagement"/.test(html));
    ok('export carries overlay + custom evidence', /"overlay"/.test(html) && /"confidence": "B"/.test(html) && /"technologyIds"/.test(html));
  }

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
