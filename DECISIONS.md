# Decisions and rationale

Why the tool behaves as it does. Each ruling below was a deliberate choice with an
alternative that was rejected; the rationale existed only in a review conversation
until this file. If you are about to reverse one of these, read the "why not the
alternative" line first — most of them are load-bearing.

Owner rulings are marked **[owner]**. Everything else was an implementation choice
made under the standing rules at the bottom of this file.

---

## 1. Gate a lever rather than invent a benchmark default **[owner]**

**Levers:** `GOV-02`, `TL-02` (formula reads an input that was never defined),
`DC-08`, `DC-09`, `AVN-08` (no `calcSc` branch at all).

**Decision.** These five are declared `gated` with a reason string, visible in the
catalog but not selectable. No value was invented to make them compute.

**Why.** Supplying a plausible default for `audit_cycles_per_year` or writing a
formula for `DC-08` would put a fabricated number into a customer-facing ROI. The
number would be indistinguishable from a discovered one. A gated lever is honest;
a confident wrong number is not.

**Why not the alternative.** Leaving them selectable was the status quo and it was
worse: `GOV-02` produced `NaN` that propagated into every figure, and `DC-08`
produced a static 675,000 unrelated to anything the analyst asked.

**Consequence.** Five levers are unavailable until someone supplies the content.
Tracked in `HANDOFF.md`.

---

## 2. `default:` and `catch:` return non-finite, not a confident number **[owner]**

**Decision.** `calcSc`'s fallthrough and its exception handler both return `NaN`
and log which lever and which branch fired. Previously both returned
`sc.annualBenefit` — the lever's static headline figure.

**Why.** The old behavior produced a plausible, round, confident number that had
nothing to do with the customer's inputs. Measured: `DC-08` returned 675,000 with
its six discovery inputs at benchmark, and returned 675,000 again with **every
input multiplied by ten**. The analyst runs a discovery call, the customer answers
six questions, and the answer changes nothing.

**Scope of the old `catch`.** At benchmark defaults it fired on zero levers. But
with `state.inputs[id]` absent, `p.anything` throws and **all 88 levers** returned
their headline number. The trigger count was three; the mechanism covered the
whole registry.

**Keep it even though `catch` is currently dead** — it is the guard for every
lever written from here on.

---

## 3. Blank means undiscovered, not zero — three states **[owner]**

**Decision.** `updateInput` stores `undefined` for a cleared field. A lever is
`gated` | `incomplete` | `available`, and an incomplete lever is excluded from
totals with the missing inputs named.

**Why.** `parseFloat(el.value)||0` turned a cleared field into a hard zero.
Clearing WH-01's loaded labour rate took it from 320,000 to **0** — the lever then
reads as "not worth much" rather than "we have not asked yet". Those are different
sentences, and the second one loses deals.

**Why not coalesce.** Cost lines *do* legitimately mean zero when blank (a row with
no year-2 spend costs nothing in year 2), and those are coalesced inside
`computeEngagement`. Discovery inputs are not: a blank labour rate is not $0/hr.

**Related:** `computeRowTotal` uses `(r.qty ?? 1)`, not `||`, so a typed `0`
quantity costs nothing while a blank still defaults to one unit.

---

## 4. Gating suppresses discovery collection, not just selection **[owner]**

**Decision.** A gated lever's questions are dropped from Step 3, the customer-facing
intake form, the save JSON, and the LLM prompt.

**Why.** The failure was never only a bad number. It was an analyst spending a
discovery call collecting six inputs that go nowhere, and a customer seeing their
own answers printed back on an intake form as though they had been used. If a
lever cannot compute, its questions do not get asked.

---

## 5. Scale is decided by input dimensionality, not by badge **[owner]**

**Decision.** `lever.scale` is `site` | `enterprise`. A lever is enterprise if any
required input is a company-wide aggregate; site otherwise. `rampType` seeds the
flag, the inputs decide it.

**The case that proves it.** `RET-06` is badged `SOFT PROD.`, which seeds to
`site`. But it takes `num_stores` as an input and computes
`num_stores × associates × hours × rate`. Flagged `site` and multiplied by a
420-store group, it would count 420 × 420 stores. **It is flagged `enterprise`
against its badge.**

**Why not keep it a judgment call.** Because the next one would not get caught.
See decision 6.

---

## 6. `basis` on every input, and check B′ **[owner]**

**Decision.** Every input declares
`basis: "per_site" | "enterprise" | "invariant" | null`. Boot check: **a lever with
scale `site` may not reference an enterprise-basis input.** Unclassified (`null`)
is reported, never boot-failing.

**Why not name patterns.** `total_*` and "across all" are string heuristics that
would miss the next case. The input declares its own dimension; the check is
mechanical.

**The asymmetry rule** *(the general rule for remaining ambiguity)* **[owner]**:

> Flip the **lever** when the input is inherently corporate.
> Fix the **input** when the lever is inherently local.

Applied to the five violations check B′ found:

| lever | input | resolution |
|---|---|---|
| `DC-02`, `DC-03` | `annual_it_capex` | lever → `enterprise` — an IT capital budget is set once at company level |
| `FS-08` | `annual_esg_labor_hours` | lever → `enterprise` — ESG reporting is a corporate function |
| `IE-01`, `MTL-01` | `total_tool_value` | input relabelled "per Facility", `basis: per_site` — a tool crib is facility-level and tool tracking deploys per facility |

`IE-01`/`MTL-01` is also the only reading that lets a two-plant engagement carry
different tool values per group.

**Classification of all 332 inputs:** 216 invariant (rates, ratios, per-unit times,
calendar constants — scale-free, cannot trip the check), 31 per_site, 17
enterprise, 68 unclassified (`BASIS_BACKLOG.md`).

---

## 7. `RET-01` and `WH-01` totals are per-unit, and the label is the fix **[owner]**

**`RET-01.total_sku_locations` is PER STORE.** The source data contradicted itself:
the discovery question said *"across all stores"* (enterprise) while the hint said
*"typical apparel store 20K–80K"* and the default of 50,000 sat inside that
per-store band. Two of three signals say per-store, it matches `WH-01`'s shape, and
it is the only reading that lets site groups vary — an enterprise total cannot be
split across a 300-store group and a 120-store group.

**The discovery question was the thing that was wrong.** Rewritten to *"in a
typical store"*.

**`WH-01.total_pallet_positions` is PER DC**, same ruling, relabelled.

**Classification and labelling are one task, not two.** The real defect was not
that the field was unclassified — it was that an analyst reading the label could
not tell either. Every classified input now states its dimension in the label:
"per Store", "per DC", "per Facility", "Company-wide".

**10× load flag** on `annual_store_revenue`, `total_sku_locations`,
`total_pallet_positions`, `total_tool_value`. Anyone who read the old wording may
have entered a company-wide figure. **Report, do not correct** — silently rescaling
someone's number is the same class of error as inventing one.

---

## 8. `AVN-07` is retired and must never be reused

Not a bug. The aviation sequence deliberately jumps `AVN-06` → `AVN-08`. The id is
in `RETIRED_LEVER_IDS` so the boot validator reports the gap as INFO, and a comment
sits at its sequence position.

**Why it must not be reused.** Saved engagements in the wild may still name it.
Rebinding the id would attach a customer's old inputs to a different lever — the
numbers would compute and be wrong. Confirmed absent from every saved engagement
JSON in the repo.

---

## 9. Dedup pool vs mutually exclusive — different mechanisms **[owner]**

Two levers can overlap in two distinct ways, and using the wrong mechanism states
something false.

| | **dedup pool** | **mutually exclusive** |
|---|---|---|
| claim | each lever owns a *share* of one asset | the levers describe *different buyers* of one asset |
| true when | a single customer really does realise both | no single customer realises both |
| example | `RET-09` + `WH-07` — a retailer with its own DC has one data foundation serving both | `CAR-08` + `TL-03` — parcel sortation vs freight load matching |
| behavior | shares replace per-lever haircuts | Select all picks **neither** and prompts |

**Why `CAR-08`/`TL-03` is not a pool.** A 50/50 split implies each contributes half
of one benefit. That is false in both directions: a parcel carrier realises
`CAR-08` fully and `TL-03` not at all. The operator who is genuinely both picks the
higher-value one deliberately and notes why.

**Select all never selects across an exclusive group** — it takes neither, rather
than picking one arbitrarily.

---

## 10. `state.sites[]` subsumes `i-sites` — one canonical site count **[owner]**

**Decision.** `state.sites[]` is the single source of truth. `i-sites` becomes a
derived read. The cost sliders read the derived total.

**Why.** Two site counts that can disagree is the WACC bug wearing a different hat:
WACC had six definition sites and the one that mattered was hardcoded, so the
control was decorative for the tool's entire life. A second site count would
reproduce that exactly.

**Not yet built** — see `HANDOFF.md`. This is deliberately the *first* step of the
runtime work, before anything multiplies.

---

## 11. Strategic levers should not sit in the headline **[owner, queued]**

Nine levers whose entire formula is one investment figure times an uplift
percentage are soft benefits wearing hard-benefit clothing. When PR 8 sets what
Step 6 leads with, strategic levers report in a **separate block below the hard
benefit**, not inside the headline.

**Why.** A VP of Finance who spots a data-foundation line inside the payback
calculation discounts the whole case.

---

## Standing rules for this work

1. **Push/PR is the gate, not commit.** Commits are cheap and hooks may force them.
   Never open a PR or merge without owner review. If a hook commits mid-work, say
   so and continue.
2. **The selftest stays green.** `?selftest=1` must pass before any push.
3. **Never update an expected fixture value without approval.** If a value moves,
   stop and show the delta. A fixture that changed to accommodate a refactor is a
   fixture that has stopped testing anything.
4. **Report rather than guess.** Where the data is genuinely ambiguous, list the
   ambiguity and leave it unclassified. Unclassified is a state the code handles;
   a guess is not.
5. **Do not fix things outside the stated scope.** Note them and move on.
6. **One PR per numbered block**, diff shown before it lands.
