import type {
  AmbiguousScanCandidate,
  ScanHttpPostScansSuccessBody,
} from "@logistics-erp/schema";

export type ScanBannerTone = "ok" | "ng" | "check" | "neutral";

export type ScanBanner = {
  tone: ScanBannerTone;
  title: string;
  subtitle?: string;
};

function scanEventManualResolved(
  raw: ScanHttpPostScansSuccessBody["scanEvent"]["raw_payload"]
): boolean {
  return (
    raw !== null &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    (raw as Record<string, unknown>).manual_ambiguous_resolution === true
  );
}

/** ambiguous 候補（match / トップレベル のどちらか） */
export function getAmbiguousCandidates(
  data: ScanHttpPostScansSuccessBody
): AmbiguousScanCandidate[] {
  if (data.match.kind !== "ambiguous") return [];
  const fromTop = data.ambiguous_candidates;
  if (Array.isArray(fromTop) && fromTop.length > 0) return fromTop;
  const fromMatch = data.match.candidates;
  return Array.isArray(fromMatch) ? fromMatch : [];
}

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
    const n = data.match.candidate_ids.length;
    return {
      tone: "check",
      title: "CHECK / AMBIGUOUS",
      subtitle: `候補 ${n} 件 — 一覧から 1 件を選んで再照合するか、スコープを絞って再スキャンしてください`,
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

  const manualLine = scanEventManualResolved(data.scanEvent.raw_payload)
    ? "RESOLVED MANUALLY · 候補選択で再照合"
    : undefined;

  switch (v.status) {
    case "matched":
      return {
        tone: "ok",
        title: "OK / MATCHED",
        subtitle: manualLine,
      };
    case "shortage":
      return {
        tone: "check",
        title: "CHECK / SHORTAGE",
        subtitle: manualLine ?? "数量が予定未満です",
      };
    case "excess":
      return {
        tone: "check",
        title: "CHECK / EXCESS",
        subtitle: manualLine ?? "数量が予定を超えています",
      };
    case "wrong_part":
      return {
        tone: "ng",
        title: "NG / WRONG PART",
        subtitle: manualLine,
      };
    case "wrong_location":
      return {
        tone: "ng",
        title: "NG / WRONG LOCATION",
        subtitle: manualLine,
      };
    case "unknown":
      return {
        tone: "check",
        title: "CHECK / UNKNOWN",
        subtitle: manualLine ?? v.notes ?? undefined,
      };
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
