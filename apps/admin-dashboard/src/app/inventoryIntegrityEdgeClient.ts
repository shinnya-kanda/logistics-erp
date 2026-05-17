import { mapEdgeProjectionResponse } from "./inventoryIntegrityEdgeResponseMapper";
import { adaptFetchResponseToPayload } from "./inventoryIntegrityFetchAdapter";
import type {
  InventoryIntegrityEdgeClient,
  InventoryIntegrityEdgeClientSummary,
  InventoryIntegrityEdgeProjectionResponse,
  InventoryIntegrityEdgeRequest,
  InventoryIntegrityFetchPolicy,
  InventoryIntegrityFetchResult,
  InventoryIntegrityFetchSemantics,
  InventoryIntegrityRawEdgeProjectionResponse,
  InventoryIntegrityReadOnlyData,
  ProjectionEndpoint,
  ProjectionEndpointPolicy,
  ProjectionFetchExecutionSemantics,
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

export const inventoryIntegrityEndpointPolicy: ProjectionEndpointPolicy = {
  policyId: "inventory-integrity-static-read-only-endpoint-policy",
  label: "static read-only endpoint semantics policy",
  capabilities: [
    "static_mock_endpoint_reference",
    "future_read_only_edge_endpoint",
    "future_projection_loading_endpoint",
    "future_governance_visualization_endpoint",
    "no_network_access",
    "no_execution_authority",
  ],
  requestBoundary:
    "endpoint policy は Edge request が参照する endpoint の読み方を示す metadata であり、request dispatch 条件ではありません。",
  fetchBoundary:
    "endpoint policy は fetch semantics と接続されますが、fetch 実装、network access、Supabase 接続は追加しません。",
  readability:
    "endpoint capability / no-network / no-execution を同じ policy 上で読めるようにするための read-only semantics です。",
  truthSource: "inventory_transactions",
  cacheCompareTarget: "inventory_current",
  semanticBoundary: "reasoning_visualization_only",
  executionBoundary:
    "ProjectionEndpointPolicy は execution authority を持ちません。Edge Function 呼び出し、fetch、network access、compare execution、mutation は実行しません。",
};

export const inventoryIntegrityProjectionEndpoint: ProjectionEndpoint = {
  endpointId: "inventory-integrity-static-mock-endpoint",
  endpointKind: "static_mock_endpoint",
  label: "static mock endpoint reference",
  capability: "static_mock_endpoint_reference",
  policy: inventoryIntegrityEndpointPolicy,
  endpointReference: "static://inventory-integrity/mock-projection",
  readability:
    "static mock flow を future read-only Edge endpoint と同じ語彙で読むための endpoint reference です。",
  truthSource: "inventory_transactions",
  cacheCompareTarget: "inventory_current",
  semanticBoundary: "reasoning_visualization_only",
  executionBoundary:
    "ProjectionEndpoint は real endpoint implementation ではありません。URL 呼び出し、fetch、network access、Supabase 接続、mutation は実行しません。",
};

export const inventoryIntegrityFetchExecutionSemantics: ProjectionFetchExecutionSemantics = {
  semanticsId: "inventory-integrity-static-read-only-fetch-execution-semantics",
  state: "request_accepted",
  label: "read-only request accepted semantics",
  readability:
    "request_accepted は read-only semantic boundary として request を読める状態を示します。fetch 実行開始や network 成功ではありません。",
  requestInterpretation:
    "Edge request は payload 生成の読み取り文脈として受け付けられますが、real Edge request、query execution、dispatch は行いません。",
  endpointInterpretation:
    "endpoint は static reference として参照されますが、URL 呼び出し、Edge Function 呼び出し、network access は行いません。",
  noExecutionMeaning:
    "request_blocked / request_unsupported / request_unavailable も将来の解釈状態であり、自動復旧、retry、workflow、mutation の開始条件ではありません。",
  truthSource: "inventory_transactions",
  cacheCompareTarget: "inventory_current",
  semanticBoundary: "reasoning_visualization_only",
  executionBoundary:
    "ProjectionFetchExecutionSemantics は execution implementation ではありません。fetch、network access、Supabase 接続、compare execution、mutation は実行しません。",
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
  endpoint: inventoryIntegrityProjectionEndpoint,
  fetchSemantics: inventoryIntegrityFetchSemantics,
  fetchExecution: inventoryIntegrityFetchExecutionSemantics,
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
    endpoint: inventoryIntegrityProjectionEndpoint,
    fetchSemantics: inventoryIntegrityFetchSemantics,
    fetchExecution: inventoryIntegrityFetchExecutionSemantics,
    readProjectionPayload: (request = defaultInventoryIntegrityEdgeRequest) => {
      const fetchResult: InventoryIntegrityFetchResult = {
        metadata: {
          resultId: `${request.requestId}-fetch-result`,
          resultKind: "static_mock_fetch_result",
          source,
          endpoint: request.endpoint,
          request,
          fetchSemantics: request.fetchSemantics,
          fetchExecution: request.fetchExecution,
          resultVersion: "inventory-integrity-static-fetch-result-v1",
          readability:
            `static mock source を future fetch result と同じ語彙で読むための metadata です。request、${request.endpoint.endpointId}、${request.fetchSemantics.semanticsId}、${request.fetchExecution.state} は読み方の境界であり実行結果ではありません。`,
          adapterInputBoundary:
            "mock fetch result は fetch adapter input boundary の simulation です。endpoint implementation、Edge API implementation、fetch、network access、Supabase 接続は含みません。",
          truthSource: "inventory_transactions",
          cacheCompareTarget: "inventory_current",
          semanticBoundary: "reasoning_visualization_only",
          executionBoundary:
            `fetch result semantics は real network response ではありません。request ${request.requestId} は compare execution、rebuild、replay、correction、mutation、workflow を実行しません。`,
        },
        lifecycle: {
          state: "projection_normalized",
          label: "mock fetch result payload 変換対象",
          readability:
            "static mock data が fetch adapter を経由して raw payload abstraction に変換される状態です。",
          interpretation:
            "fetch result lifecycle は将来 fetch result の読み方であり、実データ取得完了や Edge 呼び出し完了を意味しません。",
          semanticBoundary: "reasoning_visualization_only",
          executionBoundary:
            "fetch result lifecycle は lifecycle engine ではありません。fetch、network access、compare execution、rebuild、mutation は実行しません。",
        },
        data: rawData,
        semanticBoundary: "reasoning_visualization_only",
        executionBoundary:
          "InventoryIntegrityFetchResult は read-only fetch result semantics です。Edge Function 呼び出し、network access、mutation は実行しません。",
      };

      return adaptFetchResponseToPayload(fetchResult);
    },
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
    endpointId: request.endpoint.endpointId,
    endpointCapability: request.endpoint.capability,
    fetchSemanticsId: request.fetchSemantics.semanticsId,
    fetchCapability: request.fetchSemantics.capability,
    fetchExecutionState: request.fetchExecution.state,
    payloadId: payload.metadata.payloadId,
    payloadVersion: payload.metadata.payloadVersion,
    readability:
      "Edge client summary は payload 境界の読みやすさを示す metadata であり、network status や execution status ではありません。",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "readProjectionSummary は read-only summary scaffold です。fetch、network access、Supabase 接続、mutation は実行しません。",
  };
}
