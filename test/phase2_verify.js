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

  console.log('\n── Phase 2 chunk 2: profile grid (manifest-driven) ──');
  // jsdom has no fetch; serve local examples/ files (mirrors browser fetch on the hosted site).
  const root = path.resolve(__dirname, '..');
  const installFetch = (window) => {
    window.fetch = (u) => {
      try {
        const full = path.resolve(root, String(u).replace(/^[./]+/, ''));
        const body = fs.readFileSync(full, 'utf8');
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(body)), text: () => Promise.resolve(body) });
      } catch (e) { return Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(e), text: () => Promise.resolve('') }); }
    };
  };
  {
    const { window } = loadApp(); await ready(window);
    installFetch(window);
    window.chooseProfiles();
    await new Promise(r => setTimeout(r, 50));
    const grid = window.document.getElementById('entry-profiles');
    ok('profiles door reveals the grid', grid.style.display === 'block');
    ok('grid lists the sample profile with its _label', /Zebra Apparel Co\./.test(grid.innerHTML));
    ok('grid shows the profile _notice (one-line description)', /Illustrative sample/.test(grid.innerHTML));
    ok('grid groups by vertical (retail)', /retail/i.test(grid.innerHTML));
  }
  {
    // Selecting a profile loads it through the normal path and enters the flow.
    const { window } = loadApp(); await ready(window);
    installFetch(window);
    window.loadProfile('sample_engagement');
    await new Promise(r => setTimeout(r, 50));
    ok('selecting a profile hides the chooser', disp(window, 'entry-chooser') === 'none');
    ok('selecting a profile loads the engagement', /Zebra Apparel Co\./.test(val(window, 'i-customer') || ''), val(window,'i-customer'));
    window.ensureCosts(); window.renderROI();
    ok('profile engagement computes (kpi-grid)', /\$/.test(window.document.getElementById('kpi-grid')?.textContent || ''));
  }
  {
    // Graceful degrade when fetch is unavailable (e.g. file://): no blank grid.
    const { window } = loadApp(); await ready(window);
    try { delete window.fetch; } catch (e) {}
    window.chooseProfiles();
    await new Promise(r => setTimeout(r, 50));
    const grid = window.document.getElementById('entry-profiles');
    ok('no-fetch: grid degrades to an "Open a JSON" message (not blank)', /Open a JSON/.test(grid.innerHTML));
  }
  {
    // ?example= bypasses the chooser and auto-loads (fetch installed before init).
    const { window, errors } = loadApp({
      url: 'file:///home/user/Z-strategic-value/index.html?example=sample_engagement',
      beforeParse: installFetch,
    });
    await ready(window);
    await new Promise(r => setTimeout(r, 50));
    ok('?example bypasses the chooser', disp(window, 'entry-chooser') !== 'block', String(disp(window,'entry-chooser')));
    ok('?example auto-loads the engagement', /Zebra Apparel Co\./.test(val(window, 'i-customer') || ''), val(window,'i-customer'));
  }

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
