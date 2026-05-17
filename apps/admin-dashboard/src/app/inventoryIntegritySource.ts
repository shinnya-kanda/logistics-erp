import {
  createInventoryIntegrityMockEdgeClient,
  defaultInventoryIntegrityEdgeRequest,
  readProjectionResponse,
} from "./inventoryIntegrityEdgeClient";
import { createInventoryIntegrityProjectionRegistry } from "./inventoryIntegrityProjectionRegistry";
import {
  defaultInventoryIntegrityProjectionTarget,
  resolveInventoryIntegrityProjection,
} from "./inventoryIntegrityProjectionResolver";
import type {
  EdgeProjectionSourceMetadata,
  InventoryIntegrityEdgeProjectionResponse,
  InventoryIntegrityProjectionRegistry,
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
  capabilities: ["static_read_only", "no_network_access", "no_execution_authority"],
  truthSource: "inventory_transactions",
  cacheCompareTarget: "inventory_current",
  semanticBoundary: "reasoning_visualization_only",
  executionBoundary:
    "source boundary は fetch layer ではありません。Supabase 接続、compare execution、rebuild、replay、correction、mutation は実行しません。",
};

export const futureEdgeProjectionSourceMetadata: EdgeProjectionSourceMetadata = {
  sourceId: "inventory-integrity-future-edge-projection-source",
  sourceKind: "future_edge_projection_source",
  label: "将来 Edge projection source",
  semanticMeaning:
    "将来の Edge Function response を read-only projection source として読むための source semantics scaffold です。",
  capabilities: [
    "future_edge_response",
    "future_governance_visualization",
    "no_network_access",
    "no_execution_authority",
  ],
  truthSource: "inventory_transactions",
  cacheCompareTarget: "inventory_current",
  edgeFunctionName: "future-inventory-integrity-projection",
  responseContract: "future read-only normalized projection response",
  networkBoundary:
    "この metadata は将来 source の意味境界のみを示します。fetch、Supabase 接続、network access は追加しません。",
  semanticBoundary: "reasoning_visualization_only",
  executionBoundary:
    "Edge projection source scaffold は fetch implementation ではありません。Edge Function 呼び出し、compare execution、rebuild、replay、correction、mutation は実行しません。",
};

export const futureSnapshotProjectionSourceMetadata: ProjectionSourceMetadata = {
  sourceId: "inventory-integrity-future-snapshot-projection-source",
  sourceKind: "future_snapshot_projection_source",
  label: "将来 snapshot projection source",
  semanticMeaning:
    "将来の snapshot projection を read-only projection source として読むための source semantics scaffold です。",
  capabilities: [
    "future_snapshot_projection",
    "future_governance_visualization",
    "no_network_access",
    "no_execution_authority",
  ],
  truthSource: "inventory_transactions",
  cacheCompareTarget: "inventory_current",
  semanticBoundary: "reasoning_visualization_only",
  executionBoundary:
    "snapshot projection source scaffold は snapshot fetch や rebuild authority ではありません。live data 接続、compare execution、replay、correction、mutation は実行しません。",
};

export function createInventoryIntegrityMockEdgeProjectionResponse(
  rawData: InventoryIntegrityReadOnlyData,
): InventoryIntegrityEdgeProjectionResponse {
  const client = createInventoryIntegrityMockEdgeClient(staticMockSourceMetadata, rawData);

  return readProjectionResponse(client, defaultInventoryIntegrityEdgeRequest);
}

export function createInventoryIntegrityStaticMockSource(
  rawData: InventoryIntegrityReadOnlyData,
): InventoryIntegrityReadOnlySource {
  const registry = createInventoryIntegrityProjectionRegistry(staticMockSourceMetadata);

  return {
    metadata: staticMockSourceMetadata,
    registry,
    read: () => createInventoryIntegrityMockEdgeProjectionResponse(rawData),
  };
}

export function getInventoryIntegrityProjectionRegistry(
  source: InventoryIntegrityReadOnlySource,
): InventoryIntegrityProjectionRegistry {
  return source.registry;
}

export function readInventoryIntegritySource(
  source: InventoryIntegrityReadOnlySource,
): InventoryIntegrityReadOnlyData {
  const resolution = resolveInventoryIntegrityProjection(
    source,
    defaultInventoryIntegrityProjectionTarget,
  );

  return (resolution?.source ?? source).read().normalizedData;
}
