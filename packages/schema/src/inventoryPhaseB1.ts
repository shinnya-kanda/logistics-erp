/** 部品在庫トランザクション種別（例: IN / OUT / MOVE / ADJUST） */
export type InventoryTransactionTypeCode =
  | "IN"
  | "OUT"
  | "MOVE"
  | "ADJUST"
  | (string & {})

/** 在庫種別（project / mrp） */
export type InventoryPhaseB1Kind = "project" | "mrp" | (string & {})

export type InventoryTransactionRow = {
  id: string
  transaction_type: string
  part_no: string
  part_name: string | null
  quantity: number
  quantity_unit: string
  warehouse_code: string | null
  location_code: string | null
  inventory_type: string
  occurred_at: string
  source_type: string | null
  source_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type InventoryTransactionInsertInput = {
  transaction_type: InventoryTransactionTypeCode | string
  part_no: string
  part_name?: string | null
  quantity: number
  quantity_unit: string
  warehouse_code?: string | null
  location_code?: string | null
  inventory_type: InventoryPhaseB1Kind | string
  occurred_at?: string
  source_type?: string | null
  source_id?: string | null
  notes?: string | null
}

export type PalletUnitStatusCode = "IN_STOCK" | "SHIPPED" | "CLOSED" | (string & {})

export type PalletUnitRow = {
  id: string
  pallet_no: string
  warehouse_code: string
  location_code: string
  inventory_type: string
  status: string
  storage_area_tsubo: number
  arrived_at: string
  closed_at: string | null
  created_at: string
  updated_at: string
}

export type PalletUnitInsertInput = {
  pallet_no: string
  warehouse_code: string
  location_code: string
  inventory_type: InventoryPhaseB1Kind | string
  status: PalletUnitStatusCode | string
  storage_area_tsubo?: number
  arrived_at?: string
  closed_at?: string | null
}

export type PalletTransactionTypeCode =
  | "ARRIVAL"
  | "MOVE"
  | "SHIP"
  | "ADJUST"
  | "CLOSE"
  | (string & {})

export type PalletTransactionRow = {
  id: string
  pallet_unit_id: string
  transaction_type: string
  from_location_code: string | null
  to_location_code: string | null
  occurred_at: string
  source_type: string | null
  source_id: string | null
  notes: string | null
  created_at: string
}

export type PalletTransactionInsertInput = {
  pallet_unit_id: string
  transaction_type: PalletTransactionTypeCode | string
  from_location_code?: string | null
  to_location_code?: string | null
  occurred_at?: string
  source_type?: string | null
  source_id?: string | null
  notes?: string | null
}

export type PalletItemLinkRow = {
  id: string
  pallet_unit_id: string
  part_no: string
  part_name: string | null
  quantity: number
  quantity_unit: string
  linked_at: string
  unlinked_at: string | null
  created_at: string
  updated_at: string
}

export type PalletItemLinkInsertInput = {
  pallet_unit_id: string
  part_no: string
  part_name?: string | null
  quantity: number
  quantity_unit: string
  linked_at?: string
  unlinked_at?: string | null
}

/** 集約キャッシュ。真実は inventory_transactions。 */
export type InventoryCurrentRow = {
  id: string
  part_no: string
  warehouse_code: string
  location_code: string
  inventory_type: string
  quantity_on_hand: number
  updated_at: string
}

export type InventoryCurrentUpsertInput = {
  part_no: string
  warehouse_code: string
  location_code: string
  inventory_type: InventoryPhaseB1Kind | string
  quantity_on_hand: number
}

/** 将来: pallet_managed / simple_managed 切替用（今回は型のみ） */
export type InventoryMode = "pallet_managed" | "simple_managed"
