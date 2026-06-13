import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { projectRealCompareGuardedAvailabilityDisplayBundle } from "./inventoryIntegrityRealCompareGuardedAvailabilityDisclosureProjection";
import type { RealCompareGuardedAvailabilityBadgeStatus } from "./inventoryIntegrityRealCompareGuardedAvailabilityDisclosureTypes";
import type {
  RealCompareValidationDisclosureMetadata,
  RealCompareValidationDisclosureStatus,
  RealCompareValidationInspectorMetadata,
  RealCompareValidationProjectionReason,
} from "./inventoryIntegrityRealCompareValidationProjectionTypes";

function createProjectionReason(
  message: string,
): RealCompareValidationProjectionReason {
  return {
    gateId: "route_contract",
    message,
    severity: "info",
  };
}

function createDisclosureMetadata(
  disclosureStatus: RealCompareValidationDisclosureStatus,
  reasons: readonly RealCompareValidationProjectionReason[] = [
    createProjectionReason("Read-only validation disclosure reason."),
  ],
): RealCompareValidationDisclosureMetadata {
  return {
    projection: {
      sourceMode: "real_compare_readonly",
      disclosureStatus,
      headline: "Read-only disclosure headline",
      description: "Read-only disclosure description.",
      reasons,
      isReadOnly: true,
      isActionable: false,
      isExecutionAllowed: false,
    },
    hasBlockingFailure: disclosureStatus === "blocked",
    hasWarnings: disclosureStatus === "warning",
    hasUnavailableCondition: disclosureStatus === "unavailable",
  };
}

function createInspectorMetadata(
  summaryStatus: RealCompareValidationDisclosureStatus,
): RealCompareValidationInspectorMetadata {
  return {
    summaryStatus,
    totalResults: 1,
    blockingCount: summaryStatus === "blocked" ? 1 : 0,
    warningCount: summaryStatus === "warning" ? 1 : 0,
    readOnly: true,
  };
}

function assertReadOnlyInvariants(
  bundle: ReturnType<typeof projectRealCompareGuardedAvailabilityDisplayBundle>,
) {
  assert.equal(bundle.badge.isReadOnly, true);
  assert.equal(bundle.disclosure.isReadOnly, true);
  assert.equal(bundle.disclosure.isActionable, false);
  assert.equal(bundle.disclosure.isExecutionAllowed, false);
  assert.equal(bundle.inspector.readOnly, true);
}

function assertStatusMapping(
  disclosureStatus: RealCompareValidationDisclosureStatus,
  expectedStatus: RealCompareGuardedAvailabilityBadgeStatus,
) {
  const bundle = projectRealCompareGuardedAvailabilityDisplayBundle(
    createDisclosureMetadata(disclosureStatus),
    createInspectorMetadata(disclosureStatus),
  );

  assert.equal(bundle.badge.status, expectedStatus);
  assert.equal(bundle.disclosure.status, expectedStatus);
  assert.equal(bundle.inspector.status, expectedStatus);
  assertReadOnlyInvariants(bundle);
}

describe("projectRealCompareGuardedAvailabilityDisplayBundle", () => {
  it("maps passed validation disclosure metadata to passed display metadata", () => {
    assertStatusMapping("passed", "passed");
  });

  it("maps warning validation disclosure metadata to warning display metadata", () => {
    assertStatusMapping("warning", "warning");
  });

  it("maps blocked validation disclosure metadata to blocked display metadata", () => {
    assertStatusMapping("blocked", "blocked");
  });

  it("maps unavailable validation disclosure metadata to unavailable display metadata", () => {
    assertStatusMapping("unavailable", "unavailable");
  });

  it("maps not evaluated validation disclosure metadata to guarded display metadata", () => {
    assertStatusMapping("not_evaluated", "guarded");
  });

  it("projects projection reason messages into disclosure reasons", () => {
    const reasons = [
      createProjectionReason("First read-only reason."),
      createProjectionReason("Second guarded reason."),
    ];
    const bundle = projectRealCompareGuardedAvailabilityDisplayBundle(
      createDisclosureMetadata("warning", reasons),
      createInspectorMetadata("warning"),
    );

    assert.equal(bundle.disclosure.reasons.length, reasons.length);
    assert.deepEqual(bundle.disclosure.reasons, [
      "First read-only reason.",
      "Second guarded reason.",
    ]);
  });

  it("sets inspector total reasons from disclosure reasons length", () => {
    const reasons = [
      createProjectionReason("First read-only reason."),
      createProjectionReason("Second guarded reason."),
      createProjectionReason("Third unavailable reason."),
    ];
    const bundle = projectRealCompareGuardedAvailabilityDisplayBundle(
      createDisclosureMetadata("blocked", reasons),
      createInspectorMetadata("blocked"),
    );

    assert.equal(bundle.inspector.totalReasons, bundle.disclosure.reasons.length);
    assert.equal(bundle.inspector.totalReasons, reasons.length);
  });
});
