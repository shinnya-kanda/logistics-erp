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
  InventoryIntegrityAttentionLevel,
  InventoryIntegrityEvidenceConfidence,
  InventoryIntegrityEvidenceQuality,
  InventoryIntegrityLevel,
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
            inventory_current と inventory_transactions の整合性を将来 compare するための静的な
            read-only 表示です。inventory_current は truth ではなく、inventory_transactions が在庫の
            truth です。差異由来(lineage)、注意シグナル、証跡(explainability) は reasoning
            visualization であり、execution ではありません。
          </p>
        </div>
        <div style={styles.badgeRow} aria-label="Inventory integrity boundary">
          <span style={styles.badge}>READ ONLY</span>
          <span style={styles.badge}>差異比較 SEMANTICS ONLY</span>
          <span style={styles.badge}>差異由来 SEMANTICS ONLY</span>
          <span style={styles.badge}>注意 SEMANTICS ONLY</span>
          <span style={styles.badge}>EVIDENCE SEMANTICS ONLY</span>
          <span style={styles.badge}>再構築なし</span>
          <span style={styles.badge}>更新なし</span>
        </div>
      </div>

      <div style={styles.notice}>
        この画面はデータ取得、live compare、inventory_current 更新、rebuild、replay、correction
        を行いません。将来の比較では inventory_transactions から期待現在庫を導出する前提です。
      </div>

      <div style={styles.notice}>
        差異比較(compare) と差異由来(lineage) は reasoning visualization であり execution ではありません。
        inventory_transactions は truth aggregation source、inventory_current は compare target/cache
        です。
      </div>

      <div style={styles.notice}>
        attention / review prioritization は「どれを先に確認するか」を整理する reasoning
        visualization です。escalation、notification、assignment、attention execution は未実装で、
        この画面から開始されません。
      </div>

      <div style={styles.notice}>
        証跡(evidence) と説明(explainability) は reasoning visualization であり execution ではありません。
        evidence resolution、auto-fix、rebuild は未実装で、この画面から開始されません。
      </div>

      <div style={{ ...styles.notice, ...styles.neutralNotice }}>
        整合性サマリー: 状態 {levelSummary.map((item) => `${levelLabel(item.level)} ${item.count}`).join(", ")}
        {" / "}分類 {statusSummary.map((item) => `${item.status} ${item.count}`).join(", ")}.
      </div>

      <div style={{ ...styles.notice, ...styles.neutralNotice }}>
        差異比較サマリー: 重要度{" "}
        {compareSeveritySummary.map((item) => `${severityLabel(item.severity)} ${item.count}`).join(", ")}
        {" / "}差異理由 {compareReasonSummary.map((item) => `${item.reason} ${item.count}`).join(", ")}
        {" / "}範囲 {compareScopeSummary.map((item) => `${item.scope} ${item.count}`).join(", ")}.
      </div>

      <div style={{ ...styles.notice, ...styles.neutralNotice }}>
        差異由来サマリー: trace {compareLineageGraph.length} / 依存関係{" "}
        {compareDependencies.length} / 証跡 {compareEvidenceItems.length}. lineage / trace /
        dependency は説明用 metadata であり、live compare や rebuild を開始しません。
      </div>

      <div style={{ ...styles.notice, ...styles.neutralNotice }}>
        attention サマリー: 確認種別{" "}
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
                <span style={styles.badge}>状態: {summary.status}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={{ marginTop: 0 }}>差異確認 / compare semantics</h3>
        <p style={styles.lead}>
          compare は inventory_current を truth として扱わず、inventory_transactions から導出した
          期待現在庫と表示用 cache を照合する考え方です。
        </p>
        <div style={styles.list}>
          {issues.map((issue) => (
            <article key={issue.id} style={{ ...styles.card, ...levelStyle(issue.level) }}>
              <strong>{issue.title}</strong>
              <p style={styles.description}>{issue.description}</p>
              <p style={styles.description}>表示用 cache signal: {issue.currentReadModelSignal}</p>
              <p style={styles.description}>truth signal: {issue.transactionTruthSignal}</p>
              <div style={styles.badgeRow}>
                <span style={styles.badge}>{levelLabel(issue.level)}</span>
                <span style={styles.badge}>状態: {issue.status}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={{ marginTop: 0 }}>差異比較</h3>
        <p style={styles.lead}>
          静的な projection として、inventory_current を inventory_transactions aggregation と将来どう
          比較できるかを説明します。compare execution は実行せず、rebuild、replay、correction
          も生成しません。
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
                現在庫 cache: {projection.difference.currentReadModelQuantity} / transaction
                aggregation: {projection.difference.transactionAggregationQuantity} / 差異:{" "}
                {projection.difference.differenceQuantity}
              </p>
              <p style={styles.description}>truth 説明: {projection.truthStatement}</p>
              <p style={styles.description}>境界: {projection.executionBoundary}</p>
              <div style={styles.badgeRow}>
                <span style={styles.badge}>{severityLabel(projection.difference.severity)}</span>
                <span style={styles.badge}>差異理由: {projection.difference.reason}</span>
                <span style={styles.badge}>範囲: {projection.scope}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={{ marginTop: 0 }}>由来・トレース(trace)・依存関係・証跡</h3>
        <p style={styles.lead}>
          lineage は「なぜ差異が見える可能性があるか」を説明する静的な reasoning graph です。
          trace、由来、dependency、証跡はいずれも説明用であり、compare execution や correction
          は行いません。
        </p>
        <div style={styles.list}>
          {compareProjections.map((projection) => (
            <article key={`${projection.id}-lineage`} style={styles.card}>
              <strong>{projection.label}</strong>
              <p style={styles.description}>
                trace: {projection.lineage.trace.traceId} / parent:{" "}
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
                <span style={styles.badge}>差異由来 SEMANTICS ONLY</span>
                <span style={styles.badge}>{projection.lineage.semanticBoundary}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={{ marginTop: 0 }}>優先確認・注意シグナル</h3>
        <p style={styles.lead}>
          差異、lineage、証跡をもとに「どれを先に確認するか」を静的に整理します。
          高優先は実行許可ではなく、低優先も safe 判定ではありません。通知、担当割当、
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
              <p style={styles.description}>境界: {attention.executionBoundary}</p>
              <div style={styles.badgeRow}>
                <span style={styles.badge}>{attentionLevelLabel(attention.attentionLevel)}</span>
                <span style={styles.badge}>{reviewPriorityLabel(attention.reviewPriority)}</span>
                <span style={styles.badge}>注意 SEMANTICS ONLY</span>
                <span style={styles.badge}>{attention.semanticBoundary}</span>
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
          ここでのエスカレーションは review routing の候補表示のみです。通知、担当割当、
          承認、監査開始、修正処理には接続しません。
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
          静的に整理します。証跡は correctness guarantee ではなく、evidence execution、
          evidence resolution、auto-fix、rebuild には接続しません。
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
              <p style={styles.description}>境界: {evidence.executionBoundary}</p>
              <div style={styles.badgeRow}>
                <span style={styles.badge}>EVIDENCE SEMANTICS ONLY</span>
                <span style={styles.badge}>{evidenceQualityLabel(evidence.quality)}</span>
                <span style={styles.badge}>{evidenceConfidenceLabel(evidence.confidence)}</span>
                <span style={styles.badge}>{evidence.semanticBoundary}</span>
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
