// Static read-only contract for inventory integrity visualization.
// This scaffold models compare / lineage / attention / evidence / source trace semantics only.
// It must not grow rebuild, replay, correction, or inventory mutation contracts.

export type InventoryIntegritySemanticBoundary = "reasoning_visualization_only";

export type InventoryIntegrityExecutionBoundary = string;

export type InventoryIntegrityTruthSource = "inventory_transactions";

export type InventoryIntegrityCacheCompareTarget = "inventory_current";

export type InventoryIntegrityStaticPolicySource = "static_policy";

export type InventoryIntegrityProjectionType =
  | "compare_projection"
  | "attention_projection"
  | "evidence_projection"
  | "source_mapping_projection";

export type InventoryIntegrityProjectionSourceKind =
  | "static_mock_source"
  | "edge_function_source"
  | "future_edge_projection_source"
  | "snapshot_source"
  | "future_snapshot_projection_source"
  | "compare_source"
  | "governance_visualization_source";

export type ProjectionSourceCapability =
  | "static_read_only"
  | "future_edge_response"
  | "future_snapshot_projection"
  | "future_governance_visualization"
  | "no_network_access"
  | "no_execution_authority";

export type ProjectionSourceMetadata = {
  readonly sourceId: string;
  readonly sourceKind: InventoryIntegrityProjectionSourceKind;
  readonly label: string;
  readonly semanticMeaning: string;
  readonly capabilities: readonly ProjectionSourceCapability[];
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type EdgeProjectionSourceMetadata = ProjectionSourceMetadata & {
  readonly sourceKind: "edge_function_source" | "future_edge_projection_source";
  readonly edgeFunctionName: string;
  readonly responseContract: string;
  readonly networkBoundary: string;
};

export type InventoryIntegrityProjectionSource<TOutput> = {
  readonly metadata: ProjectionSourceMetadata;
  readonly read: () => TOutput;
};

export type InventoryIntegrityRegisteredProjectionKind =
  | "inventory_summary_projection"
  | "inventory_compare_projection"
  | "inventory_integrity_projection"
  | "governance_review_projection"
  | "snapshot_projection";

export type ProjectionDefinitionIdentity = {
  readonly definitionId: string;
  readonly projectionKind: InventoryIntegrityRegisteredProjectionKind;
  readonly projectionName: string;
  readonly projectionVersion: string;
  readonly contractVersion: string;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionAdapterBoundary = {
  readonly adapterId: string;
  readonly label: string;
  readonly semanticMeaning: string;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionSelectorBoundary = {
  readonly selectorIds: readonly string[];
  readonly label: string;
  readonly semanticMeaning: string;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionDefinition = {
  readonly identity: ProjectionDefinitionIdentity;
  readonly source: ProjectionSourceMetadata;
  readonly adapter: ProjectionAdapterBoundary;
  readonly selectorBoundary: ProjectionSelectorBoundary;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticMeaning: string;
};

export type InventoryIntegrityProjectionRegistry = {
  readonly registryId: string;
  readonly label: string;
  readonly semanticMeaning: string;
  readonly definitions: readonly ProjectionDefinition[];
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionResolutionTarget = {
  readonly definitionId?: string;
  readonly projectionName?: string;
  readonly projectionKind?: InventoryIntegrityRegisteredProjectionKind;
};

export type ProjectionScope = {
  readonly scope: InventoryCompareScope | "all";
  readonly warehouseId?: string;
  readonly projectId?: string;
  readonly locationId?: string;
  readonly partId?: string;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionViewMode =
  | "summary_view"
  | "compare_view"
  | "integrity_view"
  | "governance_view"
  | "audit_view"
  | "operational_view";

export type ProjectionReviewMode =
  | "read_only_review"
  | "governance_review"
  | "audit_review"
  | "operational_review"
  | "review_readiness";

export type GovernanceContext = {
  readonly governanceMode:
    | "read_only_governance"
    | "operational_governance"
    | "audit_governance"
    | "review_governance";
  readonly interpretationFocus: string;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ReviewContext = {
  readonly reviewMode: ProjectionReviewMode;
  readonly reviewFocus: string;
  readonly reviewReadiness: InventoryIntegrityReviewReadinessLevel;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type WarehouseContext = {
  readonly warehouseScope: "all_warehouses" | "selected_warehouse";
  readonly warehouseId?: string;
  readonly warehouseLabel: string;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionContext = {
  readonly contextId: string;
  readonly label: string;
  readonly semanticMeaning: string;
  readonly governance: GovernanceContext;
  readonly review: ReviewContext;
  readonly warehouse: WarehouseContext;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryIntegrityProjectionQuery = {
  readonly queryId: string;
  readonly target: ProjectionResolutionTarget;
  readonly scope: ProjectionScope;
  readonly viewMode: ProjectionViewMode;
  readonly reviewMode: ProjectionReviewMode;
  readonly context: ProjectionContext;
  readonly semanticMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryIntegrityReadOnlySource =
  InventoryIntegrityProjectionSource<InventoryIntegrityReadOnlyData> & {
    readonly registry: InventoryIntegrityProjectionRegistry;
  };

export type ProjectionResolution = {
  readonly registry: InventoryIntegrityProjectionRegistry;
  readonly definition: ProjectionDefinition;
  readonly source: InventoryIntegrityReadOnlySource;
  readonly adapter: ProjectionAdapterBoundary;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryIntegritySelectorNormalizationBoundary = {
  readonly selectorId: string;
  readonly label: string;
  readonly semanticMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryIntegrityProjectionServiceBoundary = {
  readonly serviceId: string;
  readonly label: string;
  readonly semanticMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryIntegrityConfidenceLevel = "high" | "medium" | "low" | "unknown";

export type InventoryIntegrityFreshnessLevel =
  | "fresh"
  | "stale"
  | "delayed"
  | "expired"
  | "unknown";

export type InventoryIntegrityCompletenessLevel = "complete" | "partial" | "missing" | "unknown";

export type InventoryIntegrityReviewReadinessLevel =
  | "review_ready"
  | "partially_ready"
  | "not_ready"
  | "blocked_review";

export type ProjectionLifecycleState =
  | "projection_created"
  | "projection_normalized"
  | "projection_stale"
  | "projection_review_required"
  | "projection_resolved";

export type InventoryIntegrityLevel = "stable" | "watch" | "limited" | "degraded";

export type InventoryIntegrityStatus =
  | "compare_ready"
  | "review_needed"
  | "source_gap"
  | "projection_gap";

export type InventoryIntegrityIssue = {
  readonly id: string;
  readonly level: InventoryIntegrityLevel;
  readonly status: InventoryIntegrityStatus;
  readonly title: string;
  readonly description: string;
  readonly currentReadModelSignal: string;
  readonly transactionTruthSignal: string;
};

export type InventoryIntegritySignal = {
  readonly id: string;
  readonly level: InventoryIntegrityLevel;
  readonly label: string;
  readonly value: string;
  readonly note: string;
};

export type InventoryIntegritySummary = {
  readonly label: string;
  readonly value: string;
  readonly level: InventoryIntegrityLevel;
  readonly status: InventoryIntegrityStatus;
  readonly description: string;
};

export type InventoryCompareSeverity = "info" | "watch" | "warning" | "critical";

export type InventoryCompareReason =
  | "read_model_cache_gap"
  | "transaction_aggregation_gap"
  | "location_scope_gap"
  | "project_scope_gap"
  | "not_compared";

export type InventoryCompareScope =
  | "part"
  | "location"
  | "project"
  | "inventory_type"
  | "warehouse";

export type InventoryIntegrityProjectionIdentity = {
  readonly projectionId: string;
  readonly projectionType: InventoryIntegrityProjectionType;
  readonly projectionVersion: string;
  readonly scope: InventoryCompareScope;
  readonly generatedAt: string;
  readonly contractVersion: string;
};

export type InventoryIntegritySnapshotMetadata = {
  readonly snapshotId: string;
  readonly asOfTime: string;
  readonly observedAt: string;
  readonly transactionCoverage: InventoryIntegrityCompletenessLevel;
  readonly freshness: InventoryIntegrityFreshnessLevel;
  readonly limitation: string;
};

export type InventoryIntegrityFreshnessMetadata = {
  readonly level: InventoryIntegrityFreshnessLevel;
  readonly reason: string;
  readonly caveat: string;
};

export type InventoryIntegrityConfidenceMetadata = {
  readonly level: InventoryIntegrityConfidenceLevel;
  readonly reason: string;
  readonly caveat: string;
};

export type InventoryIntegrityCompletenessMetadata = {
  readonly level: InventoryIntegrityCompletenessLevel;
  readonly scope: string;
  readonly caveat: string;
};

export type InventoryIntegrityReviewReadinessMetadata = {
  readonly level: InventoryIntegrityReviewReadinessLevel;
  readonly reason: string;
  readonly caveat: string;
};

export type InventoryIntegrityProjectionLifecycleMetadata = {
  readonly state: ProjectionLifecycleState;
  readonly label: string;
  readonly readability: string;
  readonly interpretation: string;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryIntegrityTraceabilityMetadata = {
  readonly sourceTraceLabel: string;
  readonly sourceChain: readonly string[];
  readonly caveat: string;
};

export type InventoryIntegrityLineageMetadata = {
  readonly lineageLabel: string;
  readonly derivedFrom: readonly string[];
  readonly caveat: string;
};

export type InventoryIntegrityEvidenceMetadata = {
  readonly source: InventoryIntegrityEvidenceSource;
  readonly confidence: InventoryIntegrityConfidenceMetadata;
  readonly freshness: InventoryIntegrityFreshnessMetadata;
  readonly completeness: InventoryIntegrityCompletenessMetadata;
  readonly gaps: readonly InventoryIntegrityEvidenceGap[];
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryIntegrityProjectionMetadata = {
  readonly identity: InventoryIntegrityProjectionIdentity;
  readonly snapshot: InventoryIntegritySnapshotMetadata;
  readonly evidence: InventoryIntegrityEvidenceMetadata;
  readonly confidence: InventoryIntegrityConfidenceMetadata;
  readonly freshness: InventoryIntegrityFreshnessMetadata;
  readonly completeness: InventoryIntegrityCompletenessMetadata;
  readonly traceability: InventoryIntegrityTraceabilityMetadata;
  readonly lineage: InventoryIntegrityLineageMetadata;
  readonly reviewReadiness: InventoryIntegrityReviewReadinessMetadata;
  readonly lifecycle: InventoryIntegrityProjectionLifecycleMetadata;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryCompareDifference = {
  readonly currentReadModelQuantity: string;
  readonly transactionAggregationQuantity: string;
  readonly differenceQuantity: string;
  readonly reason: InventoryCompareReason;
  readonly severity: InventoryCompareSeverity;
};

export type InventoryCompareTrace = {
  readonly traceId: string;
  readonly parentTraceId: string;
  readonly label: string;
};

export type InventoryCompareDerivedFrom = {
  readonly source:
    | InventoryIntegrityTruthSource
    | InventoryIntegrityCacheCompareTarget
    | InventoryIntegrityStaticPolicySource;
  readonly label: string;
  readonly semanticMeaning: string;
};

export type InventoryCompareDependency = {
  readonly id: string;
  readonly label: string;
  readonly semanticMeaning: string;
};

export type InventoryCompareEvidence = {
  readonly id: string;
  readonly label: string;
  readonly semanticMeaning: string;
};

export type InventoryCompareLineage = {
  readonly trace: InventoryCompareTrace;
  readonly derivedFrom: readonly InventoryCompareDerivedFrom[];
  readonly dependencies: readonly InventoryCompareDependency[];
  readonly evidence: readonly InventoryCompareEvidence[];
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
};

export type InventoryIntegrityAttentionLevel =
  | "audit_required"
  | "tracking_required"
  | "review_required"
  | "reference";

export type InventoryIntegrityReviewPriority = "high" | "medium" | "low";

export type InventoryIntegrityEscalation = {
  readonly candidate: "audit_review_candidate" | "manager_review_candidate" | "none";
  readonly label: string;
  readonly semanticMeaning: string;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryIntegrityReviewSignal = {
  readonly id: string;
  readonly label: string;
  readonly reason: string;
  readonly evidenceHint: string;
};

export type InventoryIntegrityAttention = {
  readonly id: string;
  readonly projectionId: string;
  readonly attentionLevel: InventoryIntegrityAttentionLevel;
  readonly reviewPriority: InventoryIntegrityReviewPriority;
  readonly title: string;
  readonly reason: string;
  readonly reviewFocus: string;
  readonly escalation: InventoryIntegrityEscalation;
  readonly reviewSignals: readonly InventoryIntegrityReviewSignal[];
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryIntegrityEvidenceSource = {
  readonly source:
    | "inventory_transactions"
    | "inventory_current"
    | "lineage_projection"
    | "attention_projection"
    | "static_policy";
  readonly label: string;
  readonly semanticMeaning: string;
};

export type InventoryIntegrityEvidenceConfidence = InventoryIntegrityConfidenceLevel;

export type InventoryIntegrityEvidenceQuality =
  | "sufficient"
  | "partial"
  | "limited"
  | "missing";

export type InventoryIntegrityEvidenceGap = {
  readonly id: string;
  readonly label: string;
  readonly reason: string;
  readonly limitation: string;
};

export type InventoryIntegrityEvidence = {
  readonly id: string;
  readonly projectionId: string;
  readonly attentionId: string;
  readonly title: string;
  readonly metadata: InventoryIntegrityEvidenceMetadata;
  readonly source: InventoryIntegrityEvidenceSource;
  readonly confidence: InventoryIntegrityEvidenceConfidence;
  readonly quality: InventoryIntegrityEvidenceQuality;
  readonly explanation: string;
  readonly rationale: string;
  readonly gaps: readonly InventoryIntegrityEvidenceGap[];
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryIntegritySourceType =
  | "transaction_truth"
  | "current_cache"
  | "lineage_metadata"
  | "evidence_metadata"
  | "attention_metadata"
  | "static_policy";

export type InventoryIntegritySourceRelation =
  | "truth_source"
  | "compare_target"
  | "derived_context"
  | "review_context"
  | "limitation_context";

export type InventoryIntegritySourceConfidence = "high" | "medium" | "low" | "unknown";

export type InventoryIntegritySourceGap = {
  readonly id: string;
  readonly label: string;
  readonly reason: string;
  readonly limitation: string;
};

export type InventoryIntegritySource = {
  readonly id: string;
  readonly projectionId: string;
  readonly sourceType: InventoryIntegritySourceType;
  readonly relation: InventoryIntegritySourceRelation;
  readonly confidence: InventoryIntegritySourceConfidence;
  readonly label: string;
  readonly sourceName: string;
  readonly explanation: string;
  readonly gaps: readonly InventoryIntegritySourceGap[];
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryCompareProjection = {
  readonly id: string;
  readonly metadata: InventoryIntegrityProjectionMetadata;
  readonly scope: InventoryCompareScope;
  readonly label: string;
  readonly description: string;
  readonly difference: InventoryCompareDifference;
  readonly lineage: InventoryCompareLineage;
  readonly truthStatement: string;
};

export type InventoryProjectionSummaryView = {
  readonly projectionId: string;
  readonly label: string;
  readonly scope: InventoryCompareScope;
  readonly description: string;
  readonly difference: InventoryCompareDifference;
  readonly truthStatement: string;
  readonly selectorBoundary: InventoryIntegritySelectorNormalizationBoundary;
};

export type InventoryProjectionMetadataView = {
  readonly projectionId: string;
  readonly metadata: InventoryIntegrityProjectionMetadata;
  readonly selectorBoundary: InventoryIntegritySelectorNormalizationBoundary;
};

export type InventoryProjectionReviewReadinessView = {
  readonly projectionId: string;
  readonly reviewReadiness: InventoryIntegrityReviewReadinessMetadata;
  readonly lifecycle: InventoryIntegrityProjectionLifecycleMetadata;
  readonly freshness: InventoryIntegrityFreshnessMetadata;
  readonly completeness: InventoryIntegrityCompletenessMetadata;
  readonly confidence: InventoryIntegrityConfidenceMetadata;
  readonly selectorBoundary: InventoryIntegritySelectorNormalizationBoundary;
};

export type InventoryIntegrityReadOnlyData = {
  readonly summaries: readonly InventoryIntegritySummary[];
  readonly issues: readonly InventoryIntegrityIssue[];
  readonly signals: readonly InventoryIntegritySignal[];
  readonly compareProjections: readonly InventoryCompareProjection[];
  readonly attentionProjections: readonly InventoryIntegrityAttention[];
  readonly evidenceProjections: readonly InventoryIntegrityEvidence[];
  readonly sourceMappings: readonly InventoryIntegritySource[];
};

export type InventoryIntegrityProjectionServiceView = {
  readonly query: InventoryIntegrityProjectionQuery;
  readonly data: InventoryIntegrityReadOnlyData;
  readonly resolution?: ProjectionResolution;
  readonly projectionSummaries: readonly InventoryProjectionSummaryView[];
  readonly projectionMetadata: readonly InventoryProjectionMetadataView[];
  readonly projectionReviewReadiness: readonly InventoryProjectionReviewReadinessView[];
  readonly serviceBoundary: InventoryIntegrityProjectionServiceBoundary;
};

export type InventoryIntegritySummaryProjectionView = {
  readonly query: InventoryIntegrityProjectionQuery;
  readonly summaries: readonly InventoryIntegritySummary[];
  readonly issues: readonly InventoryIntegrityIssue[];
  readonly signals: readonly InventoryIntegritySignal[];
  readonly projectionSummaries: readonly InventoryProjectionSummaryView[];
  readonly serviceBoundary: InventoryIntegrityProjectionServiceBoundary;
};

export type InventoryIntegrityReviewProjectionView = {
  readonly query: InventoryIntegrityProjectionQuery;
  readonly attentionProjections: readonly InventoryIntegrityAttention[];
  readonly projectionReviewReadiness: readonly InventoryProjectionReviewReadinessView[];
  readonly serviceBoundary: InventoryIntegrityProjectionServiceBoundary;
};

export type InventoryIntegrityLevelSummary = {
  readonly level: InventoryIntegrityLevel;
  readonly count: number;
};

export type InventoryIntegrityStatusSummary = {
  readonly status: InventoryIntegrityStatus;
  readonly count: number;
};

export type InventoryCompareSeveritySummary = {
  readonly severity: InventoryCompareSeverity;
  readonly count: number;
};

export type InventoryCompareReasonSummary = {
  readonly reason: InventoryCompareReason;
  readonly count: number;
};

export type InventoryCompareScopeSummary = {
  readonly scope: InventoryCompareScope;
  readonly count: number;
};

export type InventoryIntegrityFreshnessSummary = {
  readonly freshness: InventoryIntegrityFreshnessLevel;
  readonly count: number;
};

export type InventoryIntegrityCompletenessSummary = {
  readonly completeness: InventoryIntegrityCompletenessLevel;
  readonly count: number;
};

export type InventoryIntegrityReviewReadinessSummary = {
  readonly reviewReadiness: InventoryIntegrityReviewReadinessLevel;
  readonly count: number;
};

export type InventoryCompareLineageGraphItem = {
  readonly projectionId: string;
  readonly trace: InventoryCompareTrace;
  readonly derivedFrom: readonly InventoryCompareDerivedFrom[];
};

export type InventoryCompareDependencyGraphItem = {
  readonly projectionId: string;
  readonly dependency: InventoryCompareDependency;
};

export type InventoryCompareEvidenceGraphItem = {
  readonly projectionId: string;
  readonly evidence: InventoryCompareEvidence;
};

export type InventoryIntegrityAttentionLevelSummary = {
  readonly attentionLevel: InventoryIntegrityAttentionLevel;
  readonly count: number;
};

export type InventoryIntegrityReviewPrioritySummary = {
  readonly reviewPriority: InventoryIntegrityReviewPriority;
  readonly count: number;
};

export type InventoryIntegrityEscalationSummary = {
  readonly candidate: InventoryIntegrityEscalation["candidate"];
  readonly count: number;
};

export type InventoryIntegrityReviewSignalGraphItem = {
  readonly attentionId: string;
  readonly projectionId: string;
  readonly reviewSignal: InventoryIntegrityReviewSignal;
};

export type InventoryIntegrityEvidenceQualitySummary = {
  readonly quality: InventoryIntegrityEvidenceQuality;
  readonly count: number;
};

export type InventoryIntegrityEvidenceConfidenceSummary = {
  readonly confidence: InventoryIntegrityEvidenceConfidence;
  readonly count: number;
};

export type InventoryIntegrityEvidenceGapGraphItem = {
  readonly evidenceId: string;
  readonly projectionId: string;
  readonly gap: InventoryIntegrityEvidenceGap;
};

export type InventoryIntegritySourceRelationSummary = {
  readonly relation: InventoryIntegritySourceRelation;
  readonly count: number;
};

export type InventoryIntegritySourceConfidenceSummary = {
  readonly confidence: InventoryIntegritySourceConfidence;
  readonly count: number;
};

export type InventoryIntegritySourceGapGraphItem = {
  readonly sourceId: string;
  readonly projectionId: string;
  readonly gap: InventoryIntegritySourceGap;
};
