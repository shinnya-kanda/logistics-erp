import type {
  RealCompareValidationDisclosureMetadata,
  RealCompareValidationDisclosureStatus,
  RealCompareValidationInspectorMetadata,
} from "./inventoryIntegrityRealCompareValidationProjectionTypes";
import type {
  RealCompareGuardedAvailabilityBadgeStatus,
  RealCompareGuardedAvailabilityDisplayBundle,
} from "./inventoryIntegrityRealCompareGuardedAvailabilityDisclosureTypes";

// B77-62 pure disclosure projection implementation only.
// No UI wiring, source option integration, feature flag change, fetch, route import,
// adapter import, fixture import, DB access, mutation, or execution action.

function mapDisclosureStatusToBadgeStatus(
  status: RealCompareValidationDisclosureStatus,
): RealCompareGuardedAvailabilityBadgeStatus {
  if (status === "not_evaluated") {
    return "guarded";
  }

  return status;
}

function getBadgeLabel(
  status: RealCompareGuardedAvailabilityBadgeStatus,
): string {
  if (status === "passed") {
    return "Validation Passed";
  }

  if (status === "warning") {
    return "Guarded Warning";
  }

  if (status === "blocked") {
    return "Blocked";
  }

  if (status === "unavailable") {
    return "Unavailable";
  }

  return "Guarded";
}

function getBadgeDescription(
  status: RealCompareGuardedAvailabilityBadgeStatus,
): string {
  if (status === "passed") {
    return "Read-only validation candidate only. This does not enable real_compare_readonly.";
  }

  if (status === "warning") {
    return "Read-only caution disclosure. No operator action or execution control is allowed.";
  }

  if (status === "blocked") {
    return "Read-only projection readiness is blocked. Fallback explanation only.";
  }

  if (status === "unavailable") {
    return "Read-only unavailable state. Keep fallback_unavailable explanation visible.";
  }

  return "Guarded read-only state. real_compare_readonly remains disabled and non-live.";
}

export function projectRealCompareGuardedAvailabilityDisplayBundle(
  disclosureMetadata: RealCompareValidationDisclosureMetadata,
  inspectorMetadata: RealCompareValidationInspectorMetadata,
): RealCompareGuardedAvailabilityDisplayBundle {
  const status = mapDisclosureStatusToBadgeStatus(
    disclosureMetadata.projection.disclosureStatus,
  );
  const reasons = disclosureMetadata.projection.reasons.map(
    (reason) => reason.message,
  );

  return {
    badge: {
      status,
      label: getBadgeLabel(status),
      description: getBadgeDescription(status),
      isReadOnly: true,
    },
    disclosure: {
      status,
      headline: disclosureMetadata.projection.headline,
      description: disclosureMetadata.projection.description,
      reasons,
      isReadOnly: true,
      isActionable: false,
      isExecutionAllowed: false,
    },
    inspector: {
      status,
      totalReasons: reasons.length,
      readOnly: inspectorMetadata.readOnly,
    },
  };
}
