# Building an Engagement JSON from intake — a template for Claude

**Purpose.** Turn *any* RFID value intake — a one-pager, a site-visit note, a
spreadsheet, or just three sentences in an email — into a drop-in
`strategic-value-engagement` JSON the tool loads via **Load analysis** (or the
**Browse profiles** door once added to `examples/profiles.json`). Once loaded,
the same JSON drives **every** output: the on-screen ROI model, the PDF
appraisal, the PPTX deck, and the AI prompt. Build the JSON once; export
anything.

This is the *authoring* guide. For the formal field list see
[`schema_v2.md`](schema_v2.md). For a complete, thorough worked example see
[`examples/bd_peripheral_intervention.json`](../examples/bd_peripheral_intervention.json)
(BD Peripheral Intervention — 12 custom levers, full cost model, provenance).

---

## 0. The core idea

The JSON is the app's only persistent state. The tool recomputes everything from
it through one honest engine (`calcNRV`): every benefit is passed through
**adoption ramp → accessibility decay → covariance haircut → finance credit**,
then discounted at WACC. **You supply inputs; the tool supplies the
conservatism.** Do not pre-discount or pre-haircut your numbers — give the tool
the *gross* loss pools and recovery rates and let it do the math. (This is why a
faithful JSON often shows a *smaller* NPV than a source spreadsheet that applied
ramp only — the tool also applies the haircut and finance credit.)

A benefit lever is almost always:

```
annual benefit  =  loss_pool  ×  recovery_rate
```

`loss_pool` is the customer's money at risk (their number wherever possible);
`recovery_rate` is the conservative end of the published evidence for how much
RFID realistically recovers.

---

## 1. The fastest path (sparse intake)

When intake is "just a few things", produce the **minimal viable JSON**. Every
v2 key is optional; the tool fills defaults. The smallest useful file:

```json
{
  "_type": "strategic-value-engagement",
  "_version": 2,
  "_label": "Acme Co — first pass",
  "engagement": { "company": "Zebra Technologies", "customer": "Acme Co",
                  "title": "RFID Value Assessment", "sites": 1,
                  "seller": "", "email": "", "partners": "",
                  "pain": "<the discovery signal in the customer's own words>" },
  "verticals": ["retail"],
  "selectedIds": [],
  "customScenarios": [
    { "id": "C-01", "name": "Shrink reduction", "custom": true, "active": true,
      "theme": "Direct Cost & Spend", "rampType": "hard_cost",
      "accessibilityTier": "configured", "haircut": 0.10,
      "formula": "loss_pool * recovery_rate",
      "inputs": { "loss_pool": 400000, "recovery_rate": 0.20 } }
  ],
  "costRows": [
    { "label": "Hardware + tags (rough)", "qty": 1, "unitCost": 150000,
      "yr0": 150000, "yr1": 0, "yr2": 0, "cadence": "one-time" },
    { "label": "Software (annual)", "qty": 1, "unitCost": 40000,
      "yr0": 0, "yr1": 40000, "yr2": 40000, "cadence": "annual" }
  ]
}
```

That loads and computes. Everything else (`wacc`, `financeCredit`, `decay`,
`technologies`, `_provenance`, `annotations`) is optional — add it as intake
gets richer. **Never invent precision the intake doesn't have**; use a round
placeholder, mark it confidence `C` (see §5), and note it in `annotations`.

---

## 2. Build order

1. **Envelope** — `_type:"strategic-value-engagement"`, `_version:2`, a human
   `_label`, optional `_notice` (a banner caveat, e.g. "first-pass estimates").
2. **`engagement`** — identity. `company` = the **vendor presenting** (usually
   "Zebra Technologies"); `customer` = the account; `title`; `sites` (location
   count — feeds slider defaults only); `seller`, `email`, `partners`; `pain` =
   the discovery signal, ideally the customer's own words (it appears on the PDF
   cover and seeds the AI prompt).
3. **`verticals`** — one or more of: `retail`, `warehouse`, `manufacturing`,
   `healthcare`, `government`, `carriers`, `aviation`, `hospitality`,
   `datacenter`, `energy`, `foodservice`. Drives cost-slider defaults and the
   library-lever picker.
4. **Levers** — `selectedIds` (library) and/or `customScenarios` (custom). §3.
5. **Costs** — `costRows`, `contingencyRate`, `costs`. §4.
6. **Confidence** — `_provenance`, `annotations`. §5.
7. **Model knobs** — `wacc`, `financeCredit`, `decay`. §6 (usually leave default).

---

## 3. Levers

### 3a. Library vs custom

- **Library lever** — if the intake maps cleanly onto a bundled scenario
  (e.g. retail shrink, warehouse cycle-count), reference it by id in
  `selectedIds` and override its inputs in `inputs`. The library ids and their
  named inputs live in `SCENARIOS` in `index.html` (e.g. `RET-03` shrink takes
  `annual_store_revenue`, `shrink_pct_baseline`, `shrink_reduction_pct`).
- **Custom lever** — if there is no clean match (most consultative analyses),
  author a `customScenarios[]` entry. This is the general, recommended path.

### 3b. The custom-lever object

```json
{ "id": "C-01",                       // any unique id; "C-01", "BD-04", etc.
  "name": "Expiry / scrap reduction",
  "custom": true, "active": true,
  "theme": "Direct Cost & Spend",     // display grouping (see list below)
  "rampType": "hard_cost",            // governs the ramp curve (see picker)
  "accessibilityTier": "configured",  // commodity | configured | infrastructure
  "haircut": 0.10,                    // covariance haircut; 0.10 = ×0.90
  "technologyIds": ["rfid", "platform"],
  "formula": "loss_pool * recovery_rate",
  "inputs": { "loss_pool": 5900000, "recovery_rate": 0.15 },
  "oneLiner": "FEFO rotation on real-time expiry data recovers product before it ages out",
  "evidence": { "confidence": "B", "citation": "CYBRA cath-lab [3,7]" } }
```

**Formula discipline (important).** The `formula` is evaluated by a safe parser
that allows only named inputs and `+ - * / ( )`. **No bare numbers** — every
coefficient must be a named input, or the customer-export gate blocks it. So
write `loss_pool * recovery_rate`, *not* `5900000 * 0.15`. Multi-term levers are
fine: `hours * rate * reduction_pct`. (Recognized unit conversions like `/60`
or `/3600` for minutes/seconds are permitted.)

### 3c. Picking `rampType`

The ramp type sets how fast the benefit is realized and whether finance credits
it at 100% or a fraction. Choose by the *mechanism that delivers the dollar*:

| `rampType` | Use for | Yr1→3 ramp | Finance credit |
|---|---|---|---|
| `hard_labor` | Hours × rate reductions (audit, count, putaway, investigation) | 50/85/100% | 100% |
| `hard_cost` | Direct P&L spend avoided (scrap, shrink, freight, chargebacks) | 50/85/100% | 100% |
| `revenue` | Top-line / margin recovery (stockouts, omnichannel) | 30/70/100% | × rate (default 40%) |
| `working_cap` | Inventory / safety-stock release → carrying cost | 20/60/100% | × rate (default 40%) |
| `soft` | Redeployed time, not cashable headcount | 25/65/100% | × rate (default 40%) |
| `strategic` | Risk/AI/data foundation; probabilistic avoidance (recall) | 0/20/60% (capped) | 100% |

Lead a case with `hard_labor` / `hard_cost`; they need no demand-side
assumptions and finance credits them fully. Be honest about `soft`/`revenue`.

### 3d. `theme` values

`Labor & Human Capacity`, `Direct Cost & Spend`, `Revenue / Margin`,
`Working Capital`, `Operational Efficiency`, `Regulatory & Compliance`,
`Strategic / AI / Data`. (Free-text is tolerated, but use these for clean
grouping.)

### 3e. `accessibilityTier` and `haircut`

- `accessibilityTier`: `configured` is the safe default. Use `commodity` for
  value that erodes fast as easy wins are taken; `infrastructure` for durable
  data-foundation value.
- `haircut`: default `0.10` (a 10% covariance trim so overlapping levers don't
  claim the same dollar). Raise it when two levers clearly share a loss pool, or
  model the overlap explicitly with a top-level `dedup` group (see `schema_v2.md`).

---

## 4. Cost model

`costRows[]` — each row needs **both** a `qty × unitCost` that multiplies to the
intended amount **and** the matching `yr0/yr1/yr2` buckets, plus a `cadence`
(`one-time`, `annual`, `monthly`, `per-site/yr`). Provide both because different
load paths read different fields:

```json
{ "label": "Initial tag deployment (500,000 × $0.15)",
  "qty": 500000, "unitCost": 0.15, "yr0": 75000, "yr1": 0, "yr2": 0,
  "cadence": "one-time" }
```

- **One-time** → put the amount in `yr0`. **Annual** → put it in `yr1` and
  `yr2` (with `yr0:0`). For a lump sum with no natural qty, use `qty:1`,
  `unitCost:<amount>`.
- **Contingency.** Two options: (a) set top-level `contingencyRate` (e.g.
  `0.07`) and the tool adds that % of Year-0 capital automatically; or (b) if
  the customer's contingency is a fixed figure on a *subset* of cost (common),
  add it as a normal one-time row and set `"contingencyRate": 0` to avoid
  double-counting.
- **`costs`** `{ attritionRate, annualTraining }` — extra recurring opex the
  engine adds on top of `costRows`. Defaults are `0.20` (× Year-0 capex) and
  `5000`/yr. **Set both to `0`** if the source case excludes backfill/training
  (state this in `annotations`).
- A pending/TBD line (e.g. an unquoted item) — include it as a `unitCost:0` row
  so it's visible without changing totals; note it in `annotations`.

---

## 5. Confidence, provenance, and missing data

Intake is rarely complete. Be explicit about what is solid vs. placeholder:

- **Confidence tiers** — `A` measured from the customer's systems; `B` a
  customer estimate or established industry benchmark; `C` an industry-standard
  fill where the customer left a field blank.
- **`_provenance`** — a sibling map keyed by lever id then input key. It lights
  up the in-app **Data Status** panel:

  ```json
  "_provenance": {
    "C-01": {
      "loss_pool": { "confidence": "B", "source": "Customer P&L line",
                     "needs": "Confirm scope of accounts" },
      "recovery_rate": { "confidence": "B", "source": "NRF 2023 [x]" }
    }
  }
  ```
- **`annotations.engagement`** — a short paragraph of caveats and open items.
- When you fill a blank with a benchmark, prefer the **conservative end** of the
  published range, mark it `B`/`C`, and say so. Do not silently invent numbers.

---

## 6. Model knobs (usually leave default)

| Key | Default | When to change |
|---|---|---|
| `wacc` | `0.10` | Set to the customer's finance hurdle (customer-mode UI bounds 8–12%). |
| `financeCredit` | `{ "enabled": true, "rate": 0.40 }` | Lower the rate for a stricter finance audience; keep enabled. |
| `decay` | `{ "useDecay": false, "g": 0.035 }` | Enable only when status-quo cost growth is defensible. |

Leaving these at default is the conservative, recommended choice.

---

## 7. Validation checklist

Before handing off, confirm:

- [ ] `_type` is `"strategic-value-engagement"` and `_version` is `2`.
- [ ] Every `customScenarios[].formula` uses **named inputs only** (no bare
      numbers) and every identifier appears in that lever's `inputs`.
- [ ] Each lever has a `rampType` from the table in §3c and `active: true`.
- [ ] `costRows` totals are intended; `contingencyRate` isn't double-counting a
      contingency row; `costs.attritionRate`/`annualTraining` are deliberate.
- [ ] Loss pools use the customer's numbers where given; recovery rates sit at
      or below the cited evidence.
- [ ] The benefit-to-cost ratio is plausible (the tool flags > 10× as a sign of
      a thin cost side — usually a missing recurring line).

**How to test it:** open the tool → **Load analysis** → pick the file. It should
land with no errors, show the levers in the ROI walk-down, and produce a
positive NRV. Add the file's key to `examples/profiles.json` to surface it in
the **Browse profiles** entry door. (For the repo, a fixture test like
`test/phase19_verify.js` asserts load, per-lever benefit, lint-clean formulas,
cost totals, and a save/load fixpoint.)

---

## 8. After it loads: exporting

Once the JSON is loaded, **all** exports are one click and read from the same
state — no separate build:

- **Export Full Appraisal (PDF)** — the 20+ page investment appraisal.
- **Export Deck (PPTX)** — the branded slide deck (objection-handler "selling
  tips" are intentionally **not** included in any deck).
- **Copy AI Prompt** — a structured brief for further AI analysis.
- **Export customer tool / standalone** — a self-contained `.html`.

So the workflow for any intake, sparse or thorough, is: **intake → this template
→ JSON → Load → export anything.**

---

## 9. Ready-to-paste prompt scaffold

Paste the block below into Claude, then append the raw intake. It instructs the
model to apply this guide and return only the JSON.

```
You are building a drop-in engagement JSON for the Zebra Strategic Value tool.
Follow docs/BUILDING_ENGAGEMENT_JSON.md exactly.

Rules:
- Output ONLY a single valid JSON object, no prose.
- _type:"strategic-value-engagement", _version:2.
- One customScenarios[] lever per distinct value area. Each benefit =
  loss_pool * recovery_rate (formula with NAMED inputs only — no bare numbers).
- Pick rampType by mechanism (hard_labor/hard_cost/revenue/working_cap/soft/
  strategic). haircut 0.10, accessibilityTier "configured" unless told otherwise.
- Use the customer's own loss pools where given; otherwise a conservative
  benchmark, marked confidence B or C in _provenance with a source + "needs".
- Costs: costRows with both qty*unitCost and yr0/yr1/yr2 + cadence. Use a
  TBD line at unitCost:0 for anything unquoted. Set contingencyRate:0 if you
  add an explicit contingency row.
- Leave wacc 0.10, financeCredit {enabled:true,rate:0.40}, decay off unless the
  intake says otherwise. Do NOT pre-discount or pre-haircut benefits.
- Put caveats and open items in annotations.engagement.
- If a field is unknown, use a round placeholder, mark it C, and note it. Never
  invent false precision.

INTAKE:
<paste the one-pager / notes / spreadsheet values here>
```

The result drops straight into **Load analysis**.
