"use client";

import type { CSSProperties } from "react";
import {
  GovernanceReadOnlyBoundaryBadges,
  GovernanceReadOnlyNotice,
  GovernanceSectionCard,
  GovernanceSemanticNoteCard,
  GovernanceStateNotice,
  GovernanceSummarySection,
  GovernanceTimelineSection,
  governanceComponentStyles,
} from "./governanceDashboardComponents";
import { getGovernanceDashboardMockData } from "./governanceDashboardMockData";
import {
  getGovernanceEvidenceAttentionItems,
  getGovernanceEvidenceConfidenceSummary,
  getGovernanceEvidenceGroups,
  getGovernanceEvidenceSummaries,
  getGovernanceIncidentAttentionSummary,
  getGovernanceIncidentGroups,
  getGovernanceIncidentSeveritySummary,
  getGovernanceProjectionAnchors,
  getGovernanceProjectionAttentionGraph,
  getGovernanceProjectionIdentities,
  getGovernanceProjectionNamespaceGroups,
  getGovernanceProjectionRelations,
  getGovernanceProjectionScopeGroups,
  getGovernanceStateNotice,
  getGovernanceIncidentSummaries,
  getGovernanceOperationGroups,
  getGovernanceOperationQueueItems,
  getGovernanceOperationPrioritySummary,
  getGovernanceOperationStateSummary,
  getGovernanceOverviewItems,
  getGovernanceSemanticNotes,
  getGovernanceTimelineAttentionItems,
  getGovernanceTimelineGroups,
  getGovernanceTimelineHighlights,
  getGovernanceTimelineItems,
} from "./governanceDashboardSelectors";

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
  const overviewItems = getGovernanceOverviewItems(governanceData);
  const incidentSummaries = getGovernanceIncidentSummaries(governanceData);
  const incidentGroups = getGovernanceIncidentGroups(governanceData);
  const incidentSeveritySummary = getGovernanceIncidentSeveritySummary(governanceData);
  const incidentAttentionSummary = getGovernanceIncidentAttentionSummary(governanceData);
  const operationQueueItems = getGovernanceOperationQueueItems(governanceData);
  const operationGroups = getGovernanceOperationGroups(governanceData);
  const operationPrioritySummary = getGovernanceOperationPrioritySummary(governanceData);
  const operationStateSummary = getGovernanceOperationStateSummary(governanceData);
  const evidenceSummaries = getGovernanceEvidenceSummaries(governanceData);
  const evidenceGroups = getGovernanceEvidenceGroups(governanceData);
  const evidenceAttentionItems = getGovernanceEvidenceAttentionItems(governanceData);
  const evidenceConfidenceSummary = getGovernanceEvidenceConfidenceSummary(governanceData);
  const semanticNotes = getGovernanceSemanticNotes(governanceData);
  const timelineItems = getGovernanceTimelineItems(governanceData);
  const timelineHighlights = getGovernanceTimelineHighlights(governanceData);
  const timelineAttentionItems = getGovernanceTimelineAttentionItems(governanceData);
  const timelineGroups = getGovernanceTimelineGroups(governanceData);
  const projectionRelations = getGovernanceProjectionRelations(governanceData);
  const projectionAnchors = getGovernanceProjectionAnchors(governanceData);
  const projectionAttentionGraph = getGovernanceProjectionAttentionGraph(governanceData);
  const projectionIdentities = getGovernanceProjectionIdentities(governanceData);
  const projectionScopeGroups = getGovernanceProjectionScopeGroups(governanceData);
  const projectionNamespaceGroups = getGovernanceProjectionNamespaceGroups(governanceData);
  const stateNotice = getGovernanceStateNotice(governanceData);

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

      <GovernanceStateNotice notice={stateNotice} />

      <GovernanceReadOnlyNotice tone="neutral">
        Cross-projection reasoning graph: Relations {projectionRelations.length} / Anchors{" "}
        {projectionAnchors.length} / Attention signals {projectionAttentionGraph.length}. This is
        static read-only visibility and does not trigger coordination, assignment, correction, or
        execution.
      </GovernanceReadOnlyNotice>

      <GovernanceReadOnlyNotice tone="neutral">
        Projection identity map: Identities {projectionIdentities.length} / Scopes{" "}
        {projectionScopeGroups.length} / Namespaces {projectionNamespaceGroups.length}. Identity is
        read-only reasoning metadata and does not create API, trace mutation, or execution behavior.
      </GovernanceReadOnlyNotice>

      <section aria-label="ガバナンス概要">
        <h3>ガバナンス概要</h3>
        <div style={governanceComponentStyles.grid}>
          {overviewItems.map((card) => (
            <GovernanceSectionCard
              key={card.label}
              title={card.label}
              value={card.value}
              description={card.description}
              severity={card.severity}
              lifecycleState={card.lifecycleState}
              tone={card.tone}
              semanticBadges={card.semanticBadges}
            />
          ))}
        </div>
      </section>

      <GovernanceSummarySection
        title="Incident サマリー"
        description="read-only の調査と audit context のために、incident の状態を静的に表示します。"
        rows={incidentSummaries}
        projectionSummary={`Incident projection groups: ${incidentGroups.length} / Severity: ${incidentSeveritySummary.map((item) => `${item.severity} ${item.count}`).join(", ")} / Attention: ${incidentAttentionSummary.map((item) => `${item.attentionLevel} ${item.count}`).join(", ")}`}
      />

      <GovernanceSummarySection
        title="Operation queue サマリー"
        description="governance review 用の静的な queue summary です。queue state は execution lifecycle ではありません。"
        rows={operationQueueItems}
        projectionSummary={`Operation projection groups: ${operationGroups.length} / Priority: ${operationPrioritySummary.map((item) => `${item.priority} ${item.count}`).join(", ")} / State: ${operationStateSummary.map((item) => `${item.state} ${item.count}`).join(", ")}`}
      />

      <GovernanceSummarySection
        title="証跡サマリー"
        description="audit limitation を見える状態にするための静的な evidence summary です。"
        rows={evidenceSummaries}
        projectionSummary={`Evidence projection groups: ${evidenceGroups.length} / Attention: ${evidenceAttentionItems.length} / Confidence: ${evidenceConfidenceSummary.map((item) => `${item.confidence} ${item.count}`).join(", ")}`}
      />

      <GovernanceTimelineSection
        title="Read-only timeline"
        description="review / observability purpose の timeline です。時系列表示は visibility のためだけに扱います。"
        items={timelineItems}
        projectionSummary={`Projection groups: ${timelineGroups.length} / Highlights: ${timelineHighlights.length} / Attention: ${timelineAttentionItems.length}`}
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
          {semanticNotes.map((note) => (
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
