export type Inventory = {
  id: string
  created_at: string
  updated_at: string
  supplier: string | null
  part_no: string
  part_name: string | null
  on_hand_qty: number
  allocated_qty: number
  available_qty: number
}

/** inventory の update 用（部分更新）。 */
export type InventoryUpdateInput = {
  on_hand_qty?: number
  allocated_qty?: number
  available_qty?: number
  part_name?: string | null
}

/** inventory への 1 件 insert 用。id / created_at / updated_at は DB で付与。 */
export type InventoryInsertInput = {
  supplier?: string | null
  part_no: string
  part_name?: string | null
  on_hand_qty?: number
  allocated_qty?: number
  available_qty?: number
}
