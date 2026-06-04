// Phase 2 verification — entry chooser (three doors). Drives the real index.html
// in jsdom, letting the natural DOMContentLoaded init run so the chooser gating
// fires.  node test/phase2_verify.js
const fs = require('fs');
const path = require('path');
const { loadApp, exportStandalone, ready } = require('./harness.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { (cond ? pass++ : fail++); console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? '  — ' + detail : ''}`); };
const disp = (w, id) => w.getComputedStyle ? (w.document.getElementById(id)?.style.display) : null;
const val = (w, id) => w.document.getElementById(id)?.value;
const V2 = path.resolve(__dirname, 'fixtures', 'v2_multitech_warehouse.json');
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));

(async () => {
  console.log('\n── Phase 2 chunk 1: chooser shell + gating + Start new + Open JSON ──');
  {
    const { window, errors } = loadApp();
    await ready(window);
    ok('bare load: zero jsdom errors', errors.length === 0, `${errors.length}`);
    ok('chooser functions reachable',
       ['showChooser','hideChooser','chooseStartNew','chooseOpenJson','chooseProfiles','clearEngagement'].every(f => typeof window[f] === 'function'));
    ok('bare load shows the entry chooser', disp(window, 'entry-chooser') === 'block', String(disp(window,'entry-chooser')));
  }
  {
    // Start new → blank engagement, chooser hidden, lands on Step 1 (panel-0).
    const { window } = loadApp(); await ready(window);
    window.chooseStartNew();
    ok('Start new hides the chooser', disp(window, 'entry-chooser') === 'none');
    ok('Start new blanks the customer identity', (val(window, 'i-customer') || '') === '', JSON.stringify(val(window,'i-customer')));
    ok('Start new clears lever selection', window.gatherEngagement().selectedIds.length === 0);
    ok('Start new lands on Step 1 (panel-0 active)', window.document.getElementById('panel-0').classList.contains('active'));
  }
  {
    // Open a JSON → importing a file dismisses the chooser and loads the engagement.
    const { window } = loadApp(); await ready(window);
    ok('chooser visible before import', disp(window, 'entry-chooser') === 'block');
    const json = JSON.stringify(readJSON(V2));
    const file = new window.File([json], 'eng.json', { type: 'application/json' });
    window.importEngagementFile(file);
    await new Promise(r => setTimeout(r, 50)); // FileReader is async
    ok('Open-a-JSON import hides the chooser', disp(window, 'entry-chooser') === 'none');
    ok('Open-a-JSON import loads the engagement', /Acme Distribution/.test(val(window, 'i-customer') || ''), val(window,'i-customer'));
  }
  {
    // Embedded engagement (a standalone export) BYPASSES the chooser.
    const seed = loadApp().window; seed.applyEngagement(readJSON(V2)); seed.ensureCosts();
    const html = await exportStandalone(seed);
    const { window } = loadApp({ html }); await ready(window);
    ok('embedded-engagement export bypasses the chooser', disp(window, 'entry-chooser') !== 'block', String(disp(window,'entry-chooser')));
    ok('embedded-engagement export auto-loads', /Acme Distribution/.test(val(window, 'i-customer') || ''), val(window,'i-customer'));
  }

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
