import { REAL_COMPARE_VALIDATION_FIXTURE_MAPPINGS } from "./inventoryIntegrityRealCompareValidationFixtureMapping";
import {
  evaluateRealCompareValidationFixtureMapping,
  projectRealCompareGuardedAvailabilityFromValidation,
} from "./inventoryIntegrityRealCompareValidationFixtureEvaluator";
import {
  projectRealCompareValidationDisclosureMetadata,
  projectRealCompareValidationInspectorMetadata,
} from "./inventoryIntegrityRealCompareValidationProjection";
import type {
  RealCompareFixtureId,
  RealCompareFixtureName,
  RealCompareGuardedAvailability,
  RealCompareValidationSummary,
} from "./inventoryIntegrityRealCompareValidationTypes";
import type {
  RealCompareValidationDisclosureMetadata,
  RealCompareValidationInspectorMetadata,
} from "./inventoryIntegrityRealCompareValidationProjectionTypes";

// B78-01 local fixture mapping integration spike only.
// No fixture payload import, fetch, route import, adapter import, graph adapter import,
// UI import, source option import, feature flag change, DB access, mutation, or execution action.

export type RealCompareValidationIntegrationSpikeFallbackDecision =
  | "read_only_candidate"
  | "guarded_fallback"
  | "fallback_unavailable";

export type RealCompareValidationIntegrationSpikeResult = {
  readonly fixtureId: RealCompareFixtureId;
  readonly fixtureName: RealCompareFixtureName;
  readonly summary: RealCompareValidationSummary;
  readonly guardedAvailability: RealCompareGuardedAvailability;
  readonly disclosureMetadata: RealCompareValidationDisclosureMetadata;
  readonly inspectorMetadata: RealCompareValidationInspectorMetadata;
  readonly fallbackDecision: RealCompareValidationIntegrationSpikeFallbackDecision;
};

function decideFallback(
  summary: RealCompareValidationSummary,
  guardedAvailability: RealCompareGuardedAvailability,
  disclosureMetadata: RealCompareValidationDisclosureMetadata,
): RealCompareValidationIntegrationSpikeFallbackDecision {
  if (disclosureMetadata.hasUnavailableCondition) {
    return "fallback_unavailable";
  }

  if (summary.hasBlockingFailure) {
    return "fallback_unavailable";
  }

  if (summary.isValidForReadOnlyGraph && guardedAvailability.isVisible) {
    return "read_only_candidate";
  }

  return "guarded_fallback";
}

export function runRealCompareValidationIntegrationSpike(): readonly RealCompareValidationIntegrationSpikeResult[] {
  return REAL_COMPARE_VALIDATION_FIXTURE_MAPPINGS.map((mapping) => {
    const summary = evaluateRealCompareValidationFixtureMapping(mapping);
    const guardedAvailability =
      projectRealCompareGuardedAvailabilityFromValidation(summary);
    const disclosureMetadata =
      projectRealCompareValidationDisclosureMetadata(summary);
    const inspectorMetadata =
      projectRealCompareValidationInspectorMetadata(summary);

    return {
      fixtureId: mapping.fixtureId,
      fixtureName: mapping.fixtureName,
      summary,
      guardedAvailability,
      disclosureMetadata,
      inspectorMetadata,
      fallbackDecision: decideFallback(
        summary,
        guardedAvailability,
        disclosureMetadata,
      ),
    };
  });
}
