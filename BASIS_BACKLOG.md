# `basis` backlog — inputs still unclassified

Ruling K scoped classification to retail, warehouse, healthcare and manufacturing.
These 68 inputs sit in the other seven verticals and are **unclassified** (`basis: null`).

Check B' treats unclassified as **REPORT, never fail** — the app boots and lists them as INFO.
They cannot trip the site/enterprise check until classified.

## Labelling is the fix (amendment L)

Each row needs its dimension stated in the label — "per Store", "per DC", "per Facility"
or "Company-wide" — at which point `basis` follows from the label rather than from a guess.

### aviation (10)

| lever | input | current label | unit | default | hint |
|---|---|---|---|---|---|
| `AVN-01` | `annual_passengers` | Annual Passengers | count | 5000000 | Total enplaned passengers |
| `AVN-02` | `monthly_tool_search_events` | Monthly Tool Search Events | count | 200 | Estimate from floor supervisors |
| `AVN-03` | `annual_aircraft_through` | Aircraft Processed Annually | count | 120 | Total MRO throughput |
| `AVN-03` | `daily_aog_cost` | Cost per AOG Day ($) | $ | 50000 | Lease + lost revenue: $30K–$150K |
| `AVN-04` | `annual_compliance_hours` | Annual Traceability Documentation  | hrs | 8000 | Maintenance admin + QA |
| `AVN-04` | `annual_grounding_events` | Annual Grounding Events (record-re | count | 3 | From ops records |
| `AVN-05` | `fleet_size` | Managed Fleet Size (aircraft) | count | 80 | Aircraft in scope |
| `AVN-05` | `inspection_hours_manual` | Manual Inspection Hours per Aircra | hrs | 6 | Conservative: 4–8 hrs |
| `AVN-05` | `inspection_hours_rfid` | RFID Inspection Hours per Aircraft | hrs | 0.5 | Under 30 min |
| `AVN-06` | `annual_rebooking_spend` | Annual Rebooking & Voucher Spend ( | $ | 1500000 | From customer relations or ops |

### carriers (14)

| lever | input | current label | unit | default | hint |
|---|---|---|---|---|---|
| `CAR-01` | `operating_days` | Operating Days per Year | count | 250 | Typical carrier operating calendar |
| `CAR-01` | `total_trailers` | Total Trailers in Fleet | count | 500 | Trailers and yard assets |
| `CAR-02` | `annual_shipments` | Annual Shipments | count | 200000 | Total outbound shipments |
| `CAR-03` | `manual_divert_ftes` | Manual Divert Lane FTEs | count | 8 | Per shift × shifts |
| `CAR-04` | `annual_package_volume` | Annual Package Volume | count | 5000000 | Total parcels through hub |
| `CAR-05` | `yard_jockeys` | Yard Jockeys / Spotters (FTEs) | count | 6 | Total across all shifts |
| `CAR-06` | `annual_wismo_contacts` | Annual WISMO Contacts | count | 500000 | From contact center records |
| `CAR-07` | `annual_regulated_volume` | Annual Regulated Mail Volume | count | 100000 | Registered + certified + high-valu |
| `CAR-07` | `compliance_labor_hours` | Annual Compliance Documentation Ho | hrs | 3000 | Per item logging + reconciliation |
| `CAR-08` | `annual_network_opt_investment` | Annual Network Optimization Invest | $ | 1000000 | AI + routing + analytics tools |
| `TL-01` | `annual_loads` | Annual Loads | count | 50000 | Total loads per year |
| `TL-02` | `annual_routing_chargebacks` | Annual Routing Guide Chargebacks ( | $ | 400000 | From AP records |
| `TL-02` | `compliance_labor_hours` | Annual Compliance Resolution Labor | hrs | 2000 | Ops + admin + disputes |
| `TL-03` | `annual_logistics_tech_investment` | Annual Logistics Technology Invest | $ | 1200000 | TMS + AI + visibility platforms |

### datacenter (7)

| lever | input | current label | unit | default | hint |
|---|---|---|---|---|---|
| `DC-01` | `total_assets` | Total IT Assets in Scope | count | 5000 | Servers, switches, storage |
| `DC-04` | `annual_assessor_fees` | Annual External Assessor Fees ($) | $ | 150000 | SOC2 + PCI assessors |
| `DC-04` | `annual_audit_prep_hours` | Annual Audit Prep Hours (IT Asset  | hrs | 500 | All audit cycles combined |
| `DC-05` | `annual_device_loss_events` | Annual Device Loss Events | count | 5 | From IT security records |
| `DC-05` | `annual_investigation_labor` | Annual Investigation Labor ($) | $ | 100000 | IT security + HR + legal |
| `DC-06` | `annual_hardware_incidents` | Annual Hardware-Related Incidents | count | 50 | From ITSM records |
| `DC-07` | `annual_dcim_investment` | Annual DCIM/Capacity Planning Inve | $ | 300000 | Platform + services |

### energy (11)

| lever | input | current label | unit | default | hint |
|---|---|---|---|---|---|
| `IE-01` | `annual_rental_overage` | Annual Rental Overage Spend ($) | $ | 300000 | Rentals for items already owned |
| `IE-02` | `annual_hse_labor_hours` | Annual HSE Compliance Labor Hours | hrs | 5000 | HSE + ops staff |
| `IE-02` | `annual_osha_fines` | Annual OSHA/Safety Fine Exposure ( | $ | 150000 | From legal or HSE records |
| `IE-03` | `annual_npt_events` | Annual NPT Events (parts-related) | count | 4 | From ops records |
| `IE-04` | `annual_npt_events` | NPT Events from Material Unavailab | count | 6 | From ops records |
| `IE-04` | `field_material_value` | Field Material Inventory Value ($) | $ | 10000000 | All tracked field materials |
| `IE-05` | `annual_compliance_exceptions` | Annual Compliance Exceptions/Citat | count | 12 | From HSE records |
| `IE-05` | `annual_inspection_labor_hours` | Annual Inspection Documentation Ho | hrs | 8000 | All inspection types combined |
| `IE-06` | `annual_billing_disputes` | Annual Billing Disputes | count | 30 | From AP/vendor management |
| `IE-06` | `annual_rental_spend` | Annual High-Value Equipment Rental | $ | 3000000 | All rental categories in scope |
| `IE-07` | `annual_digital_ops_investment` | Annual Digital Operations Investme | $ | 2000000 | Predictive maintenance + AI + IoT |

### foodservice (9)

| lever | input | current label | unit | default | hint |
|---|---|---|---|---|---|
| `FS-01` | `annual_food_spend` | Annual Food Purchase Spend ($) | $ | 3000000 | Total food procurement |
| `FS-02` | `expected_recall_cost` | Expected Annual Recall Cost ($) | $ | 2000000 | Historical × probability |
| `FS-03` | `annual_haccp_labor_hours` | Annual HACCP Documentation Hours | hrs | 2000 | QA + ops staff |
| `FS-03` | `annual_spoilage_cost` | Annual Spoilage from Temp Excursio | $ | 250000 | From QA rejection records |
| `FS-04` | `expected_recall_cost` | Expected Annual Recall Cost ($) | $ | 2000000 | Historical × probability |
| `FS-05` | `annual_hv_shrink` | Annual High-Value Category Shrink  | $ | 500000 | Proteins + alcohol + premiums |
| `FS-06` | `annual_food_spend` | Annual Food Purchase Spend ($) | $ | 3000000 | Total food procurement |
| `FS-07` | `annual_refunds_credits` | Annual Refunds & Customer Credits  | $ | 400000 | From POS or customer service recor |
| `FS-08` | `annual_esg_audit_fees` | Annual External ESG Audit Fees ($) | $ | 80000 | Third-party assurance |

### government (7)

| lever | input | current label | unit | default | hint |
|---|---|---|---|---|---|
| `GOV-01` | `annual_cap_consulting_spend` | Annual CAP Consulting Spend ($) | $ | 800000 | Audit readiness contractors |
| `GOV-01` | `annual_nfrs_property_related` | Property-Related NFRs (annual) | count | 85 | From last audit cycle |
| `GOV-03` | `annual_equipment_budget` | Annual Capital Equipment Budget ($ | $ | 5000000 | From budget submission |
| `GOV-04` | `property_ftes` | Property Accountability FTEs | count | 12 | PBOs, ECOs, hand receipt holders |
| `GOV-05` | `annual_flipl_count` | Annual FLIPL Investigations | count | 25 | From IG or legal records |
| `GOV-05` | `annual_sensitive_item_losses` | Annual Sensitive Item Write-offs ( | $ | 500000 | From property book |
| `GOV-06` | `annual_procurement_budget` | Annual Equipment Procurement Budge | $ | 8000000 | Capital equipment spend |

### hospitality (10)

| lever | input | current label | unit | default | hint |
|---|---|---|---|---|---|
| `HOS-01` | `annual_linen_spend` | Annual Linen Replacement Spend ($) | $ | 400000 | From purchasing records |
| `HOS-01` | `laundry_cost_annual` | Annual Laundry Cost ($) | $ | 600000 | Including over-processing |
| `HOS-02` | `annual_fb_shrink` | Annual F&B Shrink ($) | $ | 200000 | High-value category shrink |
| `HOS-02` | `counting_labor_hours` | Annual F&B Counting Labor Hours | hrs | 3000 | All BOH counting combined |
| `HOS-03` | `annual_visitors` | Annual Visitors | count | 500000 | Total gate attendance |
| `HOS-04` | `annual_asset_replacement` | Annual AV/Event Asset Replacement  | $ | 300000 | From capex or ops budget |
| `HOS-04` | `annual_setup_overtime` | Annual Setup/Teardown Overtime ($) | $ | 150000 | From payroll records |
| `HOS-05` | `annual_gate_revenue` | Annual Gate Revenue ($) | $ | 5000000 | Total ticket/admission revenue |
| `HOS-05` | `security_labor_annual` | Annual Security Labor Cost ($) | $ | 800000 | Access verification staff |
| `HOS-06` | `annual_guest_tech_investment` | Annual Guest Technology Investment | $ | 400000 | CRM + analytics + AI |

