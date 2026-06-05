# Engagement JSON — Schema v2 (implemented)

Additive extension of v1 (`docs/schema.md`). **Every v2 key is optional**; a v1 file
omits them and loads unchanged via the migration shim (`migrateEngagement`,
`index.html`), which fills v1-equivalent defaults and is the first reader of `_version`.
`gatherEngagement` now stamps `_version: 2`. Verified end-to-end by `test/phase1_verify.js`
(51 checks) against `examples/sample_engagement.json` (v1) and
`test/fixtures/v2_multitech_warehouse.json` (v2).

## Envelope additions

| Key | Type | Default (absent) | Notes |
|---|---|---|---|
| `_version` | `2` | treated as v1 | migration shim fills v2 fields |
| `mode` | `"analyst"\|"customer"` | `"analyst"` | carried only in Phase 1; the mode *system* is Phase 3/4 |
| `technologies` | `Technology[]` | `[]` → implicit RFID | drives cost-model + report copy |
| `overlay` | `{ [leverId]: LeverMeta }` | `{}` | per-**library**-lever metadata (by id) |
| `dedup` | `DedupGroup[]` | `[]` | shared loss pools; validated on load |
| `_provenance` | `{ [scId]: { [inputKey]: Provenance } }` | `{}` | sibling map to `inputs` |
| `annotations` | `{ engagement, levers, costRows }` | `{}` | analyst notes |
| `nrvOverrides` | `{ [leverId]: {profile,access,h} }` | — | **deprecated-ignored (Chunk 1)** — fed only the dead secondary-NRV stack (`computeNRV`), now removed. Tolerated in old JSONs (no error) but never read, normalized, or re-emitted. |
| `wacc` | `number` | `0.10` | **(Chunk 2)** discount rate; the Step-5 WACC slider now drives `calcNRV` live (customer-mode bounded 8–12%). |
| `decay` | `{ useDecay:boolean, g:number }` | `{useDecay:true, g:0.035}` | **(Chunk 2; D3)** Decay-Avoided adder. New engagements default **OFF**; migration enables it (`useDecay:true`) for any file lacking the key so v1/v2 numbers hold. `g` = status-quo growth rate. |
| `costs` | `{ attritionRate:number, annualTraining:number }` | `{attritionRate:0.20, annualTraining:5000}` | **(Chunk 2; D4)** schema-driven TCO opex. `attritionRate` applies to Yr-0 capex (SOP basis: handheld rollouts; refinement deferred). `annualTraining` is flat $/yr. Editable in the cost step. (Distinct from the derived in-memory `state.costs` yr0/yr1/yr2, which is not serialized — `costRows` is.) |

## Blocks

**Technology** — `{ id, label, captureLabel?, role? }`. `role ∈ {capture, platform, both}`.
`techScopeLabel()` joins labels ("RFID" or "RFID, Machine Vision & Software Platform");
falls back to `RFID` when none. Cost rows attribute to a technology via
`costRows[].technologyId` (renders per-technology section headers); report subtitle names
the stack.

**Custom lever (full discipline)** — `customScenarios[]` gains `technologyIds: string[]`
and `evidence: { confidence: "A"|"B"|"C", citation, evidenceIds, formulaSource }`. Enters
`calcNRV`/`calcSc` through the identical ramp/tier/haircut/finance-credit gates; flagged
`[user]`/"(user-generated)" in all exports.

**LeverMeta (overlay)** — `{ technologyIds?, evidence? }` attached to library levers by id.
`leverEvidence(sc)` resolves evidence from the custom-inline field or the overlay.

**DedupGroup** — `{ poolId, label, rationale (required), members: [{ leverId, share }] }`.
A member's `share` **replaces** its per-lever `(1 - haircut)` inside `overlapFactor(sc)`
(override, **no stacking**); ungrouped levers keep their haircut. `validateDedup()` hard-errors
(aborting load) when a `rationale` is missing, a group's shares sum to **> 100%**, or a lever
appears in **more than one** group — so no-double-counting holds by construction. The Full
Analysis walkdown renders each pool's rationale + share split and marks member rows `[pool NN%]`.

**Provenance** — `{ confidence: "A"|"B"|"C", source, needs }` per input. Carried + exported;
the data-status panel that surfaces it is Phase 5.

**Input range (Chunk 4)** — a scenario input definition may carry an optional
`range: [min, max]`, set **at or below** its cited source so the band never exceeds the
benchmark and the default sits at the conservative end. It lives on the lever *definition*
(library `SCENARIOS[].inputs[k].range`, or custom `CUSTOM_MECHANISMS[].vars[].range` /
`customScenarios[].ranges[k]`) — not in the value-only engagement `inputs` block, which
inherits it. Behavior: in **customer** mode a ranged input renders as a slider clamped to
`[min,max]` and an input *without* a range is read-only; in **analyst** mode every input is
an editable number, ranged ones showing a "bounded min–max" hint. `updateInput` /
`updateCustomInput` clamp to the bounds on every edit, so an out-of-band value is impossible.

**Customer-lite cost scope (Chunk 4)** — customers may edit line-item **values**
(qty / unit / total) but not structure: row labels, cadence, the contingency buffer, the
schema-driven TCO params (attrition / training), and the row-remove control are locked
(`.cost-lock` / `.cost-remove`, active only under `body.customer-mode`). The
tweak-but-revert baseline snapshot and the customer footer are unchanged.

**Annotations** — `engagement` (string), `levers` (`{ [leverId]: note }`), `costRows`
(`{ [index]: note }`). Carried + exported; surfaced in the report in Phase 5.

## Backward compatibility (verified)

v1 `examples/sample_engagement.json` loads, computes **byte-identical** to the pre-edit
baseline (kpi + walkdown + cost table), round-trips losslessly, and migrates to `_version 2`
on save. The v2 fixture loads → computes → saves → reloads losslessly → exports a standalone
that **opens offline** and reconstructs every v2 block.
