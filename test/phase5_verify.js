// Phase 5 verification — JSON-driven rendering polish (data-status panel,
// annotations, B/C markers, technology-neutral copy, chip empty-state).
//   node test/phase5_verify.js
const fs = require('fs');
const path = require('path');
const { loadApp, ready } = require('./harness.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { (cond ? pass++ : fail++); console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? '  — ' + detail : ''}`); };
const V1 = path.resolve(__dirname, '..', 'examples', 'sample_engagement.json');
const V2 = path.resolve(__dirname, 'fixtures', 'v2_multitech_warehouse.json');
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const txt = (w, id) => (w.document.getElementById(id)?.textContent || '').replace(/\s+/g, ' ').trim();
function applied(obj) { const w = loadApp().window; w.applyEngagement(obj); w.ensureCosts(); return w; }

// Count B/C provenance entries declared in a fixture.
function countBC(prov) {
  let n = 0;
  Object.values(prov || {}).forEach(fields => Object.values(fields || {}).forEach(pv => { if (pv && (pv.confidence === 'B' || pv.confidence === 'C')) n++; }));
  return n;
}

(async () => {
  console.log('\n── Phase 5: data-status panel ──');
  {
    const w = applied(readJSON(V2)); w.renderDataStatus();
    const card = w.document.getElementById('data-status-card');
    const bodyHtml = w.document.getElementById('data-status-body').innerHTML;
    const expected = countBC(readJSON(V2)._provenance);
    ok('data-status panel is shown for v2', card.style.display !== 'none');
    ok('panel header count matches the JSON B/C count exactly', new RegExp(`${expected} inputs? estimated`).test(bodyHtml), `expected ${expected}`);
    // Every declared B/C input id.key appears exactly once.
    const prov = readJSON(V2)._provenance; let allListed = true; let listedCount = 0;
    Object.entries(prov).forEach(([sc, fields]) => Object.entries(fields).forEach(([k, pv]) => {
      if (pv.confidence === 'B' || pv.confidence === 'C') {
        const occ = (bodyHtml.match(new RegExp(`${sc}\\.${k}`, 'g')) || []).length;
        listedCount++; if (occ !== 1) allListed = false;
      }
    }));
    ok('every B/C input listed exactly once (matches provenance)', allListed && listedCount === expected, `${listedCount}/${expected}`);
    ok('grouped by source/owner (source labels present)', /WMS estimate/.test(bodyHtml) && /Receiving dock logs/.test(bodyHtml) && /Benchmark/.test(bodyHtml));
    ok('A-confidence inputs are NOT flagged', !/loaded_rate/.test(bodyHtml));
    ok('annotations surfaced (engagement + lever + cost row)',
       /Multi-technology pilot/.test(bodyHtml) && /WH-02/.test(bodyHtml) && /Cost row 0/.test(bodyHtml));
  }
  {
    // v1 has no provenance/annotations → panel hidden.
    const w = applied(readJSON(V1)); w.renderDataStatus();
    ok('data-status panel hidden for v1 (no provenance/annotations)', w.document.getElementById('data-status-card').style.display === 'none');
  }

  console.log('\n── Phase 5: B/C markers + technology-neutral copy ──');
  {
    const w = applied(readJSON(V2)); w.renderROI();
    const wk = w.document.getElementById('nrv-walkdown-body').innerHTML;
    ok('walkdown marks B/C levers (overlay + custom evidence)', /\[B\]/.test(wk) && /\[C\]/.test(wk));
  }
  {
    const w2 = applied(readJSON(V2)); w2.renderExec();
    const n2 = txt(w2, 'exec-narrative');
    ok('v2 narrative names the full stack (technology-neutral framing)', /Machine Vision/.test(n2) && /Software Platform/.test(n2));
    ok('v2 narrative delivery framing not hard-wired to bare RFID', !/deploying RFID delivers/.test(n2) && !/Zebra RFID Technology/.test(n2));
    const w1 = applied(readJSON(V1)); w1.renderExec();
    const n1 = txt(w1, 'exec-narrative');
    ok('v1 narrative still reads RFID (fallback)', /deploying RFID delivers/.test(n1));
  }

  console.log('\n── Phase 5: no blank lever grid on a chip with no library ──');
  {
    const { window } = loadApp(); await ready(window);
    window.chooseStartNew();              // clears industries + selection
    window.renderLeverGrid();
    const grid = window.document.getElementById('lever-grid').innerHTML;
    ok('empty selection shows a badge, not a blank grid', /custom levers \/ profile only/.test(grid));
  }

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
