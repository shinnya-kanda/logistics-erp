import { normalizeInventoryIntegrityReadOnlyData } from "./inventoryIntegrityAdapter";
import type {
  InventoryIntegrityEdgeProjectionResponse,
  InventoryIntegrityRawEdgeProjectionResponse,
  ProjectionResponseLifecycle,
  ProjectionResponseMetadata,
  RawProjectionLifecyclePayload,
  RawProjectionMetadataPayload,
} from "./inventoryIntegrityTypes";

// Pure read-only mapper for raw Edge-like response -> normalized response envelope.
// This is a response mapping boundary only: no fetch, network access, Supabase, execution, or mutation.

export function mapEdgeProjectionMetadata(
  metadata: RawProjectionMetadataPayload,
): ProjectionResponseMetadata {
  return {
    responseId: metadata.payloadId,
    responseKind: metadata.payloadKind,
    source: {
      ...metadata.source,
      capabilities: [...metadata.source.capabilities],
    },
    statusSemantics: metadata.statusSemantics,
    responseContractVersion: metadata.payloadVersion,
    readability: metadata.readability,
    adapterInputBoundary: metadata.adapterInputBoundary,
    truthSource: metadata.truthSource,
    cacheCompareTarget: metadata.cacheCompareTarget,
    semanticBoundary: metadata.semanticBoundary,
    executionBoundary: metadata.executionBoundary,
  };
}

export function mapEdgeProjectionLifecycle(
  lifecycle: RawProjectionLifecyclePayload,
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
    metadata: mapEdgeProjectionMetadata(response.payload.metadata),
    lifecycle: mapEdgeProjectionLifecycle(response.payload.lifecycle),
    statusSemantics: response.payload.metadata.statusSemantics,
    normalizedData: normalizeInventoryIntegrityReadOnlyData(response.payload.data),
    semanticBoundary: response.semanticBoundary,
    executionBoundary: response.executionBoundary,
  };
}
