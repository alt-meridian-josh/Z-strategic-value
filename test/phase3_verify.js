// Phase 3 verification — mode system + sidebar identity band.
//   node test/phase3_verify.js
const fs = require('fs');
const path = require('path');
const { loadApp, ready, diff } = require('./harness.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { (cond ? pass++ : fail++); console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? '  — ' + detail : ''}`); };
const V1 = path.resolve(__dirname, '..', 'examples', 'sample_engagement.json');
const V2 = path.resolve(__dirname, 'fixtures', 'v2_multitech_warehouse.json');
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const band = w => (w.document.getElementById('mode-band')?.textContent || '').trim();

(async () => {
  console.log('\n── Phase 3: mode system + sidebar identity band ──');
  {
    const { window } = loadApp(); await ready(window);
    ok('band exists and defaults to Analyst', band(window) === 'Analyst — full edit', band(window));
  }
  {
    // Analyst engagement (v1) → band stays Analyst.
    const { window } = loadApp(); await ready(window);
    window.applyEngagement(readJSON(V1));
    ok('analyst engagement shows "Analyst — full edit"', band(window) === 'Analyst — full edit', band(window));
  }
  {
    // Customer-mode engagement → band reflects Customer view on load.
    const { window } = loadApp(); await ready(window);
    const cust = readJSON(V2); cust.mode = 'customer';
    window.applyEngagement(cust);
    ok('customer engagement shows "Customer view"', band(window) === 'Customer view', band(window));
  }
  {
    // mode round-trips through Save (re-confirm Phase 1 invariant holds here).
    const { window } = loadApp(); await ready(window);
    const cust = readJSON(V1); cust.mode = 'customer';
    window.applyEngagement(cust); window.ensureCosts();
    const g = window.gatherEngagement();
    ok('mode round-trips through Save (customer)', g.mode === 'customer', g.mode);
  }
  {
    // Start new resets the band to Analyst.
    const { window } = loadApp(); await ready(window);
    const cust = readJSON(V2); cust.mode = 'customer';
    window.applyEngagement(cust);
    window.chooseStartNew();
    ok('Start new returns the band to Analyst', band(window) === 'Analyst — full edit', band(window));
  }

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
