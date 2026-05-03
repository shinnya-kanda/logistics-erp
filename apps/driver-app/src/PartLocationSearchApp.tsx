import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  getStoredWarehouseCode,
  searchActivePalletsByPartNo,
  setStoredWarehouseCode,
  type PalletSearchRow,
  type ScanApiError,
} from "./scanApiClient.js";

type SearchFields = {
  project_no: string;
  part_no: string;
};

type ParsedPartCode39 = {
  partNo: string | null;
};

const initialFields: SearchFields = {
  project_no: "",
  part_no: "",
};

function normalizeCode39Base(raw: string): string {
  return raw
    .replace(/[＊*]/g, "")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    )
    .toUpperCase()
    .trim();
}

function parsePartCode39(raw: string): ParsedPartCode39 {
  const normalized = normalizeCode39Base(raw)
    .replace(/\u3000/g, " ")
    .replace(/[\r\n]+/g, "")
    .replace(/\./g, " ");
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const partNo = tokens.find((token) => /^[A-Z0-9]{10,12}$/.test(token)) ?? null;
  return { partNo };
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
    oscillator.frequency.value = 988;
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

function searchErrorTitle(error: ScanApiError): string {
  if (error.kind === "network") return "通信エラー";
  if (error.kind === "timeout") return "API通信タイムアウト";
  if (error.kind === "validation") return "入力エラー";
  if (error.kind === "server") return "検索エラー";
  return "不明なエラー";
}

function displayValue(value: string | number | null | undefined, empty = "-"): string {
  if (value === null || value === undefined || value === "") return empty;
  return String(value);
}

export function PartLocationSearchApp() {
  const partInputRef = useRef<HTMLInputElement>(null);
  const [fields, setFields] = useState<SearchFields>(initialFields);
  const [warehouseCodeDraft, setWarehouseCodeDraft] = useState(getStoredWarehouseCode);
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<PalletSearchRow[] | null>(null);
  const [searchedPartNo, setSearchedPartNo] = useState("");
  const [error, setError] = useState<ScanApiError | null>(null);
  const [readerMessage, setReaderMessage] = useState<string | null>(null);

  function focusPartInput() {
    requestAnimationFrame(() => partInputRef.current?.focus());
  }

  function applyPartInput(raw: string) {
    const parsed = parsePartCode39(raw);
    const partNo = parsed.partNo ?? normalizeCode39Base(raw).replace(/[\s\r\n.]+/g, "");
    setFields((f) => ({ ...f, part_no: partNo }));
    setReaderMessage(partNo ? `品番 ${partNo} を反映しました。` : null);
    return partNo;
  }

  async function sendSearch(partNoOverride?: string) {
    if (submitting) return;

    const warehouseCode = setStoredWarehouseCode(warehouseCodeDraft);
    const projectNo = fields.project_no.trim() || warehouseCode;
    const partNo = (partNoOverride ?? fields.part_no).trim().toUpperCase();
    setError(null);
    setReaderMessage(null);

    if (!warehouseCode) {
      setError({ kind: "validation", message: "warehouse_code を入力してください。" });
      vibrateOnError();
      return;
    }
    if (!partNo) {
      setError({ kind: "validation", message: "品番を入力してください。" });
      vibrateOnError();
      focusPartInput();
      return;
    }
    if (!/^[A-Z0-9]{10,12}$/.test(partNo)) {
      setError({ kind: "validation", message: "品番は10〜12桁の英数字で入力してください。" });
      vibrateOnError();
      focusPartInput();
      return;
    }

    setFields({ project_no: fields.project_no, part_no: partNo });
    setSubmitting(true);
    try {
      const res = await searchActivePalletsByPartNo(
        { warehouseCode, projectNo, partNo },
        { timeoutMs: 10_000 }
      );
      if (res.ok) {
        playSuccessBeep();
        setRows(res.data.pallets);
        setSearchedPartNo(partNo);
        focusPartInput();
        return;
      }

      vibrateOnError();
      setRows(null);
      setError(res.error);
      focusPartInput();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      vibrateOnError();
      setRows(null);
      setError({ kind: "unknown", message });
      focusPartInput();
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendSearch();
  }

  function handlePartKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const partNo = applyPartInput(fields.part_no);
    void sendSearch(partNo);
  }

  return (
    <section className="scanner-shell part-location-search-shell" aria-label="品番棚検索">
      <header className="scanner-header">
        <h1 className="scanner-title">品番棚検索</h1>
        <p className="scanner-sub">保管中の棚番・PL・数量をすぐ確認します</p>
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
              value={fields.project_no}
              onChange={(e) => setFields((f) => ({ ...f, project_no: e.target.value }))}
              disabled={submitting}
              autoComplete="off"
            />
          </label>

          <label className="field">
            <span className="label">品番 part_no（Enterで検索）</span>
            <input
              ref={partInputRef}
              className="input large"
              value={fields.part_no}
              onChange={(e) => {
                setFields((f) => ({ ...f, part_no: e.target.value }));
                setReaderMessage(null);
              }}
              onBlur={(e) => {
                const value = e.target.value;
                if (value.trim()) applyPartInput(value);
              }}
              onKeyDown={handlePartKeyDown}
              disabled={submitting}
              autoComplete="off"
              autoCapitalize="characters"
              inputMode="text"
              placeholder="例: *741R129590*"
            />
          </label>

          {readerMessage ? <p className="reader-message">{readerMessage}</p> : null}

          <div className="actions">
            <button type="submit" className="btn primary" disabled={submitting}>
              {submitting ? "検索中…" : "検索"}
            </button>
          </div>
        </section>
      </form>

      {error ? (
        <section className="scanner-panel error-panel" role="alert">
          <h2 className="panel-title">{searchErrorTitle(error)}</h2>
          <p className="error-message">{error.message}</p>
          {error.status != null ? (
            <p className="muted small">HTTP {error.status}</p>
          ) : null}
        </section>
      ) : null}

      {rows ? (
        <section className="scanner-panel result-panel" aria-label="品番棚検索結果">
          <div className="result-banner tone-ok">
            <div className="result-banner-title">検索結果 {rows.length}件</div>
            <div className="result-banner-sub">{searchedPartNo}</div>
          </div>

          {rows.length === 0 ? (
            <p className="error-message">該当する保管中パレットはありません</p>
          ) : (
            <div className="part-location-results">
              {rows.map((row, index) => (
                <article
                  className="part-location-card"
                  key={`${row.pallet_id}-${row.part_no ?? "empty"}-${index}`}
                >
                  <div className="part-location-main">
                    {displayValue(row.current_location_code, "棚未設定")}
                  </div>
                  <div className="part-location-pl">{row.pallet_code}</div>
                  <div className="part-location-qty">
                    数量 {displayValue(row.quantity)} {displayValue(row.quantity_unit, "")}
                  </div>
                  {row.part_no ? <div className="muted small">{row.part_no}</div> : null}
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}
