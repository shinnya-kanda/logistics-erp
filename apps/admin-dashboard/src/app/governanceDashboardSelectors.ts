import type {
  GovernanceBadgeTone,
  GovernanceDashboardReadOnlyData,
  GovernanceDisplayState,
  GovernanceEvidenceConfidence,
  GovernanceEvidenceConfidenceSummary,
  GovernanceEvidenceGroup,
  GovernanceEvidenceProjection,
  GovernanceEvidenceSummaryItem,
  GovernanceIncidentAttentionLevel,
  GovernanceIncidentAttentionSummary,
  GovernanceIncidentGroup,
  GovernanceIncidentProjection,
  GovernanceIncidentSeverity,
  GovernanceIncidentSeveritySummary,
  GovernanceRenderingState,
  GovernanceIncidentSummaryItem,
  GovernanceOperationQueueItem,
  GovernanceOverviewItem,
  GovernanceOperationGroup,
  GovernanceOperationPriority,
  GovernanceOperationPrioritySummary,
  GovernanceOperationProjection,
  GovernanceOperationState,
  GovernanceOperationStateSummary,
  GovernanceSemanticBadge,
  GovernanceSemanticNoteItem,
  GovernanceStateNotice,
  GovernanceTimelineDisplayItem,
  GovernanceTimelineGroup,
  GovernanceTimelineProjection,
} from "./governanceDashboardTypes";

// Read-only selector layer for rendering-safe Governance Dashboard data.
// These selectors only map already-provided data into UI-facing arrays.
// They do not own retrieval, persistence, or write-side flows.

function keepReadOnlyItem<TItem>(item: TItem): TItem {
  return item;
}

function severityTone(severity: GovernanceStateNotice["severity"]): GovernanceBadgeTone {
  if (severity === "critical") return "critical";
  if (severity === "high") return "high";
  if (severity === "warning") return "warning";
  return "info";
}

export function getGovernanceStateNoticeBadges(
  notice: Pick<
    GovernanceStateNotice,
    | "severity"
    | "lifecycleState"
    | "freshnessState"
    | "degradationState"
    | "visibilityMode"
  >,
): readonly GovernanceSemanticBadge[] {
  return [
    {
      id: `state-severity-${notice.severity}`,
      category: "severity",
      label: `Severity: ${notice.severity}`,
      tone: severityTone(notice.severity),
      visibility: "state_notice",
      semanticMeaning: "表示上の review attention level であり、処理優先度ではありません。",
    },
    {
      id: `state-lifecycle-${notice.lifecycleState}`,
      category: "lifecycle",
      label: `Lifecycle: ${notice.lifecycleState}`,
      tone: "neutral",
      visibility: "state_notice",
      semanticMeaning: "read-only review lifecycle の表示であり、operation lifecycle 遷移ではありません。",
    },
    {
      id: `state-freshness-${notice.freshnessState}`,
      category: "freshness",
      label: `Freshness: ${notice.freshnessState}`,
      tone: notice.freshnessState === "stale" ? "warning" : "info",
      visibility: "state_notice",
      semanticMeaning: "表示情報の freshness signal であり、同期や再取得を開始しません。",
    },
    {
      id: `state-degradation-${notice.degradationState}`,
      category: "degradation",
      label: `Degradation: ${notice.degradationState}`,
      tone: notice.degradationState === "degraded" ? "high" : "warning",
      visibility: "state_notice",
      semanticMeaning: "dashboard interpretation limitation の表示であり、remediation 実行ではありません。",
    },
    {
      id: `state-visibility-${notice.visibilityMode}`,
      category: "visibility",
      label: `Visibility: ${notice.visibilityMode}`,
      tone: "neutral",
      visibility: "state_notice",
      semanticMeaning: "表示範囲の semantic mode であり、権限変更や mutation ではありません。",
    },
  ];
}

function withStateNoticeBadges(
  notice: Omit<GovernanceStateNotice, "semanticBadges">,
): GovernanceStateNotice {
  return {
    ...notice,
    semanticBadges: getGovernanceStateNoticeBadges(notice),
  };
}

export function getGovernanceOverviewItems(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceOverviewItem[] {
  return data.overviewCards.map(keepReadOnlyItem);
}

export function getGovernanceIncidentSummaries(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceIncidentSummaryItem[] {
  return getGovernanceIncidentProjections(data);
}

export function getGovernanceIncidentProjections(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceIncidentProjection[] {
  return data.incidentSummary.map(keepReadOnlyItem);
}

export function getGovernanceIncidentGroups(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceIncidentGroup[] {
  const groups = new Map<string, GovernanceIncidentProjection[]>();

  for (const item of getGovernanceIncidentProjections(data)) {
    const existingGroup = groups.get(item.groupKey) ?? [];
    groups.set(item.groupKey, [...existingGroup, item]);
  }

  return [...groups.entries()].map(([groupKey, items]) => ({
    groupKey,
    groupLabel: items[0]?.groupLabel ?? groupKey,
    items,
  }));
}

export function getGovernanceIncidentSeveritySummary(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceIncidentSeveritySummary[] {
  const severityOrder: readonly GovernanceIncidentSeverity[] = [
    "critical",
    "high",
    "watch",
    "info",
  ];

  return severityOrder
    .map((severity) => ({
      severity,
      count: getGovernanceIncidentProjections(data).filter(
        (item) => item.incidentSeverity === severity,
      ).length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getGovernanceIncidentAttentionSummary(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceIncidentAttentionSummary[] {
  const attentionOrder: readonly GovernanceIncidentAttentionLevel[] = [
    "urgent",
    "high",
    "medium",
    "low",
  ];

  return attentionOrder
    .map((attentionLevel) => ({
      attentionLevel,
      count: getGovernanceIncidentProjections(data).filter(
        (item) => item.attentionLevel === attentionLevel,
      ).length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getGovernanceOperationQueueItems(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceOperationQueueItem[] {
  return getGovernanceOperationProjections(data);
}

export function getGovernanceOperationProjections(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceOperationProjection[] {
  return data.operationQueueSummary.map(keepReadOnlyItem);
}

export function getGovernanceOperationGroups(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceOperationGroup[] {
  const groups = new Map<string, GovernanceOperationProjection[]>();

  for (const item of getGovernanceOperationProjections(data)) {
    const existingGroup = groups.get(item.groupKey) ?? [];
    groups.set(item.groupKey, [...existingGroup, item]);
  }

  return [...groups.entries()].map(([groupKey, items]) => ({
    groupKey,
    groupLabel: items[0]?.groupLabel ?? groupKey,
    items,
  }));
}

export function getGovernanceOperationPrioritySummary(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceOperationPrioritySummary[] {
  const priorityOrder: readonly GovernanceOperationPriority[] = [
    "critical",
    "high",
    "normal",
    "low",
  ];

  return priorityOrder
    .map((priority) => ({
      priority,
      count: getGovernanceOperationProjections(data).filter(
        (item) => item.operationPriority === priority,
      ).length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getGovernanceOperationStateSummary(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceOperationStateSummary[] {
  const stateOrder: readonly GovernanceOperationState[] = [
    "coordination_needed",
    "review_reference",
    "classified",
    "visible",
  ];

  return stateOrder
    .map((state) => ({
      state,
      count: getGovernanceOperationProjections(data).filter(
        (item) => item.operationState === state,
      ).length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getGovernanceEvidenceSummaries(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceEvidenceSummaryItem[] {
  return getGovernanceEvidenceProjections(data);
}

export function getGovernanceEvidenceProjections(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceEvidenceProjection[] {
  return data.evidenceSummary.map(keepReadOnlyItem);
}

export function getGovernanceEvidenceAttentionItems(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceEvidenceProjection[] {
  return getGovernanceEvidenceProjections(data).filter((item) => item.attention);
}

export function getGovernanceEvidenceGroups(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceEvidenceGroup[] {
  const groups = new Map<string, GovernanceEvidenceProjection[]>();

  for (const item of getGovernanceEvidenceProjections(data)) {
    const existingGroup = groups.get(item.groupKey) ?? [];
    groups.set(item.groupKey, [...existingGroup, item]);
  }

  return [...groups.entries()].map(([groupKey, items]) => ({
    groupKey,
    groupLabel: items[0]?.groupLabel ?? groupKey,
    items,
  }));
}

export function getGovernanceEvidenceConfidenceSummary(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceEvidenceConfidenceSummary[] {
  const confidenceOrder: readonly GovernanceEvidenceConfidence[] = [
    "high",
    "medium",
    "low",
    "unknown",
  ];

  return confidenceOrder
    .map((confidence) => ({
      confidence,
      count: getGovernanceEvidenceProjections(data).filter((item) => item.confidence === confidence)
        .length,
    }))
    .filter((summary) => summary.count > 0);
}

export function getGovernanceSemanticNotes(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceSemanticNoteItem[] {
  return data.readOnlyNotes.map(keepReadOnlyItem);
}

export function getGovernanceTimelineItems(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceTimelineDisplayItem[] {
  return getGovernanceTimelineProjections(data);
}

export function getGovernanceTimelineProjections(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceTimelineProjection[] {
  return data.timelineItems.map(keepReadOnlyItem);
}

export function getGovernanceTimelineHighlights(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceTimelineProjection[] {
  return getGovernanceTimelineProjections(data).filter((item) => item.highlight);
}

export function getGovernanceTimelineAttentionItems(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceTimelineProjection[] {
  return getGovernanceTimelineProjections(data).filter((item) => item.attention);
}

export function getGovernanceTimelineGroups(
  data: GovernanceDashboardReadOnlyData,
): readonly GovernanceTimelineGroup[] {
  const groups = new Map<string, GovernanceTimelineProjection[]>();

  for (const item of getGovernanceTimelineProjections(data)) {
    const existingGroup = groups.get(item.groupKey) ?? [];
    groups.set(item.groupKey, [...existingGroup, item]);
  }

  return [...groups.entries()].map(([groupKey, items]) => ({
    groupKey,
    groupLabel: items[0]?.groupLabel ?? groupKey,
    items,
  }));
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
    return withStateNoticeBadges({
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
    });
  }

  if (displayState === "degraded") {
    return withStateNoticeBadges({
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
    });
  }

  if (displayState === "partial") {
    return withStateNoticeBadges({
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
    });
  }

  if (displayState === "stale") {
    return withStateNoticeBadges({
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
    });
  }

  if (displayState === "loading") {
    return withStateNoticeBadges({
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
    });
  }

  return withStateNoticeBadges({
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
  });
}
