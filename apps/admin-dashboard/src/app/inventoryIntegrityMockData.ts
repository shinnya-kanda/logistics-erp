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
};

export function getInventoryIntegrityMockData(): InventoryIntegrityReadOnlyData {
  return inventoryIntegrityMockData;
}
