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
  getInventoryIntegrityIssues,
  getInventoryIntegrityLevelSummary,
  getInventoryIntegritySignals,
  getInventoryIntegrityStatusSummary,
  getInventoryIntegritySummaries,
} from "./inventoryIntegritySelectors";
import type { InventoryCompareSeverity, InventoryIntegrityLevel } from "./inventoryIntegrityTypes";

function levelLabel(level: InventoryIntegrityLevel): string {
  if (level === "degraded") return "整合性: degraded";
  if (level === "limited") return "整合性: limited";
  if (level === "watch") return "整合性: watch";
  return "整合性: stable";
}

function levelStyle(level: InventoryIntegrityLevel): CSSProperties {
  if (level === "degraded") return { borderColor: "#c62828", background: "#ffebee" };
  if (level === "limited" || level === "watch") {
    return { borderColor: "#ef6c00", background: "#fff3e0" };
  }
  return { borderColor: "#2e7d32", background: "#e8f5e9" };
}

function severityLabel(severity: InventoryCompareSeverity): string {
  if (severity === "critical") return "差異重要度: critical";
  if (severity === "warning") return "差異重要度: warning";
  if (severity === "watch") return "差異重要度: watch";
  return "差異重要度: info";
}

function severityStyle(severity: InventoryCompareSeverity): CSSProperties {
  if (severity === "critical") return { borderColor: "#c62828", background: "#ffebee" };
  if (severity === "warning" || severity === "watch") {
    return { borderColor: "#ef6c00", background: "#fff3e0" };
  }
  return { borderColor: "#90caf9", background: "#e3f2fd" };
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

  return (
    <section style={styles.panel} aria-labelledby="inventory-integrity-heading">
      <div style={styles.header}>
        <div>
          <h2 id="inventory-integrity-heading">在庫整合性 Inventory Integrity</h2>
          <p style={styles.lead}>
            inventory_current と inventory_transactions の整合性を将来 compare するための静的な
            read-only scaffold です。inventory_current は source of truth ではなく、
            inventory_transactions が在庫の truth です。lineage は差異理由を説明するための
            reasoning visualization であり、execution ではありません。
          </p>
        </div>
        <div style={styles.badgeRow} aria-label="Inventory integrity boundary">
          <span style={styles.badge}>READ ONLY</span>
          <span style={styles.badge}>COMPARE SEMANTICS ONLY</span>
          <span style={styles.badge}>LINEAGE SEMANTICS ONLY</span>
          <span style={styles.badge}>NO REBUILD</span>
          <span style={styles.badge}>NO MUTATION</span>
        </div>
      </div>

      <div style={styles.notice}>
        この画面はデータ取得、live compare、inventory_current 更新、rebuild、replay、correction
        を行いません。将来の比較では inventory_transactions から expected current quantity を
        導出する前提です。
      </div>

      <div style={styles.notice}>
        compare projection と lineage は reasoning visualization であり execution ではありません。
        inventory_transactions は truth aggregation source、inventory_current は compare target/cache
        です。
      </div>

      <div style={{ ...styles.notice, ...styles.neutralNotice }}>
        整合性サマリー: level {levelSummary.map((item) => `${item.level} ${item.count}`).join(", ")}
        {" / "}status {statusSummary.map((item) => `${item.status} ${item.count}`).join(", ")}.
      </div>

      <div style={{ ...styles.notice, ...styles.neutralNotice }}>
        compare projection サマリー: 重要度{" "}
        {compareSeveritySummary.map((item) => `${item.severity} ${item.count}`).join(", ")}
        {" / "}差異理由 {compareReasonSummary.map((item) => `${item.reason} ${item.count}`).join(", ")}
        {" / "}scope {compareScopeSummary.map((item) => `${item.scope} ${item.count}`).join(", ")}.
      </div>

      <div style={{ ...styles.notice, ...styles.neutralNotice }}>
        lineage サマリー: trace {compareLineageGraph.length} / dependency{" "}
        {compareDependencies.length} / 証跡 {compareEvidenceItems.length}. lineage / trace /
        dependency は説明用 metadata であり、live compare や rebuild を開始しません。
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
        <h3 style={{ marginTop: 0 }}>差異理由 / compare semantics</h3>
        <p style={styles.lead}>
          compare は inventory_current を truth として扱わず、inventory_transactions から導出した
          expected current quantity と read model を照合する考え方です。
        </p>
        <div style={styles.list}>
          {issues.map((issue) => (
            <article key={issue.id} style={{ ...styles.card, ...levelStyle(issue.level) }}>
              <strong>{issue.title}</strong>
              <p style={styles.description}>{issue.description}</p>
              <p style={styles.description}>read model signal: {issue.currentReadModelSignal}</p>
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
        <h3 style={{ marginTop: 0 }}>compare projection</h3>
        <p style={styles.lead}>
          静的な projection として、inventory_current を inventory_transactions aggregation と将来どう
          比較できるかを説明します。compare execution は実行せず、rebuild、replay、correction
          action も生成しません。
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
              <p style={styles.description}>truth: {projection.truthStatement}</p>
              <p style={styles.description}>境界: {projection.executionBoundary}</p>
              <div style={styles.badgeRow}>
                <span style={styles.badge}>{severityLabel(projection.difference.severity)}</span>
                <span style={styles.badge}>差異理由: {projection.difference.reason}</span>
                <span style={styles.badge}>scope: {projection.scope}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={{ marginTop: 0 }}>lineage / trace / 依存関係 / 証跡</h3>
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
                <span style={styles.badge}>LINEAGE SEMANTICS ONLY</span>
                <span style={styles.badge}>{projection.lineage.semanticBoundary}</span>
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
