import type { RealCompareValidationSummary } from "./inventoryIntegrityRealCompareValidationTypes";
import type {
  RealCompareValidationDisclosureMetadata,
  RealCompareValidationDisclosureStatus,
  RealCompareValidationInspectorMetadata,
} from "./inventoryIntegrityRealCompareValidationProjectionTypes";

// B77-58 pure projection implementation only.
// No UI wiring, source option integration, feature flag change, fetch, route import,
// adapter import, fixture import, DB access, mutation, or execution action.

function hasUnavailableCondition(summary: RealCompareValidationSummary): boolean {
  return summary.results.some(
    (result) =>
      result.gateId === "unavailable_response" &&
      (result.status === "failed" || result.status === "blocked"),
  );
}

function hasWarningStatus(summary: RealCompareValidationSummary): boolean {
  return summary.results.some((result) => result.status === "warning");
}

function hasNotEvaluatedStatus(summary: RealCompareValidationSummary): boolean {
  return (
    !summary.isEvaluated ||
    summary.results.some((result) => result.status === "not_evaluated")
  );
}

function classifyDisclosureStatus(
  summary: RealCompareValidationSummary,
): RealCompareValidationDisclosureStatus {
  if (hasUnavailableCondition(summary)) {
    return "unavailable";
  }

  if (summary.hasBlockingFailure) {
    return "blocked";
  }

  if (hasWarningStatus(summary)) {
    return "warning";
  }

  if (hasNotEvaluatedStatus(summary)) {
    return "not_evaluated";
  }

  if (summary.isValidForReadOnlyGraph) {
    return "passed";
  }

  return "blocked";
}

function getProjectionHeadline(
  disclosureStatus: RealCompareValidationDisclosureStatus,
): string {
  if (disclosureStatus === "passed") {
    return "Validation Passed For Read-only Projection";
  }

  if (disclosureStatus === "warning") {
    return "Validation Warning For Read-only Projection";
  }

  if (disclosureStatus === "unavailable") {
    return "Validation Unavailable For Read-only Projection";
  }

  if (disclosureStatus === "not_evaluated") {
    return "Validation Not Evaluated";
  }

  return "Validation Blocked For Read-only Projection";
}

function getProjectionDescription(
  disclosureStatus: RealCompareValidationDisclosureStatus,
): string {
  if (disclosureStatus === "passed") {
    return "Validation metadata indicates future read-only projection readiness only. This does not enable real_compare_readonly, live data, or execution controls.";
  }

  if (disclosureStatus === "warning") {
    return "Validation metadata contains read-only caveats that must remain visible. This is disclosure metadata only and does not request operator action.";
  }

  if (disclosureStatus === "unavailable") {
    return "Validation metadata indicates an unavailable response condition. Keep guarded fallback semantics and do not retry, repair, rebuild, or execute a workflow.";
  }

  if (disclosureStatus === "not_evaluated") {
    return "Validation metadata has not been evaluated. real_compare_readonly remains guarded, disabled, and non-live.";
  }

  return "Validation metadata blocks read-only projection readiness. This is an explanatory state only and does not perform fallback or mutation.";
}

export function projectRealCompareValidationDisclosureMetadata(
  summary: RealCompareValidationSummary,
): RealCompareValidationDisclosureMetadata {
  const disclosureStatus = classifyDisclosureStatus(summary);
  const hasWarnings = hasWarningStatus(summary);
  const hasUnavailable = hasUnavailableCondition(summary);

  return {
    projection: {
      sourceMode: "real_compare_readonly",
      disclosureStatus,
      headline: getProjectionHeadline(disclosureStatus),
      description: getProjectionDescription(disclosureStatus),
      reasons: summary.results.map((result) => ({
        gateId: result.gateId,
        message: result.message,
        severity: result.severity,
      })),
      isReadOnly: true,
      isActionable: false,
      isExecutionAllowed: false,
    },
    hasBlockingFailure: summary.hasBlockingFailure,
    hasWarnings,
    hasUnavailableCondition: hasUnavailable,
  };
}

export function projectRealCompareValidationInspectorMetadata(
  summary: RealCompareValidationSummary,
): RealCompareValidationInspectorMetadata {
  return {
    summaryStatus: classifyDisclosureStatus(summary),
    totalResults: summary.results.length,
    blockingCount: summary.results.filter((result) => result.isBlocking).length,
    warningCount: summary.results.filter(
      (result) => result.status === "warning" || result.severity === "warning",
    ).length,
    readOnly: true,
  };
}
