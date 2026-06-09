import type {
  RealCompareValidationGateId,
  RealCompareValidationSeverity,
} from "./inventoryIntegrityRealCompareValidationTypes";

// B77-57 type-only contract for future validation summary disclosure projection.
// No projection function, UI wiring, source option integration, feature flag change,
// fetch, route call, adapter integration, DB access, mutation, or execution action.

export type RealCompareValidationDisclosureStatus =
  | "passed"
  | "warning"
  | "blocked"
  | "not_evaluated"
  | "unavailable";

export type RealCompareValidationProjectionReason = {
  readonly gateId: RealCompareValidationGateId;
  readonly message: string;
  readonly severity: RealCompareValidationSeverity;
};

export type RealCompareValidationProjection = {
  readonly sourceMode: "real_compare_readonly";
  readonly disclosureStatus: RealCompareValidationDisclosureStatus;
  readonly headline: string;
  readonly description: string;
  readonly reasons: readonly RealCompareValidationProjectionReason[];
  readonly isReadOnly: true;
  readonly isActionable: false;
  readonly isExecutionAllowed: false;
};

export type RealCompareValidationDisclosureMetadata = {
  readonly projection: RealCompareValidationProjection;
  readonly hasBlockingFailure: boolean;
  readonly hasWarnings: boolean;
  readonly hasUnavailableCondition: boolean;
};

export type RealCompareValidationInspectorMetadata = {
  readonly summaryStatus: RealCompareValidationDisclosureStatus;
  readonly totalResults: number;
  readonly blockingCount: number;
  readonly warningCount: number;
  readonly readOnly: true;
};
