import { mapEdgeProjectionResponse } from "./inventoryIntegrityEdgeResponseMapper";
import type {
  InventoryIntegrityEdgeClient,
  InventoryIntegrityEdgeClientSummary,
  InventoryIntegrityEdgeProjectionResponse,
  InventoryIntegrityEdgeRequest,
  InventoryIntegrityFetchPolicy,
  InventoryIntegrityFetchSemantics,
  InventoryIntegrityRawEdgeProjectionResponse,
  InventoryIntegrityReadOnlyData,
  ProjectionSourceMetadata,
  RawProjectionPayload,
} from "./inventoryIntegrityTypes";

// Read-only Edge client scaffold for future Edge projection access.
// This is not a real network client: no fetch, network access, Supabase, execution, or mutation.

export const inventoryIntegrityFetchPolicy: InventoryIntegrityFetchPolicy = {
  policyId: "inventory-integrity-static-no-network-fetch-policy",
  label: "static no-network fetch semantics policy",
  capabilities: [
    "static_no_network_read",
    "future_read_only_edge_fetch",
    "future_read_only_projection_loading",
    "future_network_response_handling",
    "no_network_access",
    "no_execution_authority",
  ],
  requestBoundary:
    "fetch semantics policy は Edge request contract の読み方を示す metadata であり、request 実行条件ではありません。",
  networkBoundary:
    "この policy は future read-only fetch capability を説明するだけで、fetch 実装、Supabase 接続、network access は追加しません。",
  readability:
    "fetch capability / no-network / no-execution を同じ policy 上で読めるようにするための read-only semantics です。",
  truthSource: "inventory_transactions",
  cacheCompareTarget: "inventory_current",
  semanticBoundary: "reasoning_visualization_only",
  executionBoundary:
    "InventoryIntegrityFetchPolicy は execution authority を持ちません。fetch、network access、compare execution、rebuild、mutation は実行しません。",
};

export const inventoryIntegrityFetchSemantics: InventoryIntegrityFetchSemantics = {
  semanticsId: "inventory-integrity-static-read-only-fetch-semantics",
  capability: "static_no_network_read",
  policy: inventoryIntegrityFetchPolicy,
  requestContractBoundary:
    "Edge request contract は fetch semantics を参照しますが、real Edge Function request や query execution には変換しません。",
  responseHandlingBoundary:
    "response handling は mapper boundary のための将来 semantics であり、network response parsing 実装ではありません。",
  readability:
    "static mock flow を future read-only fetch capability と同じ語彙で読むための fetch semantics metadata です。",
  truthSource: "inventory_transactions",
  cacheCompareTarget: "inventory_current",
  semanticBoundary: "reasoning_visualization_only",
  executionBoundary:
    "InventoryIntegrityFetchSemantics は fetch implementation ではありません。fetch、Supabase 接続、network access、mutation は実行しません。",
};

export const defaultInventoryIntegrityEdgeRequest: InventoryIntegrityEdgeRequest = {
  requestId: "inventory-integrity-static-mock-edge-request",
  requestKind: "static_mock_edge_request",
  scope: {
    scope: "all",
    readability:
      "request scope は read-only 表示範囲の意味境界であり、実データ検索や倉庫切替を実行しません。",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "ProjectionRequestScope は DB query、network access、live data 絞り込み、mutation を実行しません。",
  },
  context: {
    contextId: "inventory-integrity-static-mock-edge-request-context",
    viewMode: "integrity_view",
    reviewMode: "read_only_review",
    readability:
      "request context は projection をどう読むかの指定であり、runtime auth context や workflow state ではありません。",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "ProjectionRequestContext は認可、承認、担当割当、通知、execution workflow を実行しません。",
  },
  target: {
    projectionKind: "inventory_integrity_projection",
  },
  fetchSemantics: inventoryIntegrityFetchSemantics,
  readability:
    "Edge request contract は future Edge access request boundary であり、real network request ではありません。",
  truthSource: "inventory_transactions",
  cacheCompareTarget: "inventory_current",
  semanticBoundary: "reasoning_visualization_only",
  executionBoundary:
    "InventoryIntegrityEdgeRequest は read-only request semantics です。fetch、network access、Supabase 接続、compare execution、mutation は実行しません。",
};

export function createInventoryIntegrityMockEdgeClient(
  source: ProjectionSourceMetadata,
  rawData: InventoryIntegrityReadOnlyData,
): InventoryIntegrityEdgeClient {
  return {
    clientId: "inventory-integrity-mock-edge-client",
    label: "mock Edge client",
    source,
    semanticMeaning:
      "static mock data を future Edge payload と同じ境界で読む read-only client scaffold です。",
    fetchSemantics: inventoryIntegrityFetchSemantics,
    readProjectionPayload: (request = defaultInventoryIntegrityEdgeRequest) => ({
      metadata: {
        payloadId: `${request.requestId}-payload`,
        payloadKind: "static_read_only_response",
        source,
        payloadVersion: "inventory-integrity-raw-projection-payload-v1",
        readability:
          `static mock source を future raw Edge payload abstraction として読むための metadata payload です。request と ${request.fetchSemantics.semanticsId} は読み方の境界であり実行条件ではありません。`,
        adapterInputBoundary:
          "mock raw payload は mapper input boundary の simulation です。Edge API implementation、fetch、network access、Supabase 接続は含みません。",
        truthSource: "inventory_transactions",
        cacheCompareTarget: "inventory_current",
        semanticBoundary: "reasoning_visualization_only",
        executionBoundary:
          `raw payload semantics は real Edge payload ではありません。request ${request.requestId} は compare execution、rebuild、replay、correction、mutation、workflow を実行しません。`,
      },
      lifecycle: {
        state: "projection_normalized",
        label: "mock raw payload 正規化対象",
        readability:
          "static mock data が mapper に渡される raw payload abstraction として構成された状態です。",
        interpretation:
          "raw payload は将来 payload contract の読み方であり、実データ取得完了や Edge 呼び出し完了を意味しません。",
        semanticBoundary: "reasoning_visualization_only",
        executionBoundary:
          "payload lifecycle は lifecycle engine ではありません。fetch、network access、compare execution、rebuild、mutation は実行しません。",
      },
      data: rawData,
      semanticBoundary: "reasoning_visualization_only",
      executionBoundary:
        "RawProjectionPayload は read-only payload semantics です。Edge Function 呼び出し、network access、mutation は実行しません。",
    }),
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "Edge client scaffold は real network client ではありません。fetch、network access、Supabase 接続、compare execution、mutation は実行しません。",
  };
}

export function readProjectionResponse(
  client: InventoryIntegrityEdgeClient,
  request: InventoryIntegrityEdgeRequest = defaultInventoryIntegrityEdgeRequest,
): InventoryIntegrityEdgeProjectionResponse {
  const payload = client.readProjectionPayload(request);
  const rawResponse: InventoryIntegrityRawEdgeProjectionResponse = {
    payload,
    semanticBoundary: payload.semanticBoundary,
    executionBoundary: payload.executionBoundary,
  };

  return mapEdgeProjectionResponse(rawResponse);
}

export function readProjectionSummary(
  client: InventoryIntegrityEdgeClient,
  request: InventoryIntegrityEdgeRequest = defaultInventoryIntegrityEdgeRequest,
): InventoryIntegrityEdgeClientSummary {
  const payload: RawProjectionPayload = client.readProjectionPayload(request);

  return {
    clientId: client.clientId,
    sourceId: client.source.sourceId,
    requestId: request.requestId,
    fetchSemanticsId: request.fetchSemantics.semanticsId,
    fetchCapability: request.fetchSemantics.capability,
    payloadId: payload.metadata.payloadId,
    payloadVersion: payload.metadata.payloadVersion,
    readability:
      "Edge client summary は payload 境界の読みやすさを示す metadata であり、network status や execution status ではありません。",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "readProjectionSummary は read-only summary scaffold です。fetch、network access、Supabase 接続、mutation は実行しません。",
  };
}
