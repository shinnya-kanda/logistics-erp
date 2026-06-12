import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  projectRealCompareValidationDisclosureMetadata,
  projectRealCompareValidationInspectorMetadata,
} from "./inventoryIntegrityRealCompareValidationProjection";
import type {
  RealCompareValidationGateId,
  RealCompareValidationResult,
  RealCompareValidationSeverity,
  RealCompareValidationStatus,
  RealCompareValidationSummary,
} from "./inventoryIntegrityRealCompareValidationTypes";

function createValidationResult(
  overrides: Partial<RealCompareValidationResult> = {},
): RealCompareValidationResult {
  return {
    gateId: "route_contract",
    status: "passed",
    severity: "info",
    source: "fixture",
    message: "Validation gate passed for read-only projection.",
    isBlocking: false,
    ...overrides,
  };
}

function createValidationSummary(
  results: readonly RealCompareValidationResult[],
  overrides: Partial<Omit<RealCompareValidationSummary, "results">> = {},
): RealCompareValidationSummary {
  return {
    sourceMode: "real_compare_readonly",
    isEvaluated: true,
    isValidForReadOnlyGraph: true,
    hasBlockingFailure: false,
    results,
    ...overrides,
  };
}

function createSingleResultSummary(
  gateId: RealCompareValidationGateId,
  status: RealCompareValidationStatus,
  severity: RealCompareValidationSeverity,
  message: string,
  isBlocking = false,
): RealCompareValidationSummary {
  return createValidationSummary(
    [
      createValidationResult({
        gateId,
        status,
        severity,
        message,
        isBlocking,
      }),
    ],
    {
      isValidForReadOnlyGraph:
        status === "passed" || (status === "warning" && !isBlocking),
      hasBlockingFailure: isBlocking,
    },
  );
}

describe("projectRealCompareValidationDisclosureMetadata", () => {
  it("projects a passed validation summary as read-only passed metadata", () => {
    const summary = createSingleResultSummary(
      "route_contract",
      "passed",
      "info",
      "Route contract is valid for read-only projection.",
    );
    const disclosure = projectRealCompareValidationDisclosureMetadata(summary);
    const inspector = projectRealCompareValidationInspectorMetadata(summary);

    assert.equal(disclosure.projection.disclosureStatus, "passed");
    assert.equal(disclosure.projection.isReadOnly, true);
    assert.equal(disclosure.projection.isActionable, false);
    assert.equal(disclosure.projection.isExecutionAllowed, false);
    assert.equal(disclosure.hasBlockingFailure, false);
    assert.equal(disclosure.hasWarnings, false);
    assert.equal(disclosure.hasUnavailableCondition, false);
    assert.equal(inspector.summaryStatus, "passed");
    assert.equal(inspector.readOnly, true);
  });

  it("projects warning status as warning metadata without execution authority", () => {
    const summary = createSingleResultSummary(
      "metadata_completeness",
      "warning",
      "warning",
      "Metadata is partial and must remain visible as a read-only caveat.",
    );
    const disclosure = projectRealCompareValidationDisclosureMetadata(summary);
    const inspector = projectRealCompareValidationInspectorMetadata(summary);

    assert.equal(disclosure.projection.disclosureStatus, "warning");
    assert.equal(disclosure.hasWarnings, true);
    assert.ok(inspector.warningCount > 0);
    assert.equal(disclosure.projection.isExecutionAllowed, false);
  });

  it("projects blocking validation as blocked metadata without execution authority", () => {
    const summary = createSingleResultSummary(
      "unsupported_shape",
      "blocked",
      "blocked",
      "Unsupported shape blocks read-only projection readiness.",
      true,
    );
    const disclosure = projectRealCompareValidationDisclosureMetadata(summary);
    const inspector = projectRealCompareValidationInspectorMetadata(summary);

    assert.equal(disclosure.projection.disclosureStatus, "blocked");
    assert.equal(disclosure.hasBlockingFailure, true);
    assert.ok(inspector.blockingCount > 0);
    assert.equal(disclosure.projection.isExecutionAllowed, false);
  });

  it("projects unavailable response failures as unavailable metadata", () => {
    const summary = createSingleResultSummary(
      "unavailable_response",
      "blocked",
      "blocked",
      "Compare response is unavailable for read-only projection.",
      true,
    );
    const disclosure = projectRealCompareValidationDisclosureMetadata(summary);
    const inspector = projectRealCompareValidationInspectorMetadata(summary);

    assert.equal(disclosure.projection.disclosureStatus, "unavailable");
    assert.equal(disclosure.hasUnavailableCondition, true);
    assert.equal(inspector.summaryStatus, "unavailable");
  });

  it("projects not evaluated summaries as read-only not evaluated metadata", () => {
    const summary = createSingleResultSummary(
      "ui_guarded_fallback",
      "not_evaluated",
      "info",
      "Validation has not been evaluated for read-only projection.",
    );
    const disclosure = projectRealCompareValidationDisclosureMetadata(summary);

    assert.equal(disclosure.projection.disclosureStatus, "not_evaluated");
    assert.equal(disclosure.projection.isReadOnly, true);
    assert.equal(disclosure.projection.isActionable, false);
    assert.equal(disclosure.projection.isExecutionAllowed, false);
  });

  it("projects validation results into gate reasons", () => {
    const summary = createValidationSummary([
      createValidationResult({
        gateId: "graph_adapter_normalization",
        status: "warning",
        severity: "warning",
        message: "Graph adapter normalization is warning-only metadata.",
      }),
    ]);
    const disclosure = projectRealCompareValidationDisclosureMetadata(summary);
    const reason = disclosure.projection.reasons[0];

    assert.equal(reason.gateId, "graph_adapter_normalization");
    assert.equal(
      reason.message,
      "Graph adapter normalization is warning-only metadata.",
    );
    assert.equal(reason.severity, "warning");
  });

  it("counts inspector warning metadata from warning severity", () => {
    const summary = createValidationSummary([
      createValidationResult({
        gateId: "source_divergence",
        status: "passed",
        severity: "warning",
        message: "Source divergence is disclosed as warning severity.",
      }),
    ]);
    const inspector = projectRealCompareValidationInspectorMetadata(summary);

    assert.equal(inspector.summaryStatus, "passed");
    assert.equal(inspector.totalResults, 1);
    assert.equal(inspector.warningCount, 1);
    assert.equal(inspector.readOnly, true);
  });
});
