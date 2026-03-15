export type StockMovementType =
  | "IN"
  | "OUT"
  | "ADJUST"
  | "RESERVE"
  | "RELEASE"

export type StockMovement = {
  id: string
  created_at: string
  movement_type: StockMovementType
  supplier: string | null
  part_no: string
  part_name: string | null
  quantity: number
  movement_date: string
  source_type: string | null
  source_ref: string | null
  shipment_id: string | null
  note: string | null
  idempotency_key: string | null
}

/** stock_movements への 1 件 insert 用。id / created_at は DB で付与。 */
export type StockMovementInsertInput = {
  movement_type: StockMovementType
  supplier?: string | null
  part_no: string
  part_name?: string | null
  quantity: number
  movement_date?: string
  source_type?: string | null
  source_ref?: string | null
  shipment_id?: string | null
  note?: string | null
  idempotency_key?: string | null
}
