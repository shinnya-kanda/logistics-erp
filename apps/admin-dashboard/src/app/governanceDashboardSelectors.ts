import type {
  GovernanceDashboardReadOnlyData,
  GovernanceDisplayState,
  GovernanceEvidenceSummaryItem,
  GovernanceRenderingState,
  GovernanceIncidentSummaryItem,
  GovernanceOperationQueueItem,
  GovernanceOverviewItem,
  GovernanceSemanticNoteItem,
  GovernanceStateNotice,
  GovernanceTimelineDisplayItem,
} from "./governanceDashboardTypes";

// Read-only selector layer for rendering-safe Governance Dashboard data.
// These selectors only map already-provided data into UI-facing arrays.
// They do not own retrieval, persistence, or write-side flows.

function keepReadOnlyItem<TItem>(item: TItem): TItem {
  return item;
}

export function getGovernanceOverviewItems(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceOverviewItem[] {
  return data.overviewCards.map(keepReadOnlyItem);
}

export function getGovernanceIncidentSummaries(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceIncidentSummaryItem[] {
  return data.incidentSummary.map(keepReadOnlyItem);
}

export function getGovernanceOperationQueueItems(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceOperationQueueItem[] {
  return data.operationQueueSummary.map(keepReadOnlyItem);
}

export function getGovernanceEvidenceSummaries(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceEvidenceSummaryItem[] {
  return data.evidenceSummary.map(keepReadOnlyItem);
}

export function getGovernanceSemanticNotes(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceSemanticNoteItem[] {
  return data.readOnlyNotes.map(keepReadOnlyItem);
}

export function getGovernanceTimelineItems(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceTimelineDisplayItem[] {
  return data.timelineItems.map(keepReadOnlyItem);
}

export function getGovernanceRenderingState(
  data: GovernanceDashboardReadOnlyData,
): GovernanceRenderingState {
  return data.renderingState;
}

export function getGovernanceDisplayState(
  data: GovernanceDashboardReadOnlyData,
): GovernanceDisplayState {
  const allItems = [
    ...data.overviewCards,
    ...data.incidentSummary,
    ...data.operationQueueSummary,
    ...data.evidenceSummary,
    ...data.readOnlyNotes,
    ...data.timelineItems,
  ];

  if (allItems.length === 0) return "empty";

  const hasHighRiskDegradation = allItems.some(
    (item) =>
      item.degradationType !== "none" &&
      (item.severity === "high" || item.severity === "critical"),
  );

  if (hasHighRiskDegradation) return "degraded";

  const hasVisibleLimitation = allItems.some((item) => item.degradationType !== "none");
  if (hasVisibleLimitation) return "partial";

  return "ready";
}

export function getGovernanceStateNotice(
  data: GovernanceDashboardReadOnlyData,
): GovernanceStateNotice {
  const displayState = getGovernanceDisplayState(data);
  const renderingState = getGovernanceRenderingState(data);

  if (displayState === "empty") {
    return {
      displayState,
      renderState: renderingState.renderState,
      freshnessState: renderingState.freshnessState,
      degradationState: renderingState.degradationState,
      visibilityMode: renderingState.visibilityMode,
      title: "Display state: empty",
      message: "表示できる governance signal はありません。これは read-only visibility state です。",
      severity: "info",
      lifecycleState: "detected",
      visibility: "summary",
      readability: "short_note",
    };
  }

  if (displayState === "degraded") {
    return {
      displayState,
      renderState: renderingState.renderState,
      freshnessState: renderingState.freshnessState,
      degradationState: renderingState.degradationState,
      visibilityMode: renderingState.visibilityMode,
      title: "Display state: degraded",
      message:
        `${renderingState.message} semantic safety / integrity / attention に review limitation があります。state は visibility のためだけに表示します。`,
      severity: "high",
      lifecycleState: "reviewing",
      visibility: "summary",
      readability: "short_note",
    };
  }

  if (displayState === "partial") {
    return {
      displayState,
      renderState: renderingState.renderState,
      freshnessState: renderingState.freshnessState,
      degradationState: renderingState.degradationState,
      visibilityMode: renderingState.visibilityMode,
      title: "Display state: partial",
      message:
        `${renderingState.message} 一部の governance signal に limitation があります。state は human review の補助として扱います。`,
      severity: "warning",
      lifecycleState: "classified",
      visibility: "summary",
      readability: "short_note",
    };
  }

  if (displayState === "stale") {
    return {
      displayState,
      renderState: renderingState.renderState,
      freshnessState: renderingState.freshnessState,
      degradationState: renderingState.degradationState,
      visibilityMode: renderingState.visibilityMode,
      title: "Display state: stale",
      message: "表示情報が古い可能性があります。state は freshness limitation の表示です。",
      severity: "warning",
      lifecycleState: "reviewing",
      visibility: "summary",
      readability: "short_note",
    };
  }

  if (displayState === "loading") {
    return {
      displayState,
      renderState: renderingState.renderState,
      freshnessState: renderingState.freshnessState,
      degradationState: renderingState.degradationState,
      visibilityMode: renderingState.visibilityMode,
      title: "Display state: loading",
      message: "表示準備中の read-only state です。処理の開始を意味しません。",
      severity: "info",
      lifecycleState: "detected",
      visibility: "summary",
      readability: "short_note",
    };
  }

  return {
    displayState,
    renderState: renderingState.renderState,
    freshnessState: renderingState.freshnessState,
    degradationState: renderingState.degradationState,
    visibilityMode: renderingState.visibilityMode,
    title: "Display state: ready",
    message: `${renderingState.message} READ ONLY / NO EXECUTION の境界を維持します。`,
    severity: "info",
    lifecycleState: "reaffirmed",
    visibility: "summary",
    readability: "short_note",
  };
}
