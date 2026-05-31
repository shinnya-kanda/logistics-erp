"use client";

import { useMemo, useState, type CSSProperties } from "react";

type ViewMode =
  | "overview"
  | "collapse"
  | "convergence"
  | "survivability"
  | "sustainability"
  | "maintainability"
  | "evolvability";

type InspectorTab = "summary" | "node" | "edge";

type SummaryCardData = {
  readonly id: string;
  readonly title: string;
  readonly value: string;
  readonly description: string;
  readonly tone: "critical" | "warning" | "stable" | "neutral";
};

type MockNode = {
  readonly id: string;
  readonly label: string;
  readonly type: string;
  readonly value: string;
  readonly reason: string;
  readonly source: string;
  readonly signals: readonly string[];
};

type MockEdge = {
  readonly id: string;
  readonly label: string;
  readonly from: string;
  readonly to: string;
  readonly reason: string;
};

const viewModes: ReadonlyArray<{ id: ViewMode; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "collapse", label: "Collapse" },
  { id: "convergence", label: "Convergence" },
  { id: "survivability", label: "Survivability" },
  { id: "sustainability", label: "Sustainability" },
  { id: "maintainability", label: "Maintainability" },
  { id: "evolvability", label: "Evolvability" },
];

const summaryCards: readonly SummaryCardData[] = [
  {
    id: "graph-health",
    title: "Graph Health",
    value: "Degraded",
    description: "Mock overview shows limited continuity signals.",
    tone: "warning",
  },
  {
    id: "graph-risk",
    title: "Graph Risk",
    value: "Elevated Risk",
    description: "Risk is shown as observability metadata only.",
    tone: "warning",
  },
  {
    id: "collapse",
    title: "Collapse",
    value: "Broken Continuity",
    description: "Collapse summary is prioritized before positive signals.",
    tone: "critical",
  },
  {
    id: "convergence",
    title: "Convergence",
    value: "Partially Converged",
    description: "Positive direction remains subdued and contextual.",
    tone: "neutral",
  },
  {
    id: "survivability",
    title: "Survivability",
    value: "Fragile",
    description: "Long-term viability is readable with caveats.",
    tone: "warning",
  },
  {
    id: "sustainability",
    title: "Sustainability",
    value: "Conditional",
    description: "Persistence depends on support context.",
    tone: "neutral",
  },
  {
    id: "maintainability",
    title: "Maintainability",
    value: "Conditional",
    description: "Maintenance capacity is not a maintenance workflow.",
    tone: "neutral",
  },
  {
    id: "evolvability",
    title: "Evolvability",
    value: "Limited",
    description: "Future extension safety is not implementation permission.",
    tone: "neutral",
  },
];

const mockNodes: readonly MockNode[] = [
  {
    id: "node-collapse-continuity",
    label: "Broken Continuity",
    type: "collapse",
    value: "broken_continuity",
    reason: "continuity degraded",
    source: "mock data",
    signals: ["continuity", "recoverability", "boundary"],
  },
  {
    id: "node-convergence-partial",
    label: "Partial Convergence",
    type: "convergence",
    value: "partially_converged",
    reason: "support signals remain limited",
    source: "mock data",
    signals: ["confidence", "freshness", "evidence"],
  },
  {
    id: "node-evolvability-limited",
    label: "Limited Evolvability",
    type: "evolvability",
    value: "limited",
    reason: "maintainability context is conditional",
    source: "mock data",
    signals: ["maintainability", "support", "future extension"],
  },
];

const mockEdges: readonly MockEdge[] = [
  {
    id: "edge-collapse-convergence",
    label: "Collapse caveat to convergence",
    from: "Broken Continuity",
    to: "Partial Convergence",
    reason: "collapse context limits positive interpretation",
  },
  {
    id: "edge-maintainability-evolvability",
    label: "Maintainability context to evolvability",
    from: "Conditional Maintainability",
    to: "Limited Evolvability",
    reason: "future extension remains bounded by support context",
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
    padding: "1rem",
    border: "1px dashed #90a4ae",
    borderRadius: "12px",
    background: "#f5f7fb",
  },
  placeholderCenter: {
    display: "grid",
    gap: "0.35rem",
    placeItems: "center",
    padding: "1.25rem",
    border: "1px solid #cfd8dc",
    borderRadius: "12px",
    background: "#fff",
    textAlign: "center",
  },
  mockGraphList: {
    display: "grid",
    gap: "0.5rem",
  },
  mockNodeButton: {
    border: "1px solid #cfd8dc",
    borderRadius: "12px",
    padding: "0.75rem",
    background: "#fff",
    cursor: "pointer",
    textAlign: "left",
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

function cardToneStyle(tone: SummaryCardData["tone"]): CSSProperties {
  if (tone === "critical") {
    return { borderColor: "#c62828", background: "#ffebee", color: "#7f0000" };
  }

  if (tone === "warning") {
    return { borderColor: "#ef6c00", background: "#fff3e0", color: "#5d3900" };
  }

  if (tone === "stable") {
    return { borderColor: "#2e7d32", background: "#e8f5e9", color: "#1b5e20" };
  }

  return { borderColor: "#90caf9", background: "#e3f2fd", color: "#0d47a1" };
}

function SummaryCard({
  card,
  selected,
  onSelect,
}: {
  readonly card: SummaryCardData;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  return (
    <button
      type="button"
      style={{
        ...styles.card,
        ...cardToneStyle(card.tone),
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
      <span style={{ ...styles.badge, ...styles.readOnlyBadge }}>Read Only</span>
      <span style={{ ...styles.badge, ...styles.noExecutionBadge }}>
        Observability Only
      </span>
      <span style={{ ...styles.badge, ...styles.noExecutionBadge }}>
        No Execution Controls
      </span>
      <span style={styles.badge}>Mock Data</span>
    </div>
  );
}

export function InventoryIntegrityGraphSection() {
  const [activeViewMode, setActiveViewMode] = useState<ViewMode>("overview");
  const [activeLayer] = useState("Governance Layer");
  const [selectedSummaryId, setSelectedSummaryId] = useState("collapse");
  const [selectedNodeId, setSelectedNodeId] = useState("node-collapse-continuity");
  const [selectedEdgeId, setSelectedEdgeId] = useState("edge-collapse-convergence");
  const [activeInspectorTab, setActiveInspectorTab] = useState<InspectorTab>("node");
  const [highlightedPathId, setHighlightedPathId] = useState("path-collapse");
  const selectedSummary =
    summaryCards.find((card) => card.id === selectedSummaryId) ?? summaryCards[0];
  const selectedNode =
    mockNodes.find((node) => node.id === selectedNodeId) ?? mockNodes[0];
  const selectedEdge =
    mockEdges.find((edge) => edge.id === selectedEdgeId) ?? mockEdges[0];

  const inspectorRows = useMemo(() => {
    if (activeInspectorTab === "summary") {
      return [
        ["Selected Summary", selectedSummary.title],
        ["Value", selectedSummary.value],
        ["Reason", selectedSummary.description],
        ["Source", "mock data"],
        ["Boundary", "Read Only / Observability Only"],
      ];
    }

    if (activeInspectorTab === "edge") {
      return [
        ["Selected Edge", selectedEdge.label],
        ["From", selectedEdge.from],
        ["To", selectedEdge.to],
        ["Reason", selectedEdge.reason],
        ["Source", "mock data"],
      ];
    }

    return [
      ["Selected Node", selectedNode.label],
      ["Type", selectedNode.type],
      ["Value", selectedNode.value],
      ["Reason", selectedNode.reason],
      ["Source", selectedNode.source],
      ["Signals", selectedNode.signals.join(", ")],
    ];
  }, [activeInspectorTab, selectedEdge, selectedNode, selectedSummary]);

  function selectSummary(summaryId: string) {
    setSelectedSummaryId(summaryId);
    setActiveInspectorTab("summary");
    setHighlightedPathId(summaryId === "collapse" ? "path-collapse" : "path-summary");
  }

  function selectNode(nodeId: string) {
    setSelectedNodeId(nodeId);
    setActiveInspectorTab("node");
  }

  function selectEdge(edgeId: string) {
    setSelectedEdgeId(edgeId);
    setActiveInspectorTab("edge");
  }

  function selectBreadcrumb(target: InspectorTab) {
    setActiveInspectorTab(target);
  }

  return (
    <section style={styles.panel} aria-labelledby="inventory-integrity-graph-heading">
      <div style={styles.header}>
        <div>
          <h2 id="inventory-integrity-graph-heading">Inventory Integrity Graph</h2>
          <p style={styles.lead}>
            Inventory Integrity Governance Semantic Graph の read-only UI skeleton
            です。Graph Engine、API、DB、Mutation は接続していません。
          </p>
        </div>
        <BoundaryBadges />
      </div>

      <div style={styles.badgeRow} aria-label="Current graph context">
        <span style={styles.badge}>Overview View</span>
        <span style={styles.badge}>{activeLayer}</span>
        <span style={styles.badge}>Active View: {activeViewMode}</span>
        <span style={styles.badge}>Highlighted Path: {highlightedPathId}</span>
      </div>

      <nav style={styles.breadcrumb} aria-label="Graph breadcrumb">
        <button
          type="button"
          style={styles.breadcrumbButton}
          onClick={() => selectBreadcrumb("summary")}
        >
          Graph Summary
        </button>
        <span aria-hidden="true">&gt;</span>
        <button
          type="button"
          style={styles.breadcrumbButton}
          onClick={() => selectSummary("collapse")}
        >
          Collapse Summary
        </button>
        <span aria-hidden="true">&gt;</span>
        <button
          type="button"
          style={styles.breadcrumbButton}
          onClick={() => selectBreadcrumb("node")}
        >
          Node Detail
        </button>
      </nav>

      <div style={styles.layoutGrid}>
        <section style={styles.sectionBox} aria-labelledby="graph-summary-panel-heading">
          <h3 id="graph-summary-panel-heading">Summary Panel</h3>
          <p style={styles.lead}>
            Static mock summary cards. Summary click updates local state only.
          </p>
          <div style={styles.cardGrid}>
            {summaryCards.map((card) => (
              <SummaryCard
                key={card.id}
                card={card}
                selected={selectedSummaryId === card.id}
                onSelect={() => selectSummary(card.id)}
              />
            ))}
          </div>
        </section>

        <section style={styles.canvas} aria-labelledby="graph-canvas-placeholder-heading">
          <div style={styles.placeholderCenter}>
            <h3 id="graph-canvas-placeholder-heading">Graph Canvas Placeholder</h3>
            <strong>Read-only Graph Visualization</strong>
            <span>Implementation Phase Pending</span>
            <span>No Graph Engine</span>
            <span>No API</span>
            <span>No DB</span>
            <span>No Mutation</span>
          </div>

          <div style={styles.mockGraphList} aria-label="Mock graph nodes">
            {mockNodes.map((node) => (
              <button
                key={node.id}
                type="button"
                style={{
                  ...styles.mockNodeButton,
                  outline: selectedNodeId === node.id ? "3px solid #1976d2" : undefined,
                }}
                onClick={() => selectNode(node.id)}
                aria-pressed={selectedNodeId === node.id}
              >
                <strong>{node.label}</strong>
                <br />
                <span>
                  {node.type} / {node.value}
                </span>
              </button>
            ))}
          </div>

          <div style={styles.mockGraphList} aria-label="Mock graph edges">
            {mockEdges.map((edge) => (
              <button
                key={edge.id}
                type="button"
                style={{
                  ...styles.mockNodeButton,
                  outline: selectedEdgeId === edge.id ? "3px solid #2e7d32" : undefined,
                }}
                onClick={() => selectEdge(edge.id)}
                aria-pressed={selectedEdgeId === edge.id}
              >
                <strong>{edge.label}</strong>
                <br />
                <span>
                  {edge.from} -&gt; {edge.to}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div style={styles.bottomGrid}>
        <aside style={styles.sectionBox} aria-labelledby="graph-filter-panel-heading">
          <h3 id="graph-filter-panel-heading">Filter Panel</h3>
          <p style={styles.lead}>Static mock UI. Filter click updates local state only.</p>
          {viewModes.map((view) => (
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
            <h3 id="graph-legend-heading">Legend</h3>
            <div style={styles.legendGrid}>
              <span style={{ ...styles.badge, ...cardToneStyle("critical") }}>Critical</span>
              <span style={{ ...styles.badge, ...cardToneStyle("warning") }}>Warning</span>
              <span style={{ ...styles.badge, ...cardToneStyle("stable") }}>Stable</span>
              <span style={{ ...styles.badge, ...styles.readOnlyBadge }}>Read Only</span>
              <span style={{ ...styles.badge, ...styles.noExecutionBadge }}>
                Observability Only
              </span>
              <span style={styles.badge}>No Execution</span>
              <span style={styles.badge}>Local State</span>
            </div>
          </section>
        </aside>

        <section style={styles.sectionBox} aria-labelledby="graph-inspector-panel-heading">
          <div style={styles.header}>
            <div>
              <h3 id="graph-inspector-panel-heading">Inspector Panel</h3>
              <p style={styles.lead}>
                Static mock metadata. Inspector changes do not start any workflow.
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
