// Phase 18 verification — customer-view UX, Chunk 3: strip objection-handler
// coaching from customer-mode exports. The AI prompt omits both the discovery
// script and the objection handler in customer mode; the PPTX deck drops its
// "HANDLING OBJECTIONS" row. Analyst exports are unchanged. (The PDF appraisal
// never embedded the objection handler, so there is nothing to strip there.)
//   node test/phase18_verify.js
const fs = require('fs');
const path = require('path');
const { loadApp, ready } = require('./harness.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { (cond ? pass++ : fail++); console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? '  — ' + detail : ''}`); };
const abs = (...p) => path.resolve(__dirname, ...p);
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const V1 = abs('..', 'examples', 'sample_engagement.json');
const INDEX = abs('..', 'index.html');

const CHALLENGE = 'When the customer questions headcount reduction';   // RET-01 sc.challenge
const stubClip = w => w.eval("Object.defineProperty(navigator,'clipboard',{value:{writeText:function(t){window.__copied=t;return Promise.resolve();}},configurable:true})");
const grabPrompt = (w, mode) => { w.eval(`appMode='${mode}'; window.__copied=''`); w.exportLLMPrompt(); return w.eval('window.__copied') || ''; };

(async () => {
  console.log('\n── Chunk 3: strip objection coaching from customer-mode exports ──');

  // ── 1) AI PROMPT (exportLLMPrompt) — runtime capture via clipboard stub.
  {
    const w = loadApp().window; await ready(w);
    w.applyEngagement(readJSON(V1)); w.ensureCosts(); stubClip(w);

    const an = grabPrompt(w, 'analyst');
    ok('analyst AI prompt includes the Objection Handler', an.includes('Objection Handler:') && an.includes(CHALLENGE));
    ok('analyst AI prompt includes the Discovery Questions', an.includes('Discovery Questions:'));

    const cu = grabPrompt(w, 'customer');
    ok('customer AI prompt omits the Objection Handler', !cu.includes('Objection Handler:') && !cu.includes(CHALLENGE));
    ok('customer AI prompt omits the Discovery Questions', !cu.includes('Discovery Questions:'));
    ok('customer AI prompt still has the scenario + financials', cu.includes('Input Parameters Used:') && cu.includes('Evidence IDs:') && cu.includes('KEY FINANCIAL KPIs'));
  }

  // ── 2) PPTX deck — selling tips removed from ALL exports (source-level guard;
  //    PptxGenJS can't run headlessly). The objection-handler row is gone entirely.
  {
    const src = fs.readFileSync(INDEX, 'utf8');
    ok('PPTX deck no longer renders a HANDLING OBJECTIONS row in any mode',
       !/HANDLING OBJECTIONS/.test(src));
    ok('PPTX deck still renders HOW IT WORKS + EVIDENCE BASIS rows',
       /label:'HOW IT WORKS'/.test(src) && /label:'EVIDENCE BASIS'/.test(src));
  }

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
