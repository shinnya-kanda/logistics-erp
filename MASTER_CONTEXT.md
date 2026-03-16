
# MASTER_CONTEXT.md
Logistics ERP / Logistics OS – AI Development Context
Author: Shinya Kanda
Date: 2026-03-17

---

# 1. Project Purpose

This repository contains the development of a **Logistics ERP / Logistics OS** designed for real-world logistics environments where **EDI does not exist**.

The core problem in many logistics operations:

- Shipment instructions are distributed as **PDF documents**
- Workers read them manually
- Data is transferred into **Excel or paper**
- Shipment verification depends on **human inspection**

This causes common errors:

- Wrong part number
- Wrong quantity
- Missing items
- Wrong unloading location

The system aims to eliminate these errors by converting PDF shipment instructions into structured data and enabling **barcode verification**.

---

# 2. Core Concept

The system creates a **translation layer that replaces missing EDI**.

Pipeline:

PDF
→ CSV
→ Importer
→ Supabase Database
→ PWA Scanner
→ Shipment Verification
→ Trace Platform
→ Logistics ERP

This allows logistics operations to be digitally verified even when upstream systems are not integrated.

---

# 3. Key Insight

Barcode systems normally require **Expected Data**.

Example:

Warehouse barcode scan
→ compare against shipment plan

However, in many Japanese logistics environments:

- Barcodes exist
- But **expected shipment data does not exist in structured form**

This project solves that by generating expected data from PDF instructions.

PDF → CSV → DB → Verification

---

# 4. System Model

The architecture is built around two datasets.

## Expected Data (Shipment Plan)

Tables:

shipments
shipment_items

Fields:

- part_no
- quantity
- unload_location
- delivery_date

## Actual Data (Operational Events)

Tables:

scan_events

Fields:

- barcode
- scan_time
- operator
- device

---

# 5. Difference Detection

The system compares:

Expected
vs
Actual

Possible results:

- matched
- shortage
- excess
- wrong_part
- wrong_location

This enables real-time shipment validation.

---

# 6. MVP Product

The first product is **NOT a full ERP**.

The first product is:

Shipment Error Prevention Tool

Functions:

- Import PDF shipment instructions
- Extract data
- Generate expected shipment records
- Scan barcodes during shipping
- Validate shipment correctness

Goal:

Reduce shipment mistakes.

---

# 7. Hardware Concept

Warehouse setup:

Smartphone (PWA Application)
↓
Ring Scanner
↓
Barcode Reading

Optional:

Smart Glasses
↓
Instruction Display

Wearable Button
↓
Quantity Input

---

# 8. System Architecture

Shipper
↓
PDF shipment instruction
↓
PDF extractor
↓
CSV
↓
Importer service
↓
Supabase database
↓
PWA scanning system
↓
Shipment verification
↓
Trace platform
↓
Logistics ERP

---

# 9. Development Phases

## Phase 0 – Infrastructure

Goal:
Allow logistics data to enter the database.

Components:

- Monorepo structure
- Supabase connection
- CSV importer
- Basic trace_id generation

Status: Mostly completed.

---

## Phase 1 – Expected Data

Tables:

- shipments
- shipment_items
- source_files

Goal:

Store shipment plans generated from PDFs.

---

## Phase 2 – Actual Data

Tables:

- scan_events
- shipment_item_progress
- shipment_item_issues

Goal:

Capture real-world scanning events.

---

## Phase 3 – Scanner System

PWA features:

- barcode scanning
- unload location verification
- quantity verification

Goal:

Prevent shipment errors.

---

## Phase 4 – Logistics OS

Future expansions:

- trace platform
- inventory management
- analytics
- ERP modules

---

# 10. Development Philosophy

Important principles:

1. Build incrementally
2. Do not jump directly to full ERP
3. Focus first on shipment verification
4. Separate Expected and Actual data
5. Maintain traceability with trace_id
6. Keep importer and scanning layers decoupled

---

# 11. Repository Structure

logistics-erp

apps/
- web-dashboard
- pwa-scanner

services/
- importer
- pdf-extractor
- trace-engine
- api

packages/
- db
- schema
- domain
- utils

infra/
- migrations
- supabase

docs/

scripts/

---

# 12. AI Development Rules

AI tools (ChatGPT, Cursor, Claude) must follow these rules:

1. Do not break existing architecture.
2. Implement features phase-by-phase.
3. Prefer minimal viable implementations first.
4. Use database migrations for schema changes.
5. Maintain separation between expected data and actual events.
6. Avoid adding business logic directly into the database layer.
7. Keep services modular.

---

# 13. Immediate Development Targets

Next tasks:

Create core expected-data tables:

shipments
shipment_items
source_files

Then update:

services/importer

to insert CSV data into shipment_items.

---

# 14. Vision

Build a **Logistics OS** connecting:

Shipper
↓
Logistics company
↓
Delivery network

Using:

QR codes
Trace IDs
PWA applications

Goal:

Transform logistics operations from

Paper → Excel → Manual verification

into

QR → PWA → Trace Platform
