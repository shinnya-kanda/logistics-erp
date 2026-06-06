import type { InventoryIntegrityCompareResponseFixture } from "./inventoryIntegrityGraphAdapterTypes";

// Static compare-response-shaped fixture for pure adapter verification only.
// No fetch, no route integration, no UI integration, no mutation, and no workflow execution.

export const sampleInventoryIntegrityCompareResponseFixture: InventoryIntegrityCompareResponseFixture = {
  metadata: {
    compareClassification: {
      classification: "quantity_mismatch",
      reason: "Fixture classification only.",
    },
    compareSeverity: {
      severity: "warning",
      reason: "Fixture severity is warning for read-only graph projection.",
    },
    compareReviewReadiness: {
      readiness: "review_required",
      reason: "Fixture review readiness is not an approval workflow.",
    },
    compareEscalationReadiness: {
      readiness: "not_required",
      reason: "Fixture escalation readiness is display metadata only.",
    },
    compareOperationalPriority: {
      priority: "medium",
      reason: "Fixture priority is reading order context only.",
    },
    compareOperatorSummary: {
      operatorSummary: "summary_review_required",
      summarySignals: ["quantity_mismatch", "warning"],
    },
    compareConfidence: {
      compareConfidence: "partial",
      confidenceSignals: ["evidence_partial", "freshness_stale"],
    },
    compareProjectionFreshness: {
      projectionFreshness: "stale",
      freshnessSignals: ["projection_stale"],
    },
    compareTruthAggregationQuality: {
      truthAggregationQuality: "partial",
      truthQualitySignals: ["aggregation_partial"],
    },
    compareEvidence: {
      compareEvidence: "partial",
      evidenceSignals: ["transaction_source_present", "current_cache_present"],
    },
    compareRisk: {
      compareRisk: "warning",
      riskSignals: ["difference_detected", "review_required"],
    },
    compareInterpretationStability: {
      interpretationStability: "degraded",
      stabilitySignals: ["partial_confidence", "stale_projection"],
    },
    compareGovernanceSemanticSurvivability: {
      governanceSemanticSurvivability: "fragile",
      semanticSurvivabilitySignals: ["degraded_stability"],
    },
    compareGovernanceSemanticSustainability: {
      governanceSemanticSustainability: "limited",
      semanticSustainabilitySignals: ["fragile_survivability"],
    },
    compareGovernanceSemanticMaintainability: {
      governanceSemanticMaintainability: "maintainable",
      semanticMaintainabilitySignals: ["traceable_fixture_context"],
    },
    compareGovernanceSemanticEvolvability: {
      governanceSemanticEvolvability: "limited",
      semanticEvolvabilitySignals: ["maintainability_context_required"],
    },
  },
  responseMetadata: {
    responseKind: "static_read_only_response",
    compareEndpointMethod: "GET",
    readOnlyBoundary: "Fixture only. No fetch. No inventory data changes.",
  },
  rawPayloadMetadata: {
    payloadKind: "static_read_only_response",
    adapterInputBoundary: "Fixture compare response metadata only.",
  },
};
