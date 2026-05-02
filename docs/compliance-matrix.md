# Compliance Matrix

This matrix is implementation guidance, not legal advice. A Malaysia healthcare lawyer and clinic compliance lead must review production workflows.

## PDPA

- Maintain versioned privacy notices.
- Capture separate consent for clinical care, marketing, guardian/minor access, telehealth, disclosure, and data sharing.
- Support withdrawal, access, correction, and export requests.
- Assess DPO threshold and register through SPDP when required.
- Run a 72-hour data breach notification workflow with evidence capture and affected-subject decisioning.
- Keep processor/vendor register and cross-border transfer basis.

## CKAPS / Private Clinic Governance

- Store branch registration records.
- Store OYB/person-in-charge mapping.
- Track complaints, incidents, assessable events, SOP evidence, staff credentials, APC, indemnity, and locum assignments.

## MMC Medical Records

- No hard delete of medical records.
- Corrections preserve original content, author, timestamp, and reason.
- Track medical report requests, doctor review, consent verification, fees, deadlines, and release audit.
- Log chart read, write, export, and print activity.

## MOH OHS 2025

- Keep teleconsultation, chat care, e-prescription, and delivery disabled until feature gates are passed.
- Block emergency, complex, prohibited psychiatric, psychotropic-by-post, and dangerous-drug-by-post scenarios.
- Use official platform-only care communication, not WhatsApp or social media care delivery.

## MAB Advertising

- Health-service ads, promotions, testimonials, superlatives, and internet campaigns require review.
- CMS publishing must require approval status, KKLIU number where applicable, expiry date, and evidence attachments.

## Medicine / Pharmacy

- Medication master must include MAL/NPRA status, active ingredient, poison group, psychotropic/dangerous flags, cold-chain status, high-alert/LASA flags, barcode, and recall status.
- Legal registers are separate from audit logs: prescription book, psychotropic register, dangerous-drug register or explicit v1 exclusion, stock ledger, correction ledger.
- Dispensing flow: prescribed, screened, clarified, prepared, labelled, checked, counter-checked, issued, counselled, reversed or voided.
- Batch traceability must cover purchase, receive, transfer, dispense, return, quarantine, disposal, and recall.
