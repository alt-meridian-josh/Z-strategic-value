# PR 7 — Proposed `scale` per lever (REVIEW GATE)

**Not applied.** A wrong flag double-counts a benefit across every site, so this table is the gate.

## Report A — what drives the badges

There is no `tag` field. Two separate fields drive the two indicators:

| Catalog element | Source field | Rendered via | Values in use |
|---|---|---|---|
| **HARD LABOR / HARD COST / WORKING CAP.** badge | **`sc.rampType`** | `RAMP[rampType].label`, colour from `rampColors[rampType]` | `hard_cost` 42, `hard_labor` 21, `strategic` 9, `revenue` 7, `working_cap` 6, `soft` 3 |
| **Maturity** (`●○○ Emerging`) | **`sc.evidence`** | `evDots` / `evLabel` | `Strong`, `Medium-Strong`, `Medium`, `Emerging` |

`rampType` is the field to seed `scale` from — it already encodes labour vs cost vs working capital.

## Decision rules applied

| Rule | Result |
|---|---|
| Lever's own inputs already count sites (`num_stores`, `sites`, …) | **enterprise** — overrides badge; multiplying would double-count |
| `WORKING CAP.` | **enterprise** (your seed) |
| `HARD LABOR` | **site** (your seed) |
| `SOFT PROD.` | **site** — productivity recovered per facility |
| `STRATEGIC` | **enterprise** — accrues once to the org |
| `REVENUE` | **site** if the revenue input is per-site, **enterprise** if it is a company total |
| `HARD COST` | **site** if spend is incurred per facility, **enterprise** if the cost base is a company-wide total |
| Gated levers | **n/a** — assign when a formula exists |

**Totals: site 67 · enterprise 16 · n/a 5**

## The 16 enterprise + 5 n/a rows — read these first

| id | lever | vertical | badge | scale | why |
|---|---|---|---|---|---|
| `RET-06` | Associate Productivity — Recovered Hours | retail | SOFT PROD. | **enterprise** | input already counts sites (num_stores) — multiplying would double-count |
| `RET-07` | Omnichannel Fulfillment — BOPIS Accuracy | retail | WORKING CAP. | **enterprise** | seeded: WORKING CAP. |
| `RET-08` | Safety Stock Reduction — Carrying Cost | retail | WORKING CAP. | **enterprise** | seeded: WORKING CAP. |
| `WH-05` | Safety Stock Reduction — Carrying Cost Savin | warehouse | WORKING CAP. | **enterprise** | seeded: WORKING CAP. |
| `GOV-02` | Annual Physical Inventory Labor Reduction | government | HARD LABOR | **n/a** | gated — no formula; assign scale when the formula lands |
| `MTL-02` | WIP Inventory — Cycle Time & Carrying Cost R | manufacturing | WORKING CAP. | **enterprise** | seeded: WORKING CAP. |
| `MTL-05` | MRO Inventory Optimization — Carrying Cost R | manufacturing | WORKING CAP. | **enterprise** | seeded: WORKING CAP. |
| `IE-03` | MRO Spare Parts — Carrying Cost & NPT Reduct | energy | WORKING CAP. | **enterprise** | seeded: WORKING CAP. |
| `RET-09` | RFID Data Foundation for Retail AI & Analyti | retail | STRATEGIC | **enterprise** | strategic value accrues once to the org, not per site |
| `WH-07` | RFID Data Foundation for Warehouse AI & Auto | warehouse | STRATEGIC | **enterprise** | strategic value accrues once to the org, not per site |
| `HC-08` | RFID Data Foundation for Healthcare AI & Pre | healthcare | STRATEGIC | **enterprise** | strategic value accrues once to the org, not per site |
| `MTL-08` | RFID Data Foundation for Manufacturing AI &  | manufacturing | STRATEGIC | **enterprise** | strategic value accrues once to the org, not per site |
| `HOS-06` | Hospitality AI & Guest Personalization Data  | hospitality | STRATEGIC | **enterprise** | strategic value accrues once to the org, not per site |
| `DC-07` | RFID Data Foundation for DCIM & Capacity Pla | datacenter | STRATEGIC | **enterprise** | strategic value accrues once to the org, not per site |
| `CAR-08` | RFID Data Foundation for Carrier AI & Networ | carriers | STRATEGIC | **enterprise** | strategic value accrues once to the org, not per site |
| `TL-02` | Routing Guide Compliance — Shipper-Side Visi | carriers | HARD COST | **n/a** | gated — no formula; assign scale when the formula lands |
| `TL-03` | RFID Data Foundation for Logistics AI & Netw | carriers | STRATEGIC | **enterprise** | strategic value accrues once to the org, not per site |
| `IE-07` | RFID Data Foundation for Energy & Constructi | energy | STRATEGIC | **enterprise** | strategic value accrues once to the org, not per site |
| `DC-08` | Ghost Server Carbon Overpurchase Reduction | datacenter | HARD COST | **n/a** | gated — no formula; assign scale when the formula lands |
| `DC-09` | SEC Scope 2 Disclosure — Assurance Cost & Re | datacenter | HARD COST | **n/a** | gated — no formula; assign scale when the formula lands |
| `AVN-08` | CORSIA Carbon Credit Overpurchase Reduction | aviation | HARD COST | **n/a** | gated — no formula; assign scale when the formula lands |

## Full 88-row table

| id | lever | vertical | badge | proposed scale | reason |
|---|---|---|---|---|---|
| `RET-01` | Inventory Accuracy — Cycle Count Labor | retail | HARD LABOR | site | seeded: HARD LABOR |
| `RET-02` | On-Shelf Availability — Stockout Recovery | retail | REVENUE | site | revenue input is per-site (e.g. annual_store_revenue) — scales with sites |
| `RET-03` | Shrink Reduction — Loss Prevention | retail | HARD COST | site | spend is incurred per facility and scales with site count |
| `RET-04` | Markdown Reduction — Better Sell-Through | retail | REVENUE | site | revenue input is per-site (e.g. annual_store_revenue) — scales with sites |
| `RET-05` | Receiving Accuracy & Labor | retail | HARD LABOR | site | seeded: HARD LABOR |
| `RET-06` | Associate Productivity — Recovered Hours | retail | SOFT PROD. | **enterprise** | input already counts sites (num_stores) — multiplying would double-count |
| `RET-07` | Omnichannel Fulfillment — BOPIS Accuracy | retail | WORKING CAP. | **enterprise** | seeded: WORKING CAP. |
| `RET-08` | Safety Stock Reduction — Carrying Cost | retail | WORKING CAP. | **enterprise** | seeded: WORKING CAP. |
| `WH-01` | Cycle Count Labor — Perpetual DC Accuracy | warehouse | HARD LABOR | site | seeded: HARD LABOR |
| `WH-02` | Receiving Throughput & Dock-to-Stock | warehouse | HARD LABOR | site | seeded: HARD LABOR |
| `WH-03` | Pick Accuracy & Returns Reduction | warehouse | HARD COST | site | spend is incurred per facility and scales with site count |
| `HC-01` | Equipment Rental Reduction & Asset Utilizati | healthcare | HARD COST | site | spend is incurred per facility and scales with site count |
| `HC-02` | Surgical Instrument Tracking — OR Throughput | healthcare | HARD COST | site | spend is incurred per facility and scales with site count |
| `GOV-01` | Audit Readiness — Property NFR & CAP Reducti | government | HARD COST | site | spend is incurred per facility and scales with site count |
| `MTL-01` | Tool & Asset Loss Reduction | manufacturing | HARD COST | site | spend is incurred per facility and scales with site count |
| `CAR-01` | Trailer Utilization & Yard Visibility | carriers | REVENUE | site | revenue input is per-site (e.g. annual_store_revenue) — scales with sites |
| `TL-01` | Detention & Dwell Cost Reduction | carriers | HARD COST | site | spend is incurred per facility and scales with site count |
| `WH-04` | SLA Compliance — 3PL Chargeback Reduction | warehouse | HARD COST | site | spend is incurred per facility and scales with site count |
| `WH-05` | Safety Stock Reduction — Carrying Cost Savin | warehouse | WORKING CAP. | **enterprise** | seeded: WORKING CAP. |
| `WH-06` | Cross-Dock & Outbound Verification Labor | warehouse | HARD LABOR | site | seeded: HARD LABOR |
| `HC-03` | Patient Flow — ED Length of Stay Reduction | healthcare | REVENUE | site | revenue input is per-site (e.g. annual_store_revenue) — scales with sites |
| `HC-04` | Medication Tracking — Dispensing Error Reduc | healthcare | HARD COST | site | spend is incurred per facility and scales with site count |
| `HC-05` | Joint Commission Audit — Compliance Labor Re | healthcare | HARD LABOR | site | seeded: HARD LABOR |
| `HC-06` | Supply Stockout & Expiry Reduction | healthcare | HARD COST | site | spend is incurred per facility and scales with site count |
| `HC-07` | Controlled Substance Diversion Prevention | healthcare | HARD COST | site | spend is incurred per facility and scales with site count |
| `GOV-02` | Annual Physical Inventory Labor Reduction | government | HARD LABOR | **n/a** | gated — no formula; assign scale when the formula lands |
| `GOV-03` | Ghost Asset Elimination — Procurement Avoida | government | HARD COST | site | spend is incurred per facility and scales with site count |
| `GOV-04` | Property Accountability Staff Overhead Reduc | government | HARD LABOR | site | seeded: HARD LABOR |
| `GOV-05` | Sensitive Item Loss Prevention | government | HARD COST | site | spend is incurred per facility and scales with site count |
| `MTL-02` | WIP Inventory — Cycle Time & Carrying Cost R | manufacturing | WORKING CAP. | **enterprise** | seeded: WORKING CAP. |
| `MTL-03` | Compliance & Traceability Documentation Labo | manufacturing | HARD LABOR | site | seeded: HARD LABOR |
| `MTL-04` | Recall Scope Reduction — Targeted Traceabili | manufacturing | HARD COST | site | spend is incurred per facility and scales with site count |
| `MTL-05` | MRO Inventory Optimization — Carrying Cost R | manufacturing | WORKING CAP. | **enterprise** | seeded: WORKING CAP. |
| `MTL-06` | Finished Goods Shipment Accuracy — Chargebac | manufacturing | HARD COST | site | spend is incurred per facility and scales with site count |
| `MTL-07` | Asset & Fixture Tracking — Utilization & Pro | manufacturing | HARD COST | site | spend is incurred per facility and scales with site count |
| `CAR-02` | OS&D Claim Reduction — Load Verification Acc | carriers | HARD COST | site | spend is incurred per facility and scales with site count |
| `CAR-03` | Hub Sortation Labor — Barcode to RFID Throug | carriers | HARD LABOR | site | seeded: HARD LABOR |
| `CAR-04` | Misroute Reduction — Package Recovery Cost A | carriers | HARD COST | site | spend is incurred per facility and scales with site count |
| `CAR-05` | Trailer Search Time & Yard Labor Elimination | carriers | HARD LABOR | site | seeded: HARD LABOR |
| `AVN-01` | Baggage Mishandling Reduction — Claims & Re- | aviation | HARD COST | site | spend is incurred per facility and scales with site count |
| `AVN-02` | MRO Tool Control — Search Time & FOD Risk Re | aviation | HARD LABOR | site | seeded: HARD LABOR |
| `AVN-03` | MRO Turnaround Time — Aircraft Utilization I | aviation | REVENUE | site | revenue input is per-site (e.g. annual_store_revenue) — scales with sites |
| `AVN-04` | Component Traceability — Compliance Labor &  | aviation | HARD LABOR | site | seeded: HARD LABOR |
| `AVN-05` | Safety Equipment Inspection Labor Reduction | aviation | HARD LABOR | site | seeded: HARD LABOR |
| `AVN-06` | Boarding Time Reduction — Passenger Throughp | aviation | REVENUE | site | revenue input is per-site (e.g. annual_store_revenue) — scales with sites |
| `HOS-01` | Linen Lifecycle — Loss Reduction & Laundry E | hospitality | HARD COST | site | spend is incurred per facility and scales with site count |
| `HOS-02` | F&B Inventory — Counting Labor & Shrink Cont | hospitality | HARD LABOR | site | seeded: HARD LABOR |
| `DC-01` | Physical Audit Acceleration — CMDB Accuracy | datacenter | HARD LABOR | site | seeded: HARD LABOR |
| `DC-02` | Stranded Asset Recovery — Capital Deferral | datacenter | HARD COST | site | spend is incurred per facility and scales with site count |
| `IE-01` | Tool, Vehicle & Equipment Tracking — Search  | energy | HARD COST | site | spend is incurred per facility and scales with site count |
| `IE-02` | PPE Compliance & Safety Audit Automation | energy | HARD COST | site | spend is incurred per facility and scales with site count |
| `IE-03` | MRO Spare Parts — Carrying Cost & NPT Reduct | energy | WORKING CAP. | **enterprise** | seeded: WORKING CAP. |
| `FS-01` | Food Waste Reduction — FEFO Management | foodservice | HARD COST | site | spend is incurred per facility and scales with site count |
| `FS-02` | Food Recall Traceability — Scope & Response  | foodservice | HARD COST | site | spend is incurred per facility and scales with site count |
| `FS-03` | Cold Chain Compliance — Spoilage & HACCP Doc | foodservice | HARD COST | site | spend is incurred per facility and scales with site count |
| `RET-09` | RFID Data Foundation for Retail AI & Analyti | retail | STRATEGIC | **enterprise** | strategic value accrues once to the org, not per site |
| `RET-10` | Vendor Chargeback & Compliance | retail | HARD COST | site | spend is incurred per facility and scales with site count |
| `RET-11` | Asset Protection — Investigation Labor | retail | HARD LABOR | site | seeded: HARD LABOR |
| `WH-07` | RFID Data Foundation for Warehouse AI & Auto | warehouse | STRATEGIC | **enterprise** | strategic value accrues once to the org, not per site |
| `HC-08` | RFID Data Foundation for Healthcare AI & Pre | healthcare | STRATEGIC | **enterprise** | strategic value accrues once to the org, not per site |
| `GOV-06` | Excess & Redundant Procurement Reduction | government | HARD COST | site | spend is incurred per facility and scales with site count |
| `MTL-08` | RFID Data Foundation for Manufacturing AI &  | manufacturing | STRATEGIC | **enterprise** | strategic value accrues once to the org, not per site |
| `HOS-03` | Guest Experience & Cashless Revenue — RFID W | hospitality | REVENUE | site | revenue input is per-site (e.g. annual_store_revenue) — scales with sites |
| `HOS-04` | Event & Venue Asset Management — Loss & Over | hospitality | HARD COST | site | spend is incurred per facility and scales with site count |
| `HOS-05` | Security & Access Control — Unauthorized Ent | hospitality | HARD COST | site | spend is incurred per facility and scales with site count |
| `HOS-06` | Hospitality AI & Guest Personalization Data  | hospitality | STRATEGIC | **enterprise** | strategic value accrues once to the org, not per site |
| `DC-03` | Stranded Asset Recovery — Capital Deferral & | datacenter | HARD COST | site | spend is incurred per facility and scales with site count |
| `DC-04` | Compliance Audit Burden — SOC2, PCI, ISO 270 | datacenter | HARD LABOR | site | seeded: HARD LABOR |
| `DC-05` | Asset Loss & Data Security Risk Reduction | datacenter | HARD COST | site | spend is incurred per facility and scales with site count |
| `DC-06` | Incident Response — Asset Locate Time & MTTR | datacenter | SOFT PROD. | site | productivity recovered per facility, like hard labor |
| `DC-07` | RFID Data Foundation for DCIM & Capacity Pla | datacenter | STRATEGIC | **enterprise** | strategic value accrues once to the org, not per site |
| `CAR-06` | Last-Mile Visibility — WISMO Contact Deflect | carriers | HARD COST | site | spend is incurred per facility and scales with site count |
| `CAR-07` | Regulated Mail & High-Value Parcel Complianc | carriers | HARD LABOR | site | seeded: HARD LABOR |
| `CAR-08` | RFID Data Foundation for Carrier AI & Networ | carriers | STRATEGIC | **enterprise** | strategic value accrues once to the org, not per site |
| `TL-02` | Routing Guide Compliance — Shipper-Side Visi | carriers | HARD COST | **n/a** | gated — no formula; assign scale when the formula lands |
| `TL-03` | RFID Data Foundation for Logistics AI & Netw | carriers | STRATEGIC | **enterprise** | strategic value accrues once to the org, not per site |
| `IE-04` | Oil & Gas Field Materials Management — Shrin | energy | HARD COST | site | spend is incurred per facility and scales with site count |
| `IE-05` | Asset Integrity Inspection — Documentation & | energy | HARD LABOR | site | seeded: HARD LABOR |
| `IE-06` | Rental & High-Value Equipment — Billing Disp | energy | HARD COST | site | spend is incurred per facility and scales with site count |
| `IE-07` | RFID Data Foundation for Energy & Constructi | energy | STRATEGIC | **enterprise** | strategic value accrues once to the org, not per site |
| `FS-04` | Food Recall Traceability — Scope & Response  | foodservice | HARD COST | site | spend is incurred per facility and scales with site count |
| `FS-05` | High-Value Inventory Shrink — Proteins, Alco | foodservice | HARD COST | site | spend is incurred per facility and scales with site count |
| `FS-06` | Demand Planning & Forecast Accuracy — Prep W | foodservice | SOFT PROD. | site | productivity recovered per facility, like hard labor |
| `FS-07` | Order Accuracy & Customer Refund Reduction | foodservice | HARD COST | site | spend is incurred per facility and scales with site count |
| `FS-08` | ESG & Sustainability Reporting Automation | foodservice | HARD LABOR | site | seeded: HARD LABOR |
| `DC-08` | Ghost Server Carbon Overpurchase Reduction | datacenter | HARD COST | **n/a** | gated — no formula; assign scale when the formula lands |
| `DC-09` | SEC Scope 2 Disclosure — Assurance Cost & Re | datacenter | HARD COST | **n/a** | gated — no formula; assign scale when the formula lands |
| `AVN-08` | CORSIA Carbon Credit Overpurchase Reduction | aviation | HARD COST | **n/a** | gated — no formula; assign scale when the formula lands |
