# Zebra Value Accelerator — Code Audit

**File:** `/home/user/Z-strategic-value/index.html` · **Total lines:** 9,205 · **Date:** 2026-08-03
**Rules:** Every claim cites a line number. "not found" means searched and absent. **Bold** = divergence that produces different numbers or behaviors from the same inputs.

---

## 1. Page Inventory

### 1.1 Sidebar Navigation (lines 938–957)

The sidebar is an `<aside class="sidebar">` at line 938. It contains two labeled sections separated by a `.sb-divider` at line 948.

**Section "Workflow"** (line 941):

| # | `onclick` | `num` | `label` | `short` |
|---|---|---|---|---|
| 1 | `go(0)` | `1` | Engagement Setup | Setup |
| 2 | `go(1)` | `2` | Industry & Value Levers | Industry |
| 3 | `go(2)` | `3` | Discovery Inputs | Discovery |
| 4 | `go(3)` | `4` | Cost Model | Cost |
| 5 | `go(4)` | `5` | ROI & Value Case | ROI |
| 6 | `go(5)` | `6` | Full Analysis | Analysis |

**Section "Library"** (line 949):

| # | `onclick` | `num` | `label` | `short` |
|---|---|---|---|---|
| 7 | `go(6)` | `≡` | Evidence Registry | Evidence |
| 8 | `go(7)` | `?` | Help & Reference | Help |
| 9 | `go(8)` | `FS` | Forecast Signal | Forecast |

Progress bar: `<div class="prog-fill" id="prog-fill">` at line 956. Width formula (line 4516): `Math.min(100, Math.round((Math.min(n,5)/5)*100))+'%'` — yields 0 % at n=0, 20 % at n=1, 40 % at n=2, 60 % at n=3, 80 % at n=4, 100 % at n=5, pinned at 100 % for n=6/7/8.

Each sb-item click maps directly to panel index i: `go(0)` → panel-0 (active on page load), …, `go(8)` → panel-8.

### 1.2 `go(n)` Dispatch Function (lines 4508–4525)

```
4508  function go(n) {
4509    document.querySelectorAll('.panel').forEach((p,i) => p.classList.toggle('active', i===n));
4510    document.querySelectorAll('.sb-item').forEach((el,i) => {
4511      el.classList.remove('active','done');
4512      if(i===n) el.classList.add('active');
4513      else if(i<n && n<=5) el.classList.add('done');
4514      else if((n===6||n===7||n===8) && i<5) el.classList.add('done');
4515    });
4516    document.getElementById('prog-fill').style.width = Math.min(100, Math.round((Math.min(n,5)/5)*100))+'%';
4517    if(n===2) { renderDisc(); renderCustomScenarios(); }
4518    if(n===3) { syncCost(); }
4519    if(n===4) { ensureCosts(); renderROI(); }
4520    if(n===5) { ensureCosts(); if(!state.benefits || !state.benefits.totAnnual) renderROI(); renderExec(); renderSolutionComparison(); renderDataStatus(); }
4521    if(n===6) renderEvidence();
4522    if(n===8) initForecastSignal();
4523    document.querySelector('.main').scrollTop = 0;
4524    syncNav();
4525  }
```

Key observations:
- n=0: no render call; panel-0 is a static form.
- n=1: no render call. `renderLeverGrid()` fires on page load (line 8825) and on every `toggleIndustry()` / `setAllLevers()` call, not from `go()`.
- n=5: conditionally skips `renderROI()` if `state.benefits.totAnnual` is already populated — saves a redundant re-compute when arriving from panel-4.
- n=7: **no conditional render call** — Help & Reference panel is 100 % pre-written static HTML. There is no `if(n===7)` branch in `go()`.

### 1.3 `syncNav()` (line 4527)

```
4527  function syncNav() {} // no-op — nav banner is static
```

An intentionally empty stub. Called at lines 1017 (i-company oninput), 1022 (i-customer oninput), 1060 (panel-0 Next button), 4341 (loadEngagement flow), 4524 (end of every `go()`), and 8836 (DOMContentLoaded). Was meaningful in earlier versions that maintained a dynamic nav banner; it is now a no-op at all five call sites.

### 1.4 Panel Inventory (panels 0–8)

| Panel | Sidebar label | HTML lines | ~LOC | Render function | Function lines |
|---|---|---|---|---|---|
| panel-0 | Engagement Setup | 1000–1062 | ~63 | none (static HTML) | — |
| panel-1 | Industry & Value Levers | 1065–1112 | ~48 | `renderLeverGrid()` | 4629–4691 (~63) |
| panel-2 | Discovery Inputs | 1115–1146 | ~32 | `renderDisc()`, `renderCustomScenarios()` | 4858–4887 (~30); 5503–5582 (~80) |
| panel-3 | Cost Model | 1149–1210 | ~62 | `syncCost()` → `renderCost()` | 4962–4999 (~38); 5010–5085 (~76) |
| panel-4 | ROI & Value Case | 1213–1358 | ~146 | `ensureCosts()`, `renderROI()` | 5270–5277 (8); 5718–6192 (~475) |
| panel-5 | Full Analysis | 1361–1525 | ~165 | `ensureCosts()`, `renderROI()` (conditional), `renderExec()`, `renderSolutionComparison()`, `renderDataStatus()` | 6211–6360 (~150); 5663–5715 (~53); 4280–4319 (~40) |
| panel-6 | Evidence Registry | 1529–1534 | ~6 | `renderEvidence()` | 6368–6398 (~31) |
| panel-7 | Help & Reference | 1537–1898 | ~362 | none (static HTML) | — |
| panel-8 | Forecast Signal | 1902–2043 | ~142 | `initForecastSignal()` | 8945–9197 (~253) |

**Panel-0 notable DOM:** `#i-company` (line 1017), `#i-customer` (line 1022), `#i-title` (line 1027), `#i-sites` (line 1031), `#i-seller` (line 1042), `#i-email` (line 1046), `#i-partners` (line 1050), `#i-pain` (line 1054).

**Panel-4 notable DOM:** `#nrv-wacc` (line 1232), `#nrv-g` (line 1237), `#nrv-fin` (line 1242), `#nrv-decay` (line 1247), `#nrv-on` (line 1254), `#fin-credit-on` (line 1261), `#fin-credit-rate` (line 1268), `#kpi-grid` (line 1277), `#cf-chart` (line 1331), `#ramp-chart` (line 1336), `#vtbl-body` (line 1348).

**Panel-5 notable DOM:** `#exec-logo-slot` (line 1370), `#exec-heading` (line 1371), `#exec-kpis` (line 1379), `#exec-narrative` (line 1384), `#ramp-methodology-grid` (line 1388), `#exec-ramp-chart` (line 1393), `#exec-sc-body` (line 1401), `#exec-evidence` (line 1408), `#data-status-card` (line 1413), `#sc-summary-host` (line 1520), `#solution-comparison-card` (line 1515).

**Panel-8 notable DOM:** `#fs-vertical-banner` (line 1910), `#fs-before-desc` (line 1944), `#fs-after-desc` (line 1956), `#fs-signal-chart` (line 1970), `#fs-forecast-chart` (line 1975), `#fs-data-table` (line 1998).

### 1.5 Non-Panel Views

**Entry Chooser Overlay** (`id="entry-chooser"`, lines 965–989): Full-viewport blocking overlay (`position:fixed; inset:0; z-index:1000`). Shown by `showChooser()` (line 4218); auto-shown on page load (line 8833) when neither an embedded engagement nor a `?example=` URL param is detected. Dismissed by `hideChooser()` (line 4219). Three doors: "Start new" → `chooseStartNew()` (line 4343) → `clearEngagement(); go(0)`; "Start from a profile" → `chooseProfiles()` (line 4345) → `renderProfileGrid()` which expands `#entry-profiles` (line 987) inline; "Open a JSON" → `chooseOpenJson()` (line 4344) → `triggerImport()`.

**Discovery Intake Form (new window popup):** `generateIntakeForm()` at lines 4700–4784 (~85 lines). Not a DOM overlay; opens via `window.open('', '_blank')` at line 4780. Blocked by popup blockers (shows alert if `window.open` returns falsy, line 4781).

**Engagement Notice Banner** (`id="engagement-notice"`, lines 993–997): `display:none` by default; shown as a yellow warning bar. Populated from a loaded engagement's `_notice` field during `importEngagementFile()`. Dismissable via the × button (line 996).

### 1.6 Orphan Comment

Line 2045: `<!-- == PANEL 9 — SOLUTION COMPARATOR == -->`. No `<div id="panel-9">` exists anywhere in the file. No `go(9)` is called anywhere. The Solution Comparator functionality is implemented as a card (`#solution-comparison-card` at line 1515) embedded inside panel-5. `renderSolutionComparison()` writes into `#sc-summary-host` (line 1520). Comment is a dead artifact.

### 1.7 Render Function Quick Reference

| Function | First line | Last line | ~LOC | Called when |
|---|---|---|---|---|
| `renderLeverGrid()` | 4629 | 4691 | 63 | Page load (line 8825) + `toggleIndustry()` + `setAllLevers()` + `applyEngagement()` (line 4134) + `clearEngagement()` (line 4340) |
| `generateIntakeForm()` | 4700 | 4784 | 85 | panel-1 "Generate Intake Form" button (popup window) |
| `renderDataStatus()` | 4280 | 4319 | 40 | `go(5)` |
| `renderDisc()` | 4858 | 4887 | 30 | `go(2)` |
| `syncCost()` | 4962 | 4999 | 38 | `go(3)` + slider `oninput` events |
| `ensureCosts()` | 5270 | 5277 | 8 | `go(4)`, `go(5)` (guard, not a renderer) |
| `renderCustomScenarios()` | 5503 | 5582 | 80 | `go(2)` |
| `renderSolutionComparison()` | 5663 | 5715 | 53 | `go(5)` |
| `renderROI()` | 5718 | 6192 | 475 | `go(4)`; `go(5)` if `state.benefits.totAnnual` not cached; NRV toolbar `oninput`; `toggleLever` updates |
| `renderExec()` | 6211 | 6360 | 150 | `go(5)` |
| `renderEvidence()` | 6368 | 6398 | 31 | `go(6)` |
| `initForecastSignal()` | 8945 | 9197 | 253 | `go(8)` |

---

## 2. State Model

### 2.1 Primary State Object (line 3911)

```js
let state = {
  selectedIds:     new Set(['RET-01','RET-02','RET-03','RET-04','RET-05','RET-06','RET-07','RET-08']),
  inputs:          {},   // populated lines 3920–3922 from SCENARIOS defaults
  benefits:        {totAnnual:0, totY1:0, totY2:0, totY3:0, rows:[]},
  costs:           {yr0:0, yr1:0, yr2:0},
  customScenarios: [],
};
```

Two fields added at runtime (not in the literal):
- `state.nrvResult` — written at line 5744 inside `renderROI()`; `undefined` until `renderROI()` first runs.
- `state.wacc` — referenced with `|| 0.10` fallback in `renderSolutionComparison()` at line 5666; **never explicitly set on the state object**; this is a latent defect.

`state.inputs` is initialized on page load at lines 3920–3923 by `SCENARIOS.forEach(sc => { state.inputs[sc.id] = {}; Object.entries(sc.inputs).forEach(([k,v]) => { state.inputs[sc.id][k] = v.value; }); })`. Only the numeric `value` is stored; `label`, `unit`, and `hint` live exclusively in the SCENARIOS array and are read live from there by `renderDisc()`.

### 2.2 Other Module-Level Globals

| Variable | Line | Initial value | Notes |
|---|---|---|---|
| `let verticalKey` | 3860 | `"retail"` | **DEAD** — never written after declaration; parameter in `setSliderDefaults(verticalKey)` (line 3881) shadows the module-level var; module-level var is never read |
| `let costRows` | 3863 | `[]` | Populated at DOMContentLoaded (line 8828) via `defaultCostRows()` |
| `let appMode` | 3935 | `'analyst'` | `'analyst'` or `'customer'` |
| `let engagementTechnologies` | 3939 | `[]` | v2 declared tech stack array |
| `let engagementOverlay` | 3946 | `{}` | v2 per-lever metadata keyed by lever id |
| `let engagementDedup` | 3959 | `[]` | v2 dedup pool declarations |
| `let engagementProvenance` | 3964 | `{}` | v2 per-input confidence/source tracking |
| `let engagementAnnotations` | 3967 | `{}` | v2 analyst notes |
| `let engagementBaseline` | 3970 | `null` | Customer-lite revert snapshot |
| `let engagementSavedDate` | 3972 | `''` | Parsed from `_label` on load |
| `let costRowsEdited` | 4949 | `false` | |
| `let costRowsPreset` | 4950 | `false` | |
| `let contingencyRate` | 4951 | `0.07` | |
| `let financeCreditEnabled` | 2253 | `true` | |
| `let financeCreditRate` | 2254 | `0.40` | |
| `const nrvOverrides` | 2231 | `{}` | Per-lever profile/access/haircut overrides; `const` but mutated |
| `const activeIndustries` | 4533 | `new Set(['retail'])` | Runtime vertical state; `const` but mutated |
| `let fsCurrentScenario` | 8935 | `'inventoryAccuracy'` | Forecast Signal panel |
| `let fsSignalChart` | 8936 | `null` | Chart.js instance |
| `let fsForecastChart` | 8937 | `null` | Chart.js instance |
| `let fsCustomData` | 8938 | `{}` | Historical data entries |

### 2.3 Write vs. Read Mapping

#### `state.selectedIds`

Writes:

| Line | Function | Operation |
|---|---|---|
| 3912 | module init | `new Set(['RET-01',...'RET-08'])` |
| 4095 | `applyEngagement()` | `= new Set(p.selectedIds)` — full replacement, no guard vs. SCENARIOS |
| 4327 | `clearEngagement()` | `= new Set()` |
| 4555 | `toggleIndustry()` | `.add(s.id)` for all scenarios matching new vertical |
| 4569 | `setAllLevers(true)` | `.add(s.id)` for each matched scenario |
| 4576 | `setAllLevers(false)` | `.clear()` |
| 4580 | `setAllLevers(false)` | **Writes vertical key string (not scenario id) to `activeIndustries`, not `selectedIds`** — same line region but different target |
| 4588 | `setAllLevers(false)` | `state.selectedIds.clear()` — leaves selectedIds empty (intended behavior) |
| 4636 | `renderLeverGrid()` | `.delete(id)` — stale-id pruning (silent, no warning) |
| 4792–4793 | `toggleLever()` | `.delete(id)` or `.add(id)` — vc-card click in panel-1 |
| 4834 | `toggleSc()` | `.delete(id)` or `.add(id)` — **dead; `toggleSc` has no live call sites** |

Reads: lines 2302, 4146, 4662, 4689, 4701, 4798, 4804, 4816, 4834, 4837, 4850, 4859, 5720, 6241, 6369, 6507, 7242, 7740, 8425, 8507.

#### `state.inputs`

Writes:

| Line | Function | Operation |
|---|---|---|
| 3920–3922 | module init | `SCENARIOS.forEach` copies `sc.inputs[k].value` |
| 4099–4100 | `applyEngagement()` | `Object.assign(state.inputs[scId], vals)` — merges saved values |
| 4936 | `updateInput()` | `state.inputs[scId][key] = v` — single field from Discovery Inputs number field |

Reads: lines 4148, 4879, 5151, 6119, 6820, 8456, 8537.

#### `state.benefits`

Writes:

| Line | Function | Operation |
|---|---|---|
| 3914 | module init | `{totAnnual:0, totY1:0, totY2:0, totY3:0, rows:[]}` |
| 5745–5761 | `renderROI()` | Full replacement: `{totAnnual: peakAnnual, totY1/2/3, rows: active.map(...)}` |

Reads: lines 4520, 6152, 6217–6224, 6424, 6495, 6505, 7232–7234, 7729, 7738, 8422–8424, 8503–8506.

#### `state.costs`

Writes: line 3915 (init `{yr0:0, yr1:0, yr2:0}`), line 5020 (`renderCost()`), line 5117 (`rebuildCostState()`).
Reads: lines 2293, 5272–5273, 5740, 6218, 6506, 7234, 7739, 8424, 8506.

#### `state.customScenarios`

Writes: line 3916 (init `[]`), line 4110 (`applyEngagement` deep copy), line 4328 (`clearEngagement`), line 5499 (`addCustomScenario`), lines 5585–5617 (various `updateCustom*` and `removeCustomScenario` functions).
Reads: lines 4167, 4328, 5506, 5508, 5721, 8518.

#### `state.nrvResult` (dynamically added — not in initial declaration)

Write: line 5744 — `state.nrvResult = result` inside `renderROI()`. Before `renderROI()` runs, `state.nrvResult` is `undefined`.
Reads: lines 6150–6151, 6225, 6516, 6955, 6959, 6963, 6967, 6971, 7037, 7246, 7745, 7916, 8516. All guarded: e.g., line 6150: `if (!state.nrvResult) { ensureCosts(); renderROI(); return; }`.

#### `activeIndustries`

Writes: line 4533 (init `new Set(['retail'])`), lines 4088–4089 (`applyEngagement`), line 4329 (`clearEngagement`), line 4551 (`toggleIndustry` delete), line 4553 (`toggleIndustry` add), line 4576 (`setAllLevers(false)` clear), line 4580 (`setAllLevers(false)` keep-first add), line 4585 (`.add('retail')` fallback).
Reads: lines 3881 (parameter shadow only), 4090, 4537, 4544, 4549, 4553, 5006, 5557, 8962, 8972, 8984.

#### `costRows`

Writes: line 3863 (init `[]`), line 4126 (`applyEngagement` deep copy), line 4339 (`clearEngagement` reset), lines 4986/4991/4993 (`syncCost` three code paths), lines 5018/5116 (contingency row mutation), lines 5122/5131/5138–5139 (`updateCostRow` / `removeCostRow` / `addCostRow`), line 5271 (`ensureCosts` guard), line 8828 (DOMContentLoaded).
Reads: lines 4174, 5016–5018, 5025, 5031, 5045, 5051–5052, 5104, 5106, 5114–5116, 5122, 5131, 5136, 5139, 5140, 5271, 5274, 6542–6545, 7407, 8253, 8448, 8567.

#### `costRowsEdited`

Writes: line 4127 (`=true`, `applyEngagement`), line 4338 (`=false`, `clearEngagement`), line 4559 (`=false`, `toggleIndustry`), line 4994 (`=false`, `syncCost` full-reset path), line 5004 (`=false`, `setAllLevers`), line 5105 (`=true`, `recalcCostRow`), line 5140 (`=true`, `addCostRow`).
Reads: line 4982 (`syncCost` branch), line 5013 (`renderCost` edit-hint visibility).

#### `costRowsPreset`

Writes: line 4128 (`=true`, `applyEngagement`), line 4338 (`=false`, `clearEngagement`), line 5005 (`=false`, `setAllLevers`).
Reads: line 4974 (`syncCost`: skip slider recalc when preset).

#### `contingencyRate`

Writes: line 4951 (init `0.07`), line 4124 (`applyEngagement`), line 4957 (`setContingencyRate`).
Reads: lines 5017, 5038, 5115, 7014.

#### `nrvOverrides`

Writes: line 2231 (init `{}`), lines 2372–2373 (`setNrvOverride` — **dead function, no call sites**), lines 4104–4105 (`applyEngagement`), line 4333 (`clearEngagement`).
Reads: line 2235 (`nrvCfg(sc)`), line 4170 (`gatherEngagement`).

#### `financeCreditEnabled` / `financeCreditRate`

| Variable | Writes | Reads |
|---|---|---|
| `financeCreditEnabled` | lines 2253, 2264 (`updateFinanceCreditFromUI`), 4115 (`applyEngagement`), 4253 (`applyCustomerLocks`: forced `=true` in customer mode) | lines 2258, 2275, 2278 |
| `financeCreditRate` | lines 2254, 2266 (`updateFinanceCreditFromUI`), 4116 (`applyEngagement`) | lines 2259, 2276, 2280 |

### 2.4 Panel-1 and Shared State

**Panel-1 writes to the exact same `state.selectedIds` and `activeIndustries` as all other panels. There is no separate store.**

- Vertical button clicks (lines 1073–1083) call `toggleIndustry(this)` → writes `activeIndustries.delete(v)` (line 4551), `activeIndustries.add(v)` (line 4553), `state.selectedIds.add(s.id)` for each matching scenario (line 4555).
- "Select all" / "Clear" buttons (lines 1089–1090) call `setAllLevers(on)` → writes to both `state.selectedIds` and `activeIndustries`.
- `.vc-card` click calls `toggleLever(id, el)` at lines 4792–4793 → writes directly to `state.selectedIds`.

These are the same `state.selectedIds` read by `renderDisc` (line 4859), `renderROI` (line 5720), `gatherEngagement` (line 4146), and all export paths (lines 6241, 6369, 6507, 7242, 7740, 8425, 8507).

### 2.5 Dead Writes and Always-Default Reads

**Dead write: `let verticalKey = "retail"` (line 3860):** Module-level var never written after declaration. The only apparent read at line 3881 is a function parameter of the same name inside `setSliderDefaults(verticalKey)` — that parameter shadows the module-level variable. The module-level `verticalKey` is an unreachable dead declaration.

**Always-default reads (written only via JSON file import; no in-app UI path):**
- `engagementProvenance` (line 3964): Written at line 4060 (`applyEngagement`) and line 4332 (`clearEngagement`). No form field or button creates or edits individual entries. Always `{}` in a fresh session.
- `engagementAnnotations` (line 3967): Identical pattern — lines 4061 and 4332. Always `{}` in a fresh session.
- `engagementBaseline` (line 3970): Written at line 4062 (from `p.baseline`) or by `exportCustomerHTML` (line 4423). Stays `null` in a fresh analyst session. The read at line 4275 (`revertToBaseline`) is guarded and `revertToBaseline` itself has no call sites (see Section 8).

### 2.6 Provenance / Confidence Tracking

`engagementProvenance` declared at line 3964. Documented shape (lines 3962–3963): `{ scId: { inputKey: { confidence:'A'|'B'|'C', source, needs } } }`.

| Action | Line | Detail |
|---|---|---|
| Declared | 3964 | `let engagementProvenance = {};` |
| Loaded | 4060 | `engagementProvenance = JSON.parse(JSON.stringify(p._provenance))` in `applyEngagement()` |
| Cleared | 4332 | `engagementProvenance = {}` in `clearEngagement()` |
| Serialized | 4161 | `_provenance: JSON.parse(JSON.stringify(engagementProvenance))` in `gatherEngagement()` |
| Rendered | 4287 | `Object.entries(engagementProvenance || {}).forEach(...)` in `renderDataStatus()` — card hidden (line 4298) when total count is 0 |

`engagementAnnotations` shape (line 3966): `{ engagement: string, levers: { id: note }, costRows: { index: note } }`. Same JSON-round-trip-only pattern — lines 4061 (load), 4332 (clear), 4162 (serialize), 4296 (render).

In `gatherEngagement` (line 4161): serialized as `_provenance` (underscore prefix). In `migrateEngagement` (line 4043): normalized: `if(!p._provenance || typeof p._provenance !== 'object') p._provenance = {};`. **The entire provenance/confidence system is read-only from the UI perspective.** No form field, button, or JS path allows a user to create or edit a provenance record through the interface.

---

## 3. Industry Vertical Taxonomy

### 3.1 Vertical Buttons in Panel-1 (lines 1073–1083)

All 11 buttons inside `div#vertical-btns`. The button with `class="active"` on page load is the first one (retail).

| Line | `data-v` value | Button label |
|---|---|---|
| 1073 | `retail` | Retail |
| 1074 | `warehouse` | Warehouse / 3PL |
| 1075 | `manufacturing` | Manufacturing & MRO |
| 1076 | `healthcare` | Healthcare |
| 1077 | `government` | Government / Federal |
| 1078 | `carriers` | Carriers & Logistics |
| 1079 | `aviation` | Aviation / MRO |
| 1080 | `hospitality` | Hospitality & Venues |
| 1081 | `datacenter` | Data Center / IT |
| 1082 | `energy` | Energy & Industrial |
| 1083 | `foodservice` | Food Service / CPG |

No other panel contains vbtn buttons or any other industry/vertical selector input element. No `vLabels` object exists anywhere in the file — search returned zero matches. Vertical human-readable labels appear only as the button's own text content.

### 3.2 All Locations Where the Vertical Taxonomy Is Defined

| Site | Lines | Key count | Key set |
|---|---|---|---|
| HTML vertical buttons (`data-v`) | 1073–1083 | 11 | retail, warehouse, manufacturing, healthcare, government, carriers, aviation, hospitality, datacenter, energy, foodservice |
| `verticalKey` field on SCENARIOS entries | 2382–3735 (scattered) | — | Each lever references one vertical; cross-reference between levers and verticals |
| `VMAP` constant | 3840–3852 | 11 | Same 11 keys; maps vertical → `{facility:[], themes:[]}` |
| `VERTICAL_SLIDER_DEFAULTS` | 3865–3877 | 11 | **Same 11 keys** — maps vertical → cost-slider preset values (`sites`, `items`, `replen`, `saas`, `tag`, `readers`) |
| `VERTICAL_SCENARIO_MAP` inside `initForecastSignal()` | 8947–8957 | 10 | **Different 10-key set** — see §3.3 |

### 3.3 VERTICAL_SCENARIO_MAP Mismatch (lines 8947–8957)

**`VERTICAL_SCENARIO_MAP` (10 keys) does NOT match the canonical 11-key vbtn taxonomy.**

| Status | Keys |
|---|---|
| Present in vbtns, **MISSING** from `VERTICAL_SCENARIO_MAP` | `warehouse`, `carriers`, `aviation`, `datacenter`, `energy`, `foodservice` (6 keys) |
| Present in `VERTICAL_SCENARIO_MAP`, **NOT in vbtns** | `apparel`, `cpg`, `grocery`, `logistics`, `aerospace` (5 keys) |

**Consequence:** When the user has selected `warehouse`, `carriers`, `aviation`, `datacenter`, `energy`, or `foodservice` as their active industry in panel-1, `VERTICAL_SCENARIO_MAP[industries[0]]` inside `initForecastSignal()` returns `undefined` and the fallback `['inventoryAccuracy']` is used for chip selection. The map was written against a different earlier taxonomy and has never been updated. Any new vertical added to the vbtn list will also fail to appear in Forecast Signal without a second manual update to `VERTICAL_SCENARIO_MAP`.

### 3.4 Taxonomy Alignment Summary

| List | Key count | Matches vbtns? |
|---|---|---|
| vbtn `data-v` values (lines 1073–1083) | 11 | Reference |
| `VMAP` (lines 3840–3852) | 11 | **Yes — identical** |
| `VERTICAL_SLIDER_DEFAULTS` (lines 3865–3877) | 11 | **Yes — identical** |
| `VERTICAL_SCENARIO_MAP` (lines 8947–8957) | 10 | **No — 6 vbtn keys missing, 5 extra keys** |

---

## 4. Scenarios Array and Lever Definitions

### 4.1 SCENARIOS Array

**Declaration:** line 2378 — `const SCENARIOS = [`
**Closing bracket:** line 3735 — `];`
**Total entries:** 88

Count by prefix:

| Prefix | Count | Entry lines (first of group) |
|---|---|---|
| RET-01 – RET-11 | 11 | 2381, 2397, 2412, 2426, 2440, 2454, 2470, 2486, 3237, 3250, 3263 |
| WH-01 – WH-07 | 7 | 2501, 2517, 2532, 2648, 2662, 2677, 3278 |
| HC-01 – HC-08 | 8 | 2548, 2565, 2693, 2708, 2723, 2737, 2752, 3293 |
| GOV-01 – GOV-06 | 6 | 2582, 2768, 2783, 2797, 2812, 3308 |
| MTL-01 – MTL-08 | 8 | 2599, 2829, 2843, 2857, 2871, 2887, 2902, 3324 |
| CAR-01 – CAR-08 | 8 | 2614, 2918, 2933, 2949, 2964, 3474, 3488, 3503 |
| TL-01 – TL-03 | 3 | 2630, 3518, 3533 — all carry `verticalKey:"carriers"` |
| AVN-01 – AVN-06 + AVN-08 | 7 | 2982, 2997, 3012, 3027, 3043, 3059, 3719 — **AVN-07 does not exist** |
| HOS-01 – HOS-06 | 6 | 3074, 3089, 3339, 3353, 3368, 3384 |
| DC-01 – DC-09 | 9 | 3107, 3123, 3399, 3413, 3429, 3444, 3459, 3684, 3702 |
| IE-01 – IE-07 | 7 | 3139, 3155, 3171, 3548, 3565, 3581, 3597 |
| FS-01 – FS-08 | 8 | 3189, 3203, 3217, 3612, 3626, 3639, 3653, 3667 |

**Note on `annualBenefit` field:** The `annualBenefit` value on each SCENARIOS entry (e.g., `480000` on WH-01 at line 2504, `500000` on RET-02 at line 2400) is a **static display/fallback reference only**. It is NOT used by `calcSc()` to drive live calculations. It appears only in: (a) the `default:` switch branch at line 5263 when a scenario has no `calcSc` formula, and (b) display-only rendering paths such as the solution tier comparison and theme breakdown views. The live `calcSc()` formula is always authoritative for NRV, ROI, and walk-down calculations.

### 4.2 Representative Full Field Inventory (First Three Entries)

**RET-01 (line 2381):**
`id:"RET-01"`, `name:"Inventory Accuracy — Cycle Count Labor"`, `theme:"Labor & Human Capacity"`, `themeKeys:["Labor & Human Capacity"]`, `evidence:"Strong"`, `annualBenefit:312000`, `rampType:"hard_labor"`, `accessibilityTier:"configured"`, `haircut:0.10`, `oneLiner:"Cut cycle-count labor 75–90% — from 3 min/item to 12 sec with handheld RFID"`, `discoveryQuestions`: 3 entries, `inputs`: 5 keys.

**RET-02 (line 2397):**
`id:"RET-02"`, `name:"On-Shelf Availability — Stockout Recovery"`, `theme:"Revenue / Margin"`, `themeKeys:["Revenue / Margin","Operational Efficiency"]`, `evidence:"Strong"`, `annualBenefit:500000`, `rampType:"revenue"`, `accessibilityTier:"configured"`, `haircut:0.10`, `oneLiner:"Recover 50% of stockout losses through RFID-triggered automated replenishment alerts"`, `discoveryQuestions`: 3 entries, `inputs`: 4 keys (`annual_store_revenue`, `out_of_stock_baseline_pct`, `osa_improvement_pct`, `gross_margin_pct`).

**RET-03 (line 2412):**
`id:"RET-03"`, `name:"Shrink Reduction — Loss Prevention"`, `theme:"Direct Cost & Spend"`, `themeKeys:["Direct Cost & Spend"]`, `evidence:"Strong"`, `annualBenefit:350000`, `rampType:"hard_cost"`, `accessibilityTier:"configured"`, `haircut:0.10`, `oneLiner:"Item-level visibility deters internal theft and sharpens LP exception reporting — 20–40% shrink reduction"`, `discoveryQuestions`: 3 entries, `inputs`: 3 keys (`annual_store_revenue`, `shrink_pct_baseline`, `shrink_reduction_pct`).

### 4.3 Other Locations Where Lever-Like Definitions Appear

`CUSTOM_MECHANISMS` at lines 5426–5479: a `const` array of 6 custom lever mechanism templates, each with an `id`, `label`, `vars` array (`key`/`label`/`default`), `formula` function, and `rampDefault`. These are **not** re-declarations of SCENARIOS entries; they are parametric templates that generate user-defined `CUSTOM-NN` scenarios on demand via `addCustomScenario` (line 5484). Variable definitions use different keys from any SCENARIOS entry. No SCENARIOS lever object is copied, merged, or re-declared in `CUSTOM_MECHANISMS`.

`FS_SCENARIOS` (line 8842): chart data for the Forecast Signal panel — benchmark Before/After metrics, not lever financial definitions. No overlap with SCENARIOS.

`computeNRV()` at line 2287 (~82 lines): a complete NRV-calculation function that internally iterates SCENARIOS. **Never called** — no call site exists. The live engine is `calcNRV()` at line 5279. Dead code (see Section 8).

---

## 5. Discovery Variable Definitions

### 5.1 Full Input Object for RET-01 (lines 2389–2395)

| Key | Label | Unit | Default value | Hint |
|---|---|---|---|---|
| `total_sku_locations` | Total SKU Locations | count | 50000 | GS1: typical apparel store 20K–80K |
| `hours_per_sku_manual` | Manual Count Time/SKU (hrs) | hrs | 0.05 | GS1: 2–5 min; use 3 min = 0.05 hr |
| `hours_per_sku_rfid` | RFID Count Time/SKU (hrs) | hrs | 0.0033 | GS1/Auburn: 10–15 sec; use 12 sec |
| `loaded_rate` | Loaded Labor Rate ($/hr) | $/hr | 24 | BLS retail median + 30% burden |
| `annual_count_cycles` | Annual Count Cycles | count | 12 | Monthly=12; Weekly=52 |

### 5.2 Full Input Object for WH-01 (lines 2509–2515)

| Key | Label | Unit | Default value | Hint |
|---|---|---|---|---|
| `total_pallet_positions` | Total Pallet Positions | count | 25000 | DC positions in scope |
| `count_cycles_per_year` | Count Cycles per Year | count | 12 | Monthly=12; Weekly=52 |
| `time_per_position_manual_min` | Manual Count Time/Position (min) | **count** | 3 | Zebra lower bound: 3 min |
| `time_per_position_rfid_sec` | RFID Count Time/Position (sec) | **count** | 20 | Zebra: 15–25 sec; use 20 |
| `loaded_rate` | Loaded Labor Rate ($/hr) | $/hr | 24 | DC warehouse rate |

**Data bug (lines 2512–2513):** The `unit` field for `time_per_position_manual_min` says `"count"` instead of `"min"`, and for `time_per_position_rfid_sec` says `"count"` instead of `"sec"`. This appears in the Discovery Inputs table column header but does not affect any calculation.

### 5.3 Full Input Object for HC-01 (lines 2556–2562)

| Key | Label | Unit | Default value | Hint |
|---|---|---|---|---|
| `annual_rental_spend` | Annual Equipment Rental Spend ($) | $ | 1200000 | IV pumps, vents, specialty equipment |
| `rental_reduction_pct` | Rental Reduction from RFID | % | 0.15 | GE/ECRI lower bound: 15% |
| `num_nursing_staff` | Nursing Staff in Scope | count | 200 | Staff affected by equipment search |
| `nursing_search_hours_per_shift` | Search Hours/Nurse/Shift | hrs | 0.5 | ECRI: 40–70% reduction baseline |
| `shifts_per_year` | Shifts per Year | count | 365 | Daily shifts × 365 |
| `loaded_nursing_rate` | Loaded Nursing Rate ($/hr) | $/hr | 48 | Conservative: $48/hr loaded |

### 5.4 Where Variable Definitions Live

The full input object structure (`label`, `unit`, `value`, `hint`) exists exclusively inside the SCENARIOS array entries. At startup (lines 3920–3923) only the numeric `.value` is extracted into `state.inputs`. `applyEngagement` (lines 4098–4101) merges saved numeric values on top. `renderDisc()` (line 4858) reads `sc.inputs[k].label`, `sc.inputs[k].unit`, `sc.inputs[k].hint` **live from the SCENARIOS array** each time it renders the Discovery Inputs table. There is no shadow copy or merged definition store.

### 5.5 Shared Key Names Across Scenarios

The key name `loaded_rate` appears in the `inputs` of RET-01, RET-05, RET-06, WH-01, WH-02, WH-06, GOV-01, GOV-02, GOV-04, MTL-03, CAR-03, CAR-05, CAR-07, and others. Each lever stores its value in a separate namespace (`state.inputs["WH-01"].loaded_rate` vs `state.inputs["WH-02"].loaded_rate`). **These are independent variable slots that share a key name. They are not pointer-linked. Changing one does not affect others.**

The key name `annual_store_revenue` appears in RET-02 (line 2406, default `$5,000,000`) and RET-03 (line 2421, default `$5,000,000`) — same name, same default, but stored in separate namespaces (`state.inputs["RET-02"].annual_store_revenue` and `state.inputs["RET-03"].annual_store_revenue`). These are economically distinct mechanisms drawing from different P&L lines (revenue uplift vs. shrink cost recovery) and do not double-count the same dollar.

### 5.6 Engagement Context Fields (Panel-0)

All eight input fields in panel-0 (lines 1000–1062):

| DOM id | Type | Label | Default value | Notes |
|---|---|---|---|---|
| `i-company` | text | Company Name | `"Zebra Technologies"` | Appears on all outputs |
| `i-customer` | text | Customer Name | `"Big Red Truck Apparel Company"` | Drives output branding |
| `i-title` | text | Analysis Title | `"RFID Strategic Value Analysis"` | No `fhint` div |
| `i-sites` | number | Number of Sites / Locations | `1` | Drives cost model defaults |
| `i-seller` | text | Seller Name | `"Joshua Willis"` | No `fhint` div |
| `i-email` | email | Seller Email | `"joshua.willis@zebra.com"` | No `fhint` div |
| `i-partners` | text | Parties & Partners | `"Zebra"` | Placeholder: `"e.g. Zebra / Partner Name"` |
| `i-pain` | text | Key KPIs & Discovery Signal | `"Inventory accuracy below 72%; weekly manual counts consuming 480 hrs/month; BOPIS cancellation rate at 9%"` | No `fhint` div |

No other panel contains duplicate or shadow form fields. Each id appears exactly once in the DOM (lines 1017, 1022, 1027, 1031, 1042, 1046, 1050, 1054).

Which functions read these fields directly:

| Function | Lines read | Fields consumed |
|---|---|---|
| `gatherEngagement()` | 4150–4152 | All 8 |
| `applyEngagement()` | 4074–4083 | Writes all 8 back from loaded JSON (not a read path) |
| `renderExec()` | 6212–6232 | `i-customer`, `i-company`, `i-title`, `i-seller`, `i-partners`, `i-pain` (6 of 8) |
| `runPPTXDownload()` | 7732–7737 | `i-customer`, `i-company`, `i-title`, `i-seller`, `i-partners`, `i-pain` (6 of 8) |
| `exportFullPDF()` | 6497–6502 | `i-customer`, `i-company`, `i-title`, `i-seller`, `i-partners`, `i-pain` (6 of 8) |
| `exportLLMPrompt()` | 8508–8511 | `i-customer`, `i-company`, `i-title`, `i-pain` (4 of 8) |
| Server-side PDF payload builder | 8429–8434 | `i-customer`, `i-company`, `i-title`, `i-seller`, `i-partners`, `i-pain` (6 of 8) |
| Standalone render (panel-4) | 4706–4707 | `i-company`, `i-customer` only (2 of 8) |

`i-sites` specific: read by `syncCostFromProfile` (line 4133), cleared to `1` in reset (line 4326), and read by `renderDisc` for RET-06 `num_stores` display (line 4944).

`applyCustomerLocks()` (line 4248): sets `i-company`, `i-customer`, `i-title`, `i-sites`, `i-seller`, `i-email`, `i-partners` to `readOnly` in customer mode. **`i-pain` is NOT locked in customer mode.**

**Key finding for `i-email`:** Serialized by `gatherEngagement` (line 4151) and rehydrated by `applyEngagement` (line 4081) — it round-trips through saved JSON. **However, `i-email` is NOT read by any export or render function** (PDF, PPTX, AI payload, exec panel, ROI panel). It is the only panel-0 field that is captured and persisted but never surfaced in any output.

---

## 6. Lever Trace — WH-01 and RET-02

### 6.1 WH-01 — Cycle Count Labor (Perpetual DC Accuracy)

**SCENARIOS entry (lines 2501–2516):**

| Field | Value |
|---|---|
| `id` | `"WH-01"` |
| `name` | `"Cycle Count Labor — Perpetual DC Accuracy"` |
| `theme` | `"Labor & Human Capacity"` |
| `verticalKey` | `"warehouse"` |
| `facilityKeys` | `["Warehouse / DC"]` |
| `techKeys` | `["RFID Core","Fixed RFID Infrastructure"]` |
| `evidence` | `"Strong"` |
| `annualBenefit` | `480000` (line 2504) — **static display/fallback; NOT used in live calc** |
| `rampType` | `"hard_labor"` |
| `accessibilityTier` | `"configured"` |
| `haircut` | `0.10` |
| `evidenceIds` | `["EV-WH-LABOR-01"]` |

`inputs{}` defaults (lines 2509–2514):

| Key | Default | Hint |
|---|---|---|
| `total_pallet_positions` | 25000 | DC positions in scope |
| `count_cycles_per_year` | 12 | Monthly=12; Weekly=52 |
| `time_per_position_manual_min` | 3 | Zebra lower bound: 3 min |
| `time_per_position_rfid_sec` | 20 | Zebra: 15–25 sec; use 20 |
| `loaded_rate` | 24 ($/hr) | DC warehouse rate |

**`calcSc()` formula (line 5168):**
```
p.count_cycles_per_year
  × p.total_pallet_positions
  × ((p.time_per_position_manual_min / 60) − (p.time_per_position_rfid_sec / 3600))
  × p.loaded_rate
```
Meaning: `annual_cycles × positions × (hours_manual − hours_rfid) × $/hr`

**Default numeric result:** `12 × 25,000 × (3/60 − 20/3600) × 24 = 300,000 × (0.05000 − 0.00556) × 24 = $320,000/yr`

**`annualBenefit: 480000` exceeds the default formula output by $160,000 (50 %).** The static field is not authoritative.

**Variable isolation:** All five inputs are namespaced under `state.inputs["WH-01"]`, initialized at lines 3921–3922. They are completely isolated from any other lever's inputs of the same key name.

**Ramp, access, and overlap (year-by-year multipliers):**
- `RAMP.hard_labor.y = [0.50, 0.85, 1.00, 0.97, 0.90]` (line 2182)
- `ACCESS_TIER.configured = [0.95, 0.90, 0.82, 0.78, 0.75]` (line 2192)
- `overlapFactor(WH-01) = 1 − 0.10 = 0.90` (default path, no dedup group assigned)

| Year | Ramp | Access | Overlap | Combined |
|---|---|---|---|---|
| Y1 | 0.50 | 0.95 | 0.90 | 0.4275 (~43 %) |
| Y2 | 0.85 | 0.90 | 0.90 | 0.6885 |
| Y3 | 1.00 | 0.82 | 0.90 | 0.7380 (peak) |
| Y4 | 0.97 | 0.78 | 0.90 | 0.6811 |
| Y5 | 0.90 | 0.75 | 0.90 | 0.6075 |

Applied in `calcNRV` at line 5305: `ann × ramp × access × overlapFactor(sc) × financeCreditFactor(sc)`.

**`financeCreditFactor` for WH-01:** `"hard_labor"` is NOT in `FINANCE_CREDIT_TYPES` (line 2255), so factor = `1.0`. WH-01 receives no Finance Credit haircut.

**Labor overlap risk across WH levers:** WH-01 (cycle count), WH-02 (receiving labor), and WH-06 (outbound labor) all draw from the same physical pool of DC floor workers. No automatic code-level guard verifies that combined claimed hours stay within total available DC FTE hours. The only safeguards are the 10 % blanket haircut on each lever independently and the optional analyst-configured `engagementDedup` pool shares. No hard-coded dedup group links WH-01 to WH-02 or WH-06.

**`engagementDedup` mechanism:** `overlapFactor()` (lines 4009–4013) calls `dedupShareFor(sc.id)` (lines 3998–4004), which searches `engagementDedup` for a group member with `leverId === "WH-01"`. Since `engagementDedup` starts empty at line 3959, `dedupShareFor("WH-01")` returns `null` and the default haircut path runs. If an analyst configures a dedup group (via loaded JSON `dedup` field), `overlapFactor` returns that pool share directly, replacing the haircut entirely.

---

### 6.2 RET-02 — On-Shelf Availability (Revenue Lever)

**SCENARIOS entry (lines 2397–2411):**

| Field | Value |
|---|---|
| `id` | `"RET-02"` |
| `name` | `"On-Shelf Availability — Stockout Recovery"` |
| `theme` | `"Revenue / Margin"` |
| `verticalKey` | `"retail"` |
| `themeKeys` | `["Revenue / Margin","Operational Efficiency"]` |
| `evidence` | `"Strong"` |
| `annualBenefit` | `500000` (line 2400) — **static display/fallback; NOT used in live calc** |
| `rampType` | `"revenue"` |
| `accessibilityTier` | `"configured"` |
| `haircut` | `0.10` |
| `evidenceIds` | `["EV-RET-OSA-01"]` |

`inputs{}` defaults (lines 2405–2410):

| Key | Default | Hint |
|---|---|---|
| `annual_store_revenue` | 5000000 ($) | Total revenue for sites in scope — apparel avg $3M–$10M per store |
| `out_of_stock_baseline_pct` | 0.05 | ECR: 4–8%; use 5% conservative |
| `osa_improvement_pct` | 0.50 | ECR/GS1: 50–80%; use 50% |
| `gross_margin_pct` | 0.40 | Apparel: 40–60%; use 40% |

**`calcSc()` formula (line 5156):**
```
p.annual_store_revenue
  × p.out_of_stock_baseline_pct
  × p.osa_improvement_pct
  × p.gross_margin_pct
```
Meaning: `revenue_base × OOS_rate × pct_of_OOS_recovered × gross_margin = incremental_gross_profit`

**Default numeric result:** `5,000,000 × 0.05 × 0.50 × 0.40 = $50,000/yr`

**`annualBenefit: 500000` is 10× the default formula output.** It likely reflects a multi-store engagement scenario baked in during SCENARIOS authoring.

**Ramp, access, and overlap:**
- `RAMP.revenue.y = [0.30, 0.70, 1.00, 0.93, 0.82]` (line 2184) — **starts at 0.30 in Y1 vs. 0.50 for `hard_labor`**
- `ACCESS_TIER.configured = [0.95, 0.90, 0.82, 0.78, 0.75]` (line 2192)
- `overlapFactor(RET-02) = 0.90` (default, no dedup group)

| Year | Ramp | Access | Overlap | Combined |
|---|---|---|---|---|
| Y1 | 0.30 | 0.95 | 0.90 | **0.2565 (~26 %)** |
| Y2 | 0.70 | 0.90 | 0.90 | 0.5670 |
| Y3 | 1.00 | 0.82 | 0.90 | 0.7380 (peak — same as WH-01) |
| Y4 | 0.93 | 0.78 | 0.90 | 0.6526 |
| Y5 | 0.82 | 0.75 | 0.90 | 0.5535 |

**`financeCreditFactor` for RET-02:** `"revenue"` IS in `FINANCE_CREDIT_TYPES` (line 2255), so factor = `financeCreditRate` = **0.40 by default** (line 2254). This applies a 60 % reduction to the revenue benefit before NPV. **WH-01 gets factor 1.0; RET-02 gets factor 0.40 — the same gross benefit dollar is worth 60 % less in the NRV model for revenue levers than for labor levers.**

### 6.3 Cross-Lever Observations

1. **`annualBenefit` vs. `calcSc()` output:** WH-01 static ($480,000) vs. formula default ($320,000) — gap of $160,000. RET-02 static ($500,000) vs. formula default ($50,000) — gap of $450,000 (10×). In both cases, `calcSc()` at lines 5168 and 5156 respectively is the authoritative live calculation.

2. **No structural input sharing:** No inputs are pointer-shared across any two levers. `state.inputs[sc.id]` creates a fully isolated namespace per lever at lines 3920–3922.

3. **Finance Credit is a major differentiator between lever types:** Revenue levers (`"revenue"` rampType) receive a 60 % Finance Credit haircut by default (returning only 40 % of gross benefit). Labor/cost levers receive no haircut. This is in addition to the ramp starting lower (0.30 vs. 0.50 in Y1). The combined effect means a $50,000 gross revenue benefit in Y1 nets only `$50,000 × 0.30 × 0.95 × 0.90 × 0.40 = $5,130` in the NRV model — roughly 10 % of gross, vs. `$320,000 × 0.50 × 0.95 × 0.90 × 1.0 = $136,800` (~43 %) for WH-01.

4. **`engagementDedup` is the correct inter-lever deduplication path.** It overrides the `haircut` entirely: if a dedup share is configured, `overlapFactor()` returns that share directly instead of `(1 − haircut)`. Setting `share:0` zeros a lever; `share:0.5` credits half. No dedup groups are pre-configured in SCENARIOS — all must be set in the engagement JSON's `dedup` field.

---

## 7. Export and Output Paths

### 7.1 All Export / Output Buttons

| Panel | Button label | Line | Function | `analyst-only` class |
|---|---|---|---|---|
| Panel 1 (Step 2) | Generate Intake Form | 1091 | `generateIntakeForm()` | No |
| Panel 5 (Step 6) | Full Appraisal PDF | 1457 | `exportFullPDF()` | No |
| Panel 5 (Step 6) | Export Deck (PPTX) | 1461 | `runPPTXDownload(this)` | No |
| Panel 5 (Step 6) | Export JSON | 1467 | `exportJSON()` | No |
| Panel 5 (Step 6) | Copy AI Prompt | 1471 | `exportLLMPrompt()` | No |
| Panel 5 (Step 6) | Save analysis | 1475 | `saveEngagementFile()` | No |
| Panel 5 (Step 6) | Export standalone tool | 1479 | `exportStandaloneHTML()` | **Yes — hidden in customer mode** |
| Panel 5 (Step 6) | Export customer version | 1482 | `exportCustomerHTML()` | **Yes — hidden in customer mode** |
| Intake-form popup | Print / Save PDF | 4769 | `window.print()` | — |

**Note on `exportPPTX()`:** Defined at line 7230 (~487 lines through ~line 7716), but **no button calls it**. Comment at line 6416: "exportPPTX — replaced by real generator below." The main PPTX button (line 1461) calls `runPPTXDownload(this)` directly. `exportPPTX()` is dead code (see Section 8).

### 7.2 `generateIntakeForm()` (lines 4700–4784, ~85 LOC)

State read:
- `state.selectedIds` (line 4701) — filters SCENARIOS
- `i-company`, `i-customer` DOM fields (lines 4706–4707)
- `SCENARIOS[sc].discoveryQuestions` (line 4715) — raw question strings from SCENARIOS
- `SCENARIOS[sc].inputs` (line 4723) — reads `v.label` and `v.hint`; value column left blank
- **Does NOT read `state.inputs[sc.id]`** (customer-entered values)

Output: Opens a new browser window (`window.open`, line 4780) with a print-ready HTML discovery form. Contents per selected scenario: header (id, name, oneLiner, rampType, evidence tier), discovery questions with hand-write lines, and a 3-column table (Variable / Source-Hint / Customer Value). The "Customer Value" column is always an empty `<td style="background:#fafafa"></td>` (line 4727) — benchmark defaults do not appear in the intake form output. Intended to be used *before* discovery data is entered.

`appMode` check: None.

### 7.3 `exportFullPDF()` (lines 6493–7227, ~735 LOC)

State read: `i-customer`, `i-company`, `i-title`, `i-seller`, `i-partners`, `i-pain` (lines 6497–6502); `state.benefits: totAnnual, totY1, totY2, totY3, rows` (lines 6505–6506); `state.costs: yr0, yr1, yr2, rows` (line 6511); `state.selectedIds` → active scenarios (line 6507); `state.nrvResult` (line 6516) — if present, uses NRV/MIRR/payback/ROI; falls back to inline formulas; `SCENARIOS` filtered by selectedIds; `EVIDENCE` filtered to cited evidenceIds (line 6508); `costRows` global (line 6542).

Output: HTML document assembled inline, opened as blob URL in new tab (lines 7216–7218). `window.print()` fires automatically on load (line 7212). Fallback: downloads as `Investment-Appraisal.html` (line 7222). Document sections: Cover (KPI strip, scenario pills), Basis of Preparation, Background to Investment Appraisal, per-scenario breakdown (narrative, formula, 5-yr ramp bars SVG, 4 metric tiles, evidence pills, P&L tag), Benefits summary table, Cost tables (NRC and recurring), 60-month DCF table, Payback / cumulative NPV SVG chart, Executive KPI table (7 tiles), Evidence Registry, Disclaimer (line 7207).

`appMode` check: None.

### 7.4 `runPPTXDownload(callerBtn)` (lines 7719–8407, ~689 LOC)

State read: `i-customer`, `i-company`, `i-title`, `i-seller`, `i-partners`, `i-pain` (lines 7732–7737); `state.benefits: totY1, totY2, totAnnual, rows` (line 7738); `state.costs: yr0, yr1, yr2` (line 7739); `state.selectedIds` → active (line 7740); `state.nrvResult: NRV/MIRR/payback/ROI` (line 7745); `BRAND.fonts` (line 7742); `costRows` global (various slides).

Output: `.pptx` file downloaded via PptxGenJS (blob, line 8391). Filename: `{customer} — RFID Value Case.pptx`. Slides: s1 Cover (line 7335), s2 Executive Summary (line 7367), s3 Investment Summary (line 7412), groupSlides one per theme group (line 7455), sB Benefits Summary top-8 ranked (line 7509), sF Financials cash flow/payback (line 7553), sE Evidence/Appendix (line 7602).

`appMode` check: None.

### 7.5 `exportJSON()` (lines 8415–8494, ~79 LOC)

State read: `i-customer`, `i-company`, `i-title`, `i-seller`, `i-partners`, `i-pain` (lines 8429–8434); `state.benefits` (lines 8436–8445); `state.costs` and `costRows` global (lines 8446–8451); `state.selectedIds` (line 8425); `state.inputs[sc.id][k]` with fallback to `sc.inputs[k].value` up to first 6 inputs per scenario (lines 8456–8459); `EVIDENCE` filtered to used `evidenceIds` (lines 8469–8472).

Output: `.json` file named `Zebra-RFID-Value-Analysis-{customer}-{date}.json` (line 8484). Schema designed for `generate_pdf.py` (comment at line 8427). **No `_type`, `_version`, `_label`, `mode`, or engagement envelope — not suitable for round-trip re-import into the app.**

`appMode` check: None.

### 7.6 `exportLLMPrompt()` (lines 8497–~8820, ~323 LOC)

State read: `i-customer`, `i-company`, `i-title`, `i-pain` (lines 8508–8511); `state.benefits` (line 8505); `state.costs` (line 8506); `state.nrvResult: NRV, MIRR, paybackMo, roi5, bcr` (lines 8516, 8651–8656); `state.selectedIds` (line 8507); `state.customScenarios` (line 8518) — custom scenario warning flag; `state.inputs[sc.id][k]` (line 8539); `EVIDENCE` (lines 8531–8532); `costRows` global (line 8567).

Output: Copies text prompt to clipboard (`navigator.clipboard`, line 8795). Fallback: opens new window with prompt in `<pre>` block + "Copy All" button (lines 8800–8812). Prompt contents: engagement identity, financial KPIs, per-scenario blocks (theme/evidence/ramp/Y1–Y3/inputs/questions/objection handler/evidence IDs), full 83-scenario library for gap analysis, evidence registry, modeling methodology, cost structure.

`appMode` check: None.

### 7.7 `saveEngagementFile()` (lines 4182–4193)

Delegates to `gatherEngagement()` then downloads blob. File name: `{customer}-strategic-value.json` (line 4190). `appMode` is serialized into the payload by `gatherEngagement()` (line 4157) but not checked by `saveEngagementFile()` itself.

### 7.8 `exportStandaloneHTML()` (lines 4410–4413) and `exportCustomerHTML()` (lines 4417–4426)

`exportStandaloneHTML()`: calls `gatherEngagement()` then `_buildStandalone(data, '-value-tool.html')`. Output: `{customer}-value-tool.html` — full app HTML with engagement JSON injected as `<script type="application/json" id="embedded-engagement">` before `</body>` (line 4467). CDN chart.js libs inlined at export time (lines 4448–4460). Button has class `analyst-only` — hidden in customer mode via CSS. Function does not check `appMode` internally.

`exportCustomerHTML()`: calls `gatherEngagement()` twice; overrides `data.mode = 'customer'` (line 4422) and `data.baseline = second gatherEngagement() snapshot` (line 4423, baseline deleted from that snapshot to avoid nesting). Calls `_buildStandalone(data, '-customer-view.html')`. Button has class `analyst-only`. Function **explicitly forces `'customer'` mode** in payload; does not read current `appMode`.

### 7.9 `appMode` / Customer/Analyst Toggle

- **Declaration:** line 3935: `let appMode = 'analyst';`
- **Valid values:** `'analyst'` | `'customer'` — enforced by `migrateEngagement()` at line 4046: `if(p.mode !== 'customer' && p.mode !== 'analyst') p.mode = 'analyst';`
- **Set by:** line 4055 (`applyEngagement`, from loaded file), line 4334 (`clearEngagement`, reset to `'analyst'`), line 4422 (`exportCustomerHTML`, forced to `'customer'`).
- **No interactive toggle button exists** — mode is set by which file is loaded.
- **CSS enforcement (lines 899–905):** `.customer-mode .analyst-only { display: none !important; }` — `document.body.classList.toggle('customer-mode', customer)` in `applyModeGuards()` (line 4238).
- **Mode enforcement is entirely at the button-visibility (CSS) layer** for the two standalone HTML exports. All other export buttons carry no `analyst-only` class and have no internal `appMode` check.
- **There is no `'internal'` or `'external'` string literal anywhere in the file.** The mode system is named `'analyst'` / `'customer'` only.

### 7.10 JSON Schema Comparison: `saveEngagementFile` vs. `exportJSON`

| Field group | `saveEngagementFile` → `gatherEngagement()` | `exportJSON()` |
|---|---|---|
| Envelope | `_type: 'strategic-value-engagement'`, `_version: 2`, `_label`, `mode` | None |
| Identity | `engagement: {company, customer, title, sites, seller, email, partners, pain}` | `company, vendor, title, seller, partners, pain, date` |
| Computed results | Not included | `benefits: {totAnnual, totY1, totY2, totY3, rows[]}`, `costs: {yr0, yr1, yr2, rows[]}` |
| Input state | `inputs: {[scId]: {[key]: value}}` — raw customer-entered values | `scenarios[].inputValues` — label:value pairs, first 6 per scenario |
| Active selections | `selectedIds: [...]`, `verticals: [...]`, `customScenarios: [...]` | `scenarios[]` resolved list |
| Configuration | `nrvOverrides`, `financeCredit`, `wacc`, `contingencyRate`, `costRows`, `technologies`, `overlay`, `dedup` | None |
| Provenance | `_provenance: {}`, `annotations: {}` | None |
| Version field | **Yes** — `_version: 2` at line 4155 | **No** |
| Re-import capable | **Yes** — full round-trip | **No** — designed for `generate_pdf.py` |

**`migrateEngagement()` (line 4037) does NOT inspect `_version`**. It only normalizes missing fields to their expected types. No version-specific migration branches exist.

---

## 8. Persistence, Dead Code, and Consolidation Candidates

### 8.1 Browser Storage

**Result: NONE.** Grep for `localStorage`, `sessionStorage`, `indexedDB`, `IDBDatabase`, `openDatabase`, `cookie` — zero matches in `index.html`.

All persistence is file-based:
- **Save:** `saveEngagementFile()` (line 4182) → `gatherEngagement()` → `.json` Blob download. Schema uses `_type: 'strategic-value-engagement'`, `_version: 2` (line 4155). No automatic saves.
- **Load:** `importEngagementFile()` (line 4196) via "Load analysis" button (line 1006) → `FileReader.readAsText()` → `JSON.parse` → `applyEngagement()`.
- **Example presets:** `loadExample(key)` (line 4485) fetches `examples/<key>.json` over HTTP → `applyEngagement()`.
- **URL param:** `checkExampleParam()` (line 4500) reads `?example=<key>` on load → `loadExample()`.
- **Embedded exports:** standalone/customer HTML exports embed engagement data in `<script type="application/json" id="embedded-engagement">` before `</body>` (lines 4466–4472); on load the app reads that block and calls `applyEngagement()`.

No state survives a page reload without an explicit save.

### 8.2 Schema Version / Migration Guard

`gatherEngagement()` at line 4155 writes `_version: 2` into every saved file. `migrateEngagement()` at line 4037 **does NOT inspect `_version`**. It normalizes missing fields: `technologies → []`, `overlay → {}`, `dedup → []`, `_provenance → {}`, `annotations → {}`, `nrvOverrides → {}`, and `mode → 'analyst'` if not `'customer'` or `'analyst'`. No version-specific migration branches exist. A v1 file (missing `nrvOverrides`) silently gets an empty `{}` — correct by coincidence, not by guarded migration. A future v3 change would have the same silent-normalization behavior.

### 8.3 Stale Lever ID Handling on JSON Load

**Stale IDs are silently loaded, silently pruned from `selectedIds` during the next render, but orphaned entries in `state.inputs` and `nrvOverrides` are never cleaned.**

Trace:
- `applyEngagement()` line 4095: `state.selectedIds = new Set(p.selectedIds)` — all IDs loaded verbatim, no check against SCENARIOS.
- `applyEngagement()` lines 4098–4101: `Object.entries(p.inputs).forEach(([scId, vals]) => { if(!state.inputs[scId]) state.inputs[scId] = {}; Object.assign(state.inputs[scId], vals); })` — orphaned inputs for unknown `scId`s are written and never cleaned.
- `applyEngagement()` lines 4104–4106: same pattern for `nrvOverrides` — orphaned per-lever entries persist for the session lifetime.
- `renderLeverGrid()` line 4636 (called from `applyEngagement` line 4134): `[...state.selectedIds].forEach(id => { if(!matched.find(s=>s.id===id)) state.selectedIds.delete(id); })` — silently prunes `selectedIds` with no user warning.
- `validateDedup()` (line 3976, called at `applyEngagement` line 4054): does NOT validate that `leverId` values inside dedup groups exist in SCENARIOS.

**Net effect:** A JSON referencing lever IDs that no longer exist in SCENARIOS loads without error. The user sees nothing selected and no warning. Orphaned entries in `state.inputs` and `nrvOverrides` persist in memory, harmless but wasteful.

### 8.4 `importEngagementFile()` Validation Coverage

Function at line 4196. Reads file via `FileReader.readAsText()`, parses with `JSON.parse` (throws on malformed JSON, caught and alerted), checks `_type === 'strategic-value-engagement'` (lines 4202–4204) with `confirm()` dialog on mismatch, then calls `applyEngagement(obj)`.

| Validation | Coverage |
|---|---|
| **Hard (aborts on failure)** | `validateDedup(p.dedup)` — checks dedup structure, rationale presence, shares ≤ 100 %, no lever in two groups |
| **Soft (normalizes silently)** | `migrateEngagement()` — fills missing fields with defaults |
| **None** | Type checking on `wacc`, `contingencyRate`, `sites`, `financeCredit.rate`; bounds checking; validation that `selectedIds` or `nrvOverrides` keys match known SCENARIOS |

### 8.5 Dead Functions (Zero Reachable Call Sites)

| # | Function | Defined at | ~LOC | Description and impact |
|---|---|---|---|---|
| 1 | `async exportPPTX()` | line 7230 | ~487 | Full PPTX deck generator using PptxGenJS v3-style API. The UI button at line 1461 calls `runPPTXDownload(this)`, not `exportPPTX`. Comment at line 6416: "exportPPTX — replaced by real generator below." **Largest single dead block — ~487 lines (~5 % of total file).** |
| 2 | `computeNRV(opts)` | line 2287 | ~82 | Complete NPV/MIRR/BCR engine independent of the live `calcNRV()` (line 5279). Returns `{perDriver, grossByYear, decayAvoidedByYear, tcoByYear, ncf, npv, mirr, bcr, roiPct, paybackMo, B0}`. Orphaned prototype; never called. |
| 3 | `exportExecSummary()` | line 6421 | ~71 | Clones `#panel-5` content, opens print dialog in popup. Superseded by `exportFullPDF()`; the export button at line 1457 calls `exportFullPDF()`, not `exportExecSummary()`. |
| 4 | `renderScGrid()` | line 4803 | 28 | Populates `#sc-grid` from `state.selectedIds`, updates `#sc-grid-title` and `#sc-match-badge`. `id="sc-grid"` does NOT exist in the DOM. `id="sc-grid-title"` does NOT exist in the DOM. Superseded by `renderLeverGrid()` (line 4629). |
| 5 | `toggleSc(id, el)` | line 4832 | 7 | Referenced only within the template string in `renderScGrid()` (line 4817). Since `renderScGrid()` has zero call sites itself, `toggleSc()` is unreachable. |
| 6 | `nrvSet(scId, field, val)` | line 2371 | ~4 | `nrvOverrides[scId][field] = val; renderROI();` — NRV override controls referenced in comments but no DOM element or function invokes `nrvSet()`. |
| 7 | `applyPartnerBrand(name, logoUrl)` | line 2166 | ~4 | Sets `BRAND.partner.name` / `logoUrl`, updates `#partner-logo-slot` img. Likely a runtime co-branding API; never wired up. |
| 8 | `copyToClip(text)` | line 6363 | 2 | `navigator.clipboard.writeText(text).then(...)` — no button, onclick, or function references it. |
| 9 | `revertToBaseline()` | line 4275 | ~3 | `if(engagementBaseline) applyEngagement(engagementBaseline)` — `engagementBaseline` is actively maintained (written at line 4062 and line 4423) but `revertToBaseline` has no `onclick`, no keyboard binding, and no programmatic call. Misleading because the data is live but the function is unreachable. |

**Function with intentionally empty body (called but no-op):**
`syncNav()` at line 4527: `function syncNav() {} // no-op — nav banner is static`. Called at 5 sites (lines 1017, 1060, 4341, 4524, 8836). Name implies navigation synchronization but produces no effect.

### 8.6 Commented-Out Code Blocks

No `<!-- ... -->` block of 20 or more lines of commented-out code was found. The only `/* ... */` block of 20+ lines (line 181, ~22 lines) is the CSS Brand Token System documentation header — design reference, not dead code. No runs of consecutive `//` comment lines spanning 15 or more lines were found.

### 8.7 Duplicate Utility Functions

**A. Currency formatter — `fmt` / `fmtAx` — multiple independent definitions**

Global `fmt(n)` at line 6399: full null/NaN/Infinity guard; handles negative sign; M-suffix with 1 decimal; $K rounded; `toLocaleString` fallback. Despite this, additional local definitions exist:

| Line | Name | Location | Divergence from global `fmt` |
|---|---|---|---|
| 5855 | `fmtAx` | `renderROI` bar chart | No null guard; `'$0'` below $1K |
| ~5950 | `fmtAxis` | `renderROI` cashflow chart | No null guard; handles negative sign |
| 6010 | `fmtAx` | `renderROI` benefit/cost chart | No null guard; abs-value pattern |
| 6310 | `fmtAx` | `renderExec` ramp chart | Identical to line 6010 |
| ~6552 | local `F` | `exportFullPDF` | Null guard; **2-decimal M** (not 1) |
| 6570 | `fmtAx` | `makePaybackSVG` | Signed M/K |
| 6596 | `fmtAx` | `makeRampSVG` | Identical to line 6570 |
| 6621 | `fmtAx` | `makeBarSVG` | No sign handling |
| ~6752 | local `fmt` | `makeDonutSVG` | M/K; `'$0'` fallback |
| ~6769 | local `fmt` | `makeRampBarsSVG` | Identical to line 6752 |
| ~6788 | local `fmt` | `makeScRampSVG` (dead) | Identical to line 6769 |
| 7252 | local `F` | `exportPPTX` (dead) | `toLocaleString` only — no M suffix |
| ~7777 | `fmt$` | `runPPTXDownload` | `toLocaleString` only — no M/K |
| ~8514 | local `fmt` | `exportLLMPrompt` | `toLocaleString` only; no M/K |

**Existing drift (already causing inconsistency):** `exportFullPDF`'s local `F` formats $1,500,000 as `"$1.50M"` (2 decimals, line ~6556) while global `fmt` formats it as `"$1.5M"` (1 decimal, line 6402). The exported PDF and the on-screen display show the same scenario value differently.

**B. Percent formatter — 3 independent local definitions**

| Line | Location | Null-safe? |
|---|---|---|
| ~6560 | `exportFullPDF` | **No** — `Math.round(v*100)+'%'` returns `"NaN%"` for `null` |
| ~7253 | `exportPPTX` (dead) | Yes — `Math.round((v||0)*100)+'%'` |
| ~8515 | `exportLLMPrompt` | Yes — identical to line 7253 |

**Existing drift:** The PDF formatter already returns `"NaN%"` where the PPTX formatter returns `"0%"` for the same null MIRR value.

**C. `_setSv` clone of `setSv`**

Global `setSv(id,v)` at line 5001: `const el=document.getElementById(id); if(el) el.textContent=v;`. Local `_setSv` at line 5734 inside `renderROI`: byte-for-byte identical body. Called at lines 5735, 5736, 5737.

### 8.8 Consolidation Candidates (Ranked by Impact)

| Rank | Item | Lines involved | Impact |
|---|---|---|---|
| 1 | **Delete `async exportPPTX()`** (lines 7230–~7716) | ~487 dead lines | Largest single dead block — ~5 % of total file. Removing it eliminates parse-time overhead, removes 487 lines of untested code that could mislead contributors, and removes a vestigial slide-preview popup flow. No behavior change — the block is unreachable. |
| 2 | **Consolidate currency formatters into a single `fmt` / `fmtAx`** (lines 5855–~8514) | ~14 local definitions | Existing drift is real: the PDF already shows `"$1.50M"` where the screen shows `"$1.5M"` for the same value. Every future rounding, currency-symbol, or sign-handling change must be applied in ~14 places. Promoting the global `fmt` (line 6399) to canonical and deleting local variants eliminates the drift and the maintenance surface. The only design decision is whether sub-$1K renders as `'$0'` or `toLocaleString()`. |
| 3 | **Delete `computeNRV(opts)`** (line 2287, ~82 lines) | ~82 dead lines | Orphaned ROI engine running parallel to live `calcNRV()` (line 5279). Any developer reading it has no reason to know it is unused — it looks authoritative. Removing it eliminates confusion about which engine is canonical and removes ~82 lines of untested dead logic. |
| 4 | **Consolidate `pct` percent formatters** (lines ~6560, ~7253, ~8515) | 3 local definitions | The PDF formatter already produces `"NaN%"` for null MIRR where the PPTX formatter produces `"0%"`. Defining one module-level `fmtPct(v)` with null-safe behavior fixes the PDF inconsistency and reduces the surface for future divergence. The behavioral change at line 6560 (making it null-safe) is the correct fix. |
| 5 | **Delete `exportExecSummary()`** (line 6421, ~71 lines) | ~71 dead lines | Dead executive summary export superseded by `exportFullPDF()`. Removing it with its no-longer-wired code path eliminates ~71 lines and removes a vestigial flow that could be accidentally re-wired. |
| 6 | **Delete `renderScGrid()` + `toggleSc()`** (lines 4803, 4832, ~35 total lines) | ~35 dead lines | Both target DOM elements (`#sc-grid`, `#sc-grid-title`) that do not exist. Removing them eliminates false documentation of an inactive UI pattern. |
| 7 | **Wire up or delete `revertToBaseline()`** (line 4275, ~3 lines) | 3 lines of reachable-looking dead code | `engagementBaseline` is actively maintained (written at lines 4062 and 4423), so the function looks reachable. It is not. This creates a reader hazard and a latent product risk — if a "Revert" button is accidentally added, it will call a function that has never been tested in production. Either add a revert button or delete the function. |
| 8 | **Delete `nrvSet()`, `applyPartnerBrand()`, `copyToClip()`** (lines 2371, 2166, 6363, ~10 total lines) | ~10 dead lines | Small isolated dead functions. `applyPartnerBrand` is the most misleading — it creates an undocumented "API" that could be accidentally invoked from the browser console. `nrvSet` appears to belong to a planned NRV override UI that was never wired. |
| 9 | **Replace `_setSv` with global `setSv`** (lines 5734–5737) | 1 dead definition + 3 call sites | Byte-for-byte duplicate of `setSv` (line 5001). If `setSv` is ever extended (sanitization, animation), the three `renderROI` calls at lines 5735–5737 will silently miss the update. Three-line substitution. |
| 10 | **Remove or document `syncNav()` call sites** (line 4527 + 5 call sites) | 5 wasted calls | Empty function called 5 times. Either remove all call sites or add a JSDoc comment documenting that it is a retained stub for forward compatibility. Low effort, clarity gain. |

---

# Status of findings

Added after remediation. Every finding from the original audit above, plus the
findings discovered **during** the work that the audit did not catch. Rationale for
each ruling is in `DECISIONS.md`.

## Original audit findings

| # | Finding | Status | Commit |
|---|---|---|---|
| 1 | `renderROI` passed a hardcoded `0.10` to `calcNRV` — the Step-5 WACC control affected no number the tool produced | **FIXED** | `97ffedd` |
| 2 | `applyEngagement` loaded `selectedIds` with no registry guard; stale ids dropped silently | **FIXED** — filtered and named in a banner | `97ffedd` |
| 3 | `_version` written but never read; unknown versions partially applied | **FIXED** — unknown/future version refuses the load | `97ffedd` |
| 4 | `state.wacc` never written; `renderSolutionComparison` always used its `\|\| 0.10` fallback | **FIXED** | `97ffedd` |
| 5 | 17 currency formatters had drifted (`$1.50M` in PDF vs `$1.5M` on screen) | **FIXED** — one `fmtMoney`/`fmtPct` | `9d7b881` |
| 6 | 3 `pct` formatters disagreed on null (`NaN%` vs `0%`) | **FIXED** | `9d7b881` |
| 7 | Several formatters rendered non-finite as a plausible `$0` via `v\|\|0` | **FIXED** — real zero is `$0`, non-finite is `—` | `9d7b881` |
| 8 | `VERTICAL_SCENARIO_MAP` was a hand-maintained 10-key set against 11 picker keys | **FIXED** — derived from canonical `VERTICALS` | `8307741` |
| 9 | WH-01 unit fields said `"count"` for minutes and seconds | **FIXED** | `8307741` |
| 10 | `calcDriverWalkdown` dead and diverged from the inline reimplementation | **FIXED** — deleted | `4c6ebbd` |
| 11 | `async exportPPTX` (~487 lines) dead; Help text described its removed flow | **FIXED** — deleted, Help corrected | `4c6ebbd` |
| 12 | `computeNRV` — a second, never-called ROI engine | **FIXED** — deleted | `4c6ebbd` |
| 13 | `revertToBaseline` wired to live data but reachable from no UI | **FIXED** — deleted | `4c6ebbd` |
| 14 | `_setSv` byte-identical clone of global `setSv` | **SUPERSEDED** — removed with the compute/render split | `9d7b881` |
| 15 | No browser storage; state survives only an explicit save | **OPEN — by design.** Documented, not changed | — |
| 16 | Orphan `PANEL 9` comment, no such panel | **OPEN** — cosmetic, left in place | — |
| 17 | `inputsProvenance` not found; the real object is `engagementProvenance`, round-tripped but never rendered | **OPEN** — PR 8 surfaces it | — |
| 18 | `i-email` collected, saved, never surfaced in any output | **FIXED** — internal header + save JSON, never customer-facing | `4c6ebbd` |
| 19 | `exportJSON` has no round-trip schema or version field | **OPEN** | — |
| 20 | Exports do not branch on `appMode`; customer-mode enforcement is CSS-only | **OPEN** | — |

## Found during the work — not in the original audit

These are the ones the audit missed, listed worst first.

| # | Finding | How it surfaced | Status | Commit |
|---|---|---|---|---|
| A | **`DC-08`, `DC-09`, `AVN-08` collected discovery inputs and returned a static headline number.** DC-08 returned 675,000 with every one of its six inputs multiplied by ten. The analyst runs discovery, the customer answers, nothing changes | boot registry validator | **FIXED** — `default:` returns non-finite; all three gated | `d0ef9ec` |
| B | **`calcSc`'s `catch:` returned `sc.annualBenefit` for any lever that threw.** With `state.inputs[id]` absent, **all 88** returned their headline number | census probe of all 88 | **FIXED** — returns non-finite and logs | `d0ef9ec` |
| C | **`GOV-02` and `TL-02` read inputs that were never defined** → `NaN` → because `calcNRV` sums levers, selecting either turned **every figure in the engagement** into `NaN` | formula-vs-inputs validator | **FIXED** — excluded and named; both gated | `e228b35` |
| D | **`renderLeverGrid` silently deleted levers** whose vertical was not active — and `applyEngagement` calls it, so loading a payload whose `verticals` list did not cover its `selectedIds` lost them after the banner had already run | load-path fixtures | **FIXED** — pure renderer; verticals inferred, never assumed | `6fd5caa` |
| E | **`updateInput` coerced a cleared field to `0`.** Blanking WH-01's loaded rate took it from 320,000 to 0 — "not worth much" instead of "not asked yet" | coalesce audit | **FIXED** — `undefined`; lever becomes `incomplete` | `d0ef9ec` |
| F | **`computeRowTotal` used `(r.qty\|\|1)`** — a typed `0` quantity was charged as 1 unit | coalesce audit | **FIXED** — `??` | `d0ef9ec` |
| G | **A non-numeric `contingencyRate` turned the whole cost model `NaN`** (`yr0Sub * undefined`) | coalesce audit | **FIXED** — absent means 0% | `bce1048` |
| H | **`RET-06` is badged SOFT PROD. but takes `num_stores`** — flagged `site` and multiplied by a 420-store group it would count 420 × 420 stores | scale review | **FIXED** — `enterprise` against its badge; check B′ enforces | `fa109d4` |
| I | **`RET-01`'s discovery question said "across all stores" while its hint and default were per-store** — the two guidance texts pointed opposite ways | basis classification | **FIXED** — per-store ruling, question rewritten, 10× flag | `fa109d4` |
| J | **`CAR-07` declares an input its formula never reads** (`annual_regulated_volume`) — collected, saved, printed, unused | two-way drift check | **OPEN** — content decision | — |
| K | **Cost slider `sites` default disagrees**: HTML attribute `1` vs `VERTICAL_SLIDER_DEFAULTS.retail` `50` | duplicate-defaults scan | **OPEN** | — |
| L | **WACC `0.10` has six definition sites** | duplicate-defaults scan | **OPEN** — one is now authoritative; consolidation not done | — |
| M | **Five citations back more than one sellable lever**, led by `EV-RET-ACC-01` underwriting three retail levers | evidence report | **OPEN** — content | — |
| N | **7 levers tagged `Strong` on a single citation; 10 non-Emerging levers rest only on Tier 3** — both against the tool's own stated rules. `WH-02` fails both at once | evidence report | **OPEN** — content | — |
| O | **The 9 strategic data-foundation levers declare no `evidence` field at all** — the catalog shows no maturity dot, silent rather than explicit | evidence report | **OPEN** — content | — |
| P | **`CAR-08`/`TL-03` are near-duplicates** sharing one citation and one vertical; Select all took both | dedup report | **FIXED** — mutually exclusive group | `5c6503a` |
| Q | **`DC-02`/`DC-03` share a citation, a name, an input and a scale ruling** — possibly one lever twice | evidence report | **OPEN** — needs the same diff `CAR-08`/`TL-03` got | — |

## Verification added

`?selftest=1` runs **167 assertions** with no build system and no dependencies —
compute, load-path, forecast-signal, formatter-string, lever-status fixtures, and a
two-way drift check asserting `requiredInputs` matches what `calcSc` references.
Verified from a fresh clone with all network blocked.
