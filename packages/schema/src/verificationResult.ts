/**
 * Phase2: Expected vs Actual の照合結果（単一スキャン × 単一明細の最小モデル）
 */

import type { AmbiguousScanCandidate } from "./ambiguousScanCandidate.js";

export type VerificationStatus =
  | "matched"
  | "shortage"
  | "excess"
  | "wrong_part"
  | "wrong_location"
  | "unknown"

export type MatchKind = "unique" | "none" | "ambiguous"

export type ShipmentItemMatchResult =
  | { kind: "unique"; shipment_item_id: string }
  | { kind: "none" }
  | {
      kind: "ambiguous";
      candidate_ids: string[];
      /** 候補の最小表示用（replay 時は raw_payload から復元） */
      candidates: AmbiguousScanCandidate[];
    }

export type ExpectedSummary = {
  shipment_item_id: string
  part_no: string
  quantity_expected: number
  unload_location: string | null
  trace_id: string | null
}

export type ActualSummary = {
  scanned_code: string
  scanned_part_no: string | null
  quantity_delta: number
  unload_location_scanned: string | null
  trace_id: string | null
}

export type VerificationResult = {
  status: VerificationStatus
  expected: ExpectedSummary | null
  actual: ActualSummary
  /** progress / issue 用の補足 */
  notes?: string
  issue?: {
    issue_type: string
    expected_value: string
    actual_value: string
    severity: string | null
  }
}
