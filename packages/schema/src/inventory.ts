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
