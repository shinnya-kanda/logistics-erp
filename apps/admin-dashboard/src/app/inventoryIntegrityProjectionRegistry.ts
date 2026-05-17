import type {
  InventoryIntegrityProjectionRegistry,
  ProjectionAdapterBoundary,
  ProjectionDefinition,
  ProjectionDefinitionIdentity,
  ProjectionSelectorBoundary,
  ProjectionSourceMetadata,
} from "./inventoryIntegrityTypes";

// Projection registry scaffold for static read-only Inventory Integrity projections.
// The registry is an identity boundary only, not orchestration or execution.

const projectionAdapterBoundary: ProjectionAdapterBoundary = {
  adapterId: "inventory-integrity-normalized-read-only-adapter",
  label: "正規化 adapter 境界",
  semanticMeaning:
    "static source を normalized projection contract として読むための pure function adapter boundary です。",
  executionBoundary:
    "adapter boundary は execution layer ではありません。fetch、compare execution、rebuild、replay、correction、mutation は実行しません。",
};

function createDefinitionIdentity(
  definitionId: string,
  projectionKind: ProjectionDefinitionIdentity["projectionKind"],
  projectionName: string,
): ProjectionDefinitionIdentity {
  return {
    definitionId,
    projectionKind,
    projectionName,
    projectionVersion: "b37-05-static-read-only",
    contractVersion: "inventory-integrity-projection-registry-v1",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "projection definition は identity / boundary metadata であり、実行、更新、workflow 開始権限を持ちません。",
  };
}

function createSelectorBoundary(
  selectorIds: readonly string[],
  label: string,
): ProjectionSelectorBoundary {
  return {
    selectorIds,
    label,
    semanticMeaning:
      "selector は normalized read-only data を表示用に読む境界です。source や adapter の実行権限を持ちません。",
    executionBoundary:
      "selector boundary は表示用の読み取り境界です。fetch、Supabase 接続、mutation、execution workflow は実行しません。",
  };
}

function createProjectionDefinition(
  identity: ProjectionDefinitionIdentity,
  source: ProjectionSourceMetadata,
  selectorBoundary: ProjectionSelectorBoundary,
  semanticMeaning: string,
): ProjectionDefinition {
  return {
    identity,
    source,
    adapter: projectionAdapterBoundary,
    selectorBoundary,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticMeaning,
  };
}

export function createInventoryIntegrityProjectionRegistry(
  source: ProjectionSourceMetadata,
): InventoryIntegrityProjectionRegistry {
  const definitions: readonly ProjectionDefinition[] = [
    createProjectionDefinition(
      createDefinitionIdentity(
        "inventory-integrity-summary-definition",
        "inventory_summary_projection",
        "inventory-integrity-summary",
      ),
      source,
      createSelectorBoundary(
        [
          "getInventoryIntegritySummaries",
          "getInventoryIntegrityIssues",
          "getInventoryIntegritySignals",
        ],
        "summary selector boundary",
      ),
      "Inventory Integrity の概要、注意、参照専用 signal を読む projection definition です。",
    ),
    createProjectionDefinition(
      createDefinitionIdentity(
        "inventory-integrity-compare-definition",
        "inventory_compare_projection",
        "inventory-integrity-compare",
      ),
      source,
      createSelectorBoundary(
        [
          "getInventoryCompareProjections",
          "getInventoryCompareSeveritySummary",
          "getInventoryCompareReasonSummary",
          "getInventoryCompareScopeSummary",
        ],
        "compare selector boundary",
      ),
      "inventory_transactions 由来数量と inventory_current cache の比較文脈を読む projection definition です。",
    ),
    createProjectionDefinition(
      createDefinitionIdentity(
        "inventory-integrity-detail-definition",
        "inventory_integrity_projection",
        "inventory-integrity-detail",
      ),
      source,
      createSelectorBoundary(
        [
          "getInventoryIntegrityFreshnessSummary",
          "getInventoryIntegrityCompletenessSummary",
          "getInventoryIntegrityReviewReadinessSummary",
        ],
        "integrity metadata selector boundary",
      ),
      "freshness / completeness / review-readiness を read-only metadata として読む projection definition です。",
    ),
    createProjectionDefinition(
      createDefinitionIdentity(
        "inventory-integrity-governance-review-definition",
        "governance_review_projection",
        "inventory-integrity-governance-review",
      ),
      source,
      createSelectorBoundary(
        [
          "getInventoryIntegrityAttention",
          "getInventoryIntegrityAttentionLevelSummary",
          "getInventoryIntegrityReviewPrioritySummary",
          "getInventoryIntegrityEscalationSummary",
        ],
        "governance review selector boundary",
      ),
      "attention / review / escalation を governance review 用の参照情報として読む projection definition です。",
    ),
    createProjectionDefinition(
      createDefinitionIdentity(
        "inventory-integrity-snapshot-definition",
        "snapshot_projection",
        "inventory-integrity-snapshot",
      ),
      source,
      createSelectorBoundary(
        ["getInventoryIntegrityEvidence", "getInventoryIntegritySources"],
        "snapshot source selector boundary",
      ),
      "snapshot / evidence / source mapping を由来確認のために読む projection definition です。",
    ),
  ];

  return {
    registryId: "inventory-integrity-static-read-only-registry",
    label: "Inventory Integrity 静的 projection registry",
    semanticMeaning:
      "Inventory Integrity projection の identity / source / adapter / selector relation を整理する read-only registry scaffold です。",
    definitions,
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "registry は orchestration layer ではありません。fetch、Supabase 接続、compare execution、rebuild、replay、correction、mutation、workflow は実行しません。",
  };
}
