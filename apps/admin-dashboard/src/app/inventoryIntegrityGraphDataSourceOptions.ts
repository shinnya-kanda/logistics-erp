import type {
  InventoryIntegrityGraphDataSourceMode,
  InventoryIntegrityGraphDataSourceOption,
} from "./inventoryIntegrityGraphDataSourceTypes";

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
    disclosure: "Not Live Compare Data / 実比較データではありません",
    caveat: "Adapter output from static compare response fixture only.",
    isLiveData: false,
  },
  {
    id: "fallback_unavailable",
    label: "Graph Unavailable / グラフ利用不可",
    shortLabel: "Fallback",
    trustLevel: "Safety fallback",
    disclosure: "Fallback graph state",
    caveat: "Adapter Graph Unavailable / アダプタグラフ利用不可",
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

// Future candidate only. B77-37 intentionally does not expose real_compare_readonly.
