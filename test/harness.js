// Headless harness: loads the REAL index.html in jsdom with external (CDN)
// subresources blocked, so no network is touched. Inline scripts run, so the
// actual app functions (applyEngagement / gatherEngagement / calcNRV / calcSc)
// are exercised — not a reimplementation. Top-level `function` declarations are
// hoisted onto window even if some on-load init throws, so the functions remain
// reachable. Test-only; never shipped in index.html.
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

function loadApp({ quiet = true } = {}) {
  const htmlPath = path.resolve(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(e.message || String(e)));
  if (!quiet) vc.sendTo(console);

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',   // run inline scripts
    resources: undefined,        // do NOT fetch external <script src> -> offline
    pretendToBeVisual: true,
    url: 'file:///home/user/Z-strategic-value/index.html',
    virtualConsole: vc,
  });
  return { dom, window: dom.window, errors };
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

module.exports = { loadApp, diff };
