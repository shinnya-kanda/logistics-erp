export type InventoryIntegrityGraphDataSourceMode =
  | "mock"
  | "adapter_fixture"
  | "fallback_unavailable";

export type InventoryIntegrityGraphDataSourceTrustLevel =
  | "Demo only"
  | "Adapter verification only"
  | "Safety fallback";

export interface InventoryIntegrityGraphDataSourceOption {
  readonly id: InventoryIntegrityGraphDataSourceMode;
  readonly label: string;
  readonly shortLabel: string;
  readonly trustLevel: InventoryIntegrityGraphDataSourceTrustLevel;
  readonly disclosure: string;
  readonly caveat: string;
  readonly isLiveData: boolean;
}

// Future candidate only. B77-37 does not implement real compare data mode.
// real_compare_readonly must remain behind a separate read-only integration gate.
