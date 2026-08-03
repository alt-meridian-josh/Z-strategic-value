# Value Accelerator — Codebase Audit

**File:** `index.html` · **Total lines:** 9,205 · **Date:** 2026-08-03  
**Branch:** `claude/value-accelerator-git-update-ia5oez`  
**Rules:** Every claim cites a line number. "not found" means searched and absent. **Bold** = divergence that produces different numbers from the same inputs.

---

## 1. Page Inventory

| Panel | Sidebar label | HTML lines | Approx LOC | Render function | Function lines |
|---|---|---|---|---|---|
| panel-0 | Engagement Setup | 1000–1062 | ~63 | none (static HTML) | — |
| panel-1 | Industry & Value Levers | 1065–1112 | ~48 | `renderLeverGrid()` | 4629–4800 (~172) |
| panel-2 | Discovery Inputs | 1115–1146 | ~32 | `renderDisc()`, `renderCustomScenarios()` | 4858–4892 (~35); 5503–5621 (~119) |
| panel-3 | Cost Model | 1149–1210 | ~62 | `renderCost()` (via `syncCost()`) | 5010–5085 (~76) |
| panel-4 | ROI & Value Case | 1213–1358 | ~146 | `renderROI()`, `renderWalkdownTable()` | 5718–6196 (~479); 5368–5500 (~133) |
| panel-5 | Full Analysis | 1361–1525 | ~165 | `renderExec()`, `renderSolutionComparison()`, `renderDataStatus()` | 6211–6360 (~150); 5663–5715 (~53); 4280–4319 (~40) |
| panel-6 | Evidence Registry | 1529–1534 | ~6 (shell) | `renderEvidence()` | 6368–6398 (~31) |
| panel-7 | Help & Reference | 1537–1898 | ~362 | none (static HTML) | — |
| panel-8 | Forecast Signal | 1902–2043 | ~142 | `initForecastSignal()`, `renderForecastSignal()`, `renderFSSignalChart()`, `renderFSForecastChart()` | 8945–9010; 9012–9082; 9084–9115; 9117–9197 |

**`go(n)` dispatch** (line 4517–4522):

| n | Call |
|---|---|
| 0 | show panel only |
| 1 | show panel only — `renderLeverGrid()` is NOT called on navigation; it's called on `DOMContentLoaded` (line 8825), `toggleIndustry()` (line 4562), `setAllLevers()` (line 4590), `applyEngagement()` (line 4134), `clearEngagement()` (line 4340) |
| 2 | `renderDisc(); renderCustomScenarios();` |
| 3 | `syncCost();` |
| 4 | `ensureCosts(); renderROI();` |
| 5 | `ensureCosts(); if(!state.benefits…) renderROI(); renderExec(); renderSolutionComparison(); renderDataStatus();` |
| 6 | `renderEvidence();` |
| 7 | show panel only |
| 8 | `initForecastSignal();` |

**Orphan comment:** `<!-- ══ PANEL 9 — SOLUTION COMPARATOR ══ -->` at line 2045. No `<div id="panel-9">` exists; no `go(9)` call exists. The Solution Comparator was folded into panel-5 (`#sc-summary-host`, line 1520). Comment is a dead artifact.

---

## 2. State Model

### Main `state` object — declared line 3911

```js
let state = {
  selectedIds:    new Set(['RET-01','RET-02','RET-03','RET-04','RET-05','RET-06','RET-07','RET-08']),
  inputs:         {},
  benefits:       {totAnnual:0, totY1:0, totY2:0, totY3:0, rows:[]},
  costs:          {yr0:0, yr1:0, yr2:0},
  customScenarios:[],
};
```

`state.inputs` is populated on init at lines 3920–3923 by iterating `SCENARIOS` and copying `sc.inputs[k].value` (benchmark default) for each key.

Two fields grafted at runtime (not in the literal):
- `state.nrvResult` — written inside `renderROI()` at line 5744
- `state.wacc` — referenced with `|| 0.10` fallback in `renderSolutionComparison()` at line 5666; **never explicitly set**

### Other top-level mutable globals

| Variable | Line | Initial value |
|---|---|---|
| `financeCreditEnabled` | 2253 | `true` |
| `financeCreditRate` | 2254 | `0.40` |
| `nrvOverrides` | 2231 | `{}` (const, mutated) |
| `verticalKey` | 3860 | `"retail"` |
| `costRows` | 3863 | `[]` |
| `appMode` | 3935 | `'analyst'` |
| `engagementTechnologies` | 3939 | `[]` |
| `engagementOverlay` | 3946 | `{}` |
| `engagementDedup` | 3959 | `[]` |
| `engagementProvenance` | 3964 | `{}` |
| `engagementAnnotations` | 3967 | `{}` |
| `engagementBaseline` | 3970 | `null` |
| `engagementSavedDate` | 3972 | `''` |
| `activeIndustries` | 4533 | `new Set(['retail'])` (const, mutated) |
| `costRowsEdited` | 4949 | `false` |
| `costRowsPreset` | 4950 | `false` |
| `contingencyRate` | 4951 | `0.07` |
| `customIdCounter` | 5482 | `1` |
| `fsCurrentScenario` | 8935 | `'inventoryAccuracy'` |
| `fsSignalChart` | 8936 | `null` |
| `fsForecastChart` | 8937 | `null` |
| `fsCustomData` | 8938 | `{}` |

### `state.selectedIds` — writers

| Line | Function | Operation |
|---|---|---|
| 4095 | `applyEngagement()` | `state.selectedIds = new Set(p.selectedIds)` — full replacement |
| 4327 | `clearEngagement()` | `state.selectedIds = new Set()` |
| 4555 | `toggleIndustry()` | `.add(s.id)` for all scenarios matching new vertical |
| 4569 | `setAllLevers(true)` | `matchScenarios().forEach(s => state.selectedIds.add(s.id))` |
| 4588 | `setAllLevers(false)` | `state.selectedIds.clear()` |
| 4636 | `renderLeverGrid()` | `.delete(id)` for stale IDs no longer matching active industries |
| 4792–4793 | `toggleLever()` | `.delete(id)` or `.add(id)` |
| 4834 | `toggleSc()` | `.delete(id)` or `.add(id)` |

### `state.selectedIds` — readers

| Line | Function |
|---|---|
| 2302 | financial computation helper |
| 4146 | `gatherEngagement()` |
| 4662 | `renderLeverGrid()` |
| 4689 | `renderLeverGrid()` |
| 4701 | `generateIntakeForm()` |
| 4798 | `toggleSc()` |
| 4804 | `renderScGrid()` |
| 4816 | `renderScGrid()` |
| 4834 | `toggleSc()` |
| 4837 | `toggleSc()` |
| 4850 | `selCount()` |
| 4859 | `renderDisc()` |
| 5720 | `renderROI()` |
| 6241 | `renderExec()` |
| 6369 | `renderEvidence()` |
| 6507 | `exportFullPDF()` |
| 7242 | PDF export function |
| 7740 | `runPPTXDownload()` |
| 8425 | `exportJSON()` |
| 8507 | `exportLLMPrompt()` |

### `state.inputs` — writers

| Line | Function | Operation |
|---|---|---|
| 3920–3923 | module init | Initial population from SCENARIOS defaults |
| 4099–4100 | `applyEngagement()` | `Object.assign(state.inputs[scId], vals)` |
| 4936 | `updateInput()` | `state.inputs[scId][key] = v` — single field from `<input>` event |

### `state.inputs` — readers

Lines 4148, 4879, 5151, 6119, 6820, 8456, 8537.

### `state.costs` — writers / readers

Writers: lines 5020 (`renderCost()`), 5117 (`rebuildCostState()`).  
Readers: lines 2293, 5272–5273, 5740, 6218, 6506, 7234, 7739, 8424, 8506.

### `activeIndustries` vs. `state.selectedIds`

**They are separate Sets with different value types.**  
`activeIndustries` (line 4533): stores vertical key strings (`'retail'`, `'warehouse'`, etc.).  
`state.selectedIds` (line 3912): stores scenario ID strings (`'RET-01'`, `'WH-02'`, etc.).  
They interact in `toggleIndustry()` (line 4553): adding a vertical to `activeIndustries` also adds all that vertical's scenarios to `state.selectedIds`. Logically linked, structurally separate.

### Does panel-1 share `state.selectedIds` with panel-2?

**Yes — same Set object reference.**  
Panel-1 writes via `toggleLever()` (lines 4792–4793).  
Panel-2 (`renderDisc()`, line 4858–4859) reads `state.selectedIds` as its first act: `SCENARIOS.filter(s => state.selectedIds.has(s.id))`. No intermediate copy. Go(2) re-renders from the live Set every time.

---

## 3. Duplication Table

### A. Industry/vertical list — 5 definition sites

| Site | Lines | Keys | Notes |
|---|---|---|---|
| HTML vertical buttons | 1073–1083 | 11 keys | `retail warehouse manufacturing healthcare government carriers aviation hospitality datacenter energy foodservice` |
| `verticalKey` on each SCENARIOS entry | 2382–3735 (scattered) | — | Maps each lever to its vertical; only cross-reference point between levers and verticals |
| `VMAP` constant | 3840–3852 | 11 keys | Same set; maps vertical → `{facility:[], themes:[]}`. Authoritative filter map used by card renderer |
| `VERTICAL_SLIDER_DEFAULTS` | 3865–3877 | 11 keys | Same set; maps vertical → cost-slider presets (`sites`, `items`, `replen`, `saas`, `tag`, `readers`) |
| `VERTICAL_SCENARIO_MAP` inside `initForecastSignal` | 8947–8958 | 10 keys (different set) | Contains `logistics`, `apparel`, `cpg`, `grocery`, `aerospace` (absent from main set); missing `warehouse`, `carriers`, `aviation`, `datacenter`, `energy`, `foodservice`. Not cross-validated against `VMAP` |

**Divergence flag: `VERTICAL_SCENARIO_MAP` (line 8947) is a different 10-key set from the canonical 11-key set. Any new vertical added to the main set will not appear in Forecast Signal without a second manual update.**

### B. SCENARIOS array

Single definition: `const SCENARIOS = [` at line 2378, closes at line 3735. **88 entries** across prefixes: RET-01–11 (11), WH-01–07 (7), HC-01–08 (8), GOV-01–06 (6), MTL-01–08 (8), CAR-01–08 (8), TL-01–03 (3), AVN-01–06+AVN-08 (7, AVN-07 absent), HOS-01–06 (6), DC-01–09 (9), IE-01–07 (7), FS-01–08 (8).

`FS_SCENARIOS` (line 8842) is chart data for the Forecast Signal modal — not a lever definition; no overlap.

`computeNRV()` at line 2287: a complete NRV-calculation function that internally filters `SCENARIOS`. **Never called** — no call site exists. Dead code (live calculation is `calcNRV()` at line 5279).

### C. Discovery questions (`sc.discoveryQuestions`)

Single storage: inline string arrays on each SCENARIOS entry. Read at lines 4667–4668 (intake card), 4715 (discovery form), 4869 (PDF), 8555 (AI prompt). No duplication.

### D. Benchmark defaults

Single table: `inputs: { key: {label, unit, value, hint} }` blocks inside each SCENARIOS entry. `state.inputs` is initialized from these at lines 3920–3923 by copying `.value`. `annualBenefit` on each scenario (e.g., line 2384) is a static display reference; it does NOT feed `calcSc()`.

`VERTICAL_SLIDER_DEFAULTS` (lines 3865–3877) is a separate table for the cost model — not benefit inputs.

### E. Engagement fields

No `state.engagement` property. The engagement data is split across:

- `state` object (line 3911): `selectedIds`, `inputs`, `benefits`, `costs`, `customScenarios`
- Module-level engagement globals (lines 3935–3970): `appMode`, `engagementTechnologies`, `engagementOverlay`, `engagementDedup`, `engagementProvenance`, `engagementAnnotations`, `engagementBaseline`, `engagementSavedDate`
- Serialized sub-object gathered at lines 4149–4153: `company`, `customer`, `title`, `sites`, `seller`, `email`, `partners`, `pain`

`docs/schema.json` formally documents the same 8 engagement fields (schema lines 26–40). No divergence between schema and code.

### F. `inputsProvenance`

**Not found.** The string `inputsProvenance` does not appear anywhere in `index.html`. The equivalent object is `engagementProvenance` (declared line 3964, documented in comment at lines 3961–3963 as `{ scId: { inputKey: { confidence:'A'|'B'|'C', source, needs } } }`).

`engagementProvenance` usage:

| Action | Line | Detail |
|---|---|---|
| Declared | 3964 | `let engagementProvenance = {};` |
| Documented | 3961–3963 | comment describing shape |
| Loaded | 4060 | `engagementProvenance = JSON.parse(JSON.stringify(p._provenance))` in `applyEngagement()` |
| Cleared | 4332 | `engagementProvenance = {};` in reset block |
| Serialized | 4161 | `_provenance: JSON.parse(JSON.stringify(engagementProvenance))` in `gatherEngagement()` |
| Read | 4287 | `Object.entries(engagementProvenance || {}).forEach(...)` in `renderDataStatus()` |

The A/B/C confidence data is preserved in the save/load cycle but **never rendered in any discovery inputs UI**.

---

## 4. Lever → Variable → Formula Chain

### WH-01 (Cycle Count Labor — Perpetual DC Accuracy)

**SCENARIOS entry:** lines 2501–2516

| Field | Value |
|---|---|
| `annualBenefit` | 480,000 (line 2504) — static card display only, does not feed `calcSc` |
| `rampType` | `"hard_labor"` (line 2504) |
| `haircut` | 0.10 (line 2504) |
| `accessibilityTier` | `"configured"` (line 2504) |

`inputs{}` defaults (lines 2509–2514):

| Key | Default |
|---|---|
| `total_pallet_positions` | 25,000 |
| `count_cycles_per_year` | 12 |
| `time_per_position_manual_min` | 3 |
| `time_per_position_rfid_sec` | 20 |
| `loaded_rate` | 24 |

**`calcSc` formula (line 5168):**
```
p.count_cycles_per_year
  × p.total_pallet_positions
  × ((p.time_per_position_manual_min / 60) − (p.time_per_position_rfid_sec / 3600))
  × p.loaded_rate
```
With defaults: `12 × 25,000 × (0.0500 − 0.00556) × 24 ≈ 319,968` annual benefit.

**Chain from `calcSc` → displayed NRV:**

1. `calcSc(sc)` → `ann` (line 5168)
2. Per-year benefit in `calcNRV()` (line 5279, called from `renderROI()` at line 5741):
   ```
   ann
     × RAMP["hard_labor"].y[t]       // [0.50, 0.85, 1.00, 0.97, 0.90]  (line 2182)
     × ACCESS_TIER["configured"][t]  // [0.95, 0.90, 0.82, 0.78, 0.75]  (line 2192)
     × overlapFactor(sc)             // 1 − 0.10 = 0.90  (line 4012)
     × financeCreditFactor(sc)       // 1.0 — "hard_labor" not in FINANCE_CREDIT_TYPES  (line 2255)
   ```
3. `+ decayAvoided` (line 5308): `B0 × (1.035^yr − 1)`
4. `− totalAnnOpex` (line 5311): annual TCO (opex + 20% capex attrition + $5K training)
5. NPV discount (line 5313): `netCF / (1 + wacc)^yr`, summed → `nrv`
6. Displayed in `#kpi-grid` (line 5778) and NRV Walk-Down table via `renderWalkdownTable()` (line 5368)

**Dedup logic — present and active:**  
`engagementDedup` (line 3959) holds named shared-loss-pool groups: `{ poolId, label, rationale, members:[{leverId, share}] }`.  
`validateDedup()` (line 3976): hard validation — throws on missing rationale, shares > 100%, or a lever in two groups.  
`dedupShareFor(scId)` (line 3998): searches `engagementDedup`; returns `member.share` or `null`.  
`overlapFactor(sc)` (line 4009): if lever is in a group → returns the pool share (replaces haircut); otherwise → `1 − sc.haircut`.  
Applied at lines 5305, 5362, 5380, 7047.  
**No pre-set dedup groups in SCENARIOS** — groups are configured only in the engagement JSON's `dedup` field. For WH-01 with no declared group: `overlapFactor = 0.90`.

### Non-labor Revenue lever: RET-02 (On-Shelf Availability — Stockout Recovery)

**SCENARIOS entry:** lines 2397–2411

| Field | Value |
|---|---|
| `annualBenefit` | 500,000 (line 2400) |
| `rampType` | `"revenue"` (line 2400) |
| `haircut` | 0.10 (line 2400) |
| `accessibilityTier` | `"configured"` (line 2400) |

`inputs{}` defaults (lines 2405–2410):

| Key | Default |
|---|---|
| `annual_store_revenue` | 5,000,000 |
| `out_of_stock_baseline_pct` | 0.05 |
| `osa_improvement_pct` | 0.50 |
| `gross_margin_pct` | 0.40 |

**`calcSc` formula (line 5156):**
```
p.annual_store_revenue
  × p.out_of_stock_baseline_pct
  × p.osa_improvement_pct
  × p.gross_margin_pct
```
With defaults: `5,000,000 × 0.05 × 0.50 × 0.40 = 50,000` annual benefit.

**Key differences from WH-01 in the chain:**
- Ramp: `RAMP["revenue"].y = [0.30, 0.70, 1.00, 0.93, 0.82]` (line 2184) — starts lower
- **`financeCreditFactor`**: `"revenue"` IS in `FINANCE_CREDIT_TYPES` (line 2255), so factor = `financeCreditRate` = **0.40** by default (line 2254). This applies a 60% reduction to the revenue benefit before NPV. WH-01 gets 1.0; RET-02 gets 0.40.

Per-year formula:
```
ann
  × RAMP["revenue"].y[t]          // [0.30, 0.70, 1.00, 0.93, 0.82]
  × ACCESS_TIER["configured"][t]  // [0.95, 0.90, 0.82, 0.78, 0.75]
  × 0.90                          // overlapFactor (1 − 0.10)
  × 0.40                          // financeCreditFactor (revenue type)
```

---

## 5. Output / Export Paths

| Export | Function | Line | Trigger | Output format | Reads `appMode`? |
|---|---|---|---|---|---|
| Full Appraisal PDF | `exportFullPDF()` | 6493 | Button line 1457; no `analyst-only` class | HTML popup → `window.print()` → save as PDF | No |
| Export Deck (PPTX) | `runPPTXDownload()` | 7719 | Button line 1461; no `analyst-only` class | `.pptx` via PptxGenJS `writeFile()` | No |
| Export JSON | `exportJSON()` | 8415 | Button line 1467; no `analyst-only` class | `.json` Blob download (generate_pdf.py schema) | No |
| Copy AI Prompt | `exportLLMPrompt()` | 8497 | Button line 1471; no `analyst-only` class | Clipboard text (markdown); popup fallback | No |
| Export standalone tool | `exportStandaloneHTML()` | 4410 | Button line 1479; **`analyst-only` class** — hidden in customer mode | Self-contained `.html` with embedded engagement JSON | Button hidden; function does not branch internally |
| Export customer version | `exportCustomerHTML()` | 4417 | Button line 1482; **`analyst-only` class** — hidden in customer mode | Self-contained `.html` with `mode:'customer'` forced | Forces customer mode in output |
| Save analysis | `saveEngagementFile()` | 4182 | Button line 1475; no `analyst-only` class | `.json` Blob (strategic-value-engagement schema, `_version: 2`) | No |
| Generate Intake Form | `generateIntakeForm()` | 4700 | Button line 1091; no `analyst-only` class | HTML popup → `window.print()` | No |

**State read by each export:**

All exports read `state.selectedIds`, `state.benefits`, `state.costs`, and DOM engagement fields (`i-company`, `i-customer`, `i-title`, etc.).

`exportJSON()` (line 8456) and `exportLLMPrompt()` (line 8537) read `state.inputs[sc.id]` (customer-entered values), falling back to `sc.inputs[k].value` (benchmark default) when absent.

**`generateIntakeForm()` specifically:**  
Reads `state.selectedIds` to filter scenarios (line 4701).  
For each matched `sc`, reads `sc.inputs` from the SCENARIOS constant — label and hint only (line 4723). **Does NOT read `state.inputs[sc.id]`** (customer-entered values). The "Customer Value" column is left blank for handwritten notes (line 4727: empty `<td>`). Benchmark defaults do not appear in the intake form output.

**Dead export functions (no live button):**

`exportExecSummary()` (line 6421): defined, zero `onclick` references. Clones panel-5 DOM, opens print popup. Superseded by `exportFullPDF()`.

`exportPPTX()` (line 7230): defined, zero `onclick` references. Comment at line 6416: "exportPPTX — replaced by real generator below." Builds an HTML slide preview popup; the Help text at line 1766 still describes this flow, but the live button (line 1461) skips it and calls `runPPTXDownload` directly.

---

## 6. Persistence

### Browser storage

**No `localStorage`, `sessionStorage`, `IndexedDB`, or `document.cookie` usage anywhere in the file.** Not found.

### State persistence mechanism

All persistence is explicit file download / file import:

- **Save:** `saveEngagementFile()` (line 4182) → `gatherEngagement()` → `.json` Blob download. Schema: `_type: 'strategic-value-engagement'`, `_version: 2` (line 4155). No automatic saves.
- **Load:** `importEngagementFile()` via "Load analysis" button (line 1006) → `FileReader` → `applyEngagement()`.
- **Example presets:** `loadExample(key)` (line 4485) fetches `examples/<key>.json` over HTTP → `applyEngagement()`.
- **URL param:** `checkExampleParam()` (line 4500) reads `?example=<key>` on load → `loadExample()`.
- **Embedded export:** standalone/customer HTML exports embed engagement data in `<script type="application/json" id="embedded-engagement">` before `</body>` (lines 4466–4472); on load the app reads that block and calls `applyEngagement()`.

No state survives a page reload without an explicit save.

### Schema version

`_version: 2` is written at line 4155 inside `gatherEngagement()`. It appears in the serialized JSON only. Not stored in a browser mechanism, not validated on load in a version-aware way — `applyEngagement()` does not read or check `_version` before applying fields.

### `applyEngagement()` — stale/deleted scenario IDs

**Line 4095:**
```js
if(Array.isArray(p.selectedIds)) state.selectedIds = new Set(p.selectedIds);
```

**No guard clause.** The function blindly constructs a Set from `p.selectedIds` without filtering against the current `SCENARIOS` array. A stale or deleted scenario ID is silently stored in `state.selectedIds`.

Downstream: all consumers use `SCENARIOS.filter(s => state.selectedIds.has(s.id))`. A stale ID produces no match — the scenario's financial contribution disappears from all computed totals, the PPTX deck, the PDF, the JSON export, and the LLM prompt. **No warning is shown to the user.** The engagement loads and appears functional; missing benefit is invisible.

Similarly, at lines 4098–4101, `state.inputs` entries are merged for any `scId` in `p.inputs`, including stale ones. Those become orphaned entries in `state.inputs` — not displayed, not computed, not cleared.

---

## 7. Dead Weight

### 7A. Functions defined but never called

| Function | Line | Description |
|---|---|---|
| `applyAutoFill` | 5128 | One-liner wrapper around `recalcCostRow(i)`. Zero call sites. Early cost-model hook from before the cadence-change event pipeline was wired directly. |
| `calcDriverWalkdown` | 5354–5366 | Returns 5-row `{year, gross, afterRamp, afterAccess, afterHaircut}` array for a single scenario. Zero call sites. Its logic was copy-pasted into `renderWalkdownTable` (line 5368), which now re-derives the same columns inline but uses only Y3 (peak index) rather than all 5 years. The two implementations have silently diverged. |
| `copyToClip` | 6363 | `navigator.clipboard.writeText()` helper. Zero call sites. Presumably left when its "Copy" button was removed. |
| `revertToBaseline` | 4275 | `if(engagementBaseline) applyEngagement(engagementBaseline)`. `engagementBaseline` is actively set (line 4062) and saved (line 4177). Function is fully wired to data but has no `onclick`, no keyboard binding, no programmatic call. |
| `makeScRampSVG` | 6782–6809 | Per-scenario 5-year ramp line SVG. Defined inside `exportFullPDF` closure alongside `makeDonutSVG` (line 6746) and `makeRampBarsSVG` (line 6764), both of which are called. `makeScRampSVG` is never called within the closure or anywhere else. |
| `deckBarH` | 7277–7291 | Horizontal bar chart renderer for PPTX slides. Defined inside `exportPPTX` closure alongside `deckDonut` (7292) and `deckLineArea` (7305), both called. `deckBarH` has no call site. |

### 7B. Commented-out code blocks >20 lines

**Not found.** No commented-out code block of 20 or more lines exists in the file.

### 7C. Unreachable views

**Ghost panel comment:** `<!-- ══ PANEL 9 — SOLUTION COMPARATOR ══ -->` at line 2045. No `<div id="panel-9">`, no `go(9)`. Dead artifact — see Section 1.

All panels 0–8 are reachable. All sidebar `sb-item` entries (lines 942–952) point to existing panels.

### 7D. Duplicate utilities

**Currency formatter — 17 independent definitions:**

Global `fmt(n)` defined at line 6399 handles null/NaN/Infinity, M-suffix (1-decimal), $K (rounded). Despite this, 16 local formatter lambdas are scattered throughout:

| Name | Line | Location | Divergence |
|---|---|---|---|
| `fmtAx` | 5855 | `renderROI` value chart | No null guard; `'$0'` below $1K |
| `fmtAxis` | 5950–5955 | `renderROI` cashflow chart | No null guard; handles negative sign |
| `fmtAx` | 6010 | `renderROI` benefit/cost chart | No null guard; `abs()` pattern |
| `fmtAx` | 6310 | `renderExec` ramp chart | Identical to line 6010 |
| local `F` | 6552–6558 | `exportFullPDF` | Null guard; **2-decimal M** (not 1) |
| `fmtAx` | 6570 | `makePaybackSVG` | Signed M/K |
| `fmtAx` | 6596 | `makeRampSVG` | Identical to line 6570 |
| `fmtAx` | 6621 | `makeBarSVG` | No sign handling |
| local `fmt` | 6752 | `makeDonutSVG` | M/K, `'$0'` fallback |
| local `fmt` | 6769 | `makeRampBarsSVG` | Identical to line 6752 |
| local `fmt` | 6788 | `makeScRampSVG` (dead) | Identical to line 6769 |
| local `F` | 7252 | `exportPPTX` | `toLocaleString` — no M suffix |
| local `fmt` | 7281 | `deckBarH` (dead) | M/K; `Math.round` fallback |
| local `fmt` | 7295 | `deckDonut` | Identical to line 7281 |
| local `fmt` | 7311 | `deckLineArea` | M/K; `'$0'` fallback |
| `fmt$` | 7777 | `runPPTXDownload` | `toLocaleString` only — no M/K suffix |
| local `fmt` | 8514 | `exportLLMPrompt` | `toLocaleString` — no M/K |

**Existing drift:** `exportFullPDF`'s local `F` formats $1.50M as `"$1.50M"` (2 decimals, line 6556) while global `fmt` formats it as `"$1.5M"` (1 decimal, line 6402). The PDF output and the on-screen table display the same number differently.

**Percent formatter — 3 local definitions:**

| Line | Location | Null-safe? |
|---|---|---|
| 6560 | `exportFullPDF` | No — `Math.round(v*100)+'%'` → returns `"NaN%"` for `null` |
| 7253 | `exportPPTX` | Yes — `Math.round((v||0)*100)+'%'` |
| 8515 | `exportLLMPrompt` | Yes — identical to 7253 |

**`_setSv` clone of `setSv`:**
Global `setSv(id,v)` at line 5001: `const el=document.getElementById(id); if(el) el.textContent=v;`  
Local `_setSv` defined at line 5734 inside `renderROI`: byte-for-byte identical. Called at lines 5735, 5736, 5737.

### 7E. `inputsProvenance`

**Not found.** (See Section 3F — the concept exists as `engagementProvenance`.)

### 7F. `engagementDedup`

**Fully live — not dead weight.** Complete call chain: loaded at line 4059 → drives `dedupShareFor()` (line 3999) → `overlapFactor()` (line 4009) → applied in `calcNRV` (line 5305) and walkdown table (line 5382) → serialized at line 4160 → cleared at line 4331 → annotated at line 5416.

---

## 8. Consolidation Candidates

Ranked by impact (maintenance risk × blast radius).

### #1 — Merge 17 currency formatters into one (lines 5855–8514)

Promote `fmt` (line 6399) to canonical; delete all 16 local variants at lines 5855, 5950, 6010, 6310, 6552, 6570, 6596, 6621, 6752, 6769, 6788, 7252, 7281, 7295, 7311, 7777, 8514.

**Why it matters:** Drift is already real — `exportFullPDF` shows `"$1.50M"` (2 decimal, line 6556) where `fmt` shows `"$1.5M"`. The exported PDF and on-screen table display the same scenario value differently. Every future rounding or currency-symbol change must be made in 17 places.

**Risk:** Low. All formatters are pure display helpers, no state, no side effects. The only decision is whether sub-$1K renders as `'$0'` or `toLocaleString()` — pick one.

**Lines affected:** `fmt` global at 6399 (no change) + 16 local definitions + their call sites across lines 5855–8514.

---

### #2 — Delete `calcDriverWalkdown` or make `renderWalkdownTable` call it (lines 5354–5366, 5372–5380)

`calcDriverWalkdown` computes the 5-year ramp/access/overlap waterfall; `renderWalkdownTable` re-implements the same four columns inline using only Y3 (peak index). The two implementations have silently diverged. `calcDriverWalkdown` has no callers.

**Why it matters:** A developer reading the dead function has no reason to know it's unused — it looks authoritative. If they call it in a new per-year export, they'll get numbers that contradict panel-4.

**Risk:** Low. No callers to break. Delete the dead function, or replace the 6-line inline block inside `renderWalkdownTable` (lines 5372–5380) with a `calcDriverWalkdown(sc)` call selecting index 2.

---

### #3 — Delete the dead function cluster (lines 5128, 6363, 4275, 6782–6809, 7277–7291)

Five functions with zero call sites: `applyAutoFill` (line 5128), `copyToClip` (line 6363), `revertToBaseline` (line 4275), `makeScRampSVG` (lines 6782–6809), `deckBarH` (lines 7277–7291). ~50 lines total.

**Why it matters:** `revertToBaseline` is the most misleading — `engagementBaseline` is actively maintained, so the function looks like it should be reachable. It creates a "broken baseline revert" reader hazard and a latent product confusion risk.

**Risk:** Low for `applyAutoFill`, `copyToClip`, `makeScRampSVG`, `deckBarH`. Medium caution for `revertToBaseline` — if a revert button is planned, delete only after confirming roadmap.

---

### #4 — Merge 3 `pct` percent formatters into one module-level helper (lines 6560, 7253, 8515)

Local `const pct = v => ...` in three export functions. Line 6560 is not null-safe (`"NaN%"` for null); lines 7253 and 8515 are. Define once at module level alongside `fmt`.

**Why it matters:** The PDF formatter already returns `"NaN%"` where the PPTX formatter returns `"0%"` for the same null MIRR value. Three output paths show different values for the same edge case.

**Risk:** Low. The only behavioral change is making line 6560 null-safe, which is the correct fix.

---

### #5 — Replace `_setSv` with `setSv` in `renderROI` (lines 5734–5737)

`_setSv` defined at line 5734 is byte-for-byte identical to the global `setSv` (line 5001). Three call sites at lines 5735–5737 update the NRV toolbar readouts.

**Why it matters:** If `setSv` is ever extended (sanitization, null display, animation), the three `renderROI` calls will silently miss the update.

**Risk:** Minimal. Three-line substitution; delete local definition at line 5734, rename three calls.
