import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  getStoredWarehouseCode,
  postPalletItemOut,
  setStoredWarehouseCode,
  type PalletItemOutSuccessBody,
  type ScanApiError,
} from "./scanApiClient.js";

type ReaderTarget = "pallet_code" | "part_no";

type PalletItemOutFields = {
  pallet_code: string;
  part_no: string;
  quantity: string;
  project_no: string;
  operator_name: string;
  remarks: string;
};

type ParsedPartCode39 = {
  partNo: string | null;
  quantity: number | null;
};

const initialFields: PalletItemOutFields = {
  pallet_code: "",
  part_no: "",
  quantity: "1",
  project_no: "",
  operator_name: "",
  remarks: "",
};

function trimOrUndefined(s: string): string | undefined {
  const t = s.trim();
  return t || undefined;
}

function normalizeCode39Base(raw: string): string {
  return raw
    .replace(/[＊*]/g, "")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    )
    .toUpperCase()
    .trim();
}

function normalizePalletCode(raw: string): string {
  return normalizeCode39Base(raw)
    .replace(/\u3000/g, "")
    .replace(/[\r\n]+/g, "");
}

function parsePartCode39(raw: string): ParsedPartCode39 {
  const normalized = normalizeCode39Base(raw)
    .replace(/\u3000/g, " ")
    .replace(/[\r\n]+/g, "")
    .replace(/\./g, " ");
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const partIndex = tokens.findIndex((token) => /^[A-Z0-9]{10,12}$/.test(token));
  if (partIndex < 0) return { partNo: null, quantity: null };

  const quantityToken = tokens
    .slice(partIndex + 1)
    .find((token) => /^[0-9]+$/.test(token));
  const quantity = quantityToken ? Number.parseInt(quantityToken, 10) : null;
  return {
    partNo: tokens[partIndex],
    quantity: quantity !== null && Number.isFinite(quantity) && quantity > 0 ? quantity : null,
  };
}

function isValidPalletCode(code: string): boolean {
  return /^[A-Z0-9-]+$/.test(code);
}

function createClientIdempotencyKey(prefix: string): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readerTargetLabel(target: ReaderTarget): string {
  return target === "pallet_code" ? "パレット" : "品番";
}

function playSuccessBeep() {
  try {
    const audioWindow = window as Window & {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextClass =
      audioWindow.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 740;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.14);
    oscillator.addEventListener("ended", () => void ctx.close(), { once: true });
  } catch {
    // 音が鳴らない端末でも出庫処理は止めない。
  }
}

function vibrateOnError() {
  navigator.vibrate?.([100, 50, 100]);
}

function itemOutErrorTitle(error: ScanApiError): string {
  if (error.kind === "network") return "通信エラー";
  if (error.kind === "timeout") return "API通信タイムアウト";
  if (error.kind === "validation") return "入力エラー";
  if (error.kind === "server") return "出庫エラー";
  return "不明なエラー";
}

function transactionText(transaction: Record<string, unknown>, key: string): string {
  const value = transaction[key];
  return typeof value === "string" ? value : "";
}

function displayNumber(value: string | number | undefined): string {
  if (value === undefined || value === "") return "-";
  return String(value);
}

export function PalletItemOutApp() {
  const readerInputRef = useRef<HTMLInputElement>(null);
  const palletCodeInputRef = useRef<HTMLInputElement>(null);
  const [fields, setFields] = useState<PalletItemOutFields>(initialFields);
  const [warehouseCodeDraft, setWarehouseCodeDraft] = useState(getStoredWarehouseCode);
  const [readerTarget, setReaderTarget] = useState<ReaderTarget>("pallet_code");
  const [readerValue, setReaderValue] = useState("");
  const [readerMessage, setReaderMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PalletItemOutSuccessBody | null>(null);
  const [error, setError] = useState<ScanApiError | null>(null);

  function applyReaderValue() {
    if (!readerValue.trim()) return;

    setResult(null);
    setError(null);

    if (readerTarget === "pallet_code") {
      const palletCode = normalizePalletCode(readerValue);
      if (!palletCode || !isValidPalletCode(palletCode)) {
        setReaderMessage("パレットコードは英数字とハイフンのみ使用できます。");
        return;
      }
      setFields((f) => ({ ...f, pallet_code: palletCode }));
      setReaderMessage(`パレット ${palletCode} を反映しました。`);
      setReaderTarget("part_no");
    } else {
      const parsed = parsePartCode39(readerValue);
      if (!parsed.partNo) {
        setReaderMessage("品番を抽出できません。10〜12桁の英数字を読み取ってください。");
        return;
      }
      setFields((f) => ({
        ...f,
        part_no: parsed.partNo ?? f.part_no,
        quantity: parsed.quantity !== null ? String(parsed.quantity) : f.quantity,
      }));
      setReaderMessage(
        parsed.quantity !== null
          ? `品番 ${parsed.partNo}、数量 ${parsed.quantity} を反映しました。`
          : `品番 ${parsed.partNo} を反映しました。数量は変更していません。`
      );
    }

    setReaderValue("");
    requestAnimationFrame(() => readerInputRef.current?.focus());
  }

  function handleReaderKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    applyReaderValue();
  }

  async function sendPalletItemOut() {
    if (submitting) return;

    const palletCode = normalizePalletCode(fields.pallet_code);
    const partNo = fields.part_no.trim().toUpperCase();
    const quantity = Number(fields.quantity);
    const warehouseCode = setStoredWarehouseCode(warehouseCodeDraft);
    const projectNo = trimOrUndefined(fields.project_no);

    setResult(null);
    setError(null);

    if (!palletCode) {
      setError({ kind: "validation", message: "パレットコードを入力してください。" });
      return;
    }
    if (!isValidPalletCode(palletCode)) {
      setError({ kind: "validation", message: "パレットコードは英数字とハイフンのみ使用できます。" });
      return;
    }
    if (!partNo) {
      setError({ kind: "validation", message: "品番を入力してください。" });
      return;
    }
    if (!/^[A-Z0-9]{10,12}$/.test(partNo)) {
      setError({ kind: "validation", message: "品番は10〜12桁の英数字で入力してください。" });
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError({ kind: "validation", message: "数量は 0 より大きい数値で入力してください。" });
      return;
    }

    setFields((f) => ({
      ...f,
      pallet_code: palletCode,
      part_no: partNo,
      project_no: fields.project_no,
    }));
    setSubmitting(true);

    try {
      const res = await postPalletItemOut(
        {
          pallet_code: palletCode,
          part_no: partNo,
          quantity,
          warehouse_code: warehouseCode,
          project_no: projectNo,
          operator_name: trimOrUndefined(fields.operator_name),
          remarks: trimOrUndefined(fields.remarks),
          idempotency_key: createClientIdempotencyKey("pallet-item-out"),
        },
        { timeoutMs: 10_000 }
      );

      if (res.ok) {
        playSuccessBeep();
        setResult(res.data);
        setFields((f) => ({
          ...initialFields,
          project_no: f.project_no,
          operator_name: f.operator_name,
        }));
        setReaderValue("");
        setReaderMessage(null);
        setReaderTarget("pallet_code");
        requestAnimationFrame(() => palletCodeInputRef.current?.focus());
        return;
      }

      vibrateOnError();
      setError(res.error);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      vibrateOnError();
      setError({ kind: "unknown", message });
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendPalletItemOut();
  }

  const transaction = result?.transaction;

  return (
    <section className="scanner-shell pallet-item-out-shell" aria-label="品番単位出庫">
      <header className="scanner-header">
        <h1 className="scanner-title">品番単位出庫</h1>
        <p className="scanner-sub">パレット内の特定品番だけを数量指定で出庫します</p>
      </header>

      <section className="scanner-panel reader-panel" aria-label="Bluetoothリーダー入力">
        <h2 className="panel-title">Bluetoothリーダー入力</h2>
        <label className="field">
          <span className="label">読み取り対象</span>
          <select
            className="input"
            value={readerTarget}
            onChange={(e) => setReaderTarget(e.target.value as ReaderTarget)}
            disabled={submitting}
          >
            <option value="pallet_code">パレット</option>
            <option value="part_no">品番</option>
          </select>
        </label>
        <label className="field">
          <span className="label">リーダー入力（Enterで確定）</span>
          <input
            ref={readerInputRef}
            className="input large"
            value={readerValue}
            onChange={(e) => setReaderValue(e.target.value)}
            onKeyDown={handleReaderKeyDown}
            disabled={submitting}
            autoComplete="off"
            autoCapitalize="characters"
            inputMode="text"
            placeholder={
              readerTarget === "pallet_code"
                ? "例: *PL-KM-260502-0001*"
                : "例: *741R129590 5*"
            }
          />
        </label>
        <button
          type="button"
          className="btn secondary"
          disabled={submitting || !readerValue.trim()}
          onClick={applyReaderValue}
        >
          {readerTargetLabel(readerTarget)}を反映
        </button>
        {readerMessage ? <p className="muted small reader-message">{readerMessage}</p> : null}
      </section>

      <form className="scanner-form" onSubmit={handleSubmit}>
        <section className="scanner-panel">
          <label className="field">
            <span className="label">倉庫コード設定（固定）</span>
            <input
              className="input"
              value={warehouseCodeDraft}
              onChange={(e) => setWarehouseCodeDraft(e.target.value)}
              onBlur={(e) => setWarehouseCodeDraft(setStoredWarehouseCode(e.target.value))}
              disabled={submitting}
              autoComplete="off"
            />
          </label>

          <label className="field">
            <span className="label">project_no</span>
            <input
              className="input"
              value={fields.project_no}
              onChange={(e) => setFields((f) => ({ ...f, project_no: e.target.value }))}
              disabled={submitting}
              autoComplete="off"
            />
          </label>

          <label className="field">
            <span className="label">パレットコード *</span>
            <input
              ref={palletCodeInputRef}
              className="input large"
              value={fields.pallet_code}
              onChange={(e) => setFields((f) => ({ ...f, pallet_code: e.target.value }))}
              disabled={submitting}
              autoComplete="off"
              autoCapitalize="characters"
            />
          </label>

          <label className="field">
            <span className="label">品番 *</span>
            <input
              className="input large"
              value={fields.part_no}
              onChange={(e) =>
                setFields((f) => ({ ...f, part_no: e.target.value.toUpperCase() }))
              }
              disabled={submitting}
              autoComplete="off"
              autoCapitalize="characters"
            />
          </label>

          <label className="field">
            <span className="label">数量 *</span>
            <input
              className="input large"
              type="number"
              min="1"
              step="1"
              value={fields.quantity}
              onChange={(e) => setFields((f) => ({ ...f, quantity: e.target.value }))}
              disabled={submitting}
              inputMode="numeric"
            />
          </label>

          <details className="optional-block">
            <summary>任意項目</summary>
            <label className="field">
              <span className="label">作業者名</span>
              <input
                className="input"
                value={fields.operator_name}
                onChange={(e) =>
                  setFields((f) => ({ ...f, operator_name: e.target.value }))
                }
                disabled={submitting}
                autoComplete="off"
              />
            </label>
            <label className="field">
              <span className="label">備考</span>
              <textarea
                className="input textarea"
                value={fields.remarks}
                onChange={(e) => setFields((f) => ({ ...f, remarks: e.target.value }))}
                disabled={submitting}
              />
            </label>
          </details>

          <div className="actions">
            <button type="submit" className="btn primary" disabled={submitting}>
              {submitting ? "出庫中…" : "品番を出庫"}
            </button>
          </div>
        </section>
      </form>

      {transaction ? (
        <section className="scanner-panel result-panel" aria-label="品番単位出庫結果">
          <div className="result-banner tone-ok">
            <div className="result-banner-title">品番出庫完了</div>
            <div className="move-success-summary">
              <div className="mono">{transactionText(transaction, "pallet_code")}</div>
              <div>{result?.part_no ?? fields.part_no}</div>
              <div>
                出庫 {displayNumber(result?.quantity_out)} / 残{" "}
                {displayNumber(result?.remaining_quantity)}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="scanner-panel error-panel" role="alert">
          <h2 className="panel-title">{itemOutErrorTitle(error)}</h2>
          <p className="error-message">{error.message}</p>
          {error.status != null ? (
            <p className="muted small">HTTP {error.status}</p>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
