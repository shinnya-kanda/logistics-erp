/**
 * trace_id 用の正規化・生成ヘルパー。
 * 物流単位を追う共通キー（trace_id）のルールを一箇所にまとめる。
 *
 * TODO: 将来 trace_id を trace_units 親テーブルへ昇格させる可能性あり。
 */

/**
 * トークン文字列を正規化する。
 * - null/undefined → ""
 * - trim、大文字化
 * - 連続空白を1つに
 * - ":" "/" "\\" 空白 → "-"
 * - 英数字・ハイフン・アンダースコア以外は "-" に置換
 * - 結果が空なら "UNKNOWN"
 *
 * 例:
 *   normalizeTraceToken("  test-001  ") => "TEST-001"
 *   normalizeTraceToken("a/b:c") => "A-B-C"
 *   normalizeTraceToken(null) => "UNKNOWN"
 */
export function normalizeTraceToken(
  value: string | null | undefined
): string {
  let s = (value ?? "").trim().toUpperCase();
  if (!s) return "UNKNOWN";

  s = s.replace(/[\s:/\\]+/g, "-");
  s = s.replace(/[^A-Z0-9_-]/g, "-");
  s = s.replace(/-+/g, "-").replace(/^-|-$/g, "");

  return s || "UNKNOWN";
}

export interface BuildTraceIdInput {
  issue_no?: string | null
  part_no?: string | null
  supplier?: string | null
}

/**
 * 共通物流キー trace_id を組み立てる（2 引数版）。
 * ルール: TRC:{normalized(issueNo)}:{normalized(partNo)}
 *
 * 例: buildTraceId("TEST-001", "P-100") => "TRC:TEST-001:P-100"
 */
export function buildTraceId(
  issueNo: string | null | undefined,
  partNo: string | null | undefined
): string {
  const issue = normalizeTraceToken(issueNo);
  const part = normalizeTraceToken(partNo);

  if (issue === "UNKNOWN" && part === "UNKNOWN") {
    throw new Error(
      "[traceId] buildTraceId: issueNo と partNo の少なくとも一方が必要です。"
    );
  }

  return `TRC:${issue}:${part}`;
}

/**
 * 共通物流キー trace_id を組み立てる（オブジェクト版）。
 * buildTraceId(issue_no, part_no) のラッパー。
 */
export function buildTraceIdFromInput(input: BuildTraceIdInput): string {
  return buildTraceId(input.issue_no, input.part_no);
}
