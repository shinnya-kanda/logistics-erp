import type { RealCompareGuardedAvailabilityDisplayBundle } from "./inventoryIntegrityRealCompareGuardedAvailabilityDisclosureTypes";

// B77-65 type-only contract for future read-only Graph UI wiring metadata.
// No wiring function, helper, UI connection, source option integration, feature flag
// change, fetch, route call, adapter integration, DB access, mutation, or execution action.

export type RealCompareReadOnlyWiringTarget =
  | "graph_source_disclosure"
  | "source_badge"
  | "inspector_validation_section"
  | "guarded_fallback_reason"
  | "unavailable_fallback_explanation";

export type RealCompareReadOnlyWiringStatus =
  | "not_wired"
  | "candidate"
  | "guarded"
  | "blocked"
  | "unavailable";

export type RealCompareReadOnlyWiringMetadata = {
  readonly sourceMode: "real_compare_readonly";
  readonly target: RealCompareReadOnlyWiringTarget;
  readonly status: RealCompareReadOnlyWiringStatus;
  readonly headline: string;
  readonly description: string;
  readonly isReadOnly: true;
  readonly isActionable: false;
  readonly isExecutionAllowed: false;
};

export type RealCompareReadOnlyWiringBundle = {
  readonly sourceMode: "real_compare_readonly";
  readonly displayBundle: RealCompareGuardedAvailabilityDisplayBundle;
  readonly metadata: readonly RealCompareReadOnlyWiringMetadata[];
  readonly isReadOnly: true;
  readonly isWiredToUi: false;
  readonly isLiveData: false;
};
