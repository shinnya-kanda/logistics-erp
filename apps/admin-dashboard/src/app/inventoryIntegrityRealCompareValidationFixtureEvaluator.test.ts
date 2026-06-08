import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateRealCompareValidationFixtureMapping,
  projectRealCompareGuardedAvailabilityFromValidation,
} from "./inventoryIntegrityRealCompareValidationFixtureEvaluator";
import { REAL_COMPARE_VALIDATION_FIXTURE_MAPPINGS } from "./inventoryIntegrityRealCompareValidationFixtureMapping";
import type { RealCompareFixtureName } from "./inventoryIntegrityRealCompareValidationTypes";

function getMappingByFixtureName(fixtureName: RealCompareFixtureName) {
  const mapping = REAL_COMPARE_VALIDATION_FIXTURE_MAPPINGS.find(
    (candidate) => candidate.fixtureName === fixtureName,
  );

  assert.ok(mapping, `Expected fixture mapping for ${fixtureName}`);
  return mapping;
}

describe("evaluateRealCompareValidationFixtureMapping", () => {
  it("evaluates all real compare validation fixture mappings", () => {
    assert.equal(REAL_COMPARE_VALIDATION_FIXTURE_MAPPINGS.length, 9);

    for (const mapping of REAL_COMPARE_VALIDATION_FIXTURE_MAPPINGS) {
      const summary = evaluateRealCompareValidationFixtureMapping(mapping);

      assert.equal(summary.sourceMode, "real_compare_readonly");
      assert.equal(summary.isEvaluated, true);
      assert.equal(summary.results.length, mapping.expectedOutcomes.length);

      mapping.expectedOutcomes.forEach((outcome, index) => {
        const result = summary.results[index];

        assert.equal(result.gateId, outcome.gateId);
        assert.equal(result.status, outcome.expectedStatus);
        assert.equal(result.severity, outcome.expectedSeverity);
        assert.equal(result.source, "fixture");
        assert.equal(result.message, outcome.reason);
        assert.equal(result.isBlocking, outcome.expectedBlocking);
      });
    }
  });

  it("projects the full metadata mapping as valid guarded availability metadata", () => {
    const mapping = getMappingByFixtureName("fullMetadataCompareResponseFixture");
    const summary = evaluateRealCompareValidationFixtureMapping(mapping);
    const availability =
      projectRealCompareGuardedAvailabilityFromValidation(summary);

    assert.equal(summary.hasBlockingFailure, false);
    assert.equal(summary.isValidForReadOnlyGraph, true);
    assert.equal(availability.sourceMode, "real_compare_readonly");
    assert.equal(availability.isGuarded, true);
    assert.equal(availability.isEnabled, false);
    assert.equal(availability.isLiveData, false);
    assert.equal(availability.isVisible, true);
    assert.equal(availability.validation, summary);
  });

  it("projects an unsupported shape mapping as blocked guarded availability metadata", () => {
    const mapping = getMappingByFixtureName(
      "unsupportedShapeCompareResponseFixture",
    );
    const summary = evaluateRealCompareValidationFixtureMapping(mapping);
    const availability =
      projectRealCompareGuardedAvailabilityFromValidation(summary);

    assert.equal(summary.hasBlockingFailure, true);
    assert.equal(summary.isValidForReadOnlyGraph, false);
    assert.equal(availability.isVisible, false);
  });

  it("follows mapping expectations for source divergence guarded fallback", () => {
    const mapping = getMappingByFixtureName(
      "sourceDivergenceCompareResponseFixture",
    );
    const summary = evaluateRealCompareValidationFixtureMapping(mapping);
    const expectedBlockingFailure = mapping.expectedOutcomes.some(
      (outcome) => outcome.expectedBlocking,
    );

    assert.equal(summary.hasBlockingFailure, expectedBlockingFailure);
    assert.equal(
      summary.hasBlockingFailure,
      mapping.expectedBlockingFailure,
    );
    assert.equal(
      summary.isValidForReadOnlyGraph,
      mapping.expectedReadOnlyGraphAvailability &&
        !expectedBlockingFailure &&
        !mapping.expectedOutcomes.some(
          (outcome) =>
            outcome.expectedStatus === "failed" ||
            outcome.expectedStatus === "blocked",
        ),
    );
  });

  it("marks mappings with failed or blocked statuses invalid for read-only graph", () => {
    const failedOrBlockedMappings =
      REAL_COMPARE_VALIDATION_FIXTURE_MAPPINGS.filter((mapping) =>
        mapping.expectedOutcomes.some(
          (outcome) =>
            outcome.expectedStatus === "failed" ||
            outcome.expectedStatus === "blocked",
        ),
      );

    assert.ok(failedOrBlockedMappings.length > 0);

    for (const mapping of failedOrBlockedMappings) {
      const summary = evaluateRealCompareValidationFixtureMapping(mapping);

      assert.equal(summary.isValidForReadOnlyGraph, false);
    }
  });
});
