import type {
  RealCompareGuardedAvailabilityBadgeStatus,
  RealCompareGuardedAvailabilityDisplayBundle,
} from "./inventoryIntegrityRealCompareGuardedAvailabilityDisclosureTypes";
import type {
  RealCompareReadOnlyWiringBundle,
  RealCompareReadOnlyWiringMetadata,
  RealCompareReadOnlyWiringStatus,
  RealCompareReadOnlyWiringTarget,
} from "./inventoryIntegrityRealCompareReadOnlyWiringTypes";

// B77-66 pure wiring metadata projection only.
// No UI wiring, source option integration, feature flag change, route import,
// adapter import, fixture import, DB access, mutation, or execution action.

const WIRING_TARGETS: readonly RealCompareReadOnlyWiringTarget[] = [
  "graph_source_disclosure",
  "source_badge",
  "inspector_validation_section",
  "guarded_fallback_reason",
  "unavailable_fallback_explanation",
];

function mapBadgeStatusToWiringStatus(
  status: RealCompareGuardedAvailabilityBadgeStatus,
): RealCompareReadOnlyWiringStatus {
  if (status === "passed") {
    return "candidate";
  }

  if (status === "blocked") {
    return "blocked";
  }

  if (status === "unavailable") {
    return "unavailable";
  }

  return "guarded";
}

function getTargetHeadline(target: RealCompareReadOnlyWiringTarget): string {
  if (target === "graph_source_disclosure") {
    return "Graph Source Read-only Disclosure";
  }

  if (target === "source_badge") {
    return "Source Badge Read-only State";
  }

  if (target === "inspector_validation_section") {
    return "Inspector Validation Read-only Summary";
  }

  if (target === "guarded_fallback_reason") {
    return "Guarded Fallback Read-only Reason";
  }

  return "Unavailable Fallback Read-only Explanation";
}

function getTargetDescription(
  target: RealCompareReadOnlyWiringTarget,
  displayBundle: RealCompareGuardedAvailabilityDisplayBundle,
): string {
  if (target === "graph_source_disclosure") {
    return `${displayBundle.disclosure.headline}: ${displayBundle.disclosure.description}`;
  }

  if (target === "source_badge") {
    return `${displayBundle.badge.label}: ${displayBundle.badge.description}`;
  }

  if (target === "inspector_validation_section") {
    return `Inspector validation summary for ${displayBundle.inspector.totalReasons} read-only reason(s).`;
  }

  if (target === "guarded_fallback_reason") {
    return "Guarded, blocked, or not evaluated state remains a read-only fallback reason only.";
  }

  return "Unavailable state remains a fallback_unavailable explanation only.";
}

function projectTargetMetadata(
  target: RealCompareReadOnlyWiringTarget,
  status: RealCompareReadOnlyWiringStatus,
  displayBundle: RealCompareGuardedAvailabilityDisplayBundle,
): RealCompareReadOnlyWiringMetadata {
  return {
    sourceMode: "real_compare_readonly",
    target,
    status,
    headline: getTargetHeadline(target),
    description: getTargetDescription(target, displayBundle),
    isReadOnly: true,
    isActionable: false,
    isExecutionAllowed: false,
  };
}

export function projectRealCompareReadOnlyWiringBundle(
  displayBundle: RealCompareGuardedAvailabilityDisplayBundle,
): RealCompareReadOnlyWiringBundle {
  const status = mapBadgeStatusToWiringStatus(displayBundle.badge.status);

  return {
    sourceMode: "real_compare_readonly",
    displayBundle,
    metadata: WIRING_TARGETS.map((target) =>
      projectTargetMetadata(target, status, displayBundle),
    ),
    isReadOnly: true,
    isWiredToUi: false,
    isLiveData: false,
  };
}
