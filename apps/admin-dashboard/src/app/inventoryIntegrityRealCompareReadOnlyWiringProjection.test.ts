import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { projectRealCompareReadOnlyWiringBundle } from "./inventoryIntegrityRealCompareReadOnlyWiringProjection";
import type {
  RealCompareGuardedAvailabilityBadgeStatus,
  RealCompareGuardedAvailabilityDisplayBundle,
} from "./inventoryIntegrityRealCompareGuardedAvailabilityDisclosureTypes";
import type {
  RealCompareReadOnlyWiringStatus,
  RealCompareReadOnlyWiringTarget,
} from "./inventoryIntegrityRealCompareReadOnlyWiringTypes";

const EXPECTED_TARGETS: readonly RealCompareReadOnlyWiringTarget[] = [
  "graph_source_disclosure",
  "source_badge",
  "inspector_validation_section",
  "guarded_fallback_reason",
  "unavailable_fallback_explanation",
];

function createDisplayBundle(
  status: RealCompareGuardedAvailabilityBadgeStatus,
): RealCompareGuardedAvailabilityDisplayBundle {
  return {
    badge: {
      status,
      label: "Read-only wiring badge",
      description: "Read-only wiring badge description.",
      isReadOnly: true,
    },
    disclosure: {
      status,
      headline: "Read-only wiring disclosure",
      description: "Read-only wiring disclosure description.",
      reasons: ["Read-only wiring reason."],
      isReadOnly: true,
      isActionable: false,
      isExecutionAllowed: false,
    },
    inspector: {
      status,
      totalReasons: 1,
      readOnly: true,
    },
  };
}

function assertBundleInvariants(
  bundle: ReturnType<typeof projectRealCompareReadOnlyWiringBundle>,
  displayBundle: RealCompareGuardedAvailabilityDisplayBundle,
) {
  assert.equal(bundle.sourceMode, "real_compare_readonly");
  assert.equal(bundle.displayBundle, displayBundle);
  assert.equal(bundle.isReadOnly, true);
  assert.equal(bundle.isWiredToUi, false);
  assert.equal(bundle.isLiveData, false);
}

function assertMetadataInvariants(
  bundle: ReturnType<typeof projectRealCompareReadOnlyWiringBundle>,
) {
  for (const metadata of bundle.metadata) {
    assert.equal(metadata.sourceMode, "real_compare_readonly");
    assert.equal(metadata.isReadOnly, true);
    assert.equal(metadata.isActionable, false);
    assert.equal(metadata.isExecutionAllowed, false);
  }
}

function assertStatusMapping(
  badgeStatus: RealCompareGuardedAvailabilityBadgeStatus,
  expectedStatus: RealCompareReadOnlyWiringStatus,
) {
  const displayBundle = createDisplayBundle(badgeStatus);
  const bundle = projectRealCompareReadOnlyWiringBundle(displayBundle);

  assert.equal(bundle.metadata.length, EXPECTED_TARGETS.length);
  for (const metadata of bundle.metadata) {
    assert.equal(metadata.status, expectedStatus);
  }
  assertBundleInvariants(bundle, displayBundle);
  assertMetadataInvariants(bundle);
}

describe("projectRealCompareReadOnlyWiringBundle", () => {
  it("maps passed badge status to candidate wiring metadata", () => {
    assertStatusMapping("passed", "candidate");
  });

  it("maps warning badge status to guarded wiring metadata", () => {
    assertStatusMapping("warning", "guarded");
  });

  it("maps guarded badge status to guarded wiring metadata", () => {
    assertStatusMapping("guarded", "guarded");
  });

  it("maps blocked badge status to blocked wiring metadata", () => {
    assertStatusMapping("blocked", "blocked");
  });

  it("maps unavailable badge status to unavailable wiring metadata", () => {
    assertStatusMapping("unavailable", "unavailable");
  });

  it("generates all read-only wiring targets", () => {
    const displayBundle = createDisplayBundle("warning");
    const bundle = projectRealCompareReadOnlyWiringBundle(displayBundle);

    assert.deepEqual(
      bundle.metadata.map((metadata) => metadata.target),
      EXPECTED_TARGETS,
    );
  });

  it("preserves bundle-level read-only and not-wired invariants", () => {
    const displayBundle = createDisplayBundle("passed");
    const bundle = projectRealCompareReadOnlyWiringBundle(displayBundle);

    assertBundleInvariants(bundle, displayBundle);
  });

  it("preserves metadata-level read-only and non-executable invariants", () => {
    const displayBundle = createDisplayBundle("blocked");
    const bundle = projectRealCompareReadOnlyWiringBundle(displayBundle);

    assertMetadataInvariants(bundle);
  });
});
