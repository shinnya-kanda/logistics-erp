# Local Processing vs Cloud Architecture

## 概要

logistics-erp では、すべての処理をクラウドに集約しない。

物流現場の実態（PDF・Excel・NAS・OCR）を考慮し、
以下の2層構造を採用する。

---

## アーキテクチャ

### 1. Cloud Layer（Supabase / Edge Functions）

役割：

- 認証（Supabase Auth）
- ロール制御（admin / office / worker）
- warehouse_code によるデータ境界
- 軽量API（参照・登録）
- scan処理
- admin-dashboard用API

特徴：

- サーバーレス
- JWTベース
- 低レイテンシ
- 軽量処理のみ

---

### 2. Local Processing Layer（社内PC / NAS / ミニPC）

役割：

- PDF解析
- OCR処理
- CSV生成
- Excel生成
- 帳票出力
- NASファイル連携
- バッチ処理

特徴：

- 重い処理が可能
- ファイルアクセス自由
- オフライン対応
- 現場運用に適合

---

## データフロー

PDF  
↓  
ローカル処理（OCR / CSV化）  
↓  
人間確認  
↓  
admin-dashboard へアップロード  
↓  
Supabase DB  
↓  
ERP / 在庫 / トレース  

---

## 設計思想

- OCR結果は確定データではない
- 人間確認を必ず挟む
- クラウドは軽量処理に限定
- 重い処理はローカルに逃がす
- 段階的DXを優先する

---

## なぜこの構成か

物流現場は以下の制約を持つ：

- EDIが無い
- PDF文化
- Excel依存
- NAS運用
- オフライン作業

そのため、完全クラウド化は適さない。

---

## 結論

logistics-erp は

「クラウドERP」ではなく

「ローカル処理と連携する物流OS」

として設計する。

---
