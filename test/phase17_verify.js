// Phase 17 verification — customer-view UX, Chunk 2: strip seller coaching from
// the on-screen customer pages. In customer mode the "Customer Challenge"
// objection-handler and the discovery-question script are suppressed on the
// Discovery Inputs accordion AND the Step-5 ROI per-scenario snapshot. Analyst
// mode is unchanged. The customer still keeps the input table and the one-liner.
//   node test/phase17_verify.js
const fs = require('fs');
const path = require('path');
const { loadApp, ready } = require('./harness.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { (cond ? pass++ : fail++); console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? '  — ' + detail : ''}`); };
const abs = (...p) => path.resolve(__dirname, ...p);
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const V1 = abs('..', 'examples', 'sample_engagement.json');

const CHALLENGE = 'When the customer questions headcount reduction';   // RET-01 sc.challenge
const DISCOVERY = 'How many SKU-location combinations exist';          // RET-01 discoveryQuestions[0]
const ONELINER  = 'Cut cycle-count labor';                            // RET-01 oneLiner (kept)

(async () => {
  console.log('\n── Chunk 2: strip seller coaching from on-screen customer pages ──');

  // ── 1) DISCOVERY INPUTS accordion (renderDisc).
  {
    const w = loadApp().window; await ready(w);
    w.applyEngagement(readJSON(V1)); w.ensureCosts();

    w.eval("appMode='analyst'"); w.renderDisc();
    const an = w.document.getElementById('disc-accordion').innerHTML;
    ok('analyst: Discovery shows the Customer Challenge box', an.includes(CHALLENGE) && an.includes('challenge-box'));
    ok('analyst: Discovery shows the discovery questions', an.includes(DISCOVERY));
    ok('analyst: Discovery shows the input table', /total_sku_locations/.test(an));

    w.eval("appMode='customer'"); w.renderDisc();
    const cu = w.document.getElementById('disc-accordion').innerHTML;
    ok('customer: Challenge box suppressed', !cu.includes(CHALLENGE) && !cu.includes('challenge-box') && !cu.includes('Customer Challenge'));
    ok('customer: discovery questions suppressed', !cu.includes(DISCOVERY));
    ok('customer: input table still present (can re-enter numbers)', /total_sku_locations/.test(cu));
  }

  // ── 2) STEP-5 ROI per-scenario snapshot (renderROI → vtbl-body).
  {
    const w = loadApp().window; await ready(w);
    w.applyEngagement(readJSON(V1)); w.ensureCosts();

    w.eval("appMode='analyst'"); w.renderROI();
    const an = w.document.getElementById('vtbl-body').innerHTML;
    ok('analyst: ROI snapshot shows the challenge', an.includes(CHALLENGE) && an.includes('sc-snap-challenge'));
    ok('analyst: ROI snapshot shows the one-liner', an.includes(ONELINER));

    w.eval("appMode='customer'"); w.renderROI();
    const cu = w.document.getElementById('vtbl-body').innerHTML;
    ok('customer: ROI snapshot challenge suppressed', !cu.includes(CHALLENGE) && !cu.includes('sc-snap-challenge'));
    ok('customer: ROI snapshot one-liner kept', cu.includes(ONELINER));
  }

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
