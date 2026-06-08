import type {
  RealCompareGuardedAvailability,
  RealCompareValidationFixtureMapping,
  RealCompareValidationResult,
  RealCompareValidationSummary,
} from "./inventoryIntegrityRealCompareValidationTypes";

// B77-54 fixture mapping evaluator only.
// No fixture imports, mapping constant import, fetch, route call, adapter, UI, DB access,
// mutation, source option wiring, or execution action.

export function evaluateRealCompareValidationFixtureMapping(
  mapping: RealCompareValidationFixtureMapping,
): RealCompareValidationSummary {
  const results: readonly RealCompareValidationResult[] =
    mapping.expectedOutcomes.map((outcome) => ({
      gateId: outcome.gateId,
      status: outcome.expectedStatus,
      severity: outcome.expectedSeverity,
      source: "fixture",
      message: outcome.reason,
      isBlocking: outcome.expectedBlocking,
    }));

  const hasBlockingFailure = results.some((result) => result.isBlocking);
  const hasFailedOrBlockedStatus = results.some(
    (result) => result.status === "failed" || result.status === "blocked",
  );

  return {
    sourceMode: "real_compare_readonly",
    isEvaluated: true,
    isValidForReadOnlyGraph:
      mapping.expectedReadOnlyGraphAvailability &&
      !hasBlockingFailure &&
      !hasFailedOrBlockedStatus,
    hasBlockingFailure,
    results,
  };
}

export function projectRealCompareGuardedAvailabilityFromValidation(
  summary: RealCompareValidationSummary,
): RealCompareGuardedAvailability {
  return {
    sourceMode: "real_compare_readonly",
    isVisible: summary.isValidForReadOnlyGraph && !summary.hasBlockingFailure,
    isGuarded: true,
    isEnabled: false,
    isLiveData: false,
    validation: summary,
  };
}
