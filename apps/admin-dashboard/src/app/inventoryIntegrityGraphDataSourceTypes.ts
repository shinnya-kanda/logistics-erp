export type InventoryIntegrityGraphDataSourceMode =
  | "mock"
  | "adapter_fixture"
  | "compare_fixture"
  | "real_compare_readonly"
  | "fallback_unavailable";

export type InventoryIntegrityGraphDataSourceTrustLevel =
  | "Demo only"
  | "Adapter verification only"
  | "Shape verification only"
  | "Guarded live source"
  | "Safety fallback";

export interface InventoryIntegrityGraphDataSourceOption {
  readonly id: InventoryIntegrityGraphDataSourceMode;
  readonly label: string;
  readonly shortLabel: string;
  readonly trustLevel: InventoryIntegrityGraphDataSourceTrustLevel;
  readonly disclosure: string;
  readonly caveat: string;
  readonly isLiveData: boolean;
  readonly isGuarded?: boolean;
  readonly isEnabled?: boolean;
}

// B77-47 keeps real_compare_readonly typed, guarded, and hidden behind a false flag.
// It must not fetch or load live compare data until a later validation gate passes.
