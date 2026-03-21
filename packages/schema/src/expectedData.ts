/** Phase1: 取込ファイルメタ（DB: source_files） */
export type SourceFile = {
  id: string
  file_type: string
  file_name: string
  file_path: string | null
  source_system: string | null
  checksum: string | null
  imported_at: string
  imported_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

/** Phase1: 出荷予定ヘッダ（DB: shipments の Expected 用カラム） */
export type ExpectedShipmentHeader = {
  id: string
  shipment_no: string | null
  source_file_id: string | null
  shipper_code: string | null
  shipper_name: string | null
  receiver_code: string | null
  receiver_name: string | null
  delivery_date: string | null
  scheduled_ship_date: string | null
  status: string
  remarks: string | null
  created_at: string
  updated_at: string
}

/** Phase1: 出荷予定明細（DB: shipment_items） */
export type ShipmentItem = {
  id: string
  shipment_id: string
  line_no: number | null
  trace_id: string
  part_no: string
  part_name: string | null
  quantity_expected: string
  quantity_unit: string | null
  unload_location: string | null
  delivery_date: string | null
  lot_no: string | null
  external_barcode: string | null
  match_key: string | null
  status: string
  source_row_no: number | null
  created_at: string
  updated_at: string
}

/** importer 内部の正規化済み 1 行（CSV 非依存） */
export type NormalizedShipmentLineInput = {
  issue_no: string
  supplier: string
  part_no: string
  part_name: string
  quantity_expected: number
  delivery_date: string
  /** 元 CSV の 1-based 行番号（ヘッダ除く） */
  source_row_no: number
}
