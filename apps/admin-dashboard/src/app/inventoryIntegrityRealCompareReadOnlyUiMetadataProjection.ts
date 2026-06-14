import type { RealCompareReadOnlyWiringBundle } from "./inventoryIntegrityRealCompareReadOnlyWiringTypes";
import type { RealCompareReadOnlyUiMetadataBundle } from "./inventoryIntegrityRealCompareReadOnlyUiMetadataTypes";

// B77-71 pure UI metadata projection only.
// No UI wiring, source option integration, feature flag change, route import,
// adapter import, fixture import, DB access, mutation, or execution action.

export function projectRealCompareReadOnlyUiMetadataBundle(
  wiringBundle: RealCompareReadOnlyWiringBundle,
): RealCompareReadOnlyUiMetadataBundle {
  const { displayBundle } = wiringBundle;

  return {
    disclosure: {
      status: displayBundle.disclosure.status,
      headline: displayBundle.disclosure.headline,
      description: displayBundle.disclosure.description,
      reasons: displayBundle.disclosure.reasons,
      isReadOnly: true,
      isActionable: false,
      isExecutionAllowed: false,
    },
    badge: {
      status: displayBundle.badge.status,
      label: displayBundle.badge.label,
      description: displayBundle.badge.description,
      isReadOnly: true,
    },
    inspector: {
      status: displayBundle.inspector.status,
      headline: displayBundle.disclosure.headline,
      description: displayBundle.disclosure.description,
      reasons: displayBundle.disclosure.reasons,
      totalReasons: displayBundle.inspector.totalReasons,
      readOnly: true,
    },
    isReadOnly: true,
    isLiveData: false,
  };
}
