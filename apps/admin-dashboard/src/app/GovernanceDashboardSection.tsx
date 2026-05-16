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
  "修正(correction)、再構築(rebuild)、再実行(replay)、承認(approval)、再試行(retry)、担当割当(assignment)、同期(sync)はこの画面から実行されません。";

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
            復旧ガバナンス(recovery governance)、整合性(integrity)確認、意味安全(semantic safety)、
            注意確認(attention)を説明表示として確認するための、参照のみ(read-only)の静的ダッシュボードです。
            この表示は静的 mock data のみを使い、API、Edge Function、DB、RPC には接続しません。
          </p>
        </div>
        <GovernanceReadOnlyBoundaryBadges />
      </div>

      <GovernanceReadOnlyNotice>
        確認用シグナルのみです。表示された内容は人による確認のためのシグナルです。
        {noExecutionText}
      </GovernanceReadOnlyNotice>

      <GovernanceStateNotice notice={stateNotice} />

      <GovernanceReadOnlyNotice tone="neutral">
        表示モデル間の説明関係図(graph): 関係 {projectionRelations.length} / 確認軸(anchor){" "}
        {projectionAnchors.length} / 注意シグナル {projectionAttentionGraph.length}。これは
        参照のみの説明表示であり、確認調整(coordination)、担当割当、修正、実行は開始しません。
      </GovernanceReadOnlyNotice>

      <GovernanceReadOnlyNotice tone="neutral">
        表示モデル identity map: identity {projectionIdentities.length} / 範囲(scope){" "}
        {projectionScopeGroups.length} / 名前空間(namespace) {projectionNamespaceGroups.length}。identity は
        参照のみの説明 metadata であり、API、trace mutation、execution は作りません。
      </GovernanceReadOnlyNotice>

      <GovernanceReadOnlyNotice tone="neutral">
        表示モデルの由来(lineage): 由来ノード(lineage node) {projectionLineageGraph.length} / 依存関係{" "}
        {projectionDependencies.length} / トレース対応(trace map) {Object.keys(projectionTraceMap).length}。これは
        静的な由来表示であり、replay、rebuild、retry、trace mutation は作りません。
      </GovernanceReadOnlyNotice>

      <GovernanceReadOnlyNotice tone="neutral">
        表示モデル整合性(integrity): サマリー{" "}
        {projectionIntegritySummary.map((item) => `${item.level} ${item.count}`).join(", ")} /
        課題 {projectionIntegrityIssues.length} / シグナル {projectionIntegritySignals.length}。
        これは参照のみの整合性表示であり、correction、rebuild、replay、mutation は開始しません。
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
        description="参照のみの調査と監査文脈(audit context)のために、要確認事項(incident)の状態を静的に表示します。"
        rows={incidentSummaries}
        projectionSummary={`要確認事項の表示モデル分類(groups): ${incidentGroups.length} / 重要度: ${incidentSeveritySummary.map((item) => `${item.severity} ${item.count}`).join(", ")} / 注意確認: ${incidentAttentionSummary.map((item) => `${item.attentionLevel} ${item.count}`).join(", ")}`}
      />

      <GovernanceSummarySection
        title="確認キューサマリー"
        description="ガバナンス確認(governance review)用の静的な確認キューサマリーです。キュー状態(queue state)は実行 lifecycle ではありません。"
        rows={operationQueueItems}
        projectionSummary={`確認キューの表示モデル分類(groups): ${operationGroups.length} / 確認優先度: ${operationPrioritySummary.map((item) => `${item.priority} ${item.count}`).join(", ")} / 状態: ${operationStateSummary.map((item) => `${item.state} ${item.count}`).join(", ")}`}
      />

      <GovernanceSummarySection
        title="証跡サマリー"
        description="監査上の制限(audit limitation)を見える状態にするための静的な証跡(evidence)サマリーです。"
        rows={evidenceSummaries}
        projectionSummary={`証跡の表示モデル分類(groups): ${evidenceGroups.length} / 注意確認: ${evidenceAttentionItems.length} / 説明信頼度: ${evidenceConfidenceSummary.map((item) => `${item.confidence} ${item.count}`).join(", ")}`}
      />

      <GovernanceTimelineSection
        title="参照のみの時系列(timeline)"
        description="確認と観測(review / observability)のための時系列(timeline)です。時系列表示は可視化(visibility)のためだけに扱います。"
        items={timelineItems}
        projectionSummary={`表示モデル分類(groups): ${timelineGroups.length} / 強調表示: ${timelineHighlights.length} / 注意確認: ${timelineAttentionItems.length}`}
      />

      <section style={governanceComponentStyles.section}>
        <h3 style={governanceComponentStyles.sectionTitle}>
          意味安全・整合性・注意確認ノート
        </h3>
        <p style={governanceComponentStyles.lead}>
          ここに表示する内容は参照のみの確認ノートです。correction、rebuild、replay、
          approval、retry、assignment、sync の操作は含みません。
        </p>
        <div style={styles.noteGrid}>
          {semanticNotes.map((note) => (
            <GovernanceSemanticNoteCard key={note.title} note={note} />
          ))}
        </div>
      </section>

      <GovernanceReadOnlyNotice tone="neutral">
        参照のみ(READ ONLY) / 実行なし(NO EXECUTION): {noExecutionText} この静的ダッシュボードは実データを取得せず、
        assignment、approval、incident、operation、evidence、timeline、projection を変更しません。
      </GovernanceReadOnlyNotice>
    </section>
  );
}
