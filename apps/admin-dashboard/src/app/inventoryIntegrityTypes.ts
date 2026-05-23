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
  | "real_read_only_endpoint"
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

export type InventoryIntegrityFetchCapability =
  | "static_no_network_read"
  | "future_read_only_edge_fetch"
  | "future_read_only_projection_loading"
  | "future_network_response_handling"
  | "no_network_access"
  | "no_execution_authority";

export type InventoryIntegrityFetchPolicy = {
  readonly policyId: string;
  readonly label: string;
  readonly capabilities: readonly InventoryIntegrityFetchCapability[];
  readonly requestBoundary: string;
  readonly networkBoundary: string;
  readonly readability: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionTransportState =
  | "transport_available"
  | "transport_timeout"
  | "transport_unreachable"
  | "transport_static_only";

export type ProjectionOfflineState =
  | "offline_possible"
  | "offline_required"
  | "offline_unavailable"
  | "offline_bypassed";

export type ProjectionOfflineSemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionOfflineState;
  readonly label: string;
  readonly readability: string;
  readonly cacheInterpretation: string;
  readonly governanceInterpretation: string;
  readonly operationalInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionTransportSemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionTransportState;
  readonly label: string;
  readonly offlineSemantics: ProjectionOfflineSemantics;
  readonly readability: string;
  readonly offlineInterpretation: string;
  readonly timeoutInterpretation: string;
  readonly unreachableInterpretation: string;
  readonly staticOnlyInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionCacheState =
  | "cache_fresh"
  | "cache_stale"
  | "cache_reused"
  | "cache_bypassed";

export type ProjectionCacheSemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionCacheState;
  readonly label: string;
  readonly offlineSemantics: ProjectionOfflineSemantics;
  readonly readability: string;
  readonly freshnessInterpretation: string;
  readonly reuseInterpretation: string;
  readonly bypassInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionRetryState =
  | "retry_allowed"
  | "retry_blocked"
  | "retry_unnecessary"
  | "retry_unavailable";

export type ProjectionRetrySemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionRetryState;
  readonly label: string;
  readonly readability: string;
  readonly governanceInterpretation: string;
  readonly operationalInterpretation: string;
  readonly offlineRecoveryInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionOperationalSustainabilityState =
  | "sustainability_operational"
  | "sustainability_degraded"
  | "sustainability_unsustainable"
  | "sustainability_unverified";

export type ProjectionOperationalSustainabilitySemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionOperationalSustainabilityState;
  readonly label: string;
  readonly readability: string;
  readonly operationalSustainabilityInterpretation: string;
  readonly degradedSustainabilityVisibilityInterpretation: string;
  readonly governanceSustainabilityInterpretation: string;
  readonly sustainabilityRiskInterpretation: string;
  readonly observabilitySustainabilityInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionTrustworthinessState =
  | "trustworthy"
  | "trust_degraded"
  | "trust_untrusted"
  | "trust_unverified";

export type ProjectionTrustworthinessSemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionTrustworthinessState;
  readonly label: string;
  readonly operationalSustainabilitySemantics: ProjectionOperationalSustainabilitySemantics;
  readonly readability: string;
  readonly operationalTrustworthinessInterpretation: string;
  readonly degradedTrustVisibilityInterpretation: string;
  readonly governanceTrustInterpretation: string;
  readonly semanticTrustBoundaryInterpretation: string;
  readonly observabilityTrustworthinessInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionSurvivabilityState =
  | "survivability_operational"
  | "survivability_degraded"
  | "survivability_critical"
  | "survivability_unverified";

export type ProjectionSurvivabilitySemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionSurvivabilityState;
  readonly label: string;
  readonly trustworthinessSemantics: ProjectionTrustworthinessSemantics;
  readonly operationalSustainabilitySemantics: ProjectionOperationalSustainabilitySemantics;
  readonly readability: string;
  readonly operationalSurvivabilityInterpretation: string;
  readonly degradedSurvivabilityVisibilityInterpretation: string;
  readonly governanceSurvivabilityInterpretation: string;
  readonly criticalSurvivabilityInterpretation: string;
  readonly observabilitySurvivabilityInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionIntegrityAssuranceState =
  | "integrity_assured"
  | "integrity_degraded"
  | "integrity_untrusted"
  | "integrity_unverified";

export type ProjectionIntegrityAssuranceSemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionIntegrityAssuranceState;
  readonly label: string;
  readonly survivabilitySemantics: ProjectionSurvivabilitySemantics;
  readonly trustworthinessSemantics: ProjectionTrustworthinessSemantics;
  readonly operationalSustainabilitySemantics: ProjectionOperationalSustainabilitySemantics;
  readonly readability: string;
  readonly operationalIntegrityAssuranceInterpretation: string;
  readonly degradedIntegrityVisibilityInterpretation: string;
  readonly governanceAssuranceInterpretation: string;
  readonly trustBoundaryInterpretation: string;
  readonly observabilityAssuranceInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionContinuityState =
  | "continuity_operational"
  | "continuity_degraded"
  | "continuity_interrupted"
  | "continuity_unverified";

export type ProjectionContinuitySemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionContinuityState;
  readonly label: string;
  readonly integrityAssuranceSemantics: ProjectionIntegrityAssuranceSemantics;
  readonly survivabilitySemantics: ProjectionSurvivabilitySemantics;
  readonly trustworthinessSemantics: ProjectionTrustworthinessSemantics;
  readonly readability: string;
  readonly operationalContinuityInterpretation: string;
  readonly degradedContinuityVisibilityInterpretation: string;
  readonly governanceContinuityInterpretation: string;
  readonly serviceInterruptionInterpretation: string;
  readonly observabilityContinuityInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionDurabilityState =
  | "durability_persistent"
  | "durability_degraded"
  | "durability_volatile"
  | "durability_unverified";

export type ProjectionDurabilitySemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionDurabilityState;
  readonly label: string;
  readonly continuitySemantics: ProjectionContinuitySemantics;
  readonly integrityAssuranceSemantics: ProjectionIntegrityAssuranceSemantics;
  readonly survivabilitySemantics: ProjectionSurvivabilitySemantics;
  readonly readability: string;
  readonly operationalDurabilityInterpretation: string;
  readonly degradedDurabilityVisibilityInterpretation: string;
  readonly governanceDurabilityInterpretation: string;
  readonly projectionPersistenceInterpretation: string;
  readonly observabilityDurabilityInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionRecoverabilityState =
  | "recoverability_ready"
  | "recoverability_degraded"
  | "recoverability_unrecoverable"
  | "recoverability_unverified";

export type ProjectionRecoverabilitySemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionRecoverabilityState;
  readonly label: string;
  readonly durabilitySemantics: ProjectionDurabilitySemantics;
  readonly continuitySemantics: ProjectionContinuitySemantics;
  readonly integrityAssuranceSemantics: ProjectionIntegrityAssuranceSemantics;
  readonly readability: string;
  readonly operationalRecoverabilityInterpretation: string;
  readonly degradedRecoverabilityVisibilityInterpretation: string;
  readonly governanceRecoverabilityInterpretation: string;
  readonly recoveryReadinessInterpretation: string;
  readonly observabilityRecoverabilityInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionStabilityState =
  | "stability_stable"
  | "stability_fluctuating"
  | "stability_unstable"
  | "stability_unverified";

export type ProjectionStabilitySemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionStabilityState;
  readonly label: string;
  readonly recoverabilitySemantics: ProjectionRecoverabilitySemantics;
  readonly durabilitySemantics: ProjectionDurabilitySemantics;
  readonly readability: string;
  readonly operationalStabilityInterpretation: string;
  readonly degradedStabilityVisibilityInterpretation: string;
  readonly governanceStabilityInterpretation: string;
  readonly projectionFluctuationInterpretation: string;
  readonly observabilityStabilityInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionResilienceState =
  | "resilience_normal"
  | "resilience_degraded"
  | "resilience_recovering"
  | "resilience_unverified";

export type ProjectionResilienceSemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionResilienceState;
  readonly label: string;
  readonly stabilitySemantics: ProjectionStabilitySemantics;
  readonly recoverabilitySemantics: ProjectionRecoverabilitySemantics;
  readonly durabilitySemantics: ProjectionDurabilitySemantics;
  readonly continuitySemantics: ProjectionContinuitySemantics;
  readonly readability: string;
  readonly operationalResilienceInterpretation: string;
  readonly degradedResilienceVisibilityInterpretation: string;
  readonly governanceResilienceInterpretation: string;
  readonly recoveryReadinessInterpretation: string;
  readonly observabilityResilienceInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionHealthState =
  | "health_normal"
  | "health_degraded"
  | "health_unhealthy"
  | "health_unverified";

export type ProjectionHealthSemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionHealthState;
  readonly label: string;
  readonly resilienceSemantics: ProjectionResilienceSemantics;
  readonly stabilitySemantics: ProjectionStabilitySemantics;
  readonly recoverabilitySemantics: ProjectionRecoverabilitySemantics;
  readonly readability: string;
  readonly operationalHealthInterpretation: string;
  readonly degradedHealthVisibilityInterpretation: string;
  readonly governanceHealthInterpretation: string;
  readonly endpointHealthInterpretation: string;
  readonly observabilityHealthInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionConfidenceState =
  | "confidence_high"
  | "confidence_partial"
  | "confidence_low"
  | "confidence_unverified";

export type ProjectionConfidenceSemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionConfidenceState;
  readonly label: string;
  readonly healthSemantics: ProjectionHealthSemantics;
  readonly resilienceSemantics: ProjectionResilienceSemantics;
  readonly stabilitySemantics: ProjectionStabilitySemantics;
  readonly readability: string;
  readonly projectionConfidenceInterpretation: string;
  readonly degradedConfidenceVisibilityInterpretation: string;
  readonly governanceConfidenceInterpretation: string;
  readonly operationalConfidenceInterpretation: string;
  readonly observabilityConfidenceInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionDiagnosticState =
  | "diagnostic_available"
  | "diagnostic_partial"
  | "diagnostic_unavailable"
  | "diagnostic_unverified";

export type ProjectionDiagnosticSemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionDiagnosticState;
  readonly label: string;
  readonly confidenceSemantics: ProjectionConfidenceSemantics;
  readonly healthSemantics: ProjectionHealthSemantics;
  readonly readability: string;
  readonly diagnosticInterpretation: string;
  readonly degradedDiagnosticVisibilityInterpretation: string;
  readonly operationalDiagnosticInterpretation: string;
  readonly endpointDiagnosticInterpretation: string;
  readonly governanceObservabilityInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionAvailabilityState =
  | "availability_available"
  | "availability_degraded"
  | "availability_unavailable"
  | "availability_unverified";

export type ProjectionAvailabilitySemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionAvailabilityState;
  readonly label: string;
  readonly diagnosticSemantics: ProjectionDiagnosticSemantics;
  readonly confidenceSemantics: ProjectionConfidenceSemantics;
  readonly healthSemantics: ProjectionHealthSemantics;
  readonly resilienceSemantics: ProjectionResilienceSemantics;
  readonly readability: string;
  readonly endpointAvailabilityInterpretation: string;
  readonly degradedEndpointInterpretation: string;
  readonly unavailableEndpointInterpretation: string;
  readonly operationalAvailabilityInterpretation: string;
  readonly degradedVisibilityInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionLatencyState =
  | "latency_normal"
  | "latency_slow"
  | "latency_timeout"
  | "latency_unverified";

export type ProjectionLatencySemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionLatencyState;
  readonly label: string;
  readonly availabilitySemantics: ProjectionAvailabilitySemantics;
  readonly readability: string;
  readonly requestDurationInterpretation: string;
  readonly slowEndpointInterpretation: string;
  readonly timeoutDegradationInterpretation: string;
  readonly operationalLatencyInterpretation: string;
  readonly degradedLatencyVisibilityInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionTelemetryState =
  | "telemetry_available"
  | "telemetry_partial"
  | "telemetry_unavailable"
  | "telemetry_unverified";

export type ProjectionTelemetrySemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionTelemetryState;
  readonly label: string;
  readonly latencySemantics: ProjectionLatencySemantics;
  readonly availabilitySemantics: ProjectionAvailabilitySemantics;
  readonly diagnosticSemantics: ProjectionDiagnosticSemantics;
  readonly confidenceSemantics: ProjectionConfidenceSemantics;
  readonly readability: string;
  readonly requestObservabilityInterpretation: string;
  readonly endpointObservabilityInterpretation: string;
  readonly degradedResponseObservabilityInterpretation: string;
  readonly fallbackObservabilityInterpretation: string;
  readonly operationalTelemetryInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionEscalationState =
  | "escalation_required"
  | "escalation_recommended"
  | "escalation_blocked"
  | "escalation_unverified";

export type ProjectionEscalationSemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionEscalationState;
  readonly label: string;
  readonly readability: string;
  readonly governanceEscalationInterpretation: string;
  readonly auditEscalationInterpretation: string;
  readonly operationalEscalationVisibility: string;
  readonly reviewEscalationInterpretation: string;
  readonly blockedInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionAttentionState =
  | "attention_required"
  | "attention_recommended"
  | "attention_optional"
  | "attention_unverified";

export type ProjectionAttentionSemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionAttentionState;
  readonly label: string;
  readonly escalationSemantics: ProjectionEscalationSemantics;
  readonly readability: string;
  readonly operationalAttentionInterpretation: string;
  readonly governanceAttentionInterpretation: string;
  readonly auditAttentionInterpretation: string;
  readonly escalationVisibilityInterpretation: string;
  readonly degradedOperationalVisibilityInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionDecisionState =
  | "decision_pending"
  | "decision_required"
  | "decision_confirmed"
  | "decision_unverified";

export type ProjectionDecisionSemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionDecisionState;
  readonly label: string;
  readonly attentionSemantics: ProjectionAttentionSemantics;
  readonly escalationSemantics: ProjectionEscalationSemantics;
  readonly readability: string;
  readonly operationalDecisionInterpretation: string;
  readonly governanceDecisionInterpretation: string;
  readonly auditDecisionInterpretation: string;
  readonly escalationDecisionInterpretation: string;
  readonly reviewOutcomeInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionReviewState =
  | "review_pending"
  | "review_required"
  | "review_completed"
  | "review_unverified";

export type ProjectionReviewSemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionReviewState;
  readonly label: string;
  readonly decisionSemantics: ProjectionDecisionSemantics;
  readonly attentionSemantics: ProjectionAttentionSemantics;
  readonly readability: string;
  readonly governanceReviewInterpretation: string;
  readonly operationalReviewInterpretation: string;
  readonly auditReviewInterpretation: string;
  readonly escalationVisibilityInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionGovernanceState =
  | "governance_verified"
  | "governance_review_required"
  | "governance_restricted"
  | "governance_unverified";

export type ProjectionGovernanceSemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionGovernanceState;
  readonly label: string;
  readonly reviewSemantics: ProjectionReviewSemantics;
  readonly decisionSemantics: ProjectionDecisionSemantics;
  readonly attentionSemantics: ProjectionAttentionSemantics;
  readonly escalationSemantics: ProjectionEscalationSemantics;
  readonly readability: string;
  readonly reviewInterpretation: string;
  readonly escalationInterpretation: string;
  readonly restrictedVisibilityInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionTraceState =
  | "trace_verified"
  | "trace_partial"
  | "trace_missing"
  | "trace_unverified";

export type ProjectionTraceSemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionTraceState;
  readonly label: string;
  readonly governanceSemantics: ProjectionGovernanceSemantics;
  readonly readability: string;
  readonly lineageInterpretation: string;
  readonly distributedTraceInterpretation: string;
  readonly auditInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionFallbackState =
  | "fallback_available"
  | "fallback_required"
  | "fallback_unavailable"
  | "fallback_bypassed";

export type ProjectionFallbackSemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionFallbackState;
  readonly label: string;
  readonly telemetrySemantics: ProjectionTelemetrySemantics;
  readonly readability: string;
  readonly degradedResponseInterpretation: string;
  readonly evidenceInterpretation: string;
  readonly resilienceInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionEvidenceState =
  | "evidence_verified"
  | "evidence_partial"
  | "evidence_missing"
  | "evidence_unverified";

export type ProjectionEvidenceSemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionEvidenceState;
  readonly label: string;
  readonly fallbackSemantics: ProjectionFallbackSemantics;
  readonly traceSemantics: ProjectionTraceSemantics;
  readonly governanceSemantics: ProjectionGovernanceSemantics;
  readonly reviewSemantics: ProjectionReviewSemantics;
  readonly readability: string;
  readonly verificationInterpretation: string;
  readonly missingInterpretation: string;
  readonly auditInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionProvenanceState =
  | "provenance_verified"
  | "provenance_partial"
  | "provenance_unknown"
  | "provenance_unverified";

export type ProjectionProvenanceSemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionProvenanceState;
  readonly label: string;
  readonly evidenceSemantics: ProjectionEvidenceSemantics;
  readonly traceSemantics: ProjectionTraceSemantics;
  readonly readability: string;
  readonly lineageInterpretation: string;
  readonly sourceVerificationInterpretation: string;
  readonly auditInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionSnapshotState =
  | "snapshot_current"
  | "snapshot_historical"
  | "snapshot_reconstructed"
  | "snapshot_unverified";

export type ProjectionSnapshotSemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionSnapshotState;
  readonly label: string;
  readonly provenanceSemantics: ProjectionProvenanceSemantics;
  readonly evidenceSemantics: ProjectionEvidenceSemantics;
  readonly readability: string;
  readonly historicalInterpretation: string;
  readonly reconstructedInterpretation: string;
  readonly currentInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionAuthorityState =
  | "authority_confirmed"
  | "authority_unverified"
  | "authority_restricted"
  | "authority_readonly";

export type ProjectionAuthoritySemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionAuthorityState;
  readonly label: string;
  readonly snapshotSemantics: ProjectionSnapshotSemantics;
  readonly provenanceSemantics: ProjectionProvenanceSemantics;
  readonly governanceSemantics: ProjectionGovernanceSemantics;
  readonly readability: string;
  readonly governanceInterpretation: string;
  readonly restrictionInterpretation: string;
  readonly readonlyInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionDegradationState =
  | "degraded_readability"
  | "degraded_visibility"
  | "degraded_confidence"
  | "degradation_unverified";

export type ProjectionDegradationSemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionDegradationState;
  readonly label: string;
  readonly authoritySemantics: ProjectionAuthoritySemantics;
  readonly fallbackSemantics: ProjectionFallbackSemantics;
  readonly readability: string;
  readonly visibilityInterpretation: string;
  readonly confidenceInterpretation: string;
  readonly partialReadabilityInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionConsistencyState =
  | "consistency_confirmed"
  | "consistency_partial"
  | "consistency_unknown"
  | "consistency_unverified";

export type ProjectionConsistencySemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionConsistencyState;
  readonly label: string;
  readonly degradationSemantics: ProjectionDegradationSemantics;
  readonly snapshotSemantics: ProjectionSnapshotSemantics;
  readonly readability: string;
  readonly comparisonInterpretation: string;
  readonly governanceInterpretation: string;
  readonly auditInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryIntegrityFetchSemantics = {
  readonly semanticsId: string;
  readonly capability: InventoryIntegrityFetchCapability;
  readonly policy: InventoryIntegrityFetchPolicy;
  readonly transportSemantics: ProjectionTransportSemantics;
  readonly cacheSemantics: ProjectionCacheSemantics;
  readonly telemetrySemantics: ProjectionTelemetrySemantics;
  readonly latencySemantics: ProjectionLatencySemantics;
  readonly requestContractBoundary: string;
  readonly responseHandlingBoundary: string;
  readonly readability: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionEndpointCapability =
  | "static_mock_endpoint_reference"
  | "real_read_only_edge_endpoint"
  | "future_read_only_edge_endpoint"
  | "future_projection_loading_endpoint"
  | "future_governance_visualization_endpoint"
  | "no_network_access"
  | "no_execution_authority";

export type ProjectionEndpointPolicy = {
  readonly policyId: string;
  readonly label: string;
  readonly capabilities: readonly ProjectionEndpointCapability[];
  readonly requestBoundary: string;
  readonly fetchBoundary: string;
  readonly readability: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionEndpoint = {
  readonly endpointId: string;
  readonly endpointKind:
    | "static_mock_endpoint"
    | "read_only_edge_function_endpoint"
    | "future_edge_function_endpoint"
    | "future_snapshot_endpoint";
  readonly label: string;
  readonly capability: ProjectionEndpointCapability;
  readonly policy: ProjectionEndpointPolicy;
  readonly endpointReference: string;
  readonly readability: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryIntegrityReadOnlyEndpointContract = {
  readonly contractId: string;
  readonly sourceMode: "static_fallback" | "real_read_only_endpoint";
  readonly enabled: boolean;
  readonly method: "GET";
  readonly endpoint: ProjectionEndpoint;
  readonly endpointUrl?: string;
  readonly fallbackEndpoint: ProjectionEndpoint;
  readonly readability: string;
  readonly fallbackMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionFetchExecutionState =
  | "request_accepted"
  | "request_blocked"
  | "request_unsupported"
  | "request_unavailable";

export type ProjectionFetchExecutionSemantics = {
  readonly semanticsId: string;
  readonly state: ProjectionFetchExecutionState;
  readonly label: string;
  readonly retrySemantics: ProjectionRetrySemantics;
  readonly readability: string;
  readonly requestInterpretation: string;
  readonly endpointInterpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionResponseStatus =
  | "response_accepted"
  | "response_partial"
  | "response_degraded"
  | "response_unavailable";

export type ProjectionResponseStatusSemantics = {
  readonly semanticsId: string;
  readonly status: ProjectionResponseStatus;
  readonly label: string;
  readonly transportSemantics: ProjectionTransportSemantics;
  readonly cacheSemantics: ProjectionCacheSemantics;
  readonly retrySemantics: ProjectionRetrySemantics;
  readonly telemetrySemantics: ProjectionTelemetrySemantics;
  readonly latencySemantics: ProjectionLatencySemantics;
  readonly availabilitySemantics: ProjectionAvailabilitySemantics;
  readonly diagnosticSemantics: ProjectionDiagnosticSemantics;
  readonly confidenceSemantics: ProjectionConfidenceSemantics;
  readonly healthSemantics: ProjectionHealthSemantics;
  readonly resilienceSemantics: ProjectionResilienceSemantics;
  readonly stabilitySemantics: ProjectionStabilitySemantics;
  readonly recoverabilitySemantics: ProjectionRecoverabilitySemantics;
  readonly durabilitySemantics: ProjectionDurabilitySemantics;
  readonly continuitySemantics: ProjectionContinuitySemantics;
  readonly integrityAssuranceSemantics: ProjectionIntegrityAssuranceSemantics;
  readonly survivabilitySemantics: ProjectionSurvivabilitySemantics;
  readonly trustworthinessSemantics: ProjectionTrustworthinessSemantics;
  readonly operationalSustainabilitySemantics: ProjectionOperationalSustainabilitySemantics;
  readonly consistencySemantics: ProjectionConsistencySemantics;
  readonly degradationSemantics: ProjectionDegradationSemantics;
  readonly authoritySemantics: ProjectionAuthoritySemantics;
  readonly readability: string;
  readonly interpretation: string;
  readonly limitation: string;
  readonly noExecutionMeaning: string;
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
  InventoryIntegrityProjectionSource<InventoryIntegrityEdgeProjectionResponse> & {
    readonly registry: InventoryIntegrityProjectionRegistry;
  };

export type InventoryIntegrityReadOnlyFetchSource =
  InventoryIntegrityProjectionSource<Promise<InventoryIntegrityEdgeProjectionResponse>> & {
    readonly registry: InventoryIntegrityProjectionRegistry;
    readonly endpointContract: InventoryIntegrityReadOnlyEndpointContract;
    readonly fallbackSource: InventoryIntegrityReadOnlySource;
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

export type ProjectionResponseLifecycle = {
  readonly state: ProjectionLifecycleState;
  readonly label: string;
  readonly readability: string;
  readonly interpretation: string;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

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

export type InventoryCompareSeverity =
  | "info"
  | "warning"
  | "high"
  | "critical"
  | "unverified";

export type InventoryCompareReason =
  | "read_model_cache_gap"
  | "transaction_aggregation_gap"
  | "location_scope_gap"
  | "project_scope_gap"
  | "not_compared";

export type InventoryCompareStatus =
  | "matched"
  | "mismatched"
  | "missing_projection"
  | "orphan_projection";

export type InventoryCompareSourceStatus =
  | "compare_source_available"
  | "compare_source_degraded"
  | "compare_source_unavailable";

export type InventoryCompareResultVisibilityStatus =
  | "compare_result_empty"
  | "compare_result_partial"
  | "compare_result_unverified";

export type InventoryCompareScopeValidationStatus =
  | "valid_scope"
  | "invalid_scope"
  | "unavailable_scope"
  | "degraded_scope";

export type InventoryCompareMismatchClassification =
  | "quantity_mismatch"
  | "negative_projection"
  | "negative_truth"
  | "stale_projection"
  | "aggregation_mismatch"
  | "scope_mismatch"
  | "compare_unverified"
  | "compare_partial"
  | "degraded_projection"
  | "unavailable_projection";

export type InventoryCompareClassificationMetadata = {
  readonly classificationId: string;
  readonly classification: InventoryCompareMismatchClassification;
  readonly label: string;
  readonly reason: string;
  readonly interpretation: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryCompareSeverityMetadata = {
  readonly severityId: string;
  readonly severity: InventoryCompareSeverity;
  readonly label: string;
  readonly reason: string;
  readonly interpretation: string;
  readonly noExecutionMeaning: string;
  readonly classification: InventoryCompareMismatchClassification;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryCompareReviewReadiness =
  | "review_required"
  | "review_recommended"
  | "review_optional"
  | "review_blocked"
  | "review_unverified";

export type InventoryCompareReviewReadinessMetadata = {
  readonly readinessId: string;
  readonly readiness: InventoryCompareReviewReadiness;
  readonly label: string;
  readonly reason: string;
  readonly interpretation: string;
  readonly noExecutionMeaning: string;
  readonly severity: InventoryCompareSeverity;
  readonly classification: InventoryCompareMismatchClassification;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryCompareEscalationReadiness =
  | "escalation_required"
  | "escalation_recommended"
  | "escalation_optional"
  | "escalation_blocked"
  | "escalation_unverified";

export type InventoryCompareEscalationReadinessMetadata = {
  readonly readinessId: string;
  readonly readiness: InventoryCompareEscalationReadiness;
  readonly label: string;
  readonly reason: string;
  readonly interpretation: string;
  readonly noExecutionMeaning: string;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly severity: InventoryCompareSeverity;
  readonly classification: InventoryCompareMismatchClassification;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryCompareHardeningMetadata = {
  readonly hardeningId: string;
  readonly sourceStatus: InventoryCompareSourceStatus;
  readonly resultStatus: InventoryCompareResultVisibilityStatus;
  readonly scopeStatus: InventoryCompareScopeValidationStatus;
  readonly label: string;
  readonly readability: string;
  readonly sourceInterpretation: string;
  readonly resultInterpretation: string;
  readonly scopeInterpretation: string;
  readonly degradationVisibility: string;
  readonly noExecutionMeaning: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

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
  readonly compareHardening?: InventoryCompareHardeningMetadata;
  readonly compareClassification?: InventoryCompareClassificationMetadata;
  readonly compareSeverity?: InventoryCompareSeverityMetadata;
  readonly compareReviewReadiness?: InventoryCompareReviewReadinessMetadata;
  readonly compareEscalationReadiness?: InventoryCompareEscalationReadinessMetadata;
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
  readonly compareStatus?: InventoryCompareStatus;
  readonly mismatchClassification?: InventoryCompareMismatchClassification;
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

export type ProjectionResponseMetadata = {
  readonly responseId: string;
  readonly responseKind:
    | "static_read_only_response"
    | "future_edge_projection_response"
    | "future_snapshot_projection_response";
  readonly source: ProjectionSourceMetadata;
  readonly statusSemantics: ProjectionResponseStatusSemantics;
  readonly consistencySemantics: ProjectionConsistencySemantics;
  readonly degradationSemantics: ProjectionDegradationSemantics;
  readonly authoritySemantics: ProjectionAuthoritySemantics;
  readonly snapshotSemantics: ProjectionSnapshotSemantics;
  readonly provenanceSemantics: ProjectionProvenanceSemantics;
  readonly evidenceSemantics: ProjectionEvidenceSemantics;
  readonly fallbackSemantics: ProjectionFallbackSemantics;
  readonly traceSemantics: ProjectionTraceSemantics;
  readonly governanceSemantics: ProjectionGovernanceSemantics;
  readonly reviewSemantics: ProjectionReviewSemantics;
  readonly decisionSemantics: ProjectionDecisionSemantics;
  readonly attentionSemantics: ProjectionAttentionSemantics;
  readonly escalationSemantics: ProjectionEscalationSemantics;
  readonly telemetrySemantics: ProjectionTelemetrySemantics;
  readonly latencySemantics: ProjectionLatencySemantics;
  readonly availabilitySemantics: ProjectionAvailabilitySemantics;
  readonly diagnosticSemantics: ProjectionDiagnosticSemantics;
  readonly confidenceSemantics: ProjectionConfidenceSemantics;
  readonly healthSemantics: ProjectionHealthSemantics;
  readonly resilienceSemantics: ProjectionResilienceSemantics;
  readonly stabilitySemantics: ProjectionStabilitySemantics;
  readonly recoverabilitySemantics: ProjectionRecoverabilitySemantics;
  readonly durabilitySemantics: ProjectionDurabilitySemantics;
  readonly continuitySemantics: ProjectionContinuitySemantics;
  readonly integrityAssuranceSemantics: ProjectionIntegrityAssuranceSemantics;
  readonly survivabilitySemantics: ProjectionSurvivabilitySemantics;
  readonly trustworthinessSemantics: ProjectionTrustworthinessSemantics;
  readonly operationalSustainabilitySemantics: ProjectionOperationalSustainabilitySemantics;
  readonly compareHardening?: InventoryCompareHardeningMetadata;
  readonly compareClassification?: InventoryCompareClassificationMetadata;
  readonly compareSeverity?: InventoryCompareSeverityMetadata;
  readonly compareReviewReadiness?: InventoryCompareReviewReadinessMetadata;
  readonly compareEscalationReadiness?: InventoryCompareEscalationReadinessMetadata;
  readonly responseContractVersion: string;
  readonly readability: string;
  readonly adapterInputBoundary: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type RawProjectionMetadataPayload = {
  readonly payloadId: string;
  readonly payloadKind:
    | "static_read_only_response"
    | "future_edge_projection_response"
    | "future_snapshot_projection_response";
  readonly source: ProjectionSourceMetadata;
  readonly statusSemantics: ProjectionResponseStatusSemantics;
  readonly consistencySemantics: ProjectionConsistencySemantics;
  readonly degradationSemantics: ProjectionDegradationSemantics;
  readonly authoritySemantics: ProjectionAuthoritySemantics;
  readonly snapshotSemantics: ProjectionSnapshotSemantics;
  readonly provenanceSemantics: ProjectionProvenanceSemantics;
  readonly evidenceSemantics: ProjectionEvidenceSemantics;
  readonly fallbackSemantics: ProjectionFallbackSemantics;
  readonly traceSemantics: ProjectionTraceSemantics;
  readonly governanceSemantics: ProjectionGovernanceSemantics;
  readonly reviewSemantics: ProjectionReviewSemantics;
  readonly decisionSemantics: ProjectionDecisionSemantics;
  readonly attentionSemantics: ProjectionAttentionSemantics;
  readonly escalationSemantics: ProjectionEscalationSemantics;
  readonly telemetrySemantics: ProjectionTelemetrySemantics;
  readonly latencySemantics: ProjectionLatencySemantics;
  readonly availabilitySemantics: ProjectionAvailabilitySemantics;
  readonly diagnosticSemantics: ProjectionDiagnosticSemantics;
  readonly confidenceSemantics: ProjectionConfidenceSemantics;
  readonly healthSemantics: ProjectionHealthSemantics;
  readonly resilienceSemantics: ProjectionResilienceSemantics;
  readonly stabilitySemantics: ProjectionStabilitySemantics;
  readonly recoverabilitySemantics: ProjectionRecoverabilitySemantics;
  readonly durabilitySemantics: ProjectionDurabilitySemantics;
  readonly continuitySemantics: ProjectionContinuitySemantics;
  readonly integrityAssuranceSemantics: ProjectionIntegrityAssuranceSemantics;
  readonly survivabilitySemantics: ProjectionSurvivabilitySemantics;
  readonly trustworthinessSemantics: ProjectionTrustworthinessSemantics;
  readonly operationalSustainabilitySemantics: ProjectionOperationalSustainabilitySemantics;
  readonly compareHardening?: InventoryCompareHardeningMetadata;
  readonly compareClassification?: InventoryCompareClassificationMetadata;
  readonly compareSeverity?: InventoryCompareSeverityMetadata;
  readonly compareReviewReadiness?: InventoryCompareReviewReadinessMetadata;
  readonly compareEscalationReadiness?: InventoryCompareEscalationReadinessMetadata;
  readonly payloadVersion: string;
  readonly readability: string;
  readonly adapterInputBoundary: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type RawProjectionLifecyclePayload = {
  readonly state: ProjectionLifecycleState;
  readonly label: string;
  readonly readability: string;
  readonly interpretation: string;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type RawProjectionPayload = {
  readonly metadata: RawProjectionMetadataPayload;
  readonly lifecycle: RawProjectionLifecyclePayload;
  readonly data: InventoryIntegrityReadOnlyData;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryIntegrityFetchResultMetadata = {
  readonly resultId: string;
  readonly resultKind:
    | "static_mock_fetch_result"
    | "future_edge_fetch_result"
    | "future_snapshot_fetch_result";
  readonly source: ProjectionSourceMetadata;
  readonly endpoint: ProjectionEndpoint;
  readonly request: InventoryIntegrityEdgeRequest;
  readonly fetchSemantics: InventoryIntegrityFetchSemantics;
  readonly fetchExecution: ProjectionFetchExecutionSemantics;
  readonly transportSemantics: ProjectionTransportSemantics;
  readonly cacheSemantics: ProjectionCacheSemantics;
  readonly offlineSemantics: ProjectionOfflineSemantics;
  readonly retrySemantics: ProjectionRetrySemantics;
  readonly consistencySemantics: ProjectionConsistencySemantics;
  readonly degradationSemantics: ProjectionDegradationSemantics;
  readonly authoritySemantics: ProjectionAuthoritySemantics;
  readonly snapshotSemantics: ProjectionSnapshotSemantics;
  readonly provenanceSemantics: ProjectionProvenanceSemantics;
  readonly evidenceSemantics: ProjectionEvidenceSemantics;
  readonly fallbackSemantics: ProjectionFallbackSemantics;
  readonly traceSemantics: ProjectionTraceSemantics;
  readonly governanceSemantics: ProjectionGovernanceSemantics;
  readonly reviewSemantics: ProjectionReviewSemantics;
  readonly decisionSemantics: ProjectionDecisionSemantics;
  readonly attentionSemantics: ProjectionAttentionSemantics;
  readonly escalationSemantics: ProjectionEscalationSemantics;
  readonly telemetrySemantics: ProjectionTelemetrySemantics;
  readonly latencySemantics: ProjectionLatencySemantics;
  readonly availabilitySemantics: ProjectionAvailabilitySemantics;
  readonly diagnosticSemantics: ProjectionDiagnosticSemantics;
  readonly confidenceSemantics: ProjectionConfidenceSemantics;
  readonly healthSemantics: ProjectionHealthSemantics;
  readonly resilienceSemantics: ProjectionResilienceSemantics;
  readonly stabilitySemantics: ProjectionStabilitySemantics;
  readonly recoverabilitySemantics: ProjectionRecoverabilitySemantics;
  readonly durabilitySemantics: ProjectionDurabilitySemantics;
  readonly continuitySemantics: ProjectionContinuitySemantics;
  readonly integrityAssuranceSemantics: ProjectionIntegrityAssuranceSemantics;
  readonly survivabilitySemantics: ProjectionSurvivabilitySemantics;
  readonly trustworthinessSemantics: ProjectionTrustworthinessSemantics;
  readonly operationalSustainabilitySemantics: ProjectionOperationalSustainabilitySemantics;
  readonly compareHardening?: InventoryCompareHardeningMetadata;
  readonly compareClassification?: InventoryCompareClassificationMetadata;
  readonly compareSeverity?: InventoryCompareSeverityMetadata;
  readonly compareReviewReadiness?: InventoryCompareReviewReadinessMetadata;
  readonly compareEscalationReadiness?: InventoryCompareEscalationReadinessMetadata;
  readonly responseStatus: ProjectionResponseStatusSemantics;
  readonly resultVersion: string;
  readonly readability: string;
  readonly adapterInputBoundary: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryIntegrityFetchResult = {
  readonly metadata: InventoryIntegrityFetchResultMetadata;
  readonly lifecycle: RawProjectionLifecyclePayload;
  readonly data: InventoryIntegrityReadOnlyData;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionRequestScope = {
  readonly scope: InventoryCompareScope | "all";
  readonly warehouseId?: string;
  readonly projectId?: string;
  readonly locationId?: string;
  readonly partId?: string;
  readonly readability: string;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type ProjectionRequestContext = {
  readonly contextId: string;
  readonly viewMode: ProjectionViewMode;
  readonly reviewMode: ProjectionReviewMode;
  readonly readability: string;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryIntegrityEdgeRequest = {
  readonly requestId: string;
  readonly requestKind:
    | "static_mock_edge_request"
    | "future_edge_projection_request"
    | "future_snapshot_projection_request";
  readonly scope: ProjectionRequestScope;
  readonly context: ProjectionRequestContext;
  readonly target: ProjectionResolutionTarget;
  readonly endpoint: ProjectionEndpoint;
  readonly fetchSemantics: InventoryIntegrityFetchSemantics;
  readonly fetchExecution: ProjectionFetchExecutionSemantics;
  readonly readability: string;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryIntegrityEdgeClient = {
  readonly clientId: string;
  readonly label: string;
  readonly source: ProjectionSourceMetadata;
  readonly semanticMeaning: string;
  readonly endpoint: ProjectionEndpoint;
  readonly fetchSemantics: InventoryIntegrityFetchSemantics;
  readonly fetchExecution: ProjectionFetchExecutionSemantics;
  readonly responseStatus: ProjectionResponseStatusSemantics;
  readonly transportSemantics: ProjectionTransportSemantics;
  readonly cacheSemantics: ProjectionCacheSemantics;
  readonly offlineSemantics: ProjectionOfflineSemantics;
  readonly retrySemantics: ProjectionRetrySemantics;
  readonly readProjectionPayload: (request?: InventoryIntegrityEdgeRequest) => RawProjectionPayload;
  readonly truthSource: InventoryIntegrityTruthSource;
  readonly cacheCompareTarget: InventoryIntegrityCacheCompareTarget;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryIntegrityEdgeClientSummary = {
  readonly clientId: string;
  readonly sourceId: string;
  readonly requestId: string;
  readonly endpointId: string;
  readonly endpointCapability: ProjectionEndpointCapability;
  readonly fetchSemanticsId: string;
  readonly fetchCapability: InventoryIntegrityFetchCapability;
  readonly fetchExecutionState: ProjectionFetchExecutionState;
  readonly transportState: ProjectionTransportState;
  readonly cacheState: ProjectionCacheState;
  readonly offlineState: ProjectionOfflineState;
  readonly retryState: ProjectionRetryState;
  readonly responseStatus: ProjectionResponseStatus;
  readonly payloadId: string;
  readonly payloadVersion: string;
  readonly readability: string;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryIntegrityEdgeProjectionResponse = {
  readonly metadata: ProjectionResponseMetadata;
  readonly lifecycle: ProjectionResponseLifecycle;
  readonly statusSemantics: ProjectionResponseStatusSemantics;
  readonly normalizedData: InventoryIntegrityReadOnlyData;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryIntegrityRawEdgeProjectionResponse = {
  readonly payload: RawProjectionPayload;
  readonly semanticBoundary: InventoryIntegritySemanticBoundary;
  readonly executionBoundary: InventoryIntegrityExecutionBoundary;
};

export type InventoryIntegrityProjectionServiceView = {
  readonly query: InventoryIntegrityProjectionQuery;
  readonly response: InventoryIntegrityEdgeProjectionResponse;
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
