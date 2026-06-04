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

  console.log('\n── Chunk 4: dedup (Option 1 + override, named shared pool) ──');
  const throws = fn => { try { fn(); return false; } catch (e) { return e.message; } };
  {
    const g = applied(readJSON(V2)).gatherEngagement();
    ok('dedup[] round-trips losslessly', diff(g.dedup, readJSON(V2).dedup) === null);
  }
  {
    const w = loadApp().window;
    ok('validateDedup throws on shares > 100%',
       !!throws(() => w.validateDedup([{ poolId:'p', rationale:'x', members:[{leverId:'A',share:0.7},{leverId:'B',share:0.6}] }])));
    ok('validateDedup throws on missing rationale',
       !!throws(() => w.validateDedup([{ poolId:'p', members:[{leverId:'A',share:0.5}] }])));
    ok('validateDedup throws on a lever in two groups',
       !!throws(() => w.validateDedup([
         { poolId:'p1', rationale:'x', members:[{leverId:'A',share:0.5}] },
         { poolId:'p2', rationale:'y', members:[{leverId:'A',share:0.4}] }])));
    ok('validateDedup accepts a valid group (sum exactly 100%)',
       throws(() => w.validateDedup([{ poolId:'p', rationale:'x', members:[{leverId:'A',share:0.6},{leverId:'B',share:0.4}] }])) === false);
  }
  {
    const w = applied(readJSON(V2));
    ok('dedupShareFor: WH-02=0.6, CUSTOM-01=0.4, WH-06=null',
       w.dedupShareFor('WH-02') === 0.6 && w.dedupShareFor('CUSTOM-01') === 0.4 && w.dedupShareFor('WH-06') === null);
    // Exact override: a deduped hard_labor lever (fcf=1) uses share, not (1-haircut).
    const c1 = readJSON(V2).customScenarios.find(s => s.id === 'CUSTOM-01');
    const rows = w.calcDriverWalkdown(c1, {});
    const ratio = rows[2].afterHaircut / rows[2].afterAccess;
    ok('deduped lever applies SHARE (0.4), overriding its 0.10 haircut', Math.abs(ratio - 0.4) < 1e-9, ratio.toFixed(4));
    // Non-deduped library hard_labor lever keeps (1-haircut)=0.9.
    const rowsWH1 = w.calcDriverWalkdown({ id:'WH-01', rampType:'hard_labor', accessibilityTier:'configured', haircut:0.10 }, {});
    const ratio1 = rowsWH1[2].afterHaircut / rowsWH1[2].afterAccess;
    ok('non-deduped lever keeps (1 - haircut) = 0.9', Math.abs(ratio1 - 0.9) < 1e-9, ratio1.toFixed(4));
  }
  {
    // No double-counting BY CONSTRUCTION: the pool's member shares sum to <=100%.
    const pool = readJSON(V2).dedup[0];
    const sum = pool.members.reduce((s, m) => s + m.share, 0);
    ok('shared pool is credited once (member shares sum to <= 100%)', sum <= 1.0000001, `${(sum*100).toFixed(0)}%`);
    // Same lever, same ramp/access/fcf — only the overlap factor differs: a deduped
    // lever is credited LESS than it would be standalone (its 0.10 haircut => 0.9).
    const c1 = readJSON(V2).customScenarios.find(s => s.id === 'CUSTOM-01');
    const peakDe = applied(readJSON(V2)).calcDriverWalkdown(c1, {})[2].afterHaircut;
    const noDe = readJSON(V2); noDe.dedup = [];
    const peakNo = applied(noDe).calcDriverWalkdown(c1, {})[2].afterHaircut;
    ok('deduped lever is credited less than standalone (0.4 vs 0.9)',
       peakDe < peakNo && Math.abs(peakDe / peakNo - (0.4 / 0.9)) < 1e-9, `${Math.round(peakDe)} < ${Math.round(peakNo)}`);
  }
  {
    // Auditable render: rationale + split + per-row pool marker.
    const w = applied(readJSON(V2)); w.renderROI();
    const wk = w.document.getElementById('nrv-walkdown-body').innerHTML;
    ok('walkdown renders dedup rationale + split',
       /Inbound receiving labor/.test(wk) && /credit it once/.test(wk) && /WH-02 60% \/ CUSTOM-01 40%/.test(wk));
    ok('walkdown marks deduped lever rows ([pool NN%])', /\[pool 60%\]/.test(wk) && /\[pool 40%\]/.test(wk));
  }
  {
    // Hard error on load: an invalid dedup file aborts applyEngagement.
    const bad = readJSON(V2); bad.dedup = [{ poolId:'p', rationale:'x', members:[{leverId:'WH-02',share:0.8},{leverId:'CUSTOM-01',share:0.5}] }];
    const w = loadApp().window;
    ok('applyEngagement hard-errors on invalid dedup', !!throws(() => w.applyEngagement(bad)));
  }

  console.log('\n── Chunk 5: _provenance + annotations ──');
  {
    const v2 = readJSON(V2);
    const g = applied(v2).gatherEngagement();
    ok('_provenance round-trips losslessly', diff(g._provenance, v2._provenance) === null);
    ok('annotations round-trips losslessly', diff(g.annotations, v2.annotations) === null);
    ok('_provenance carries mixed A/B/C', g._provenance['WH-01'].loaded_rate.confidence === 'A'
       && g._provenance['WH-02'].hours_per_pallet_rfid.confidence === 'C');
    ok('annotations carry engagement + per-lever + per-costRow',
       !!g.annotations.engagement && !!g.annotations.levers['WH-02'] && !!g.annotations.costRows['0']);
  }
  {
    // Both appear in the standalone export (carried in embedded state).
    const html = await exportStandalone(applied(readJSON(V2)));
    ok('export carries _provenance + annotations', /"_provenance"/.test(html) && /"annotations"/.test(html));
  }
  {
    // Full v2 fixture reaches a save/load fixpoint (every v2 block now round-trips).
    const [, , d] = fixpoint(readJSON(V2));
    ok('full v2 fixture round-trips losslessly (fixpoint)', d === null, d || '');
  }

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
