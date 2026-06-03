"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { inventoryIntegrityGraphMockData } from "./inventoryIntegrityGraphMockData";
import { StaticGraphPrototype } from "./StaticGraphPrototype";
import type {
  InventoryIntegrityGraphInspectorTab,
  InventoryIntegrityGraphSeverity,
  InventoryIntegrityGraphSummary,
  InventoryIntegrityGraphViewMode,
} from "./inventoryIntegrityGraphTypes";

const graphData = inventoryIntegrityGraphMockData;

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
  badgeRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.45rem",
    alignItems: "center",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    border: "1px solid #90a4ae",
    borderRadius: "999px",
    padding: "0.25rem 0.55rem",
    background: "#f5f7fb",
    color: "#333",
    fontSize: "0.78rem",
    fontWeight: 800,
  },
  readOnlyBadge: {
    borderColor: "#0d47a1",
    background: "#e3f2fd",
    color: "#0d47a1",
  },
  noExecutionBadge: {
    borderColor: "#1b5e20",
    background: "#e8f5e9",
    color: "#1b5e20",
  },
  breadcrumb: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.35rem",
    alignItems: "center",
    margin: "1rem 0",
    padding: "0.75rem",
    border: "1px dashed #90a4ae",
    borderRadius: "12px",
    background: "#f5f7fb",
  },
  breadcrumbButton: {
    border: "1px solid #cfd8dc",
    borderRadius: "999px",
    padding: "0.3rem 0.6rem",
    background: "#fff",
    color: "#263238",
    cursor: "pointer",
    fontWeight: 700,
  },
  layoutGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(18rem, 0.9fr) minmax(22rem, 1.6fr)",
    gap: "1rem",
    alignItems: "stretch",
    minWidth: 0,
  },
  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(18rem, 0.9fr) minmax(22rem, 1.6fr)",
    gap: "1rem",
    marginTop: "1rem",
  },
  card: {
    padding: "0.9rem",
    border: "1px solid #ddd",
    borderRadius: "12px",
    background: "#fff",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
  },
  cardGrid: {
    display: "grid",
    gap: "0.75rem",
  },
  cardTitle: {
    margin: 0,
    color: "#555",
    fontSize: "0.88rem",
    fontWeight: 800,
  },
  cardValue: {
    display: "block",
    marginTop: "0.35rem",
    fontSize: "1.3rem",
    fontWeight: 900,
  },
  cardDescription: {
    margin: "0.45rem 0 0",
    color: "#555",
    lineHeight: 1.5,
  },
  sectionBox: {
    padding: "1rem",
    border: "1px solid #ddd",
    borderRadius: "12px",
    background: "#fafafa",
  },
  canvas: {
    display: "grid",
    gap: "0.75rem",
    minHeight: "29rem",
    minWidth: 0,
    padding: "1rem",
    border: "1px dashed #90a4ae",
    borderRadius: "12px",
    background: "#f5f7fb",
    overflow: "hidden",
  },
  filterButton: {
    width: "100%",
    marginTop: "0.45rem",
    padding: "0.55rem 0.7rem",
    border: "1px solid #cfd8dc",
    borderRadius: "999px",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 800,
    textAlign: "left",
  },
  activeFilterButton: {
    borderColor: "#1976d2",
    background: "#e3f2fd",
    color: "#0d47a1",
  },
  inspectorGrid: {
    display: "grid",
    gap: "0.65rem",
    marginTop: "0.75rem",
  },
  inspectorRow: {
    padding: "0.7rem",
    border: "1px solid #e0e0e0",
    borderRadius: "10px",
    background: "#fff",
  },
  legendGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))",
    gap: "0.5rem",
    marginTop: "0.75rem",
  },
};

function cardToneStyle(severity: InventoryIntegrityGraphSeverity): CSSProperties {
  if (severity === "critical") {
    return { borderColor: "#c62828", background: "#ffebee", color: "#7f0000" };
  }

  if (severity === "warning") {
    return { borderColor: "#ef6c00", background: "#fff3e0", color: "#5d3900" };
  }

  if (severity === "stable") {
    return { borderColor: "#2e7d32", background: "#e8f5e9", color: "#1b5e20" };
  }

  return { borderColor: "#90caf9", background: "#e3f2fd", color: "#0d47a1" };
}

function SummaryCard({
  card,
  selected,
  onSelect,
}: {
  readonly card: InventoryIntegrityGraphSummary;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  return (
    <button
      type="button"
      style={{
        ...styles.card,
        ...cardToneStyle(card.severity),
        outline: selected ? "3px solid #263238" : undefined,
      }}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <p style={styles.cardTitle}>{card.title}</p>
      <span style={styles.cardValue}>{card.value}</span>
      <p style={styles.cardDescription}>{card.description}</p>
    </button>
  );
}

function BoundaryBadges() {
  return (
    <div style={styles.badgeRow} aria-label="Graph UI boundary">
      <span style={{ ...styles.badge, ...styles.readOnlyBadge }}>
        Read Only / 読み取り専用
      </span>
      <span style={{ ...styles.badge, ...styles.noExecutionBadge }}>
        Observability Only / 観測専用
      </span>
      <span style={{ ...styles.badge, ...styles.noExecutionBadge }}>
        No Execution Controls / 実行操作なし
      </span>
      <span style={styles.badge}>Mock Data / モックデータ</span>
      <span style={styles.badge}>No API / API 接続なし</span>
      <span style={styles.badge}>No DB / DB 接続なし</span>
      <span style={styles.badge}>No Mutation / データ変更なし</span>
    </div>
  );
}

export function InventoryIntegrityGraphSection() {
  const [activeViewMode, setActiveViewMode] =
    useState<InventoryIntegrityGraphViewMode>("overview");
  const [activeLayer] = useState(graphData.metadata.activeLayer);
  const [selectedSummaryId, setSelectedSummaryId] = useState(
    graphData.defaultSummaryId,
  );
  const [selectedNodeId, setSelectedNodeId] = useState(graphData.defaultNodeId);
  const [selectedEdgeId, setSelectedEdgeId] = useState(graphData.defaultEdgeId);
  const [activeInspectorTab, setActiveInspectorTab] =
    useState<InventoryIntegrityGraphInspectorTab>("node");
  const [highlightedPathId, setHighlightedPathId] = useState(
    graphData.defaultHighlightedPathId,
  );
  const selectedSummary =
    graphData.summaries.find((card) => card.id === selectedSummaryId) ??
    graphData.summaries[0];
  const selectedNode =
    graphData.nodes.find((node) => node.id === selectedNodeId) ?? graphData.nodes[0];
  const selectedEdge =
    graphData.edges.find((edge) => edge.id === selectedEdgeId) ?? graphData.edges[0];
  const selectedEdgeFromLabel =
    graphData.nodes.find((node) => node.id === selectedEdge.from)?.label ??
    selectedEdge.from;
  const selectedEdgeToLabel =
    graphData.nodes.find((node) => node.id === selectedEdge.to)?.label ??
    selectedEdge.to;

  const inspectorRows = useMemo(() => {
    if (activeInspectorTab === "summary") {
      return [
        ["選択中要約 / Selected Summary", selectedSummary.title],
        ["値 / Value", selectedSummary.value],
        ["理由 / Reason", selectedSummary.description],
        ["Severity", selectedSummary.severity],
        ["根拠 / Source", "mock model / モックモデル"],
        ["境界 / Boundary", graphData.metadata.readOnlyBoundary],
      ];
    }

    if (activeInspectorTab === "edge") {
      return [
        ["選択中エッジ / Selected Edge", selectedEdge.label],
        ["表示ラベル / Display Label", selectedEdge.displayLabel],
        ["エッジ種別 / Edge Type", selectedEdge.type],
        ["Semantic Category", selectedEdge.semanticCategory],
        ["経路の意味 / Path Meaning", selectedEdge.pathMeaning],
        ["From Node", selectedEdgeFromLabel],
        ["To Node", selectedEdgeToLabel],
        ["理由 / Reason", selectedEdge.description],
        ["Read-only Meaning", selectedEdge.readOnlyMeaning],
        [
          "観測境界 / Observability Boundary",
          "観測用の意味関係です / Observability Semantic Relation",
        ],
        [
          "No Execution Route",
          "実行経路ではありません / No Execution Route",
        ],
        ["Severity", selectedEdge.severity],
        ["根拠 / Source", selectedEdge.source ?? "mock model / モックモデル"],
      ];
    }

    return [
      ["選択中ノード / Selected Node", selectedNode.label],
      ["種別 / Type", selectedNode.type],
      ["Semantic Value", selectedNode.value],
      ["Severity", selectedNode.severity],
      ["理由 / Reason", selectedNode.reason],
      ["根拠 / Source", selectedNode.source],
      ["シグナル / Signals", selectedNode.signals.join(", ")],
    ];
  }, [
    activeInspectorTab,
    selectedEdge,
    selectedEdgeFromLabel,
    selectedEdgeToLabel,
    selectedNode,
    selectedSummary,
  ]);

  function selectSummary(summaryId: string) {
    const summary = graphData.summaries.find((item) => item.id === summaryId);
    setSelectedSummaryId(summaryId);
    if (summary?.relatedNodeId) {
      setSelectedNodeId(summary.relatedNodeId);
    }
    setActiveInspectorTab("summary");
    setHighlightedPathId(summary?.relatedPathId ?? graphData.defaultHighlightedPathId);
  }

  function selectNode(nodeId: string) {
    setSelectedNodeId(nodeId);
    setActiveInspectorTab("node");
  }

  function selectEdge(edgeId: string) {
    setSelectedEdgeId(edgeId);
    setActiveInspectorTab("edge");
  }

  function selectBreadcrumb(target: InventoryIntegrityGraphInspectorTab) {
    setActiveInspectorTab(target);
  }

  return (
    <section style={styles.panel} aria-labelledby="inventory-integrity-graph-heading">
      <div style={styles.header}>
        <div>
          <h2 id="inventory-integrity-graph-heading">{graphData.metadata.title}</h2>
          <p style={styles.lead}>
            Inventory Integrity Governance Semantic Graph の読み取り専用 UI です。
            Graph Engine、API、DB、Mutation は接続していません。
          </p>
        </div>
        <BoundaryBadges />
      </div>

      <div style={styles.badgeRow} aria-label="Current graph context">
        <span style={styles.badge}>概要表示 / Overview View</span>
        <span style={styles.badge}>{activeLayer}</span>
        <span style={styles.badge}>表示モード / Active View: {activeViewMode}</span>
        <span style={styles.badge}>強調パス / Highlighted Path: {highlightedPathId}</span>
        <span style={styles.badge}>
          Compare Endpoint: {graphData.metadata.compareEndpointMethod} only
        </span>
      </div>

      <nav style={styles.breadcrumb} aria-label="Graph breadcrumb">
        <button
          type="button"
          style={styles.breadcrumbButton}
          onClick={() => selectBreadcrumb("summary")}
        >
          グラフ要約 / Graph Summary
        </button>
        <span aria-hidden="true">&gt;</span>
        <button
          type="button"
          style={styles.breadcrumbButton}
          onClick={() => selectSummary("collapse")}
        >
          崩壊傾向 / Collapse Summary
        </button>
        <span aria-hidden="true">&gt;</span>
        <button
          type="button"
          style={styles.breadcrumbButton}
          onClick={() => selectBreadcrumb("node")}
        >
          ノード詳細 / Node Detail
        </button>
      </nav>

      <div style={styles.layoutGrid}>
        <section style={styles.sectionBox} aria-labelledby="graph-summary-panel-heading">
          <h3 id="graph-summary-panel-heading">要約パネル / Summary Panel</h3>
          <p style={styles.lead}>
            静的 mock summary を表示します。クリックは local state の表示切替のみです。
          </p>
          <div style={styles.cardGrid}>
            {graphData.summaries.map((card) => (
              <SummaryCard
                key={card.id}
                card={card}
                selected={selectedSummaryId === card.id}
                onSelect={() => selectSummary(card.id)}
              />
            ))}
          </div>
        </section>

        <section style={styles.canvas} aria-labelledby="static-graph-prototype-heading">
          <h3 id="static-graph-prototype-heading">
            静的グラフ試作 + SVG関係線 / Static Graph + SVG Relation Overlay
          </h3>
          <StaticGraphPrototype
            nodes={graphData.nodes}
            edges={graphData.edges}
            edgeSemanticsLegend={graphData.edgeSemanticsLegend}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            highlightedPathId={highlightedPathId}
            activeViewMode={activeViewMode}
            onSelectNode={selectNode}
            onSelectEdge={selectEdge}
          />
        </section>
      </div>

      <div style={styles.bottomGrid}>
        <aside style={styles.sectionBox} aria-labelledby="graph-filter-panel-heading">
          <h3 id="graph-filter-panel-heading">表示フィルター / Filter Panel</h3>
          <p style={styles.lead}>
            静的 mock UI です。フィルター操作は local state の表示切替のみです。
          </p>
          {graphData.viewModes.map((view) => (
            <button
              key={view.id}
              type="button"
              style={{
                ...styles.filterButton,
                ...(activeViewMode === view.id ? styles.activeFilterButton : {}),
              }}
              onClick={() => setActiveViewMode(view.id)}
              aria-pressed={activeViewMode === view.id}
            >
              {view.label}
            </button>
          ))}

          <section style={{ marginTop: "1rem" }} aria-labelledby="graph-legend-heading">
            <h3 id="graph-legend-heading">凡例 / Legend</h3>
            <div style={styles.legendGrid}>
              <span style={{ ...styles.badge, ...cardToneStyle("critical") }}>
                重大 / Critical
              </span>
              <span style={{ ...styles.badge, ...cardToneStyle("warning") }}>
                注意 / Warning
              </span>
              <span style={{ ...styles.badge, ...cardToneStyle("stable") }}>
                安定 / Stable
              </span>
              <span style={{ ...styles.badge, ...styles.readOnlyBadge }}>
                Read Only / 読み取り専用
              </span>
              <span style={{ ...styles.badge, ...styles.noExecutionBadge }}>
                Observability Only / 観測専用
              </span>
              <span style={styles.badge}>No Execution Controls / 実行操作なし</span>
              <span style={styles.badge}>No Mutation / データ変更なし</span>
              <span style={styles.badge}>SVG Relation Overlay / SVG関係線</span>
              <span style={styles.badge}>Edge Semantics / 関係線の意味</span>
              <span style={styles.badge}>Observability Path Only / 観測用経路のみ</span>
              <span style={styles.badge}>No Execution Route / 実行経路ではありません</span>
              <span style={styles.badge}>Local State / 画面内状態</span>
            </div>
          </section>
        </aside>

        <section style={styles.sectionBox} aria-labelledby="graph-inspector-panel-heading">
          <div style={styles.header}>
            <div>
              <h3 id="graph-inspector-panel-heading">詳細確認 / Inspector Panel</h3>
              <p style={styles.lead}>
                静的 mock metadata を確認します。Inspector の切替は表示変更のみです。
              </p>
            </div>
            <BoundaryBadges />
          </div>

          <div style={styles.badgeRow} aria-label="Inspector tabs">
            {(["summary", "node", "edge"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                style={{
                  ...styles.filterButton,
                  width: "auto",
                  ...(activeInspectorTab === tab ? styles.activeFilterButton : {}),
                }}
                onClick={() => setActiveInspectorTab(tab)}
                aria-pressed={activeInspectorTab === tab}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={styles.inspectorGrid}>
            {inspectorRows.map(([label, value]) => (
              <div key={label} style={styles.inspectorRow}>
                <strong>{label}:</strong>
                <div>{value}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
