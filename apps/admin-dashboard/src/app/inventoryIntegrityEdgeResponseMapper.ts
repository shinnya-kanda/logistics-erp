import { normalizeInventoryIntegrityReadOnlyData } from "./inventoryIntegrityAdapter";
import type {
  InventoryIntegrityEdgeProjectionResponse,
  InventoryIntegrityRawEdgeProjectionResponse,
  ProjectionResponseLifecycle,
  ProjectionResponseMetadata,
} from "./inventoryIntegrityTypes";

// Pure read-only mapper for raw Edge-like response -> normalized response envelope.
// This is a response mapping boundary only: no fetch, network access, Supabase, execution, or mutation.

export function mapEdgeProjectionMetadata(
  metadata: ProjectionResponseMetadata,
): ProjectionResponseMetadata {
  return {
    responseId: metadata.responseId,
    responseKind: metadata.responseKind,
    source: {
      ...metadata.source,
      capabilities: [...metadata.source.capabilities],
    },
    responseContractVersion: metadata.responseContractVersion,
    readability: metadata.readability,
    adapterInputBoundary: metadata.adapterInputBoundary,
    truthSource: metadata.truthSource,
    cacheCompareTarget: metadata.cacheCompareTarget,
    semanticBoundary: metadata.semanticBoundary,
    executionBoundary: metadata.executionBoundary,
  };
}

export function mapEdgeProjectionLifecycle(
  lifecycle: ProjectionResponseLifecycle,
): ProjectionResponseLifecycle {
  return {
    state: lifecycle.state,
    label: lifecycle.label,
    readability: lifecycle.readability,
    interpretation: lifecycle.interpretation,
    semanticBoundary: lifecycle.semanticBoundary,
    executionBoundary: lifecycle.executionBoundary,
  };
}

export function mapEdgeProjectionResponse(
  response: InventoryIntegrityRawEdgeProjectionResponse,
): InventoryIntegrityEdgeProjectionResponse {
  return {
    metadata: mapEdgeProjectionMetadata(response.metadata),
    lifecycle: mapEdgeProjectionLifecycle(response.lifecycle),
    normalizedData: normalizeInventoryIntegrityReadOnlyData(response.rawData),
    semanticBoundary: response.semanticBoundary,
    executionBoundary: response.executionBoundary,
  };
}
