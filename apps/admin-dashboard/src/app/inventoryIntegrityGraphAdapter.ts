import type {
  InventoryIntegrityGraphData,
  InventoryIntegrityGraphEdge,
  InventoryIntegrityGraphEdgeSemanticLegendItem,
  InventoryIntegrityGraphMetadata,
  InventoryIntegrityGraphNode,
  InventoryIntegrityGraphSeverity,
  InventoryIntegrityGraphSummary,
  InventoryIntegrityGraphViewModeOption,
} from "./inventoryIntegrityGraphTypes";
import type {
  InventoryIntegrityEdgeMappingInput,
  InventoryIntegrityEdgeMappingResult,
  InventoryIntegrityGraphAdapterFixtureMetadata,
  InventoryIntegrityGraphAdapterInput,
  InventoryIntegrityGraphAdapterResult,
  InventoryIntegrityGraphAdapterWarning,
  InventoryIntegrityGraphMappingContext,
  InventoryIntegrityGraphMetadataMappingInput,
  InventoryIntegrityGraphMetadataMappingResult,
  InventoryIntegrityNodeMappingInput,
  InventoryIntegrityNodeMappingResult,
  InventoryIntegritySummaryMappingInput,
  InventoryIntegritySummaryMappingResult,
} from "./inventoryIntegrityGraphAdapterTypes";

// Read-only projection for fixture-like GET-only source data.
// No mutation, no workflow execution, no inventory data changes, no API or UI integration.

const UNAVAILABLE_SUMMARY_ID = "graph_unavailable";
const UNAVAILABLE_NODE_ID = "graph_unavailable_node";
const UNAVAILABLE_EDGE_ID = "edge_graph_unavailable";
const UNAVAILABLE_PATH_ID = "graph_unavailable_path";
const READ_ONLY_EDGE_MEANING =
  "Observability Semantic Relation, No Execution Route.";

type MetadataKey = keyof InventoryIntegrityGraphAdapterFixtureMetadata;

type GraphMappingSpec = {
  readonly key: MetadataKey;
  readonly summaryId: string;
  readonly summaryTitle: string;
  readonly summaryShortDescription: string;
  readonly summaryPriority: number;
  readonly nodeId: string;
  readonly nodeType: string;
  readonly nodeLabel: string;
  readonly signals: readonly string[];
};

type EdgeInput = Omit<InventoryIntegrityGraphEdge, "readOnlyMeaning">;

const MAPPING_SPECS: readonly GraphMappingSpec[] = [
  {
    key: "compareSeverity",
    summaryId: "graph_health",
    summaryTitle: "Graph Health",
    summaryShortDescription: "Severity caveat",
    summaryPriority: 10,
    nodeId: "severity_node",
    nodeType: "severity",
    nodeLabel: "Severity",
    signals: ["severity", "health", "compare"],
  },
  {
    key: "compareRisk",
    summaryId: "graph_risk",
    summaryTitle: "Graph Risk",
    summaryShortDescription: "Risk caveat",
    summaryPriority: 20,
    nodeId: "risk_node",
    nodeType: "risk",
    nodeLabel: "Risk",
    signals: ["risk", "attention", "compare"],
  },
  {
    key: "compareEvidence",
    summaryId: "evidence",
    summaryTitle: "Evidence",
    summaryShortDescription: "Evidence context",
    summaryPriority: 30,
    nodeId: "evidence_node",
    nodeType: "evidence",
    nodeLabel: "Evidence",
    signals: ["evidence", "support", "source"],
  },
  {
    key: "compareConfidence",
    summaryId: "confidence",
    summaryTitle: "Confidence",
    summaryShortDescription: "Confidence context",
    summaryPriority: 40,
    nodeId: "confidence_node",
    nodeType: "confidence",
    nodeLabel: "Confidence",
    signals: ["confidence", "support", "interpretation"],
  },
  {
    key: "compareProjectionFreshness",
    summaryId: "freshness",
    summaryTitle: "Freshness",
    summaryShortDescription: "Freshness context",
    summaryPriority: 50,
    nodeId: "freshness_node",
    nodeType: "freshness",
    nodeLabel: "Freshness",
    signals: ["freshness", "projection", "support"],
  },
  {
    key: "compareTruthAggregationQuality",
    summaryId: "truth_quality",
    summaryTitle: "Truth Quality",
    summaryShortDescription: "Truth aggregation context",
    summaryPriority: 60,
    nodeId: "truth_quality_node",
    nodeType: "truth_quality",
    nodeLabel: "Truth Quality",
    signals: ["truth", "aggregation", "evidence"],
  },
  {
    key: "compareInterpretationStability",
    summaryId: "stability",
    summaryTitle: "Stability",
    summaryShortDescription: "Interpretation stability",
    summaryPriority: 70,
    nodeId: "stability_node",
    nodeType: "stability",
    nodeLabel: "Stability",
    signals: ["stability", "interpretation", "confidence"],
  },
  {
    key: "compareGovernanceSemanticSurvivability",
    summaryId: "survivability",
    summaryTitle: "Survivability",
    summaryShortDescription: "Lifecycle survivability",
    summaryPriority: 80,
    nodeId: "survivability_node",
    nodeType: "survivability",
    nodeLabel: "Survivability",
    signals: ["survivability", "lifecycle", "governance"],
  },
  {
    key: "compareGovernanceSemanticSustainability",
    summaryId: "sustainability",
    summaryTitle: "Sustainability",
    summaryShortDescription: "Lifecycle sustainability",
    summaryPriority: 90,
    nodeId: "sustainability_node",
    nodeType: "sustainability",
    nodeLabel: "Sustainability",
    signals: ["sustainability", "lifecycle", "governance"],
  },
  {
    key: "compareGovernanceSemanticMaintainability",
    summaryId: "maintainability",
    summaryTitle: "Maintainability",
    summaryShortDescription: "Lifecycle maintainability",
    summaryPriority: 100,
    nodeId: "maintainability_node",
    nodeType: "maintainability",
    nodeLabel: "Maintainability",
    signals: ["maintainability", "lifecycle", "governance"],
  },
  {
    key: "compareGovernanceSemanticEvolvability",
    summaryId: "evolvability",
    summaryTitle: "Evolvability",
    summaryShortDescription: "Lifecycle evolvability",
    summaryPriority: 110,
    nodeId: "evolvability_node",
    nodeType: "evolvability",
    nodeLabel: "Evolvability",
    signals: ["evolvability", "lifecycle", "governance"],
  },
];

const EDGE_SEMANTICS_LEGEND: readonly InventoryIntegrityGraphEdgeSemanticLegendItem[] = [
  {
    semanticCategory: "collapse_path",
    label: "Collapse Path",
    description:
      "Critical caveat relation for reading risk first. This is not an execution route.",
  },
  {
    semanticCategory: "convergence_path",
    label: "Convergence Path",
    description:
      "Stability relation for reading confidence and interpretation caveats.",
  },
  {
    semanticCategory: "support_relation",
    label: "Support Relation",
    description:
      "Reason, source, and signal support relation. This is not an operation trigger.",
  },
  {
    semanticCategory: "lifecycle_propagation",
    label: "Lifecycle Propagation",
    description:
      "Long-term governance semantic relation. This is not workflow progress.",
  },
  {
    semanticCategory: "boundary_relation",
    label: "Boundary Relation",
    description:
      "Read-only adapter boundary. This is not an execution route.",
  },
];

const VIEW_MODES: readonly InventoryIntegrityGraphViewModeOption[] = [
  { id: "overview", label: "Overview" },
  { id: "collapse", label: "Collapse" },
  { id: "convergence", label: "Convergence" },
  { id: "survivability", label: "Survivability" },
  { id: "sustainability", label: "Sustainability" },
  { id: "maintainability", label: "Maintainability" },
  { id: "evolvability", label: "Evolvability" },
];

export function buildInventoryIntegrityGraphData(
  input: InventoryIntegrityGraphAdapterInput,
): InventoryIntegrityGraphAdapterResult {
  const metadataResult = extractFixtureMetadata(input.compareResponse);
  if (!metadataResult.metadata) {
    return {
      graphData: createUnavailableGraphData(),
      warnings: metadataResult.warnings,
    };
  }

  const context = createMappingContext(input, metadataResult.metadata, metadataResult.warnings);
  const metadataMapping = mapGraphMetadata({
    context,
    metadata: context.metadata,
  });
  const summaryMapping = mapSummaries({
    context,
    metadata: context.metadata,
  });
  const nodeMapping = mapNodes({
    context,
    metadata: context.metadata,
  });
  const edgeMapping = mapEdges({
    context,
    metadata: context.metadata,
    nodes: nodeMapping.nodes,
  });
  const defaultNodeId = selectDefaultNodeId(nodeMapping.nodes);
  const defaultEdgeId = edgeMapping.edges[0]?.id ?? UNAVAILABLE_EDGE_ID;
  const defaultHighlightedPathId =
    edgeMapping.edges[0]?.type ?? UNAVAILABLE_PATH_ID;

  return {
    graphData: {
      metadata: metadataMapping.metadata,
      summaries: summaryMapping.summaries,
      nodes: nodeMapping.nodes,
      edges: edgeMapping.edges,
      edgeSemanticsLegend: EDGE_SEMANTICS_LEGEND,
      viewModes: VIEW_MODES,
      defaultSummaryId: selectDefaultSummaryId(summaryMapping.summaries),
      defaultNodeId,
      defaultEdgeId,
      defaultHighlightedPathId,
    },
    warnings: uniqueWarnings([
      ...context.warnings,
      ...metadataMapping.warnings,
      ...summaryMapping.warnings,
      ...nodeMapping.warnings,
      ...edgeMapping.warnings,
    ]),
  };
}

export function createUnavailableGraphData(): InventoryIntegrityGraphData {
  return {
    metadata: {
      title: "Inventory Integrity Graph",
      activeLayer: "Unavailable Graph Adapter Projection",
      generatedAt: "adapter-unavailable",
      compareEndpointMethod: "GET",
      readOnlyBoundary:
        "Read Only, Observability Only, GET-only source data, adapter fallback.",
      noExecutionMeaning:
        "No Execution Controls. This fallback graph does not change inventory data.",
    },
    summaries: [
      {
        id: UNAVAILABLE_SUMMARY_ID,
        title: "Graph Unavailable",
        value: "unavailable",
        severity: "warning",
        description:
          "Fixture metadata was missing or unsupported. The graph is an unavailable read-only projection.",
        shortDescription: "Adapter fallback",
        priority: 1,
        relatedNodeId: UNAVAILABLE_NODE_ID,
        relatedPathId: UNAVAILABLE_PATH_ID,
      },
    ],
    nodes: [
      {
        id: UNAVAILABLE_NODE_ID,
        type: "graph_unavailable",
        label: "Graph Unavailable",
        value: "unavailable",
        severity: "warning",
        reason:
          "The adapter could not read fixture metadata safely, so it returned the unavailable graph.",
        source: "inventoryIntegrityGraphAdapter",
        signals: ["adapter_unavailable", "fallback_used", "read_only_projection"],
      },
    ],
    edges: [
      {
        id: UNAVAILABLE_EDGE_ID,
        from: UNAVAILABLE_NODE_ID,
        to: UNAVAILABLE_NODE_ID,
        type: "unavailable_boundary",
        label: "Unavailable Boundary",
        displayLabel: "Unavailable Projection",
        semanticCategory: "boundary_relation",
        pathMeaning:
          "The fixture metadata could not be projected into graph relations.",
        readOnlyMeaning: READ_ONLY_EDGE_MEANING,
        description:
          "This relation is a fallback marker for an unavailable adapter projection.",
        severity: "warning",
        source: "inventoryIntegrityGraphAdapter",
      },
    ],
    edgeSemanticsLegend: EDGE_SEMANTICS_LEGEND,
    viewModes: VIEW_MODES,
    defaultSummaryId: UNAVAILABLE_SUMMARY_ID,
    defaultNodeId: UNAVAILABLE_NODE_ID,
    defaultEdgeId: UNAVAILABLE_EDGE_ID,
    defaultHighlightedPathId: UNAVAILABLE_PATH_ID,
  };
}

function extractFixtureMetadata(compareResponse: unknown): {
  readonly metadata?: InventoryIntegrityGraphAdapterFixtureMetadata;
  readonly warnings: readonly InventoryIntegrityGraphAdapterWarning[];
} {
  if (!isRecord(compareResponse)) {
    return {
      warnings: ["missing_metadata", "adapter_unavailable", "fallback_used"],
    };
  }

  const rawMetadata = compareResponse.metadata;
  if (!isRecord(rawMetadata)) {
    return {
      warnings: [
        "missing_metadata",
        "unsupported_metadata_shape",
        "adapter_unavailable",
        "fallback_used",
      ],
    };
  }

  const metadata = toFixtureMetadata(rawMetadata);
  const warnings: InventoryIntegrityGraphAdapterWarning[] = [];
  if (Object.keys(metadata).length === 0) {
    warnings.push("incomplete_fixture", "missing_value");
  } else if (hasMissingFixtureValues(metadata)) {
    warnings.push("incomplete_fixture", "missing_value");
  }

  return { metadata, warnings };
}

function toFixtureMetadata(
  rawMetadata: Record<string, unknown>,
): InventoryIntegrityGraphAdapterFixtureMetadata {
  return {
    compareSeverity: readString(rawMetadata.compareSeverity),
    compareRisk: readString(rawMetadata.compareRisk),
    compareEvidence: readString(rawMetadata.compareEvidence),
    compareConfidence: readString(rawMetadata.compareConfidence),
    compareProjectionFreshness: readString(rawMetadata.compareProjectionFreshness),
    compareTruthAggregationQuality: readString(
      rawMetadata.compareTruthAggregationQuality,
    ),
    compareInterpretationStability: readString(
      rawMetadata.compareInterpretationStability,
    ),
    compareGovernanceSemanticSurvivability: readString(
      rawMetadata.compareGovernanceSemanticSurvivability ??
        rawMetadata.governanceSemanticSurvivability,
    ),
    compareGovernanceSemanticSustainability: readString(
      rawMetadata.compareGovernanceSemanticSustainability ??
        rawMetadata.governanceSemanticSustainability,
    ),
    compareGovernanceSemanticMaintainability: readString(
      rawMetadata.compareGovernanceSemanticMaintainability ??
        rawMetadata.governanceSemanticMaintainability,
    ),
    compareGovernanceSemanticEvolvability: readString(
      rawMetadata.compareGovernanceSemanticEvolvability ??
        rawMetadata.governanceSemanticEvolvability,
    ),
  };
}

function createMappingContext(
  input: InventoryIntegrityGraphAdapterInput,
  metadata: InventoryIntegrityGraphAdapterFixtureMetadata,
  warnings: readonly InventoryIntegrityGraphAdapterWarning[],
): InventoryIntegrityGraphMappingContext {
  return {
    compareResponse: input.compareResponse,
    metadata,
    sourceKind: input.sourceKind ?? "graph_adapter_fixture",
    warnings,
    readOnlyBoundary: "read_only_observability_projection",
    compareEndpointMethod: "GET",
  };
}

function mapGraphMetadata(
  input: InventoryIntegrityGraphMetadataMappingInput,
): InventoryIntegrityGraphMetadataMappingResult {
  if (!isFixtureMetadata(input.metadata)) {
    return {
      metadata: createUnavailableGraphData().metadata,
      warnings: ["missing_metadata", "fallback_used"],
    };
  }

  return {
    metadata: {
      title: "Inventory Integrity Graph",
      activeLayer: "Fixture Graph Adapter Projection",
      generatedAt: "adapter-fixture",
      compareEndpointMethod: "GET",
      readOnlyBoundary:
        "Read Only, Observability Only, GET-only source data assumption, fixture projection.",
      noExecutionMeaning:
        "No Execution Controls. The adapter only projects fixture metadata for display.",
    },
    warnings: [],
  };
}

function mapSummaries(
  input: InventoryIntegritySummaryMappingInput,
): InventoryIntegritySummaryMappingResult {
  if (!isFixtureMetadata(input.metadata)) {
    return { summaries: [], warnings: ["missing_summary", "fallback_used"] };
  }
  const metadata = input.metadata;

  return {
    summaries: MAPPING_SPECS.filter((spec) => spec.key !== "compareProjectionFreshness")
      .filter((spec) => spec.key !== "compareTruthAggregationQuality")
      .map((spec) => createSummary(spec, metadata)),
    warnings: [],
  };
}

function mapNodes(
  input: InventoryIntegrityNodeMappingInput,
): InventoryIntegrityNodeMappingResult {
  if (!isFixtureMetadata(input.metadata)) {
    return { nodes: [], warnings: ["missing_node", "fallback_used"] };
  }
  const metadata = input.metadata;

  return {
    nodes: MAPPING_SPECS.map((spec) => createNode(spec, metadata)),
    warnings: [],
  };
}

function mapEdges(
  input: InventoryIntegrityEdgeMappingInput,
): InventoryIntegrityEdgeMappingResult {
  if (!isFixtureMetadata(input.metadata)) {
    return { edges: [], warnings: ["missing_edge", "fallback_used"] };
  }
  const metadata = input.metadata;

  const nodeIds = new Set(input.nodes.map((node) => node.id));
  const edgeSpecs: readonly InventoryIntegrityGraphEdge[] = [
    createEdge({
      id: "edge_evidence_to_confidence",
      from: "evidence_node",
      to: "confidence_node",
      type: "evidence_confidence_support",
      label: "Evidence to Confidence",
      displayLabel: "Evidence Support",
      semanticCategory: "support_relation",
      pathMeaning: "Evidence quality supports confidence interpretation.",
      description:
        "Evidence metadata is read as support context for confidence.",
      severity: edgeSeverity(metadata.compareEvidence),
      source: "compareEvidence",
    }),
    createEdge({
      id: "edge_freshness_to_confidence",
      from: "freshness_node",
      to: "confidence_node",
      type: "freshness_confidence_support",
      label: "Freshness to Confidence",
      displayLabel: "Freshness Support",
      semanticCategory: "support_relation",
      pathMeaning: "Projection freshness constrains confidence interpretation.",
      description:
        "Freshness metadata is read as support context for confidence.",
      severity: edgeSeverity(metadata.compareProjectionFreshness),
      source: "compareProjectionFreshness",
    }),
    createEdge({
      id: "edge_confidence_to_stability",
      from: "confidence_node",
      to: "stability_node",
      type: "confidence_stability_relation",
      label: "Confidence to Stability",
      displayLabel: "Stability Relation",
      semanticCategory: "convergence_path",
      pathMeaning: "Confidence informs interpretation stability.",
      description:
        "Confidence metadata is read before interpreting stability.",
      severity: edgeSeverity(metadata.compareConfidence),
      source: "compareConfidence",
    }),
    createEdge({
      id: "edge_severity_to_risk",
      from: "severity_node",
      to: "risk_node",
      type: "severity_risk_relation",
      label: "Severity to Risk",
      displayLabel: "Risk Boundary",
      semanticCategory: "collapse_path",
      pathMeaning: "Severity caveat raises or limits risk interpretation.",
      description: "Severity metadata is read as a risk caveat.",
      severity: edgeSeverity(metadata.compareSeverity),
      source: "compareSeverity",
    }),
    createEdge({
      id: "edge_risk_to_survivability",
      from: "risk_node",
      to: "survivability_node",
      type: "risk_survivability_relation",
      label: "Risk to Survivability",
      displayLabel: "Lifecycle Caveat",
      semanticCategory: "lifecycle_propagation",
      pathMeaning: "Risk caveat constrains survivability interpretation.",
      description:
        "Risk metadata is read before lifecycle survivability.",
      severity: edgeSeverity(metadata.compareRisk),
      source: "compareRisk",
    }),
    createEdge({
      id: "edge_survivability_to_sustainability",
      from: "survivability_node",
      to: "sustainability_node",
      type: "survivability_sustainability_relation",
      label: "Survivability to Sustainability",
      displayLabel: "Lifecycle Propagation",
      semanticCategory: "lifecycle_propagation",
      pathMeaning: "Survivability informs sustainability interpretation.",
      description:
        "Survivability metadata is read as upstream lifecycle context.",
      severity: edgeSeverity(metadata.compareGovernanceSemanticSurvivability),
      source: "compareGovernanceSemanticSurvivability",
    }),
    createEdge({
      id: "edge_sustainability_to_maintainability",
      from: "sustainability_node",
      to: "maintainability_node",
      type: "sustainability_maintainability_relation",
      label: "Sustainability to Maintainability",
      displayLabel: "Maintainability Context",
      semanticCategory: "lifecycle_propagation",
      pathMeaning: "Sustainability informs maintainability interpretation.",
      description:
        "Sustainability metadata is read as upstream maintenance context.",
      severity: edgeSeverity(metadata.compareGovernanceSemanticSustainability),
      source: "compareGovernanceSemanticSustainability",
    }),
    createEdge({
      id: "edge_maintainability_to_evolvability",
      from: "maintainability_node",
      to: "evolvability_node",
      type: "maintainability_evolvability_relation",
      label: "Maintainability to Evolvability",
      displayLabel: "Evolvability Context",
      semanticCategory: "lifecycle_propagation",
      pathMeaning: "Maintainability informs evolvability interpretation.",
      description:
        "Maintainability metadata is read as upstream extension context.",
      severity: edgeSeverity(metadata.compareGovernanceSemanticMaintainability),
      source: "compareGovernanceSemanticMaintainability",
    }),
  ];

  const edges = edgeSpecs.filter(
    (edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to),
  );

  return {
    edges,
    warnings: edges.length === edgeSpecs.length ? [] : ["incomplete_relation"],
  };
}

function createSummary(
  spec: GraphMappingSpec,
  metadata: InventoryIntegrityGraphAdapterFixtureMetadata,
): InventoryIntegrityGraphSummary {
  const value = readMetadataValue(metadata, spec.key);
  return {
    id: spec.summaryId,
    title: spec.summaryTitle,
    value,
    severity: mapSeverity(value),
    description:
      `${spec.summaryTitle} is projected from ${spec.key}. This is read-only observability metadata, not an action recommendation.`,
    shortDescription: spec.summaryShortDescription,
    priority: spec.summaryPriority,
    relatedNodeId: spec.nodeId,
    relatedPathId: `${spec.nodeType}_path`,
  };
}

function createNode(
  spec: GraphMappingSpec,
  metadata: InventoryIntegrityGraphAdapterFixtureMetadata,
): InventoryIntegrityGraphNode {
  const value = readMetadataValue(metadata, spec.key);
  return {
    id: spec.nodeId,
    type: spec.nodeType,
    label: spec.nodeLabel,
    value,
    severity: mapSeverity(value),
    reason:
      `${spec.key} is read as fixture metadata for graph projection only.`,
    source: spec.key,
    signals: value === "unavailable" ? [...spec.signals, "unavailable"] : spec.signals,
  };
}

function createEdge(edge: EdgeInput): InventoryIntegrityGraphEdge {
  return {
    ...edge,
    readOnlyMeaning: READ_ONLY_EDGE_MEANING,
  };
}

function edgeSeverity(value: string | undefined): InventoryIntegrityGraphSeverity {
  return mapSeverity(value ?? "unavailable");
}

function mapSeverity(value: string): InventoryIntegrityGraphSeverity {
  const normalized = value.toLowerCase().trim();
  if (
    [
      "critical",
      "high",
      "escalation_required",
      "negative_projection",
      "negative_truth",
      "unrecoverable",
      "unsustainable",
      "unmaintainable",
      "unevolvable",
    ].includes(normalized)
  ) {
    return "critical";
  }

  if (
    [
      "warning",
      "review_required",
      "fragile",
      "limited",
      "degraded",
      "stale",
      "partial",
      "unverified",
      "unavailable",
      "unknown",
      "missing",
    ].includes(normalized)
  ) {
    return "warning";
  }

  if (
    [
      "stable",
      "maintainable",
      "evolvable",
      "healthy",
      "sustainable",
      "survivable",
      "sufficient",
      "aligned",
      "ready",
    ].includes(normalized)
  ) {
    return "stable";
  }

  return "neutral";
}

function readMetadataValue(
  metadata: InventoryIntegrityGraphAdapterFixtureMetadata,
  key: MetadataKey,
): string {
  return metadata[key]?.trim() || "unavailable";
}

function selectDefaultSummaryId(
  summaries: readonly InventoryIntegrityGraphSummary[],
): string {
  return (
    summaries.find((summary) => summary.severity === "critical")?.id ??
    summaries.find((summary) => summary.severity === "warning")?.id ??
    summaries[0]?.id ??
    UNAVAILABLE_SUMMARY_ID
  );
}

function selectDefaultNodeId(nodes: readonly InventoryIntegrityGraphNode[]): string {
  return (
    nodes.find((node) => node.severity === "critical")?.id ??
    nodes.find((node) => node.severity === "warning")?.id ??
    nodes[0]?.id ??
    UNAVAILABLE_NODE_ID
  );
}

function hasMissingFixtureValues(
  metadata: InventoryIntegrityGraphAdapterFixtureMetadata,
): boolean {
  return MAPPING_SPECS.some((spec) => !metadata[spec.key]?.trim());
}

function isFixtureMetadata(
  metadata: unknown,
): metadata is InventoryIntegrityGraphAdapterFixtureMetadata {
  return isRecord(metadata);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function uniqueWarnings(
  warnings: readonly InventoryIntegrityGraphAdapterWarning[],
): readonly InventoryIntegrityGraphAdapterWarning[] {
  return Array.from(new Set(warnings));
}
