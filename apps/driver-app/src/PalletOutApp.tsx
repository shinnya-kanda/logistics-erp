import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  postPalletOut,
  type PalletOutSuccessBody,
  type ScanApiError,
} from "./scanApiClient.js";

type PalletOutFields = {
  pallet_code: string;
  warehouse_code: string;
  operator_name: string;
  remarks: string;
};

const initialFields: PalletOutFields = {
  pallet_code: "",
  warehouse_code: "KOMATSU",
  operator_name: "",
  remarks: "",
};

function trimOrUndefined(s: string): string | undefined {
  const t = s.trim();
  return t || undefined;
}

function normalizeCode39(raw: string): string {
  return raw
    .replace(/[＊*]/g, "")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    )
    .replace(/\u3000/g, "")
    .replace(/[\r\n]+/g, "")
    .toUpperCase()
    .trim();
}

function isValidPalletCode(value: string): boolean {
  return /^[A-Z0-9-]+$/.test(value);
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
    oscillator.frequency.value = 784;
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

function palletOutErrorTitle(error: ScanApiError): string {
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

export function PalletOutApp() {
  const palletCodeInputRef = useRef<HTMLInputElement>(null);
  const [fields, setFields] = useState<PalletOutFields>(initialFields);
  const [readerValue, setReaderValue] = useState("");
  const [readerMessage, setReaderMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PalletOutSuccessBody | null>(null);
  const [error, setError] = useState<ScanApiError | null>(null);

  function applyReaderValue() {
    if (!readerValue.trim()) return;

    setResult(null);
    setError(null);

    const palletCode = normalizeCode39(readerValue);
    if (!palletCode || !isValidPalletCode(palletCode)) {
      setReaderMessage("パレットコードは英数字とハイフンのみ使用できます。");
      return;
    }

    setFields((f) => ({ ...f, pallet_code: palletCode }));
    setReaderMessage(`パレットコード ${palletCode} を反映しました。`);
    setReaderValue("");
    requestAnimationFrame(() => palletCodeInputRef.current?.focus());
  }

  function handleReaderKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    applyReaderValue();
  }

  async function sendPalletOut() {
    if (submitting) return;

    const palletCode = normalizeCode39(fields.pallet_code);
    const warehouseCode = fields.warehouse_code.trim() || "KOMATSU";

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

    setFields((f) => ({
      ...f,
      pallet_code: palletCode,
      warehouse_code: warehouseCode,
    }));
    setSubmitting(true);

    try {
      const res = await postPalletOut(
        {
          pallet_code: palletCode,
          warehouse_code: warehouseCode,
          operator_name: trimOrUndefined(fields.operator_name),
          remarks: trimOrUndefined(fields.remarks),
          idempotency_key: createClientIdempotencyKey("pallet-out"),
        },
        { timeoutMs: 10_000 }
      );

      if (res.ok) {
        playSuccessBeep();
        setResult(res.data);
        setFields((f) => ({
          ...initialFields,
          warehouse_code: f.warehouse_code,
          operator_name: f.operator_name,
        }));
        setReaderValue("");
        setReaderMessage(null);
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
    void sendPalletOut();
  }

  const transaction = result?.transaction;

  return (
    <section className="scanner-shell pallet-out-shell" aria-label="パレット出庫">
      <header className="scanner-header">
        <h1 className="scanner-title">パレット出庫</h1>
        <p className="scanner-sub">パレット1枚全体を出庫扱いにします</p>
      </header>

      <section className="scanner-panel reader-panel" aria-label="Bluetoothリーダー入力">
        <h2 className="panel-title">Bluetoothリーダー入力</h2>
        <label className="field">
          <span className="label">リーダー入力（Enterで確定）</span>
          <input
            ref={palletCodeInputRef}
            className="input large"
            value={readerValue}
            onChange={(e) => setReaderValue(e.target.value)}
            onKeyDown={handleReaderKeyDown}
            disabled={submitting}
            autoComplete="off"
            autoCapitalize="characters"
            inputMode="text"
            placeholder="例: *PL-KM-260502-0001*"
          />
        </label>
        <button
          type="button"
          className="btn secondary"
          disabled={submitting || !readerValue.trim()}
          onClick={applyReaderValue}
        >
          パレットコードを反映
        </button>
        {readerMessage ? <p className="muted small reader-message">{readerMessage}</p> : null}
      </section>

      <form className="scanner-form" onSubmit={handleSubmit}>
        <section className="scanner-panel">
          <label className="field">
            <span className="label">パレットコード *</span>
            <input
              className="input large"
              value={fields.pallet_code}
              onChange={(e) => setFields((f) => ({ ...f, pallet_code: e.target.value }))}
              disabled={submitting}
              autoComplete="off"
              autoCapitalize="characters"
            />
          </label>

          <label className="field">
            <span className="label">warehouse_code</span>
            <input
              className="input"
              value={fields.warehouse_code}
              onChange={(e) =>
                setFields((f) => ({ ...f, warehouse_code: e.target.value }))
              }
              disabled={submitting}
              autoComplete="off"
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
                onChange={(e) =>
                  setFields((f) => ({ ...f, remarks: e.target.value }))
                }
                disabled={submitting}
              />
            </label>
          </details>

          <div className="actions">
            <button type="submit" className="btn primary" disabled={submitting}>
              {submitting ? "出庫中…" : "パレットを出庫"}
            </button>
          </div>
        </section>
      </form>

      {transaction ? (
        <section className="scanner-panel result-panel" aria-label="パレット出庫結果">
          <div className="result-banner tone-ok">
            <div className="result-banner-title">パレット出庫完了</div>
            <div className="move-success-summary">
              <div className="mono">{transactionText(transaction, "pallet_code")}</div>
              <div>出庫元: {transactionText(transaction, "from_location_code") || "未設定"}</div>
            </div>
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="scanner-panel error-panel" role="alert">
          <h2 className="panel-title">{palletOutErrorTitle(error)}</h2>
          <p className="error-message">{error.message}</p>
          {error.status != null ? (
            <p className="muted small">HTTP {error.status}</p>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
