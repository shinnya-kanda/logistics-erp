"use client";

import type { CSSProperties } from "react";
import {
  GovernanceReadOnlyBoundaryBadges,
  GovernanceReadOnlyNotice,
  GovernanceSectionCard,
  GovernanceSemanticNoteCard,
  GovernanceSummarySection,
  governanceComponentStyles,
} from "./governanceDashboardComponents";
import type {
  GovernanceEvidenceSummaryRow,
  GovernanceIncidentSummaryRow,
  GovernanceOperationQueueSummaryRow,
  GovernanceOverviewCard,
  GovernanceReadOnlyNote,
} from "./governanceDashboardTypes";

const noExecutionText =
  "No correction, rebuild, replay, approval, retry, assignment, or sync is executed here.";

const overviewCards: GovernanceOverviewCard[] = [
  {
    label: "注意が必要な signal",
    value: "12",
    description: "Review signal only. ガバナンス review 用の静的 mock 件数です。",
    tone: "warning",
    severity: "warning",
    lifecycleState: "detected",
    degradationType: "attention",
    visibility: "overview",
    readability: "scan_first",
  },
  {
    label: "Critical attention",
    value: "3",
    description: "人が優先して確認する signal です。処理順や操作指示ではありません。",
    tone: "critical",
    severity: "critical",
    lifecycleState: "reviewing",
    degradationType: "attention",
    visibility: "overview",
    readability: "scan_first",
  },
  {
    label: "証跡の不足",
    value: "4",
    description: "audit review 上の limitation です。証跡追加の指示ではありません。",
    tone: "warning",
    severity: "high",
    lifecycleState: "classified",
    degradationType: "integrity",
    visibility: "overview",
    readability: "short_note",
  },
  {
    label: "表示モード",
    value: "READ ONLY",
    description: "NO EXECUTION. API 接続を行わない静的 dashboard です。",
    tone: "safe",
    severity: "info",
    lifecycleState: "reaffirmed",
    degradationType: "none",
    visibility: "overview",
    readability: "scan_first",
  },
];

const incidentSummary: GovernanceIncidentSummaryRow[] = [
  {
    label: "未確認の governance incident",
    value: "5",
    note: "調査と audit のための可視化です。source of truth の不具合確定を意味しません。",
    severity: "warning",
    lifecycleState: "detected",
    degradationType: "semantic_safety",
    visibility: "summary",
    readability: "short_note",
  },
  {
    label: "Dashboard 間の曖昧さ",
    value: "2",
    note: "audit context として扱う前に semantic review が必要な可能性があります。",
    severity: "high",
    lifecycleState: "reviewing",
    degradationType: "meaning_consistency",
    visibility: "summary",
    readability: "short_note",
  },
  {
    label: "滞留している review signal",
    value: "3",
    note: "滞留は review attention のための情報です。correction や rebuild を開始しません。",
    severity: "warning",
    lifecycleState: "classified",
    degradationType: "attention",
    visibility: "summary",
    readability: "short_note",
  },
];

const operationQueueSummary: GovernanceOperationQueueSummaryRow[] = [
  {
    label: "Review 候補",
    value: "7",
    note: "候補は executable-ready ではなく、approval を意味しません。",
    severity: "info",
    lifecycleState: "detected",
    degradationType: "none",
    visibility: "summary",
    readability: "short_note",
  },
  {
    label: "Approval state 参照",
    value: "2",
    note: "approval state は governance reference として表示するだけです。",
    severity: "warning",
    lifecycleState: "reviewing",
    degradationType: "safe_interpretation",
    visibility: "summary",
    readability: "short_note",
  },
  {
    label: "Lifecycle limitation",
    value: "4",
    note: "lifecycle note は operation lifecycle の遷移ではありません。",
    severity: "warning",
    lifecycleState: "classified",
    degradationType: "lifecycle",
    visibility: "summary",
    readability: "short_note",
  },
];

const evidenceSummary: GovernanceEvidenceSummaryRow[] = [
  {
    label: "証跡あり",
    value: "8",
    note: "review 用の証跡が参照できます。正しさの保証ではありません。",
    severity: "info",
    lifecycleState: "reaffirmed",
    degradationType: "none",
    visibility: "summary",
    readability: "short_note",
  },
  {
    label: "証跡が部分的",
    value: "3",
    note: "部分的な証跡は audit limitation として見える状態を保ちます。",
    severity: "warning",
    lifecycleState: "classified",
    degradationType: "integrity",
    visibility: "summary",
    readability: "short_note",
  },
  {
    label: "Timeline gap",
    value: "2",
    note: "timeline gap は調査用 signal です。replay eligibility ではありません。",
    severity: "high",
    lifecycleState: "reviewing",
    degradationType: "semantic_safety",
    visibility: "summary",
    readability: "short_note",
  },
];

const readOnlyNotes: GovernanceReadOnlyNote[] = [
  {
    noteType: "semantic_safety",
    title: "Semantic safety",
    category: "interpretation_safety",
    categoryLabel: "Interpretation safety",
    note: "Confidence high は、review に必要な証跡や scope が比較的そろっていることを示します。safe to execute ではありません。",
    severity: "warning",
    lifecycleState: "reviewing",
    degradationType: "semantic_safety",
    visibility: "note",
    readability: "detail_note",
  },
  {
    noteType: "integrity",
    title: "Integrity review",
    category: "governance_quality",
    categoryLabel: "Governance quality",
    note: "Integrity signal は dashboard quality と audit limitation を示します。データを変更するものではありません。",
    severity: "info",
    lifecycleState: "classified",
    degradationType: "integrity",
    visibility: "note",
    readability: "detail_note",
  },
  {
    noteType: "attention",
    title: "Attention quality",
    category: "review_signal_only",
    categoryLabel: "Review signal only",
    note: "priority と attention は human review の見落とし防止に使います。execution priority や assignment mutation ではありません。",
    severity: "warning",
    lifecycleState: "detected",
    degradationType: "attention",
    visibility: "note",
    readability: "detail_note",
  },
  {
    noteType: "safe_interpretation",
    title: "Safe interpretation",
    category: "expectation_isolation",
    categoryLabel: "Execution expectation isolation",
    note: "READ ONLY と NO EXECUTION は、この静的 dashboard の表示上の前提です。",
    severity: "info",
    lifecycleState: "reaffirmed",
    degradationType: "safe_interpretation",
    visibility: "note",
    readability: "detail_note",
  },
];

const styles: Record<string, CSSProperties> = {
  panel: {
    marginTop: "2rem",
    padding: "1.25rem",
    border: "1px solid #ddd",
    borderRadius: "12px",
    background: "#fff",
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1rem",
  },
  lead: {
    marginTop: "0.5rem",
    color: "#555",
    lineHeight: 1.7,
    maxWidth: "58rem",
  },
  noteGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))",
    gap: "0.85rem",
    marginTop: "0.85rem",
  },
};

export function GovernanceDashboardSection() {
  return (
    <section style={styles.panel} aria-labelledby="governance-dashboard-heading">
      <div style={styles.header}>
        <div>
          <h2 id="governance-dashboard-heading">Governance Dashboard</h2>
          <p style={styles.lead}>
            recovery governance、integrity review、semantic safety、attention quality を
            確認するための read-only static dashboard です。この表示は mock data のみを使い、
            API、Edge Function、DB、RPC には接続しません。
          </p>
        </div>
        <GovernanceReadOnlyBoundaryBadges />
      </div>

      <GovernanceReadOnlyNotice>
        Review signal only. 表示された内容は人による確認のための signal です。
        {noExecutionText}
      </GovernanceReadOnlyNotice>

      <section aria-label="ガバナンス概要">
        <h3>ガバナンス概要</h3>
        <div style={governanceComponentStyles.grid}>
          {overviewCards.map((card) => (
            <GovernanceSectionCard
              key={card.label}
              title={card.label}
              value={card.value}
              description={card.description}
              severity={card.severity}
              lifecycleState={card.lifecycleState}
              tone={card.tone}
            />
          ))}
        </div>
      </section>

      <GovernanceSummarySection
        title="Incident サマリー"
        description="read-only の調査と audit context のために、incident の状態を静的に表示します。"
        rows={incidentSummary}
      />

      <GovernanceSummarySection
        title="Operation queue サマリー"
        description="governance review 用の静的な queue summary です。queue state は execution lifecycle ではありません。"
        rows={operationQueueSummary}
      />

      <GovernanceSummarySection
        title="証跡サマリー"
        description="audit limitation を見える状態にするための静的な evidence summary です。"
        rows={evidenceSummary}
      />

      <section style={governanceComponentStyles.section}>
        <h3 style={governanceComponentStyles.sectionTitle}>
          Semantic safety / Integrity / Attention note
        </h3>
        <p style={governanceComponentStyles.lead}>
          ここに表示する内容は read-only note です。correction、rebuild、replay、
          approval、retry、assignment、sync の操作は含みません。
        </p>
        <div style={styles.noteGrid}>
          {readOnlyNotes.map((note) => (
            <GovernanceSemanticNoteCard key={note.title} note={note} />
          ))}
        </div>
      </section>

      <GovernanceReadOnlyNotice tone="neutral">
        READ ONLY / NO EXECUTION: {noExecutionText} この static dashboard は実データを取得せず、
        assignment、approval、incident、operation、evidence、timeline、projection を変更しません。
      </GovernanceReadOnlyNotice>
    </section>
  );
}
