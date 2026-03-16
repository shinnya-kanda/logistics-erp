# PROJECT.md

## Logistics OS Vision

Author: Shinya Kanda

------------------------------------------------------------------------

# 1. Mission

日本の物流を

紙 → Excel → ハンディ

から

QR → PWA → Trace

へ変える。

物流現場で発生している出荷ミス、非効率、データ断絶を解消し、
EDIが存在しない物流でもデータをつなぐ「物流OS」を構築する。

------------------------------------------------------------------------

# 2. Problem

日本の物流では次の問題が存在する。

-   多くの荷主がEDIを持たない
-   出荷指示がPDF
-   現場は紙やExcel
-   バーコードを読んでも照合データがない
-   出荷ミスが発生する

その結果

-   品番違い
-   数量違い
-   積み忘れ
-   荷卸場違い

などのミスが発生する。

------------------------------------------------------------------------

# 3. Core Idea

EDIがなくても物流DXを成立させる。

PDF ↓ CSV ↓ Supabase ↓ DB ↓ PWA ↓ Scan Verification

つまり

**PDFを物流データに変換する翻訳レイヤーを作る**

------------------------------------------------------------------------

# 4. System Architecture

荷主 ↓ PDF出荷指示 ↓ PDF Extractor ↓ CSV ↓ Importer ↓ Supabase DB ↓ PWA
Scanner ↓ Shipment Verification ↓ Trace Platform ↓ Logistics ERP

------------------------------------------------------------------------

# 5. Data Model Philosophy

物流システムの本質は

Expected / Actual

である。

Expected（予定）

-   shipment_items
-   part_no
-   quantity
-   unload_location

Actual（実績）

-   scan_events
-   barcode
-   scan_time

差異

Expected ↓ Actual ↓ Difference

------------------------------------------------------------------------

# 6. First Product

最初のプロダクトはERPではない。

**出荷ミスゼロツール**

機能

-   PDF取込
-   データ抽出
-   QR照合
-   スキャン検品

------------------------------------------------------------------------

# 7. Devices

現場の構成

スマートグラス ↓ 作業指示

リングスキャナ ↓ バーコード

ウェアラブルボタン ↓ 数量入力

スマホ ↓ PWA

------------------------------------------------------------------------

# 8. Development Phases

Phase 0 Infrastructure

-   monorepo
-   Supabase connection
-   CSV importer
-   trace_id generation

Phase 1 Expected data

-   shipments
-   shipment_items

Phase 2 Actual data

-   scan_events
-   progress tracking

Phase 3 PWA verification

-   barcode scan
-   unload location verification

Phase 4 Logistics OS

-   trace platform
-   inventory
-   ERP
-   analytics

------------------------------------------------------------------------

# 9. Startup Strategy

Step 1

無料

出荷ミス防止ツール

Step 2

SaaS

-   inventory
-   ERP
-   analytics

Step 3

Logistics Platform

荷主 ↓ 物流 ↓ 配送

------------------------------------------------------------------------

# 10. Vision

物流会社、荷主、配送会社を

QR と Trace でつなぐ。

最終的に

**物流OSを構築する。**
