/**
 * Phase 2.3: ambiguous マッチ時に UI へ返す候補明細（自動 1 件確定はしない）
 */

export type AmbiguousScanCandidateMatchBasis =
  | "trace_id"
  | "part_no"
  | "external_barcode"
  | "match_key"
  | "unknown";

export type AmbiguousScanCandidate = {
  shipment_item_id: string;
  shipment_id: string;
  part_no: string;
  part_name: string | null;
  /** DB の numeric 文字列表現 */
  quantity_expected: string;
  quantity_unit: string | null;
  unload_location: string | null;
  trace_id: string | null;
  delivery_date: string | null;
  match_basis: AmbiguousScanCandidateMatchBasis;
};
