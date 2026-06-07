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
  | "missing_value"
  | "missing_summary"
  | "missing_node"
  | "missing_edge"
  | "missing_reason"
  | "missing_source"
  | "missing_signals"
  | "incomplete_relation"
  | "incomplete_fixture"
  | "unsupported_metadata_shape"
  | "extracted_compare_fixture_metadata"
  | "normalized_non_string_metadata"
  | "fallback_used"
  | "graph_unavailable"
  | "adapter_unavailable";

export type InventoryIntegrityGraphAdapterSourceKind =
  | "unknown_compare_response"
  | "graph_adapter_fixture"
  | "edge_projection_response"
  | "projection_response_metadata"
  | "projection_metadata"
  | "read_only_data_fixture";

export type InventoryIntegrityGraphAdapterFixtureMetadataValue = string;

export interface InventoryIntegrityGraphAdapterFixtureMetadata {
  readonly compareSeverity?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
  readonly compareRisk?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
  readonly compareEvidence?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
  readonly compareConfidence?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
  readonly compareProjectionFreshness?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
  readonly compareTruthAggregationQuality?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
  readonly compareInterpretationStability?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
  readonly compareOwnership?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
  readonly compareOwnerActionability?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
  readonly compareOperatorGuidance?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
  readonly compareOperatorMessage?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
  readonly compareOperatorSummary?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
  readonly compareOperatorTimeline?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
  readonly compareGovernanceAuditTrail?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
  readonly compareGovernanceExplainability?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
  readonly compareGovernanceReasoningCoherence?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
  readonly compareGovernanceSemanticDrift?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
  readonly compareGovernanceSemanticResilience?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
  readonly compareGovernanceSemanticRecoverability?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
  readonly compareGovernanceSemanticObservabilityContinuity?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
  readonly compareGovernanceSemanticSurvivability?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
  readonly compareGovernanceSemanticSustainability?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
  readonly compareGovernanceSemanticMaintainability?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
  readonly compareGovernanceSemanticEvolvability?: InventoryIntegrityGraphAdapterFixtureMetadataValue;
}

export interface InventoryIntegrityGraphAdapterMetadataFixtureInput {
  readonly metadata: InventoryIntegrityGraphAdapterFixtureMetadata;
  readonly sourceKind?: "graph_adapter_fixture";
}

export interface InventoryIntegrityCompareResponseFixtureMetadata {
  readonly compareClassification?: unknown;
  readonly compareSeverity?: unknown;
  readonly compareReviewReadiness?: unknown;
  readonly compareEscalationReadiness?: unknown;
  readonly compareOperationalPriority?: unknown;
  readonly compareOwnership?: unknown;
  readonly compareOwnerActionability?: unknown;
  readonly compareOperatorGuidance?: unknown;
  readonly compareOperatorMessage?: unknown;
  readonly compareOperatorSummary?: unknown;
  readonly compareOperatorTimeline?: unknown;
  readonly compareConfidence?: unknown;
  readonly compareProjectionFreshness?: unknown;
  readonly compareTruthAggregationQuality?: unknown;
  readonly compareEvidence?: unknown;
  readonly compareRisk?: unknown;
  readonly compareInterpretationStability?: unknown;
  readonly compareGovernanceAuditTrail?: unknown;
  readonly compareGovernanceExplainability?: unknown;
  readonly compareGovernanceReasoningCoherence?: unknown;
  readonly compareGovernanceSemanticDrift?: unknown;
  readonly compareGovernanceSemanticResilience?: unknown;
  readonly compareGovernanceSemanticRecoverability?: unknown;
  readonly compareGovernanceSemanticObservabilityContinuity?: unknown;
  readonly compareGovernanceSemanticSurvivability?: unknown;
  readonly compareGovernanceSemanticSustainability?: unknown;
  readonly compareGovernanceSemanticMaintainability?: unknown;
  readonly compareGovernanceSemanticEvolvability?: unknown;
  readonly governanceSemanticOwnership?: unknown;
  readonly governanceSemanticActionability?: unknown;
  readonly governanceSemanticGuidance?: unknown;
  readonly governanceSemanticMessage?: unknown;
  readonly governanceSemanticSummary?: unknown;
  readonly governanceSemanticTimeline?: unknown;
  readonly auditTrail?: unknown;
  readonly explainability?: unknown;
  readonly reasoningCoherence?: unknown;
  readonly semanticDrift?: unknown;
  readonly resilience?: unknown;
  readonly recoverability?: unknown;
  readonly continuity?: unknown;
  readonly governanceSemanticSurvivability?: unknown;
  readonly governanceSemanticSustainability?: unknown;
  readonly governanceSemanticMaintainability?: unknown;
  readonly governanceSemanticEvolvability?: unknown;
}

export interface InventoryIntegrityCompareResponseFixture {
  readonly metadata?: InventoryIntegrityCompareResponseFixtureMetadata;
  readonly responseMetadata?: unknown;
  readonly rawPayloadMetadata?: unknown;
}

export interface InventoryIntegrityGraphContractValidationFixture {
  readonly id: string;
  readonly label: string;
  readonly purpose: string;
  readonly expectedBehavior: string;
  readonly response: unknown;
}

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

export interface InventoryIntegrityGraphAdapterEdgeFixtureInput {
  readonly response: InventoryIntegrityEdgeProjectionResponse;
  readonly sourceKind: "edge_projection_response";
}
