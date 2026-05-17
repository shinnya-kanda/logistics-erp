# 物流ERP ドキュメント

このディレクトリにはアーキテクチャやAPI仕様などのドキュメントを配置します。

- [Phase 1 Expected Data](./phase1-expected-data.md) — `source_files` / `shipments` ヘッダ / `shipment_items` と importer
- [Importer フロー](./importer-flow.md)
- [ChatGPT 共有用コンテキスト](./CHATGPT_SHARE.md) — 外部 AI への説明・プロンプト接頭辞（短い版）
- [全体像・詳細版（ChatGPT 共有）](./LOGISTICS_ERP_OVERVIEW_FOR_CHATGPT.md) — モノレポ・Ledger 在庫・migrations・API・認証まで一通り
- [Phase 2 Scan 基盤](./phase2-scan-foundation.md) — scan_events / progress / issues / `processScanInput`
- [Phase 2.1 Scan 冪等性](./phase2-1-scan-idempotency.md) — `idempotency_key` / 部分 UNIQUE / replay
- [Supabase Data API grants baseline](./supabase-data-api-grants.md) — 新規 `public` table 作成時の GRANT / RLS / policy 標準方針
- [Inventory Aggregation Semantics Review](./inventory-aggregation-semantics-review.md) — `inventory_transactions` から現在庫集計を考える semantics review
- [Inventory Aggregation Projection Adapter Design](./inventory-aggregation-projection-adapter-design.md) — raw transaction と UI projection の adapter / snapshot boundary
- [Inventory Snapshot Semantics Review](./inventory-snapshot-semantics-review.md) — aggregation / compare / integrity visualization の snapshot boundary
- [Inventory Compare Consistency Semantics Review](./inventory-compare-consistency-semantics-review.md) — compare consistency / confidence / mismatch の semantics review
- [Inventory Integrity Review Lifecycle Semantics](./inventory-integrity-review-lifecycle-semantics.md) — integrity / compare review state の lifecycle semantics
- [Inventory Integrity Escalation Semantics](./inventory-integrity-escalation-semantics.md) — escalation / audit / manager review の semantics review
- [Inventory Integrity Governance Boundary Review](./inventory-integrity-governance-boundary-review.md) — review / execution / mutation boundary の semantics review
- [Inventory Integrity Projection Contract Design](./inventory-integrity-projection-contract-design.md) — projection metadata / limitation / consistency の contract review
- [Inventory Integrity Projection Adapter Contract Review](./inventory-integrity-projection-adapter-contract-review.md) — raw source / adapter / projection boundary の contract review
- [Inventory Integrity Reasoning Graph Contract Review](./inventory-integrity-reasoning-graph-contract-review.md) — evidence / lineage / attention / review / escalation relation の graph contract review
- [Inventory Integrity Reasoning Graph Visualization Semantics](./inventory-integrity-reasoning-graph-visualization-semantics.md) — reasoning graph の node / edge / readability / comprehension semantics review
- [Inventory Integrity Reasoning Graph Readability Semantics](./inventory-integrity-reasoning-graph-readability-semantics.md) — attention / severity / confidence / stale / review readability semantics review
- [Inventory Integrity Audit Semantics Review](./inventory-integrity-audit-semantics-review.md) — audit visibility / evidence / lineage / confidence / traceability semantics review
- [Inventory Integrity Operational Semantics Review](./inventory-integrity-operational-semantics-review.md) — operational visibility / attention / escalation / role-oriented semantics review
- [Inventory Integrity Semantic Consistency Review](./inventory-integrity-semantic-consistency-review.md) — truth / cache / projection / snapshot / compare / review semantic consistency review
- [Inventory Integrity Semantic Glossary Review](./inventory-integrity-semantic-glossary-review.md) — Japanese-first glossary / prohibited interpretation / shared semantic language review
- [Inventory Integrity UI Wording Consistency Review](./inventory-integrity-ui-wording-consistency-review.md) — Japanese-first UI wording / warning / status consistency review
- [Inventory Integrity Warning Semantics Review](./inventory-integrity-warning-semantics-review.md) — warning / attention / escalation / review required semantics review
- [Inventory Integrity State Semantics Review](./inventory-integrity-state-semantics-review.md) — ready / stale / partial / degraded / reviewing state semantics review
- [Inventory Integrity Severity Semantics Review](./inventory-integrity-severity-semantics-review.md) — informational / low / medium / high / critical severity semantics review
- [Inventory Integrity Priority Semantics Review](./inventory-integrity-priority-semantics-review.md) — review / audit / operational / escalation priority semantics review
- [Inventory Integrity Evidence Semantics Review](./inventory-integrity-evidence-semantics-review.md) — evidence source / confidence / freshness / completeness semantics review
- [Inventory Integrity Confidence Semantics Review](./inventory-integrity-confidence-semantics-review.md) — high / medium / low / unknown confidence semantics review
- [Inventory Integrity Freshness Semantics Review](./inventory-integrity-freshness-semantics-review.md) — fresh / stale / delayed / expired / unknown freshness semantics review
