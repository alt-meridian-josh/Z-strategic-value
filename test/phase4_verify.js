// Phase 4 verification — customer-lite export (mode + baseline, guardrails).
//   node test/phase4_verify.js
const fs = require('fs');
const path = require('path');
const { loadApp, exportStandalone, embeddedEngagement, ready, diff } = require('./harness.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { (cond ? pass++ : fail++); console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? '  — ' + detail : ''}`); };
const V2 = path.resolve(__dirname, 'fixtures', 'v2_multitech_warehouse.json');
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const band = w => (w.document.getElementById('mode-band')?.textContent || '').trim();
const val = (w, id) => w.document.getElementById(id)?.value;
const disp = (w, id) => w.document.getElementById(id)?.style.display;

function loaded(obj) { const w = loadApp().window; w.applyEngagement(obj); w.ensureCosts(); return w; }

(async () => {
  console.log('\n── Phase 4: customer-lite export (mechanism) ──');
  let customerHTML;
  {
    const w = loaded(readJSON(V2));
    customerHTML = await exportStandalone(w, 'exportCustomerHTML');
    const emb = embeddedEngagement(customerHTML);
    ok('customer export embeds mode:"customer"', emb.mode === 'customer', emb.mode);
    ok('customer export embeds a baseline snapshot', !!emb.baseline && emb.baseline.mode !== 'customer', emb.baseline ? 'present' : 'missing');
    ok('§B: customer export carries overlay + custom evidence',
       /"overlay"/.test(customerHTML) && /"confidence": "B"/.test(customerHTML));
    ok('customer export carries dedup + provenance + annotations',
       /"dedup"/.test(customerHTML) && /"_provenance"/.test(customerHTML) && /"annotations"/.test(customerHTML));
  }
  {
    // Analyst export of the SAME engagement is unaffected: analyst mode, no baseline.
    const w = loaded(readJSON(V2));
    const emb = embeddedEngagement(await exportStandalone(w, 'exportStandaloneHTML'));
    ok('analyst export stays mode:"analyst"', emb.mode === 'analyst', emb.mode);
    ok('analyst export has NO baseline snapshot', !('baseline' in emb));
  }

  console.log('\n── Phase 4: customer file opens offline + guardrails ──');
  let openErrors;
  {
    const { window, errors } = loadApp({ html: customerHTML }); await ready(window);
    openErrors = errors.length;
    ok('customer file opens offline (zero jsdom errors)', errors.length === 0, `${errors.length}`);
    ok('opens in customer mode (band)', band(window) === 'Customer view', band(window));
    ok('body has customer-mode class', window.document.body.classList.contains('customer-mode'));
    ok('Load + re-export controls are hidden (analyst-only)',
       [...window.document.querySelectorAll('.analyst-only')].every(el => window.getComputedStyle(el).display === 'none'));
    ok('Save-back hint is shown', disp(window, 'customer-save-hint') === 'inline');
    const footer = (window.document.getElementById('customer-footer')?.textContent || '');
    ok('footer shows name + date + prepared-by', /Acme Distribution/.test(footer) && /Exported \d{4}-\d{2}-\d{2}/.test(footer) && /Prepared by Joshua Willis/.test(footer), footer.slice(0,80));
  }
  {
    // Locks + bounded sliders.
    const { window } = loadApp({ html: customerHTML }); await ready(window);
    ok('identity fields are read-only', window.document.getElementById('i-customer').readOnly === true);
    const finOn = window.document.getElementById('fin-credit-on');
    ok('finance-credit toggle locked ON + disabled', finOn.value === '1' && finOn.disabled === true);
    const wacc = window.document.getElementById('nrv-wacc');
    ok('WACC slider bounded to 8–12%', +wacc.min === 0.08 && +wacc.max === 0.12, `${wacc.min}-${wacc.max}`);
    ok('lever grid is locked (no add/remove/select)', window.document.getElementById('lever-grid').classList.contains('lever-locked'));
  }
  {
    // Tweak-but-revert: reload restores the baseline exactly.
    const w1 = loadApp({ html: customerHTML }).window; await ready(w1);
    const baselineCustomer = val(w1, 'i-customer');
    w1.document.getElementById('i-customer').value = 'HACKED IN SESSION';
    // "Reload" = reopen the unchanged exported file.
    const w2 = loadApp({ html: customerHTML }).window; await ready(w2);
    ok('reload reverts in-session edits to baseline', val(w2, 'i-customer') === baselineCustomer && baselineCustomer !== 'HACKED IN SESSION', val(w2,'i-customer'));
    // In-session revertToBaseline() also restores.
    w1.revertToBaseline();
    ok('revertToBaseline() restores in-session', val(w1, 'i-customer') === baselineCustomer);
  }
  {
    // Save analysis round-trips in customer mode (so a customer can send it back).
    const { window } = loadApp({ html: customerHTML }); await ready(window);
    const g = window.gatherEngagement();
    ok('customer Save round-trips mode + baseline', g.mode === 'customer' && !!g.baseline);
  }
  {
    // Analyst export of the same engagement is unaffected by the customer export above.
    const w = loaded(readJSON(V2));
    ok('analyst session unaffected: no customer-mode class', !w.document.body.classList.contains('customer-mode'));
    ok('analyst session unaffected: identity editable', w.document.getElementById('i-customer').readOnly === false);
  }

  console.log('\n── Chunk 4: ranged inputs + field-level cost scope ──');
  {
    const cust = readJSON(path.resolve(__dirname, '..', 'examples', 'sample_engagement.json'));
    cust.mode = 'customer';
    const w = loaded(cust); w.renderDisc(); w.renderCost();
    const acc = w.document.getElementById('disc-accordion').innerHTML;
    // RET-02 osa_improvement_pct is range:[0.50,0.80] → bounded slider in customer mode
    ok('customer: ranged input renders as bounded slider',
       /ranged-slider" type="range" min="0.5" max="0.8"/.test(acc));
    ok('customer: unranged input is read-only (span, no input)',
       /<span class="mono ranged-val"/.test(acc));
    // clamp at both bounds
    const mk = v => ({ value: v, type: 'number', classList: { add() {} }, parentElement: { querySelector() { return null; } } });
    w.updateInput('RET-02', 'osa_improvement_pct', mk(0.95));
    ok('clamp above max → 0.80', w.eval("state.inputs['RET-02'].osa_improvement_pct") === 0.8);
    w.updateInput('RET-02', 'osa_improvement_pct', mk(0.10));
    ok('clamp below min → 0.50', w.eval("state.inputs['RET-02'].osa_improvement_pct") === 0.5);
    // field-level cost lock
    const cost = w.document.getElementById('cost-tbody').innerHTML;
    ok('cost label is locked (.cost-lock)', /class="editable-input cost-lock"/.test(cost));
    ok('cost qty/unit values stay editable (no .cost-lock)',
       /class="editable-input num-input" value="[^"]*" style="width:55px"/.test(cost) &&
       /class="editable-input num-input" value="[^"]*" style="width:70px"/.test(cost));
    ok('row-remove control marked .cost-remove (CSS-hidden in customer mode)', /class="cost-remove"/.test(cost));
    // analyst mode: editable number + bounded hint
    const a = readJSON(path.resolve(__dirname, '..', 'examples', 'sample_engagement.json'));
    const wa = loaded(a); wa.renderDisc();
    ok('analyst: ranged input editable number with bounded hint',
       /bounded 50.0%–80.0%/.test(wa.document.getElementById('disc-accordion').innerHTML));
  }

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
