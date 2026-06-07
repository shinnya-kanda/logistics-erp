import type {
  InventoryIntegrityGraphDataSourceMode,
  InventoryIntegrityGraphDataSourceOption,
} from "./inventoryIntegrityGraphDataSourceTypes";
import { ENABLE_REAL_COMPARE_READONLY_GRAPH_SOURCE } from "./inventoryIntegrityGraphFeatureFlags";

export const inventoryIntegrityGraphDataSourceOptions: readonly InventoryIntegrityGraphDataSourceOption[] = [
  {
    id: "mock",
    label: "Mock Data / モックデータ",
    shortLabel: "Mock",
    trustLevel: "Demo only",
    disclosure: "Static mock graph",
    caveat: "Not Live Compare Data / 実比較データではありません",
    isLiveData: false,
  },
  {
    id: "adapter_fixture",
    label: "Fixture Adapter / フィクスチャアダプタ",
    shortLabel: "Adapter Fixture",
    trustLevel: "Adapter verification only",
    disclosure: "Read-only Compare Fixture Projection",
    caveat:
      "Not Live Compare Data / 実比較データではありません。Static compare response fixture only.",
    isLiveData: false,
  },
  {
    id: "compare_fixture",
    label: "Compare Fixture / 比較レスポンスフィクスチャ",
    shortLabel: "Compare Fixture",
    trustLevel: "Shape verification only",
    disclosure: "Contract validation fixture",
    caveat:
      "Not live compare data. Used for adapter contract validation only. / 実比較データではありません。アダプタ契約検証用のみ。",
    isLiveData: false,
  },
  {
    id: "real_compare_readonly",
    label: "Real Compare Readonly / 実比較データ（読み取り専用）",
    shortLabel: "Real Compare",
    trustLevel: "Guarded live source",
    disclosure: "Guarded source mode. Not enabled in this phase.",
    caveat:
      "Requires validation gate. Falls back to unavailable graph. / 検証ゲート必須。利用不可グラフへフォールバックします。",
    isLiveData: false,
    isGuarded: true,
    isEnabled: false,
  },
  {
    id: "fallback_unavailable",
    label: "Graph Unavailable / グラフ利用不可",
    shortLabel: "Fallback",
    trustLevel: "Safety fallback",
    disclosure: "Unavailable Graph Projection",
    caveat:
      "Not live compare data / 実比較データではありません。Not healthy graph / 正常グラフではありません。",
    isLiveData: false,
  },
];

export function getInventoryIntegrityGraphDataSourceOption(
  mode: InventoryIntegrityGraphDataSourceMode,
): InventoryIntegrityGraphDataSourceOption {
  return (
    inventoryIntegrityGraphDataSourceOptions.find((option) => option.id === mode) ??
    inventoryIntegrityGraphDataSourceOptions[0]
  );
}

export function getVisibleInventoryIntegrityGraphDataSourceOptions(): readonly InventoryIntegrityGraphDataSourceOption[] {
  if (ENABLE_REAL_COMPARE_READONLY_GRAPH_SOURCE) {
    return inventoryIntegrityGraphDataSourceOptions;
  }

  return inventoryIntegrityGraphDataSourceOptions.filter(
    (option) => option.id !== "real_compare_readonly",
  );
}

// real_compare_readonly is defined, but hidden unless the B77-47 flag is enabled.
