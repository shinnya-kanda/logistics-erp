export type InventoryIntegrityGraphSeverity =
  | "critical"
  | "warning"
  | "stable"
  | "neutral";

export type InventoryIntegrityGraphViewMode =
  | "overview"
  | "collapse"
  | "convergence"
  | "survivability"
  | "sustainability"
  | "maintainability"
  | "evolvability";

export type InventoryIntegrityGraphInspectorTab = "summary" | "node" | "edge";

export type InventoryIntegrityGraphEdgeSemanticCategory =
  | "collapse_path"
  | "convergence_path"
  | "support_relation"
  | "lifecycle_propagation"
  | "boundary_relation";

export type InventoryIntegrityGraphSummary = {
  readonly id: string;
  readonly title: string;
  readonly value: string;
  readonly severity: InventoryIntegrityGraphSeverity;
  readonly description: string;
  readonly relatedNodeId?: string;
  readonly relatedPathId?: string;
};

export type InventoryIntegrityGraphNode = {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly value: string;
  readonly severity: InventoryIntegrityGraphSeverity;
  readonly reason: string;
  readonly source: string;
  readonly signals: readonly string[];
};

export type InventoryIntegrityGraphEdge = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly type: string;
  readonly label: string;
  readonly displayLabel: string;
  readonly semanticCategory: InventoryIntegrityGraphEdgeSemanticCategory;
  readonly pathMeaning: string;
  readonly readOnlyMeaning: string;
  readonly description: string;
  readonly severity: InventoryIntegrityGraphSeverity;
  readonly source?: string;
};

export type InventoryIntegrityGraphMetadata = {
  readonly title: string;
  readonly activeLayer: string;
  readonly generatedAt: string;
  readonly compareEndpointMethod: "GET";
  readonly readOnlyBoundary: string;
  readonly noExecutionMeaning: string;
};

export type InventoryIntegrityGraphViewModeOption = {
  readonly id: InventoryIntegrityGraphViewMode;
  readonly label: string;
};

export type InventoryIntegrityGraphEdgeSemanticLegendItem = {
  readonly semanticCategory: InventoryIntegrityGraphEdgeSemanticCategory;
  readonly label: string;
  readonly description: string;
};

export type InventoryIntegrityGraphData = {
  readonly metadata: InventoryIntegrityGraphMetadata;
  readonly summaries: readonly InventoryIntegrityGraphSummary[];
  readonly nodes: readonly InventoryIntegrityGraphNode[];
  readonly edges: readonly InventoryIntegrityGraphEdge[];
  readonly edgeSemanticsLegend: readonly InventoryIntegrityGraphEdgeSemanticLegendItem[];
  readonly viewModes: readonly InventoryIntegrityGraphViewModeOption[];
  readonly defaultSummaryId: string;
  readonly defaultNodeId: string;
  readonly defaultEdgeId: string;
  readonly defaultHighlightedPathId: string;
};
