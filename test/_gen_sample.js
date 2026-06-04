// One-shot generator for the v1 backage sample. Drives the REAL app to produce a
// self-consistent v1 engagement (cost rows derived by the app from retail slider
// defaults), so the shipped sample sits exactly on the save/load fixpoint and
// "loads unchanged". Benchmark-only figures; fictional "Zebra Apparel Co.".
const fs = require('fs');
const path = require('path');
const { loadApp, diff } = require('./harness.js');

const seed = {
  _type: 'strategic-value-engagement',
  _version: 1,
  _notice: 'Illustrative sample — figures are published industry benchmarks, not a real customer engagement.',
  engagement: {
    company: 'Zebra Apparel Co.',
    customer: 'Zebra Apparel Co.',
    title: 'RFID Inventory Accuracy — Illustrative Business Case',
    sites: 50,
    seller: 'Joshua Willis',
    email: '',
    partners: '',
    pain: 'Cycle-count labor burden, chronic out-of-stocks, and shrink across 50 apparel stores.'
  },
  verticals: ['retail'],
  selectedIds: ['RET-01', 'RET-02', 'RET-03', 'RET-05'],
  inputs: {
    'RET-01': { total_sku_locations: 50000, hours_per_sku_manual: 0.05, hours_per_sku_rfid: 0.0033, loaded_rate: 24, annual_count_cycles: 12 },
    'RET-02': { annual_store_revenue: 5000000, out_of_stock_baseline_pct: 0.05, osa_improvement_pct: 0.50, gross_margin_pct: 0.40 },
    'RET-03': { annual_store_revenue: 5000000, shrink_pct_baseline: 0.014, shrink_reduction_pct: 0.20 },
    'RET-05': { annual_receiving_labor_hours: 8000, labor_reduction_pct: 0.40, loaded_rate: 24 }
  },
  financeCredit: { enabled: true, rate: 0.40 },
  wacc: 0.10,
  contingencyRate: 0.07
  // no costRows: let the app derive them from retail slider defaults
};

const { window } = loadApp();
window.applyEngagement(seed);
window.ensureCosts();
const out = window.gatherEngagement();
// Stamp a stable label/notice (gather regenerates _label with today's date).
out._notice = seed._notice;

const outPath = path.resolve(__dirname, '..', 'examples', 'sample_engagement.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
console.log('wrote', outPath);
console.log('  _version:', out._version, '| selectedIds:', out.selectedIds.join(','), '| costRows:', out.costRows.length);

// Fixpoint check in a fresh window: load the written file, gather, load again,
// gather — the two gathers must be identical (modulo _label timestamp).
const reread = JSON.parse(fs.readFileSync(outPath, 'utf8'));
const w2 = loadApp().window;
w2.applyEngagement(reread); w2.ensureCosts();
const A = w2.gatherEngagement();
w2.applyEngagement(A); w2.ensureCosts();
const B = w2.gatherEngagement();
const d = diff(A, B);
console.log('  fixpoint A==B:', d === null ? 'PASS' : 'FAIL -> ' + d);
process.exit(d === null ? 0 : 1);
