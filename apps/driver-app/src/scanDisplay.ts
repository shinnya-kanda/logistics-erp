import type { ScanHttpPostScansSuccessBody } from "@logistics-erp/schema";

export type ScanBannerTone = "ok" | "ng" | "check" | "neutral";

export type ScanBanner = {
  tone: ScanBannerTone;
  title: string;
  subtitle?: string;
};

/** 現場向けの短いラベル（match / verification / 冪等を優先） */
export function getScanBanner(data: ScanHttpPostScansSuccessBody): ScanBanner {
  if (data.idempotency_hit && !data.created_new_scan) {
    return {
      tone: "neutral",
      title: "RETRIED / DUPLICATE REPLAY",
      subtitle: "同一 idempotency_key の結果を返しました",
    };
  }

  if (data.match.kind === "ambiguous") {
    return {
      tone: "check",
      title: "CHECK / AMBIGUOUS",
      subtitle: `候補 ${data.match.candidate_ids.length} 件 — スコープや trace を絞ってください`,
    };
  }

  if (data.match.kind === "none") {
    return {
      tone: "ng",
      title: "NOT FOUND",
      subtitle: "明細にマッチしませんでした",
    };
  }

  const v = data.verification;
  if (!v) {
    return {
      tone: "neutral",
      title: data.scanEvent.result_status.toUpperCase(),
      subtitle: "照合なし（スキャンのみ記録）",
    };
  }

  switch (v.status) {
    case "matched":
      return { tone: "ok", title: "OK / MATCHED" };
    case "shortage":
      return { tone: "check", title: "CHECK / SHORTAGE", subtitle: "数量が予定未満です" };
    case "excess":
      return { tone: "check", title: "CHECK / EXCESS", subtitle: "数量が予定を超えています" };
    case "wrong_part":
      return { tone: "ng", title: "NG / WRONG PART" };
    case "wrong_location":
      return { tone: "ng", title: "NG / WRONG LOCATION" };
    case "unknown":
      return { tone: "check", title: "CHECK / UNKNOWN", subtitle: v.notes || undefined };
    default:
      return {
        tone: "neutral",
        title: data.scanEvent.result_status.toUpperCase(),
      };
  }
}

export function scanErrorKindLabel(kind: string): string {
  switch (kind) {
    case "validation":
      return "入力エラー（400）";
    case "server":
      return "サーバーエラー（500 など）";
    case "network":
      return "ネットワークエラー";
    case "timeout":
      return "タイムアウト";
    case "parse":
      return "応答の解釈エラー";
    default:
      return "エラー";
  }
}
