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
    consistencySemantics: metadata.consistencySemantics,
    degradationSemantics: metadata.degradationSemantics,
    authoritySemantics: metadata.authoritySemantics,
    snapshotSemantics: metadata.snapshotSemantics,
    provenanceSemantics: metadata.provenanceSemantics,
    evidenceSemantics: metadata.evidenceSemantics,
    fallbackSemantics: metadata.fallbackSemantics,
    traceSemantics: metadata.traceSemantics,
    governanceSemantics: metadata.governanceSemantics,
    reviewSemantics: metadata.reviewSemantics,
    decisionSemantics: metadata.decisionSemantics,
    attentionSemantics: metadata.attentionSemantics,
    escalationSemantics: metadata.escalationSemantics,
    telemetrySemantics: metadata.telemetrySemantics,
    latencySemantics: metadata.latencySemantics,
    availabilitySemantics: metadata.availabilitySemantics,
    diagnosticSemantics: metadata.diagnosticSemantics,
    confidenceSemantics: metadata.confidenceSemantics,
    healthSemantics: metadata.healthSemantics,
    resilienceSemantics: metadata.resilienceSemantics,
    stabilitySemantics: metadata.stabilitySemantics,
    recoverabilitySemantics: metadata.recoverabilitySemantics,
    durabilitySemantics: metadata.durabilitySemantics,
    continuitySemantics: metadata.continuitySemantics,
    integrityAssuranceSemantics: metadata.integrityAssuranceSemantics,
    survivabilitySemantics: metadata.survivabilitySemantics,
    trustworthinessSemantics: metadata.trustworthinessSemantics,
    operationalSustainabilitySemantics:
      metadata.operationalSustainabilitySemantics,
    compareHardening: metadata.compareHardening
      ? { ...metadata.compareHardening }
      : undefined,
    compareClassification: metadata.compareClassification
      ? { ...metadata.compareClassification }
      : undefined,
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
