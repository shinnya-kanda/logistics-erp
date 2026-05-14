// Read-only data contract for the static Governance Dashboard.
// This file intentionally defines display-only records. It must not grow
// write-side workflow contracts.

export type GovernanceSeverity = "info" | "warning" | "high" | "critical";

export type GovernanceLifecycleState =
  | "detected"
  | "reviewing"
  | "classified"
  | "reaffirmed";

export type GovernanceDegradationType =
  | "none"
  | "meaning_consistency"
  | "semantic_safety"
  | "safe_interpretation"
  | "integrity"
  | "attention"
  | "readability"
  | "lifecycle";

export type GovernanceNoteType =
  | "semantic_safety"
  | "integrity"
  | "attention"
  | "safe_interpretation";

export type GovernanceSemanticNoteCategory =
  | "interpretation_safety"
  | "governance_quality"
  | "review_signal_only"
  | "expectation_isolation";

export type GovernanceTimelineCategory =
  | "incident"
  | "semantic_review"
  | "evidence"
  | "integrity"
  | "attention"
  | "provenance"
  | "explainability";

export type GovernanceTimelineSeverity = "info" | "watch" | "attention" | "critical";

export type GovernanceTimelineVisibility = "overview" | "grouped" | "highlighted" | "detail";

export type GovernanceTimelineRelation =
  | "source_event"
  | "derived_signal"
  | "evidence_link"
  | "semantic_context"
  | "attention_marker";

export type GovernanceTimelineEvidenceState =
  | "none"
  | "referenced"
  | "partial"
  | "lineage_visible";

export type GovernanceEvidenceCategory =
  | "rationale"
  | "provenance"
  | "lineage"
  | "confidence"
  | "audit_context";

export type GovernanceEvidenceConfidence = "high" | "medium" | "low" | "unknown";

export type GovernanceEvidenceVisibility = "summary" | "reasoning" | "lineage" | "detail";

export type GovernanceEvidenceRelation =
  | "supports_reasoning"
  | "explains_signal"
  | "links_lineage"
  | "qualifies_confidence"
  | "marks_limitation";

export type GovernanceEvidenceSource =
  | "static_mock"
  | "policy_reference"
  | "timeline_projection"
  | "semantic_review";

export type GovernanceIncidentCategory =
  | "semantic_ambiguity"
  | "attention_backlog"
  | "integrity_review"
  | "investigation_signal"
  | "coordination_context";

export type GovernanceIncidentSeverity = "info" | "watch" | "high" | "critical";

export type GovernanceIncidentStatus =
  | "detected"
  | "triage_visible"
  | "under_review"
  | "classified";

export type GovernanceIncidentVisibility = "summary" | "grouped" | "attention" | "detail";

export type GovernanceIncidentRelation =
  | "requires_review"
  | "related_semantics"
  | "attention_marker"
  | "escalation_context"
  | "uncertainty_context";

export type GovernanceIncidentAttentionLevel = "low" | "medium" | "high" | "urgent";

export type GovernanceOperationCategory =
  | "review_candidate"
  | "approval_reference"
  | "lifecycle_limitation"
  | "coordination_signal"
  | "policy_boundary";

export type GovernanceOperationPriority = "low" | "normal" | "high" | "critical";

export type GovernanceOperationState =
  | "visible"
  | "review_reference"
  | "coordination_needed"
  | "classified";

export type GovernanceOperationVisibility = "summary" | "grouped" | "attention" | "detail";

export type GovernanceOperationRelation =
  | "review_coordination"
  | "approval_reference"
  | "policy_boundary"
  | "lifecycle_context"
  | "attention_marker";

export type GovernanceProjectionType = "incident" | "evidence" | "timeline" | "operation";

export type GovernanceProjectionId = `governance:${GovernanceProjectionType}:${string}`;

export type GovernanceProjectionScope =
  | "incident_summary"
  | "operation_queue"
  | "evidence_summary"
  | "timeline";

export type GovernanceProjectionNamespace =
  | "governance.dashboard.incident"
  | "governance.dashboard.operation"
  | "governance.dashboard.evidence"
  | "governance.dashboard.timeline";

export type GovernanceProjectionSource =
  | "static_mock"
  | "policy_reference"
  | "lineage_policy"
  | "semantic_review";

export type GovernanceProjectionIdentity = {
  readonly projectionId: GovernanceProjectionId;
  readonly projectionType: GovernanceProjectionType;
  readonly scope: GovernanceProjectionScope;
  readonly namespace: GovernanceProjectionNamespace;
  readonly source: GovernanceProjectionSource;
  readonly label: string;
  readonly parentTraceId: string;
};

export type GovernanceProjectionParent = {
  readonly parentProjectionId: GovernanceProjectionId | "root";
  readonly label: string;
  readonly semanticMeaning: string;
};

export type GovernanceProjectionDerivedFrom = {
  readonly sourceProjectionId: GovernanceProjectionId;
  readonly label: string;
  readonly semanticMeaning: string;
};

export type GovernanceProjectionDependency = {
  readonly dependencyProjectionId: GovernanceProjectionId;
  readonly label: string;
  readonly semanticMeaning: string;
};

export type GovernanceProjectionTrace = {
  readonly traceId: string;
  readonly parentTraceId: string;
  readonly requestChainLabel: string;
};

export type GovernanceProjectionLineage = {
  readonly parent: GovernanceProjectionParent;
  readonly derivedFrom: readonly GovernanceProjectionDerivedFrom[];
  readonly dependencies: readonly GovernanceProjectionDependency[];
  readonly trace: GovernanceProjectionTrace;
};

export type GovernanceProjectionRelationType =
  | "supports_reasoning"
  | "explains_context"
  | "shares_anchor"
  | "raises_attention"
  | "bounds_policy"
  | "coordinates_review";

export type GovernanceProjectionReference = {
  readonly referenceId: string;
  readonly projectionType: GovernanceProjectionType;
  readonly label: string;
  readonly relationType: GovernanceProjectionRelationType;
  readonly semanticMeaning: string;
};

export type GovernanceProjectionAnchor = {
  readonly anchorId: string;
  readonly projectionType: GovernanceProjectionType;
  readonly label: string;
  readonly semanticBoundary: string;
};

export type GovernanceProjectionAttentionSignal = {
  readonly signalId: string;
  readonly projectionType: GovernanceProjectionType;
  readonly label: string;
  readonly attentionLevel: GovernanceIncidentAttentionLevel;
  readonly semanticMeaning: string;
};

export type GovernanceBadgeCategory =
  | "severity"
  | "lifecycle"
  | "approval"
  | "evidence"
  | "freshness"
  | "degradation"
  | "visibility"
  | "read_only"
  | "review_signal";

export type GovernanceBadgeTone = "neutral" | "info" | "warning" | "high" | "critical" | "safe";

export type GovernanceBadgeVisibility =
  | "overview"
  | "summary"
  | "detail"
  | "state_notice"
  | "timeline"
  | "note";

export type GovernanceSemanticBadge = {
  readonly id: string;
  readonly category: GovernanceBadgeCategory;
  readonly label: string;
  readonly tone: GovernanceBadgeTone;
  readonly visibility: GovernanceBadgeVisibility;
  readonly semanticMeaning: string;
};

export type GovernanceNoteVisibility = "overview" | "summary" | "detail" | "note";

export type GovernanceReadabilityLevel =
  | "scan_first"
  | "short_note"
  | "detail_note";

export type GovernanceOverviewTone = GovernanceSeverity | "safe";

export type GovernanceDisplayState =
  | "loading"
  | "ready"
  | "empty"
  | "stale"
  | "partial"
  | "degraded";

export type GovernanceRenderState = "readonly" | "ready" | "partial" | "stale" | "degraded";

export type GovernanceFreshnessState = "fresh" | "stale" | "unknown";

export type GovernanceDegradationState = "none" | "limited" | "degraded";

export type GovernanceVisibilityMode = "overview" | "summary" | "detail" | "timeline";

export type GovernanceContractMetadata = {
  readonly severity: GovernanceSeverity;
  readonly lifecycleState: GovernanceLifecycleState;
  readonly degradationType: GovernanceDegradationType;
  readonly visibility: GovernanceNoteVisibility;
  readonly readability: GovernanceReadabilityLevel;
};

export type GovernanceOverviewCard = GovernanceContractMetadata & {
  readonly label: string;
  readonly value: string;
  readonly description: string;
  readonly tone: GovernanceOverviewTone;
  readonly semanticBadges?: readonly GovernanceSemanticBadge[];
};

export type GovernanceSummaryRow = GovernanceContractMetadata & {
  readonly label: string;
  readonly value: string;
  readonly note: string;
  readonly semanticBadges?: readonly GovernanceSemanticBadge[];
};

export type GovernanceTimelineProjection = GovernanceContractMetadata & {
  readonly identity: GovernanceProjectionIdentity;
  readonly lineage: GovernanceProjectionLineage;
  readonly id: string;
  readonly occurredAtLabel: string;
  readonly category: GovernanceTimelineCategory;
  readonly categoryLabel: string;
  readonly title: string;
  readonly description: string;
  readonly sourceLabel: string;
  readonly projectionLabel: string;
  readonly timelineSeverity: GovernanceTimelineSeverity;
  readonly timelineVisibility: GovernanceTimelineVisibility;
  readonly relation: GovernanceTimelineRelation;
  readonly evidenceState: GovernanceTimelineEvidenceState;
  readonly groupKey: string;
  readonly groupLabel: string;
  readonly highlight: boolean;
  readonly attention: boolean;
  readonly crossReferences: readonly GovernanceProjectionReference[];
  readonly anchors: readonly GovernanceProjectionAnchor[];
  readonly attentionSignals: readonly GovernanceProjectionAttentionSignal[];
};

export type GovernanceTimelineItem = GovernanceTimelineProjection;

export type GovernanceIncidentProjection = GovernanceSummaryRow & {
  readonly identity: GovernanceProjectionIdentity;
  readonly lineage: GovernanceProjectionLineage;
  readonly incidentCategory: GovernanceIncidentCategory;
  readonly incidentSeverity: GovernanceIncidentSeverity;
  readonly incidentStatus: GovernanceIncidentStatus;
  readonly incidentVisibility: GovernanceIncidentVisibility;
  readonly relation: GovernanceIncidentRelation;
  readonly attentionLevel: GovernanceIncidentAttentionLevel;
  readonly projectionLabel: string;
  readonly groupKey: string;
  readonly groupLabel: string;
  readonly crossReferences: readonly GovernanceProjectionReference[];
  readonly anchors: readonly GovernanceProjectionAnchor[];
  readonly attentionSignals: readonly GovernanceProjectionAttentionSignal[];
};

export type GovernanceIncidentSummaryRow = GovernanceIncidentProjection;

export type GovernanceOperationProjection = GovernanceSummaryRow & {
  readonly identity: GovernanceProjectionIdentity;
  readonly lineage: GovernanceProjectionLineage;
  readonly operationCategory: GovernanceOperationCategory;
  readonly operationPriority: GovernanceOperationPriority;
  readonly operationState: GovernanceOperationState;
  readonly operationVisibility: GovernanceOperationVisibility;
  readonly relation: GovernanceOperationRelation;
  readonly projectionLabel: string;
  readonly groupKey: string;
  readonly groupLabel: string;
  readonly crossReferences: readonly GovernanceProjectionReference[];
  readonly anchors: readonly GovernanceProjectionAnchor[];
  readonly attentionSignals: readonly GovernanceProjectionAttentionSignal[];
};

export type GovernanceOperationQueueSummaryRow = GovernanceOperationProjection;

export type GovernanceEvidenceProjection = GovernanceSummaryRow & {
  readonly identity: GovernanceProjectionIdentity;
  readonly lineage: GovernanceProjectionLineage;
  readonly evidenceCategory: GovernanceEvidenceCategory;
  readonly confidence: GovernanceEvidenceConfidence;
  readonly evidenceVisibility: GovernanceEvidenceVisibility;
  readonly relation: GovernanceEvidenceRelation;
  readonly source: GovernanceEvidenceSource;
  readonly projectionLabel: string;
  readonly groupKey: string;
  readonly groupLabel: string;
  readonly attention: boolean;
  readonly crossReferences: readonly GovernanceProjectionReference[];
  readonly anchors: readonly GovernanceProjectionAnchor[];
  readonly attentionSignals: readonly GovernanceProjectionAttentionSignal[];
};

export type GovernanceEvidenceSummaryRow = GovernanceEvidenceProjection;

export type GovernanceReadOnlyNoteBase = GovernanceContractMetadata & {
  readonly noteType: GovernanceNoteType;
  readonly title: string;
  readonly category: GovernanceSemanticNoteCategory;
  readonly categoryLabel: string;
  readonly note: string;
};

export type GovernanceSemanticNote = GovernanceReadOnlyNoteBase & {
  readonly noteType: "semantic_safety";
};

export type GovernanceIntegrityNote = GovernanceReadOnlyNoteBase & {
  readonly noteType: "integrity";
};

export type GovernanceAttentionNote = GovernanceReadOnlyNoteBase & {
  readonly noteType: "attention";
};

export type GovernanceSafeInterpretationNote = GovernanceReadOnlyNoteBase & {
  readonly noteType: "safe_interpretation";
};

export type GovernanceReadOnlyNote =
  | GovernanceSemanticNote
  | GovernanceIntegrityNote
  | GovernanceAttentionNote
  | GovernanceSafeInterpretationNote;

export type GovernanceDashboardReadOnlyData = {
  readonly renderingState: GovernanceRenderingState;
  readonly overviewCards: readonly GovernanceOverviewCard[];
  readonly incidentSummary: readonly GovernanceIncidentSummaryRow[];
  readonly operationQueueSummary: readonly GovernanceOperationQueueSummaryRow[];
  readonly evidenceSummary: readonly GovernanceEvidenceSummaryRow[];
  readonly readOnlyNotes: readonly GovernanceReadOnlyNote[];
  readonly timelineItems: readonly GovernanceTimelineProjection[];
};

export type GovernanceStateNotice = {
  readonly displayState: GovernanceDisplayState;
  readonly renderState: GovernanceRenderState;
  readonly freshnessState: GovernanceFreshnessState;
  readonly degradationState: GovernanceDegradationState;
  readonly visibilityMode: GovernanceVisibilityMode;
  readonly semanticBadges: readonly GovernanceSemanticBadge[];
  readonly title: string;
  readonly message: string;
  readonly severity: GovernanceSeverity;
  readonly lifecycleState: GovernanceLifecycleState;
  readonly visibility: GovernanceNoteVisibility;
  readonly readability: GovernanceReadabilityLevel;
};

export type GovernanceOverviewItem = GovernanceOverviewCard;

export type GovernanceIncidentSummaryItem = GovernanceIncidentSummaryRow;

export type GovernanceOperationQueueItem = GovernanceOperationQueueSummaryRow;

export type GovernanceEvidenceSummaryItem = GovernanceEvidenceSummaryRow;

export type GovernanceSemanticNoteItem = GovernanceReadOnlyNote;

export type GovernanceTimelineDisplayItem = GovernanceTimelineProjection;

export type GovernanceTimelineGroup = {
  readonly groupKey: string;
  readonly groupLabel: string;
  readonly items: readonly GovernanceTimelineProjection[];
};

export type GovernanceIncidentGroup = {
  readonly groupKey: string;
  readonly groupLabel: string;
  readonly items: readonly GovernanceIncidentProjection[];
};

export type GovernanceIncidentSeveritySummary = {
  readonly severity: GovernanceIncidentSeverity;
  readonly count: number;
};

export type GovernanceIncidentAttentionSummary = {
  readonly attentionLevel: GovernanceIncidentAttentionLevel;
  readonly count: number;
};

export type GovernanceOperationGroup = {
  readonly groupKey: string;
  readonly groupLabel: string;
  readonly items: readonly GovernanceOperationProjection[];
};

export type GovernanceOperationPrioritySummary = {
  readonly priority: GovernanceOperationPriority;
  readonly count: number;
};

export type GovernanceOperationStateSummary = {
  readonly state: GovernanceOperationState;
  readonly count: number;
};

export type GovernanceEvidenceGroup = {
  readonly groupKey: string;
  readonly groupLabel: string;
  readonly items: readonly GovernanceEvidenceProjection[];
};

export type GovernanceEvidenceConfidenceSummary = {
  readonly confidence: GovernanceEvidenceConfidence;
  readonly count: number;
};

export type GovernanceProjectionRelationEdge = {
  readonly sourceId: string;
  readonly sourceType: GovernanceProjectionType;
  readonly reference: GovernanceProjectionReference;
};

export type GovernanceProjectionAnchorNode = {
  readonly sourceId: string;
  readonly sourceType: GovernanceProjectionType;
  readonly anchor: GovernanceProjectionAnchor;
};

export type GovernanceProjectionAttentionEdge = {
  readonly sourceId: string;
  readonly sourceType: GovernanceProjectionType;
  readonly attentionSignal: GovernanceProjectionAttentionSignal;
};

export type GovernanceProjectionIdentityMap = Readonly<Record<GovernanceProjectionId, GovernanceProjectionIdentity>>;

export type GovernanceProjectionScopeGroup = {
  readonly scope: GovernanceProjectionScope;
  readonly identities: readonly GovernanceProjectionIdentity[];
};

export type GovernanceProjectionNamespaceGroup = {
  readonly namespace: GovernanceProjectionNamespace;
  readonly identities: readonly GovernanceProjectionIdentity[];
};

export type GovernanceProjectionLineageEdge = {
  readonly projectionId: GovernanceProjectionId;
  readonly parent: GovernanceProjectionParent;
  readonly derivedFrom: readonly GovernanceProjectionDerivedFrom[];
};

export type GovernanceProjectionDependencyEdge = {
  readonly projectionId: GovernanceProjectionId;
  readonly dependency: GovernanceProjectionDependency;
};

export type GovernanceProjectionTraceMap = Readonly<Record<GovernanceProjectionId, GovernanceProjectionTrace>>;

export type GovernanceRenderingState = {
  readonly renderState: GovernanceRenderState;
  readonly freshnessState: GovernanceFreshnessState;
  readonly degradationState: GovernanceDegradationState;
  readonly visibilityMode: GovernanceVisibilityMode;
  readonly label: string;
  readonly message: string;
};

export type GovernanceSummaryCardMock = GovernanceOverviewCard;

export type GovernanceIncidentMock = GovernanceIncidentSummaryRow;

export type GovernanceOperationQueueMock = GovernanceOperationQueueSummaryRow;

export type GovernanceEvidenceMock = GovernanceEvidenceSummaryRow;

export type GovernanceTimelineMock = GovernanceTimelineProjection;

export type GovernanceReadOnlyNoteMock = GovernanceReadOnlyNote;

export type GovernanceDashboardMockContract = {
  readonly renderingState: GovernanceRenderingState;
  readonly overviewCards: readonly GovernanceSummaryCardMock[];
  readonly incidentSummary: readonly GovernanceIncidentMock[];
  readonly operationQueueSummary: readonly GovernanceOperationQueueMock[];
  readonly evidenceSummary: readonly GovernanceEvidenceMock[];
  readonly readOnlyNotes: readonly GovernanceReadOnlyNoteMock[];
  readonly timelineItems: readonly GovernanceTimelineMock[];
};
