# Schema Gap Report — v1 today vs. the eight requirements

**Method:** read-only trace of the Save/Load/calc path in `index.html` (committed baseline,
8644 lines). Each requirement is answered **YES** (works today, with evidence) or **NO** (gap,
with the *minimal additive, backward-compatible* v2 extension proposed). **Nothing is
implemented.** All v2 proposals are additive: v1 files omit the new keys and the migration shim
fills defaults, so v1 loads unchanged. The consolidated v2 spec is §B; the methodology decision
that needs your sign-off (Q4 dedup-across-technologies) is §C.

A reminder that shapes every answer: **library lever definitions live in code, not JSON.** A
saved engagement references library levers by `id` and overrides input *values* only. So for any
requirement that asks the JSON to *describe* a lever (its technology, its evidence, its pool),
the answer is "NO for library levers as referenced today" unless we either (a) let the JSON
carry per-lever overlay metadata keyed by lever id, or (b) require such levers to be expressed as
full-discipline custom levers. The proposals below use approach (a) — an additive overlay — so
v1 selection-by-id keeps working.

---

## Q1 — Custom lever, full discipline

**Can a JSON-defined custom lever carry its own formula inputs, ramp type, accessibility tier,
covariance haircut, and an evidence citation with A/B/C confidence flag — through the same
`calcNRV` path as library levers?**

**PARTIAL — mostly YES, one real gap.**

YES, today (`index.html`):
- Formula inputs: `customScenarios[].mechanismId` + `inputs` → `calcSc` (`index.html:4597-4600`).
- Ramp type: `customScenarios[].rampType`, one of the six `RAMP` keys (`index.html:4934`,
  `2101`).
- Accessibility tier: `customScenarios[].accessibilityTier` (`index.html:4935`, `2110`).
- Covariance haircut: `customScenarios[].haircut` (`index.html:4936`).
- **Same path:** active customs are concatenated into the active set and pass through the
  identical `calcNRV` gates — ramp × access × (1−haircut) × financeCredit (`index.html:5163`,
  `4752-4757`). The walkdown and exports tag them `[user]` / "(user-generated)"
  (`index.html:4835`, `6281`, `7651`).

NO (gap): a custom lever has **no evidence citation and no A/B/C confidence flag**. Library
levers carry `evidence` ("Strong"/"Medium-Strong") and `evidenceIds` into the `EVIDENCE` library
(`index.html:2304`, `2306`, `3661`); customs carry neither, and neither is the requested A/B/C
scale. There is also no formula-source field. (Confidence does not gate `calcNRV` for either kind
— it is for display/audit, consistent with the requirement's intent.)

**Proposed v2 (additive):** add to each custom lever (and, optionally, allow on the library
overlay in Q5):
```jsonc
"evidence": {
  "confidence": "A" | "B" | "C",        // A=measured, B=benchmarked, C=estimated
  "citation": "string",                  // free text, or
  "evidenceIds": ["EV-..."],             // reuse the existing EVIDENCE library by id
  "formulaSource": "string"              // optional: where the mechanism/inputs came from
}
```
Defaults when absent: treat as `confidence: "C"`, no citation — i.e. a custom lever with no
evidence renders as "estimated, uncited," which is the honest status quo. Rendering hook: the
data-status panel (Phase 5) and the `[user]` tag.

---

## Q2 — Technology-neutral rendering

**Can the JSON declare the technology (machine vision, BLE RTLS, software platform) so cost-model
labels, report copy, and UI text follow the JSON rather than assuming RFID readers/tags?**

**NO.**

Evidence of the RFID assumption baked into code:
- Default cost rows are hard-RFID: "Fixed readers / handheld units", "Mounting / installation
  fixtures", "Initial tag deployment", "Annual tag replenishment", "SaaS / platform license"
  (`index.html:3818-3824`). Cost sliders are `tag`, `readers`, `replen`
  (`index.html:3785-3796`, `3815`).
- Report/methodology copy hard-references RFID (e.g. PPTX methodology string `index.html:5739`,
  Full Analysis copy `index.html:6050`, lever `oneLiner`/`challenge` text throughout `SCENARIOS`).
- `SCENARIOS[].techKeys` exists (`index.html:2303`) but is **library metadata used for filtering,
  not a JSON-declared engagement technology**, and its values are RFID-flavored ("RFID Core",
  "Handheld RFID", "Fixed RFID Infrastructure").
- No `technologies` key exists anywhere (`grep -c technologies index.html` → 0).

**Proposed v2 (additive):** a top-level `technologies` block (see Q3 — it is the same block; a
single-technology engagement is just a one-element list). Cost-model labels, slider labels, and
methodology/report copy read technology labels from the JSON with the current RFID strings as the
default when the block is absent (so v1 renders identically).

---

## Q3 — Multi-technology engagements

**Can one engagement declare multiple technologies, attribute each lever to the technology (or
combination) delivering it, and carry separate-but-combinable cost stacks (multiple capture
layers, shared or separate platform layer, each with its own recurring lines)?**

**NO.** There is one implicit technology and one flat `costRows` array (§6 of schema.md). Levers
carry no technology attribution that the JSON controls (`techKeys` is library-side and not
serialized).

**Proposed v2 (additive):**
```jsonc
"technologies": [
  {
    "id": "rfid",                        // stable key referenced by levers and cost rows
    "label": "RFID",                     // drives report/UI copy
    "captureLabel": "Readers & tags",    // optional: cost-model section label
    "role": "capture" | "platform" | "both"
  },
  { "id": "mv",       "label": "Machine Vision", "role": "capture" },
  { "id": "platform", "label": "Software Platform", "role": "platform" }
]
```
- **Lever attribution (additive):** add an optional `technologyIds: ["rfid","mv"]` to custom
  levers, and to the per-lever overlay (Q5) for library levers. Absent → attributed to the first
  declared technology (or to "the engagement" if none declared), preserving v1 behavior.
- **Cost stacks (additive):** add an optional `technologyId` to each `costRows` row. Rows with no
  `technologyId` belong to the shared/default stack (v1 behavior). The renderer groups rows by
  technology and shows shared platform rows once. Recurring lines (`yr1`/`yr2`, `cadence:annual`)
  already exist per row, so per-technology recurring is just rows tagged with that `technologyId`.

No new computation: `calcNRV` and the cost subtotal logic are unchanged; technology is a
grouping/labeling overlay. This keeps the "app stays dumb" rule.

---

## Q4 — Cross-lever and cross-technology dedup *(methodology decision — see §C)*

**Can the JSON declare that two levers draw on the same loss pool — including across technologies
— with the haircut value and a rationale string, so no-double-counting is auditable in the report
rather than implicit in a bare number?**

**NO.** Today the only overlap control is the per-lever `haircut` — a single bare number (default
0.10, `index.html:4756`) applied inside `calcNRV` with **no record of which pool it guards,
which other lever it overlaps, or why**. The walkdown shows the post-haircut number
(`index.html:4834`) but not the rationale. There is no structure linking two levers.

**Proposed v2 (additive) — `dedup` declarations:**
```jsonc
"dedup": [
  {
    "id": "pool-receiving-labor",
    "leverIds": ["RET-05", "WH-02", "CUSTOM-01"],   // may span technologies
    "pool": "Receiving labor hours",                // human label of the shared loss pool
    "haircut": 0.30,                                 // overlap discount
    "apply": "shared" | "primary",                  // see §C — the open methodology question
    "primaryLeverId": "RET-05",                      // when apply:"primary"
    "rationale": "All three recover the same inbound labor pool; credit it once."
  }
]
```
**Report rendering (the auditable part):** wherever a haircut is applied in the Full Analysis
walkdown, surface the matching `dedup.rationale` and the pool label, so the discount is explained
rather than implicit. This is the requirement's core ask and is render-only.

**Why this is a methodology decision, not plumbing — bring to review (§C):** the *math* of how a
group-level dedup interacts with each lever's existing per-lever `haircut` is a judgment call with
at least two defensible designs. I am **not** picking one without your sign-off. See §C.

---

## Q5 — Per-field provenance

**Can any input carry `{confidence, source, needs}` so the app can render a data-status panel of
measured vs. estimated?**

**NO.** Engagement `inputs` are bare numbers (`index.html:3938`, schema.md §4). Source hints live
in the library definition's `hint` (code), not the JSON; there is no `confidence`/`source`/`needs`
on a saved value.

**Proposed v2 (additive):** a sibling `_provenance` map mirroring `inputs`, so v1 `inputs` is
untouched (bare numbers keep working) and provenance is purely additive:
```jsonc
"_provenance": {
  "RET-01": {
    "loaded_rate": { "confidence": "A", "source": "Customer payroll export", "needs": "" },
    "total_sku_locations": { "confidence": "C", "source": "Benchmark", "needs": "Confirm from WMS" }
  }
}
```
- `confidence`: `A` (measured) | `B` (benchmarked) | `C` (estimated). Absent → unflagged (v1
  default; the data-status panel simply omits it).
- `needs`: free text; `needs` strings group by `source`/owner in the Phase-5 data-status panel.
- Keying `_provenance` parallel to `inputs` (not inline) keeps the numeric `inputs` map clean for
  the slider read/write code and avoids touching the existing merge logic (`index.html:3890`).

---

## Q6 — Annotations

**Anywhere to attach analyst notes per lever / per cost row / per engagement that survives
Save→Load and appears in exports?**

**NO.** The library `challenge` text (`index.html:2307`) is code-side and read-only; there is no
per-engagement editable note that serializes. (`engagement.pain` is the only free-text field and
it is a single intake box, not per-lever/per-row.)

**Proposed v2 (additive):** a single top-level `annotations` block, keyed by target:
```jsonc
"annotations": {
  "engagement": "Top-line note for this engagement.",
  "levers":   { "RET-01": "Client disputes the 75% figure; using 60%." },
  "costRows": { "0": "Reader count assumes 4/site per the site survey." }
}
```
`costRows` annotations key by row index (the array has no stable id today — acceptable since rows
are not reordered in normal use; if we later add row ids we switch the key). Absent → nothing
renders (v1 default). Render hook: a notes affordance in Full Analysis and an inclusion in
exports (Phase 5).

---

## Q7 — Profiles

**Confirm a bundled profile is just an engagement JSON in `examples/` loaded through the normal
path (adding a vertical starter = zero code).**

**YES.** `loadExample(key)` fetches `examples/<key>.json` and calls `applyEngagement` through the
identical load path (`index.html:4067-4069`); on `file://` where fetch is blocked it falls back
to the manual loader. `_label`/`_notice` are already read for display/banner
(`index.html:3862`, `3930`). Adding a starter is dropping a JSON in `examples/` — zero code.
**No gap.** (Phase 6 only needs the loader to keep handling them, which it does.)

**Read-only observation, flagged not fixed:** the spec's Phase-5 note says six chips
(Manufacturing, Government, Aviation, Hospitality, Energy, Food Service) have "no scenario library
behind them." In this authoritative tree that is **no longer true** — `SCENARIOS` has entries for
all eleven verticals (`manufacturing` 8, `government` 6, `aviation` 7, `hospitality` 6, `energy`
7, `foodservice` 8; via `grep verticalKey`). So the "blank result on click" problem the spec
describes may already be resolved by the out-of-session edits. **I have not touched this** —
flagging so you can decide whether the Phase-5 chip task is now moot.

---

## Q8 — Export-mode flag

**Can the JSON carry a mode flag (analyst vs. customer-lite) plus a baseline snapshot for
revert-on-reload, or is that net-new?**

**NO — net-new.** No `mode` and no `baseline` exist anywhere in app state or the envelope (grep
confirms; the only `mode` hits are Chart.js tooltip config). `financeCreditEnabled`,
`costRowsPreset`, etc. are runtime flags, not a mode.

**Proposed v2 (additive):**
```jsonc
"mode": "analyst" | "customer",     // default "analyst" → changes nothing in v1
"baseline": { /* a full engagement snapshot captured at export time (Phase 4) */ }
```
- `mode` absent → `analyst` (v1 default, current behavior).
- `baseline` is only written by the Phase-4 customer-lite export; on reload in customer mode the
  app restores from `baseline` (tweak-but-revert). Absent in analyst files → ignored.
- This is just envelope data in v1 terms; the behavior is Phases 3–4. Phase 0 only reserves the
  keys.

---

# §B. Consolidated proposed schema v2 (additive overlay on v1)

Envelope bump: `_version: 2`. **Migration shim:** on load, if `_version !== 2`, fill the v2 keys
below with their documented defaults and proceed (v1 files load unchanged — this also finally
gives `_version` a reader, closing the written-but-never-read asymmetry from schema.md §2).

New / changed keys (every one optional; absence = v1 behavior):

| Key | Scope | Req | Default when absent |
|---|---|---|---|
| `technologies[]` | top-level | Q2,Q3 | one implicit "RFID" technology; current copy |
| `costRows[].technologyId` | per cost row | Q3 | shared/default stack (current flat model) |
| `customScenarios[].technologyIds[]` | per custom lever | Q3 | first technology / engagement |
| `customScenarios[].evidence{confidence,citation,evidenceIds,formulaSource}` | per custom lever | Q1 | confidence "C", uncited |
| `dedup[]` | top-level | Q4 | none (per-lever `haircut` only, as v1) |
| `_provenance{}` | parallel to `inputs` | Q5 | unflagged |
| `annotations{engagement,levers,costRows}` | top-level | Q6 | none |
| `overlay{}` (per-lever metadata for **library** levers — `technologyIds`, `evidence`, keyed by lever id) | top-level | Q1,Q3 | none |
| `mode` | top-level | Q8 | "analyst" |
| `baseline{}` | top-level | Q8 | ignored (analyst) |

**Also fix in Phase 1 (not new schema — a v1 defect):** serialize `nrvOverrides` in
`gatherEngagement` so the secondary-NRV per-lever overrides round-trip (schema.md §7). This is the
one genuine Save→Load loss in v1.

Backward-compatibility guarantee restated: v1 JSONs (e.g. the Zebra Apparel Co. sample) load
unchanged because (a) every v2 key is optional with a v1-equivalent default, (b) `inputs` stays a
bare-number map (provenance is a sibling), and (c) `costRows`/`customScenarios` only *gain*
optional fields.

---

# §C. The one decision that needs your sign-off before Phase 1 — dedup math (Q4)

The `dedup` *structure* (§A Q4) is plumbing and I'm comfortable proposing it. **How a
group-level dedup combines with each lever's existing per-lever `haircut` is a methodology choice
I will not make unilaterally.** Two defensible designs:

**Option 1 — `apply: "shared"` (group haircut replaces per-lever haircut for grouped levers).**
Each lever in the group is computed with the group `haircut` instead of its own. Simple, one
number governs the pool. Risk: discards lever-specific haircuts that were doing other work.

**Option 2 — `apply: "primary"` (credit the pool once on a primary lever).** The
`primaryLeverId` keeps its benefit; the other grouped levers' contribution to that shared pool is
zeroed (or scaled by `1 − haircut`). Most literally "no double counting," but requires choosing a
primary and defining what the non-primary levers still contribute (often they deliver *other*
value too, so fully zeroing them is usually wrong).

There is also a **composition question** independent of the above: does the group dedup haircut
**stack multiplicatively** with the per-lever haircut (`(1−h_lever)(1−h_group)`) or **override**
it? Stacking is more conservative; overriding is easier to explain in the report.

My recommendation (for discussion, not a decision): **Option 1 with override semantics** — for
any lever that appears in exactly one `dedup` group, use the group `haircut` in place of the
per-lever `haircut`, and render the `rationale`. It is the smallest, most explainable change and
keeps `calcNRV` a single multiply. But this is exactly the "methodology, not plumbing" call you
flagged, so **Phase 1 does not start until you pick the dedup semantics** (Option 1/2 ×
override/stack) and confirm the §B overlay approach for attaching metadata to library levers.

---

## Verification of this phase

- All three inline app scripts pass `node --check` (unchanged — no code was touched).
- `docs/schema.json` parses as valid JSON.
- Only additions to the tree: `docs/` (three files). `index.html` is byte-for-byte the
  authoritative baseline.
