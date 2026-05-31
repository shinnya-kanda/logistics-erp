import type { CSSProperties } from "react";
import type {
  InventoryIntegrityGraphEdge,
  InventoryIntegrityGraphNode,
  InventoryIntegrityGraphSeverity,
  InventoryIntegrityGraphViewMode,
} from "./inventoryIntegrityGraphTypes";

type StaticGraphPrototypeProps = {
  readonly nodes: readonly InventoryIntegrityGraphNode[];
  readonly edges: readonly InventoryIntegrityGraphEdge[];
  readonly selectedNodeId: string;
  readonly selectedEdgeId: string;
  readonly highlightedPathId: string;
  readonly activeViewMode: InventoryIntegrityGraphViewMode;
  readonly onSelectNode: (nodeId: string) => void;
  readonly onSelectEdge: (edgeId: string) => void;
};

const styles: Record<string, CSSProperties> = {
  wrapper: {
    display: "grid",
    gap: "0.85rem",
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
    minWidth: "13rem",
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
  },
  nodeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
    gap: "0.75rem",
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
  },
  nodeTitle: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 900,
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
  },
  connectorText: {
    margin: 0,
    color: "#6d4c41",
    fontSize: "0.82rem",
    fontWeight: 800,
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

function getNodeLabel(
  nodes: readonly InventoryIntegrityGraphNode[],
  nodeId: string,
) {
  return nodes.find((node) => node.id === nodeId)?.label ?? nodeId;
}

function isEdgeInPath(edge: InventoryIntegrityGraphEdge, highlightedPathId: string) {
  const normalizedPathId = highlightedPathId.replace("_path", "");
  return edge.type.includes(normalizedPathId);
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
      aria-label={`Show node detail for ${node.label}`}
    >
      <p style={styles.nodeTitle}>{node.label}</p>
      <div style={styles.nodeMeta}>
        <span style={styles.badge}>type: {node.type}</span>
        <span style={{ ...styles.badge, ...severityStyle(node.severity) }}>
          severity: {node.severity}
        </span>
        {selected ? <span style={styles.badge}>selected</span> : null}
        {relatedToPath ? <span style={styles.badge}>path related</span> : null}
      </div>
      <p style={styles.nodeText}>Reason: {node.reason}</p>
      <p style={styles.nodeText}>Source: {node.source}</p>
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
      aria-label={`Show relation detail for ${edge.label}`}
    >
      <strong>{edge.type}</strong>
      <span>
        {fromLabel} -&gt; {toLabel}
      </span>
      <span>{edge.description}</span>
      {selected ? <span>selected relation</span> : null}
      {highlighted ? <span>highlighted path relation</span> : null}
    </button>
  );
}

export function StaticGraphPrototype({
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  highlightedPathId,
  activeViewMode,
  onSelectNode,
  onSelectEdge,
}: StaticGraphPrototypeProps) {
  const highlightedEdges = edges.filter((edge) =>
    isEdgeInPath(edge, highlightedPathId),
  );
  const highlightedNodeIds = new Set(
    highlightedEdges.flatMap((edge) => [edge.from, edge.to]),
  );

  return (
    <div style={styles.wrapper} aria-label="Static graph prototype">
      <div style={styles.headerCard}>
        <div style={styles.badgeRow} aria-label="Static graph boundary">
          <span style={{ ...styles.badge, ...styles.readOnlyBadge }}>Read Only</span>
          <span style={{ ...styles.badge, ...styles.noControlsBadge }}>
            Observability Only
          </span>
          <span style={{ ...styles.badge, ...styles.noControlsBadge }}>
            No Execution Controls
          </span>
          <span style={styles.badge}>Mock Data</span>
          <span style={styles.badge}>No Graph Engine</span>
        </div>
        <p style={styles.lead}>
          HTML/CSS static graph prototype. Node cards and relation chips update
          local selection state only.
        </p>
        <div style={styles.badgeRow} aria-label="Static graph statistics">
          <span style={styles.badge}>View: {activeViewMode}</span>
          <span style={styles.badge}>Nodes: {nodes.length}</span>
          <span style={styles.badge}>Edges: {edges.length}</span>
          <span style={styles.badge}>Path: {highlightedPathId}</span>
        </div>
      </div>

      <section style={styles.relationPanel} aria-labelledby="graph-relations-heading">
        <h4 id="graph-relations-heading" style={{ margin: 0 }}>
          Relation Chips
        </h4>
        <p style={styles.connectorText}>
          Relations are semantic references for display, not operational routes.
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

      <section style={styles.graphLane} aria-labelledby="graph-nodes-heading">
        <h4 id="graph-nodes-heading" style={{ margin: 0 }}>
          Node Cards
        </h4>
        <div style={styles.nodeGrid}>
          {nodes.map((node) => (
            <GraphNodeCard
              key={node.id}
              node={node}
              selected={selectedNodeId === node.id}
              relatedToPath={highlightedNodeIds.has(node.id)}
              onSelect={() => onSelectNode(node.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
