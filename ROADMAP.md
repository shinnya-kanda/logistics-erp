
# ROADMAP.md
Logistics ERP / Logistics OS – Development Roadmap
Author: Shinya Kanda
Date: 2026-03-17

---

# 1. Purpose

This document defines the **development roadmap** for the logistics-erp project.

The system will not be built as a full ERP from the beginning.
Instead it evolves step-by-step from a **shipment error prevention system**
into a **Logistics OS platform**.

Key concept:

Expected vs Actual verification platform first,
ERP functions later.

---

# 2. Final Vision

Build a **Logistics OS** connecting:

Shipper
↓
Logistics Company
↓
Delivery Network

Using:

- PDF / CSV ingestion
- QR / Barcode scanning
- Trace IDs
- PWA field operations
- Trace platform
- Logistics ERP modules

---

# 3. Development Strategy

The system is built in **phases**.

Each phase must produce a working system.

Principles:

1. Build minimal working components first
2. Avoid building the entire ERP at once
3. Focus on real logistics workflows
4. Expand gradually toward full platform

---

# 4. Phase 0 – Infrastructure

Goal:

Allow logistics data to enter the system.

Components:

- monorepo setup
- Supabase connection
- migration framework
- basic CSV importer
- trace_id concept
- repository structure

Repository:

logistics-erp/

apps/
services/
packages/
infra/
docs/

Status:

Mostly completed.

---

# 5. Phase 1 – Expected Data Platform

Goal:

Create structured shipment plans from PDF instructions.

Components:

source_files
shipments
shipment_items

Data flow:

PDF
↓
pdf-extractor
↓
CSV
↓
importer
↓
Expected Data

Key tasks:

1. Create database schema
2. Implement importer logic
3. Store shipment headers
4. Store shipment line items
5. Generate trace_id

Outcome:

The system can store **planned shipments**.

---

# 6. Phase 2 – Actual Data Capture

Goal:

Capture real-world operational data.

Components:

scan_events
shipment_item_progress
shipment_item_issues

Data flow:

Scanner
↓
Scan event
↓
Database

Key tasks:

1. Design scan_events schema
2. Create scan API
3. Store barcode scans
4. Store scan metadata
5. Track verification state

Outcome:

The system can record **what actually happened**.

---

# 7. Phase 3 – Verification Engine

Goal:

Compare Expected vs Actual.

Components:

verification logic
progress calculation
issue detection

Verification results:

- matched
- shortage
- excess
- wrong_part
- wrong_location

Key tasks:

1. Build verification engine
2. Update shipment_item_progress
3. Generate shipment_item_issues
4. Support trace search

Outcome:

Shipment errors can be detected automatically.

---

# 8. Phase 4 – Scanner Application (PWA)

Goal:

Allow drivers and warehouse workers to scan shipments.

Components:

apps/pwa-scanner

Functions:

- barcode scanning
- verification feedback
- mismatch alerts
- quantity confirmation

Design principles:

- fast
- simple
- mobile-first
- usable in warehouses

Outcome:

Field workers interact directly with the system.

---

# 9. Phase 5 – Dashboard System

Goal:

Provide management visibility.

Components:

apps/web-dashboard

Functions:

- upload shipment files
- view shipment plans
- monitor scan progress
- review issues
- search trace history

Outcome:

Office staff can manage logistics operations digitally.

---

# 10. Phase 6 – Trace Platform

Goal:

Provide end-to-end traceability.

Components:

trace_events
trace search
event timeline

Examples:

planned
picked
loaded
departed
delivered
received

Outcome:

Every shipment item can be traced across the network.

---

# 11. Phase 7 – Inventory / WMS

Goal:

Extend system toward warehouse management.

Components:

inventory_lots
warehouse locations
stock movements

Functions:

- inbound tracking
- outbound tracking
- lot traceability
- stock levels

Outcome:

System evolves toward **WMS capabilities**.

---

# 12. Phase 8 – ERP Layer

Goal:

Add business management functions.

Modules:

- billing
- transportation fees
- driver allowance calculation
- reporting
- analytics

Outcome:

Complete **Logistics ERP**.

---

# 13. Long-Term Expansion

Possible future systems:

- shipper-side lightweight WMS
- API integration with customers
- logistics analytics platform
- route optimization
- AI shipment prediction

---

# 14. Development Priority Order

Immediate next tasks:

1. Create Expected Data tables

source_files
shipments
shipment_items

2. Implement importer

3. Implement scan_events

4. Build verification engine

5. Build scanner PWA

6. Build dashboard

---

# 15. Architectural Rule

Always preserve:

Expected Data
vs
Actual Data

Never mix them into one table.

Expected:

shipment_items

Actual:

scan_events

Verification:

shipment_item_progress
shipment_item_issues

---

# 16. Recommended Development Loop

The recommended development cycle:

Design (ChatGPT)
↓
Implementation (Cursor)
↓
Review (Claude)
↓
Commit / Push (GitHub)
↓
Next Phase

This cycle enables rapid AI-assisted development.

---

# 17. Success Metric

The system succeeds when:

- shipment mistakes decrease
- workers can verify shipments quickly
- operations become traceable
- logistics data becomes structured
- new ERP capabilities can be built on top

---

# 18. Ultimate Goal

Transform logistics operations from:

Paper
→ Excel
→ Manual verification

into

QR
→ PWA
→ Trace Platform
→ Logistics OS
