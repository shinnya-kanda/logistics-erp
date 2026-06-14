import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { REAL_COMPARE_VALIDATION_FIXTURE_MAPPINGS } from "./inventoryIntegrityRealCompareValidationFixtureMapping";
import { runRealCompareValidationIntegrationSpike } from "./inventoryIntegrityRealCompareValidationIntegrationSpike";
import type {
  RealCompareFixtureName,
  RealCompareValidationFixtureMapping,
} from "./inventoryIntegrityRealCompareValidationTypes";

function getResultByFixtureName(fixtureName: RealCompareFixtureName) {
  const result = runRealCompareValidationIntegrationSpike().find(
    (candidate) => candidate.fixtureName === fixtureName,
  );

  assert.ok(result, `Expected integration result for ${fixtureName}`);
  return result;
}

function getMappingByFixtureName(
  fixtureName: RealCompareFixtureName,
): RealCompareValidationFixtureMapping {
  const mapping = REAL_COMPARE_VALIDATION_FIXTURE_MAPPINGS.find(
    (candidate) => candidate.fixtureName === fixtureName,
  );

  assert.ok(mapping, `Expected fixture mapping for ${fixtureName}`);
  return mapping;
}

describe("runRealCompareValidationIntegrationSpike", () => {
  it("processes all nine fixture mappings without fixture payload imports", () => {
    const results = runRealCompareValidationIntegrationSpike();

    assert.equal(REAL_COMPARE_VALIDATION_FIXTURE_MAPPINGS.length, 9);
    assert.equal(results.length, 9);
    assert.deepEqual(
      results.map((result) => result.fixtureName),
      REAL_COMPARE_VALIDATION_FIXTURE_MAPPINGS.map(
        (mapping) => mapping.fixtureName,
      ),
    );
  });

  it("returns summary, guarded availability, projection metadata, and fallback decision for every result", () => {
    const results = runRealCompareValidationIntegrationSpike();

    for (const result of results) {
      const mapping = getMappingByFixtureName(result.fixtureName);

      assert.equal(result.fixtureId, mapping.fixtureId);
      assert.equal(result.summary.sourceMode, "real_compare_readonly");
      assert.equal(result.summary.isEvaluated, true);
      assert.equal(
        result.summary.results.length,
        mapping.expectedOutcomes.length,
      );
      assert.equal(
        result.guardedAvailability.sourceMode,
        "real_compare_readonly",
      );
      assert.equal(result.guardedAvailability.isGuarded, true);
      assert.equal(result.guardedAvailability.isEnabled, false);
      assert.equal(result.guardedAvailability.isLiveData, false);
      assert.equal(result.guardedAvailability.validation, result.summary);
      assert.equal(result.disclosureMetadata.projection.isReadOnly, true);
      assert.equal(result.disclosureMetadata.projection.isActionable, false);
      assert.equal(
        result.disclosureMetadata.projection.isExecutionAllowed,
        false,
      );
      assert.equal(result.inspectorMetadata.readOnly, true);
      assert.ok(
        [
          "read_only_candidate",
          "guarded_fallback",
          "fallback_unavailable",
        ].includes(result.fallbackDecision),
      );
    }
  });

  it("classifies full metadata as a read-only candidate without enablement", () => {
    const result = getResultByFixtureName("fullMetadataCompareResponseFixture");

    assert.equal(result.summary.hasBlockingFailure, false);
    assert.equal(result.summary.isValidForReadOnlyGraph, true);
    assert.equal(result.guardedAvailability.isVisible, true);
    assert.equal(result.fallbackDecision, "read_only_candidate");
    assert.equal(result.guardedAvailability.isEnabled, false);
    assert.equal(result.guardedAvailability.isLiveData, false);
    // read_only_candidate is metadata only; it does not enable real_compare_readonly.
  });

  it("classifies unavailable response as fallback unavailable", () => {
    const result = getResultByFixtureName("unavailableCompareResponseFixture");

    assert.equal(result.disclosureMetadata.hasUnavailableCondition, true);
    assert.equal(result.summary.hasBlockingFailure, true);
    assert.equal(result.fallbackDecision, "fallback_unavailable");
  });

  it("classifies unsupported shape or enum drift as fallback unavailable", () => {
    const unsupportedShape = getResultByFixtureName(
      "unsupportedShapeCompareResponseFixture",
    );
    const enumDrift = getResultByFixtureName("enumDriftCompareResponseFixture");

    assert.equal(unsupportedShape.summary.hasBlockingFailure, true);
    assert.equal(unsupportedShape.fallbackDecision, "fallback_unavailable");
    assert.equal(enumDrift.summary.hasBlockingFailure, true);
    assert.equal(enumDrift.fallbackDecision, "fallback_unavailable");
  });

  it("classifies source divergence according to mapping-driven fallback rules", () => {
    const result = getResultByFixtureName("sourceDivergenceCompareResponseFixture");

    assert.equal(result.summary.hasBlockingFailure, true);
    assert.equal(result.summary.isValidForReadOnlyGraph, false);
    assert.equal(result.guardedAvailability.isVisible, false);
    assert.equal(result.fallbackDecision, "fallback_unavailable");
  });
});
