import { useRef, useState, type FormEvent } from "react";
import {
  postPalletCreate,
  type PalletCreateSuccessBody,
  type ScanApiError,
} from "./scanApiClient.js";

type PalletCreateFields = {
  pallet_code: string;
  warehouse_code: string;
  created_by: string;
  remarks: string;
};

const emptyFields: PalletCreateFields = {
  pallet_code: "",
  warehouse_code: "",
  created_by: "",
  remarks: "",
};

function trimOrUndefined(s: string): string | undefined {
  const t = s.trim();
  return t || undefined;
}

function normalizePalletCode(raw: string): string {
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

function isValidPalletCode(code: string): boolean {
  return /^[A-Z0-9-]+$/.test(code);
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
    oscillator.frequency.value = 1046;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.1);
    oscillator.addEventListener("ended", () => void ctx.close(), { once: true });
  } catch {
    // 音が鳴らない端末でも登録処理は止めない。
  }
}

function vibrateOnError() {
  navigator.vibrate?.([100, 50, 100]);
}

function palletErrorTitle(error: ScanApiError): string {
  if (error.kind === "network") return "通信エラー";
  if (error.kind === "timeout") return "API通信タイムアウト";
  if (error.kind === "validation") return "入力エラー";
  if (error.kind === "server") return "サーバーエラー";
  return "不明なエラー";
}

export function PalletCreateApp() {
  const palletCodeInputRef = useRef<HTMLInputElement>(null);
  const [fields, setFields] = useState<PalletCreateFields>(emptyFields);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PalletCreateSuccessBody | null>(null);
  const [error, setError] = useState<ScanApiError | null>(null);

  async function sendPalletCreate() {
    if (submitting) return;

    const palletCode = normalizePalletCode(fields.pallet_code);
    const warehouseCode = fields.warehouse_code.trim();

    setResult(null);
    setError(null);

    if (!palletCode) {
      setError({ kind: "validation", message: "pallet_code を入力してください。" });
      return;
    }
    if (!isValidPalletCode(palletCode)) {
      setError({
        kind: "validation",
        message: "pallet_code は英数字とハイフンのみ使用できます。",
      });
      return;
    }
    if (!warehouseCode) {
      setError({ kind: "validation", message: "warehouse_code を入力してください。" });
      return;
    }

    setFields((f) => ({ ...f, pallet_code: palletCode }));
    setSubmitting(true);
    try {
      const res = await postPalletCreate(
        {
          pallet_code: palletCode,
          warehouse_code: warehouseCode,
          created_by: trimOrUndefined(fields.created_by),
          remarks: trimOrUndefined(fields.remarks),
        },
        { timeoutMs: 10_000 }
      );

      if (res.ok) {
        playSuccessBeep();
        setResult(res.data);
        setFields((f) => ({
          ...f,
          pallet_code: "",
          warehouse_code: warehouseCode,
          remarks: "",
        }));
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
    void sendPalletCreate();
  }

  return (
    <section className="scanner-shell pallet-create-shell" aria-label="パレット作成">
      <header className="scanner-header">
        <h1 className="scanner-title">パレット作成</h1>
        <p className="scanner-sub">Code39 または手入力でパレットを登録します</p>
      </header>

      <form className="scanner-form" onSubmit={handleSubmit}>
        <section className="scanner-panel">
          <label className="field">
            <span className="label">pallet_code *</span>
            <input
              ref={palletCodeInputRef}
              className="input large"
              value={fields.pallet_code}
              onChange={(e) =>
                setFields((f) => ({ ...f, pallet_code: e.target.value }))
              }
              disabled={submitting}
              autoComplete="off"
              autoCapitalize="characters"
              inputMode="text"
              placeholder="例: *PL-KM-260502-0001*"
            />
          </label>

          <label className="field">
            <span className="label">warehouse_code *</span>
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
              <span className="label">created_by</span>
              <input
                className="input"
                value={fields.created_by}
                onChange={(e) =>
                  setFields((f) => ({ ...f, created_by: e.target.value }))
                }
                disabled={submitting}
                autoComplete="off"
              />
            </label>
            <label className="field">
              <span className="label">remarks</span>
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
              {submitting ? "パレット作成中…" : "パレットを作成"}
            </button>
          </div>
        </section>
      </form>

      {result ? (
        <section className="scanner-panel result-panel" aria-label="パレット作成結果">
          <div className="result-banner tone-ok">
            <div className="result-banner-title">パレット作成完了</div>
            <div className="move-success-summary">
              <div className="mono">{result.pallet_code}</div>
              <div>{result.created ? "created=true" : "created=false"}</div>
            </div>
          </div>
          <ul className="result-meta">
            <li>
              <strong>pallet_id:</strong> <span className="mono">{result.pallet_id}</span>
            </li>
          </ul>
        </section>
      ) : null}

      {error ? (
        <section className="scanner-panel error-panel" role="alert">
          <h2 className="panel-title">{palletErrorTitle(error)}</h2>
          <p className="error-message">{error.message}</p>
          {error.status != null ? (
            <p className="muted small">HTTP {error.status}</p>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
