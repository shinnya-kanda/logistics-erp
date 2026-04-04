/** 在庫種別（INVENTORY_CONTEXT: project / mrp） */
export type InventoryKind = "project" | "mrp"

/** 数量単位（part / pallet） */
export type QuantityUnitKind = "part" | "pallet"

/** inventory_transactions.transaction_type の例 */
export type InventoryTransactionType =
  | "in"
  | "out"
  | "adjust"
  | "link_to_pallet"
  | "unlink_from_pallet"
  | (string & {})

export type InventoryTransaction = {
  id: string
  transaction_type: string
  inventory_type: string
  part_no: string
  part_name: string | null
  quantity: number
  quantity_unit: string
  occurred_at: string
  warehouse_code: string | null
  location_code: string | null
  shipment_id: string | null
  source_reference: string | null
  remarks: string | null
  created_at: string
  updated_at: string
}

export type InventoryTransactionInsertInput = {
  transaction_type: string
  inventory_type: InventoryKind | string
  part_no: string
  part_name?: string | null
  quantity: number
  quantity_unit?: QuantityUnitKind | string
  occurred_at?: string
  warehouse_code?: string | null
  location_code?: string | null
  shipment_id?: string | null
  source_reference?: string | null
  remarks?: string | null
}

export type PalletUnitStatus = "active" | "stored" | "shipped" | "closed" | (string & {})

export type PalletUnit = {
  id: string
  pallet_no: string | null
  trace_id: string | null
  inventory_type: string | null
  status: string | null
  warehouse_code: string | null
  location_code: string | null
  received_at: string | null
  closed_at: string | null
  storage_area_tsubo: number
  remarks: string | null
  created_at: string
  updated_at: string
}

export type PalletUnitInsertInput = {
  pallet_no?: string | null
  trace_id?: string | null
  inventory_type?: InventoryKind | string | null
  status?: PalletUnitStatus | null
  warehouse_code?: string | null
  location_code?: string | null
  received_at?: string | null
  closed_at?: string | null
  storage_area_tsubo?: number
  remarks?: string | null
}

export type PalletTransactionType =
  | "receive"
  | "store"
  | "move"
  | "ship"
  | "close"
  | "adjust_storage"
  | (string & {})

export type PalletTransaction = {
  id: string
  pallet_unit_id: string
  transaction_type: string
  occurred_at: string
  warehouse_code: string | null
  location_code: string | null
  storage_area_tsubo: number | null
  source_reference: string | null
  remarks: string | null
  created_at: string
}

export type PalletTransactionInsertInput = {
  pallet_unit_id: string
  transaction_type: PalletTransactionType | string
  occurred_at?: string
  warehouse_code?: string | null
  location_code?: string | null
  storage_area_tsubo?: number | null
  source_reference?: string | null
  remarks?: string | null
}

export type PalletItemLink = {
  id: string
  pallet_unit_id: string
  part_no: string
  part_name: string | null
  quantity: number
  quantity_unit: string
  linked_at: string
  unlinked_at: string | null
  remarks: string | null
  created_at: string
  updated_at: string
}

export type PalletItemLinkInsertInput = {
  pallet_unit_id: string
  part_no: string
  part_name?: string | null
  quantity: number
  quantity_unit?: QuantityUnitKind | string
  linked_at?: string
  unlinked_at?: string | null
  remarks?: string | null
}

export type BillingSegmentType =
  | "storage"
  | "handling"
  | "inbound"
  | "outbound"
  | (string & {})

export type BillingSegmentReferenceType =
  | "pallet_unit"
  | "inventory_transaction"
  | "manual"
  | (string & {})

export type BillingSegment = {
  id: string
  billing_type: string
  inventory_type: string | null
  unit_type: string
  reference_type: string | null
  reference_id: string | null
  segment_start_at: string | null
  segment_end_at: string | null
  quantity: number | null
  rate_type: string | null
  rate_value: number | null
  amount: number | null
  billing_month: string | null
  status: string
  remarks: string | null
  created_at: string
  updated_at: string
}

export type BillingSegmentInsertInput = {
  billing_type: BillingSegmentType | string
  inventory_type?: InventoryKind | string | null
  unit_type: QuantityUnitKind | string
  reference_type?: BillingSegmentReferenceType | string | null
  reference_id?: string | null
  segment_start_at?: string | null
  segment_end_at?: string | null
  quantity?: number | null
  rate_type?: string | null
  rate_value?: number | null
  amount?: number | null
  billing_month?: string | null
  status?: string
  remarks?: string | null
}

export type BillingMonthly = {
  id: string
  billing_month: string
  customer_code: string | null
  customer_name: string | null
  inventory_type: string | null
  total_amount: number
  status: string
  calculated_at: string | null
  confirmed_at: string | null
  remarks: string | null
  created_at: string
  updated_at: string
}

export type BillingMonthlyInsertInput = {
  billing_month: string
  customer_code?: string | null
  customer_name?: string | null
  inventory_type?: InventoryKind | string | null
  total_amount?: number
  status?: string
  calculated_at?: string | null
  confirmed_at?: string | null
  remarks?: string | null
}
