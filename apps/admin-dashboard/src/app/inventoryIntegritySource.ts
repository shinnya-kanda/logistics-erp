import {
  createInventoryIntegrityFetchResult,
  createInventoryIntegrityMockEdgeClient,
  createInventoryIntegrityReadOnlyEdgeRequest,
  createInventoryIntegrityReadOnlyEndpointContract,
  defaultInventoryIntegrityEdgeRequest,
  inventoryIntegrityUnavailableResponseStatusSemantics,
  readProjectionResponse,
} from "./inventoryIntegrityEdgeClient";
import { adaptFetchResponseToPayload } from "./inventoryIntegrityFetchAdapter";
import { mapEdgeProjectionResponse } from "./inventoryIntegrityEdgeResponseMapper";
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
  InventoryIntegrityReadOnlyFetchSource,
  InventoryIntegrityReadOnlySource,
  ProjectionSourceMetadata,
} from "./inventoryIntegrityTypes";

// Read-only source boundary for Inventory Integrity projections.
// The optional PoC fetch path is GET-only and keeps static fallback; no mutation or workflow.

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

export const realReadOnlyProjectionSourceMetadata: EdgeProjectionSourceMetadata = {
  sourceId: "inventory-integrity-real-read-only-projection-source",
  sourceKind: "edge_function_source",
  label: "real read-only projection source",
  semanticMeaning:
    "real read-only endpoint response を Inventory Integrity projection として読む PoC source boundary です。",
  capabilities: [
    "real_read_only_endpoint",
    "future_edge_response",
    "future_governance_visualization",
    "no_execution_authority",
  ],
  truthSource: "inventory_transactions",
  cacheCompareTarget: "inventory_current",
  edgeFunctionName: "inventory-integrity-read-only-projection",
  responseContract: "read-only normalized projection response",
  networkBoundary:
    "GET read-only fetch 1 本のみを許す PoC boundary です。POST、write API、mutation、workflow は追加しません。",
  semanticBoundary: "reasoning_visualization_only",
  executionBoundary:
    "real read-only projection source は execution authority を持ちません。compare execution、rebuild、replay、correction、mutation は実行しません。",
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

function isReadonlyProjectionData(value: unknown): value is InventoryIntegrityReadOnlyData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Record<keyof InventoryIntegrityReadOnlyData, unknown>>;

  return (
    Array.isArray(candidate.summaries) &&
    Array.isArray(candidate.issues) &&
    Array.isArray(candidate.signals) &&
    Array.isArray(candidate.compareProjections) &&
    Array.isArray(candidate.attentionProjections) &&
    Array.isArray(candidate.evidenceProjections) &&
    Array.isArray(candidate.sourceMappings)
  );
}

function extractReadonlyProjectionData(value: unknown): InventoryIntegrityReadOnlyData | undefined {
  if (isReadonlyProjectionData(value)) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as {
    readonly data?: unknown;
    readonly normalizedData?: unknown;
    readonly payload?: { readonly data?: unknown };
  };

  if (isReadonlyProjectionData(candidate.normalizedData)) {
    return candidate.normalizedData;
  }

  if (isReadonlyProjectionData(candidate.data)) {
    return candidate.data;
  }

  if (isReadonlyProjectionData(candidate.payload?.data)) {
    return candidate.payload.data;
  }

  return undefined;
}

export function createInventoryIntegrityReadOnlyFetchSource(
  fallbackData: InventoryIntegrityReadOnlyData,
  endpointUrl?: string,
): InventoryIntegrityReadOnlyFetchSource {
  const fallbackSource = createInventoryIntegrityStaticMockSource(fallbackData);
  const endpointContract = createInventoryIntegrityReadOnlyEndpointContract(endpointUrl);
  const registry = createInventoryIntegrityProjectionRegistry(realReadOnlyProjectionSourceMetadata);

  const readFallbackResponse = () => {
    const request = createInventoryIntegrityReadOnlyEdgeRequest(endpointContract);
    const fetchResult = createInventoryIntegrityFetchResult(
      realReadOnlyProjectionSourceMetadata,
      fallbackData,
      request,
      "future_edge_fetch_result",
      inventoryIntegrityUnavailableResponseStatusSemantics,
    );
    const payload = adaptFetchResponseToPayload(fetchResult);

    return mapEdgeProjectionResponse({
      payload,
      semanticBoundary: payload.semanticBoundary,
      executionBoundary: payload.executionBoundary,
    });
  };

  return {
    metadata: realReadOnlyProjectionSourceMetadata,
    registry,
    endpointContract,
    fallbackSource,
    read: async () => {
      if (!endpointContract.enabled || !endpointContract.endpointUrl) {
        return readFallbackResponse();
      }

      try {
        const response = await fetch(endpointContract.endpointUrl, {
          method: endpointContract.method,
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          return readFallbackResponse();
        }

        const responseBody: unknown = await response.json();
        const readOnlyData = extractReadonlyProjectionData(responseBody);

        if (!readOnlyData) {
          return readFallbackResponse();
        }

        const request = createInventoryIntegrityReadOnlyEdgeRequest(endpointContract);
        const fetchResult = createInventoryIntegrityFetchResult(
          realReadOnlyProjectionSourceMetadata,
          readOnlyData,
          request,
          "future_edge_fetch_result",
        );
        const payload = adaptFetchResponseToPayload(fetchResult);

        return mapEdgeProjectionResponse({
          payload,
          semanticBoundary: payload.semanticBoundary,
          executionBoundary: payload.executionBoundary,
        });
      } catch {
        return readFallbackResponse();
      }
    },
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
