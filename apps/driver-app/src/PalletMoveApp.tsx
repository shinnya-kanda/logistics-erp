import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  checkWarehouseLocation,
  getStoredWarehouseCode,
  postPalletMove,
  setStoredWarehouseCode,
  type PalletMoveSuccessBody,
  type ScanApiError,
} from "./scanApiClient.js";

type ReaderTarget = "pallet_code" | "to_location_code";

type PalletMoveFields = {
  pallet_code: string;
  to_location_code: string;
  project_no: string;
  operator_name: string;
  remarks: string;
};

const initialFields: PalletMoveFields = {
  pallet_code: "",
  to_location_code: "",
  project_no: "",
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

function isValidCode39Value(value: string): boolean {
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

function readerTargetLabel(target: ReaderTarget): string {
  return target === "pallet_code" ? "パレットコード" : "移動先棚コード";
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
    oscillator.frequency.value = 880;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
    oscillator.addEventListener("ended", () => void ctx.close(), { once: true });
  } catch {
    // 音が鳴らない端末でも移動処理は止めない。
  }
}

function vibrateOnError() {
  navigator.vibrate?.([100, 50, 100]);
}

function palletMoveErrorTitle(error: ScanApiError): string {
  if (error.kind === "network") return "通信エラー";
  if (error.kind === "timeout") return "API通信タイムアウト";
  if (error.kind === "validation") return "入力エラー";
  if (error.kind === "server") return "移動エラー";
  return "不明なエラー";
}

function palletMoveErrorMessage(error: ScanApiError): string {
  if (error.message === "location_already_occupied") {
    return "この棚はすでに別のパレットで使用中です";
  }
  return error.message;
}

function transactionText(transaction: Record<string, unknown>, key: string): string {
  const value = transaction[key];
  return typeof value === "string" ? value : "";
}

export function PalletMoveApp() {
  const readerInputRef = useRef<HTMLInputElement>(null);
  const [fields, setFields] = useState<PalletMoveFields>(initialFields);
  const [warehouseCodeDraft, setWarehouseCodeDraft] = useState(getStoredWarehouseCode);
  const [readerTarget, setReaderTarget] = useState<ReaderTarget>("pallet_code");
  const [readerValue, setReaderValue] = useState("");
  const [readerMessage, setReaderMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PalletMoveSuccessBody | null>(null);
  const [error, setError] = useState<ScanApiError | null>(null);
  const [unregisteredLocationWarning, setUnregisteredLocationWarning] = useState<string | null>(
    null
  );

  function applyReaderValue() {
    if (!readerValue.trim()) return;

    setResult(null);
    setError(null);
    setUnregisteredLocationWarning(null);

    const normalized = normalizeCode39(readerValue);
    if (!normalized || !isValidCode39Value(normalized)) {
      setReaderMessage(`${readerTargetLabel(readerTarget)} は英数字とハイフンのみ使用できます。`);
      return;
    }

    setFields((f) => ({ ...f, [readerTarget]: normalized }));
    setReaderMessage(`${readerTargetLabel(readerTarget)} ${normalized} を反映しました。`);
    setReaderValue("");
    setReaderTarget((target) =>
      target === "pallet_code" ? "to_location_code" : "to_location_code"
    );
    requestAnimationFrame(() => readerInputRef.current?.focus());
  }

  function handleReaderKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    applyReaderValue();
  }

  async function sendPalletMove(confirmedUnregisteredLocation = false) {
    if (submitting) return;

    const palletCode = normalizeCode39(fields.pallet_code);
    const toLocationCode = normalizeCode39(fields.to_location_code);
    const warehouseCode = setStoredWarehouseCode(warehouseCodeDraft);
    const projectNo = trimOrUndefined(fields.project_no);

    setResult(null);
    setError(null);

    if (!palletCode) {
      setError({ kind: "validation", message: "パレットコードを入力してください。" });
      return;
    }
    if (!isValidCode39Value(palletCode)) {
      setError({ kind: "validation", message: "パレットコードは英数字とハイフンのみ使用できます。" });
      return;
    }
    if (!toLocationCode) {
      setError({ kind: "validation", message: "移動先棚コードを入力してください。" });
      return;
    }
    if (!isValidCode39Value(toLocationCode)) {
      setError({ kind: "validation", message: "移動先棚コードは英数字とハイフンのみ使用できます。" });
      return;
    }

    if (!confirmedUnregisteredLocation) {
      setUnregisteredLocationWarning(null);
      const locationCheck = await checkWarehouseLocation({
        warehouseCode,
        locationCode: toLocationCode,
      });
      if (locationCheck.ok && locationCheck.data.is_unregistered_location) {
        setUnregisteredLocationWarning(toLocationCode);
        return;
      }
    }

    setFields((f) => ({
      ...f,
      pallet_code: palletCode,
      to_location_code: toLocationCode,
      project_no: fields.project_no,
    }));
    setUnregisteredLocationWarning(null);
    setSubmitting(true);

    try {
      const res = await postPalletMove(
        {
          pallet_code: palletCode,
          to_location_code: toLocationCode,
          warehouse_code: warehouseCode,
          project_no: projectNo,
          operator_name: trimOrUndefined(fields.operator_name),
          remarks: trimOrUndefined(fields.remarks),
          idempotency_key: createClientIdempotencyKey("pallet-move"),
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
        requestAnimationFrame(() => readerInputRef.current?.focus());
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
    void sendPalletMove();
  }

  const transaction = result?.transaction;

  return (
    <section className="scanner-shell pallet-move-shell" aria-label="パレット移動">
      <header className="scanner-header">
        <h1 className="scanner-title">パレット移動</h1>
        <p className="scanner-sub">パレット単位で棚移動を登録します</p>
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
            <option value="pallet_code">パレットコード</option>
            <option value="to_location_code">移動先棚コード</option>
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
                : "例: *A-01-01*"
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
            <span className="label">移動先棚コード *</span>
            <input
              className="input large"
              value={fields.to_location_code}
              onChange={(e) => {
                setUnregisteredLocationWarning(null);
                setFields((f) => ({ ...f, to_location_code: e.target.value }));
              }}
              disabled={submitting}
              autoComplete="off"
              autoCapitalize="characters"
            />
          </label>

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
              {submitting ? "移動中…" : "パレットを移動"}
            </button>
          </div>
        </section>
      </form>

      {unregisteredLocationWarning ? (
        <section className="scanner-panel" role="alert">
          <div className="result-banner tone-check">
            <div className="result-banner-title">⚠ この棚番はマスタ未登録です</div>
            <div className="result-banner-sub">{unregisteredLocationWarning}</div>
          </div>
          <div className="actions">
            <button
              type="button"
              className="btn secondary"
              disabled={submitting}
              onClick={() => setUnregisteredLocationWarning(null)}
            >
              キャンセル
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={submitting}
              onClick={() => void sendPalletMove(true)}
            >
              そのまま登録
            </button>
          </div>
        </section>
      ) : null}

      {transaction ? (
        <section className="scanner-panel result-panel" aria-label="パレット移動結果">
          <div className="result-banner tone-ok">
            <div className="result-banner-title">パレット移動完了</div>
            <div className="move-success-summary">
              <div className="mono">{transactionText(transaction, "pallet_code")}</div>
              <div>
                {transactionText(transaction, "from_location_code") || "未設定"} →{" "}
                {transactionText(transaction, "to_location_code")}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="scanner-panel error-panel" role="alert">
          <h2 className="panel-title">{palletMoveErrorTitle(error)}</h2>
          <p className="error-message">{palletMoveErrorMessage(error)}</p>
          {error.status != null ? (
            <p className="muted small">HTTP {error.status}</p>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
