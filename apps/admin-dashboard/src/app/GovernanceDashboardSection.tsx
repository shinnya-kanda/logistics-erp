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
import { getGovernanceDashboardMockData } from "./governanceDashboardMockData";

const noExecutionText =
  "No correction, rebuild, replay, approval, retry, assignment, or sync is executed here.";

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
  const governanceData = getGovernanceDashboardMockData();

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
          {governanceData.overviewCards.map((card) => (
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
        rows={governanceData.incidentSummary}
      />

      <GovernanceSummarySection
        title="Operation queue サマリー"
        description="governance review 用の静的な queue summary です。queue state は execution lifecycle ではありません。"
        rows={governanceData.operationQueueSummary}
      />

      <GovernanceSummarySection
        title="証跡サマリー"
        description="audit limitation を見える状態にするための静的な evidence summary です。"
        rows={governanceData.evidenceSummary}
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
          {governanceData.readOnlyNotes.map((note) => (
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
