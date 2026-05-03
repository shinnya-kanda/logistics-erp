import {
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import {
  getStoredWarehouseCode,
  postPalletCreate,
  setStoredWarehouseCode,
  type PalletCreateSuccessBody,
  type ScanApiError,
} from "./scanApiClient.js";

type PalletCreateFields = {
  pallet_code: string;
  project_no: string;
  location_code: string;
  created_by: string;
  remarks: string;
};

const emptyFields: PalletCreateFields = {
  pallet_code: "",
  project_no: "",
  location_code: "",
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

function isValidPlNo(code: string): boolean {
  return /^PL[A-Z0-9]{8}$/.test(code);
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

function palletCreateErrorMessage(error: ScanApiError): string {
  if (error.message === "pallet_code_already_exists") {
    return "このPLコードはすでに登録されています";
  }
  if (error.message === "location_already_occupied") {
    return "この棚はすでに別のパレットで使用中です";
  }
  return error.message;
}

export function PalletCreateApp() {
  const palletCodeInputRef = useRef<HTMLInputElement>(null);
  const projectNoInputRef = useRef<HTMLInputElement>(null);
  const locationCodeInputRef = useRef<HTMLInputElement>(null);
  const [fields, setFields] = useState<PalletCreateFields>(emptyFields);
  const [warehouseCodeDraft, setWarehouseCodeDraft] = useState(getStoredWarehouseCode);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PalletCreateSuccessBody | null>(null);
  const [error, setError] = useState<ScanApiError | null>(null);

  async function sendPalletCreate() {
    if (submitting) return;

    const palletCode = normalizePalletCode(fields.pallet_code);
    const warehouseCode = setStoredWarehouseCode(warehouseCodeDraft);
    const projectNo = normalizePalletCode(fields.project_no);
    const locationCode = normalizePalletCode(fields.location_code);

    setResult(null);
    setError(null);

    if (!palletCode) {
      setError({ kind: "validation", message: "PL NO を入力してください。" });
      return;
    }
    if (!isValidPlNo(palletCode)) {
      setError({
        kind: "validation",
        message: "PL NO は PL + 英数字8桁で入力してください。例: PL12345678",
      });
      return;
    }
    if (!isValidPalletCode(palletCode)) {
      setError({
        kind: "validation",
        message: "PL NO は英数字のみ使用できます。",
      });
      return;
    }
    if (!projectNo) {
      setError({ kind: "validation", message: "PJ NO を入力してください。" });
      return;
    }
    if (!isValidPalletCode(projectNo)) {
      setError({
        kind: "validation",
        message: "PJ NO は英数字とハイフンのみ使用できます。",
      });
      return;
    }
    if (!locationCode) {
      setError({ kind: "validation", message: "棚番を入力してください。" });
      return;
    }
    if (!isValidPalletCode(locationCode)) {
      setError({
        kind: "validation",
        message: "棚番は英数字とハイフンのみ使用できます。",
      });
      return;
    }
    if (!warehouseCode) {
      setError({ kind: "validation", message: "warehouse_code を入力してください。" });
      return;
    }

    setFields((f) => ({
      ...f,
      pallet_code: palletCode,
      project_no: projectNo,
      location_code: locationCode,
    }));
    setSubmitting(true);
    try {
      const res = await postPalletCreate(
        {
          pallet_code: palletCode,
          warehouse_code: warehouseCode,
          project_no: projectNo,
          current_location_code: locationCode,
          created_by: trimOrUndefined(fields.created_by),
          remarks: trimOrUndefined(fields.remarks),
        },
        { timeoutMs: 10_000 }
      );

      if (res.ok) {
        playSuccessBeep();
        setResult(res.data);
        setFields(emptyFields);
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

  function focusNextOnEnter(
    e: KeyboardEvent<HTMLInputElement>,
    nextRef: RefObject<HTMLInputElement | null>
  ) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    nextRef.current?.focus();
  }

  return (
    <section className="scanner-shell pallet-create-shell" aria-label="入庫">
      <header className="scanner-header">
        <h1 className="scanner-title">入庫</h1>
        <p className="scanner-sub">
          管理画面で発行したPL NO / PJ NO と棚番バーコードを読み取って入庫登録します
        </p>
      </header>

      <form className="scanner-form" onSubmit={handleSubmit}>
        <section className="scanner-panel">
          <label className="field">
            <span className="label">PL NO *</span>
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
              placeholder="例: PL12345678"
              onKeyDown={(e) => focusNextOnEnter(e, projectNoInputRef)}
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
            <span className="label">PJ NO *</span>
            <input
              ref={projectNoInputRef}
              className="input"
              value={fields.project_no}
              onChange={(e) =>
                setFields((f) => ({ ...f, project_no: e.target.value }))
              }
              disabled={submitting}
              autoComplete="off"
              autoCapitalize="characters"
              inputMode="text"
              onKeyDown={(e) => focusNextOnEnter(e, locationCodeInputRef)}
            />
          </label>

          <label className="field">
            <span className="label">棚番 location_code *</span>
            <input
              ref={locationCodeInputRef}
              className="input"
              value={fields.location_code}
              onChange={(e) =>
                setFields((f) => ({ ...f, location_code: e.target.value }))
              }
              disabled={submitting}
              autoComplete="off"
              autoCapitalize="characters"
              inputMode="text"
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
              {submitting ? "入庫登録中…" : "入庫登録"}
            </button>
          </div>
        </section>
      </form>

      {result ? (
        <section className="scanner-panel result-panel" aria-label="入庫登録結果">
          <div className="result-banner tone-ok">
            <div className="result-banner-title">入庫登録完了</div>
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
          <p className="error-message">{palletCreateErrorMessage(error)}</p>
          {error.status != null ? (
            <p className="muted small">HTTP {error.status}</p>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
