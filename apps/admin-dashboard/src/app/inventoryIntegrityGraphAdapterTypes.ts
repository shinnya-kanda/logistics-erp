import type {
  InventoryIntegrityGraphData,
  InventoryIntegrityGraphEdge,
  InventoryIntegrityGraphMetadata,
  InventoryIntegrityGraphNode,
  InventoryIntegrityGraphSummary,
} from "./inventoryIntegrityGraphTypes";
import type {
  InventoryIntegrityEdgeProjectionResponse,
  InventoryIntegrityProjectionMetadata,
  InventoryIntegrityReadOnlyData,
  ProjectionResponseMetadata,
} from "./inventoryIntegrityTypes";

// Read-only graph adapter scaffold.
// Source data must remain GET-only compare metadata.
// No mutation, no workflow execution, no API or UI integration lives here.

export type InventoryIntegrityGraphAdapterWarning =
  | "missing_compare_response"
  | "missing_metadata"
  | "missing_summary"
  | "missing_node"
  | "missing_edge"
  | "missing_reason"
  | "missing_source"
  | "missing_signals"
  | "incomplete_relation"
  | "graph_unavailable"
  | "adapter_not_implemented";

export type InventoryIntegrityGraphAdapterSourceKind =
  | "unknown_compare_response"
  | "edge_projection_response"
  | "projection_response_metadata"
  | "projection_metadata"
  | "read_only_data_fixture";

export interface InventoryIntegrityGraphAdapterInput {
  readonly compareResponse: unknown;
  readonly sourceKind?: InventoryIntegrityGraphAdapterSourceKind;
}

export interface InventoryIntegrityGraphAdapterResult {
  readonly graphData: InventoryIntegrityGraphData;
  readonly warnings: readonly InventoryIntegrityGraphAdapterWarning[];
}

export interface InventoryIntegrityGraphMappingContext {
  readonly compareResponse: unknown;
  readonly metadata: unknown;
  readonly sourceKind: InventoryIntegrityGraphAdapterSourceKind;
  readonly warnings: readonly InventoryIntegrityGraphAdapterWarning[];
  readonly readOnlyBoundary: "read_only_observability_projection";
  readonly compareEndpointMethod: "GET";
}

export interface InventoryIntegritySummaryMappingInput {
  readonly context: InventoryIntegrityGraphMappingContext;
  readonly metadata:
    | ProjectionResponseMetadata
    | InventoryIntegrityProjectionMetadata
    | unknown;
}

export interface InventoryIntegritySummaryMappingResult {
  readonly summaries: readonly InventoryIntegrityGraphSummary[];
  readonly warnings: readonly InventoryIntegrityGraphAdapterWarning[];
}

export interface InventoryIntegrityNodeMappingInput {
  readonly context: InventoryIntegrityGraphMappingContext;
  readonly metadata:
    | ProjectionResponseMetadata
    | InventoryIntegrityProjectionMetadata
    | unknown;
  readonly data?: InventoryIntegrityReadOnlyData;
}

export interface InventoryIntegrityNodeMappingResult {
  readonly nodes: readonly InventoryIntegrityGraphNode[];
  readonly warnings: readonly InventoryIntegrityGraphAdapterWarning[];
}

export interface InventoryIntegrityEdgeMappingInput {
  readonly context: InventoryIntegrityGraphMappingContext;
  readonly nodes: readonly InventoryIntegrityGraphNode[];
  readonly metadata:
    | ProjectionResponseMetadata
    | InventoryIntegrityProjectionMetadata
    | unknown;
}

export interface InventoryIntegrityEdgeMappingResult {
  readonly edges: readonly InventoryIntegrityGraphEdge[];
  readonly warnings: readonly InventoryIntegrityGraphAdapterWarning[];
}

export interface InventoryIntegrityGraphMetadataMappingInput {
  readonly context: InventoryIntegrityGraphMappingContext;
  readonly metadata:
    | ProjectionResponseMetadata
    | InventoryIntegrityProjectionMetadata
    | unknown;
}

export interface InventoryIntegrityGraphMetadataMappingResult {
  readonly metadata: InventoryIntegrityGraphMetadata;
  readonly warnings: readonly InventoryIntegrityGraphAdapterWarning[];
}

export interface InventoryIntegrityGraphAdapterFixtureInput {
  readonly response: InventoryIntegrityEdgeProjectionResponse;
  readonly sourceKind: "edge_projection_response";
}
