// Phase 16 verification — customer-view UX, Chunk 1: boot landing.
// A customer opening the exported tool lands on Discovery Inputs (Step 3 →
// panel index 2) so they can re-enter their own numbers immediately. Analyst
// boots are unchanged (Engagement Setup, panel-0). Non-embedded sessions never
// auto-navigate.
//   node test/phase16_verify.js
const fs = require('fs');
const path = require('path');
const { loadApp, ready } = require('./harness.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { (cond ? pass++ : fail++); console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? '  — ' + detail : ''}`); };
const abs = (...p) => path.resolve(__dirname, ...p);
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const V1 = abs('..', 'examples', 'sample_engagement.json');
const INDEX = abs('..', 'index.html');

const active = (w, id) => w.document.getElementById(id).classList.contains('active');

// Inject an embedded-engagement block exactly like _buildStandalone does (before the
// LAST </body>), so the real boot path (checkEmbeddedEngagement + applyBootLanding) runs.
function embed(baseHtml, data) {
  const json = JSON.stringify(data).replace(/<\//g, '<\\/');
  const block = '<script type="application/json" id="embedded-engagement">\n' + json + '\n</script>\n';
  const idx = baseHtml.toLowerCase().lastIndexOf('</body>');
  return baseHtml.slice(0, idx) + block + baseHtml.slice(idx);
}

(async () => {
  console.log('\n── Chunk 1: customer view boots to Discovery Inputs ──');
  const baseHtml = fs.readFileSync(INDEX, 'utf8');

  // Build a realistic customer engagement object from the v1 sample.
  const wsrc = loadApp().window; await ready(wsrc);
  wsrc.applyEngagement(readJSON(V1)); wsrc.ensureCosts();
  const customerData = wsrc.gatherEngagement(); customerData.mode = 'customer';
  const analystData = wsrc.gatherEngagement(); analystData.mode = 'analyst';

  // ── 1) UNIT: applyBootLanding only navigates for embedded customer sessions.
  {
    const w = loadApp().window; await ready(w);
    ok('default boot sits on Engagement Setup (panel-0)', active(w, 'panel-0'));
    w.eval("appMode='customer'"); w.applyBootLanding(true);
    ok('embedded customer → lands on Discovery Inputs (panel-2)', active(w, 'panel-2'));
    ok('embedded customer → leaves Engagement Setup', !active(w, 'panel-0'));
  }
  {
    const w = loadApp().window; await ready(w);
    w.eval("appMode='analyst'"); w.applyBootLanding(true);
    ok('embedded analyst → stays on Engagement Setup (panel-0)', active(w, 'panel-0') && !active(w, 'panel-2'));
  }
  {
    const w = loadApp().window; await ready(w);
    w.eval("appMode='customer'"); w.applyBootLanding(false);   // not embedded (live analyst session)
    ok('non-embedded customer → does NOT auto-navigate', active(w, 'panel-0') && !active(w, 'panel-2'));
  }

  // ── 2) END-TO-END: a reopened customer file lands on Discovery Inputs.
  {
    const wc = loadApp({ html: embed(baseHtml, customerData) }).window; await ready(wc);
    ok('reopened file is in customer mode', wc.eval('appMode') === 'customer');
    ok('reopened customer file lands on Discovery Inputs (panel-2)', active(wc, 'panel-2'), 'panel-0=' + active(wc, 'panel-0'));
    ok('reopened customer file is NOT on Engagement Setup', !active(wc, 'panel-0'));
  }

  // ── 3) END-TO-END: a reopened ANALYST file is unchanged (Engagement Setup).
  {
    const wa = loadApp({ html: embed(baseHtml, analystData) }).window; await ready(wa);
    ok('reopened analyst file is in analyst mode', wa.eval('appMode') === 'analyst');
    ok('reopened analyst file stays on Engagement Setup (panel-0)', active(wa, 'panel-0') && !active(wa, 'panel-2'));
  }

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
