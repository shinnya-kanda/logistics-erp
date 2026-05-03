import { useState, type FormEvent } from "react";
import {
  getEmptyPallets,
  getStoredWarehouseCode,
  setStoredWarehouseCode,
  type EmptyPalletRow,
  type ScanApiError,
} from "./scanApiClient.js";

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
    // 音が鳴らない端末でも検索処理は止めない。
  }
}

function vibrateOnError() {
  navigator.vibrate?.([100, 50, 100]);
}

function emptySearchErrorTitle(error: ScanApiError): string {
  if (error.kind === "network") return "通信エラー";
  if (error.kind === "timeout") return "API通信タイムアウト";
  if (error.kind === "validation") return "入力エラー";
  if (error.kind === "server") return "検索エラー";
  return "不明なエラー";
}

function displayLocation(row: EmptyPalletRow): string {
  return row.current_location_code || "棚未設定";
}

export function EmptyPalletSearchApp() {
  const [warehouseCodeDraft, setWarehouseCodeDraft] = useState(getStoredWarehouseCode);
  const [projectNo, setProjectNo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<EmptyPalletRow[] | null>(null);
  const [searchedWarehouseCode, setSearchedWarehouseCode] = useState("");
  const [error, setError] = useState<ScanApiError | null>(null);

  async function sendSearch() {
    if (submitting) return;

    const code = setStoredWarehouseCode(warehouseCodeDraft);
    const searchProjectNo = projectNo.trim() || undefined;
    setError(null);
    setSubmitting(true);

    try {
      const res = await getEmptyPallets(code, searchProjectNo, { timeoutMs: 10_000 });
      if (res.ok) {
        playSuccessBeep();
        setRows(res.data.pallets);
        setSearchedWarehouseCode(searchProjectNo ?? code);
        return;
      }

      vibrateOnError();
      setRows(null);
      setError(res.error);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      vibrateOnError();
      setRows(null);
      setError({ kind: "unknown", message });
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendSearch();
  }

  return (
    <section className="scanner-shell empty-pallet-search-shell" aria-label="空パレット検索">
      <header className="scanner-header">
        <h1 className="scanner-title">空パレット検索</h1>
        <p className="scanner-sub">品番が載っていないACTIVEパレットの場所を確認します</p>
      </header>

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
              value={projectNo}
              onChange={(e) => setProjectNo(e.target.value)}
              disabled={submitting}
              autoComplete="off"
            />
          </label>

          <div className="actions">
            <button type="submit" className="btn primary" disabled={submitting}>
              {submitting ? "検索中…" : "空パレットを検索"}
            </button>
          </div>
        </section>
      </form>

      {error ? (
        <section className="scanner-panel error-panel" role="alert">
          <h2 className="panel-title">{emptySearchErrorTitle(error)}</h2>
          <p className="error-message">{error.message}</p>
          {error.status != null ? (
            <p className="muted small">HTTP {error.status}</p>
          ) : null}
        </section>
      ) : null}

      {rows ? (
        <section className="scanner-panel result-panel" aria-label="空パレット検索結果">
          <div className="result-banner tone-ok">
            <div className="result-banner-title">空パレット {rows.length}件</div>
            <div className="result-banner-sub">{searchedWarehouseCode}</div>
          </div>

          {rows.length === 0 ? (
            <p className="error-message">空パレットはありません</p>
          ) : (
            <div className="part-location-results">
              {rows.map((row) => (
                <article className="part-location-card" key={row.pallet_id}>
                  <div className="part-location-main">{displayLocation(row)}</div>
                  <div className="part-location-pl">{row.pallet_code}</div>
                  <div className="part-location-qty">{row.warehouse_code}</div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}
