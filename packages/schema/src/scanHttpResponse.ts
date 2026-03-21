/**
 * Phase 2.2–2.3: POST /scans 成功レスポンス（processScanInput の JSON 本文と同一構造）
 */
import type { AmbiguousScanCandidate } from "./ambiguousScanCandidate.js";
import type { ScanEventRow, ShipmentItemIssueRow, ShipmentItemProgressRow } from "./scanPhase2.js";
import type { ShipmentItemMatchResult, VerificationResult } from "./verificationResult.js";

export type ScanHttpPostScansSuccessBody = {
  scanEvent: ScanEventRow;
  match: ShipmentItemMatchResult;
  verification: VerificationResult | null;
  progress: ShipmentItemProgressRow | null;
  issue: ShipmentItemIssueRow | null;
  idempotency_hit: boolean;
  created_new_scan: boolean;
  /** match.kind === "ambiguous" のとき候補詳細（match.candidates と同一） */
  ambiguous_candidates?: AmbiguousScanCandidate[] | null;
};

export type ScanHttpErrorBody = {
  error: string;
};
