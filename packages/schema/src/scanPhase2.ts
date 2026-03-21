/** DB: scan_events 行（Phase2） */
export type ScanEventRow = {
  id: string
  trace_id: string | null
  shipment_item_id: string | null
  scan_type: string
  scanned_code: string
  scanned_part_no: string | null
  quantity_scanned: string | null
  quantity_unit: string | null
  unload_location_scanned: string | null
  result_status: string
  device_id: string | null
  operator_id: string | null
  operator_name: string | null
  scanned_at: string
  raw_payload: Record<string, unknown> | null
  created_at: string
}

/** DB: shipment_item_progress */
export type ShipmentItemProgressRow = {
  id: string
  shipment_item_id: string
  trace_id: string | null
  quantity_expected: string
  quantity_scanned_total: string
  progress_status: string
  first_scanned_at: string | null
  last_scanned_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

/** DB: shipment_item_issues */
export type ShipmentItemIssueRow = {
  id: string
  shipment_item_id: string
  trace_id: string | null
  issue_type: string
  severity: string | null
  expected_value: string | null
  actual_value: string | null
  detected_at: string
  resolved_at: string | null
  resolution_note: string | null
  created_at: string
  updated_at: string
}
