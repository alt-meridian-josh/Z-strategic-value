# Strategic Value Tool — Engagement JSON Schema (v1)

**Status:** Documentation of the schema *as the app reads and writes it today*. Read-only —
no behavior is described here that the code does not already implement. Line numbers refer to
`index.html` as committed at the start of this work (8644 lines).

## 1. The one-paragraph model

The JSON is the app's only persistent state. The live UI is a renderer/editor over a single
in-memory `state` object plus a handful of module-level globals. **Save** (`gatherEngagement`,
`index.html:3935`) serializes those into a portable object; **Load** (`applyEngagement`,
`index.html:3854`) rehydrates them and re-renders. A bundled example is just one of these
objects stored as a file under `examples/` and loaded through the identical path
(`loadExample`, `index.html:4067`). A standalone export bakes the same object into the HTML as
an `embedded-engagement` script block (`exportStandaloneHTML`, `index.html:4007`;
`checkEmbeddedEngagement`, `index.html:3995`).

**Critical architecture fact for everything downstream:** the *library* of levers
(`SCENARIOS`, `index.html:2298`), their formulas (`calcSc`, `index.html:4596`), their evidence
citations (`EVIDENCE` library of `EV-*` records, first at `index.html:3661`), ramp/tier tables
(`RAMP` `index.html:2101`, `ACCESS_TIER` `index.html:2110`), and all benchmark copy live **in
code, not in the JSON**. A saved engagement references library levers only by `id` (via
`selectedIds`) and overrides their input *values* (via `inputs`). It does **not** carry lever
definitions, formulas, evidence text, ramp profiles, or technology labels for library levers.
Anything a JSON needs to fully describe a lever on its own (the goal of the v2 work) is either
absent or only present for custom levers — see the gap report.

## 2. Top-level envelope

The object returned by `gatherEngagement` (`index.html:3945-3957`):

| Field | Type | Default / value written | Read by | Round-trips? |
|---|---|---|---|---|
| `_type` | string | `"strategic-value-engagement"` (constant) | `importEngagementFile` guard (`index.html:3981`): warns if present and different | Yes (constant) |
| `_version` | number | `1` (constant) | **Nothing reads it today.** No migration/branch keys on `_version`. | Written, never read |
| `_label` | string | `"<customer> — saved <YYYY-MM-DD>"`, regenerated every save (`index.html:3947`) | `applyEngagement` uses it only for a `console.log` (`index.html:3930`); profile chooser would read it for display | Lossy by design — regenerated each save, so Save→Load→Save changes the timestamp |
| `_notice` | string | **Never written by `gatherEngagement`.** Authored by hand in example/profile JSONs. | `applyEngagement` (`index.html:3862`) shows it in `#engagement-notice`; empty/absent hides the banner | Read, never written |
| `engagement` | object | always written | see §3 | Yes |
| `verticals` | string[] | `[...activeIndustries]` (`index.html:3949`) | `applyEngagement` (`index.html:3879`) | Yes |
| `selectedIds` | string[] | `[...state.selectedIds]` (`index.html:3937`) | `applyEngagement` (`index.html:3887`) | Yes |
| `inputs` | object | per-scenario input overrides, **only for selected IDs** (`index.html:3938`) | `applyEngagement` merges onto defaults (`index.html:3890`) | Yes for selected; edited-but-unselected inputs are dropped |
| `customScenarios` | object[] | deep copy of `state.customScenarios` (`index.html:3952`) | `applyEngagement` (`index.html:3901`) | Yes — see §5 |
| `financeCredit` | object | `{enabled, rate}` (`index.html:3953`) | `applyEngagement` (`index.html:3906`) | Yes |
| `wacc` | number | `+val('nrv-wacc') || 0.10` (`index.html:3954`) | `applyEngagement` sets `#nrv-wacc` (`index.html:3913`) | Yes |
| `contingencyRate` | number | `contingencyRate` global, 0–0.25 (`index.html:3955`) | `applyEngagement` (`index.html:3916`) | Yes |
| `costRows` | object[] | shallow copy of `costRows` (`index.html:3956`) | `applyEngagement` (`index.html:3917`) | Yes — see §6 |
| `nrvOverrides` | object | **Never written by `gatherEngagement`.** | `applyEngagement` (`index.html:3896`) merges into the `nrvOverrides` global | **Read, never written — round-trip loss (see §7).** |

### Asymmetries (written-but-never-read / read-but-never-written)

- **`_version`** — written (`1`), never read. There is no version branch in the load path; v1
  is assumed implicitly. Relevant to the v2 migration shim (a real consumer must be added).
- **`_notice`** — read (renders the disclaimer banner), never written. By design: it is an
  authoring field for hand-built example/profile JSONs. Documented, not a bug.
- **`nrvOverrides`** — read (`index.html:3896`), never written. See §7 — this is a genuine,
  silent round-trip loss for any per-lever profile/access/haircut override set in the secondary
  NRV layer's UI.

## 3. `engagement` block

Written at `index.html:3940-3944`, read at `index.html:3866-3876`. All values come from / go to
text inputs; all are optional (a blank field serializes as `""` or, for `sites`, `undefined`).

| Field | Type | UI element (read & write) | Notes |
|---|---|---|---|
| `company` | string | `#i-company` | |
| `customer` | string | `#i-customer` | Used to derive Save/Export filenames and `_label` |
| `title` | string | `#i-title` | Engagement / report title |
| `sites` | number \| undefined | `#i-sites` | `+val || undefined`; also mirrored to `#sl-sites`/`#sv-sites` on load (`index.html:3925`) |
| `seller` | string | `#i-seller` | |
| `email` | string | `#i-email` | |
| `partners` | string | `#i-partners` | |
| `pain` | string | `#i-pain` | Free-text discovery notes |

## 4. `inputs` — per-scenario value overrides

`inputs` is a map `{ [scenarioId]: { [inputKey]: number } }`. On **save**, only scenarios in
`selectedIds` are emitted, and only their current `state.inputs[id]` values
(`index.html:3938`). On **load**, values are *merged* onto the benchmark defaults
(`index.html:3890-3893`), so a partial `inputs` map is valid — absent keys keep their library
defaults.

The default values and the full key list for each scenario come from the library definition's
`inputs` object (`SCENARIOS[i].inputs`, e.g. `index.html:2309`). Each library input is defined
as `{ label, unit, value (default), hint }`; only the numeric `value` is ever stored in the
engagement JSON. The keys per scenario ID are the property names of that scenario's `inputs`
object and are also visible in the formula switch (`calcSc`, `index.html:4604` onward). Because
the key set is defined entirely in code, this document does not re-list every key for all ~88
library scenarios; the authoritative per-scenario key list is `SCENARIOS[i].inputs` and the
matching `case` in `calcSc`. Representative example — `RET-01` (`index.html:2309-2315`):
`total_sku_locations`, `hours_per_sku_manual`, `hours_per_sku_rfid`, `loaded_rate`,
`annual_count_cycles`.

**Provenance:** input *values* are bare numbers. There is no per-value `confidence`/`source`/
`needs`. Source hints (`hint`) and evidence tier exist only in the library definition (code),
not in the engagement JSON. (Gap report Q5.)

## 5. `customScenarios` — user-defined levers

Array of objects. Created by `addCustomScenario` (`index.html:4926`), deep-copied on save
(`index.html:3952`) and load (`index.html:3902`). Shape:

| Field | Type | Allowed values | Default | Notes |
|---|---|---|---|---|
| `id` | string | `"CUSTOM-NN"` | auto, `customIdCounter` | |
| `name` | string | free text | `"Custom scenario CUSTOM-NN"` | |
| `custom` | boolean | `true` | `true` | Branch flag in `calcSc` (`index.html:4597`) and `[user]` tagging in renders/exports (`index.html:4835`, `6281`, `7651`) |
| `active` | boolean | `true`\|`false` | `true` | Only `active` customs are folded into the active set (`index.html:5163`, `7961`) |
| `mechanismId` | string | one of `CUSTOM_MECHANISMS` ids: `labor_recovery`, `shrink_reduction`, `availability_uplift`, … `compliance_fines`, `custom_formula` (`index.html:4868-4922`) | `labor_recovery` | Selects the closed-form `formula` used by `calcSc` (`index.html:4598-4600`) |
| `rampType` | string | `hard_labor`\|`hard_cost`\|`revenue`\|`soft`\|`working_cap`\|`strategic` (keys of `RAMP`) | `hard_labor` | Same gate as library levers |
| `accessibilityTier` | string | `commodity`\|`configured`\|`infrastructure` | `configured` | Same gate as library levers |
| `haircut` | number | 0–1 | `0.10` | Same gate as library levers |
| `inputs` | object | `{ [varKey]: number }` per the mechanism's `vars` | mechanism defaults | The formula's inputs |

**What custom levers carry vs. library levers:** custom levers DO enter `calcNRV` through the
same `rampType`/`accessibilityTier`/`haircut`/`financeCreditFactor` gates (§8). They do **not**
carry an evidence citation or an A/B/C confidence flag (no `evidenceIds`, no `confidence`).
(Gap report Q1.)

## 6. `costRows` + `contingencyRate` — the cost model

`costRows` is an array of row objects; `contingencyRate` (0–0.25, default `0.07`,
`index.html:4408`) is the buffer applied to the Yr-0 subtotal. Default rows are built from the
six cost sliders by `defaultCostRows` (`index.html:3812-3827`). When a loaded JSON supplies
`costRows`, the app marks `costRowsEdited = costRowsPreset = true` (`index.html:3919-3920`) so
slider changes will not silently overwrite the supplied model, then calls `rebuildCostState`.

Row shape (`index.html:3818-3826`):

| Field | Type | Notes |
|---|---|---|
| `label` | string | Line-item name. Default labels are RFID-specific ("Fixed readers / handheld units", "Initial tag deployment", "Annual tag replenishment", …) |
| `qty` | number \| `""` | Quantity; `""` on the contingency row |
| `unitCost` | number \| `""` | Per-unit cost; `""` on the contingency row |
| `yr0` | number | One-time / capital in year 0 |
| `yr1` | number | Recurring in year 1 |
| `yr2` | number | Recurring in year 2 |
| `cadence` | string | `"one-time"` \| `"annual"` |
| `contingency` | boolean (optional) | Present and `true` only on the contingency row; its `yr0` is recomputed as `round(yr0Subtotal × contingencyRate)` (`index.html:4474-4475`) and it is excluded from subtotal/bucket passes (`index.html:4432`, `4473`) |

All eight default rows assume an RFID hardware/tag/SaaS stack. There is no technology label on a
cost row and no notion of multiple capture layers or per-technology recurring lines. (Gap report
Q2/Q3.)

## 7. `nrvOverrides` and the two NRV layers (important)

There are **two** NRV computations in the file:

1. **Primary — `calcNRV`** (`index.html:4730`), used for Step-5 results and the Full Analysis
   walkdown. It reads `sc.rampType`, `sc.accessibilityTier`, `sc.haircut` **directly off the
   scenario object** and applies `RAMP`/`ACCESS_TIER`/`financeCreditFactor`.
2. **Secondary — `nrvCfg` layer** (`index.html:2153-2161`, consumed at `index.html:2226`), used
   by a separate per-driver NRV breakdown render. It maps each lever to a `NRV_RAMPS` profile
   and `NRV_ACCESS` tier via `NRV_DEFAULTS` (`index.html:2141`), and applies per-lever overrides
   from the `nrvOverrides` global (`index.html:2151`), settable in the UI
   (`index.html:2292-2293`).

`nrvOverrides` is loaded from JSON (`index.html:3896`) but **never serialized by
`gatherEngagement`**. Consequence: any profile/access/haircut override a user sets in the
secondary layer's UI is **lost on Save** and cannot be round-tripped — though a hand-authored
example JSON *can* inject `nrvOverrides` and have it take effect on load. This is the one true
round-trip defect in v1 and is called out in the gap report.

## 8. The discipline gates (`calcNRV`) — reference path

Every lever folded into `calcNRV` (`index.html:4730`) passes the same gates, in this order
(`index.html:4752-4757`):

1. **Loss pool / recovery → annual benefit:** `calcSc(sc)` (`index.html:4596`). For library
   levers this is the per-ID closed-form formula over `state.inputs[id]`; for custom levers it
   is the selected mechanism's `formula(sc.inputs)`.
2. **Ramp type:** `RAMP[sc.rampType].y[t]` — five-year adoption profile (`index.html:2101`).
3. **Accessibility tier:** `ACCESS_TIER[sc.accessibilityTier || 'configured'][t]`
   (`index.html:2110`).
4. **Covariance haircut:** `(1 - (sc.haircut ?? 0.10))`.
5. **Finance credit:** `financeCreditFactor(sc)` — credits `revenue`/`working_cap`/`soft` ramp
   types at `financeCreditRate` (default 0.40) when enabled, else 1 (`index.html:2177`).

Then portfolio-level: Decay Avoided at 3.5%/yr (`index.html:4760`), annual TCO
(`index.html:4736`), discount at WACC, MIRR (`index.html:4782`), discounted-cumulative payback
(`index.html:4774`), BCR (`index.html:4788`).

**Evidence and confidence are NOT gates in code.** Library levers carry `evidence` ("Strong" /
"Medium-Strong") and `evidenceIds` referencing the `EVIDENCE` library; custom levers carry
neither. Neither field affects `calcNRV`; neither is an A/B/C confidence flag. (Gap report Q1/Q5.)

## 9. Fields the JSON does NOT carry today (net-new for v2 — detail in gap report)

- `technologies` declaration (cost-model/report copy is hard-RFID). — Q2/Q3
- Multi-technology cost stacks / capture layers. — Q3
- `dedup` declarations (shared loss pools across levers/technologies). The 10% haircut is a bare
  per-lever number with no pool/rationale. — Q4
- Per-input `_provenance` (`confidence`/`source`/`needs`). — Q5
- `annotations` (analyst notes per lever / cost row / engagement). — Q6
- `mode` (`analyst`\|`customer`) and a `baseline` snapshot. — Q8
- Evidence citation + A/B/C confidence on custom levers. — Q1

## 10. Export surfaces (outside the Save/Load round-trip)

These read the same `gatherEngagement` object but are one-way and out of scope for round-trip
verification; listed for completeness:

- `exportStandaloneHTML` (`index.html:4007`) — embeds the engagement; opens offline from
  `file://`.
- `saveEngagementFile` (`index.html:3961`) — downloads the raw JSON.
- `exportFullPDF` / `exportExecSummary` (`index.html:5935`, `5863`) — print views.
- `exportPPTX` (`index.html:6673`) — lazy CDN library load (the documented network exception).
- `exportJSON` (`index.html:7858`), `exportLLMPrompt` (`index.html:7940`) — derived text/JSON
  outputs.
