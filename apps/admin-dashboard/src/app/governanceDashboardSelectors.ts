import type {
  GovernanceDashboardReadOnlyData,
  GovernanceEvidenceSummaryItem,
  GovernanceIncidentSummaryItem,
  GovernanceOperationQueueItem,
  GovernanceOverviewItem,
  GovernanceSemanticNoteItem,
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
