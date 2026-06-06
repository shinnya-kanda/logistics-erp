import type { InventoryIntegrityGraphData } from "./inventoryIntegrityGraphTypes";
import type {
  InventoryIntegrityEdgeMappingInput,
  InventoryIntegrityEdgeMappingResult,
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

// Read-only adapter skeleton for GET-only compare source data.
// This phase intentionally does not parse compare responses, fetch data, connect UI,
// mutate state, or start workflow execution.

const UNAVAILABLE_SUMMARY_ID = "graph_unavailable";
const UNAVAILABLE_NODE_ID = "graph_unavailable_node";
const UNAVAILABLE_EDGE_ID = "edge_graph_unavailable";
const UNAVAILABLE_PATH_ID = "graph_unavailable_path";

export function buildInventoryIntegrityGraphData(
  input: InventoryIntegrityGraphAdapterInput,
): InventoryIntegrityGraphAdapterResult {
  const context = createMappingContext(input, ["adapter_not_implemented"]);
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

  return {
    graphData: createUnavailableGraphData(),
    warnings: [
      ...context.warnings,
      ...metadataMapping.warnings,
      ...summaryMapping.warnings,
      ...nodeMapping.warnings,
      ...edgeMapping.warnings,
    ],
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
        "No Execution Controls. This fallback graph does not correct, rebuild, replay, sync, or change inventory data.",
    },
    summaries: [
      {
        id: UNAVAILABLE_SUMMARY_ID,
        title: "Graph Unavailable",
        value: "unavailable",
        severity: "warning",
        description:
          "Compare response mapping is not implemented yet. The graph is an unavailable read-only projection.",
        shortDescription: "Adapter skeleton fallback",
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
        value: "not_implemented",
        severity: "warning",
        reason:
          "B77-31 only defines adapter types and skeletons. Compare response parsing is intentionally not implemented.",
        source: "inventoryIntegrityGraphAdapter",
        signals: ["adapter_not_implemented", "read_only_projection"],
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
          "The compare response cannot yet be projected into graph relations.",
        readOnlyMeaning:
          "Observability Semantic Relation, No Execution Route.",
        description:
          "This relation is a fallback marker for an unavailable adapter projection.",
        severity: "warning",
        source: "inventoryIntegrityGraphAdapter",
      },
    ],
    edgeSemanticsLegend: [
      {
        semanticCategory: "boundary_relation",
        label: "Boundary Relation",
        description:
          "Read-only adapter boundary. This is not an execution route.",
      },
    ],
    viewModes: [
      { id: "overview", label: "Overview" },
      { id: "collapse", label: "Collapse" },
      { id: "convergence", label: "Convergence" },
      { id: "survivability", label: "Survivability" },
      { id: "sustainability", label: "Sustainability" },
      { id: "maintainability", label: "Maintainability" },
      { id: "evolvability", label: "Evolvability" },
    ],
    defaultSummaryId: UNAVAILABLE_SUMMARY_ID,
    defaultNodeId: UNAVAILABLE_NODE_ID,
    defaultEdgeId: UNAVAILABLE_EDGE_ID,
    defaultHighlightedPathId: UNAVAILABLE_PATH_ID,
  };
}

function createMappingContext(
  input: InventoryIntegrityGraphAdapterInput,
  warnings: readonly InventoryIntegrityGraphAdapterWarning[],
): InventoryIntegrityGraphMappingContext {
  return {
    compareResponse: input.compareResponse,
    metadata: undefined,
    sourceKind: input.sourceKind ?? "unknown_compare_response",
    warnings,
    readOnlyBoundary: "read_only_observability_projection",
    compareEndpointMethod: "GET",
  };
}

function mapGraphMetadata(
  input: InventoryIntegrityGraphMetadataMappingInput,
): InventoryIntegrityGraphMetadataMappingResult {
  void input;
  return {
    metadata: createUnavailableGraphData().metadata,
    warnings: ["adapter_not_implemented", "missing_metadata"],
  };
}

function mapSummaries(
  input: InventoryIntegritySummaryMappingInput,
): InventoryIntegritySummaryMappingResult {
  void input;
  return {
    summaries: [],
    warnings: ["adapter_not_implemented", "missing_summary"],
  };
}

function mapNodes(
  input: InventoryIntegrityNodeMappingInput,
): InventoryIntegrityNodeMappingResult {
  void input;
  return {
    nodes: [],
    warnings: ["adapter_not_implemented", "missing_node"],
  };
}

function mapEdges(
  input: InventoryIntegrityEdgeMappingInput,
): InventoryIntegrityEdgeMappingResult {
  void input;
  return {
    edges: [],
    warnings: ["adapter_not_implemented", "missing_edge"],
  };
}
