SEVA CONNECT — SYNTHETIC TEST DATASET
======================================

Purpose
-------
Use these fictional records to test Seva Connect's beneficiary management,
case prioritisation, programme matching, assistance/distribution, tasks,
follow-ups, notifications, and reporting features.

IMPORTANT
---------
- All names and contact details are synthetic demonstration data.
- Email addresses use example.test and are not real contact addresses.
- This package does NOT create Supabase Auth users or configure passwords.
- The demo_team.csv file is a role/assignment reference only. Create test users
  through your authorised Supabase authentication/admin workflow.
- Do not import directly into a live production organisation without reviewing
  your actual schema, organisation IDs, RLS policies, and constraints.
- CSV column names may need mapping to your application's real schema.

Files and suggested import order
--------------------------------
1. beneficiaries.csv
2. support_programmes.csv
3. cases.csv
4. programme_matches.csv
5. assistance_records.csv
6. tasks.csv
7. follow_ups.csv
8. notifications.csv
9. demo_team.csv (reference only; do not import as auth users)

Suggested testing scenarios
---------------------------
1. Search BEN-0001 and BEN-0002 in the beneficiary directory.
2. Check urgent cases CASE-0001, CASE-0002, CASE-0003, CASE-0004.
3. Check overdue follow-ups FUP-0003 and FUP-0004.
4. Test programme PRG-006, which is at capacity.
5. Test PRG-007, which is paused.
6. Test a potential match MAT-0008 with an availability warning.
7. Test assistance AST-0002 and AST-0011, which share beneficiary BEN-0002,
   date 2026-10-18, and programme PRG-002. These are intentional duplicate-
   detection test records. They are both marked delivered in this sample;
   use them to test historical duplicate warnings, not as proof that the
   application should allow a new duplicate.
8. Test a pending assistance record AST-0014 for financial assistance.
9. Test inactive beneficiary BEN-0023 and pending-verification beneficiary
   BEN-0022.
10. Test programme matching with beneficiaries whose support needs align with
    programme categories and locations.

Data relationships
------------------
- cases.beneficiary_id -> beneficiaries.beneficiary_id
- programme_matches.beneficiary_id -> beneficiaries.beneficiary_id
- programme_matches.programme_id -> support_programmes.programme_id
- assistance_records.beneficiary_id -> beneficiaries.beneficiary_id
- assistance_records.programme_id -> support_programmes.programme_id where set
- tasks.beneficiary_id -> beneficiaries.beneficiary_id
- tasks.case_id -> cases.case_id where set
- follow_ups.beneficiary_id -> beneficiaries.beneficiary_id
- follow_ups.case_id -> cases.case_id where set

IDs such as CW-001 are demo assignment identifiers, not authenticated user IDs.
Map them to actual user UUIDs in your app before importing related records.

Date note
---------
The dataset uses dates around October 2026 to provide both upcoming and overdue
workflows for a demo on that date. Update dates if testing at a later time.
