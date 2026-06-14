import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { projectRealCompareReadOnlyUiMetadataBundle } from "./inventoryIntegrityRealCompareReadOnlyUiMetadataProjection";
import type { RealCompareGuardedAvailabilityDisplayBundle } from "./inventoryIntegrityRealCompareGuardedAvailabilityDisclosureTypes";
import type {
  RealCompareReadOnlyWiringBundle,
  RealCompareReadOnlyWiringMetadata,
} from "./inventoryIntegrityRealCompareReadOnlyWiringTypes";

function createDisplayBundle(): RealCompareGuardedAvailabilityDisplayBundle {
  return {
    badge: {
      status: "warning",
      label: "Read-only UI metadata badge",
      description: "Read-only UI metadata badge description.",
      isReadOnly: true,
    },
    disclosure: {
      status: "warning",
      headline: "Read-only UI metadata disclosure",
      description: "Read-only UI metadata disclosure description.",
      reasons: [
        "Read-only UI metadata reason.",
        "Guarded source remains disabled and non-live.",
      ],
      isReadOnly: true,
      isActionable: false,
      isExecutionAllowed: false,
    },
    inspector: {
      status: "warning",
      totalReasons: 2,
      readOnly: true,
    },
  };
}

function createWiringBundle(): RealCompareReadOnlyWiringBundle {
  const displayBundle = createDisplayBundle();
  const metadata: readonly RealCompareReadOnlyWiringMetadata[] = [
    {
      sourceMode: "real_compare_readonly",
      target: "graph_source_disclosure",
      status: "guarded",
      headline: "Read-only UI metadata target",
      description: "Read-only UI metadata target description.",
      isReadOnly: true,
      isActionable: false,
      isExecutionAllowed: false,
    },
  ];

  return {
    sourceMode: "real_compare_readonly",
    displayBundle,
    metadata,
    isReadOnly: true,
    isWiredToUi: false,
    isLiveData: false,
  };
}

function assertReadOnlyInvariants(
  bundle: ReturnType<typeof projectRealCompareReadOnlyUiMetadataBundle>,
) {
  assert.equal(bundle.disclosure.isReadOnly, true);
  assert.equal(bundle.disclosure.isActionable, false);
  assert.equal(bundle.disclosure.isExecutionAllowed, false);
  assert.equal(bundle.badge.isReadOnly, true);
  assert.equal(bundle.inspector.readOnly, true);
  assert.equal(bundle.isReadOnly, true);
  assert.equal(bundle.isLiveData, false);
}

describe("projectRealCompareReadOnlyUiMetadataBundle", () => {
  it("projects disclosure metadata from the wiring display bundle", () => {
    const wiringBundle = createWiringBundle();
    const bundle = projectRealCompareReadOnlyUiMetadataBundle(wiringBundle);

    assert.equal(
      bundle.disclosure.status,
      wiringBundle.displayBundle.disclosure.status,
    );
    assert.equal(
      bundle.disclosure.headline,
      wiringBundle.displayBundle.disclosure.headline,
    );
    assert.equal(
      bundle.disclosure.description,
      wiringBundle.displayBundle.disclosure.description,
    );
    assert.equal(
      bundle.disclosure.reasons,
      wiringBundle.displayBundle.disclosure.reasons,
    );
    assert.equal(bundle.disclosure.isReadOnly, true);
    assert.equal(bundle.disclosure.isActionable, false);
    assert.equal(bundle.disclosure.isExecutionAllowed, false);
  });

  it("projects badge metadata from the wiring display bundle", () => {
    const wiringBundle = createWiringBundle();
    const bundle = projectRealCompareReadOnlyUiMetadataBundle(wiringBundle);

    assert.equal(bundle.badge.status, wiringBundle.displayBundle.badge.status);
    assert.equal(bundle.badge.label, wiringBundle.displayBundle.badge.label);
    assert.equal(
      bundle.badge.description,
      wiringBundle.displayBundle.badge.description,
    );
    assert.equal(bundle.badge.isReadOnly, true);
  });

  it("projects inspector metadata from the wiring display bundle", () => {
    const wiringBundle = createWiringBundle();
    const bundle = projectRealCompareReadOnlyUiMetadataBundle(wiringBundle);

    assert.equal(
      bundle.inspector.status,
      wiringBundle.displayBundle.inspector.status,
    );
    assert.equal(
      bundle.inspector.headline,
      wiringBundle.displayBundle.disclosure.headline,
    );
    assert.equal(
      bundle.inspector.description,
      wiringBundle.displayBundle.disclosure.description,
    );
    assert.equal(
      bundle.inspector.reasons,
      wiringBundle.displayBundle.disclosure.reasons,
    );
    assert.equal(
      bundle.inspector.totalReasons,
      wiringBundle.displayBundle.inspector.totalReasons,
    );
    assert.equal(bundle.inspector.readOnly, true);
  });

  it("preserves bundle-level read-only and non-live invariants", () => {
    const wiringBundle = createWiringBundle();
    const bundle = projectRealCompareReadOnlyUiMetadataBundle(wiringBundle);

    assert.equal(bundle.isReadOnly, true);
    assert.equal(bundle.isLiveData, false);
  });

  it("preserves metadata-level read-only and non-executable invariants", () => {
    const wiringBundle = createWiringBundle();
    const bundle = projectRealCompareReadOnlyUiMetadataBundle(wiringBundle);

    assertReadOnlyInvariants(bundle);
  });
});
