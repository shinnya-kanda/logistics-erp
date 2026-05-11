// Read-only data contract for the static Governance Dashboard.
// This file intentionally defines display-only records and contains no
// mutation, execution, approval, retry, correction, rebuild, replay, or sync
// action contract.

export type GovernanceOverviewTone = "info" | "warning" | "critical" | "safe";

export type GovernanceOverviewCard = {
  readonly label: string;
  readonly value: string;
  readonly description: string;
  readonly tone: GovernanceOverviewTone;
};

export type GovernanceSummaryRow = {
  readonly label: string;
  readonly value: string;
  readonly note: string;
};

export type GovernanceIncidentSummaryRow = GovernanceSummaryRow;

export type GovernanceOperationQueueSummaryRow = GovernanceSummaryRow;

export type GovernanceEvidenceSummaryRow = GovernanceSummaryRow;

export type GovernanceReadOnlyNoteBase = {
  readonly title: string;
  readonly category: string;
  readonly note: string;
};

export type GovernanceSemanticNote = GovernanceReadOnlyNoteBase & {
  readonly noteType: "semantic";
};

export type GovernanceIntegrityNote = GovernanceReadOnlyNoteBase & {
  readonly noteType: "integrity";
};

export type GovernanceAttentionNote = GovernanceReadOnlyNoteBase & {
  readonly noteType: "attention";
};

export type GovernanceSafeInterpretationNote = GovernanceReadOnlyNoteBase & {
  readonly noteType: "safe-interpretation";
};

export type GovernanceReadOnlyNote =
  | GovernanceSemanticNote
  | GovernanceIntegrityNote
  | GovernanceAttentionNote
  | GovernanceSafeInterpretationNote;
