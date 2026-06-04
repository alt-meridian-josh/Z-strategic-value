// Generates benchmark-only vertical starter profiles by driving the real app
// (so they sit on the save/load fixpoint and carry library-default inputs), then
// flags every input as confidence "B" (published benchmark, confirm with customer).
// Content, not code — these are plain files under examples/. No customer data.
const fs = require('fs');
const path = require('path');
const { loadApp, diff } = require('./harness.js');

const starters = [
  {
    key: 'warehouse_starter',
    vertical: 'warehouse',
    selected: ['WH-01', 'WH-02', 'WH-03', 'WH-06'],
    customer: 'Warehouse / DC Starter (illustrative)',
    title: 'RFID Warehouse Value Case — Starter',
    pain: 'Cycle-count labor, inbound receiving labor, pick errors, and outbound labor across DCs.',
    notice: 'Illustrative warehouse starter — published industry benchmarks only, not a real engagement. Confirm every input against customer data.',
  },
  {
    key: 'healthcare_starter',
    vertical: 'healthcare',
    selected: ['HC-01', 'HC-02', 'HC-05', 'HC-06'],
    customer: 'Healthcare Starter (illustrative)',
    title: 'RFID Healthcare Value Case — Starter',
    pain: 'Equipment search time, OR instrument delays, audit-prep labor, and supply expiry/stockouts.',
    notice: 'Illustrative healthcare starter — published industry benchmarks only, not a real engagement. Confirm every input against customer data.',
  },
];

let allOk = true;
for (const s of starters) {
  const seed = {
    _type: 'strategic-value-engagement', _version: 1,
    _notice: s.notice,
    engagement: { company: 'Zebra Technologies', customer: s.customer, title: s.title, sites: 5, seller: 'Joshua Willis', email: '', partners: '', pain: s.pain },
    verticals: [s.vertical],
    selectedIds: s.selected,
    financeCredit: { enabled: true, rate: 0.40 }, wacc: 0.10, contingencyRate: 0.07,
  };
  const w = loadApp().window;
  w.applyEngagement(seed); w.ensureCosts();
  const out = w.gatherEngagement();
  out._notice = s.notice;
  // Flag every input of every selected lever as benchmark confidence "B".
  out._provenance = {};
  Object.entries(out.inputs).forEach(([scId, vals]) => {
    out._provenance[scId] = {};
    Object.keys(vals).forEach(k => { out._provenance[scId][k] = { confidence: 'B', source: 'Published benchmark', needs: 'Confirm with customer data' }; });
  });

  const outPath = path.resolve(__dirname, '..', 'examples', s.key + '.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');

  // Fixpoint check.
  const w2 = loadApp().window;
  w2.applyEngagement(JSON.parse(fs.readFileSync(outPath, 'utf8'))); w2.ensureCosts();
  const A = w2.gatherEngagement();
  w2.applyEngagement(A); w2.ensureCosts();
  const d = diff(A, w2.gatherEngagement());
  console.log(`${s.key}: levers ${out.selectedIds.join(',')} | B-flagged inputs ${Object.keys(out._provenance).length} levers | fixpoint ${d === null ? 'PASS' : 'FAIL ' + d}`);
  if (d !== null) allOk = false;
}
process.exit(allOk ? 0 : 1);
