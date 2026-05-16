import type { InventoryIntegrityReadOnlyData } from "./inventoryIntegrityTypes";

const inventoryIntegrityMockData: InventoryIntegrityReadOnlyData = {
  summaries: [
    {
      label: "Truth source",
      value: "inventory_transactions",
      level: "stable",
      status: "compare_ready",
      description:
        "inventory_transactions is the source of truth. inventory_current is only a read model projection.",
    },
    {
      label: "Compare scope",
      value: "static mock",
      level: "watch",
      status: "compare_ready",
      description:
        "This scaffold organizes future inventory_current vs inventory_transactions comparison semantics.",
    },
    {
      label: "Rebuild status",
      value: "Not implemented",
      level: "limited",
      status: "review_needed",
      description:
        "Rebuild, replay, and correction are explicitly out of scope for this read-only scaffold.",
    },
  ],
  issues: [
    {
      id: "inventory-integrity-projection-gap",
      level: "limited",
      status: "projection_gap",
      title: "Projection gap candidate",
      description:
        "A future compare may find inventory_current quantity that does not match the transaction-derived quantity.",
      currentReadModelSignal: "inventory_current may be stale or incomplete.",
      transactionTruthSignal: "inventory_transactions must be used to derive the expected current quantity.",
    },
    {
      id: "inventory-integrity-source-gap",
      level: "watch",
      status: "source_gap",
      title: "Transaction coverage review",
      description:
        "A future review should confirm whether all IN / OUT / MOVE / ADJUST events are represented as transactions.",
      currentReadModelSignal: "inventory_current cannot prove event completeness.",
      transactionTruthSignal: "inventory_transactions provide the audit trail for quantity movement.",
    },
    {
      id: "inventory-integrity-rebuild-boundary",
      level: "degraded",
      status: "review_needed",
      title: "Rebuild boundary is not executable",
      description:
        "This section may describe future rebuild eligibility, but it must not execute rebuild, replay, or correction.",
      currentReadModelSignal: "inventory_current remains display-only.",
      transactionTruthSignal: "inventory_transactions remain the only truth input for future rebuild reasoning.",
    },
  ],
  signals: [
    {
      id: "inventory-integrity-read-only",
      level: "stable",
      label: "READ ONLY",
      value: "No mutation",
      note: "No inventory_current update, transaction rewrite, rebuild, replay, or correction is available here.",
    },
    {
      id: "inventory-integrity-compare-only",
      level: "watch",
      label: "COMPARE ONLY",
      value: "Future semantic",
      note: "The scaffold describes compare semantics only. It does not run a comparison against live data.",
    },
    {
      id: "inventory-integrity-truth",
      level: "stable",
      label: "Truth boundary",
      value: "Transactions",
      note: "inventory_transactions is the source of truth; inventory_current is a projection/read model.",
    },
  ],
  compareProjections: [
    {
      id: "inventory-compare-part-location-gap",
      scope: "location",
      label: "Part/location quantity comparison",
      description:
        "Static projection of how a future comparison could reason about inventory_current quantity by part and location.",
      difference: {
        currentReadModelQuantity: "120",
        transactionAggregationQuantity: "118",
        differenceQuantity: "+2",
        reason: "read_model_cache_gap",
        severity: "warning",
      },
      truthStatement:
        "inventory_transactions aggregation is the truth input; inventory_current is the compare target/cache.",
      executionBoundary:
        "Reasoning visualization only. No live compare, rebuild, replay, correction, or inventory mutation is executed.",
    },
    {
      id: "inventory-compare-project-scope-gap",
      scope: "project",
      label: "Project scoped aggregation comparison",
      description:
        "Static projection of future project_no scoped comparison between read model and transaction aggregation.",
      difference: {
        currentReadModelQuantity: "64",
        transactionAggregationQuantity: "64",
        differenceQuantity: "0",
        reason: "not_compared",
        severity: "info",
      },
      truthStatement:
        "A zero difference in this mock does not prove correctness; transactions remain the source of truth.",
      executionBoundary:
        "Compare semantics only. This scaffold does not query Supabase or execute comparison logic.",
    },
    {
      id: "inventory-compare-inventory-type-gap",
      scope: "inventory_type",
      label: "Inventory type boundary comparison",
      description:
        "Static projection for future project / mrp inventory type boundary review before any rebuild reasoning.",
      difference: {
        currentReadModelQuantity: "31",
        transactionAggregationQuantity: "28",
        differenceQuantity: "+3",
        reason: "transaction_aggregation_gap",
        severity: "watch",
      },
      truthStatement:
        "inventory_current is not truth even when grouped by inventory_type; transaction aggregation defines the expected quantity.",
      executionBoundary:
        "No rebuild/replay/correction. Boundary review is represented as read-only reasoning metadata.",
    },
  ],
};

export function getInventoryIntegrityMockData(): InventoryIntegrityReadOnlyData {
  return inventoryIntegrityMockData;
}
