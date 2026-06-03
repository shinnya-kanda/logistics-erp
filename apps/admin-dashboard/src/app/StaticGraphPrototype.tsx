import type { CSSProperties } from "react";
import type {
  InventoryIntegrityGraphEdge,
  InventoryIntegrityGraphEdgeSemanticLegendItem,
  InventoryIntegrityGraphNode,
  InventoryIntegrityGraphSeverity,
  InventoryIntegrityGraphViewMode,
} from "./inventoryIntegrityGraphTypes";

type StaticGraphPrototypeProps = {
  readonly nodes: readonly InventoryIntegrityGraphNode[];
  readonly edges: readonly InventoryIntegrityGraphEdge[];
  readonly edgeSemanticsLegend: readonly InventoryIntegrityGraphEdgeSemanticLegendItem[];
  readonly selectedNodeId: string;
  readonly selectedEdgeId: string;
  readonly highlightedPathId: string;
  readonly activeViewMode: InventoryIntegrityGraphViewMode;
  readonly onSelectNode: (nodeId: string) => void;
  readonly onSelectEdge: (edgeId: string) => void;
};

type GridSlot = {
  readonly col: number;
  readonly row: number;
};

const SVG_VIEWBOX = { width: 100, height: 100 };
const GRID_COLUMNS = 4;

const NODE_GRID_SLOT: Record<string, GridSlot> = {
  collapse_node: { col: 0, row: 0 },
  risk_node: { col: 1, row: 0 },
  convergence_node: { col: 2, row: 0 },
  survivability_node: { col: 0, row: 1 },
  sustainability_node: { col: 1, row: 1 },
  maintainability_node: { col: 2, row: 1 },
  evolvability_node: { col: 3, row: 1 },
};

const NODE_DISPLAY_ORDER = [
  "collapse_node",
  "risk_node",
  "convergence_node",
  "survivability_node",
  "sustainability_node",
  "maintainability_node",
  "evolvability_node",
] as const;

const styles: Record<string, CSSProperties> = {
  wrapper: {
    display: "grid",
    gap: "0.85rem",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  },
  headerCard: {
    display: "grid",
    gap: "0.55rem",
    padding: "1rem",
    border: "1px solid #cfd8dc",
    borderRadius: "12px",
    background: "#fff",
  },
  lead: {
    margin: 0,
    color: "#555",
    lineHeight: 1.6,
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
  noControlsBadge: {
    borderColor: "#1b5e20",
    background: "#e8f5e9",
    color: "#1b5e20",
  },
  svgOverlayBadge: {
    borderColor: "#6d4c41",
    background: "#efebe9",
    color: "#4e342e",
  },
  relationPanel: {
    display: "grid",
    gap: "0.55rem",
    padding: "0.85rem",
    border: "1px solid #d7ccc8",
    borderRadius: "12px",
    background: "#fffaf7",
  },
  relationGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  relationChip: {
    display: "grid",
    gap: "0.2rem",
    minWidth: 0,
    flex: "1 1 13rem",
    maxWidth: "100%",
    padding: "0.65rem 0.75rem",
    border: "1px solid #cfd8dc",
    borderRadius: "999px",
    background: "#fff",
    color: "#263238",
    cursor: "pointer",
    textAlign: "left",
  },
  graphLane: {
    display: "grid",
    gap: "0.65rem",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  },
  legendRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
    alignItems: "center",
    fontSize: "0.78rem",
    color: "#555",
  },
  edgeSemanticsPanel: {
    display: "grid",
    gap: "0.55rem",
    padding: "0.85rem",
    border: "1px solid #cfd8dc",
    borderRadius: "12px",
    background: "#fff",
  },
  edgeSemanticsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))",
    gap: "0.5rem",
  },
  edgeSemanticsCard: {
    display: "grid",
    gap: "0.25rem",
    padding: "0.7rem",
    border: "1px solid #e0e0e0",
    borderRadius: "10px",
    background: "#fafafa",
    color: "#37474f",
  },
  nodeCard: {
    display: "grid",
    gap: "0.45rem",
    padding: "0.85rem",
    border: "1px solid #cfd8dc",
    borderRadius: "12px",
    background: "#fff",
    color: "#263238",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    minWidth: 0,
    minHeight: "10.5rem",
    boxSizing: "border-box",
  },
  nodeTitle: {
    margin: 0,
    fontSize: "0.92rem",
    fontWeight: 900,
    lineHeight: 1.35,
    wordBreak: "break-word",
  },
  nodeMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.35rem",
  },
  nodeText: {
    margin: 0,
    color: "#555",
    lineHeight: 1.5,
    fontSize: "0.8rem",
    wordBreak: "break-word",
  },
  connectorText: {
    margin: 0,
    color: "#6d4c41",
    fontSize: "0.82rem",
    fontWeight: 800,
  },
  srOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: 0,
  },
};

function severityStyle(severity: InventoryIntegrityGraphSeverity): CSSProperties {
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

function severityStrokeColor(severity: InventoryIntegrityGraphSeverity): string {
  if (severity === "critical") {
    return "#c62828";
  }

  if (severity === "warning") {
    return "#ef6c00";
  }

  if (severity === "stable") {
    return "#2e7d32";
  }

  return "#78909c";
}

function getNodeLabel(
  nodes: readonly InventoryIntegrityGraphNode[],
  nodeId: string,
) {
  return nodes.find((node) => node.id === nodeId)?.label ?? nodeId;
}

function getNodeGridSlot(nodeId: string): GridSlot {
  return NODE_GRID_SLOT[nodeId] ?? { col: 0, row: 0 };
}

function isEdgeInPath(edge: InventoryIntegrityGraphEdge, highlightedPathId: string) {
  const normalizedPathId = highlightedPathId.replace("_path", "");
  return edge.type.includes(normalizedPathId);
}

function slotCenterX(col: number, cols = GRID_COLUMNS): number {
  return ((col + 0.5) / cols) * 100;
}

function buildMarginEdgePath(from: GridSlot, to: GridSlot): string {
  const fromX = slotCenterX(from.col);
  const toX = slotCenterX(to.col);

  if (from.row === 0 && to.row === 0) {
    const bandY = 11;
    const attachY = 24;
    const midX = (fromX + toX) / 2;
    return `M ${fromX} ${attachY} Q ${midX} ${bandY} ${toX} ${attachY}`;
  }

  if (from.row === 1 && to.row === 1) {
    const bandY = 89;
    const attachY = 76;
    const midX = (fromX + toX) / 2;
    return `M ${fromX} ${attachY} Q ${midX} ${bandY} ${toX} ${attachY}`;
  }

  const fromY = from.row === 0 ? 34 : 66;
  const toY = to.row === 0 ? 34 : 66;
  const midX = (fromX + toX) / 2;
  const midY = 50;
  return `M ${fromX} ${fromY} C ${fromX} ${midY}, ${midX} ${midY}, ${toX} ${toY}`;
}

function orderNodes(nodes: readonly InventoryIntegrityGraphNode[]) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  return NODE_DISPLAY_ORDER.map((nodeId) => nodeMap.get(nodeId)).filter(
    (node): node is InventoryIntegrityGraphNode => node !== undefined,
  );
}

function GraphNodeCard({
  node,
  selected,
  relatedToPath,
  onSelect,
}: {
  readonly node: InventoryIntegrityGraphNode;
  readonly selected: boolean;
  readonly relatedToPath: boolean;
  readonly onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className="static-graph-node-card"
      style={{
        ...styles.nodeCard,
        ...severityStyle(node.severity),
        outline: selected
          ? "3px solid #263238"
          : relatedToPath
            ? "2px dashed #6d4c41"
            : undefined,
      }}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`ノード詳細を表示 / Show node detail: ${node.label}`}
    >
      <p style={styles.nodeTitle}>{node.label}</p>
      <div style={styles.nodeMeta}>
        <span style={styles.badge}>種別 / type: {node.type}</span>
        <span style={{ ...styles.badge, ...severityStyle(node.severity) }}>
          severity: {node.severity}
        </span>
        {selected ? <span style={styles.badge}>選択中 / selected</span> : null}
        {relatedToPath ? <span style={styles.badge}>関連パス / path related</span> : null}
      </div>
      <p style={styles.nodeText}>理由 / Reason: {node.reason}</p>
      <p style={styles.nodeText}>根拠 / Source: {node.source}</p>
    </button>
  );
}

function GraphRelationChip({
  edge,
  fromLabel,
  toLabel,
  selected,
  highlighted,
  onSelect,
}: {
  readonly edge: InventoryIntegrityGraphEdge;
  readonly fromLabel: string;
  readonly toLabel: string;
  readonly selected: boolean;
  readonly highlighted: boolean;
  readonly onSelect: () => void;
}) {
  return (
    <button
      type="button"
      style={{
        ...styles.relationChip,
        ...severityStyle(edge.severity),
        outline: selected
          ? "3px solid #263238"
          : highlighted
            ? "2px dashed #6d4c41"
            : undefined,
      }}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`関係詳細を表示 / Show relation detail: ${edge.label}`}
    >
      <strong>{edge.displayLabel}</strong>
      <span>semantic category: {edge.semanticCategory}</span>
      <span>path meaning: {edge.pathMeaning}</span>
      <span>{edge.readOnlyMeaning}</span>
      <span>
        {fromLabel} -&gt; {toLabel}
      </span>
      <span>edge type: {edge.type}</span>
      <span>severity: {edge.severity}</span>
      <span>{edge.description}</span>
      {selected ? <span>選択中の関係 / selected relation</span> : null}
      {highlighted ? <span>強調パスの関係 / highlighted path relation</span> : null}
    </button>
  );
}

function GraphSvgEdgeOverlay({
  edges,
  selectedEdgeId,
  highlightedPathId,
  onSelectEdge,
}: {
  readonly edges: readonly InventoryIntegrityGraphEdge[];
  readonly selectedEdgeId: string;
  readonly highlightedPathId: string;
  readonly onSelectEdge: (edgeId: string) => void;
}) {
  return (
    <svg
      className="static-graph-svg-overlay"
      viewBox={`0 0 ${SVG_VIEWBOX.width} ${SVG_VIEWBOX.height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <marker
          id="semantic-relation-arrow"
          markerWidth="5"
          markerHeight="5"
          refX="4"
          refY="2.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,5 L5,2.5 z" fill="#90a4ae" opacity="0.5" />
        </marker>
        <marker
          id="semantic-relation-arrow-selected"
          markerWidth="5"
          markerHeight="5"
          refX="4"
          refY="2.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,5 L5,2.5 z" fill="#607d8b" opacity="0.75" />
        </marker>
      </defs>
      {edges.map((edge) => {
        const from = getNodeGridSlot(edge.from);
        const to = getNodeGridSlot(edge.to);
        const path = buildMarginEdgePath(from, to);
        const selected = selectedEdgeId === edge.id;
        const highlighted = isEdgeInPath(edge, highlightedPathId);
        const strokeColor = severityStrokeColor(edge.severity);
        const strokeWidth = selected ? 0.42 : highlighted ? 0.34 : 0.22;
        const strokeOpacity = selected ? 0.82 : highlighted ? 0.58 : 0.24;
        const markerEnd = selected
          ? "url(#semantic-relation-arrow-selected)"
          : "url(#semantic-relation-arrow)";

        return (
          <g key={edge.id}>
            <path
              className={`semantic-edge semantic-edge-${edge.semanticCategory}`}
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth={1.8}
              style={{ pointerEvents: "stroke", cursor: "pointer" }}
              onClick={() => onSelectEdge(edge.id)}
            >
              <title>{`${edge.displayLabel}: ${edge.readOnlyMeaning}`}</title>
            </path>
            <path
              className={`semantic-edge-visual semantic-edge-${edge.semanticCategory}`}
              d={path}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeOpacity={strokeOpacity}
              strokeDasharray={highlighted && !selected ? "1.4 0.9" : undefined}
              markerEnd={markerEnd}
              style={{ pointerEvents: "none" }}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function StaticGraphPrototype({
  nodes,
  edges,
  edgeSemanticsLegend,
  selectedNodeId,
  selectedEdgeId,
  highlightedPathId,
  activeViewMode,
  onSelectNode,
  onSelectEdge,
}: StaticGraphPrototypeProps) {
  const orderedNodes = orderNodes(nodes);
  const highlightedEdges = edges.filter((edge) =>
    isEdgeInPath(edge, highlightedPathId),
  );
  const highlightedNodeIds = new Set(
    highlightedEdges.flatMap((edge) => [edge.from, edge.to]),
  );

  return (
    <div style={styles.wrapper} aria-label="Static graph prototype">
      <style>{`
        .static-graph-overlay-canvas {
          position: relative;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow: hidden;
          padding: 2.75rem 0.75rem 2.25rem;
          border: 1px solid #cfd8dc;
          border-radius: 12px;
          background: #fafafa;
          box-sizing: border-box;
        }
        .static-graph-svg-overlay {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
        }
        .static-graph-node-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1.25rem;
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }
        .static-graph-node-card-cell {
          min-width: 0;
        }
        .static-graph-node-card {
          height: 100%;
        }
        @media (max-width: 900px) {
          .static-graph-node-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .static-graph-svg-overlay {
            display: none;
          }
        }
        @media (max-width: 540px) {
          .static-graph-node-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>

      <div style={styles.headerCard}>
        <div style={styles.badgeRow} aria-label="Static graph boundary">
          <span style={{ ...styles.badge, ...styles.readOnlyBadge }}>
            Read Only / 読み取り専用
          </span>
          <span style={{ ...styles.badge, ...styles.noControlsBadge }}>
            Observability Only / 観測専用
          </span>
          <span style={{ ...styles.badge, ...styles.noControlsBadge }}>
            No Execution Controls / 実行操作なし
          </span>
          <span style={styles.badge}>Mock Data / モックデータ</span>
          <span style={styles.badge}>No API / API 接続なし</span>
          <span style={styles.badge}>No DB / DB 接続なし</span>
          <span style={styles.badge}>No Mutation / データ変更なし</span>
          <span style={styles.badge}>No Graph Engine / グラフエンジンなし</span>
          <span style={{ ...styles.badge, ...styles.svgOverlayBadge }}>
            SVG Relation Overlay / SVG関係線
          </span>
          <span style={{ ...styles.badge, ...styles.svgOverlayBadge }}>
            Observability Path Only / 観測用経路のみ
          </span>
          <span style={{ ...styles.badge, ...styles.svgOverlayBadge }}>
            No Execution Route / 実行経路ではありません
          </span>
        </div>
        <p style={styles.lead}>
          HTML node cards と SVG 関係線 overlay です。関係線は read-only semantic
          relation の視覚補助であり、実行経路・workflow route ではありません。クリックは
          local selection state の表示切替のみです。
        </p>
        <div style={styles.badgeRow} aria-label="Static graph statistics">
          <span style={styles.badge}>表示モード / View: {activeViewMode}</span>
          <span style={styles.badge}>ノード / Nodes: {nodes.length}</span>
          <span style={styles.badge}>エッジ / Edges: {edges.length}</span>
          <span style={styles.badge}>観測パス / Path: {highlightedPathId}</span>
        </div>
      </div>

      <section style={styles.graphLane} aria-labelledby="graph-nodes-heading">
        <h4 id="graph-nodes-heading" style={{ margin: 0 }}>
          ノードカード + SVG関係線 / Node Cards + SVG Relation Overlay
        </h4>
        <p style={styles.connectorText}>
          SVG 関係線は補助表示です。意味の確認は relation chip と Inspector
          でも読めます。
        </p>
        <div style={styles.legendRow} aria-label="Graph visual legend">
          <span>
            <strong>種別 / Type:</strong> collapse, survivability, sustainability,
            maintainability, evolvability, convergence
          </span>
          <span>
            <strong>重大度 / Severity:</strong> critical, warning, neutral
          </span>
          <span>
            <strong>線種 / Line:</strong> 直接関係 / direct, 関連パス / path related
            (dashed)
          </span>
        </div>
        <section
          style={styles.edgeSemanticsPanel}
          aria-labelledby="edge-semantics-legend-heading"
        >
          <h5 id="edge-semantics-legend-heading" style={{ margin: 0 }}>
            関係線の意味 / Edge Semantics
          </h5>
          <p style={styles.connectorText}>
            legend は workflow legend ではありません。severity は execution priority
            ではなく、path は remediation route ではありません。意味確認は Relation
            Chip と Inspector で行います。
          </p>
          <div style={styles.edgeSemanticsGrid}>
            {edgeSemanticsLegend.map((item) => (
              <div key={item.semanticCategory} style={styles.edgeSemanticsCard}>
                <strong>{item.label}</strong>
                <span>semantic category: {item.semanticCategory}</span>
                <span>{item.description}</span>
              </div>
            ))}
          </div>
        </section>
        <p style={styles.srOnly} id="svg-overlay-meaning">
          SVG relation overlay は observability path only
          の read-only semantic relation 表示です。No execution route。
        </p>
        <div
          className="static-graph-overlay-canvas"
          aria-describedby="svg-overlay-meaning"
        >
          <GraphSvgEdgeOverlay
            edges={edges}
            selectedEdgeId={selectedEdgeId}
            highlightedPathId={highlightedPathId}
            onSelectEdge={onSelectEdge}
          />
          <div className="static-graph-node-grid">
            {orderedNodes.map((node) => (
              <div key={node.id} className="static-graph-node-card-cell">
                <GraphNodeCard
                  node={node}
                  selected={selectedNodeId === node.id}
                  relatedToPath={highlightedNodeIds.has(node.id)}
                  onSelect={() => onSelectNode(node.id)}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={styles.relationPanel} aria-labelledby="graph-relations-heading">
        <h4 id="graph-relations-heading" style={{ margin: 0 }}>
          関係チップ / Relation Chips（主読み取り面）
        </h4>
        <p style={styles.connectorText}>
          関係は表示上の semantic reference であり、作業経路ではありません。SVG
          関係線の意味はここでも確認できます。
        </p>
        <div style={styles.relationGrid}>
          {edges.map((edge) => (
            <GraphRelationChip
              key={edge.id}
              edge={edge}
              fromLabel={getNodeLabel(nodes, edge.from)}
              toLabel={getNodeLabel(nodes, edge.to)}
              selected={selectedEdgeId === edge.id}
              highlighted={isEdgeInPath(edge, highlightedPathId)}
              onSelect={() => onSelectEdge(edge.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
