# ARCHITECTURE.md
Logistics ERP / Logistics OS – System Architecture
Author: Shinya Kanda
Date: 2026-03-17

---

# 1. Purpose of This Document

This document defines the architecture of the **logistics-erp** project.

The project is not just a general business system.
It is a staged platform designed to solve a specific logistics problem:

**In many real-world logistics operations, EDI does not exist, yet shipment verification is still required.**

Therefore, the architecture must support:

- PDF-based shipment instructions
- CSV conversion
- database import
- expected vs actual verification
- traceability
- gradual evolution into WMS / ERP / Logistics OS

---

# 2. Core Architectural Principle

The most important principle is:

**Expected Data vs Actual Data**

## Expected Data

Expected Data is the shipment plan generated from source documents.

Typical source:

- PDF shipment instruction
- CSV converted from PDF
- future shipper-side WMS export

Expected Data answers:

- What should be shipped?
- Which part number?
- How many?
- To which unload location?
- On what date?

## Actual Data

Actual Data is the operational fact created during real work.

Typical source:

- barcode scan
- QR scan
- driver confirmation
- warehouse scan
- mobile device action

Actual Data answers:

- What was actually scanned?
- Who scanned it?
- When?
- Where?
- With which device?

The system must never mix Expected and Actual into the same conceptual layer.

---

# 3. End-to-End Data Flow

The full architecture is:

Shipper
→ PDF shipment instruction
→ PDF extractor
→ CSV
→ Importer
→ Supabase DB
→ Expected shipment records
→ PWA scanner
→ Actual scan events
→ Verification engine
→ Trace platform
→ Logistics ERP / Logistics OS

---

# 4. Layered Architecture

The project should be built in layers.

## Layer 1: Source Input Layer

Responsibility:

Receive raw source data from the outside world.

Examples:

- PDF files
- CSV files
- manual upload
- future API / EDI / WMS export

Main components:

- services/pdf-extractor
- services/importer
- source_files table

This layer is responsible for converting unstructured or semi-structured source data into system-ingestable data.

---

## Layer 2: Expected Data Layer

Responsibility:

Store the official shipment plan.

Main tables:

- shipments
- shipment_items

Possible related metadata:

- shipper
- receiver
- delivery_date
- unload_location
- source_file_id

Important rule:

This layer contains what **should happen**, not what actually happened.

---

## Layer 3: Actual Data Layer

Responsibility:

Store the actual operational events.

Main tables:

- scan_events
- shipment_item_progress
- shipment_item_issues

This layer records facts from the field.

Examples:

- scanned part number
- scan timestamp
- operator
- device
- location
- result

Important rule:

This layer contains what **did happen**, not what was planned.

---

## Layer 4: Verification / Trace Layer

Responsibility:

Compare Expected and Actual and maintain traceability.

Main concepts:

- matched
- shortage
- excess
- wrong_part
- wrong_location

Related components:

- trace_id
- verification engine
- future trace_events

This is the core value-creation layer of the platform.

---

## Layer 5: Application Layer

Responsibility:

Provide UI and workflows to users.

Main apps:

- apps/pwa-scanner
- apps/web-dashboard

Examples of responsibilities:

- scan UI
- shipment verification view
- issue list
- shipment progress dashboard
- trace search
- inventory and ERP views in later phases

---

## Layer 6: ERP / Logistics OS Layer

Responsibility:

Expand from shipment verification to broader logistics management.

Future domains:

- inventory
- warehouse management
- invoice / billing
- route / dispatch support
- analytics
- customer portal
- shipper-side lightweight WMS

This layer should only be built after the core verification platform is stable.

---

# 5. Monorepo Structure

Recommended repository structure:

logistics-erp/
├─ README.md
├─ PROJECT.md
├─ MASTER_CONTEXT.md
├─ AI_DEVELOPMENT_GUIDE.md
├─ ARCHITECTURE.md
├─ docs/
│  ├─ db-schema.md
│  ├─ roadmap.md
│  └─ domain-model.md
├─ apps/
│  ├─ web-dashboard/
│  └─ pwa-scanner/
├─ services/
│  ├─ importer/
│  ├─ pdf-extractor/
│  ├─ trace-engine/
│  └─ api/
├─ packages/
│  ├─ db/
│  ├─ schema/
│  ├─ domain/
│  └─ utils/
├─ infra/
│  ├─ migrations/
│  └─ supabase/
└─ scripts/

---

# 6. Service Responsibilities

## services/pdf-extractor

Purpose:

Convert PDF shipment instructions into structured output.

Responsibilities:

- parse PDF
- extract shipment-related fields
- output CSV or structured JSON
- keep extraction logic separate from business logic

Important:

This service should not directly own shipment verification logic.

---

## services/importer

Purpose:

Import extracted structured data into the database.

Responsibilities:

- read CSV / structured files
- validate required fields
- create source_files record
- insert shipments
- insert shipment_items

Important:

Importer is responsible for loading Expected Data.

---

## services/trace-engine

Purpose:

Evaluate Actual vs Expected.

Responsibilities:

- compare shipment_items with scan_events
- generate result status
- update shipment progress
- generate issues

Important:

Trace logic should stay here, not be spread across UI code.

---

## services/api

Purpose:

Expose application-friendly APIs.

Responsibilities:

- provide data to dashboard
- provide verification endpoints
- provide trace search
- provide admin / management endpoints

---

# 7. Database Architecture Philosophy

The database should follow these principles:

1. Separate source files from extracted business data
2. Separate expected data from actual events
3. Preserve traceability with stable identifiers
4. Prefer normalized design for core entities
5. Support future expansion into inventory and ERP

## Key core entities

### source_files

Tracks imported files.

### shipments

Header-level shipment plan.

### shipment_items

Line-level shipment plan.

### scan_events

Atomic field events.

### shipment_item_progress

Current state of each planned item.

### shipment_item_issues

Detected mismatches and operational problems.

### trace_events (future)

Cross-process trace history.

---

# 8. trace_id Concept

trace_id is a core architectural concept.

Purpose:

- connect planned shipment item
- connect scan events
- connect future downstream operations
- enable searchability and traceability

In the early phase, trace_id can be simple.

In later phases, it should support:

- shipment-level trace
- pallet-level trace
- case-level trace
- item-level trace

Important:

trace_id should be treated as a first-class concept, not a temporary helper field.

---

# 9. Application Architecture

## PWA Scanner

Primary users:

- drivers
- warehouse workers

Responsibilities:

- scan barcode / QR
- validate expected vs actual
- show success / mismatch
- capture operational confirmation

Design principles:

- simple UI
- fast interaction
- mobile-first
- works in warehouse conditions

## Web Dashboard

Primary users:

- office staff
- managers
- administrators

Responsibilities:

- upload source files
- review shipment plans
- monitor scan progress
- view issues
- review trace history
- later support ERP features

Design principles:

- clarity
- management visibility
- auditability

---

# 10. Phase-Based Architecture Strategy

## Phase 0

Infrastructure

Build:

- monorepo
- Supabase connection
- importer
- basic trace_id

## Phase 1

Expected Data foundation

Build:

- source_files
- shipments
- shipment_items

## Phase 2

Actual Data foundation

Build:

- scan_events
- shipment_item_progress
- shipment_item_issues

## Phase 3

Scanner application

Build:

- PWA scan UI
- validation flow
- mismatch display

## Phase 4

Trace platform and expansion

Build:

- trace search
- analytics
- inventory extension
- ERP modules

Important:

Do not jump phases.
The architecture depends on staged accumulation.

---

# 11. Architectural Non-Goals (For Now)

The following are intentionally out of scope in early phases:

- full billing engine
- full accounting integration
- complete warehouse slotting optimization
- full dispatch optimization engine
- complex multi-tenant ERP abstractions

These may come later, but should not block the early core system.

---

# 12. AI Implementation Rules

When AI tools implement this project, they must follow these rules:

1. Preserve the Expected vs Actual separation
2. Keep extraction, import, trace, and UI responsibilities separated
3. Prefer minimal, extendable implementations
4. Use migrations for schema evolution
5. Avoid mixing temporary shortcuts into core architecture
6. Respect phase-based development order
7. Treat trace_id as a strategic concept

---

# 13. Long-Term Vision

The final goal is not just software for one workflow.

The final goal is to build a **Logistics OS** that connects:

Shipper
→ Logistics company
→ Delivery network

using:

- PDF / CSV ingestion
- QR / barcode verification
- traceability
- PWA field operations
- future WMS / ERP modules

This architecture should allow gradual evolution from
**shipment error prevention**
to
**full logistics operating platform**.
