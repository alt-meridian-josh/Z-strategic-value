// Phase 6 verification — profiles are content loaded through the normal path.
// Confirms the manifest-driven chooser handles multiple bundled profiles.
//   node test/phase6_verify.js
const fs = require('fs');
const path = require('path');
const { loadApp, ready } = require('./harness.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { (cond ? pass++ : fail++); console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? '  — ' + detail : ''}`); };
const root = path.resolve(__dirname, '..');
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const val = (w, id) => w.document.getElementById(id)?.value;
const installFetch = (window) => {
  window.fetch = (u) => {
    try { const body = fs.readFileSync(path.resolve(root, String(u).replace(/^[./]+/, '')), 'utf8');
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(body)), text: () => Promise.resolve(body) }); }
    catch (e) { return Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(e), text: () => Promise.resolve('') }); }
  };
};

(async () => {
  console.log('\n── Phase 6: profiles (content, loaded through the normal path) ──');
  const manifest = readJSON(path.join(root, 'examples', 'profiles.json'));
  ok('manifest lists 3 profiles', manifest.length === 3 && manifest.includes('warehouse_starter') && manifest.includes('healthcare_starter'), manifest.join(','));

  // No customer data in any profile (benchmark-only, illustrative).
  let clean = true;
  for (const key of manifest) {
    const p = readJSON(path.join(root, 'examples', key + '.json'));
    if (!/illustrative|sample/i.test((p.engagement?.customer || '') + ' ' + (p._notice || ''))) clean = false;
  }
  ok('every profile is flagged illustrative / benchmark-only (no customer data)', clean);

  {
    // The chooser grid lists all three, grouped by vertical.
    const { window } = loadApp(); await ready(window);
    installFetch(window);
    window.chooseProfiles();
    await new Promise(r => setTimeout(r, 80));
    const grid = window.document.getElementById('entry-profiles').innerHTML;
    ok('grid lists retail + warehouse + healthcare groups', /retail/i.test(grid) && /warehouse/i.test(grid) && /healthcare/i.test(grid));
    ok('grid shows all three starter labels',
       /Zebra Apparel Co\./.test(grid) && /Warehouse \/ DC Starter/.test(grid) && /Healthcare Starter/.test(grid));
  }
  {
    // Each profile loads through the normal path and computes, with B-flagged data-status.
    for (const key of ['warehouse_starter', 'healthcare_starter']) {
      const { window } = loadApp(); await ready(window);
      installFetch(window);
      window.loadProfile(key);
      await new Promise(r => setTimeout(r, 60));
      const loadedCustomer = val(window, 'i-customer') || '';
      window.ensureCosts(); window.renderROI(); window.renderDataStatus();
      const computes = /\$/.test(window.document.getElementById('kpi-grid')?.textContent || '');
      const dataStatus = window.document.getElementById('data-status-card').style.display !== 'none';
      ok(`${key}: loads + hides chooser + computes`, /illustrative/i.test(loadedCustomer) && computes && window.document.getElementById('entry-chooser').style.display === 'none', loadedCustomer);
      ok(`${key}: B-flagged provenance surfaces in data-status`, dataStatus);
    }
  }

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
