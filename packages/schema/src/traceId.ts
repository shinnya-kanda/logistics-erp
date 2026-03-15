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
 * 共通物流キー trace_id を組み立てる。
 * ルール: TRC:{normalized(issue_no)}:{normalized(part_no)}
 * supplier は引数で受け取るが現状は trace_id には含めない（将来拡張用）。
 *
 * 例:
 *   buildTraceId({ issue_no: "TEST-001", part_no: "P-100" }) => "TRC:TEST-001:P-100"
 *   buildTraceId({ issue_no: "a/b", part_no: "c" }) => "TRC:A-B:C"
 *
 * @throws issue_no も part_no も両方空または正規化後に空の場合
 */
export function buildTraceId(input: BuildTraceIdInput): string {
  const issue = normalizeTraceToken(input.issue_no);
  const part = normalizeTraceToken(input.part_no);

  if (issue === "UNKNOWN" && part === "UNKNOWN") {
    throw new Error(
      "[traceId] buildTraceId: issue_no と part_no の少なくとも一方が必要です。"
    );
  }

  return `TRC:${issue}:${part}`;
}
