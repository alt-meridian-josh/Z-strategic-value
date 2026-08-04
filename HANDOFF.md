# Handoff

## Where things stand

| | |
|---|---|
| **Branch** | `claude/value-accelerator-git-update-ia5oez` |
| **Baseline commit** | `5c6503a` — tagged `baseline/pr7-foundation` |
| **Pull request** | [#4](https://github.com/alt-meridian-josh/Z-strategic-value/pull/4) — **open, not merged**, base `claude/kind-meitner-uGJQt` |
| **Selftest** | `index.html?selftest=1` → **167/167**, verified from a fresh clone with all network blocked |
| **Distributable** | still one self-contained HTML file, no build system, no dependencies |

Nothing here is merged. `main` is untouched by this work.

### Verifying in one step

Open `index.html?selftest=1` in any browser. Expect a green
`✓ PASS — all 167 field assertions match`. No server, no install, no network.
Chart.js is CDN-loaded but only the Forecast Signal panel needs it; boot and
selftest do not.

---

## What was done

Sixteen commits from `85df4cc`. Full finding-by-finding status in `AUDIT.md`;
rationale for every ruling in `DECISIONS.md`.

The short version: the tool had several paths that produced confident numbers
unrelated to the customer's inputs — a WACC control that affected nothing, three
levers that ignored discovery entirely, two that turned every figure into `NaN`,
and export formatters that rendered `NaN` as a plausible `$0`. Those are closed.
The remaining work is content, not code.

---

## PR 7 runtime — resume point

The declarative foundation is in (`fa109d4`): every lever carries `scale`, every
input carries `basis`, and boot check B′ enforces that a `site` lever cannot
reference an enterprise-basis input. **Nothing multiplies yet**, which is why
fixtures are byte-unchanged.

Build in this order, committing between each:

1. **`state.sites[]` + migration from `i-sites`, `_version` bump.**
   Amendment C's subsumption first — one canonical site count before anything
   multiplies. `state.sites = [{ id, label, count, vertical, overrides }]`,
   defaulting to a single group with `count: 1` and empty overrides. Existing
   engagements migrate to that single group. PR 1's version gate handles the bump.
   *Do this before step 2 — see `DECISIONS.md` §10 for why a second site count is
   the WACC bug wearing a different hat.*
2. **Aggregation.** Site levers × summed counts of matching-vertical groups;
   enterprise levers computed once from aggregated inputs, never multiplied.
   Extensive units sum across groups, intensive units are count-weighted, using
   the unit annotations from PR 3. **An unannotated unit fails boot rather than
   guessing.**
3. **Override UI.** Empty override = inherit benchmark, rendered greyed with a
   benchmark badge that flips to custom on entry. "Add site group" duplicates the
   previous group with its values. Soft warning above 6 groups.
4. **Step 3 group tabs.** Single-column by default; per-group columns appear only
   for variables a group actually overrides. Tabs, not a wide matrix.
5. **Export assumptions list the groups.** A total that depends on 420 stores must
   show 420 somewhere.

**After every step: all 167 fixtures byte-unchanged at one default group.** That is
the migration-is-neutral proof. If a value moves, stop — it means the default group
is not behaving as "no change".

Also verify the standalone export does not bake in dynamically-rendered group rows
and double them on reopen — same class as the picker issue found in PR 3, and the
`file://` path serializes live DOM.

---

## Queued content tasks (not code)

None block PR 7. The basis backlog **does** gate PR 8 — a benchmark range shown per
vertical needs to know whether the input under it is per-store or company-wide.

| # | Task | Detail | Gates |
|---|---|---|---|
| 1 | **`GOV-02` / `TL-02` benchmark defaults** | Both read an input that was never defined (`audit_cycles_per_year`, `labor_reduction_pct`). Define the input with a benchmark, or drop the term from the formula | ungating 2 levers |
| 2 | **`DC-08` / `DC-09` / `AVN-08` formulas** | All three have declared inputs but no `calcSc` branch. Each needs a real formula written from the inputs it already declares | ungating 3 levers |
| 3 | **68 basis labels** | `BASIS_BACKLOG.md`, grouped by vertical with current label, unit, default and hint. Each needs its dimension stated in the label — "per Store", "per DC", "per Facility", "Company-wide" — after which `basis` follows from the label | **PR 8 catalog** |
| 4 | **Evidence re-tagging** | `EVIDENCE_REVIEW.md`. 7 levers tagged `Strong` on a single citation; 10 non-Emerging levers rest only on Tier 3; the 9 strategic levers declare no maturity at all. `WH-02` fails two rules at once | PR 8 maturity display |

---

## Open questions

1. **`DC-02` vs `DC-03`** — they share a citation, a name ("Stranded Asset Recovery
   — Capital Deferral"), the same input (`annual_it_capex`) and the same scale
   ruling. Needs the same diff `CAR-08`/`TL-03` got: same lever twice (retire one),
   or different buyers (mutually exclusive group), or genuinely both (dedup pool).
2. **Do strategic levers belong in the Step 6 headline?** Nine levers whose whole
   formula is one investment figure × an uplift percentage are soft benefits in
   hard-benefit clothing. Current thinking (`DECISIONS.md` §11) is a separate block
   below the hard benefit — a VP of Finance who spots a data-foundation line inside
   the payback calculation discounts the whole case.
3. **`CAR-07`** declares `annual_regulated_volume`, which its formula never reads.
   Wire it into the formula, or remove the input.
4. **Cost slider `sites` default** disagrees between the HTML attribute (`1`) and
   `VERTICAL_SLIDER_DEFAULTS.retail` (`50`). Which wins depends on whether
   `setSliderDefaults` has run. Resolve as part of step 1 above.
5. **WACC `0.10` has six definition sites.** One is now authoritative; the other
   five are fallbacks. Worth collapsing, low risk, not urgent.

---

## Reference files

| File | What it holds |
|---|---|
| `AUDIT.md` | Original 8-section audit + status of every finding, including the ones found during the work |
| `DECISIONS.md` | Every ruling and **why**, with the rejected alternative |
| `SCALE_REVIEW.md` | All 88 levers with their `scale` flag and reasoning |
| `BASIS_REVIEW.md` | `basis` classification, check B′ violations and how they were resolved |
| `BASIS_BACKLOG.md` | The 68 unclassified inputs, by vertical — content work |
| `EVIDENCE_REVIEW.md` | Levers per citation, maturity vs. evidence depth |
