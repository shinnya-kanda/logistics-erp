// B77-51 type-only contract for future real_compare_readonly validation gates.
// No runtime validation, fetch, route import, DB access, mutation, UI, or execution action.

export type RealCompareValidationGateId =
  | "route_contract"
  | "response_shape"
  | "metadata_completeness"
  | "enum_drift"
  | "unsupported_shape"
  | "unavailable_response"
  | "source_divergence"
  | "graph_adapter_normalization"
  | "ui_guarded_fallback";

export type RealCompareValidationSeverity =
  | "info"
  | "warning"
  | "error"
  | "blocked";

export type RealCompareValidationStatus =
  | "not_evaluated"
  | "passed"
  | "warning"
  | "failed"
  | "blocked";

export type RealCompareValidationSource =
  | "fixture"
  | "route_response"
  | "fetch_adapter"
  | "inventory_adapter"
  | "graph_adapter"
  | "graph_ui";

export type RealCompareFixtureId =
  | "full_metadata"
  | "missing_metadata"
  | "nested_metadata"
  | "partial_lifecycle"
  | "unsupported_shape"
  | "drifted_key"
  | "unavailable_response"
  | "source_divergence"
  | "enum_drift";

export type RealCompareFixtureName =
  | "fullMetadataCompareResponseFixture"
  | "missingMetadataCompareResponseFixture"
  | "nestedMetadataCompareResponseFixture"
  | "partialLifecycleCompareResponseFixture"
  | "unsupportedShapeCompareResponseFixture"
  | "driftedKeyCompareResponseFixture"
  | "unavailableCompareResponseFixture"
  | "sourceDivergenceCompareResponseFixture"
  | "enumDriftCompareResponseFixture";

export type RealCompareValidationResult = {
  readonly gateId: RealCompareValidationGateId;
  readonly status: RealCompareValidationStatus;
  readonly severity: RealCompareValidationSeverity;
  readonly source: RealCompareValidationSource;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly isBlocking: boolean;
};

export type RealCompareValidationSummary = {
  readonly sourceMode: "real_compare_readonly";
  readonly isEvaluated: boolean;
  readonly isValidForReadOnlyGraph: boolean;
  readonly hasBlockingFailure: boolean;
  readonly results: readonly RealCompareValidationResult[];
};

export type RealCompareGuardedAvailability = {
  readonly sourceMode: "real_compare_readonly";
  readonly isVisible: boolean;
  readonly isGuarded: true;
  readonly isEnabled: false;
  readonly isLiveData: false;
  readonly validation?: RealCompareValidationSummary;
};

export type RealCompareExpectedGateOutcome = {
  readonly gateId: RealCompareValidationGateId;
  readonly expectedStatus: RealCompareValidationStatus;
  readonly expectedSeverity: RealCompareValidationSeverity;
  readonly expectedBlocking: boolean;
  readonly reason: string;
};

export type RealCompareValidationFixtureMapping = {
  readonly fixtureId: RealCompareFixtureId;
  readonly fixtureName: RealCompareFixtureName;
  readonly description: string;
  readonly expectedOutcomes: readonly RealCompareExpectedGateOutcome[];
  readonly expectedReadOnlyGraphAvailability: boolean;
  readonly expectedBlockingFailure: boolean;
  readonly readOnlyPurpose: string;
};
