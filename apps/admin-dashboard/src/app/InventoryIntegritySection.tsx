"use client";

import type { CSSProperties } from "react";
import { getInventoryIntegrityMockData } from "./inventoryIntegrityMockData";
import {
  getInventoryCompareDependencies,
  getInventoryCompareEvidenceItems,
  getInventoryCompareLineageGraph,
  getInventoryCompareProjections,
  getInventoryCompareReasonSummary,
  getInventoryCompareScopeSummary,
  getInventoryCompareSeveritySummary,
  getInventoryIntegrityAttention,
  getInventoryIntegrityAttentionLevelSummary,
  getInventoryIntegrityEscalationCandidates,
  getInventoryIntegrityEscalationSummary,
  getInventoryIntegrityEvidence,
  getInventoryIntegrityEvidenceConfidenceSummary,
  getInventoryIntegrityEvidenceGaps,
  getInventoryIntegrityEvidenceQualitySummary,
  getInventoryIntegrityIssues,
  getInventoryIntegrityLevelSummary,
  getInventoryIntegrityReviewPrioritySummary,
  getInventoryIntegrityReviewSignals,
  getInventoryIntegritySignals,
  getInventoryIntegrityStatusSummary,
  getInventoryIntegritySummaries,
} from "./inventoryIntegritySelectors";
import type {
  InventoryCompareSeverity,
  InventoryCompareReason,
  InventoryCompareScope,
  InventoryIntegrityAttentionLevel,
  InventoryIntegrityEvidenceConfidence,
  InventoryIntegrityEvidenceQuality,
  InventoryIntegrityLevel,
  InventoryIntegrityStatus,
  InventoryIntegrityReviewPriority,
} from "./inventoryIntegrityTypes";

function levelLabel(level: InventoryIntegrityLevel): string {
  if (level === "degraded") return "整合性: 低下";
  if (level === "limited") return "整合性: 制限あり";
  if (level === "watch") return "整合性: 要確認";
  return "整合性: 安定";
}

function levelStyle(level: InventoryIntegrityLevel): CSSProperties {
  if (level === "degraded") return { borderColor: "#c62828", background: "#ffebee" };
  if (level === "limited" || level === "watch") {
    return { borderColor: "#ef6c00", background: "#fff3e0" };
  }
  return { borderColor: "#2e7d32", background: "#e8f5e9" };
}

function severityLabel(severity: InventoryCompareSeverity): string {
  if (severity === "critical") return "差異重要度: 重大";
  if (severity === "warning") return "差異重要度: 警戒";
  if (severity === "watch") return "差異重要度: 注意";
  return "差異重要度: 参考";
}

function severityStyle(severity: InventoryCompareSeverity): CSSProperties {
  if (severity === "critical") return { borderColor: "#c62828", background: "#ffebee" };
  if (severity === "warning" || severity === "watch") {
    return { borderColor: "#ef6c00", background: "#fff3e0" };
  }
  return { borderColor: "#90caf9", background: "#e3f2fd" };
}

function statusLabel(status: InventoryIntegrityStatus): string {
  if (status === "compare_ready") return "比較準備";
  if (status === "review_needed") return "確認必要";
  if (status === "source_gap") return "根拠不足";
  return "表示差異";
}

function reasonLabel(reason: InventoryCompareReason): string {
  if (reason === "read_model_cache_gap") return "表示用 cache 差異";
  if (reason === "transaction_aggregation_gap") return "transaction 集計差異";
  if (reason === "location_scope_gap") return "棚・場所範囲差異";
  if (reason === "project_scope_gap") return "project 範囲差異";
  return "未比較";
}

function scopeLabel(scope: InventoryCompareScope): string {
  if (scope === "part") return "部品";
  if (scope === "location") return "棚・場所";
  if (scope === "project") return "project";
  if (scope === "inventory_type") return "在庫種別";
  return "倉庫";
}

function attentionLevelLabel(level: InventoryIntegrityAttentionLevel): string {
  if (level === "audit_required") return "要監査";
  if (level === "tracking_required") return "要追跡";
  if (level === "review_required") return "要確認";
  return "参考";
}

function reviewPriorityLabel(priority: InventoryIntegrityReviewPriority): string {
  if (priority === "high") return "高優先";
  if (priority === "medium") return "中優先";
  return "低優先";
}

function reviewPriorityStyle(priority: InventoryIntegrityReviewPriority): CSSProperties {
  if (priority === "high") return { borderColor: "#c62828", background: "#ffebee" };
  if (priority === "medium") return { borderColor: "#ef6c00", background: "#fff3e0" };
  return { borderColor: "#90caf9", background: "#e3f2fd" };
}

function evidenceQualityLabel(quality: InventoryIntegrityEvidenceQuality): string {
  if (quality === "missing") return "証跡品質: 不足";
  if (quality === "limited") return "証跡品質: 限定的";
  if (quality === "partial") return "証跡品質: 部分あり";
  return "証跡品質: 十分";
}

function evidenceConfidenceLabel(confidence: InventoryIntegrityEvidenceConfidence): string {
  if (confidence === "high") return "説明信頼度: 高";
  if (confidence === "medium") return "説明信頼度: 中";
  if (confidence === "low") return "説明信頼度: 低";
  return "説明信頼度: 不明";
}

function evidenceQualityStyle(quality: InventoryIntegrityEvidenceQuality): CSSProperties {
  if (quality === "missing") return { borderColor: "#c62828", background: "#ffebee" };
  if (quality === "limited" || quality === "partial") {
    return { borderColor: "#ef6c00", background: "#fff3e0" };
  }
  return { borderColor: "#2e7d32", background: "#e8f5e9" };
}

function semanticBoundaryLabel(boundary: "reasoning_visualization_only"): string {
  return boundary === "reasoning_visualization_only" ? "説明表示のみ" : boundary;
}

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
  },
  lead: {
    color: "#555",
    lineHeight: 1.7,
    maxWidth: "60rem",
  },
  badgeRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.45rem",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    border: "1px solid #90a4ae",
    borderRadius: "999px",
    padding: "0.25rem 0.55rem",
    background: "#f5f7fb",
    color: "#333",
    fontSize: "0.8rem",
    fontWeight: 800,
  },
  notice: {
    margin: "1rem 0",
    padding: "0.9rem 1rem",
    border: "1px solid #ef6c00",
    borderRadius: "12px",
    background: "#fff3e0",
    color: "#5d3900",
    fontWeight: 700,
    lineHeight: 1.6,
  },
  neutralNotice: {
    border: "1px dashed #90a4ae",
    background: "#f5f7fb",
    color: "#333",
    fontWeight: 400,
  },
  section: {
    marginTop: "1.25rem",
    padding: "1rem",
    border: "1px solid #ddd",
    borderRadius: "12px",
    background: "#fafafa",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
    gap: "0.85rem",
    marginTop: "0.85rem",
  },
  card: {
    padding: "0.9rem",
    border: "1px solid #ddd",
    borderRadius: "12px",
    background: "#fff",
  },
  value: {
    display: "block",
    marginTop: "0.35rem",
    fontSize: "1.35rem",
    fontWeight: 900,
  },
  description: {
    margin: "0.45rem 0 0",
    color: "#555",
    lineHeight: 1.55,
  },
  list: {
    display: "grid",
    gap: "0.75rem",
    marginTop: "0.85rem",
  },
};

export function InventoryIntegritySection() {
  const data = getInventoryIntegrityMockData();
  const summaries = getInventoryIntegritySummaries(data);
  const issues = getInventoryIntegrityIssues(data);
  const signals = getInventoryIntegritySignals(data);
  const compareProjections = getInventoryCompareProjections(data);
  const levelSummary = getInventoryIntegrityLevelSummary(data);
  const statusSummary = getInventoryIntegrityStatusSummary(data);
  const compareSeveritySummary = getInventoryCompareSeveritySummary(data);
  const compareReasonSummary = getInventoryCompareReasonSummary(data);
  const compareScopeSummary = getInventoryCompareScopeSummary(data);
  const compareLineageGraph = getInventoryCompareLineageGraph(data);
  const compareDependencies = getInventoryCompareDependencies(data);
  const compareEvidenceItems = getInventoryCompareEvidenceItems(data);
  const attentionProjections = getInventoryIntegrityAttention(data);
  const attentionLevelSummary = getInventoryIntegrityAttentionLevelSummary(data);
  const reviewPrioritySummary = getInventoryIntegrityReviewPrioritySummary(data);
  const escalationCandidates = getInventoryIntegrityEscalationCandidates(data);
  const escalationSummary = getInventoryIntegrityEscalationSummary(data);
  const reviewSignals = getInventoryIntegrityReviewSignals(data);
  const evidenceProjections = getInventoryIntegrityEvidence(data);
  const evidenceQualitySummary = getInventoryIntegrityEvidenceQualitySummary(data);
  const evidenceConfidenceSummary = getInventoryIntegrityEvidenceConfidenceSummary(data);
  const evidenceGaps = getInventoryIntegrityEvidenceGaps(data);

  return (
    <section style={styles.panel} aria-labelledby="inventory-integrity-heading">
      <div style={styles.header}>
        <div>
          <h2 id="inventory-integrity-heading">在庫整合性</h2>
          <p style={styles.lead}>
            inventory_current と inventory_transactions の整合性を将来比較(compare)するための、
            静的な参照表示です。inventory_transactions が在庫の真実(truth)であり、
            inventory_current は比較対象の表示用 cache です。差異由来(lineage)、注意シグナル、
            証跡(explainability) は説明表示のみで、実行機能ではありません。
          </p>
        </div>
        <div style={styles.badgeRow} aria-label="Inventory integrity boundary">
          <span style={styles.badge}>参照のみ(READ ONLY)</span>
          <span style={styles.badge}>差異比較は表示のみ</span>
          <span style={styles.badge}>差異由来は表示のみ</span>
          <span style={styles.badge}>注意シグナルは表示のみ</span>
          <span style={styles.badge}>証跡は表示のみ</span>
          <span style={styles.badge}>再構築なし</span>
          <span style={styles.badge}>更新なし</span>
        </div>
      </div>

      <div style={styles.notice}>
        この画面では、データ取得、live compare、inventory_current 更新、再構築(rebuild)、
        replay、correction は行いません。将来比較する場合も、期待現在庫は
        inventory_transactions から導出する前提です。
      </div>

      <div style={styles.notice}>
        差異比較(compare) と差異由来(lineage) は、確認のための説明表示(reasoning visualization)です。
        inventory_transactions は真実となる集計元、inventory_current は比較対象の cache です。
        この表示から実行や修正は開始されません。
      </div>

      <div style={styles.notice}>
        注意シグナルと確認優先度は「どれを先に確認するか」を整理する説明表示です。
        エスカレーション、通知、担当割当、attention execution は未実装で、この画面から開始されません。
      </div>

      <div style={styles.notice}>
        証跡(evidence) と説明(explainability) は、判断材料を読みやすくするための説明表示です。
        証跡解決(evidence resolution)、auto-fix、再構築(rebuild) は未実装で、この画面から開始されません。
      </div>

      <div style={{ ...styles.notice, ...styles.neutralNotice }}>
        整合性サマリー: 状態 {levelSummary.map((item) => `${levelLabel(item.level)} ${item.count}`).join(", ")}
        {" / "}分類 {statusSummary.map((item) => `${statusLabel(item.status)} ${item.count}`).join(", ")}.
      </div>

      <div style={{ ...styles.notice, ...styles.neutralNotice }}>
        差異比較サマリー: 重要度{" "}
        {compareSeveritySummary.map((item) => `${severityLabel(item.severity)} ${item.count}`).join(", ")}
        {" / "}差異理由 {compareReasonSummary.map((item) => `${reasonLabel(item.reason)} ${item.count}`).join(", ")}
        {" / "}範囲 {compareScopeSummary.map((item) => `${scopeLabel(item.scope)} ${item.count}`).join(", ")}.
      </div>

      <div style={{ ...styles.notice, ...styles.neutralNotice }}>
        差異由来サマリー: トレース(trace) {compareLineageGraph.length} / 依存関係{" "}
        {compareDependencies.length} / 証跡 {compareEvidenceItems.length}。差異由来(lineage)、
        trace、依存関係は説明用 metadata であり、live compare や rebuild を開始しません。
      </div>

      <div style={{ ...styles.notice, ...styles.neutralNotice }}>
        注意シグナルサマリー: 確認種別{" "}
        {attentionLevelSummary
          .map((item) => `${attentionLevelLabel(item.attentionLevel)} ${item.count}`)
          .join(", ")}
        {" / "}確認優先度{" "}
        {reviewPrioritySummary
          .map((item) => `${reviewPriorityLabel(item.reviewPriority)} ${item.count}`)
          .join(", ")}
        {" / "}エスカレーション候補 {escalationCandidates.length} / 注意シグナル{" "}
        {reviewSignals.length}.
      </div>

      <div style={{ ...styles.notice, ...styles.neutralNotice }}>
        証跡サマリー: 証跡品質{" "}
        {evidenceQualitySummary
          .map((item) => `${evidenceQualityLabel(item.quality)} ${item.count}`)
          .join(", ")}
        {" / "}説明信頼度{" "}
        {evidenceConfidenceSummary
          .map((item) => `${evidenceConfidenceLabel(item.confidence)} ${item.count}`)
          .join(", ")}
        {" / "}証跡不足 {evidenceGaps.length}.
      </div>

      <section style={styles.section}>
        <h3 style={{ marginTop: 0 }}>整合性サマリー</h3>
        <div style={styles.grid}>
          {summaries.map((summary) => (
            <article key={summary.label} style={{ ...styles.card, ...levelStyle(summary.level) }}>
              <strong>{summary.label}</strong>
              <span style={styles.value}>{summary.value}</span>
              <p style={styles.description}>{summary.description}</p>
              <div style={styles.badgeRow}>
                <span style={styles.badge}>{levelLabel(summary.level)}</span>
                <span style={styles.badge}>分類: {statusLabel(summary.status)}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={{ marginTop: 0 }}>差異確認(compare)</h3>
        <p style={styles.lead}>
          inventory_current を真実(truth)として扱わず、inventory_transactions から導出した
          期待現在庫と、表示用 cache を照合する考え方です。この画面では照合を実行しません。
        </p>
        <div style={styles.list}>
          {issues.map((issue) => (
            <article key={issue.id} style={{ ...styles.card, ...levelStyle(issue.level) }}>
              <strong>{issue.title}</strong>
              <p style={styles.description}>{issue.description}</p>
              <p style={styles.description}>表示用 cache の見方: {issue.currentReadModelSignal}</p>
              <p style={styles.description}>truth の見方: {issue.transactionTruthSignal}</p>
              <div style={styles.badgeRow}>
                <span style={styles.badge}>{levelLabel(issue.level)}</span>
                <span style={styles.badge}>分類: {statusLabel(issue.status)}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={{ marginTop: 0 }}>差異比較</h3>
        <p style={styles.lead}>
          inventory_current と inventory_transactions aggregation を将来どう比較できるかを、
          静的な表示として説明します。比較実行(compare execution)、再構築、replay、correction
          は行いません。
        </p>
        <div style={styles.list}>
          {compareProjections.map((projection) => (
            <article
              key={projection.id}
              style={{ ...styles.card, ...severityStyle(projection.difference.severity) }}
            >
              <strong>{projection.label}</strong>
              <p style={styles.description}>{projection.description}</p>
              <p style={styles.description}>
                表示用 cache 数量: {projection.difference.currentReadModelQuantity} / transaction
                集計数量: {projection.difference.transactionAggregationQuantity} / 差異:{" "}
                {projection.difference.differenceQuantity}
              </p>
              <p style={styles.description}>truth の見方: {projection.truthStatement}</p>
              <p style={styles.description}>実行しないこと: {projection.executionBoundary}</p>
              <div style={styles.badgeRow}>
                <span style={styles.badge}>{severityLabel(projection.difference.severity)}</span>
                <span style={styles.badge}>差異理由: {reasonLabel(projection.difference.reason)}</span>
                <span style={styles.badge}>範囲: {scopeLabel(projection.scope)}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={{ marginTop: 0 }}>由来・トレース(trace)・依存関係・証跡</h3>
        <p style={styles.lead}>
          差異由来(lineage) は「なぜ差異が見える可能性があるか」を説明する静的な整理です。
          トレース(trace)、由来、依存関係、証跡はいずれも確認補助であり、比較実行や correction
          にはつながりません。
        </p>
        <div style={styles.list}>
          {compareProjections.map((projection) => (
            <article key={`${projection.id}-lineage`} style={styles.card}>
              <strong>{projection.label}</strong>
              <p style={styles.description}>
                トレース(trace): {projection.lineage.trace.traceId} / 親 trace:{" "}
                {projection.lineage.trace.parentTraceId}
              </p>
              <p style={styles.description}>
                由来:{" "}
                {projection.lineage.derivedFrom
                  .map((source) => `${source.label} (${source.source})`)
                  .join(" / ")}
              </p>
              <p style={styles.description}>
                依存関係: {projection.lineage.dependencies.map((item) => item.label).join(" / ")}
              </p>
              <p style={styles.description}>
                証跡: {projection.lineage.evidence.map((item) => item.label).join(" / ")}
              </p>
              <div style={styles.badgeRow}>
                <span style={styles.badge}>差異由来は表示のみ</span>
                <span style={styles.badge}>{semanticBoundaryLabel(projection.lineage.semanticBoundary)}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={{ marginTop: 0 }}>優先確認・注意シグナル</h3>
        <p style={styles.lead}>
          差異、差異由来(lineage)、証跡をもとに「どれを先に確認するか」を静的に整理します。
          高優先は実行許可ではなく、低優先も安全(safe)判定ではありません。通知、担当割当、
          エスカレーション実行は行いません。
        </p>
        <div style={styles.list}>
          {attentionProjections.map((attention) => (
            <article
              key={attention.id}
              style={{ ...styles.card, ...reviewPriorityStyle(attention.reviewPriority) }}
            >
              <strong>{attention.title}</strong>
              <p style={styles.description}>差異理由: {attention.reason}</p>
              <p style={styles.description}>確認観点: {attention.reviewFocus}</p>
              <p style={styles.description}>
                エスカレーション候補: {attention.escalation.label} /{" "}
                {attention.escalation.semanticMeaning}
              </p>
              <p style={styles.description}>実行しないこと: {attention.executionBoundary}</p>
              <div style={styles.badgeRow}>
                <span style={styles.badge}>{attentionLevelLabel(attention.attentionLevel)}</span>
                <span style={styles.badge}>{reviewPriorityLabel(attention.reviewPriority)}</span>
                <span style={styles.badge}>注意シグナルは表示のみ</span>
                <span style={styles.badge}>{semanticBoundaryLabel(attention.semanticBoundary)}</span>
              </div>
              <div style={styles.list}>
                {attention.reviewSignals.map((signal) => (
                  <div key={signal.id} style={styles.card}>
                    <strong>注意シグナル: {signal.label}</strong>
                    <p style={styles.description}>理由: {signal.reason}</p>
                    <p style={styles.description}>証跡: {signal.evidenceHint}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={{ marginTop: 0 }}>エスカレーション候補</h3>
        <p style={styles.lead}>
          ここでのエスカレーションは「誰かが確認した方がよいかもしれない」という候補表示のみです。
          通知、担当割当、承認、監査開始、修正処理には接続しません。
        </p>
        <div style={styles.grid}>
          {escalationSummary.map((summary) => (
            <article key={summary.candidate} style={styles.card}>
              <strong>{summary.candidate}</strong>
              <span style={styles.value}>{summary.count}</span>
              <p style={styles.description}>
                エスカレーション候補の件数です。実行優先度ではありません。
              </p>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={{ marginTop: 0 }}>証跡・説明根拠</h3>
        <p style={styles.lead}>
          差異、差異由来(lineage)、注意シグナルに対して、どの根拠・証跡・説明が存在するかを
          静的に整理します。証跡は正しさの保証ではなく、証跡実行(evidence execution)、
          証跡解決(evidence resolution)、auto-fix、rebuild には接続しません。
        </p>
        <div style={styles.list}>
          {evidenceProjections.map((evidence) => (
            <article
              key={evidence.id}
              style={{ ...styles.card, ...evidenceQualityStyle(evidence.quality) }}
            >
              <strong>{evidence.title}</strong>
              <p style={styles.description}>説明: {evidence.explanation}</p>
              <p style={styles.description}>理由: {evidence.rationale}</p>
              <p style={styles.description}>
                由来: {evidence.source.label} / {evidence.source.semanticMeaning}
              </p>
              <p style={styles.description}>実行しないこと: {evidence.executionBoundary}</p>
              <div style={styles.badgeRow}>
                <span style={styles.badge}>証跡は表示のみ</span>
                <span style={styles.badge}>{evidenceQualityLabel(evidence.quality)}</span>
                <span style={styles.badge}>{evidenceConfidenceLabel(evidence.confidence)}</span>
                <span style={styles.badge}>{semanticBoundaryLabel(evidence.semanticBoundary)}</span>
              </div>
              <div style={styles.list}>
                {evidence.gaps.map((gap) => (
                  <div key={gap.id} style={styles.card}>
                    <strong>証跡不足: {gap.label}</strong>
                    <p style={styles.description}>理由: {gap.reason}</p>
                    <p style={styles.description}>制限: {gap.limitation}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={{ marginTop: 0 }}>整合性シグナル</h3>
        <div style={styles.grid}>
          {signals.map((signal) => (
            <article key={signal.id} style={{ ...styles.card, ...levelStyle(signal.level) }}>
              <strong>{signal.label}</strong>
              <span style={styles.value}>{signal.value}</span>
              <p style={styles.description}>{signal.note}</p>
              <span style={styles.badge}>{levelLabel(signal.level)}</span>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
