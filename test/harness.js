// Headless harness: loads the REAL index.html in jsdom with external (CDN)
// subresources blocked, so no network is touched. Inline scripts run, so the
// actual app functions (applyEngagement / gatherEngagement / calcNRV / calcSc)
// are exercised — not a reimplementation. Top-level `function` declarations are
// hoisted onto window even if some on-load init throws, so the functions remain
// reachable. Test-only; never shipped in index.html.
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

function loadApp({ quiet = true, html = null, url = 'file:///home/user/Z-strategic-value/index.html', beforeParse = null } = {}) {
  const htmlPath = path.resolve(__dirname, '..', 'index.html');
  if (html == null) html = fs.readFileSync(htmlPath, 'utf8');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(e.message || String(e)));
  if (!quiet) vc.sendTo(console);

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',   // run inline scripts
    resources: undefined,        // do NOT fetch external <script src> -> offline
    pretendToBeVisual: true,
    url,
    virtualConsole: vc,
    beforeParse(window) { if (typeof beforeParse === 'function') beforeParse(window); },
  });
  return { dom, window: dom.window, errors };
}

// Resolve once the document's DOMContentLoaded init has had a chance to run
// (that is where a standalone export auto-applies its embedded engagement).
function ready(window) {
  return new Promise(resolve => {
    if (window.document.readyState === 'complete') return resolve();
    window.addEventListener('load', () => resolve());
    setTimeout(resolve, 200); // fallback so the harness never hangs
  });
}

// Deep-equal that ignores volatile/derived keys (e.g. _label is a timestamp
// regenerated every save). Returns the first differing path, or null if equal.
function diff(a, b, ignore = new Set(['_label']), p = '') {
  if (a === b) return null;
  if (typeof a !== typeof b) return `${p}: type ${typeof a} != ${typeof b}`;
  if (a && b && typeof a === 'object') {
    const ka = Object.keys(a).filter(k => !ignore.has(k));
    const kb = Object.keys(b).filter(k => !ignore.has(k));
    if (ka.length !== kb.length) return `${p}: keys [${ka}] != [${kb}]`;
    for (const k of ka) {
      const d = diff(a[k], b[k], ignore, p ? `${p}.${k}` : k);
      if (d) return d;
    }
    return null;
  }
  // numbers: tolerate float noise
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 1e-9 ? null : `${p}: ${a} != ${b}`;
  }
  return `${p}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`;
}

// Drive the real exportStandaloneHTML() offline and capture the produced HTML.
// jsdom has no fetch, so the export's fetch(location.href)/CDN fetches throw and
// hit the documented fallbacks; we intercept URL.createObjectURL to grab the Blob.
async function exportStandalone(window) {
  let captured = null;
  const realCreate = window.URL.createObjectURL;
  window.URL.createObjectURL = (blob) => { captured = blob; return 'blob:captured'; };
  try { await window.exportStandaloneHTML(); }
  finally { window.URL.createObjectURL = realCreate; }
  if (!captured) throw new Error('no blob captured from exportStandaloneHTML');
  return await captured.text();
}

module.exports = { loadApp, diff, exportStandalone, ready };
