# PR 7 amendment B′ — `basis` classification (REVIEW GATE)

**Not applied.** 97 inputs could not be classified without guessing, and check B′ flags 5 lever/input pairs that need a ruling.

## Classification of all 332 inputs

| basis | n | meaning |
|---|---|---|
| `invariant` | 216 | rates, ratios, per-unit times, calendar constants — scale-free, cannot trip check B′ |
| `enterprise` | 15 | company-wide aggregate or a site count |
| `per_site` | 4 | label or hint states a per-store / per-facility figure |
| **`AMBIGUOUS`** | **97** | extensive total with no per-site or enterprise signal — **needs your ruling** |

## ⚠ Check B′ violations — `site` lever referencing an `enterprise` input

Each needs one of: lever becomes `enterprise`, or the input is not really enterprise-basis.

| lever | name | vertical | offending input | label | default |
|---|---|---|---|---|---|
| `DC-02` | Stranded Asset Recovery — Capital Defe | datacenter | `annual_it_capex` | Annual IT Capital Budget ($) | 3000000 |
| `DC-03` | Stranded Asset Recovery — Capital Defe | datacenter | `annual_it_capex` | Annual IT Capital Budget ($) | 3000000 |
| `FS-08` | ESG & Sustainability Reporting Automat | foodservice | `annual_esg_labor_hours` | Annual ESG Reporting Labor Hours | 1500 |
| `IE-01` | Tool, Vehicle & Equipment Tracking — S | energy | `total_tool_value` | Total Tool & Equipment Value ($) | 5000000 |
| `MTL-01` | Tool & Asset Loss Reduction | manufacturing | `total_tool_value` | Total Tool Inventory Value ($) | 1500000 |

## The 97 ambiguous inputs

97 declarations across 90 distinct keys.

| input key | levers | label | unit | default | hint |
|---|---|---|---|---|---|
| `annual_admissions` | HC-04 | Annual Admissions | count | 25000 | Total inpatient admissions |
| `annual_ai_investment` | HC-08 | Annual Healthcare AI/Analytics Inv | $ | 750000 | Informatics + AI tools |
| `annual_aircraft_through` | AVN-03 | Aircraft Processed Annually | count | 120 | Total MRO throughput |
| `annual_analytics_budget` | RET-09 | Annual Analytics / AI Budget ($) | $ | 500000 | Data science + tools |
| `annual_ap_investigation_cost` | RET-11 | Annual AP Investigation Labor Pool | $ | 300000 | Investigator hours × loaded rate |
| `annual_assessor_fees` | DC-04 | Annual External Assessor Fees ($) | $ | 150000 | SOC2 + PCI assessors |
| `annual_asset_replacement` | HOS-04 | Annual AV/Event Asset Replacement  | $ | 300000 | From capex or ops budget |
| `annual_audit_prep_hours` | DC-04, HC-05 | Annual Audit Prep Hours (IT Asset  | hrs | 500 | All audit cycles combined |
| `annual_automation_spend` | WH-07 | Annual Automation Investment ($) | $ | 1000000 | AMR + WMS + automation tools |
| `annual_billing_disputes` | IE-06 | Annual Billing Disputes | count | 30 | From AP/vendor management |
| `annual_cap_consulting_spend` | GOV-01 | Annual CAP Consulting Spend ($) | $ | 800000 | Audit readiness contractors |
| `annual_chargeback_exposure` | RET-10 | Annual Chargeback / Dispute Exposu | $ | 600000 | From AP / merchandising records |
| `annual_compliance_exceptions` | IE-05 | Annual Compliance Exceptions/Citat | count | 12 | From HSE records |
| `annual_compliance_hours` | AVN-04 | Annual Traceability Documentation  | hrs | 8000 | Maintenance admin + QA |
| `annual_contracted_revenue` | WH-04 | Annual Contracted Revenue ($) | $ | 15000000 | Total 3PL contract value |
| `annual_cs_writeoffs` | HC-07 | Annual Controlled Substance Write- | $ | 500000 | Pharmacy records |
| `annual_dcim_investment` | DC-07 | Annual DCIM/Capacity Planning Inve | $ | 300000 | Platform + services |
| `annual_device_loss_events` | DC-05 | Annual Device Loss Events | count | 5 | From IT security records |
| `annual_digital_ops_investment` | IE-07 | Annual Digital Operations Investme | $ | 2000000 | Predictive maintenance + AI + IoT |
| `annual_ed_visits` | HC-03 | Annual ED Visits | count | 40000 | Total annual volume |
| `annual_emergency_procurement` | MTL-05 | Annual Emergency Procurement ($) | $ | 300000 | From AP records |
| `annual_equipment_budget` | GOV-03 | Annual Capital Equipment Budget ($ | $ | 5000000 | From budget submission |
| `annual_esg_audit_fees` | FS-08 | Annual External ESG Audit Fees ($) | $ | 80000 | Third-party assurance |
| `annual_expired_writeoffs` | HC-06 | Annual Expired Write-offs ($) | $ | 400000 | From supply chain records |
| `annual_fb_shrink` | HOS-02 | Annual F&B Shrink ($) | $ | 200000 | High-value category shrink |
| `annual_flipl_count` | GOV-05 | Annual FLIPL Investigations | count | 25 | From IG or legal records |
| `annual_food_spend` | FS-01, FS-06 | Annual Food Purchase Spend ($) | $ | 3000000 | Total food procurement |
| `annual_gate_revenue` | HOS-05 | Annual Gate Revenue ($) | $ | 5000000 | Total ticket/admission revenue |
| `annual_grounding_events` | AVN-04 | Annual Grounding Events (record-re | count | 3 | From ops records |
| `annual_guest_tech_investment` | HOS-06 | Annual Guest Technology Investment | $ | 400000 | CRM + analytics + AI |
| `annual_haccp_labor_hours` | FS-03 | Annual HACCP Documentation Hours | hrs | 2000 | QA + ops staff |
| `annual_hardware_incidents` | DC-06 | Annual Hardware-Related Incidents | count | 50 | From ITSM records |
| `annual_hse_labor_hours` | IE-02 | Annual HSE Compliance Labor Hours | hrs | 5000 | HSE + ops staff |
| `annual_hv_shrink` | FS-05 | Annual High-Value Category Shrink  | $ | 500000 | Proteins + alcohol + premiums |
| `annual_inbound_pallets` | WH-02 | Annual Inbound Pallets | count | 150000 | Total pallets received per year |
| `annual_industry40_investment` | MTL-08 | Annual Industry 4.0 / Digital Twin | $ | 1500000 | MES + AI + digital twin tools |
| `annual_inspection_labor_hours` | IE-05 | Annual Inspection Documentation Ho | hrs | 8000 | All inspection types combined |
| `annual_investigation_cost` | HC-07 | Annual Investigation Labor ($) | $ | 150000 | HR + pharmacy + compliance |
| `annual_investigation_labor` | DC-05 | Annual Investigation Labor ($) | $ | 100000 | IT security + HR + legal |
| `annual_linen_spend` | HOS-01 | Annual Linen Replacement Spend ($) | $ | 400000 | From purchasing records |
| `annual_loads` | TL-01 | Annual Loads | count | 50000 | Total loads per year |
| `annual_logistics_tech_investment` | TL-03 | Annual Logistics Technology Invest | $ | 1200000 | TMS + AI + visibility platforms |
| `annual_markdown_spend` | RET-04 | Annual Markdown Spend ($) | $ | 750000 | Typical apparel: 10–20% of revenue |
| `annual_network_opt_investment` | CAR-08 | Annual Network Optimization Invest | $ | 1000000 | AI + routing + analytics tools |
| `annual_nfrs_property_related` | GOV-01 | Property-Related NFRs (annual) | count | 85 | From last audit cycle |
| `annual_npt_events` | IE-03, IE-04 | Annual NPT Events (parts-related) | count | 4 | From ops records |
| `annual_or_cases` | HC-02 | Annual Surgical Cases | count | 8000 | Total OR cases per year |
| `annual_orders_picked` | WH-03 | Annual Orders Picked | count | 2000000 | Total pick events per year |
| `annual_osha_fines` | IE-02 | Annual OSHA/Safety Fine Exposure ( | $ | 150000 | From legal or HSE records |
| `annual_package_volume` | CAR-04 | Annual Package Volume | count | 5000000 | Total parcels through hub |
| `annual_passengers` | AVN-01 | Annual Passengers | count | 5000000 | Total enplaned passengers |
| `annual_procurement_budget` | GOV-06 | Annual Equipment Procurement Budge | $ | 8000000 | Capital equipment spend |
| `annual_rebooking_spend` | AVN-06 | Annual Rebooking & Voucher Spend ( | $ | 1500000 | From customer relations or ops |
| `annual_receiving_labor_hours` | RET-05 | Annual Receiving Labor Hours | hrs | 8000 | ~5 hrs/event × 4 events/wk × 52 wks |
| `annual_refunds_credits` | FS-07 | Annual Refunds & Customer Credits  | $ | 400000 | From POS or customer service records |
| `annual_regulated_volume` | CAR-07 | Annual Regulated Mail Volume | count | 100000 | Registered + certified + high-value |
| `annual_rental_overage` | IE-01 | Annual Rental Overage Spend ($) | $ | 300000 | Rentals for items already owned |
| `annual_rental_spend` | HC-01, IE-06 | Annual Equipment Rental Spend ($) | $ | 1200000 | IV pumps, vents, specialty equipment |
| `annual_revenue` | MTL-06 | Annual Revenue in Scope ($) | $ | 20000000 | Revenue from affected shipments |
| `annual_routing_chargebacks` | TL-02 | Annual Routing Guide Chargebacks ( | $ | 400000 | From AP records |
| `annual_sensitive_item_losses` | GOV-05 | Annual Sensitive Item Write-offs ( | $ | 500000 | From property book |
| `annual_setup_overtime` | HOS-04 | Annual Setup/Teardown Overtime ($) | $ | 150000 | From payroll records |
| `annual_shipments` | CAR-02 | Annual Shipments | count | 200000 | Total outbound shipments |
| `annual_spoilage_cost` | FS-03 | Annual Spoilage from Temp Excursio | $ | 250000 | From QA rejection records |
| `annual_stockout_cost` | HC-06 | Annual Stockout Cost ($) | $ | 200000 | Emergency procurement + delay costs |
| `annual_visitors` | HOS-03 | Annual Visitors | count | 500000 | Total gate attendance |
| `annual_wismo_contacts` | CAR-06 | Annual WISMO Contacts | count | 500000 | From contact center records |
| `compliance_labor_hours` | CAR-07, MTL-03, TL-02 | Annual Compliance Documentation Ho | hrs | 3000 | Per item logging + reconciliation |
| `counting_labor_hours` | HOS-02 | Annual F&B Counting Labor Hours | hrs | 3000 | All BOH counting combined |
| `daily_aog_cost` | AVN-03 | Cost per AOG Day ($) | $ | 50000 | Lease + lost revenue: $30K–$150K |
| `expected_annual_recall_cost` | MTL-04 | Expected Annual Recall Cost ($) | $ | 1500000 | Historical cost × probability |
| `expected_recall_cost` | FS-02, FS-04 | Expected Annual Recall Cost ($) | $ | 2000000 | Historical × probability |
| `field_material_value` | IE-04 | Field Material Inventory Value ($) | $ | 10000000 | All tracked field materials |
| `fleet_size` | AVN-05 | Managed Fleet Size (aircraft) | count | 80 | Aircraft in scope |
| `inspection_hours_manual` | AVN-05 | Manual Inspection Hours per Aircra | hrs | 6 | Conservative: 4–8 hrs |
| `inspection_hours_rfid` | AVN-05 | RFID Inspection Hours per Aircraft | hrs | 0.5 | Under 30 min |
| `laundry_cost_annual` | HOS-01 | Annual Laundry Cost ($) | $ | 600000 | Including over-processing |
| `manual_divert_ftes` | CAR-03 | Manual Divert Lane FTEs | count | 8 | Per shift × shifts |
| `monthly_tool_search_events` | AVN-02 | Monthly Tool Search Events | count | 200 | Estimate from floor supervisors |
| `num_nursing_staff` | HC-01 | Nursing Staff in Scope | count | 200 | Staff affected by equipment search |
| `operating_days` | CAR-01 | Operating Days per Year | count | 250 | Typical carrier operating calendar |
| `outbound_labor_hours` | WH-06 | Annual Outbound Verification Hours | hrs | 10000 | All dock lanes combined |
| `property_ftes` | GOV-04 | Property Accountability FTEs | count | 12 | PBOs, ECOs, hand receipt holders |
| `security_labor_annual` | HOS-05 | Annual Security Labor Cost ($) | $ | 800000 | Access verification staff |
| `total_asset_value` | MTL-07 | Total Reusable Asset Value ($) | $ | 2000000 | Fixtures, tooling, containers |
| `total_assets` | DC-01 | Total IT Assets in Scope | count | 5000 | Servers, switches, storage |
| `total_pallet_positions` | WH-01 | Total Pallet Positions | count | 25000 | DC positions in scope |
| `total_trailers` | CAR-01 | Total Trailers in Fleet | count | 500 | Trailers and yard assets |
| `total_wip_value` | MTL-02 | Total WIP Inventory Value ($) | $ | 5000000 | Average on-hand WIP |
| `yard_jockeys` | CAR-05 | Yard Jockeys / Spotters (FTEs) | count | 6 | Total across all shifts |

## Amendment H — the 9 data-foundation levers (report only)

Near-identical levers, one per vertical. All flagged `enterprise`, so each is counted once —
but a multi-vertical engagement selects several, and each bills for the **same** data foundation.

| lever | vertical | annualBenefit | inputs |
|---|---|---|---|
| `RET-09` | retail | 120000 | annual_analytics_budget, data_quality_uplift_pct |
| `WH-07` | warehouse | 140000 | annual_automation_spend, rfid_uplift_pct |
| `HC-08` | healthcare | 160000 | annual_ai_investment, rfid_uplift_pct |
| `MTL-08` | manufacturing | 180000 | annual_industry40_investment, rfid_uplift_pct |
| `HOS-06` | hospitality | 100000 | annual_guest_tech_investment, rfid_uplift_pct |
| `DC-07` | datacenter | 120000 | annual_dcim_investment, rfid_uplift_pct |
| `CAR-08` | carriers | 130000 | annual_network_opt_investment, rfid_uplift_pct |
| `TL-03` | carriers | 140000 | annual_logistics_tech_investment, rfid_uplift_pct |
| `IE-07` | energy | 150000 | annual_digital_ops_investment, rfid_uplift_pct |

### Engagements that could select more than one

| engagement shape | levers selected | double-counted |
|---|---|---|
| Retail + DC (the common one — a retailer with its own distribution) | `RET-09` + `WH-07` | one RFID data foundation billed twice |
| Manufacturer with a DC | `MTL-08` + `WH-07` | same |
| Carrier + logistics arm | `CAR-08` + `TL-03` | **same vertical key (`carriers`) — both appear in one picker selection** |
| Energy operator with MRO depot | `IE-07` + `WH-07` | same |
| Healthcare system with central supply | `HC-08` + `WH-07` | same |
| Hospitality group with commissary | `HOS-06` + `FS-*` | partial |

`CAR-08` and `TL-03` are the sharpest case: both carry `verticalKey:"carriers"`, so selecting the
Carriers vertical surfaces both, and 'Select all' takes both by default.

Suggested PR 8 rule: one shared-loss pool `data_foundation` covering all nine, since the underlying
asset (item-level data) is bought once. Shares by vertical weight rather than summing. Not applied.
