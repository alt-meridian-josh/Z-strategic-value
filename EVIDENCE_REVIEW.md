# Evidence depth report — levers per citation, maturity vs. depth

Read-only. No lever, citation or maturity value was changed.

The tool states its own rules in the Help panel (Evidence Registry section):

> A scenario tagged **●●● Strong** typically has a Tier 1 source backing it — but what makes it
> Strong is that *multiple* sources agree. … a scenario backed only by Tier 3 sources will always
> be **Emerging** regardless of how reputable that Tier 3 publisher is.

Both halves are testable, and both are violated by the shipped registry.

## 1. Citations backing more than one lever

88 levers draw on 85 citations. Five citations back more than one sellable lever:

| citation | tier | levers | source |
|---|---|---|---|
| `EV-RET-ACC-01` | Tier 1 | **3** — RET-01, RET-07, RET-08 | RFID: The Right Time for Retail (Auburn University RFID Lab, 2022) |
| `EV-RET-LABOR-01` | **Tier 3** | 2 — RET-01, RET-06 | Retail Labor Productivity with RFID Cycle Counting (GS1 US Retail Team, 2023) |
| `EV-DC-STRANDED-01` | Tier 2 | 2 — DC-02, DC-03 | Stranded Asset Recovery and Capital Deferral in Data Centers (IDC / 451 Research, 2022) |
| `EV-FS-RECALL-01` | Tier 1 | 2 — FS-02, FS-04 | Food Recall Traceability and Scope Reduction (FDA FSMA 204 / GS1 US, 2023) |
| `EV-CAR-AI-01` | Tier 2 | 2 — CAR-08, TL-03 | RFID Data Foundation for Carrier AI and Network Optimization (McKinsey Logistics, 2023) |

`EV-RET-ACC-01` is the sharpest: one Auburn study underwrites three separately-sellable retail
levers — cycle-count labour, BOPIS accuracy and safety-stock reduction. If an analyst challenges
that study, three lines of the case move together.

`DC-02` / `DC-03` share both a citation **and** a name ("Stranded Asset Recovery — Capital
Deferral"), the same input (`annual_it_capex`) and the same scale ruling. Worth diffing on the
same basis as CAR-08 / TL-03 — they may be one lever twice.

## 2. Maturity claims that outrun evidence depth

**Seven levers claim `Strong` on a single citation**, against the stated "multiple sources agree":

| lever | citations |
|---|---|
| `RET-02`, `RET-03`, `WH-01`, `WH-02`, `HC-01`, `HC-02`, `GOV-01` | 1 each |

**Ten levers are non-Emerging but rest only on Tier 3 sources**, against the stated
"only Tier 3 => always Emerging":

`RET-05`, `RET-06`, `WH-02`, `WH-03`, `WH-06`, `CAR-04`, `CAR-05`, `DC-06`, `FS-07`, `MTL-06`

**`WH-02` fails both tests at once** — it is tagged `Strong`, has exactly one citation, and that
citation (`EV-WH-RECV-01`, "Receiving Throughput with RFID", GS1 US Warehousing Team) is Tier 3.
By the tool's own rule it should read `Emerging`. It is a warehouse labour lever, so it appears in
most DC engagements.

## 3. The nine strategic data-foundation levers

| lever | vertical | citation | tier | maturity declared |
|---|---|---|---|---|
| `RET-09` | retail | EV-RET-AI-01 | Tier 2 | **none** |
| `WH-07` | warehouse | EV-WH-AI-01 | Tier 2 | **none** |
| `HC-08` | healthcare | EV-HC-AI-01 | Tier 2 | **none** |
| `MTL-08` | manufacturing | EV-MTL-AI-01 | Tier 2 | **none** |
| `HOS-06` | hospitality | EV-HOS-AI-01 | Tier 2 | **none** |
| `DC-07` | datacenter | EV-DC-AI-01 | Tier 2 | **none** |
| `CAR-08` | carriers | EV-CAR-AI-01 | Tier 2 | **none** |
| `TL-03` | carriers | EV-CAR-AI-01 | Tier 2 | **none** |
| `IE-07` | energy | EV-IE-AI-01 | Tier 2 | **none** |

None of the nine declares an `evidence` field at all, so the catalog renders no maturity dot for
them. That is arguably the honest outcome — no claim rather than an unsupported one — but it is
silent rather than explicit, and a reader sees an absent badge rather than "Emerging".

All nine share one formula shape (`investment × uplift %`), one accessibility tier
(`infrastructure`) and one haircut (0.10), each on a single Tier 2 citation. This is the block
most exposed to the "soft benefit in hard-benefit clothing" objection.

## Suggested dispositions (none applied)

1. Re-tag the seven single-citation `Strong` levers, or add the corroborating sources that would
   justify the tag.
2. Re-tag the ten Tier-3-only levers to `Emerging`, per the tool's own rule. `WH-02` first.
3. Declare an explicit maturity on the nine strategic levers rather than leaving it absent.
4. Diff `DC-02` against `DC-03` for the same duplicate/exclusive question as CAR-08 / TL-03.

