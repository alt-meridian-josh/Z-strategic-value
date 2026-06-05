// Phase 1 verification runner. Grows one section per chunk. Drives the real
// index.html in jsdom (offline) and asserts behavior with evidence, not claims.
//   node test/phase1_verify.js
const fs = require('fs');
const path = require('path');
const { loadApp, diff, exportStandalone, ready } = require('./harness.js');

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

  console.log('\n── Chunk 1: envelope v2 + migration shim + nrvOverrides deprecated-ignored ──');
  {
    const w = loadApp().window;
    const m = w.migrateEngagement({ _type: 'strategic-value-engagement', _version: 1 });
    // Reason (Chunk 1): the dead secondary-NRV stack that read nrvOverrides was
    // removed, so migration no longer fills the key — it must NOT be present.
    ok('migration fills additive v2 defaults (no nrvOverrides)', Array.isArray(m.technologies) && Array.isArray(m.dedup)
       && m.overlay && m._provenance && m.annotations && !('nrvOverrides' in m) && m.mode === 'analyst');
  }
  {
    // Reason (Chunk 1): an old JSON carrying nrvOverrides must load without error
    // (tolerated) but the key is never read, normalized, or re-emitted on Save.
    const v1 = readJSON(V1);
    v1.nrvOverrides = { 'RET-01': { profile: 'hardware', access: 'infra', h: 0.2 } };
    const g = applied(v1).gatherEngagement();
    ok('nrvOverrides tolerated on load, dropped on Save', !('nrvOverrides' in g), JSON.stringify(g.nrvOverrides));
  }
  {
    ok('mode defaults to analyst', fixpoint(readJSON(V1))[0].mode === 'analyst');
    const cust = readJSON(V1); cust.mode = 'customer';
    ok('mode:"customer" round-trips', applied(cust).gatherEngagement().mode === 'customer');
  }
  {
    // Payback correctness (Chunk 1): payback is DISCOUNTED — first month cumulative
    // discounted NCF crosses zero — never investment ÷ first-year benefit.
    const w1 = applied(readJSON(V1)); w1.renderROI();
    const r1 = w1.eval('state.nrvResult');
    // v1 sample: cumulative discounted NCF ends negative (NPV -452,391) → never
    // crosses → payback is null (renders "—"), undiscounted method would too.
    ok('discounted payback: v1 never crosses → null', r1.paybackMo === null, String(r1.paybackMo));

    const w2 = applied(readJSON(V2)); w2.renderROI();
    const r2 = w2.eval('state.nrvResult');
    // v2 multitech: discounted crossing in yr1 (frac 0.9965) → 12.0 mo. The old
    // undiscounted method returned 11; discounted must lag (>=) undiscounted.
    ok('discounted payback: v2 multitech = 12.0 mo (was 11 undiscounted)', r2.paybackMo === 12, String(r2.paybackMo));
    // Independent check: recompute cumulative-discounted crossing and match calcNRV.
    let cum = -r2.capex, mo = null;
    for (let t = 0; t < r2.yearlyData.length; t++) {
      const prev = cum; cum += r2.yearlyData[t].discounted;
      if (prev < 0 && cum >= 0) { mo = Math.round((t + (-prev/(cum-prev))) * 12 * 10)/10; break; }
    }
    ok('discounted payback matches independent recompute', mo === r2.paybackMo, `recompute=${mo} calcNRV=${r2.paybackMo}`);
  }
  {
    // Unified discounting surface (Chunk 3): the Y3 walkdown chain must reconcile
    // to calcNRV's Y3 netBenefit to the dollar — Σ(after finance credit) + decay.
    const recon = id => {
      const w = applied(readJSON(id)); w.renderROI();
      return w.eval(`(function(){
        const active = SCENARIOS.filter(s=>state.selectedIds.has(s.id)).concat((state.customScenarios||[]).filter(s=>s.active));
        let sum=0; active.forEach(sc=>{const ann=Math.max(0,calcSc(sc)),tier=sc.accessibilityTier||'configured';
          sum+=ann*RAMP[sc.rampType].y[2]*ACCESS_TIER[tier][2]*overlapFactor(sc)*financeCreditFactor(sc);});
        const r=state.nrvResult; return Math.abs((sum+r.yearlyData[2].decayAvoided)-r.yearlyData[2].netBenefit);
      })()`);
    };
    ok('Y3 walkdown reconciles to calcNRV netBenefit — v1', recon(V1) < 1e-6, String(recon(V1)));
    ok('Y3 walkdown reconciles to calcNRV netBenefit — v2', recon(V2) < 1e-6, String(recon(V2)));
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
    // Chunk 5: registryId/registryVersion round-trip + walkdown tag.
    ok('custom lever registryId/Version round-trip', c1.registryId === 'REG-MV-RECV-014' && c1.registryVersion === 'v2', `${c1.registryId} ${c1.registryVersion}`);
    {
      const w = applied(readJSON(V2)); w.renderROI();
      const wd = w.document.getElementById('nrv-walkdown-body').textContent.replace(/\s+/g, ' ');
      ok('walkdown renders registry tag [REG-xxx v2]', /\[REG-MV-RECV-014 v2\]/.test(wd));
      ok('walkdown renders [unregistered] when no registryId',
         (function(){ w.eval('state.customScenarios[0].registryId=undefined'); w.renderROI();
           return /\[unregistered\]/.test(w.document.getElementById('nrv-walkdown-body').textContent); })());
    }
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

  console.log('\n── Chunk 6: standalone opens offline + full acceptance ──');
  {
    // Export the v2 engagement, then OPEN the exported file in a fresh, offline
    // jsdom (external <script src> are never fetched) and confirm it auto-loads
    // and reconstructs every v2 block — load -> compute -> save -> reload -> export.
    const html = await exportStandalone(applied(readJSON(V2)));
    const { window, errors } = loadApp({ html });
    await ready(window);
    ok('exported file opens offline with zero jsdom errors', errors.length === 0, `${errors.length} errors`);
    const cust = window.document.getElementById('i-customer')?.value || '';
    ok('exported file auto-loads its embedded engagement', /Acme Distribution/.test(cust), cust);
    const g = window.gatherEngagement();
    ok('reopened engagement reconstructs all v2 blocks',
       g._version === 2 && g.technologies.length === 3 && g.dedup.length === 1
       && Object.keys(g.overlay).length === 3 && Object.keys(g._provenance).length === 3
       && !!g.annotations.engagement && g.customScenarios.length === 2);
    window.ensureCosts(); window.renderROI();
    ok('reopened engagement computes (kpi-grid rendered)', /\$/.test((window.document.getElementById('kpi-grid')?.textContent) || ''));
  }

  console.log('\n── Chunk 6: evidence citation/formulaSource render + dead-field removal ──');
  {
    const w = applied(readJSON(V2)); w.renderROI(); w.renderExec();
    const wd = w.document.getElementById('nrv-walkdown-body').textContent.replace(/\s+/g, ' ');
    ok('walkdown renders custom-lever citation', /GS1 US receiving-accuracy benchmark/.test(wd));
    ok('walkdown renders custom-lever formulaSource', /Formula: Labor-recovery/.test(wd));
    ok('walkdown renders overlay-lever citation', /Auburn RFID Lab cycle-count study/.test(wd));
    const exec = w.document.getElementById('exec-sc-body').textContent.replace(/\s+/g, ' ');
    ok('Full Analysis exec detail renders overlay citation', /Auburn RFID Lab cycle-count study/.test(exec));
    // evidenceIds on overlay/custom resolve against EVIDENCE just like library levers.
    w.eval("engagementOverlay['WH-01'].evidence.evidenceIds=['EV-WH-LABOR-01']");
    w.renderROI();
    const wd2 = w.document.getElementById('nrv-walkdown-body').innerHTML;
    ok('overlay evidenceIds resolve against EVIDENCE registry',
       /class="ev-inline"[^>]*>EV-WH-LABOR-01</.test(wd2));
    // D8: captureLabel/role removed from the fixture; loader still loads it.
    const g = w.gatherEngagement();
    ok('fixture technologies carry no captureLabel/role (D8)',
       g.technologies.every(t => !('captureLabel' in t) && !('role' in t)));
    // tolerance: a legacy JSON still carrying them loads without error.
    const legacy = readJSON(V2); legacy.technologies[0].captureLabel = 'x'; legacy.technologies[0].role = 'capture';
    ok('loader tolerates legacy captureLabel/role', applied(legacy).gatherEngagement()._version === 2);
  }
  {
    // The whole point: v1 file from before this work still loads without complaint.
    const v1 = readJSON(V1);
    const [, , d] = fixpoint(v1);
    const base = readJSON(BASE), now = compute(v1);
    ok('ACCEPTANCE: v1 file loads + computes UNCHANGED + round-trips',
       d === null && now.kpi === base.kpi && now.walkdown === base.walkdown && now.cost === base.cost);
  }

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
