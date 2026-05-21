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
    payloadVersion: metadata.resultVersion,
    readability:
      `${metadata.readability} fetch adapter は future fetch result を payload semantics として読む境界であり、${metadata.endpoint.endpointId} の network response handling 実装ではありません。${metadata.transportSemantics.state}、${metadata.cacheSemantics.state}、${metadata.offlineSemantics.state}、${metadata.retrySemantics.state}、${metadata.consistencySemantics.state}、${metadata.degradationSemantics.state}、${metadata.authoritySemantics.state}、${metadata.snapshotSemantics.state}、${metadata.provenanceSemantics.state}、${metadata.evidenceSemantics.state}、${metadata.fallbackSemantics.state}、${metadata.traceSemantics.state}、${metadata.governanceSemantics.state}、${metadata.reviewSemantics.state}、${metadata.decisionSemantics.state}、${metadata.attentionSemantics.state}、${metadata.escalationSemantics.state}、${metadata.telemetrySemantics.state}、${metadata.latencySemantics.state}、${metadata.fetchExecution.state}、${metadata.responseStatus.status} は read-only semantic state であり実行結果ではありません。`,
    adapterInputBoundary:
      `${metadata.adapterInputBoundary} request ${metadata.request.requestId}、endpoint ${metadata.endpoint.endpointId}、transport ${metadata.transportSemantics.semanticsId}、cache ${metadata.cacheSemantics.semanticsId}、offline ${metadata.offlineSemantics.semanticsId}、retry ${metadata.retrySemantics.semanticsId}、consistency ${metadata.consistencySemantics.semanticsId}、degradation ${metadata.degradationSemantics.semanticsId}、authority ${metadata.authoritySemantics.semanticsId}、snapshot ${metadata.snapshotSemantics.semanticsId}、provenance ${metadata.provenanceSemantics.semanticsId}、evidence ${metadata.evidenceSemantics.semanticsId}、fallback ${metadata.fallbackSemantics.semanticsId}、trace ${metadata.traceSemantics.semanticsId}、governance ${metadata.governanceSemantics.semanticsId}、review ${metadata.reviewSemantics.semanticsId}、decision ${metadata.decisionSemantics.semanticsId}、attention ${metadata.attentionSemantics.semanticsId}、escalation ${metadata.escalationSemantics.semanticsId}、telemetry ${metadata.telemetrySemantics.semanticsId}、latency ${metadata.latencySemantics.semanticsId}、${metadata.fetchSemantics.semanticsId}、execution ${metadata.fetchExecution.semanticsId}、response ${metadata.responseStatus.semanticsId} は read-only metadata であり、fetch / offline / compare / degradation / permission / snapshot / lineage / verification / fallback / trace / governance review / review execution / decision execution / alert / notification execution / escalation execution / telemetry collection / latency measurement / metrics export / tracing execution 条件ではありません。`,
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
