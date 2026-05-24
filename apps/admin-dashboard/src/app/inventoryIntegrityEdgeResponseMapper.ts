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
    compareSeverity: metadata.compareSeverity
      ? { ...metadata.compareSeverity }
      : undefined,
    compareReviewReadiness: metadata.compareReviewReadiness
      ? { ...metadata.compareReviewReadiness }
      : undefined,
    compareEscalationReadiness: metadata.compareEscalationReadiness
      ? { ...metadata.compareEscalationReadiness }
      : undefined,
    compareOperationalPriority: metadata.compareOperationalPriority
      ? { ...metadata.compareOperationalPriority }
      : undefined,
    compareOwnership: metadata.compareOwnership
      ? {
          ...metadata.compareOwnership,
          ownershipSignals: [...metadata.compareOwnership.ownershipSignals],
        }
      : undefined,
    compareOwnerActionability: metadata.compareOwnerActionability
      ? {
          ...metadata.compareOwnerActionability,
          actionabilitySignals: [
            ...metadata.compareOwnerActionability.actionabilitySignals,
          ],
        }
      : undefined,
    compareOperatorGuidance: metadata.compareOperatorGuidance
      ? {
          ...metadata.compareOperatorGuidance,
          guidanceSignals: [...metadata.compareOperatorGuidance.guidanceSignals],
        }
      : undefined,
    compareOperatorMessage: metadata.compareOperatorMessage
      ? {
          ...metadata.compareOperatorMessage,
          messageSignals: [...metadata.compareOperatorMessage.messageSignals],
        }
      : undefined,
    compareOperatorSummary: metadata.compareOperatorSummary
      ? {
          ...metadata.compareOperatorSummary,
          summarySignals: [...metadata.compareOperatorSummary.summarySignals],
        }
      : undefined,
    compareOperatorTimeline: metadata.compareOperatorTimeline
      ? {
          ...metadata.compareOperatorTimeline,
          timelineSignals: [...metadata.compareOperatorTimeline.timelineSignals],
        }
      : undefined,
    compareConfidence: metadata.compareConfidence
      ? {
          ...metadata.compareConfidence,
          confidenceSignals: [...metadata.compareConfidence.confidenceSignals],
        }
      : undefined,
    compareProjectionFreshness: metadata.compareProjectionFreshness
      ? {
          ...metadata.compareProjectionFreshness,
          freshnessSignals: [...metadata.compareProjectionFreshness.freshnessSignals],
        }
      : undefined,
    compareTruthAggregationQuality: metadata.compareTruthAggregationQuality
      ? {
          ...metadata.compareTruthAggregationQuality,
          truthQualitySignals: [
            ...metadata.compareTruthAggregationQuality.truthQualitySignals,
          ],
        }
      : undefined,
    compareEvidence: metadata.compareEvidence
      ? {
          ...metadata.compareEvidence,
          evidenceSignals: [...metadata.compareEvidence.evidenceSignals],
        }
      : undefined,
    compareRisk: metadata.compareRisk
      ? {
          ...metadata.compareRisk,
          riskSignals: [...metadata.compareRisk.riskSignals],
        }
      : undefined,
    compareInterpretationStability: metadata.compareInterpretationStability
      ? {
          ...metadata.compareInterpretationStability,
          stabilitySignals: [
            ...metadata.compareInterpretationStability.stabilitySignals,
          ],
        }
      : undefined,
    compareDecisionReadiness: metadata.compareDecisionReadiness
      ? {
          ...metadata.compareDecisionReadiness,
          decisionSignals: [...metadata.compareDecisionReadiness.decisionSignals],
        }
      : undefined,
    compareOperationalImpact: metadata.compareOperationalImpact
      ? {
          ...metadata.compareOperationalImpact,
          impactSignals: [...metadata.compareOperationalImpact.impactSignals],
        }
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
