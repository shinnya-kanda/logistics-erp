import type {
  InventoryCompareProjection,
  InventoryCompareDependencyGraphItem,
  InventoryCompareEvidenceGraphItem,
  InventoryCompareLineageGraphItem,
  InventoryCompareReason,
  InventoryCompareReasonSummary,
  InventoryCompareScope,
  InventoryCompareScopeSummary,
  InventoryCompareSeverity,
  InventoryCompareSeveritySummary,
  InventoryIntegrityAttention,
  InventoryIntegrityAttentionLevel,
  InventoryIntegrityAttentionLevelSummary,
  InventoryIntegrityEscalation,
  InventoryIntegrityEscalationSummary,
  InventoryIntegrityEvidence,
  InventoryIntegrityEvidenceConfidence,
  InventoryIntegrityEvidenceConfidenceSummary,
  InventoryIntegrityEvidenceGapGraphItem,
  InventoryIntegrityEvidenceQuality,
  InventoryIntegrityEvidenceQualitySummary,
  InventoryIntegrityCompletenessLevel,
  InventoryIntegrityCompletenessSummary,
  InventoryIntegrityFreshnessLevel,
  InventoryIntegrityFreshnessSummary,
  InventoryIntegrityIssue,
  InventoryIntegrityLevel,
  InventoryIntegrityLevelSummary,
  InventoryIntegrityReadOnlyData,
  InventoryIntegrityReviewReadinessLevel,
  InventoryIntegrityReviewReadinessSummary,
  InventoryIntegrityReviewPriority,
  InventoryIntegrityReviewPrioritySummary,
  InventoryIntegrityReviewSignalGraphItem,
  InventoryIntegritySignal,
  InventoryIntegritySource,
  InventoryIntegritySourceConfidence,
  InventoryIntegritySourceConfidenceSummary,
  InventoryIntegritySourceGapGraphItem,
  InventoryIntegritySourceRelation,
  InventoryIntegritySourceRelationSummary,
  InventoryIntegrityStatus,
  InventoryIntegrityStatusSummary,
  InventoryIntegritySummary,
} from "./inventoryIntegrityTypes";
import {
  selectProjectionMetadata,
  selectProjectionReviewReadiness,
  selectProjectionSummary,
} from "./inventoryIntegritySelectorNormalization";

export function getInventoryIntegritySummaries(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegritySummary[] {
  return data.summaries;
}

export function getInventoryIntegrityIssues(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegrityIssue[] {
  return data.issues;
}

export function getInventoryIntegritySignals(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegritySignal[] {
  return data.signals;
}

export function getInventoryCompareProjections(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryCompareProjection[] {
  return data.compareProjections;
}

export function getInventoryIntegrityAttention(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegrityAttention[] {
  return data.attentionProjections;
}

export function getInventoryIntegrityEvidence(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegrityEvidence[] {
  return data.evidenceProjections;
}

export function getInventoryIntegritySources(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegritySource[] {
  return data.sourceMappings;
}

export function getInventoryIntegrityLevelSummary(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegrityLevelSummary[] {
  const levelOrder: readonly InventoryIntegrityLevel[] = [
    "degraded",
    "limited",
    "watch",
    "stable",
  ];
  const allItems = [...data.summaries, ...data.issues, ...data.signals];

  return levelOrder
    .map((level) => ({
      level,
      count: allItems.filter((item) => item.level === level).length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getInventoryIntegrityStatusSummary(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegrityStatusSummary[] {
  const statusOrder: readonly InventoryIntegrityStatus[] = [
    "review_needed",
    "projection_gap",
    "source_gap",
    "compare_ready",
  ];
  const statusItems = [...data.summaries, ...data.issues];

  return statusOrder
    .map((status) => ({
      status,
      count: statusItems.filter((item) => item.status === status).length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getInventoryCompareSeveritySummary(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryCompareSeveritySummary[] {
  const severityOrder: readonly InventoryCompareSeverity[] = [
    "critical",
    "high",
    "warning",
    "unverified",
    "info",
  ];
  const projections = data.compareProjections.map(selectProjectionSummary);

  return severityOrder
    .map((severity) => ({
      severity,
      count: projections.filter(
        (projection) => projection.difference.severity === severity,
      ).length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getInventoryCompareReasonSummary(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryCompareReasonSummary[] {
  const reasonOrder: readonly InventoryCompareReason[] = [
    "read_model_cache_gap",
    "transaction_aggregation_gap",
    "location_scope_gap",
    "project_scope_gap",
    "not_compared",
  ];
  const projections = data.compareProjections.map(selectProjectionSummary);

  return reasonOrder
    .map((reason) => ({
      reason,
      count: projections.filter(
        (projection) => projection.difference.reason === reason,
      ).length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getInventoryCompareScopeSummary(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryCompareScopeSummary[] {
  const scopeOrder: readonly InventoryCompareScope[] = [
    "warehouse",
    "project",
    "location",
    "part",
    "inventory_type",
  ];
  const projections = data.compareProjections.map(selectProjectionSummary);

  return scopeOrder
    .map((scope) => ({
      scope,
      count: projections.filter((projection) => projection.scope === scope).length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getInventoryIntegrityFreshnessSummary(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegrityFreshnessSummary[] {
  const freshnessOrder: readonly InventoryIntegrityFreshnessLevel[] = [
    "expired",
    "stale",
    "delayed",
    "unknown",
    "fresh",
  ];
  const projectionMetadata = data.compareProjections.map(selectProjectionMetadata);

  return freshnessOrder
    .map((freshness) => ({
      freshness,
      count: projectionMetadata.filter(
        (projection) => projection.metadata.freshness.level === freshness,
      ).length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getInventoryIntegrityCompletenessSummary(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegrityCompletenessSummary[] {
  const completenessOrder: readonly InventoryIntegrityCompletenessLevel[] = [
    "missing",
    "partial",
    "unknown",
    "complete",
  ];
  const projectionMetadata = data.compareProjections.map(selectProjectionMetadata);

  return completenessOrder
    .map((completeness) => ({
      completeness,
      count: projectionMetadata.filter(
        (projection) => projection.metadata.completeness.level === completeness,
      ).length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getInventoryIntegrityReviewReadinessSummary(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegrityReviewReadinessSummary[] {
  const readinessOrder: readonly InventoryIntegrityReviewReadinessLevel[] = [
    "blocked_review",
    "not_ready",
    "partially_ready",
    "review_ready",
  ];
  const projectionReadiness = data.compareProjections.map(selectProjectionReviewReadiness);

  return readinessOrder
    .map((reviewReadiness) => ({
      reviewReadiness,
      count: projectionReadiness.filter(
        (projection) => projection.reviewReadiness.level === reviewReadiness,
      ).length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getInventoryCompareLineageGraph(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryCompareLineageGraphItem[] {
  return data.compareProjections.map((projection) => ({
    projectionId: projection.id,
    trace: projection.lineage.trace,
    derivedFrom: projection.lineage.derivedFrom,
  }));
}

export function getInventoryCompareDependencies(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryCompareDependencyGraphItem[] {
  return data.compareProjections.flatMap((projection) =>
    projection.lineage.dependencies.map((dependency) => ({
      projectionId: projection.id,
      dependency,
    })),
  );
}

export function getInventoryCompareEvidenceItems(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryCompareEvidenceGraphItem[] {
  return data.compareProjections.flatMap((projection) =>
    projection.lineage.evidence.map((evidence) => ({
      projectionId: projection.id,
      evidence,
    })),
  );
}

export function getInventoryIntegrityAttentionLevelSummary(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegrityAttentionLevelSummary[] {
  const attentionLevelOrder: readonly InventoryIntegrityAttentionLevel[] = [
    "audit_required",
    "tracking_required",
    "review_required",
    "reference",
  ];

  return attentionLevelOrder
    .map((attentionLevel) => ({
      attentionLevel,
      count: data.attentionProjections.filter(
        (attention) => attention.attentionLevel === attentionLevel,
      ).length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getInventoryIntegrityReviewPrioritySummary(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegrityReviewPrioritySummary[] {
  const priorityOrder: readonly InventoryIntegrityReviewPriority[] = ["high", "medium", "low"];

  return priorityOrder
    .map((reviewPriority) => ({
      reviewPriority,
      count: data.attentionProjections.filter(
        (attention) => attention.reviewPriority === reviewPriority,
      ).length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getInventoryIntegrityEscalationCandidates(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegrityAttention[] {
  return data.attentionProjections.filter(
    (attention) => attention.escalation.candidate !== "none",
  );
}

export function getInventoryIntegrityEscalationSummary(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegrityEscalationSummary[] {
  const escalationOrder: readonly InventoryIntegrityEscalation["candidate"][] = [
    "audit_review_candidate",
    "manager_review_candidate",
    "none",
  ];

  return escalationOrder
    .map((candidate) => ({
      candidate,
      count: data.attentionProjections.filter(
        (attention) => attention.escalation.candidate === candidate,
      ).length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getInventoryIntegrityReviewSignals(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegrityReviewSignalGraphItem[] {
  return data.attentionProjections.flatMap((attention) =>
    attention.reviewSignals.map((reviewSignal) => ({
      attentionId: attention.id,
      projectionId: attention.projectionId,
      reviewSignal,
    })),
  );
}

export function getInventoryIntegrityEvidenceQualitySummary(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegrityEvidenceQualitySummary[] {
  const qualityOrder: readonly InventoryIntegrityEvidenceQuality[] = [
    "missing",
    "limited",
    "partial",
    "sufficient",
  ];

  return qualityOrder
    .map((quality) => ({
      quality,
      count: data.evidenceProjections.filter((evidence) => evidence.quality === quality).length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getInventoryIntegrityEvidenceConfidenceSummary(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegrityEvidenceConfidenceSummary[] {
  const confidenceOrder: readonly InventoryIntegrityEvidenceConfidence[] = [
    "unknown",
    "low",
    "medium",
    "high",
  ];

  return confidenceOrder
    .map((confidence) => ({
      confidence,
      count: data.evidenceProjections.filter(
        (evidence) => evidence.confidence === confidence,
      ).length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getInventoryIntegrityEvidenceGaps(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegrityEvidenceGapGraphItem[] {
  return data.evidenceProjections.flatMap((evidence) =>
    evidence.metadata.gaps.map((gap) => ({
      evidenceId: evidence.id,
      projectionId: evidence.projectionId,
      gap,
    })),
  );
}

export function getInventoryIntegritySourceRelationSummary(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegritySourceRelationSummary[] {
  const relationOrder: readonly InventoryIntegritySourceRelation[] = [
    "truth_source",
    "compare_target",
    "derived_context",
    "review_context",
    "limitation_context",
  ];

  return relationOrder
    .map((relation) => ({
      relation,
      count: data.sourceMappings.filter((source) => source.relation === relation).length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getInventoryIntegritySourceConfidenceSummary(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegritySourceConfidenceSummary[] {
  const confidenceOrder: readonly InventoryIntegritySourceConfidence[] = [
    "unknown",
    "low",
    "medium",
    "high",
  ];

  return confidenceOrder
    .map((confidence) => ({
      confidence,
      count: data.sourceMappings.filter((source) => source.confidence === confidence).length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getInventoryIntegritySourceGaps(
  data: InventoryIntegrityReadOnlyData,
): readonly InventoryIntegritySourceGapGraphItem[] {
  return data.sourceMappings.flatMap((source) =>
    source.gaps.map((gap) => ({
      sourceId: source.id,
      projectionId: source.projectionId,
      gap,
    })),
  );
}
