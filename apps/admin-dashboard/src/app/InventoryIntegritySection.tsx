"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useAuth } from "@/auth/AuthProvider";
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
  getInventoryIntegrityCompletenessSummary,
  getInventoryIntegrityEscalationCandidates,
  getInventoryIntegrityEscalationSummary,
  getInventoryIntegrityEvidence,
  getInventoryIntegrityEvidenceConfidenceSummary,
  getInventoryIntegrityEvidenceGaps,
  getInventoryIntegrityEvidenceQualitySummary,
  getInventoryIntegrityFreshnessSummary,
  getInventoryIntegrityIssues,
  getInventoryIntegrityLevelSummary,
  getInventoryIntegrityReviewReadinessSummary,
  getInventoryIntegrityReviewPrioritySummary,
  getInventoryIntegrityReviewSignals,
  getInventoryIntegritySignals,
  getInventoryIntegritySourceConfidenceSummary,
  getInventoryIntegritySourceGaps,
  getInventoryIntegritySourceRelationSummary,
  getInventoryIntegritySources,
  getInventoryIntegrityStatusSummary,
  getInventoryIntegritySummaries,
} from "./inventoryIntegritySelectors";
import type {
  InventoryCompareSeverity,
  InventoryCompareReason,
  InventoryCompareClassificationMetadata,
  InventoryCompareHardeningMetadata,
  InventoryCompareMismatchClassification,
  InventoryCompareOperatorGuidanceMetadata,
  InventoryCompareOperatorMessageMetadata,
  InventoryCompareOperatorSummaryMetadata,
  InventoryCompareScope,
  InventoryCompareStatus,
  InventoryIntegrityAttentionLevel,
  InventoryIntegrityCompletenessLevel,
  InventoryIntegrityEvidenceConfidence,
  InventoryIntegrityEvidenceQuality,
  InventoryIntegrityFreshnessLevel,
  InventoryIntegrityLevel,
  InventoryIntegrityReadOnlyData,
  InventoryIntegrityReviewReadinessLevel,
  InventoryIntegritySourceConfidence,
  InventoryIntegritySourceRelation,
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
  if (severity === "high") return "差異重要度: 高";
  if (severity === "warning") return "差異重要度: 警戒";
  if (severity === "unverified") return "差異重要度: 未検証";
  return "差異重要度: 参考";
}

function severityStyle(severity: InventoryCompareSeverity): CSSProperties {
  if (severity === "critical") return { borderColor: "#c62828", background: "#ffebee" };
  if (severity === "high") return { borderColor: "#ad1457", background: "#fce4ec" };
  if (severity === "warning" || severity === "unverified") {
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

function compareStatusLabel(status?: InventoryCompareStatus): string {
  if (status === "matched") return "matched";
  if (status === "mismatched") return "mismatched";
  if (status === "missing_projection") return "missing_projection";
  if (status === "orphan_projection") return "orphan_projection";
  return "static_visibility";
}

function mismatchClassificationLabel(
  classification?: InventoryCompareMismatchClassification,
): string {
  if (classification === "quantity_mismatch") return "quantity_mismatch";
  if (classification === "negative_projection") return "negative_projection";
  if (classification === "negative_truth") return "negative_truth";
  if (classification === "stale_projection") return "stale_projection";
  if (classification === "aggregation_mismatch") return "aggregation_mismatch";
  if (classification === "scope_mismatch") return "scope_mismatch";
  if (classification === "compare_unverified") return "compare_unverified";
  if (classification === "compare_partial") return "compare_partial";
  if (classification === "degraded_projection") return "degraded_projection";
  if (classification === "unavailable_projection") return "unavailable_projection";
  return "static_visibility";
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

function freshnessLabel(freshness: InventoryIntegrityFreshnessLevel): string {
  if (freshness === "fresh") return "鮮度: 新しい";
  if (freshness === "stale") return "鮮度: 古い可能性";
  if (freshness === "delayed") return "鮮度: 遅延あり";
  if (freshness === "expired") return "鮮度: 期限切れ";
  return "鮮度: 不明";
}

function completenessLabel(completeness: InventoryIntegrityCompletenessLevel): string {
  if (completeness === "complete") return "揃い具合: 一通りあり";
  if (completeness === "partial") return "揃い具合: 一部のみ";
  if (completeness === "missing") return "揃い具合: 不足あり";
  return "揃い具合: 不明";
}

function reviewReadinessLabel(readiness: InventoryIntegrityReviewReadinessLevel): string {
  if (readiness === "review_ready") return "レビュー可能";
  if (readiness === "partially_ready") return "一部レビュー可能";
  if (readiness === "not_ready") return "レビュー未準備";
  return "レビュー保留";
}

function evidenceQualityStyle(quality: InventoryIntegrityEvidenceQuality): CSSProperties {
  if (quality === "missing") return { borderColor: "#c62828", background: "#ffebee" };
  if (quality === "limited" || quality === "partial") {
    return { borderColor: "#ef6c00", background: "#fff3e0" };
  }
  return { borderColor: "#2e7d32", background: "#e8f5e9" };
}

function sourceRelationLabel(relation: InventoryIntegritySourceRelation): string {
  if (relation === "truth_source") return "真実データ source";
  if (relation === "compare_target") return "比較対象";
  if (relation === "derived_context") return "由来文脈";
  if (relation === "review_context") return "確認文脈";
  return "制限文脈";
}

function sourceConfidenceLabel(confidence: InventoryIntegritySourceConfidence): string {
  if (confidence === "high") return "由来信頼度: 高";
  if (confidence === "medium") return "由来信頼度: 中";
  if (confidence === "low") return "由来信頼度: 低";
  return "由来信頼度: 不明";
}

function semanticBoundaryLabel(boundary: "reasoning_visualization_only"): string {
  return boundary === "reasoning_visualization_only" ? "説明表示のみ" : boundary;
}

function isInventoryIntegrityReadOnlyData(value: unknown): value is InventoryIntegrityReadOnlyData {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<Record<keyof InventoryIntegrityReadOnlyData, unknown>>;
  return (
    Array.isArray(candidate.summaries) &&
    Array.isArray(candidate.issues) &&
    Array.isArray(candidate.signals) &&
    Array.isArray(candidate.compareProjections) &&
    Array.isArray(candidate.attentionProjections) &&
    Array.isArray(candidate.evidenceProjections) &&
    Array.isArray(candidate.sourceMappings)
  );
}

function extractInventoryIntegrityReadOnlyData(value: unknown): InventoryIntegrityReadOnlyData | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as { readonly normalizedData?: unknown };
  return isInventoryIntegrityReadOnlyData(candidate.normalizedData)
    ? candidate.normalizedData
    : null;
}

function extractCompareHardening(value: unknown): InventoryCompareHardeningMetadata | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as { readonly compareHardening?: unknown };
  if (!candidate.compareHardening || typeof candidate.compareHardening !== "object") {
    return null;
  }

  const hardening = candidate.compareHardening as Partial<InventoryCompareHardeningMetadata>;
  return typeof hardening.sourceStatus === "string" &&
    typeof hardening.resultStatus === "string" &&
    typeof hardening.scopeStatus === "string"
    ? (hardening as InventoryCompareHardeningMetadata)
    : null;
}

function extractCompareClassification(
  value: unknown,
): InventoryCompareClassificationMetadata | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as { readonly compareClassification?: unknown };
  if (!candidate.compareClassification || typeof candidate.compareClassification !== "object") {
    return null;
  }

  const classification =
    candidate.compareClassification as Partial<InventoryCompareClassificationMetadata>;
  return typeof classification.classification === "string" &&
    typeof classification.reason === "string"
    ? (classification as InventoryCompareClassificationMetadata)
    : null;
}

function extractCompareOperatorGuidance(
  value: unknown,
): InventoryCompareOperatorGuidanceMetadata | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as { readonly compareOperatorGuidance?: unknown };
  if (!candidate.compareOperatorGuidance || typeof candidate.compareOperatorGuidance !== "object") {
    return null;
  }

  const guidance =
    candidate.compareOperatorGuidance as Partial<InventoryCompareOperatorGuidanceMetadata>;
  return typeof guidance.operatorGuidance === "string" &&
    typeof guidance.guidanceReason === "string"
    ? (guidance as InventoryCompareOperatorGuidanceMetadata)
    : null;
}

function extractCompareOperatorMessage(
  value: unknown,
): InventoryCompareOperatorMessageMetadata | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as { readonly compareOperatorMessage?: unknown };
  if (!candidate.compareOperatorMessage || typeof candidate.compareOperatorMessage !== "object") {
    return null;
  }

  const message =
    candidate.compareOperatorMessage as Partial<InventoryCompareOperatorMessageMetadata>;
  return typeof message.operatorMessage === "string" &&
    typeof message.messageText === "string"
    ? (message as InventoryCompareOperatorMessageMetadata)
    : null;
}

function extractCompareOperatorSummary(
  value: unknown,
): InventoryCompareOperatorSummaryMetadata | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as { readonly compareOperatorSummary?: unknown };
  if (!candidate.compareOperatorSummary || typeof candidate.compareOperatorSummary !== "object") {
    return null;
  }

  const summary =
    candidate.compareOperatorSummary as Partial<InventoryCompareOperatorSummaryMetadata>;
  return typeof summary.operatorSummary === "string" &&
    typeof summary.summaryText === "string"
    ? (summary as InventoryCompareOperatorSummaryMetadata)
    : null;
}

function readableSignals(signals: readonly string[], limit = 4): string {
  const visibleSignals = signals.slice(0, limit).join(" / ");
  return signals.length > limit
    ? `${visibleSignals} / 他 ${signals.length - limit} 件`
    : visibleSignals;
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
  summaryPanel: {
    display: "grid",
    gap: "0.45rem",
  },
  summaryTitle: {
    display: "block",
    fontSize: "1rem",
    fontWeight: 900,
  },
  summaryText: {
    display: "block",
    fontSize: "1.2rem",
    fontWeight: 900,
  },
  supportingText: {
    margin: "0.25rem 0 0",
    color: "#555",
    fontSize: "0.9rem",
    lineHeight: 1.55,
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
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#ddd",
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
  const { session } = useAuth();
  const [data, setData] = useState<InventoryIntegrityReadOnlyData>(() =>
    getInventoryIntegrityMockData(),
  );
  const [compareSourceLabel, setCompareSourceLabel] = useState("static fallback");
  const [compareHardening, setCompareHardening] =
    useState<InventoryCompareHardeningMetadata | null>(null);
  const [compareClassification, setCompareClassification] =
    useState<InventoryCompareClassificationMetadata | null>(null);
  const [compareOperatorGuidance, setCompareOperatorGuidance] =
    useState<InventoryCompareOperatorGuidanceMetadata | null>(null);
  const [compareOperatorMessage, setCompareOperatorMessage] =
    useState<InventoryCompareOperatorMessageMetadata | null>(null);
  const [compareOperatorSummary, setCompareOperatorSummary] =
    useState<InventoryCompareOperatorSummaryMetadata | null>(null);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) {
      setCompareSourceLabel("static fallback");
      setCompareHardening(null);
      setCompareClassification(null);
      setCompareOperatorGuidance(null);
      setCompareOperatorMessage(null);
      setCompareOperatorSummary(null);
      return;
    }

    const controller = new AbortController();

    async function loadCompareVisibility() {
      try {
        const response = await fetch("/api/inventory-integrity/compare-readonly", {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          setCompareSourceLabel("static fallback");
          const responseBody: unknown = await response.json().catch(() => null);
          setCompareHardening(extractCompareHardening(responseBody));
          setCompareClassification(extractCompareClassification(responseBody));
          setCompareOperatorGuidance(extractCompareOperatorGuidance(responseBody));
          setCompareOperatorMessage(extractCompareOperatorMessage(responseBody));
          setCompareOperatorSummary(extractCompareOperatorSummary(responseBody));
          return;
        }

        const responseBody: unknown = await response.json();
        setCompareHardening(extractCompareHardening(responseBody));
        setCompareClassification(extractCompareClassification(responseBody));
        setCompareOperatorGuidance(extractCompareOperatorGuidance(responseBody));
        setCompareOperatorMessage(extractCompareOperatorMessage(responseBody));
        setCompareOperatorSummary(extractCompareOperatorSummary(responseBody));
        const readOnlyData = extractInventoryIntegrityReadOnlyData(responseBody);
        if (!readOnlyData) {
          setCompareSourceLabel("static fallback");
          return;
        }

        setData(readOnlyData);
        setCompareSourceLabel("real read-only compare visibility");
      } catch {
        if (!controller.signal.aborted) {
          setCompareSourceLabel("static fallback");
          setCompareHardening(null);
          setCompareClassification(null);
          setCompareOperatorGuidance(null);
          setCompareOperatorMessage(null);
          setCompareOperatorSummary(null);
        }
      }
    }

    void loadCompareVisibility();

    return () => controller.abort();
  }, [session?.access_token]);

  const summaries = getInventoryIntegritySummaries(data);
  const issues = getInventoryIntegrityIssues(data);
  const signals = getInventoryIntegritySignals(data);
  const compareProjections = getInventoryCompareProjections(data);
  const levelSummary = getInventoryIntegrityLevelSummary(data);
  const statusSummary = getInventoryIntegrityStatusSummary(data);
  const compareSeveritySummary = getInventoryCompareSeveritySummary(data);
  const compareReasonSummary = getInventoryCompareReasonSummary(data);
  const compareScopeSummary = getInventoryCompareScopeSummary(data);
  const freshnessSummary = getInventoryIntegrityFreshnessSummary(data);
  const completenessSummary = getInventoryIntegrityCompletenessSummary(data);
  const reviewReadinessSummary = getInventoryIntegrityReviewReadinessSummary(data);
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
  const sourceMappings = getInventoryIntegritySources(data);
  const sourceRelationSummary = getInventoryIntegritySourceRelationSummary(data);
  const sourceConfidenceSummary = getInventoryIntegritySourceConfidenceSummary(data);
  const sourceGaps = getInventoryIntegritySourceGaps(data);

  return (
    <section style={styles.panel} aria-labelledby="inventory-integrity-heading">
      <div style={styles.header}>
        <div>
          <h2 id="inventory-integrity-heading">在庫整合性</h2>
          <p style={styles.lead}>
            inventory_current と inventory_transactions の整合性を read-only compare visibility
            として確認する参照表示です。inventory_transactions が在庫の真実(truth)であり、
            inventory_current は比較対象の表示用 cache です。差異由来(lineage)、注意シグナル、
            証跡(explainability) は説明表示のみで、修正実行機能ではありません。
          </p>
        </div>
        <div style={styles.badgeRow} aria-label="Inventory integrity boundary">
          <span style={styles.badge}>参照のみ(READ ONLY)</span>
          <span style={styles.badge}>差異比較は表示のみ</span>
          <span style={styles.badge}>差異由来は表示のみ</span>
          <span style={styles.badge}>注意シグナルは表示のみ</span>
          <span style={styles.badge}>証跡は表示のみ</span>
          <span style={styles.badge}>由来データ(source trace)は表示のみ</span>
          <span style={styles.badge}>再構築なし</span>
          <span style={styles.badge}>更新なし</span>
        </div>
      </div>

      <div style={styles.notice}>
        この画面では、GET read-only compare visibility の表示だけを行います。
        inventory_current 更新、再構築(rebuild)、replay、correction は行いません。
        期待現在庫は inventory_transactions から導出する前提です。
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

      <div style={styles.notice}>
        由来データ(source mapping / source trace)は、差異・由来・証跡がどのデータに基づくかを説明する
        静的な参照表示です。source execution、compare execution、rebuild、replay、correction は
        この画面から開始されません。
      </div>

      <div style={{ ...styles.notice, ...styles.neutralNotice }}>
        <div style={styles.summaryPanel}>
          <span style={styles.summaryTitle}>整合性サマリー</span>
          {compareOperatorSummary ? (
            <>
              <span style={styles.summaryText}>{compareOperatorSummary.summaryText}</span>
              <span style={styles.supportingText}>
                operator summary: {compareOperatorSummary.operatorSummary} /{" "}
                {compareOperatorSummary.summaryReason}
              </span>
              <span style={styles.supportingText}>
                source: {compareOperatorSummary.summarySource} / signals:{" "}
                {readableSignals(compareOperatorSummary.summarySignals)}
              </span>
            </>
          ) : null}
          <span style={styles.supportingText}>
            状態 {levelSummary.map((item) => `${levelLabel(item.level)} ${item.count}`).join(", ")}
            {" / "}分類 {statusSummary.map((item) => `${statusLabel(item.status)} ${item.count}`).join(", ")}
          </span>
        </div>
      </div>

      <div style={{ ...styles.notice, ...styles.neutralNotice }}>
        差異比較サマリー: 重要度{" "}
        {compareSeveritySummary.map((item) => `${severityLabel(item.severity)} ${item.count}`).join(", ")}
        {" / "}差異理由 {compareReasonSummary.map((item) => `${reasonLabel(item.reason)} ${item.count}`).join(", ")}
        {" / "}範囲 {compareScopeSummary.map((item) => `${scopeLabel(item.scope)} ${item.count}`).join(", ")}.
        {" / "}source {compareSourceLabel}.
        {compareHardening
          ? ` hardening ${compareHardening.sourceStatus} / ${compareHardening.resultStatus} / ${compareHardening.scopeStatus}.`
          : ""}
        {compareClassification
          ? ` classification ${compareClassification.classification}.`
          : ""}
        {compareOperatorGuidance
          ? ` operator guidance ${compareOperatorGuidance.operatorGuidance}.`
          : ""}
        {compareOperatorMessage
          ? ` operator message ${compareOperatorMessage.operatorMessage}.`
          : ""}
      </div>

      <div style={{ ...styles.notice, ...styles.neutralNotice }}>
        projection metadata サマリー: 鮮度{" "}
        {freshnessSummary.map((item) => `${freshnessLabel(item.freshness)} ${item.count}`).join(", ")}
        {" / "}揃い具合{" "}
        {completenessSummary
          .map((item) => `${completenessLabel(item.completeness)} ${item.count}`)
          .join(", ")}
        {" / "}レビュー可能性{" "}
        {reviewReadinessSummary
          .map((item) => `${reviewReadinessLabel(item.reviewReadiness)} ${item.count}`)
          .join(", ")}
        。metadata は確認材料であり、正しさ保証や実行許可ではありません。
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

      <div style={{ ...styles.notice, ...styles.neutralNotice }}>
        由来データサマリー(source trace): 関係{" "}
        {sourceRelationSummary
          .map((item) => `${sourceRelationLabel(item.relation)} ${item.count}`)
          .join(", ")}
        {" / "}信頼度{" "}
        {sourceConfidenceSummary
          .map((item) => `${sourceConfidenceLabel(item.confidence)} ${item.count}`)
          .join(", ")}
        {" / "}由来不足 {sourceGaps.length}.
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
          期待現在庫と、表示用 cache を read-only に照合した visibility です。修正や再生成は実行しません。
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
          inventory_current と inventory_transactions aggregation の差分を read-only
          visibility として表示します。比較実行(compare execution)、再構築、replay、
          correction は行いません。
        </p>
        <div style={styles.list}>
          {compareProjections.map((projection) => (
            <article
              key={projection.id}
              style={{ ...styles.card, ...severityStyle(projection.difference.severity) }}
            >
              <strong>{projection.label}</strong>
              <p style={styles.description}>{projection.description}</p>
              {projection.metadata.compareOperatorMessage ? (
                <p style={styles.description}>
                  operator message: {projection.metadata.compareOperatorMessage.messageText}
                </p>
              ) : null}
              {projection.metadata.compareOperatorGuidance ? (
                <p style={styles.description}>
                  operator guidance: {projection.metadata.compareOperatorGuidance.operatorGuidance}
                </p>
              ) : null}
              {projection.metadata.compareOwnerActionability ? (
                <p style={styles.description}>
                  owner actionability:{" "}
                  {projection.metadata.compareOwnerActionability.ownerActionability}
                </p>
              ) : null}
              {projection.metadata.compareOwnership ? (
                <p style={styles.description}>
                  ownership: {projection.metadata.compareOwnership.ownership}
                </p>
              ) : null}
              {projection.metadata.compareOperationalPriority ? (
                <p style={styles.description}>
                  operational priority: {projection.metadata.compareOperationalPriority.priority}
                </p>
              ) : null}
              {projection.metadata.compareEscalationReadiness ? (
                <p style={styles.description}>
                  escalation readiness: {projection.metadata.compareEscalationReadiness.readiness}
                </p>
              ) : null}
              {projection.metadata.compareReviewReadiness ? (
                <p style={styles.description}>
                  review readiness: {projection.metadata.compareReviewReadiness.readiness}
                </p>
              ) : null}
              {projection.metadata.compareSeverity ? (
                <p style={styles.description}>
                  severity: {severityLabel(projection.metadata.compareSeverity.severity)}
                </p>
              ) : null}
              <p style={styles.description}>
                classification:{" "}
                {mismatchClassificationLabel(
                  projection.metadata.compareClassification?.classification ??
                    projection.difference.mismatchClassification,
                )}
              </p>
              <p style={styles.description}>
                difference quantity: {projection.difference.differenceQuantity} / 表示用 cache{" "}
                {projection.difference.currentReadModelQuantity} / transaction 集計{" "}
                {projection.difference.transactionAggregationQuantity}
              </p>
              <p style={styles.supportingText}>
                補足: compare status {compareStatusLabel(projection.difference.compareStatus)}
                {projection.metadata.compareHardening
                  ? ` / hardening ${projection.metadata.compareHardening.sourceStatus}, ${projection.metadata.compareHardening.resultStatus}, ${projection.metadata.compareHardening.scopeStatus}`
                  : ""}
              </p>
              {projection.metadata.compareOperatorMessage ? (
                <p style={styles.supportingText}>
                  message reason: {projection.metadata.compareOperatorMessage.messageReason} / source:{" "}
                  {projection.metadata.compareOperatorMessage.messageSource} / signals:{" "}
                  {readableSignals(projection.metadata.compareOperatorMessage.messageSignals)}
                </p>
              ) : null}
              {projection.metadata.compareOperatorGuidance ? (
                <p style={styles.supportingText}>
                  guidance reason: {projection.metadata.compareOperatorGuidance.guidanceReason} / source:{" "}
                  {projection.metadata.compareOperatorGuidance.guidanceSource} / signals:{" "}
                  {readableSignals(projection.metadata.compareOperatorGuidance.guidanceSignals)}
                </p>
              ) : null}
              {projection.metadata.compareOwnerActionability ? (
                <p style={styles.supportingText}>
                  actionability reason:{" "}
                  {projection.metadata.compareOwnerActionability.actionabilityReason} / source:{" "}
                  {projection.metadata.compareOwnerActionability.actionabilitySource} / signals:{" "}
                  {readableSignals(
                    projection.metadata.compareOwnerActionability.actionabilitySignals,
                  )}
                </p>
              ) : null}
              {projection.metadata.compareOwnership ? (
                <p style={styles.supportingText}>
                  ownership reason: {projection.metadata.compareOwnership.ownershipReason} / source:{" "}
                  {projection.metadata.compareOwnership.ownershipSource} / signals:{" "}
                  {readableSignals(projection.metadata.compareOwnership.ownershipSignals)}
                </p>
              ) : null}
              {projection.metadata.compareOperationalPriority ? (
                <p style={styles.supportingText}>
                  priority reason: {projection.metadata.compareOperationalPriority.reason}
                </p>
              ) : null}
              {projection.metadata.compareEscalationReadiness ? (
                <p style={styles.supportingText}>
                  escalation reason: {projection.metadata.compareEscalationReadiness.reason}
                </p>
              ) : null}
              {projection.metadata.compareReviewReadiness ? (
                <p style={styles.supportingText}>
                  review reason: {projection.metadata.compareReviewReadiness.reason}
                </p>
              ) : null}
              {projection.metadata.compareSeverity ? (
                <p style={styles.supportingText}>
                  severity reason: {projection.metadata.compareSeverity.reason}
                </p>
              ) : null}
              {projection.metadata.compareClassification ? (
                <p style={styles.supportingText}>
                  classification reason: {projection.metadata.compareClassification.reason}
                </p>
              ) : null}
              <p style={styles.description}>truth の見方: {projection.truthStatement}</p>
              <p style={styles.description}>
                観測時点(snapshot): {projection.metadata.snapshot.snapshotId} /{" "}
                {projection.metadata.snapshot.limitation}
              </p>
              <p style={styles.description}>
                追跡(traceability): {projection.metadata.traceability.sourceTraceLabel} /{" "}
                {projection.metadata.traceability.caveat}
              </p>
              <p style={styles.description}>
                レビュー可能性: {projection.metadata.reviewReadiness.reason} /{" "}
                {projection.metadata.reviewReadiness.caveat}
              </p>
              <p style={styles.description}>実行しないこと: {projection.metadata.executionBoundary}</p>
              <div style={styles.badgeRow}>
                <span style={styles.badge}>{severityLabel(projection.difference.severity)}</span>
                <span style={styles.badge}>差異理由: {reasonLabel(projection.difference.reason)}</span>
                <span style={styles.badge}>範囲: {scopeLabel(projection.scope)}</span>
                <span style={styles.badge}>{freshnessLabel(projection.metadata.freshness.level)}</span>
                <span style={styles.badge}>
                  {completenessLabel(projection.metadata.completeness.level)}
                </span>
                <span style={styles.badge}>
                  {reviewReadinessLabel(projection.metadata.reviewReadiness.level)}
                </span>
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
                由来: {evidence.metadata.source.label} / {evidence.metadata.source.semanticMeaning}
              </p>
              <p style={styles.description}>実行しないこと: {evidence.metadata.executionBoundary}</p>
              <div style={styles.badgeRow}>
                <span style={styles.badge}>証跡は表示のみ</span>
                <span style={styles.badge}>{evidenceQualityLabel(evidence.quality)}</span>
                <span style={styles.badge}>
                  {evidenceConfidenceLabel(evidence.metadata.confidence.level)}
                </span>
                <span style={styles.badge}>{semanticBoundaryLabel(evidence.metadata.semanticBoundary)}</span>
              </div>
              <div style={styles.list}>
                {evidence.metadata.gaps.map((gap) => (
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
        <h3 style={{ marginTop: 0 }}>由来データ(source trace)</h3>
        <p style={styles.lead}>
          差異、差異由来(lineage)、証跡が、どのデータに由来するかを静的に整理します。
          inventory_transactions は truth、inventory_current は比較対象 cache です。由来データ(source mapping)は
          説明表示のみで、source 実行やデータ更新には接続しません。
        </p>
        <div style={styles.list}>
          {sourceMappings.map((source) => (
            <article key={source.id} style={styles.card}>
              <strong>{source.label}</strong>
              <p style={styles.description}>由来データ: {source.sourceName}</p>
              <p style={styles.description}>説明: {source.explanation}</p>
              <p style={styles.description}>実行しないこと: {source.executionBoundary}</p>
              <div style={styles.badgeRow}>
                <span style={styles.badge}>由来データは表示のみ</span>
                <span style={styles.badge}>{sourceRelationLabel(source.relation)}</span>
                <span style={styles.badge}>{sourceConfidenceLabel(source.confidence)}</span>
                <span style={styles.badge}>{semanticBoundaryLabel(source.semanticBoundary)}</span>
              </div>
              <div style={styles.list}>
                {source.gaps.map((gap) => (
                  <div key={gap.id} style={styles.card}>
                    <strong>由来不足: {gap.label}</strong>
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
