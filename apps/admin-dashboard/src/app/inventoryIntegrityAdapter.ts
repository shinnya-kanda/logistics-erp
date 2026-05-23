import type {
  InventoryCompareLineage,
  InventoryCompareProjection,
  InventoryIntegrityCompletenessMetadata,
  InventoryIntegrityConfidenceMetadata,
  InventoryIntegrityEvidence,
  InventoryIntegrityEvidenceMetadata,
  InventoryIntegrityFreshnessMetadata,
  InventoryIntegrityLineageMetadata,
  InventoryIntegrityProjectionLifecycleMetadata,
  InventoryIntegrityProjectionMetadata,
  InventoryIntegrityReadOnlyData,
  InventoryIntegrityReviewReadinessMetadata,
  InventoryIntegrityTraceabilityMetadata,
} from "./inventoryIntegrityTypes";

// Pure read-only adapter scaffold for raw/static source -> normalized projection.
// This file must not fetch, mutate, rebuild, replay, correct, or start workflows.

export function normalizeConfidence(
  confidence: InventoryIntegrityConfidenceMetadata,
): InventoryIntegrityConfidenceMetadata {
  return {
    level: confidence.level,
    reason: confidence.reason,
    caveat: confidence.caveat,
  };
}

export function normalizeFreshness(
  freshness: InventoryIntegrityFreshnessMetadata,
): InventoryIntegrityFreshnessMetadata {
  return {
    level: freshness.level,
    reason: freshness.reason,
    caveat: freshness.caveat,
  };
}

export function normalizeCompleteness(
  completeness: InventoryIntegrityCompletenessMetadata,
): InventoryIntegrityCompletenessMetadata {
  return {
    level: completeness.level,
    scope: completeness.scope,
    caveat: completeness.caveat,
  };
}

export function normalizeTraceability(
  traceability: InventoryIntegrityTraceabilityMetadata,
): InventoryIntegrityTraceabilityMetadata {
  return {
    sourceTraceLabel: traceability.sourceTraceLabel,
    sourceChain: [...traceability.sourceChain],
    caveat: traceability.caveat,
  };
}

export function normalizeLineage(
  lineage: InventoryIntegrityLineageMetadata,
): InventoryIntegrityLineageMetadata {
  return {
    lineageLabel: lineage.lineageLabel,
    derivedFrom: [...lineage.derivedFrom],
    caveat: lineage.caveat,
  };
}

export function normalizeReviewReadiness(
  reviewReadiness: InventoryIntegrityReviewReadinessMetadata,
): InventoryIntegrityReviewReadinessMetadata {
  return {
    level: reviewReadiness.level,
    reason: reviewReadiness.reason,
    caveat: reviewReadiness.caveat,
  };
}

export function normalizeProjectionLifecycle(
  lifecycle: InventoryIntegrityProjectionLifecycleMetadata,
): InventoryIntegrityProjectionLifecycleMetadata {
  return {
    state: lifecycle.state,
    label: lifecycle.label,
    readability: lifecycle.readability,
    interpretation: lifecycle.interpretation,
    semanticBoundary: lifecycle.semanticBoundary,
    executionBoundary: lifecycle.executionBoundary,
  };
}

export function normalizeEvidence(
  evidence: InventoryIntegrityEvidenceMetadata,
): InventoryIntegrityEvidenceMetadata {
  return {
    source: { ...evidence.source },
    confidence: normalizeConfidence(evidence.confidence),
    freshness: normalizeFreshness(evidence.freshness),
    completeness: normalizeCompleteness(evidence.completeness),
    gaps: evidence.gaps.map((gap) => ({ ...gap })),
    semanticBoundary: evidence.semanticBoundary,
    executionBoundary: evidence.executionBoundary,
  };
}

function normalizeProjectionMetadata(
  metadata: InventoryIntegrityProjectionMetadata,
): InventoryIntegrityProjectionMetadata {
  return {
    identity: { ...metadata.identity },
    snapshot: { ...metadata.snapshot },
    evidence: normalizeEvidence(metadata.evidence),
    compareHardening: metadata.compareHardening
      ? { ...metadata.compareHardening }
      : undefined,
    compareClassification: metadata.compareClassification
      ? { ...metadata.compareClassification }
      : undefined,
    compareSeverity: metadata.compareSeverity ? { ...metadata.compareSeverity } : undefined,
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
    confidence: normalizeConfidence(metadata.confidence),
    freshness: normalizeFreshness(metadata.freshness),
    completeness: normalizeCompleteness(metadata.completeness),
    traceability: normalizeTraceability(metadata.traceability),
    lineage: normalizeLineage(metadata.lineage),
    reviewReadiness: normalizeReviewReadiness(metadata.reviewReadiness),
    lifecycle: normalizeProjectionLifecycle(metadata.lifecycle),
    semanticBoundary: metadata.semanticBoundary,
    executionBoundary: metadata.executionBoundary,
  };
}

function normalizeCompareLineage(lineage: InventoryCompareLineage): InventoryCompareLineage {
  return {
    trace: { ...lineage.trace },
    derivedFrom: lineage.derivedFrom.map((source) => ({ ...source })),
    dependencies: lineage.dependencies.map((dependency) => ({ ...dependency })),
    evidence: lineage.evidence.map((evidence) => ({ ...evidence })),
    semanticBoundary: lineage.semanticBoundary,
  };
}

export function normalizeProjection(projection: InventoryCompareProjection): InventoryCompareProjection {
  return {
    id: projection.id,
    metadata: normalizeProjectionMetadata(projection.metadata),
    scope: projection.scope,
    label: projection.label,
    description: projection.description,
    difference: { ...projection.difference },
    lineage: normalizeCompareLineage(projection.lineage),
    truthStatement: projection.truthStatement,
  };
}

function normalizeEvidenceProjection(evidence: InventoryIntegrityEvidence): InventoryIntegrityEvidence {
  return {
    id: evidence.id,
    projectionId: evidence.projectionId,
    attentionId: evidence.attentionId,
    title: evidence.title,
    metadata: normalizeEvidence(evidence.metadata),
    source: { ...evidence.source },
    confidence: evidence.confidence,
    quality: evidence.quality,
    explanation: evidence.explanation,
    rationale: evidence.rationale,
    gaps: evidence.gaps.map((gap) => ({ ...gap })),
    semanticBoundary: evidence.semanticBoundary,
    executionBoundary: evidence.executionBoundary,
  };
}

export function normalizeInventoryIntegrityReadOnlyData(
  data: InventoryIntegrityReadOnlyData,
): InventoryIntegrityReadOnlyData {
  return {
    summaries: data.summaries.map((summary) => ({ ...summary })),
    issues: data.issues.map((issue) => ({ ...issue })),
    signals: data.signals.map((signal) => ({ ...signal })),
    compareProjections: data.compareProjections.map(normalizeProjection),
    attentionProjections: data.attentionProjections.map((attention) => ({
      ...attention,
      escalation: { ...attention.escalation },
      reviewSignals: attention.reviewSignals.map((reviewSignal) => ({ ...reviewSignal })),
    })),
    evidenceProjections: data.evidenceProjections.map(normalizeEvidenceProjection),
    sourceMappings: data.sourceMappings.map((source) => ({
      ...source,
      gaps: source.gaps.map((gap) => ({ ...gap })),
    })),
  };
}
