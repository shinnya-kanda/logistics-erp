// B77-61 type-only contract for future guarded availability disclosure display.
// No disclosure function, projection function, UI wiring, source option integration,
// feature flag change, fetch, route call, adapter integration, DB access, mutation,
// or execution action.

export type RealCompareGuardedAvailabilityBadgeStatus =
  | "passed"
  | "warning"
  | "blocked"
  | "unavailable"
  | "guarded";

export type RealCompareGuardedAvailabilityBadgeMetadata = {
  readonly status: RealCompareGuardedAvailabilityBadgeStatus;
  readonly label: string;
  readonly description: string;
  readonly isReadOnly: true;
};

export type RealCompareGuardedAvailabilityDisclosureMetadata = {
  readonly status: RealCompareGuardedAvailabilityBadgeStatus;
  readonly headline: string;
  readonly description: string;
  readonly reasons: readonly string[];
  readonly isReadOnly: true;
  readonly isActionable: false;
  readonly isExecutionAllowed: false;
};

export type RealCompareGuardedAvailabilityInspectorMetadata = {
  readonly status: RealCompareGuardedAvailabilityBadgeStatus;
  readonly totalReasons: number;
  readonly readOnly: true;
};

export type RealCompareGuardedAvailabilityDisplayBundle = {
  readonly badge: RealCompareGuardedAvailabilityBadgeMetadata;
  readonly disclosure: RealCompareGuardedAvailabilityDisclosureMetadata;
  readonly inspector: RealCompareGuardedAvailabilityInspectorMetadata;
};
