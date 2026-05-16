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
  getGovernanceProjectionDependencies,
  getGovernanceProjectionIntegrityIssues,
  getGovernanceProjectionIntegritySignals,
  getGovernanceProjectionIntegritySummary,
  getGovernanceProjectionLineageGraph,
  getGovernanceProjectionNamespaceGroups,
  getGovernanceProjectionRelations,
  getGovernanceProjectionScopeGroups,
  getGovernanceProjectionTraceMap,
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
  "correction、rebuild、replay、approval、retry、assignment、sync はこの画面から実行されません。";

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
  const projectionLineageGraph = getGovernanceProjectionLineageGraph(governanceData);
  const projectionDependencies = getGovernanceProjectionDependencies(governanceData);
  const projectionTraceMap = getGovernanceProjectionTraceMap(governanceData);
  const projectionIntegritySummary = getGovernanceProjectionIntegritySummary(governanceData);
  const projectionIntegrityIssues = getGovernanceProjectionIntegrityIssues(governanceData);
  const projectionIntegritySignals = getGovernanceProjectionIntegritySignals(governanceData);
  const stateNotice = getGovernanceStateNotice(governanceData);

  return (
    <section style={styles.panel} aria-labelledby="governance-dashboard-heading">
      <div style={styles.header}>
        <div>
          <h2 id="governance-dashboard-heading">ガバナンス確認</h2>
          <p style={styles.lead}>
            recovery governance、整合性(integrity)確認、semantic safety、注意確認(attention)を
            説明表示として確認するための read-only static dashboard です。この表示は mock data のみを使い、
            API、Edge Function、DB、RPC には接続しません。
          </p>
        </div>
        <GovernanceReadOnlyBoundaryBadges />
      </div>

      <GovernanceReadOnlyNotice>
        確認用シグナルのみです。表示された内容は人による確認のための signal です。
        {noExecutionText}
      </GovernanceReadOnlyNotice>

      <GovernanceStateNotice notice={stateNotice} />

      <GovernanceReadOnlyNotice tone="neutral">
        表示モデル間の説明 graph: 関係 {projectionRelations.length} / anchor{" "}
        {projectionAnchors.length} / 注意シグナル {projectionAttentionGraph.length}。これは
        read-only の説明表示であり、coordination、assignment、correction、execution は開始しません。
      </GovernanceReadOnlyNotice>

      <GovernanceReadOnlyNotice tone="neutral">
        表示モデル identity map: identity {projectionIdentities.length} / scope{" "}
        {projectionScopeGroups.length} / namespace {projectionNamespaceGroups.length}。identity は
        read-only の説明 metadata であり、API、trace mutation、execution は作りません。
      </GovernanceReadOnlyNotice>

      <GovernanceReadOnlyNotice tone="neutral">
        表示モデルの由来(lineage): lineage node {projectionLineageGraph.length} / 依存関係{" "}
        {projectionDependencies.length} / trace map {Object.keys(projectionTraceMap).length}。これは
        静的な由来表示であり、replay、rebuild、retry、trace mutation は作りません。
      </GovernanceReadOnlyNotice>

      <GovernanceReadOnlyNotice tone="neutral">
        表示モデル整合性(integrity): summary{" "}
        {projectionIntegritySummary.map((item) => `${item.level} ${item.count}`).join(", ")} /
        issue {projectionIntegrityIssues.length} / signal {projectionIntegritySignals.length}。
        これは read-only の整合性表示であり、correction、rebuild、replay、mutation は開始しません。
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
        title="要確認事項サマリー"
        description="read-only の調査と audit context のために、要確認事項(incident)の状態を静的に表示します。"
        rows={incidentSummaries}
        projectionSummary={`要確認事項の表示モデル groups: ${incidentGroups.length} / 重要度: ${incidentSeveritySummary.map((item) => `${item.severity} ${item.count}`).join(", ")} / 注意確認: ${incidentAttentionSummary.map((item) => `${item.attentionLevel} ${item.count}`).join(", ")}`}
      />

      <GovernanceSummarySection
        title="確認キューサマリー"
        description="governance review 用の静的な確認キュー summary です。queue state は execution lifecycle ではありません。"
        rows={operationQueueItems}
        projectionSummary={`確認キューの表示モデル groups: ${operationGroups.length} / 確認優先度: ${operationPrioritySummary.map((item) => `${item.priority} ${item.count}`).join(", ")} / 状態: ${operationStateSummary.map((item) => `${item.state} ${item.count}`).join(", ")}`}
      />

      <GovernanceSummarySection
        title="証跡サマリー"
        description="audit limitation を見える状態にするための静的な証跡(evidence) summary です。"
        rows={evidenceSummaries}
        projectionSummary={`証跡の表示モデル groups: ${evidenceGroups.length} / 注意確認: ${evidenceAttentionItems.length} / 説明信頼度: ${evidenceConfidenceSummary.map((item) => `${item.confidence} ${item.count}`).join(", ")}`}
      />

      <GovernanceTimelineSection
        title="read-only 時系列"
        description="review / observability purpose の timeline です。時系列表示は visibility のためだけに扱います。"
        items={timelineItems}
        projectionSummary={`表示モデル groups: ${timelineGroups.length} / 強調表示: ${timelineHighlights.length} / 注意確認: ${timelineAttentionItems.length}`}
      />

      <section style={governanceComponentStyles.section}>
        <h3 style={governanceComponentStyles.sectionTitle}>
          意味安全・整合性・注意確認 note
        </h3>
        <p style={governanceComponentStyles.lead}>
          ここに表示する内容は read-only の確認 note です。correction、rebuild、replay、
          approval、retry、assignment、sync の操作は含みません。
        </p>
        <div style={styles.noteGrid}>
          {semanticNotes.map((note) => (
            <GovernanceSemanticNoteCard key={note.title} note={note} />
          ))}
        </div>
      </section>

      <GovernanceReadOnlyNotice tone="neutral">
        参照のみ(READ ONLY) / 実行なし(NO EXECUTION): {noExecutionText} この static dashboard は実データを取得せず、
        assignment、approval、incident、operation、evidence、timeline、projection を変更しません。
      </GovernanceReadOnlyNotice>
    </section>
  );
}
