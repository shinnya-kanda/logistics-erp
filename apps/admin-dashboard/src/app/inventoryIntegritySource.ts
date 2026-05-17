import { normalizeInventoryIntegrityReadOnlyData } from "./inventoryIntegrityAdapter";
import type {
  InventoryIntegrityReadOnlyData,
  InventoryIntegrityReadOnlySource,
  ProjectionSourceMetadata,
} from "./inventoryIntegrityTypes";

// Read-only source boundary for Inventory Integrity projections.
// This is an abstraction boundary only: no fetch, Supabase, execution, mutation, or workflow.

const staticMockSourceMetadata: ProjectionSourceMetadata = {
  sourceId: "inventory-integrity-static-mock-source",
  sourceKind: "static_mock_source",
  label: "静的 mock source",
  semanticMeaning:
    "Inventory Integrity の normalized projection を静的に提供する read-only source boundary です。",
  truthSource: "inventory_transactions",
  cacheCompareTarget: "inventory_current",
  semanticBoundary: "reasoning_visualization_only",
  executionBoundary:
    "source boundary は fetch layer ではありません。Supabase 接続、compare execution、rebuild、replay、correction、mutation は実行しません。",
};

export function createInventoryIntegrityStaticMockSource(
  rawData: InventoryIntegrityReadOnlyData,
): InventoryIntegrityReadOnlySource {
  return {
    metadata: staticMockSourceMetadata,
    read: () => normalizeInventoryIntegrityReadOnlyData(rawData),
  };
}

export function readInventoryIntegritySource(
  source: InventoryIntegrityReadOnlySource,
): InventoryIntegrityReadOnlyData {
  return source.read();
}
