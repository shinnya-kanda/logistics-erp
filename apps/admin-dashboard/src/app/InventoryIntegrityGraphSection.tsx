"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  buildInventoryIntegrityGraphData,
  createUnavailableGraphData,
  extractGraphFixtureMetadata,
} from "./inventoryIntegrityGraphAdapter";
import {
  inventoryIntegrityCompareContractValidationFixtures,
  sampleInventoryIntegrityCompareResponseFixture,
} from "./inventoryIntegrityGraphAdapterFixtures";
import type { InventoryIntegrityGraphAdapterWarning } from "./inventoryIntegrityGraphAdapterTypes";
import {
  getInventoryIntegrityGraphDataSourceOption,
  getVisibleInventoryIntegrityGraphDataSourceOptions,
} from "./inventoryIntegrityGraphDataSourceOptions";
import type { InventoryIntegrityGraphDataSourceMode } from "./inventoryIntegrityGraphDataSourceTypes";
import { inventoryIntegrityGraphMockData } from "./inventoryIntegrityGraphMockData";
import { StaticGraphPrototype } from "./StaticGraphPrototype";
import type {
  InventoryIntegrityGraphData,
  InventoryIntegrityGraphInspectorTab,
  InventoryIntegrityGraphSeverity,
  InventoryIntegrityGraphSummary,
  InventoryIntegrityGraphViewMode,
} from "./inventoryIntegrityGraphTypes";

const adapterGraphResult = buildInventoryIntegrityGraphData({
  compareResponse: sampleInventoryIntegrityCompareResponseFixture,
  sourceKind: "graph_adapter_fixture",
});
const adapterFixtureMetadata = extractGraphFixtureMetadata(
  sampleInventoryIntegrityCompareResponseFixture,
);

const fallbackGraphData = createUnavailableGraphData();

const ADAPTER_FIXTURE_PROJECTION_STEPS = [
  "Compare Response Fixture",
  "extractGraphFixtureMetadata",
  "buildInventoryIntegrityGraphData",
  "InventoryIntegrityGraphData",
  "Graph UI Rendering",
] as const;

const COMPARE_FIXTURE_PROJECTION_STEPS = [
  "Contract Validation Fixture",
  "buildInventoryIntegrityGraphData",
  "InventoryIntegrityGraphData",
  "Graph UI Rendering",
] as const;

const FALLBACK_PROJECTION_STEPS = [
  "createUnavailableGraphData()",
  "Unavailable Graph Projection",
  "Graph UI Rendering",
] as const;

const REAL_COMPARE_GUARDED_PROJECTION_STEPS = [
  "real_compare_readonly guarded source",
  "Validation Gate Required",
  "createUnavailableGraphData()",
  "fallback_unavailable",
  "Graph UI Rendering",
] as const;

const MOCK_PROJECTION_STEPS = [
  "inventoryIntegrityGraphMockData",
  "Graph UI Rendering",
] as const;

type CompareContractFixtureId =
  (typeof inventoryIntegrityCompareContractValidationFixtures)[number]["id"];

type WarningDisplay = {
  readonly label: string;
  readonly cause: string;
};

const WARNING_DISPLAY_LABELS: Record<
  InventoryIntegrityGraphAdapterWarning,
  WarningDisplay
> = {
  missing_compare_response: {
    label: "missing compare response / 比較レスポンス不足",
    cause: "Compare response was not available for graph projection.",
  },
  missing_metadata: {
    label: "missing metadata / メタデータ不足",
    cause: "Metadata required for graph projection was not present.",
  },
  missing_value: {
    label: "missing value / 値不足",
    cause: "Expected semantic value was not present.",
  },
  missing_summary: {
    label: "missing summary / 要約不足",
    cause: "Summary projection could not be read safely.",
  },
  missing_node: {
    label: "missing node / ノード不足",
    cause: "Node projection could not be read safely.",
  },
  missing_edge: {
    label: "missing edge / 関係線不足",
    cause: "Edge projection could not be read safely.",
  },
  missing_reason: {
    label: "missing reason / 理由不足",
    cause: "Reason text was not available.",
  },
  missing_source: {
    label: "missing source / 根拠不足",
    cause: "Source metadata was not available.",
  },
  missing_signals: {
    label: "missing signals / シグナル不足",
    cause: "Signal list was not available.",
  },
  incomplete_relation: {
    label: "incomplete relation / 不完全な関係",
    cause: "Graph relation could not be completed safely.",
  },
  incomplete_fixture: {
    label: "incomplete fixture / 不完全なフィクスチャ",
    cause: "Fixture metadata is partial.",
  },
  unsupported_metadata_shape: {
    label: "unsupported metadata shape / 未対応のメタデータ形式",
    cause: "Metadata shape was not supported by this projection.",
  },
  extracted_compare_fixture_metadata: {
    label: "extracted compare fixture metadata / 比較フィクスチャメタデータ抽出済み",
    cause: "Fixture metadata was read for adapter verification only.",
  },
  normalized_non_string_metadata: {
    label: "normalized non-string metadata / 非文字列メタデータ正規化",
    cause: "Object metadata was normalized into display text.",
  },
  fallback_used: {
    label: "fallback used / フォールバック使用",
    cause: "Unavailable projection was selected for safe display.",
  },
  graph_unavailable: {
    label: "graph unavailable / グラフ利用不可",
    cause: "Healthy graph data is not available.",
  },
  adapter_unavailable: {
    label: "adapter unavailable / アダプタ利用不可",
    cause: "Adapter projection could not continue safely.",
  },
};

const FALLBACK_UNAVAILABLE_REASONS: readonly InventoryIntegrityGraphAdapterWarning[] = [
  "missing_metadata",
  "unsupported_metadata_shape",
  "adapter_unavailable",
  "fallback_used",
];

function selectGraphData(
  mode: InventoryIntegrityGraphDataSourceMode,
  compareFixtureGraphData: InventoryIntegrityGraphData,
): InventoryIntegrityGraphData {
  if (mode === "adapter_fixture") {
    return adapterGraphResult.graphData;
  }

  if (mode === "compare_fixture") {
    return compareFixtureGraphData;
  }

  if (mode === "fallback_unavailable") {
    return fallbackGraphData;
  }

  if (mode === "real_compare_readonly") {
    return fallbackGraphData;
  }

  return inventoryIntegrityGraphMockData;
}

function graphSourceWarnings(
  mode: InventoryIntegrityGraphDataSourceMode,
  compareFixtureWarnings: readonly InventoryIntegrityGraphAdapterWarning[],
): readonly InventoryIntegrityGraphAdapterWarning[] {
  if (mode === "adapter_fixture") {
    return adapterGraphResult.warnings;
  }

  if (mode === "compare_fixture") {
    return compareFixtureWarnings;
  }

  if (mode === "fallback_unavailable") {
    return ["adapter_unavailable", "fallback_used", "graph_unavailable"];
  }

  if (mode === "real_compare_readonly") {
    return ["adapter_unavailable", "fallback_used", "graph_unavailable"];
  }

  return [];
}

function graphSourceDisplayLabel(mode: InventoryIntegrityGraphDataSourceMode): string {
  const option = getInventoryIntegrityGraphDataSourceOption(mode);
  return `${option.shortLabel} / ${option.disclosure}`;
}

function graphSourceProjectionSteps(
  mode: InventoryIntegrityGraphDataSourceMode,
): readonly string[] {
  if (mode === "adapter_fixture") {
    return ADAPTER_FIXTURE_PROJECTION_STEPS;
  }

  if (mode === "compare_fixture") {
    return COMPARE_FIXTURE_PROJECTION_STEPS;
  }

  if (mode === "fallback_unavailable") {
    return FALLBACK_PROJECTION_STEPS;
  }

  if (mode === "real_compare_readonly") {
    return REAL_COMPARE_GUARDED_PROJECTION_STEPS;
  }

  return MOCK_PROJECTION_STEPS;
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
  keyboardHelp: {
    margin: "0.75rem 0 0",
    padding: "0.75rem",
    border: "1px solid #cfd8dc",
    borderRadius: "12px",
    background: "#f8fbff",
    color: "#37474f",
    lineHeight: 1.6,
    fontSize: "0.88rem",
  },
  unavailablePanel: {
    margin: "1rem 0",
    padding: "1rem",
    border: "2px solid #ef6c00",
    borderRadius: "12px",
    background: "#fff7ed",
    color: "#4e342e",
  },
  unavailableTitle: {
    margin: "0 0 0.45rem",
    color: "#bf360c",
    fontSize: "1.05rem",
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
  sourcePanel: {
    display: "grid",
    gap: "0.55rem",
    minWidth: "18rem",
    padding: "0.75rem",
    border: "1px solid #cfd8dc",
    borderRadius: "12px",
    background: "#f8fbff",
  },
  sourceControls: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.45rem",
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
    minHeight: "8.25rem",
  },
  cardGrid: {
    display: "grid",
    gap: "0.75rem",
  },
  cardTitle: {
    margin: 0,
    color: "#555",
    fontSize: "0.82rem",
    fontWeight: 800,
  },
  cardValue: {
    display: "block",
    marginTop: "0.35rem",
    fontSize: "1.08rem",
    fontWeight: 900,
    lineHeight: 1.35,
  },
  cardDescription: {
    margin: "0.45rem 0 0",
    color: "#555",
    lineHeight: 1.5,
    fontSize: "0.84rem",
  },
  summaryMetaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.35rem",
    marginTop: "0.55rem",
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
  disabledFilterButton: {
    borderColor: "#b0bec5",
    background: "#eceff1",
    color: "#607d8b",
    cursor: "not-allowed",
    opacity: 0.7,
  },
  inspectorGrid: {
    display: "grid",
    gap: "0.65rem",
    marginTop: "0.75rem",
  },
  inspectorRow: {
    display: "grid",
    gridTemplateColumns: "minmax(9rem, 0.45fr) minmax(0, 1fr)",
    gap: "0.75rem",
    alignItems: "start",
    padding: "0.65rem 0.7rem",
    border: "1px solid #e0e0e0",
    borderRadius: "10px",
    background: "#fff",
  },
  inspectorLabel: {
    color: "#455a64",
    fontSize: "0.82rem",
  },
  inspectorValue: {
    color: "#263238",
    lineHeight: 1.55,
    overflowWrap: "anywhere",
  },
  legendGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))",
    gap: "0.5rem",
    marginTop: "0.75rem",
  },
  compactList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.35rem",
    margin: "0.45rem 0 0",
    padding: 0,
    listStyle: "none",
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
  const subdued = card.severity === "neutral" || card.severity === "stable";

  return (
    <button
      type="button"
      className="inventory-graph-focusable"
      style={{
        ...styles.card,
        ...cardToneStyle(card.severity),
        opacity: subdued && !selected ? 0.82 : 1,
        outline: selected ? "3px solid #263238" : undefined,
      }}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`詳細を表示 / Show detail. ${card.title}. Value: ${card.value}. Severity: ${card.severity}. ${card.shortDescription}. 表示切替のみ / Display change only. No execution action.`}
    >
      <p style={styles.cardTitle}>{card.title}</p>
      <span style={styles.cardValue}>{card.value}</span>
      <p style={styles.cardDescription}>{card.shortDescription}</p>
      <div style={styles.summaryMetaRow}>
        <span style={styles.badge}>表示順 / Read order: {card.priority}</span>
        <span style={styles.badge}>詳細は Inspector で確認</span>
      </div>
    </button>
  );
}

function BoundaryBadges() {
  return (
    <div style={styles.badgeRow} aria-label="Graph UI boundary">
      <span
        style={{ ...styles.badge, ...styles.readOnlyBadge }}
        title="Read Only / 読み取り専用"
        aria-label="Read Only / 読み取り専用"
      >
        Read Only / 読み取り専用
      </span>
      <span
        style={{ ...styles.badge, ...styles.noExecutionBadge }}
        title="Observability Only / 観測専用"
        aria-label="Observability Only / 観測専用"
      >
        Observability Only / 観測専用
      </span>
      <span
        style={{ ...styles.badge, ...styles.noExecutionBadge }}
        title="No Execution Controls / 実行操作なし"
        aria-label="No Execution Controls / 実行操作なし"
      >
        No Execution Controls / 実行操作なし
      </span>
      <span style={styles.badge} title="Mock Data / モックデータ" aria-label="Mock Data / モックデータ">Mock Data / モックデータ</span>
      <span style={styles.badge} title="No API / API 接続なし" aria-label="No API / API 接続なし">No API / API 接続なし</span>
      <span style={styles.badge} title="No DB / DB 接続なし" aria-label="No DB / DB 接続なし">No DB / DB 接続なし</span>
      <span style={styles.badge} title="No Mutation / データ変更なし" aria-label="No Mutation / データ変更なし">No Mutation / データ変更なし</span>
      <span style={styles.badge} title="No Execution Route / 実行経路ではありません" aria-label="No Execution Route / 実行経路ではありません">No Execution Route / 実行経路ではありません</span>
    </div>
  );
}

export function InventoryIntegrityGraphSection() {
  const defaultCompareFixtureId =
    inventoryIntegrityCompareContractValidationFixtures[0]?.id ?? "full_metadata";
  const [selectedCompareFixtureId, setSelectedCompareFixtureId] =
    useState<CompareContractFixtureId>(defaultCompareFixtureId);
  const selectedCompareFixture = useMemo(
    () =>
      inventoryIntegrityCompareContractValidationFixtures.find(
        (fixture) => fixture.id === selectedCompareFixtureId,
      ) ?? null,
    [selectedCompareFixtureId],
  );
  const compareFixtureGraphResult = useMemo(() => {
    if (!selectedCompareFixture) {
      return {
        graphData: createUnavailableGraphData(),
        warnings: [
          "adapter_unavailable",
          "fallback_used",
          "graph_unavailable",
        ] as const satisfies readonly InventoryIntegrityGraphAdapterWarning[],
      };
    }

    return buildInventoryIntegrityGraphData({
      compareResponse: selectedCompareFixture.response,
      sourceKind: "graph_adapter_fixture",
    });
  }, [selectedCompareFixture]);
  const [dataSourceMode, setDataSourceMode] =
    useState<InventoryIntegrityGraphDataSourceMode>("mock");
  const graphData = useMemo(
    () => selectGraphData(dataSourceMode, compareFixtureGraphResult.graphData),
    [compareFixtureGraphResult.graphData, dataSourceMode],
  );
  const sourceWarnings = useMemo(
    () => graphSourceWarnings(dataSourceMode, compareFixtureGraphResult.warnings),
    [compareFixtureGraphResult.warnings, dataSourceMode],
  );
  const selectedSourceOption = useMemo(
    () => getInventoryIntegrityGraphDataSourceOption(dataSourceMode),
    [dataSourceMode],
  );
  const visibleDataSourceOptions = useMemo(
    () => getVisibleInventoryIntegrityGraphDataSourceOptions(),
    [],
  );
  const isFallbackUnavailable = dataSourceMode === "fallback_unavailable";
  const isRealCompareGuarded = dataSourceMode === "real_compare_readonly";
  const isUnavailableProjection = isFallbackUnavailable || isRealCompareGuarded;
  const isCompareFixture = dataSourceMode === "compare_fixture";
  const shouldShowRealCompareGuardedDisclosure =
    isRealCompareGuarded ||
    visibleDataSourceOptions.some((option) => option.id === "real_compare_readonly");
  const projectionSteps = useMemo(
    () => graphSourceProjectionSteps(dataSourceMode),
    [dataSourceMode],
  );
  const adapterFixtureMetadataStatus = adapterFixtureMetadata
    ? "extracted / 抽出済み"
    : "unavailable / 利用不可";
  const [activeViewMode, setActiveViewMode] =
    useState<InventoryIntegrityGraphViewMode>("overview");
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
  const orderedSummaries = useMemo(
    () => [...graphData.summaries].sort((a, b) => a.priority - b.priority),
    [graphData],
  );
  const inspectorTitle =
    activeInspectorTab === "edge"
      ? "選択中エッジ / Selected Edge"
      : activeInspectorTab === "summary"
        ? "選択中要約 / Selected Summary"
        : "選択中ノード / Selected Node";
  const inspectorTabLabels: Record<InventoryIntegrityGraphInspectorTab, string> = {
    summary: "要約 / Summary",
    node: "ノード / Node",
    edge: "エッジ / Edge",
  };

  const inspectorRows = useMemo(() => {
    if (activeInspectorTab === "summary") {
      return [
        ["選択中要約 / Selected Summary", selectedSummary.title],
        ["値 / Value", selectedSummary.value],
        ["理由 / Reason", selectedSummary.description],
        ["Severity", selectedSummary.severity],
        ["根拠 / Source", graphSourceDisplayLabel(dataSourceMode)],
        ["Trust Level", selectedSourceOption.trustLevel],
        ["Disclosure", selectedSourceOption.disclosure],
        ["Caveat", selectedSourceOption.caveat],
        ["Projection", projectionSteps.join(" -> ")],
        ...(isCompareFixture
          ? ([
              ["Compare Fixture", selectedCompareFixture?.label ?? "fixture unavailable"],
              [
                "Fixture Purpose",
                selectedCompareFixture?.purpose ?? "Fixture metadata is unavailable.",
              ],
              [
                "Expected Behavior",
                selectedCompareFixture?.expectedBehavior ??
                  "Adapter should fall back safely when fixture is unavailable.",
              ],
              ["Fixture Mode", "Contract Validation Fixture / Shape Verification Only"],
            ] as const)
          : []),
        ...(isFallbackUnavailable
          ? ([
              [
                "Unavailable State",
                "This graph is an unavailable projection. / このグラフは利用不可状態の投影です。",
              ],
              [
                "Live Compare Data",
                "It is not live compare data. / 実比較データではありません。",
              ],
              [
                "Workflow Action",
                "No workflow action is available. / 実行操作はありません。",
              ],
              [
                "Warning Causes",
                FALLBACK_UNAVAILABLE_REASONS.map(
                  (warning) => WARNING_DISPLAY_LABELS[warning].label,
                ).join(", "),
              ],
              [
                "Cause Detail",
                FALLBACK_UNAVAILABLE_REASONS.map(
                  (warning) => WARNING_DISPLAY_LABELS[warning].cause,
                ).join(" / "),
              ],
            ] as const)
          : []),
        ...(isRealCompareGuarded
          ? ([
              [
                "Guarded Source",
                "real_compare_readonly is guarded and not enabled in this phase. / 実比較データ（読み取り専用）は現在ガード中で、このフェーズでは有効化されていません。",
              ],
              [
                "Validation Gate",
                "Validation Gate Required / 検証ゲート必須",
              ],
              [
                "Live Fetch",
                "No Live Fetch / ライブ取得なし",
              ],
              [
                "Fallback Behavior",
                "Guarded selection falls back to unavailable graph data.",
              ],
              [
                "Workflow Action",
                "No workflow action is available. / 実行操作はありません。",
              ],
            ] as const)
          : []),
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
    dataSourceMode,
    graphData.metadata.readOnlyBoundary,
    isCompareFixture,
    isFallbackUnavailable,
    isRealCompareGuarded,
    projectionSteps,
    selectedCompareFixture,
    selectedSourceOption,
    selectedEdge,
    selectedEdgeFromLabel,
    selectedEdgeToLabel,
    selectedNode,
    selectedSummary,
  ]);

  function selectDataSourceMode(nextMode: InventoryIntegrityGraphDataSourceMode) {
    const nextSourceOption = getInventoryIntegrityGraphDataSourceOption(nextMode);
    if (nextSourceOption.isGuarded && nextSourceOption.isEnabled === false) {
      return;
    }

    const nextGraphData = selectGraphData(
      nextMode,
      compareFixtureGraphResult.graphData,
    );
    setDataSourceMode(nextMode);
    setActiveViewMode("overview");
    setSelectedSummaryId(nextGraphData.defaultSummaryId);
    setSelectedNodeId(nextGraphData.defaultNodeId);
    setSelectedEdgeId(nextGraphData.defaultEdgeId);
    setHighlightedPathId(nextGraphData.defaultHighlightedPathId);
    setActiveInspectorTab("summary");
  }

  function selectCompareFixture(nextFixtureId: CompareContractFixtureId) {
    const nextFixture =
      inventoryIntegrityCompareContractValidationFixtures.find(
        (fixture) => fixture.id === nextFixtureId,
      ) ?? null;
    const nextGraphResult = nextFixture
      ? buildInventoryIntegrityGraphData({
          compareResponse: nextFixture.response,
          sourceKind: "graph_adapter_fixture",
        })
      : {
          graphData: createUnavailableGraphData(),
          warnings: [
            "adapter_unavailable",
            "fallback_used",
            "graph_unavailable",
          ] as const satisfies readonly InventoryIntegrityGraphAdapterWarning[],
        };

    setSelectedCompareFixtureId(nextFixtureId);
    setDataSourceMode("compare_fixture");
    setActiveViewMode("overview");
    setSelectedSummaryId(nextGraphResult.graphData.defaultSummaryId);
    setSelectedNodeId(nextGraphResult.graphData.defaultNodeId);
    setSelectedEdgeId(nextGraphResult.graphData.defaultEdgeId);
    setHighlightedPathId(nextGraphResult.graphData.defaultHighlightedPathId);
    setActiveInspectorTab("summary");
  }

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
      <style>{`
        .inventory-graph-focusable:focus-visible {
          outline: 3px solid #0d47a1 !important;
          outline-offset: 3px;
          box-shadow: 0 0 0 4px rgba(13, 71, 161, 0.18);
        }
        @media (max-width: 980px) {
          .inventory-graph-layout-grid,
          .inventory-graph-bottom-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
        @media (max-width: 620px) {
          .inventory-graph-inspector-row {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
      <div style={styles.header}>
        <div>
          <h2 id="inventory-integrity-graph-heading">{graphData.metadata.title}</h2>
          <p style={styles.lead}>
            Inventory Integrity Governance Semantic Graph の読み取り専用 UI です。
            Graph Engine、API、DB、Mutation は接続していません。
          </p>
        </div>
        <div style={styles.sourcePanel} aria-label="Graph source mode">
          <strong>Graph Source / グラフソース</strong>
          <div style={styles.sourceControls}>
            {visibleDataSourceOptions.map((option) => {
              const isDisabled = option.isGuarded && option.isEnabled === false;

              return (
                <button
                  key={option.id}
                  type="button"
                  className="inventory-graph-focusable"
                  style={{
                    ...styles.filterButton,
                    width: "auto",
                    marginTop: 0,
                    ...(dataSourceMode === option.id ? styles.activeFilterButton : {}),
                    ...(isDisabled ? styles.disabledFilterButton : {}),
                  }}
                  onClick={() => selectDataSourceMode(option.id)}
                  disabled={isDisabled}
                  aria-disabled={isDisabled}
                  aria-pressed={dataSourceMode === option.id}
                  aria-label={
                    isDisabled
                      ? `${option.label} は Guarded / 未有効です。Validation Gate Required. No Live Fetch. No API. No execution action.`
                      : `Graph source を ${option.label} に切替 / Change graph source to ${option.label}. Display-only Toggle. No API. No execution action.`
                  }
                  title={`${option.trustLevel}. ${option.disclosure}. ${option.caveat}`}
                >
                  {option.shortLabel}
                </button>
              );
            })}
          </div>
          <span style={styles.badge}>
            Data Source Mode / データソースモード: {selectedSourceOption.label}
          </span>
          <span style={styles.badge}>Trust: {selectedSourceOption.trustLevel}</span>
          <span style={styles.badge}>{selectedSourceOption.disclosure}</span>
          <span style={styles.badge}>{selectedSourceOption.caveat}</span>
          <span style={styles.badge}>Display-only Toggle / 表示切替のみ</span>
          <span style={styles.badge}>
            Live Data: {selectedSourceOption.isLiveData ? "yes" : "no"}
          </span>
          {shouldShowRealCompareGuardedDisclosure ? (
            <>
              <span style={styles.badge}>
                Real Compare Readonly: Guarded / 未有効
              </span>
              <span style={styles.badge}>
                Validation Gate Required / 検証ゲート必須
              </span>
              <span style={styles.badge}>No Live Fetch / ライブ取得なし</span>
            </>
          ) : null}
          {dataSourceMode === "adapter_fixture" ? (
            <>
              <span style={styles.badge}>Not Live Compare Data / 実比較データではありません</span>
              <span style={styles.badge}>Read-only Projection / 読み取り専用投影</span>
              <span style={styles.badge}>
                Fixture Metadata: {adapterFixtureMetadataStatus}
              </span>
            </>
          ) : null}
          {isCompareFixture ? (
            <>
              <span style={styles.badge}>Compare Fixture Mode</span>
              <span style={styles.badge}>Contract Validation Fixture</span>
              <span style={styles.badge}>Shape Verification Only</span>
              <span style={styles.badge}>Not Live Compare Data / 実比較データではありません</span>
              <span style={styles.badge}>
                Selected Fixture: {selectedCompareFixture?.label ?? "unavailable"}
              </span>
            </>
          ) : null}
          {dataSourceMode === "fallback_unavailable" ? (
            <>
              <span style={styles.badge}>Safety Fallback Active / 安全側フォールバック中</span>
              <span style={styles.badge}>Graph Unavailable / グラフ利用不可</span>
              <span style={styles.badge}>Unavailable Projection / 利用不可状態の投影</span>
            </>
          ) : null}
          {isRealCompareGuarded ? (
            <>
              <span style={styles.badge}>Guarded Source / ガード中ソース</span>
              <span style={styles.badge}>Not Enabled / 未有効</span>
              <span style={styles.badge}>No Live Fetch / ライブ取得なし</span>
              <span style={styles.badge}>
                Validation Gate Required / 検証ゲート必須
              </span>
            </>
          ) : null}
        </div>
      </div>
      <BoundaryBadges />

      {shouldShowRealCompareGuardedDisclosure ? (
        <section style={styles.keyboardHelp} aria-label="Real compare guarded disclosure">
          <strong>Guarded Disclosure / ガード中ソース開示:</strong>{" "}
          real_compare_readonly is guarded and not enabled in this phase. /
          実比較データ（読み取り専用）は現在ガード中で、このフェーズでは有効化されていません。
          <div style={styles.badgeRow}>
            <span style={styles.badge}>Guarded Source / ガード中ソース</span>
            <span style={styles.badge}>Not Enabled / 未有効</span>
            <span style={styles.badge}>No Live Fetch / ライブ取得なし</span>
            <span style={styles.badge}>No API / API 接続なし</span>
            <span style={styles.badge}>No DB / DB 接続なし</span>
            <span style={styles.badge}>No Mutation / データ変更なし</span>
          </div>
        </section>
      ) : null}

      {isCompareFixture ? (
        <section
          style={styles.keyboardHelp}
          aria-labelledby="compare-fixture-selector-heading"
        >
          <h3 id="compare-fixture-selector-heading" style={styles.unavailableTitle}>
            Compare Fixture Mode / 比較レスポンスフィクスチャ
          </h3>
          <div style={styles.badgeRow}>
            <span style={styles.badge}>Contract Validation Fixture</span>
            <span style={styles.badge}>Shape Verification Only</span>
            <span style={styles.badge}>Not Live Compare Data / 実比較データではありません</span>
            <span style={styles.badge}>No API / API 接続なし</span>
            <span style={styles.badge}>No DB / DB 接続なし</span>
            <span style={styles.badge}>No Mutation / データ変更なし</span>
          </div>
          <p style={styles.lead}>
            contract validation fixture を graph adapter に渡し、Graph UI で表示確認します。
            fetch、route call、Supabase、DB、workflow execution は行いません。
          </p>
          <div style={styles.sourceControls} aria-label="Compare fixture selector">
            {inventoryIntegrityCompareContractValidationFixtures.map((fixture) => (
              <button
                key={fixture.id}
                type="button"
                className="inventory-graph-focusable"
                style={{
                  ...styles.filterButton,
                  width: "auto",
                  marginTop: 0,
                  ...(selectedCompareFixtureId === fixture.id
                    ? styles.activeFilterButton
                    : {}),
                }}
                onClick={() => selectCompareFixture(fixture.id)}
                aria-pressed={selectedCompareFixtureId === fixture.id}
                aria-label={`Compare fixture を ${fixture.label} に切替 / Change compare fixture to ${fixture.label}. Display-only. No API. No execution action.`}
                title={fixture.expectedBehavior}
              >
                {fixture.label}
              </button>
            ))}
          </div>
          <div style={styles.badgeRow}>
            <span style={styles.badge}>
              Selected Fixture: {selectedCompareFixture?.label ?? "unavailable"}
            </span>
            <span style={styles.badge}>
              Expected Behavior:{" "}
              {selectedCompareFixture?.expectedBehavior ??
                "Fallback unavailable projection should be used."}
            </span>
          </div>
        </section>
      ) : null}

      {isUnavailableProjection ? (
        <section style={styles.unavailablePanel} aria-labelledby="graph-unavailable-heading">
          <h3 id="graph-unavailable-heading" style={styles.unavailableTitle}>
            Graph Unavailable / グラフ利用不可
          </h3>
          <div style={styles.badgeRow}>
            <span style={styles.badge}>
              Safety Fallback Active / 安全側フォールバック中
            </span>
            <span style={styles.badge}>
              Unavailable Projection / 利用不可状態の投影
            </span>
            <span style={styles.badge}>
              Not Live Compare Data / 実比較データではありません
            </span>
            <span style={styles.badge}>
              No Execution Action / 実行操作はありません
            </span>
            {isRealCompareGuarded ? (
              <>
                <span style={styles.badge}>Guarded Source / ガード中ソース</span>
                <span style={styles.badge}>Not Enabled / 未有効</span>
                <span style={styles.badge}>No Live Fetch / ライブ取得なし</span>
                <span style={styles.badge}>
                  Validation Gate Required / 検証ゲート必須
                </span>
              </>
            ) : null}
          </div>
          <p style={styles.lead}>
            This graph is an unavailable projection. It is not live compare data.
            No workflow action is available. / このグラフは利用不可状態の投影です。
            実比較データではありません。実行操作はありません。
            {isRealCompareGuarded
              ? " real_compare_readonly is guarded and uses unavailable graph data in this phase."
              : ""}
          </p>
          <ul style={styles.compactList} aria-label="Unavailable graph reasons">
            {FALLBACK_UNAVAILABLE_REASONS.map((warning) => (
              <li key={warning}>
                <span style={styles.badge} title={WARNING_DISPLAY_LABELS[warning].cause}>
                  {WARNING_DISPLAY_LABELS[warning].label}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p style={styles.keyboardHelp}>
        キーボード操作 / Keyboard navigation: Tab で移動し、Enter または Space
        で詳細を表示します。これは表示切替のみで、実行操作ではありません / This
        only changes displayed detail. It does not execute any workflow.
      </p>

      <div style={styles.badgeRow} aria-label="Current graph context">
        <span style={styles.badge}>概要表示 / Overview View</span>
        <span style={styles.badge}>{graphData.metadata.activeLayer}</span>
        <span style={styles.badge}>表示モード / Active View: {activeViewMode}</span>
        <span style={styles.badge}>強調パス / Highlighted Path: {highlightedPathId}</span>
        <span style={styles.badge}>Source: {graphSourceDisplayLabel(dataSourceMode)}</span>
        <span style={styles.badge}>
          Compare Endpoint: {graphData.metadata.compareEndpointMethod} only
        </span>
        <span style={styles.badge}>No API / No DB / No Mutation</span>
      </div>

      <div style={styles.keyboardHelp} aria-label="Read-only graph projection path">
        <strong>Projection Path / 読み取り専用投影:</strong>{" "}
        {projectionSteps.join(" -> ")}
        <div style={styles.badgeRow}>
          <span style={styles.badge}>Trust Level: {selectedSourceOption.trustLevel}</span>
          <span style={styles.badge}>No API / API 接続なし</span>
          <span style={styles.badge}>No DB / DB 接続なし</span>
          <span style={styles.badge}>No Mutation / データ変更なし</span>
        </div>
      </div>

      {sourceWarnings.length > 0 ? (
        <div style={styles.keyboardHelp} role="status" aria-live="polite">
          <strong>Adapter warning visibility / 読み取り専用 caveat:</strong>{" "}
          <span style={styles.badge}>Warnings: {sourceWarnings.length}</span>
          <ul style={styles.compactList} aria-label="Adapter warning list">
            {sourceWarnings.map((warning) => (
              <li key={warning}>
                <span style={styles.badge} title={WARNING_DISPLAY_LABELS[warning].cause}>
                  {WARNING_DISPLAY_LABELS[warning].label}
                </span>
              </li>
            ))}
          </ul>
          表示上の注意情報のみです。No workflow action is available / 実行操作はありません。
        </div>
      ) : null}

      <nav style={styles.breadcrumb} aria-label="Graph breadcrumb">
        <button
          type="button"
          className="inventory-graph-focusable"
          style={styles.breadcrumbButton}
          onClick={() => selectBreadcrumb("summary")}
          aria-label="グラフ要約を表示 / Show Graph Summary detail. Display change only."
        >
          グラフ要約 / Graph Summary
        </button>
        <span aria-hidden="true">&gt;</span>
        <button
          type="button"
          className="inventory-graph-focusable"
          style={styles.breadcrumbButton}
          onClick={() => selectSummary("collapse")}
          aria-label="崩壊傾向要約を表示 / Show Collapse Summary detail. Display change only."
        >
          崩壊傾向 / Collapse Summary
        </button>
        <span aria-hidden="true">&gt;</span>
        <button
          type="button"
          className="inventory-graph-focusable"
          style={styles.breadcrumbButton}
          onClick={() => selectBreadcrumb("node")}
          aria-label="ノード詳細を表示 / Show Node Detail. Display change only."
        >
          ノード詳細 / Node Detail
        </button>
      </nav>

      <div className="inventory-graph-layout-grid" style={styles.layoutGrid}>
        <section style={styles.sectionBox} aria-labelledby="graph-summary-panel-heading">
          <h3 id="graph-summary-panel-heading">要約パネル / Summary Panel</h3>
          <p style={styles.lead}>
            {graphSourceDisplayLabel(dataSourceMode)} の summary を表示します。クリックは local
            state の表示切替のみです。
            {isFallbackUnavailable
              ? " Unavailable placeholder summary / 利用不可 placeholder 要約として表示しています。"
              : ""}
            {isRealCompareGuarded
              ? " real_compare_readonly は未有効のため、利用不可 graph data を表示しています。"
              : ""}
          </p>
          <div style={styles.cardGrid}>
            {orderedSummaries.map((card) => (
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

      <div className="inventory-graph-bottom-grid" style={styles.bottomGrid}>
        <aside style={styles.sectionBox} aria-labelledby="graph-filter-panel-heading">
          <h3 id="graph-filter-panel-heading">表示フィルター / Filter Panel</h3>
          <p style={styles.lead}>
            Graph source と view mode は local state の表示切替のみです。
          </p>
          {graphData.viewModes.map((view) => (
            <button
              key={view.id}
              type="button"
              className="inventory-graph-focusable"
              style={{
                ...styles.filterButton,
                ...(activeViewMode === view.id ? styles.activeFilterButton : {}),
              }}
              onClick={() => setActiveViewMode(view.id)}
              aria-pressed={activeViewMode === view.id}
              aria-label={`表示モードを切替 / Change view mode: ${view.label}. Display change only. No execution action.`}
            >
              {view.label}
            </button>
          ))}

          <section style={{ marginTop: "1rem" }} aria-labelledby="graph-legend-heading">
            <h3 id="graph-legend-heading">凡例 / Legend</h3>
            <div style={styles.legendGrid} role="list" aria-label="Read-only graph legend">
              <span style={{ ...styles.badge, ...cardToneStyle("critical") }} role="listitem">
                重大 / Critical
              </span>
              <span style={{ ...styles.badge, ...cardToneStyle("warning") }} role="listitem">
                注意 / Warning
              </span>
              <span style={{ ...styles.badge, ...cardToneStyle("stable") }} role="listitem">
                安定 / Stable
              </span>
              <span style={{ ...styles.badge, ...styles.readOnlyBadge }} role="listitem">
                Read Only / 読み取り専用
              </span>
              <span style={{ ...styles.badge, ...styles.noExecutionBadge }} role="listitem">
                Observability Only / 観測専用
              </span>
              <span style={styles.badge} role="listitem">No Execution Controls / 実行操作なし</span>
              <span style={styles.badge} role="listitem">No Mutation / データ変更なし</span>
              <span style={styles.badge} role="listitem">SVG Relation Overlay / SVG関係線</span>
              <span style={styles.badge} role="listitem">Edge Semantics / 関係線の意味</span>
              <span style={styles.badge} role="listitem">Observability Path Only / 観測用経路のみ</span>
              <span style={styles.badge} role="listitem">No Execution Route / 実行経路ではありません</span>
              <span style={styles.badge} role="listitem">Local State / 画面内状態</span>
            </div>
          </section>
        </aside>

        <section
          style={styles.sectionBox}
          aria-labelledby="graph-inspector-panel-heading"
          aria-live="polite"
        >
          <div style={styles.header}>
            <div>
              <h3 id="graph-inspector-panel-heading">詳細確認 / Inspector Panel</h3>
              <p style={styles.lead}>
                選択中 graph source の metadata を確認します。理由・根拠・シグナルをここで読みます。
                切替は表示変更のみです。
                {isUnavailableProjection
                  ? " fallback_unavailable は正常データではなく、利用不可状態の説明です。"
                  : ""}
                {isRealCompareGuarded
                  ? " real_compare_readonly はガード中で、ライブ取得は行いません。"
                  : ""}
              </p>
            </div>
            <BoundaryBadges />
          </div>

          <div style={styles.badgeRow} role="tablist" aria-label="Inspector tabs / 詳細確認タブ">
            {(["summary", "node", "edge"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className="inventory-graph-focusable"
                role="tab"
                style={{
                  ...styles.filterButton,
                  width: "auto",
                  ...(activeInspectorTab === tab ? styles.activeFilterButton : {}),
                }}
                onClick={() => setActiveInspectorTab(tab)}
                aria-pressed={activeInspectorTab === tab}
                aria-selected={activeInspectorTab === tab}
                aria-label={`${inspectorTabLabels[tab]} を表示 / Show ${tab} detail. Display change only. No execution action.`}
              >
                {inspectorTabLabels[tab]}
              </button>
            ))}
          </div>

          <div style={{ ...styles.inspectorRow, marginTop: "0.75rem" }}>
            <strong style={styles.inspectorLabel}>{inspectorTitle}</strong>
            <div style={styles.inspectorValue}>
              観測用の意味情報です。実行経路ではありません / No Execution Route。
            </div>
          </div>

          <div style={styles.inspectorGrid}>
            {inspectorRows.map(([label, value]) => (
              <div key={label} className="inventory-graph-inspector-row" style={styles.inspectorRow}>
                <strong style={styles.inspectorLabel}>{label}</strong>
                <div style={styles.inspectorValue}>{value}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
