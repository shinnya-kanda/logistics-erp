/**
 * Phase 2.2: POST /scans 成功レスポンス（processScanInput の JSON 本文と同一構造）
 */
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
};

export type ScanHttpErrorBody = {
  error: string;
};
