import type { InventoryIntegrityCompareResponseFixture } from "./inventoryIntegrityGraphAdapterTypes";

// Static compare-response-shaped fixture for pure adapter verification only.
// Read-only projection with GET-only source data assumption.
// No fetch, no route integration, no UI integration change, no mutation,
// no workflow execution, and no inventory data changes.

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
    compareOwnership: {
      ownership: "owner_review_required",
      ownershipReason: "Fixture ownership remains review metadata only.",
      ownershipSource: "fixture_compare_metadata",
      ownershipSignals: ["ownership_review_required", "no_assignment_workflow"],
    },
    compareOwnerActionability: {
      ownerActionability: "monitor_only",
      actionabilityReason:
        "Fixture actionability is observability context, not an executable action.",
      actionabilitySource: "fixture_compare_metadata",
      actionabilitySignals: ["monitor_only", "no_workflow_execution"],
    },
    compareOperatorGuidance: {
      operatorGuidance: "guidance_review_projection",
      guidanceReason:
        "Fixture operator guidance describes how to read the projection only.",
      guidanceSource: "fixture_compare_metadata",
      guidanceSignals: ["read_projection", "display_only"],
    },
    compareOperatorMessage: {
      operatorMessage: "message_check_projection_cache",
      messageText: "Fixture message for read-only projection review.",
      messageReason: "Fixture message is not an operation instruction.",
      messageSource: "fixture_compare_metadata",
      messageSignals: ["message_display_only", "no_execution_route"],
    },
    compareOperatorSummary: {
      operatorSummary: "summary_review_required",
      summarySignals: ["quantity_mismatch", "warning"],
    },
    compareOperatorTimeline: {
      operatorTimeline: "timeline_review_projection",
      timelineText: "Fixture timeline is a reading sequence only.",
      timelineReason: "No workflow timeline is created by this fixture.",
      timelineSource: "fixture_compare_metadata",
      timelineSignals: ["reading_sequence", "no_workflow_execution"],
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
    compareGovernanceAuditTrail: {
      governanceAuditTrail: "audit_partial",
      auditTrailReason:
        "Fixture audit trail is partial but traceable enough for display.",
      auditTrailSource: "fixture_compare_metadata",
      auditTrailSignals: ["audit_partial", "transaction_source_present"],
    },
    compareGovernanceExplainability: {
      governanceExplainability: "partially_explainable",
      explainabilityReason:
        "Fixture explainability has caveats and should not be overstated.",
      explainabilitySource: "fixture_compare_metadata",
      explainabilitySignals: ["partial_explanation", "fixture_reasoning"],
    },
    compareGovernanceReasoningCoherence: {
      governanceReasoningCoherence: "partially_coherent",
      reasoningCoherenceReason:
        "Fixture reasoning is coherent enough for adapter coverage only.",
      reasoningCoherenceSource: "fixture_compare_metadata",
      reasoningCoherenceSignals: ["partial_coherence", "read_only_reasoning"],
    },
    compareGovernanceSemanticDrift: {
      governanceSemanticDrift: "slightly_drifting",
      semanticDriftReason:
        "Fixture semantic drift indicates a warning-level interpretation caveat.",
      semanticDriftSource: "fixture_compare_metadata",
      semanticDriftSignals: ["slight_drift", "adapter_coverage_fixture"],
    },
    compareGovernanceSemanticResilience: {
      governanceSemanticResilience: "partially_resilient",
      semanticResilienceReason:
        "Fixture resilience is partial and remains read-only display metadata.",
      semanticResilienceSource: "fixture_compare_metadata",
      semanticResilienceSignals: ["partial_resilience", "no_recovery_workflow"],
    },
    compareGovernanceSemanticRecoverability: {
      governanceSemanticRecoverability: "partially_recoverable",
      semanticRecoverabilityReason:
        "Fixture recoverability is semantic context only, not repair capability.",
      semanticRecoverabilitySource: "fixture_compare_metadata",
      semanticRecoverabilitySignals: ["partial_recoverability", "no_repair_action"],
    },
    compareGovernanceSemanticObservabilityContinuity: {
      governanceSemanticObservabilityContinuity: "partially_continuous",
      semanticObservabilityContinuityReason:
        "Fixture continuity is partial but visible in the graph projection.",
      semanticObservabilityContinuitySource: "fixture_compare_metadata",
      semanticObservabilityContinuitySignals: [
        "partial_continuity",
        "observability_only",
      ],
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
