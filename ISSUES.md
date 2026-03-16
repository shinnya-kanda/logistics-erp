# ISSUES.md
Logistics ERP / Logistics OS – Actionable Issue List
Author: Shinya Kanda
Date: 2026-03-17

This document defines a practical issue backlog for AI-assisted development in Cursor.

Purpose:

- break the project into small executable tasks
- make implementation order explicit
- allow Cursor / Claude / ChatGPT to work with stable context
- reduce architecture drift
- accelerate phased development

This issue list assumes these context files already exist in the repository root:

- MASTER_CONTEXT.md
- AI_DEVELOPMENT_GUIDE.md
- ARCHITECTURE.md
- db-schema.md
- ROADMAP.md

General rule:

Each issue should be implemented in a way that does **not break existing architecture**.
Always preserve the separation of:

- Expected Data
- Actual Data
- Verification / Trace

---

# 0. How to Use This File

Recommended workflow:

1. Pick one issue
2. Paste the issue text into Cursor
3. Tell Cursor to use:
   - MASTER_CONTEXT.md
   - ARCHITECTURE.md
   - db-schema.md
   - ROADMAP.md
4. Ask Cursor to implement only that issue
5. Review output
6. commit / push
7. move to next issue

Recommended prompt prefix for Cursor:

```md
MASTER_CONTEXT.md, ARCHITECTURE.md, db-schema.md, ROADMAP.md, ISSUES.md を前提にしてください。
以下の Issue だけを実装してください。
既存コードを壊さず、最小構成で完了してください。
必要なら migration / TypeScript types / service code / README 更新まで含めてください。
```

---

# 1. Phase 1 – Expected Data Foundation

## Issue 001 – Create source_files table

### Goal
Create the `source_files` table to track imported files.

### Why
All imported shipment data must be traceable to its original file.

### Scope
Implement:

- Supabase migration for `source_files`
- created_at / updated_at fields
- useful indexes
- basic TypeScript type definitions if repository uses shared schema types

### Acceptance Criteria
- `source_files` table exists
- migration runs successfully
- indexes for imported_at / file_type / checksum are created
- schema matches db-schema.md

### Suggested Cursor Prompt
```md
MASTER_CONTEXT.md, ARCHITECTURE.md, db-schema.md, ROADMAP.md, ISSUES.md を前提にしてください。

Issue 001 を実装してください。

Task:
Create the source_files table as defined in db-schema.md.

Requirements:
- create Supabase migration
- include timestamps
- create useful indexes
- do not break existing structure
```

---

## Issue 002 – Create shipments table

### Goal
Create the `shipments` table as the Expected Data header table.

### Why
A shipment header is needed to group shipment line items.

### Scope
Implement:

- Supabase migration for `shipments`
- foreign key to `source_files`
- indexes for source_file_id / shipment_no / delivery_date / status

### Acceptance Criteria
- `shipments` table exists
- FK to `source_files.id` works
- migration applies successfully
- schema matches db-schema.md

### Suggested Cursor Prompt
```md
MASTER_CONTEXT.md, ARCHITECTURE.md, db-schema.md, ROADMAP.md, ISSUES.md を前提にしてください。

Issue 002 を実装してください。

Task:
Create the shipments table.

Requirements:
- foreign key to source_files
- indexes for common queries
- follow db-schema.md
- minimal viable implementation only
```

---

## Issue 003 – Create shipment_items table

### Goal
Create the `shipment_items` table as the core Expected Data line-item table.

### Why
This is the main table expressing what should be shipped.

### Scope
Implement:

- Supabase migration for `shipment_items`
- FK to `shipments`
- trace_id column
- indexes for shipment_id / trace_id / part_no / unload_location / delivery_date / status / match_key

### Acceptance Criteria
- `shipment_items` table exists
- FK to `shipments.id` works
- indexes created
- schema matches db-schema.md

### Suggested Cursor Prompt
```md
MASTER_CONTEXT.md, ARCHITECTURE.md, db-schema.md, ROADMAP.md, ISSUES.md を前提にしてください。

Issue 003 を実装してください。

Task:
Create shipment_items table.

Requirements:
- include trace_id
- keep it extendable for later scan_events linkage
- create useful indexes
- align with db-schema.md
```

---

## Issue 004 – Add trigger or standard handling for updated_at

### Goal
Ensure tables consistently update `updated_at`.

### Why
Auditability is important for logistics operations.

### Scope
Implement either:

- shared SQL function + trigger approach, or
- repository standard update handling if already defined

Tables:
- source_files
- shipments
- shipment_items

### Acceptance Criteria
- updates refresh updated_at consistently
- implementation is documented in migration or README

---

## Issue 005 – Generate TypeScript schema/types for Phase 1 tables

### Goal
Add or update repository types for new tables.

### Why
Importer and future API code need stable type definitions.

### Scope
Implement:
- shared DB types or schema types for Phase 1 tables
- keep consistent with current monorepo style

### Acceptance Criteria
- types exist for source_files / shipments / shipment_items
- types match migration schema

---

## Issue 006 – Create minimal repository documentation for Phase 1 tables

### Goal
Add a short developer note explaining the purpose of the new tables.

### Why
AI tools and future developers should quickly understand the data model.

### Scope
Update one of:
- README.md
- docs/
- package-level README

### Acceptance Criteria
- documentation exists
- purpose of source_files / shipments / shipment_items is clearly explained

---

# 2. Importer Integration

## Issue 007 – Refactor importer input model for Expected Data

### Goal
Define a stable importer input model for shipment import.

### Why
Importer should not directly depend on unstable CSV column naming forever.

### Scope
Implement:
- normalized importer input interface / type
- mapping layer from CSV row → internal import shape
- clear validation points

### Acceptance Criteria
- importer has a clear internal input model
- CSV parsing and DB insert concerns are separated

### Suggested Cursor Prompt
```md
MASTER_CONTEXT.md, ARCHITECTURE.md, db-schema.md, ROADMAP.md, ISSUES.md を前提にしてください。

Issue 007 を実装してください。

Task:
Refactor importer so CSV row parsing is separated from internal shipment import model.

Requirements:
- keep current importer working if possible
- create minimal, extensible internal interfaces
- do not implement scan logic yet
```

---

## Issue 008 – Insert source_files record from importer

### Goal
When an import starts, create one `source_files` record.

### Why
Every import must be auditable.

### Scope
Implement:
- importer writes source_files record
- store file_name / file_type / source_system / imported_at
- optionally checksum if easy to add

### Acceptance Criteria
- one import creates one source_files row
- importer can reference created source_file_id

---

## Issue 009 – Insert shipments record from importer

### Goal
Importer creates a `shipments` header record.

### Why
Shipment line items need a parent shipment.

### Scope
Implement:
- map shipment-level fields
- attach source_file_id
- create shipment header before line inserts

### Acceptance Criteria
- importer creates one shipments row for a shipment import
- created shipment id is available for line inserts

---

## Issue 010 – Insert shipment_items rows from importer

### Goal
Importer creates `shipment_items` rows from CSV.

### Why
Expected shipment lines must be stored in DB.

### Scope
Implement:
- map CSV rows
- generate trace_id in current minimal format
- insert all line items under shipment_id
- store source_row_no when possible

### Acceptance Criteria
- shipment_items rows are stored correctly
- each row has shipment_id
- trace_id generation works
- importer can finish a complete import

### Suggested Cursor Prompt
```md
MASTER_CONTEXT.md, ARCHITECTURE.md, db-schema.md, ROADMAP.md, ISSUES.md を前提にしてください。

Issue 010 を実装してください。

Task:
Implement importer insertion for shipment_items.

Requirements:
- use shipment_id from header insert
- generate minimal trace_id
- keep design extendable for future verification
- align with db-schema.md
```

---

## Issue 011 – Add importer transaction / rollback safety

### Goal
Prevent half-imported shipment data.

### Why
Shipment imports should fail safely.

### Scope
Implement:
- transaction handling if stack supports it cleanly
- rollback on failure
- meaningful error return

### Acceptance Criteria
- partial imports do not remain on error
- importer returns understandable failure details

---

## Issue 012 – Add importer validation errors

### Goal
Fail clearly when required fields are missing or invalid.

### Why
Bad source files must be diagnosable.

### Scope
Validate at least:
- part_no
- quantity_expected
- shipment linkage assumptions

### Acceptance Criteria
- invalid rows produce actionable errors
- importer does not silently accept broken rows

---

## Issue 013 – Add importer dry-run mode

### Goal
Allow validation without database write.

### Why
Useful for testing PDF/CSV extraction quality.

### Scope
Implement:
- validation-only mode
- summary result object

### Acceptance Criteria
- dry-run mode exists
- no DB writes in dry-run
- validation summary is returned

---

# 3. Phase 2 – Actual Data Foundation

## Issue 014 – Create scan_events table

### Goal
Create the `scan_events` table for raw operational events.

### Why
Actual field data must be stored independently of planned shipment data.

### Scope
Implement:
- migration for scan_events
- indexes for shipment_item_id / trace_id / scanned_code / scanned_at / result_status

### Acceptance Criteria
- scan_events table exists
- schema matches db-schema.md
- indexes exist

### Suggested Cursor Prompt
```md
MASTER_CONTEXT.md, ARCHITECTURE.md, db-schema.md, ROADMAP.md, ISSUES.md を前提にしてください。

Issue 014 を実装してください。

Task:
Create scan_events table.

Requirements:
- keep it as raw fact table
- do not mix summary/progress logic into this table
- align with db-schema.md
```

---

## Issue 015 – Create shipment_item_progress table

### Goal
Create a current-state table for each shipment item.

### Why
The UI should not always compute live progress from all scan events.

### Scope
Implement:
- migration for shipment_item_progress
- unique FK to shipment_items
- progress indexes

### Acceptance Criteria
- table exists
- 1:1 relation with shipment_items is enforced
- schema matches db-schema.md

---

## Issue 016 – Create shipment_item_issues table

### Goal
Create history table for mismatches and detected issues.

### Why
Operational issues should be stored as records, not only hidden in a status column.

### Scope
Implement:
- migration for shipment_item_issues
- indexes on shipment_item_id / trace_id / issue_type / severity / detected_at

### Acceptance Criteria
- table exists
- schema matches db-schema.md
- indexes exist

---

## Issue 017 – Seed progress row creation for each shipment_item

### Goal
When shipment_items are imported, create initial shipment_item_progress rows.

### Why
Each expected item should have a progress state from the start.

### Scope
Implement:
- initial progress row creation
- default progress_status = planned
- quantity_scanned_total = 0

### Acceptance Criteria
- each imported shipment_item has one shipment_item_progress row

---

# 4. Scan / Verification API Foundation

## Issue 018 – Define scan input contract

### Goal
Create a stable input model for incoming scan data.

### Why
UI, API, and verification logic need a shared contract.

### Scope
Define fields like:
- scanned_code
- scan_type
- operator_id
- operator_name
- device_id
- scanned_at
- optional quantity / unload_location

### Acceptance Criteria
- shared interface / schema exists
- contract is reusable by PWA and API

---

## Issue 019 – Implement minimal scan event insert service

### Goal
Create service logic to insert scan_events.

### Why
Need a minimal entry point for actual field events.

### Scope
Implement:
- service or API function
- validation of required fields
- write raw scan_events row

### Acceptance Criteria
- scan event can be stored from service call
- no verification logic required yet

---

## Issue 020 – Link scan event to shipment_item by basic match rule

### Goal
Implement a first-pass match strategy.

### Why
Verification needs a way to associate scans with expected items.

### Scope
Minimal acceptable strategy:
- match by trace_id if present
- otherwise match by part_no / barcode / match_key depending on current data model

### Acceptance Criteria
- clear matching rule exists
- shipment_item_id can be attached when matched
- unmatched scans remain storable

---

## Issue 021 – Update shipment_item_progress after scan insert

### Goal
Update current-state progress after accepted scan.

### Why
Progress table must reflect field activity.

### Scope
Implement:
- increment quantity_scanned_total if appropriate
- set first_scanned_at / last_scanned_at
- update progress_status minimally

### Acceptance Criteria
- progress changes after matching scan insert
- no full mismatch engine needed yet

---

# 5. Verification Engine

## Issue 022 – Define verification result model

### Goal
Create a reusable verification result shape.

### Why
Engine, API, and UI should agree on status outputs.

### Scope
Statuses:
- matched
- shortage
- excess
- wrong_part
- wrong_location
- unknown

### Acceptance Criteria
- shared result model exists
- referenced consistently by verification logic

---

## Issue 023 – Implement minimal verification engine

### Goal
Compare one scan event with one expected shipment item.

### Why
Need a first working Expected vs Actual evaluator.

### Scope
Evaluate:
- part_no
- quantity
- unload_location if available

### Acceptance Criteria
- engine returns clear result
- can be called from scan flow
- does not yet require full optimization

### Suggested Cursor Prompt
```md
MASTER_CONTEXT.md, ARCHITECTURE.md, db-schema.md, ROADMAP.md, ISSUES.md を前提にしてください。

Issue 023 を実装してください。

Task:
Create a minimal verification engine for Expected vs Actual.

Compare:
- expected shipment_item
- actual scan input

Return:
- matched / shortage / excess / wrong_part / wrong_location / unknown

Keep implementation modular for future extension.
```

---

## Issue 024 – Create shipment_item_issues from mismatch results

### Goal
Persist verification problems.

### Why
Mismatch results need durable history.

### Scope
Implement:
- create issue record on mismatch
- store expected_value / actual_value when easy to capture

### Acceptance Criteria
- mismatch produces shipment_item_issues row
- matched results do not create false issue rows

---

## Issue 025 – Mark shipment_item_progress completed when matched fully

### Goal
Mark a shipment item as completed when verification reaches expected state.

### Why
Dashboard and scanner need clear completion state.

### Scope
Implement:
- completion rule
- completed_at update
- progress_status update

### Acceptance Criteria
- fully matched item becomes completed or matched
- timestamp recorded

---

# 6. PWA Scanner Foundation

## Issue 026 – Create minimal PWA scanner app shell

### Goal
Create the initial mobile-first scanner UI shell.

### Why
Need a starting point for field operations.

### Scope
Implement:
- app shell
- scan input screen
- placeholder result screen
- basic project structure

### Acceptance Criteria
- pwa-scanner app runs
- minimal UI exists
- no full camera integration required yet

---

## Issue 027 – Add manual scan input for early testing

### Goal
Allow text input simulation before barcode library integration.

### Why
Business logic can be tested before device-specific scanning is complete.

### Scope
Implement:
- text field for scanned code
- submit button
- result feedback area

### Acceptance Criteria
- user can manually enter code
- event flows through scan service

---

## Issue 028 – Show verification feedback in scanner UI

### Goal
Display simple scan outcome to user.

### Why
Field worker needs immediate response.

### Scope
Show:
- success
- mismatch
- unknown code
- optional expected vs actual summary

### Acceptance Criteria
- UI shows result clearly
- warehouse-friendly minimal design

---

# 7. Dashboard Foundation

## Issue 029 – Create minimal web dashboard shell

### Goal
Create dashboard base app.

### Why
Need admin/office entry point.

### Scope
Implement:
- navigation shell
- placeholder pages:
  - imports
  - shipments
  - scan progress
  - issues

### Acceptance Criteria
- dashboard app runs
- route structure exists

---

## Issue 030 – Add shipment list view

### Goal
Show imported shipments.

### Why
Office users need visibility of expected shipment headers.

### Scope
Implement:
- list shipments
- show shipment_no / delivery_date / status / created_at

### Acceptance Criteria
- shipment list page works
- reads from shipments table

---

## Issue 031 – Add shipment detail view

### Goal
Show header + line items for one shipment.

### Why
Need to inspect expected lines and later progress.

### Scope
Implement:
- shipment header section
- shipment_items table section

### Acceptance Criteria
- one shipment can be opened
- associated items displayed

---

## Issue 032 – Add issue list view

### Goal
Show shipment_item_issues in dashboard.

### Why
Mismatches need a management view.

### Scope
Implement:
- list issue_type / severity / detected_at / resolved_at
- filter by unresolved if easy

### Acceptance Criteria
- issues page works
- unresolved issues are visible

---

# 8. Quality / Operations

## Issue 033 – Add structured logging to importer

### Goal
Improve diagnosability.

### Why
Imports are critical operational events.

### Scope
Add logs for:
- import start
- source file created
- shipment created
- rows inserted
- errors

### Acceptance Criteria
- logs are readable and structured
- no secrets leaked

---

## Issue 034 – Add test coverage for importer core flow

### Goal
Protect import logic from regressions.

### Why
Importer is foundational.

### Scope
Test at least:
- valid import
- missing required field
- transaction rollback or failure path

### Acceptance Criteria
- basic tests exist
- tests cover key success/failure paths

---

## Issue 035 – Add test coverage for verification engine

### Goal
Protect Expected vs Actual logic.

### Why
Verification is the product core.

### Scope
Test:
- matched
- shortage
- excess
- wrong_part
- wrong_location

### Acceptance Criteria
- verification tests exist
- result statuses are stable

---

## Issue 036 – Add seed/demo data for local development

### Goal
Make local testing faster.

### Why
AI-assisted development improves when sample data exists.

### Scope
Create:
- sample source_files
- sample shipment
- sample shipment_items
- optional sample scan_events

### Acceptance Criteria
- local dev can load sample data easily

---

# 9. Future Expansion Issues

## Issue 037 – Create trace_events table
## Issue 038 – Build trace timeline API
## Issue 039 – Add inventory_lots table
## Issue 040 – Add stock movement model
## Issue 041 – Design billing module
## Issue 042 – Design driver allowance calculation module
## Issue 043 – Add shipper-side lightweight WMS input
## Issue 044 – Add QR-based pallet / case trace flow

These are intentionally later-phase issues.
Do not start them before Phase 1–3 foundation is stable.

---

# 10. Recommended Immediate Execution Order

Recommended next 10 execution steps:

1. Issue 001 – Create source_files table
2. Issue 002 – Create shipments table
3. Issue 003 – Create shipment_items table
4. Issue 004 – Add updated_at handling
5. Issue 005 – Generate TypeScript types
6. Issue 007 – Refactor importer input model
7. Issue 008 – Insert source_files record from importer
8. Issue 009 – Insert shipments record from importer
9. Issue 010 – Insert shipment_items rows from importer
10. Issue 011 – Add importer transaction safety

After that:

11. Issue 014 – Create scan_events table
12. Issue 015 – Create shipment_item_progress table
13. Issue 016 – Create shipment_item_issues table
14. Issue 017 – Seed progress rows
15. Issue 018 – Define scan input contract
16. Issue 019 – Implement minimal scan event insert service
17. Issue 020 – Link scan event to shipment_item
18. Issue 023 – Implement minimal verification engine
19. Issue 024 – Create mismatch issues
20. Issue 025 – Mark matched items completed

---

# 11. GitHub Issue Conversion Rule

If you later split this file into GitHub Issues, use this format:

Title example:
- Phase1: Create source_files table
- Phase1: Create shipments table
- Phase1: Implement importer header insert
- Phase2: Create scan_events table
- Phase2: Implement minimal verification engine

Body template:
- Goal
- Why
- Scope
- Acceptance Criteria
- Related files
- Notes

This file is intentionally written so each section can be converted into a GitHub Issue with minimal editing.

---

# 12. Final Rule

Do not let AI freely "invent" architecture outside the context files.

Always anchor development to:

- MASTER_CONTEXT.md
- ARCHITECTURE.md
- db-schema.md
- ROADMAP.md
- ISSUES.md

The system should evolve step by step from:

Shipment Error Prevention Tool

to

Logistics OS / Logistics ERP.
