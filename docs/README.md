# 物流ERP ドキュメント

このディレクトリにはアーキテクチャやAPI仕様などのドキュメントを配置します。

- [Phase 1 Expected Data](./phase1-expected-data.md) — `source_files` / `shipments` ヘッダ / `shipment_items` と importer
- [Importer フロー](./importer-flow.md)
- [ChatGPT 共有用コンテキスト](./CHATGPT_SHARE.md) — 外部 AI への説明・プロンプト接頭辞
- [Phase 2 Scan 基盤](./phase2-scan-foundation.md) — scan_events / progress / issues / `processScanInput`
- [Phase 2.1 Scan 冪等性](./phase2-1-scan-idempotency.md) — `idempotency_key` / 部分 UNIQUE / replay
