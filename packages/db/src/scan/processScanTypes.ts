import type {
  AmbiguousScanCandidate,
  ScanEventRow,
  ShipmentItemIssueRow,
  ShipmentItemMatchResult,
  ShipmentItemProgressRow,
  VerificationResult,
} from "@logistics-erp/schema";

export type ProcessScanOutput = {
  scanEvent: ScanEventRow
  match: ShipmentItemMatchResult
  verification: VerificationResult | null
  progress: ShipmentItemProgressRow | null
  issue: ShipmentItemIssueRow | null
  /** 同一 idempotency_key の再送で既存 scan を返した */
  idempotency_hit: boolean
  /** 今回の呼び出しで新規 scan_events 行を作成した */
  created_new_scan: boolean
  /** ambiguous 時の候補（match.candidates と同一。JSON クライアント向け） */
  ambiguous_candidates?: AmbiguousScanCandidate[] | null
}
