import type {
  InventoryIntegrityFetchResult,
  InventoryIntegrityFetchResultMetadata,
  RawProjectionMetadataPayload,
  RawProjectionPayload,
} from "./inventoryIntegrityTypes";

// Pure read-only adapter for future fetch-result semantics -> raw payload semantics.
// This is not a fetch implementation: no fetch, network access, Supabase, execution, or mutation.

export function adaptFetchMetadataToPayload(
  metadata: InventoryIntegrityFetchResultMetadata,
): RawProjectionMetadataPayload {
  return {
    payloadId: `${metadata.resultId}-payload`,
    payloadKind:
      metadata.resultKind === "static_mock_fetch_result"
        ? "static_read_only_response"
        : metadata.resultKind === "future_snapshot_fetch_result"
          ? "future_snapshot_projection_response"
          : "future_edge_projection_response",
    source: {
      ...metadata.source,
      capabilities: [...metadata.source.capabilities],
    },
    statusSemantics: metadata.responseStatus,
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
    payloadVersion: metadata.resultVersion,
    readability:
      `${metadata.readability} fetch adapter は future fetch result を payload semantics として読む境界であり、${metadata.endpoint.endpointId} の network response handling 実装ではありません。${metadata.transportSemantics.state}、${metadata.cacheSemantics.state}、${metadata.offlineSemantics.state}、${metadata.retrySemantics.state}、${metadata.consistencySemantics.state}、${metadata.degradationSemantics.state}、${metadata.authoritySemantics.state}、${metadata.snapshotSemantics.state}、${metadata.provenanceSemantics.state}、${metadata.evidenceSemantics.state}、${metadata.fallbackSemantics.state}、${metadata.traceSemantics.state}、${metadata.governanceSemantics.state}、${metadata.reviewSemantics.state}、${metadata.decisionSemantics.state}、${metadata.attentionSemantics.state}、${metadata.escalationSemantics.state}、${metadata.telemetrySemantics.state}、${metadata.latencySemantics.state}、${metadata.availabilitySemantics.state}、${metadata.diagnosticSemantics.state}、${metadata.confidenceSemantics.state}、${metadata.healthSemantics.state}、${metadata.resilienceSemantics.state}、${metadata.stabilitySemantics.state}、${metadata.recoverabilitySemantics.state}、${metadata.durabilitySemantics.state}、${metadata.continuitySemantics.state}、${metadata.integrityAssuranceSemantics.state}、${metadata.survivabilitySemantics.state}、${metadata.trustworthinessSemantics.state}、${metadata.operationalSustainabilitySemantics.state}、${metadata.fetchExecution.state}、${metadata.responseStatus.status} は read-only semantic state であり実行結果ではありません。`,
    adapterInputBoundary:
      `${metadata.adapterInputBoundary} request ${metadata.request.requestId}、endpoint ${metadata.endpoint.endpointId}、transport ${metadata.transportSemantics.semanticsId}、cache ${metadata.cacheSemantics.semanticsId}、offline ${metadata.offlineSemantics.semanticsId}、retry ${metadata.retrySemantics.semanticsId}、consistency ${metadata.consistencySemantics.semanticsId}、degradation ${metadata.degradationSemantics.semanticsId}、authority ${metadata.authoritySemantics.semanticsId}、snapshot ${metadata.snapshotSemantics.semanticsId}、provenance ${metadata.provenanceSemantics.semanticsId}、evidence ${metadata.evidenceSemantics.semanticsId}、fallback ${metadata.fallbackSemantics.semanticsId}、trace ${metadata.traceSemantics.semanticsId}、governance ${metadata.governanceSemantics.semanticsId}、review ${metadata.reviewSemantics.semanticsId}、decision ${metadata.decisionSemantics.semanticsId}、attention ${metadata.attentionSemantics.semanticsId}、escalation ${metadata.escalationSemantics.semanticsId}、telemetry ${metadata.telemetrySemantics.semanticsId}、latency ${metadata.latencySemantics.semanticsId}、availability ${metadata.availabilitySemantics.semanticsId}、diagnostic ${metadata.diagnosticSemantics.semanticsId}、confidence ${metadata.confidenceSemantics.semanticsId}、health ${metadata.healthSemantics.semanticsId}、resilience ${metadata.resilienceSemantics.semanticsId}、stability ${metadata.stabilitySemantics.semanticsId}、recoverability ${metadata.recoverabilitySemantics.semanticsId}、durability ${metadata.durabilitySemantics.semanticsId}、continuity ${metadata.continuitySemantics.semanticsId}、integrity assurance ${metadata.integrityAssuranceSemantics.semanticsId}、survivability ${metadata.survivabilitySemantics.semanticsId}、trustworthiness ${metadata.trustworthinessSemantics.semanticsId}、sustainability ${metadata.operationalSustainabilitySemantics.semanticsId}、${metadata.fetchSemantics.semanticsId}、execution ${metadata.fetchExecution.semanticsId}、response ${metadata.responseStatus.semanticsId} は read-only metadata であり、fetch / offline / compare / degradation / permission / snapshot / lineage / 検証境界 / fallback / trace / governance review / review execution / decision execution / alert / notification execution / escalation execution / health monitoring / durability review / continuity orchestration / failover execution / interruption recovery / 計測条件ではありません。`,
    truthSource: metadata.truthSource,
    cacheCompareTarget: metadata.cacheCompareTarget,
    semanticBoundary: metadata.semanticBoundary,
    executionBoundary: metadata.executionBoundary,
  };
}

export function adaptFetchResponseToPayload(
  response: InventoryIntegrityFetchResult,
): RawProjectionPayload {
  return {
    metadata: adaptFetchMetadataToPayload(response.metadata),
    lifecycle: response.lifecycle,
    data: response.data,
    semanticBoundary: response.semanticBoundary,
    executionBoundary: response.executionBoundary,
  };
}
