// Phase 23: send the completed analysis back to the account team.
// Two delivery modes behind one seam (OUTPUT_ENDPOINT): a prefilled mail draft
// when it is empty (no infrastructure, works offline, survives being handed on),
// and a POST to a hosted endpoint when it is set. Both are exercised here; the
// endpoint path is driven by injecting a fetch stub, so no network is touched.
const path = require('path');
const { loadApp, ready } = require('./harness.js');
const abs = (...p) => path.resolve(__dirname, ...p);
const readJSON = f => JSON.parse(require('fs').readFileSync(f, 'utf8'));

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log(`  [PASS] ${name}${detail ? '  — ' + detail : ''}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail ? '  — ' + detail : ''}`); }
};

// Load the app with the download stubbed, so the draft path can be asserted
// without writing files. The mailto: URL is read from buildMailDraft(), which is
// pure, rather than by intercepting navigation (jsdom will not allow that).
async function appWithCaptures() {
  const w = loadApp().window; await ready(w);
  w.applyEngagement(readJSON(abs('..', 'examples', 'healthcare_starter.json')));
  const cap = { saved: 0, posted: null, alerts: [] };
  w.alert = m => cap.alerts.push(m);
  w.saveEngagementFile = () => { cap.saved++; };
  return { w, cap };
}

(async () => {
  console.log('\n── Phase 23: send completed analysis ──\n');

  // ── 1) Config defaults: no endpoint, so the file stays self-contained.
  {
    const w = loadApp().window; await ready(w);
    ok('recipient is configured', w.eval('OUTPUT_EMAIL') === 'joshua.willis@zebra.com', w.eval('OUTPUT_EMAIL'));
    ok('no endpoint by default (self-contained)', w.eval('OUTPUT_ENDPOINT') === '');
    ok('default endpoint mode is cors', w.eval('OUTPUT_ENDPOINT_MODE') === 'cors', w.eval('OUTPUT_ENDPOINT_MODE'));
    ok('no API key shipped in the file',
       !/sk-[A-Za-z0-9]{16,}|re_[A-Za-z0-9]{16,}|Bearer\s+[A-Za-z0-9._-]{20,}/.test(
         require('fs').readFileSync(abs('..', 'index.html'), 'utf8')));
  }

  // ── 2) The UI names the real recipient.
  {
    const w = loadApp().window; await ready(w);
    w.go(5);
    ok('send button rendered on Full Analysis', !!w.document.getElementById('send-output-btn'));
    ok('recipient shown to the user',
       w.document.getElementById('send-output-to').textContent === w.eval('OUTPUT_EMAIL'),
       w.document.getElementById('send-output-to').textContent);
  }

  // ── 3) Summary carries the headline figures the note needs.
  {
    const w = loadApp().window; await ready(w);
    w.applyEngagement(readJSON(abs('..', 'examples', 'healthcare_starter.json')));
    const s = w.outputSummary();
    ok('summary names the customer', s.customer === 'Healthcare Starter (illustrative)', s.customer);
    ok('summary carries a computed NRV', s.nrv === 3670436, String(s.nrv));
    ok('summary lists every active lever', s.leverCount === 4 && s.levers.length === 4, String(s.leverCount));
    const note = w.outputNoteText(s);
    ok('note states NRV, payback and MIRR',
       /Net Realization Value:\s+\$3\.7M/.test(note) && /Payback:/.test(note) && /MIRR:/.test(note));
    ok('note lists the levers by name', note.includes('Surgical Instrument Tracking — OR Throughput'));
  }

  // ── 4) DRAFT PATH (no endpoint): saves the attachment, builds a prefilled mailto.
  {
    const { w, cap } = await appWithCaptures();
    const mode = await w.sendOutput();
    ok('draft mode used when no endpoint is set', mode === 'draft', mode);
    ok('the .json attachment is saved first', cap.saved === 1, String(cap.saved));
    ok('nothing was sent over the network', cap.posted === null);

    const href = w.buildMailDraft(w.outputSummary());
    ok('a mailto: draft is built', href.startsWith('mailto:'));
    const url = new URL(href);
    ok('addressed to the configured recipient', decodeURIComponent(url.pathname) === w.eval('OUTPUT_EMAIL'));
    const q = new URLSearchParams(url.search);
    ok('subject carries customer and date',
       /Healthcare Starter/.test(q.get('subject')) && /\d{4}-\d{2}-\d{2}/.test(q.get('subject')), q.get('subject'));
    ok('body carries the headline numbers', /Net Realization Value/.test(q.get('body')));
    ok('body tells the user to attach the saved file', /attach it before sending/i.test(q.get('body')));
  }

  // ── 5) ENDPOINT PATH: the REAL sendOutput() POSTs the payload, no draft/download.
  {
    const { w, cap } = await appWithCaptures();
    w.fetch = (u, o) => { cap.posted = { u, o }; return Promise.resolve({ ok: true, status: 200 }); };
    w.eval("OUTPUT_ENDPOINT = 'https://example.invalid/send'");
    const mode = await w.sendOutput();
    ok('endpoint mode used when an endpoint is set', mode === 'endpoint', String(mode));
    ok('POSTed to the configured endpoint',
       cap.posted && cap.posted.u === 'https://example.invalid/send' && cap.posted.o.method === 'POST');
    const body = JSON.parse(cap.posted.o.body);
    ok('payload carries summary + full engagement',
       !!body.summary && !!body.engagement && body.engagement._type === 'strategic-value-engagement');
    ok('payload names no recipient (recipient is fixed server-side, no open relay)',
       body.summary.to === undefined && body.to === undefined);
    ok('no attachment download on the endpoint path', cap.saved === 0, String(cap.saved));
    ok('user is told it was sent', cap.alerts.some(a => /sent to/i.test(a)), cap.alerts[0]);
  }

  // ── 5c) OPAQUE mode (Power Automate / Logic Apps): the flow returns no CORS
  // headers, so the POST must be a CORS "simple request" (text/plain, no-cors) or
  // the preflight blocks it and the flow never runs. The response is opaque, so
  // res.ok is meaningless here — checking it would open a draft on every
  // successful send, delivering twice.
  {
    const { w, cap } = await appWithCaptures();
    // An opaque response: status 0, ok false — exactly what no-cors yields.
    w.fetch = (u, o) => { cap.posted = { u, o }; return Promise.resolve({ ok: false, status: 0, type: 'opaque' }); };
    w.eval("OUTPUT_ENDPOINT = 'https://prod-00.westus.logic.azure.com/workflows/abc/triggers/manual/paths/invoke'");
    w.eval("OUTPUT_ENDPOINT_MODE = 'opaque'");
    const mode = await w.sendOutput();
    ok('opaque endpoint reports a send', mode === 'endpoint', String(mode));
    ok('no draft opened despite an opaque (ok:false) response', cap.saved === 0, String(cap.saved));
    ok('sent as no-cors so no preflight blocks the flow', cap.posted.o.mode === 'no-cors', String(cap.posted.o.mode));
    ok('Content-Type is text/plain (a CORS simple request)',
       cap.posted.o.headers['Content-Type'] === 'text/plain', cap.posted.o.headers['Content-Type']);
    const body = JSON.parse(cap.posted.o.body);
    ok('payload is still the full summary + engagement', !!body.summary && !!body.engagement);
    ok('user is told delivery cannot be confirmed',
       cap.alerts.some(a => /cannot be confirmed/i.test(a)), cap.alerts[0]);
  }

  // ── 5d) Opaque mode still falls back when the request itself cannot be made.
  {
    const { w, cap } = await appWithCaptures();
    w.fetch = () => Promise.reject(new Error('DNS failure'));
    w.eval("OUTPUT_ENDPOINT = 'https://prod-00.westus.logic.azure.com/x'");
    w.eval("OUTPUT_ENDPOINT_MODE = 'opaque'");
    const mode = await w.sendOutput();
    ok('unreachable opaque endpoint falls back to a draft', mode === 'draft', String(mode));
    ok('fallback saves the attachment', cap.saved === 1, String(cap.saved));
  }

  // ── 5b) A DEAD endpoint falls back to the draft rather than losing the analysis.
  {
    const { w, cap } = await appWithCaptures();
    w.fetch = () => Promise.reject(new Error('endpoint down'));
    w.eval("OUTPUT_ENDPOINT = 'https://example.invalid/send'");
    const mode = await w.sendOutput();
    ok('dead endpoint falls back to the draft', mode === 'draft', String(mode));
    ok('fallback still saves the attachment', cap.saved === 1, String(cap.saved));
    ok('user is not told it was sent', !cap.alerts.some(a => /sent to/i.test(a)));
  }

  // ── 6) A dead network must not strand the user — the draft path still delivers.
  {
    const { w, cap } = await appWithCaptures();
    w.fetch = () => Promise.reject(new Error('network down'));
    const mode = await w.sendOutput();
    ok('still delivers when the network is down', mode === 'draft', mode);
    ok('attachment still saved with no network', cap.saved === 1, String(cap.saved));
    ok('draft still builds with no network', w.buildMailDraft(w.outputSummary()).startsWith('mailto:'));
  }

  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
