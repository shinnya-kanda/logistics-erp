import type { RealCompareValidationFixtureMapping } from "./inventoryIntegrityRealCompareValidationTypes";

// B77-52 static mapping only.
// No fixture imports, evaluator, fetch, route call, DB access, mutation, UI, or execution action.

export const REAL_COMPARE_VALIDATION_FIXTURE_MAPPINGS: readonly RealCompareValidationFixtureMapping[] =
  [
    {
      fixtureId: "full_metadata",
      fixtureName: "fullMetadataCompareResponseFixture",
      description:
        "Full metadata fixture should represent the non-live happy path for route contract, response shape, metadata completeness, and graph adapter normalization.",
      expectedOutcomes: [
        {
          gateId: "route_contract",
          expectedStatus: "passed",
          expectedSeverity: "info",
          expectedBlocking: false,
          reason: "Fixture preserves GET-only and read-only response metadata.",
        },
        {
          gateId: "response_shape",
          expectedStatus: "passed",
          expectedSeverity: "info",
          expectedBlocking: false,
          reason: "Fixture uses a supported compare-response-shaped envelope.",
        },
        {
          gateId: "metadata_completeness",
          expectedStatus: "passed",
          expectedSeverity: "info",
          expectedBlocking: false,
          reason: "Fixture includes broad metadata coverage for graph projection.",
        },
        {
          gateId: "graph_adapter_normalization",
          expectedStatus: "passed",
          expectedSeverity: "info",
          expectedBlocking: false,
          reason: "Fixture should normalize into read-only graph data without unavailable fallback.",
        },
      ],
      expectedReadOnlyGraphAvailability: true,
      expectedBlockingFailure: false,
      readOnlyPurpose:
        "Confirm the expected validation pass shape before real_compare_readonly is enabled.",
    },
    {
      fixtureId: "missing_metadata",
      fixtureName: "missingMetadataCompareResponseFixture",
      description:
        "Missing metadata fixture should prove that absent graph metadata fails closed instead of rendering a healthy graph.",
      expectedOutcomes: [
        {
          gateId: "response_shape",
          expectedStatus: "warning",
          expectedSeverity: "warning",
          expectedBlocking: false,
          reason: "Envelope may exist, but the graph metadata candidate is missing.",
        },
        {
          gateId: "metadata_completeness",
          expectedStatus: "failed",
          expectedSeverity: "blocked",
          expectedBlocking: true,
          reason: "Required graph metadata is missing and should require guarded fallback.",
        },
        {
          gateId: "ui_guarded_fallback",
          expectedStatus: "passed",
          expectedSeverity: "info",
          expectedBlocking: false,
          reason: "UI should be able to show unavailable fallback without execution controls.",
        },
      ],
      expectedReadOnlyGraphAvailability: false,
      expectedBlockingFailure: true,
      readOnlyPurpose:
        "Confirm missing metadata is read-only unavailable state, not a recoverable action.",
    },
    {
      fixtureId: "nested_metadata",
      fixtureName: "nestedMetadataCompareResponseFixture",
      description:
        "Nested metadata fixture should verify supported rich object normalization without losing read-only caveats.",
      expectedOutcomes: [
        {
          gateId: "response_shape",
          expectedStatus: "passed",
          expectedSeverity: "info",
          expectedBlocking: false,
          reason: "Nested value/reason/source/signals shape is an expected validation target.",
        },
        {
          gateId: "metadata_completeness",
          expectedStatus: "warning",
          expectedSeverity: "warning",
          expectedBlocking: false,
          reason: "Rich metadata may normalize to representative values and keep caveats visible.",
        },
        {
          gateId: "graph_adapter_normalization",
          expectedStatus: "warning",
          expectedSeverity: "warning",
          expectedBlocking: false,
          reason: "Normalization warnings are expected but should not imply execution action.",
        },
      ],
      expectedReadOnlyGraphAvailability: true,
      expectedBlockingFailure: false,
      readOnlyPurpose:
        "Confirm nested metadata remains display-only and caveated during projection.",
    },
    {
      fixtureId: "partial_lifecycle",
      fixtureName: "partialLifecycleCompareResponseFixture",
      description:
        "Partial lifecycle fixture should verify that incomplete lifecycle metadata is visible and not overstated.",
      expectedOutcomes: [
        {
          gateId: "metadata_completeness",
          expectedStatus: "warning",
          expectedSeverity: "warning",
          expectedBlocking: false,
          reason: "Lifecycle coverage is incomplete and should remain caveated.",
        },
        {
          gateId: "graph_adapter_normalization",
          expectedStatus: "warning",
          expectedSeverity: "warning",
          expectedBlocking: false,
          reason: "Adapter may project partial graph data with unavailable lifecycle caveats.",
        },
        {
          gateId: "ui_guarded_fallback",
          expectedStatus: "warning",
          expectedSeverity: "warning",
          expectedBlocking: false,
          reason: "UI must avoid presenting partial lifecycle state as fully healthy.",
        },
      ],
      expectedReadOnlyGraphAvailability: true,
      expectedBlockingFailure: false,
      readOnlyPurpose:
        "Confirm partial lifecycle data is observational and not a repair or rebuild prompt.",
    },
    {
      fixtureId: "unsupported_shape",
      fixtureName: "unsupportedShapeCompareResponseFixture",
      description:
        "Unsupported shape fixture should force a blocked validation outcome and unavailable graph expectation.",
      expectedOutcomes: [
        {
          gateId: "unsupported_shape",
          expectedStatus: "blocked",
          expectedSeverity: "blocked",
          expectedBlocking: true,
          reason: "Unsupported metadata shape must not be coerced into graph data.",
        },
        {
          gateId: "response_shape",
          expectedStatus: "failed",
          expectedSeverity: "error",
          expectedBlocking: true,
          reason: "Non-record metadata shape fails the safe response shape gate.",
        },
        {
          gateId: "ui_guarded_fallback",
          expectedStatus: "passed",
          expectedSeverity: "info",
          expectedBlocking: false,
          reason: "UI should show unavailable fallback with no action button.",
        },
      ],
      expectedReadOnlyGraphAvailability: false,
      expectedBlockingFailure: true,
      readOnlyPurpose:
        "Confirm unsupported shapes fail closed and remain read-only unavailable.",
    },
    {
      fixtureId: "drifted_key",
      fixtureName: "driftedKeyCompareResponseFixture",
      description:
        "Drifted key fixture should validate key drift handling and block readiness when required metadata cannot be trusted.",
      expectedOutcomes: [
        {
          gateId: "response_shape",
          expectedStatus: "failed",
          expectedSeverity: "error",
          expectedBlocking: true,
          reason: "Renamed keys may bypass expected metadata fields and require explicit mapping policy.",
        },
        {
          gateId: "metadata_completeness",
          expectedStatus: "failed",
          expectedSeverity: "blocked",
          expectedBlocking: true,
          reason: "Required metadata completeness cannot be assumed when keys drift.",
        },
        {
          gateId: "graph_adapter_normalization",
          expectedStatus: "warning",
          expectedSeverity: "warning",
          expectedBlocking: false,
          reason: "Supported aliases may still normalize, but unsupported drift must remain caveated.",
        },
      ],
      expectedReadOnlyGraphAvailability: false,
      expectedBlockingFailure: true,
      readOnlyPurpose:
        "Confirm drifted keys are not silently treated as production-ready metadata.",
    },
    {
      fixtureId: "unavailable_response",
      fixtureName: "unavailableCompareResponseFixture",
      description:
        "Unavailable response fixture should block readiness and require unavailable graph handling.",
      expectedOutcomes: [
        {
          gateId: "unavailable_response",
          expectedStatus: "blocked",
          expectedSeverity: "blocked",
          expectedBlocking: true,
          reason: "Unavailable response cannot be valid for read-only graph availability.",
        },
        {
          gateId: "metadata_completeness",
          expectedStatus: "failed",
          expectedSeverity: "blocked",
          expectedBlocking: true,
          reason: "Unavailable response lacks safe graph metadata.",
        },
        {
          gateId: "ui_guarded_fallback",
          expectedStatus: "passed",
          expectedSeverity: "info",
          expectedBlocking: false,
          reason: "UI should disclose unavailable fallback without recovery controls.",
        },
      ],
      expectedReadOnlyGraphAvailability: false,
      expectedBlockingFailure: true,
      readOnlyPurpose:
        "Confirm unavailable source is observable only and never an automatic retry prompt.",
    },
    {
      fixtureId: "source_divergence",
      fixtureName: "sourceDivergenceCompareResponseFixture",
      description:
        "Source divergence fixture should require explicit metadata precedence before real source readiness.",
      expectedOutcomes: [
        {
          gateId: "source_divergence",
          expectedStatus: "blocked",
          expectedSeverity: "blocked",
          expectedBlocking: true,
          reason: "Divergent metadata sources require a documented precedence policy before enablement.",
        },
        {
          gateId: "route_contract",
          expectedStatus: "warning",
          expectedSeverity: "warning",
          expectedBlocking: false,
          reason: "Route-like response may carry multiple metadata sources with conflicting values.",
        },
        {
          gateId: "graph_adapter_normalization",
          expectedStatus: "warning",
          expectedSeverity: "warning",
          expectedBlocking: false,
          reason: "Current source precedence can be observed but should not imply real source readiness.",
        },
      ],
      expectedReadOnlyGraphAvailability: false,
      expectedBlockingFailure: true,
      readOnlyPurpose:
        "Confirm source divergence is treated as a readiness blocker until precedence is explicit.",
    },
    {
      fixtureId: "enum_drift",
      fixtureName: "enumDriftCompareResponseFixture",
      description:
        "Enum drift fixture should block readiness when unknown values could understate risk.",
      expectedOutcomes: [
        {
          gateId: "enum_drift",
          expectedStatus: "blocked",
          expectedSeverity: "blocked",
          expectedBlocking: true,
          reason: "Unknown enum values may understate risk or confidence caveats.",
        },
        {
          gateId: "metadata_completeness",
          expectedStatus: "warning",
          expectedSeverity: "warning",
          expectedBlocking: false,
          reason: "Metadata is present, but value semantics are not fully trusted.",
        },
        {
          gateId: "graph_adapter_normalization",
          expectedStatus: "failed",
          expectedSeverity: "error",
          expectedBlocking: true,
          reason: "Normalization must not convert drifted unavailable values into healthy graph semantics.",
        },
      ],
      expectedReadOnlyGraphAvailability: false,
      expectedBlockingFailure: true,
      readOnlyPurpose:
        "Confirm enum drift fails safe before real_compare_readonly can be considered.",
    },
  ] as const;
