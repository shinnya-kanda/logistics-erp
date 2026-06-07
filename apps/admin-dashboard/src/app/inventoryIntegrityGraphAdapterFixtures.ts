import type {
  InventoryIntegrityCompareResponseFixture,
  InventoryIntegrityGraphContractValidationFixture,
} from "./inventoryIntegrityGraphAdapterTypes";

// Static compare-response-shaped fixture for pure adapter verification only.
// Read-only projection with GET-only source data assumption.
// Fixture validation only.
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

export const fullMetadataCompareResponseFixture: InventoryIntegrityCompareResponseFixture =
  sampleInventoryIntegrityCompareResponseFixture;

export const missingMetadataCompareResponseFixture: InventoryIntegrityCompareResponseFixture = {
  responseMetadata: {
    responseKind: "missing_metadata_contract_fixture",
    compareEndpointMethod: "GET",
    readOnlyBoundary: "Fixture validation only. Metadata is intentionally missing.",
  },
};

export const nestedMetadataCompareResponseFixture: InventoryIntegrityCompareResponseFixture = {
  metadata: {
    compareSeverity: {
      value: "warning",
      reason: "Nested fixture uses value/reason/source/signals shape.",
      source: "nested_contract_fixture",
      signals: ["nested_value_shape", "severity_warning"],
    },
    compareRisk: {
      value: "risk_high",
      reason: "Nested risk fixture should normalize to a warning severity.",
      source: "nested_contract_fixture",
      signals: ["risk_high", "normalized_object_metadata"],
    },
    compareEvidence: {
      value: "evidence_weak",
      reason: "Nested evidence remains read-only support context.",
      source: "nested_contract_fixture",
      signals: ["evidence_weak", "source_present"],
    },
    compareConfidence: {
      value: "confidence_low",
      reason: "Nested confidence is low but still display-only metadata.",
      source: "nested_contract_fixture",
      signals: ["confidence_low", "no_workflow_execution"],
    },
    compareProjectionFreshness: {
      value: "freshness_stale",
      reason: "Nested freshness is stale for contract validation.",
      source: "nested_contract_fixture",
      signals: ["freshness_stale"],
    },
    compareTruthAggregationQuality: {
      value: "truth_quality_incomplete",
      reason: "Nested truth quality is incomplete.",
      source: "nested_contract_fixture",
      signals: ["truth_quality_incomplete"],
    },
    compareInterpretationStability: {
      value: "stability_fragile",
      reason: "Nested stability is fragile.",
      source: "nested_contract_fixture",
      signals: ["stability_fragile"],
    },
    compareOwnership: {
      value: "owner_review_required",
      reason: "Nested ownership is present.",
      source: "nested_contract_fixture",
      signals: ["owner_review_required"],
    },
    compareOwnerActionability: {
      value: "monitor_only",
      reason: "Nested actionability is display-only.",
      source: "nested_contract_fixture",
      signals: ["monitor_only"],
    },
    compareOperatorGuidance: {
      value: "guidance_review_projection",
      reason: "Nested guidance is a reading aid only.",
      source: "nested_contract_fixture",
      signals: ["guidance_review_projection"],
    },
    compareOperatorMessage: {
      value: "message_check_projection_cache",
      reason: "Nested operator message is not an instruction.",
      source: "nested_contract_fixture",
      signals: ["message_check_projection_cache"],
    },
    compareOperatorSummary: {
      value: "summary_review_needed",
      reason: "Nested operator summary is present.",
      source: "nested_contract_fixture",
      signals: ["summary_review_needed"],
    },
    compareOperatorTimeline: {
      value: "timeline_review_projection",
      reason: "Nested timeline is a reading sequence only.",
      source: "nested_contract_fixture",
      signals: ["timeline_review_projection"],
    },
    compareGovernanceAuditTrail: {
      value: "audit_partial",
      reason: "Nested audit trail is partial.",
      source: "nested_contract_fixture",
      signals: ["audit_partial"],
    },
    compareGovernanceExplainability: {
      value: "partially_explainable",
      reason: "Nested explainability is partial.",
      source: "nested_contract_fixture",
      signals: ["partially_explainable"],
    },
    compareGovernanceReasoningCoherence: {
      value: "partially_coherent",
      reason: "Nested reasoning coherence is partial.",
      source: "nested_contract_fixture",
      signals: ["partially_coherent"],
    },
    compareGovernanceSemanticDrift: {
      value: "slightly_drifting",
      reason: "Nested drift is warning-level.",
      source: "nested_contract_fixture",
      signals: ["slightly_drifting"],
    },
    compareGovernanceSemanticResilience: {
      value: "partially_resilient",
      reason: "Nested resilience is partial.",
      source: "nested_contract_fixture",
      signals: ["partially_resilient"],
    },
    compareGovernanceSemanticRecoverability: {
      value: "partially_recoverable",
      reason: "Nested recoverability is partial.",
      source: "nested_contract_fixture",
      signals: ["partially_recoverable"],
    },
    compareGovernanceSemanticObservabilityContinuity: {
      value: "partially_continuous",
      reason: "Nested continuity is partial.",
      source: "nested_contract_fixture",
      signals: ["partially_continuous"],
    },
    compareGovernanceSemanticSurvivability: {
      value: "degraded_survivability",
      reason: "Nested survivability is degraded.",
      source: "nested_contract_fixture",
      signals: ["degraded_survivability"],
    },
    compareGovernanceSemanticSustainability: {
      value: "conditionally_sustainable",
      reason: "Nested sustainability is conditional.",
      source: "nested_contract_fixture",
      signals: ["conditionally_sustainable"],
    },
    compareGovernanceSemanticMaintainability: {
      value: "conditionally_maintainable",
      reason: "Nested maintainability is conditional.",
      source: "nested_contract_fixture",
      signals: ["conditionally_maintainable"],
    },
    compareGovernanceSemanticEvolvability: {
      value: "conditionally_evolvable",
      reason: "Nested evolvability is conditional.",
      source: "nested_contract_fixture",
      signals: ["conditionally_evolvable"],
    },
  },
};

export const partialLifecycleCompareResponseFixture: InventoryIntegrityCompareResponseFixture = {
  metadata: {
    compareSeverity: "warning",
    compareRisk: "risk_medium",
    compareEvidence: "evidence_moderate",
    compareConfidence: "confidence_medium",
    compareProjectionFreshness: "freshness_recent",
    compareTruthAggregationQuality: "truth_quality_warning",
    compareInterpretationStability: "stability_fluctuating",
    compareOwnership: "owner_review_required",
    compareOwnerActionability: "monitor_only",
    compareOperatorGuidance: "guidance_review_projection",
    compareOperatorMessage: "message_check_projection_cache",
    compareOperatorSummary: "summary_review_needed",
    compareOperatorTimeline: "timeline_review_projection",
    compareGovernanceAuditTrail: "audit_partial",
    compareGovernanceExplainability: "partially_explainable",
    compareGovernanceReasoningCoherence: "partially_coherent",
    compareGovernanceSemanticDrift: "slightly_drifting",
    compareGovernanceSemanticResilience: "partially_resilient",
    compareGovernanceSemanticRecoverability: "partially_recoverable",
    compareGovernanceSemanticObservabilityContinuity: "partially_continuous",
    compareGovernanceSemanticSurvivability: "degraded_survivability",
    compareGovernanceSemanticSustainability: "conditionally_sustainable",
  },
};

export const unsupportedShapeCompareResponseFixture = {
  metadata: [
    "unsupported_contract_shape",
    {
      compareSeverity: "warning",
      purpose: "metadata array should be rejected by the graph adapter guard",
    },
  ],
} as const;

export const driftedKeyCompareResponseFixture = {
  metadata: {
    compare_severity: "warning",
    compareRiskLevel: "risk_high",
    compare_evidence: "evidence_weak",
    compareConfidenceLevel: "confidence_low",
    governance_semantic_survivability: "degraded_survivability",
    governanceSemanticOwnership: "owner_review_required",
    governanceSemanticActionability: "monitor_only",
    governanceSemanticGuidance: "guidance_review_projection",
    governanceSemanticSummary: "summary_review_needed",
    auditTrail: "audit_partial",
    explainability: "partially_explainable",
    reasoningCoherence: "partially_coherent",
    semanticDrift: "slightly_drifting",
    resilience: "partially_resilient",
    recoverability: "partially_recoverable",
    continuity: "partially_continuous",
  },
} as const;

export const unavailableCompareResponseFixture = null;

export const sourceDivergenceCompareResponseFixture: InventoryIntegrityCompareResponseFixture = {
  metadata: {
    compareSeverity: "warning",
    compareRisk: "risk_medium",
    compareEvidence: "evidence_moderate",
    compareConfidence: "confidence_medium",
    compareProjectionFreshness: "freshness_recent",
    compareTruthAggregationQuality: "truth_quality_warning",
    compareInterpretationStability: "stability_fluctuating",
    compareOwnership: "owner_review_required",
    compareOwnerActionability: "monitor_only",
    compareOperatorGuidance: "guidance_review_projection",
    compareOperatorMessage: "message_check_projection_cache",
    compareOperatorSummary: "summary_review_needed",
    compareOperatorTimeline: "timeline_review_projection",
    compareGovernanceAuditTrail: "audit_partial",
    compareGovernanceExplainability: "partially_explainable",
    compareGovernanceReasoningCoherence: "partially_coherent",
    compareGovernanceSemanticDrift: "slightly_drifting",
    compareGovernanceSemanticResilience: "partially_resilient",
    compareGovernanceSemanticRecoverability: "partially_recoverable",
    compareGovernanceSemanticObservabilityContinuity: "partially_continuous",
    compareGovernanceSemanticSurvivability: "degraded_survivability",
    compareGovernanceSemanticSustainability: "conditionally_sustainable",
    compareGovernanceSemanticMaintainability: "conditionally_maintainable",
    compareGovernanceSemanticEvolvability: "conditionally_evolvable",
  },
  responseMetadata: {
    compareSeverity: "critical",
    compareRisk: "risk_critical",
    compareEvidence: "evidence_missing",
    compareConfidence: "confidence_blocked",
    responseKind: "divergent_response_metadata",
  },
  rawPayloadMetadata: {
    compareSeverity: "stable",
    compareRisk: "risk_low",
    payloadKind: "divergent_raw_payload_metadata",
  },
};

export const enumDriftCompareResponseFixture: InventoryIntegrityCompareResponseFixture = {
  metadata: {
    compareSeverity: "severity_attention_required",
    compareRisk: "risk_high",
    compareEvidence: "evidence_unavailable",
    compareConfidence: "confidence_blocked",
    compareProjectionFreshness: "freshness_unavailable",
    compareTruthAggregationQuality: "truth_quality_unavailable",
    compareInterpretationStability: "stability_unavailable",
    compareOwnership: "owner_unknown",
    compareOwnerActionability: "blocked_unverified",
    compareOperatorGuidance: "guidance_wait_for_source",
    compareOperatorMessage: "message_wait_for_compare_source",
    compareOperatorSummary: "summary_source_unverified",
    compareOperatorTimeline: "timeline_wait_for_confirmation",
    compareGovernanceAuditTrail: "audit_unavailable",
    compareGovernanceExplainability: "explainability_unavailable",
    compareGovernanceReasoningCoherence: "reasoning_unavailable",
    compareGovernanceSemanticDrift: "drift_unavailable",
    compareGovernanceSemanticResilience: "resilience_unavailable",
    compareGovernanceSemanticRecoverability: "recovery_unavailable",
    compareGovernanceSemanticObservabilityContinuity: "continuity_unavailable",
    compareGovernanceSemanticSurvivability: "survivability_unavailable",
    compareGovernanceSemanticSustainability: "sustainability_unavailable",
    compareGovernanceSemanticMaintainability: "maintainability_unavailable",
    compareGovernanceSemanticEvolvability: "evolvability_unavailable",
  },
};

export const inventoryIntegrityCompareContractValidationFixtures = [
  {
    id: "full_metadata",
    label: "Full Metadata Compare Response Fixture",
    purpose: "Validate a response with broad B77-42 metadata coverage.",
    expectedBehavior:
      "Adapter should project summaries, nodes, and semantic edges without unavailable fallback.",
    response: fullMetadataCompareResponseFixture,
  },
  {
    id: "missing_metadata",
    label: "Missing Metadata Compare Response Fixture",
    purpose: "Validate missing metadata handling.",
    expectedBehavior:
      "Adapter should return graph unavailable with missing_metadata and fallback warnings.",
    response: missingMetadataCompareResponseFixture,
  },
  {
    id: "nested_metadata",
    label: "Nested Object Metadata Compare Response Fixture",
    purpose: "Validate object metadata normalization from value/reason/source/signals shape.",
    expectedBehavior:
      "Adapter should extract representative values and keep normalized_non_string_metadata warnings visible.",
    response: nestedMetadataCompareResponseFixture,
  },
  {
    id: "partial_lifecycle",
    label: "Partial Lifecycle Compare Response Fixture",
    purpose: "Validate partial lifecycle metadata handling before real compare integration.",
    expectedBehavior:
      "Adapter should produce a partial graph with unavailable lifecycle nodes and incomplete_fixture warnings.",
    response: partialLifecycleCompareResponseFixture,
  },
  {
    id: "unsupported_shape",
    label: "Unsupported Shape Compare Response Fixture",
    purpose: "Validate unsupported metadata shape handling.",
    expectedBehavior:
      "Adapter should reject non-record metadata and return graph unavailable safely.",
    response: unsupportedShapeCompareResponseFixture,
  },
  {
    id: "drifted_key",
    label: "Drifted Key Compare Response Fixture",
    purpose: "Validate key drift and alias tolerance for compare metadata.",
    expectedBehavior:
      "Adapter should read supported aliases, leave unsupported drifted keys unavailable, and warn as incomplete.",
    response: driftedKeyCompareResponseFixture,
  },
  {
    id: "unavailable_response",
    label: "Unavailable Compare Response Fixture",
    purpose: "Validate null or unavailable response handling.",
    expectedBehavior:
      "Adapter should return graph unavailable without treating the response as healthy graph data.",
    response: unavailableCompareResponseFixture,
  },
  {
    id: "source_divergence",
    label: "Source Divergence Compare Response Fixture",
    purpose: "Validate metadata / responseMetadata / rawPayloadMetadata divergence.",
    expectedBehavior:
      "Adapter should keep current source precedence by reading metadata before secondary sources.",
    response: sourceDivergenceCompareResponseFixture,
  },
  {
    id: "enum_drift",
    label: "Enum Drift Compare Response Fixture",
    purpose: "Validate enum value drift for severity, stability, ownership, and lifecycle metadata.",
    expectedBehavior:
      "Adapter should avoid optimistic severity for unavailable, blocked, or drifted enum values.",
    response: enumDriftCompareResponseFixture,
  },
] as const satisfies readonly InventoryIntegrityGraphContractValidationFixture[];
