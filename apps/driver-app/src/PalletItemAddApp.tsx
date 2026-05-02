import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  postPalletItemAdd,
  type PalletItemAddSuccessBody,
  type ScanApiError,
} from "./scanApiClient.js";

type ReaderTarget = "pallet_code" | "part_no";

type PalletItemAddFields = {
  pallet_code: string;
  part_no: string;
  quantity: string;
  warehouse_code: string;
  quantity_unit: string;
  created_by: string;
  remarks: string;
};

type ParsedPartCode39 = {
  partNo: string | null;
  quantity: number | null;
};

const initialFields: PalletItemAddFields = {
  pallet_code: "",
  part_no: "",
  quantity: "1",
  warehouse_code: "KOMATSU",
  quantity_unit: "pcs",
  created_by: "",
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

function isValidPalletCode(code: string): boolean {
  return /^[A-Z0-9-]+$/.test(code);
}

function parsePartCode39(raw: string): ParsedPartCode39 {
  const normalized = normalizeCode39Base(raw)
    .replace(/\u3000/g, " ")
    .replace(/[\r\n]+/g, "")
    .replace(/\./g, " ");
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const partIndex = tokens.findIndex((token) => /^[A-Z0-9]{10,12}$/.test(token));
  if (partIndex < 0) {
    return { partNo: null, quantity: null };
  }

  const quantityToken = tokens
    .slice(partIndex + 1)
    .find((token) => /^[0-9]+$/.test(token));
  const quantity = quantityToken ? Number.parseInt(quantityToken, 10) : null;

  return {
    partNo: tokens[partIndex],
    quantity: quantity !== null && Number.isFinite(quantity) && quantity > 0 ? quantity : null,
  };
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
    oscillator.frequency.value = 988;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
    oscillator.addEventListener("ended", () => void ctx.close(), { once: true });
  } catch {
    // 音が鳴らない端末でも登録処理は止めない。
  }
}

function vibrateOnError() {
  navigator.vibrate?.([100, 50, 100]);
}

function palletItemErrorTitle(error: ScanApiError): string {
  if (error.kind === "network") return "通信エラー";
  if (error.kind === "timeout") return "API通信タイムアウト";
  if (error.kind === "validation") return "入力エラー";
  if (error.kind === "server") return "登録エラー";
  return "不明なエラー";
}

export function PalletItemAddApp() {
  const readerInputRef = useRef<HTMLInputElement>(null);
  const [fields, setFields] = useState<PalletItemAddFields>(initialFields);
  const [readerTarget, setReaderTarget] = useState<ReaderTarget>("pallet_code");
  const [readerValue, setReaderValue] = useState("");
  const [readerMessage, setReaderMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PalletItemAddSuccessBody | null>(null);
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

  async function sendPalletItemAdd() {
    if (submitting) return;

    const palletCode = normalizePalletCode(fields.pallet_code);
    const partNo = fields.part_no.trim().toUpperCase();
    const quantity = Number(fields.quantity);
    const warehouseCode = fields.warehouse_code.trim();
    const quantityUnit = fields.quantity_unit.trim() || "pcs";

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
    if (!partNo) {
      setError({ kind: "validation", message: "part_no を入力してください。" });
      return;
    }
    if (!/^[A-Z0-9]{10,12}$/.test(partNo)) {
      setError({ kind: "validation", message: "part_no は10〜12桁の英数字で入力してください。" });
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError({ kind: "validation", message: "数量は 0 より大きい数値で入力してください。" });
      return;
    }
    if (!warehouseCode) {
      setError({ kind: "validation", message: "warehouse_code を入力してください。" });
      return;
    }

    setFields((f) => ({ ...f, pallet_code: palletCode, part_no: partNo }));
    setSubmitting(true);
    try {
      const res = await postPalletItemAdd(
        {
          pallet_code: palletCode,
          part_no: partNo,
          quantity,
          warehouse_code: warehouseCode,
          quantity_unit: quantityUnit,
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
          pallet_code: palletCode,
          part_no: "",
          quantity: "1",
          warehouse_code: warehouseCode,
          quantity_unit: quantityUnit,
          remarks: "",
        }));
        setReaderValue("");
        setReaderMessage(null);
        setReaderTarget("part_no");
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
    void sendPalletItemAdd();
  }

  return (
    <section className="scanner-shell pallet-item-add-shell" aria-label="パレット積み込み">
      <header className="scanner-header">
        <h1 className="scanner-title">パレット積み込み</h1>
        <p className="scanner-sub">作成済みパレットへ品番・数量を登録します</p>
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
                : "例: *741R129590 0010*"
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
            <span className="label">pallet_code *</span>
            <input
              className="input"
              value={fields.pallet_code}
              onChange={(e) => setFields((f) => ({ ...f, pallet_code: e.target.value }))}
              disabled={submitting}
              autoComplete="off"
              autoCapitalize="characters"
            />
          </label>

          <label className="field">
            <span className="label">part_no *</span>
            <input
              className="input large"
              value={fields.part_no}
              onChange={(e) => setFields((f) => ({ ...f, part_no: e.target.value }))}
              disabled={submitting}
              autoComplete="off"
              autoCapitalize="characters"
            />
          </label>

          <label className="field">
            <span className="label">quantity *</span>
            <input
              className="input large"
              inputMode="decimal"
              value={fields.quantity}
              onChange={(e) => setFields((f) => ({ ...f, quantity: e.target.value }))}
              disabled={submitting}
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
              <span className="label">quantity_unit</span>
              <input
                className="input"
                value={fields.quantity_unit}
                onChange={(e) =>
                  setFields((f) => ({ ...f, quantity_unit: e.target.value }))
                }
                disabled={submitting}
              />
            </label>
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
              {submitting ? "追加中…" : "パレットへ追加"}
            </button>
          </div>
        </section>
      </form>

      {result ? (
        <section className="scanner-panel result-panel" aria-label="パレット積み込み結果">
          <div className="result-banner tone-ok">
            <div className="result-banner-title">積み込み完了</div>
            <div className="move-success-summary">
              <div className="mono">{result.pallet_code}</div>
              <div className="mono">{result.part_no}</div>
              <div>数量: {result.quantity_added}</div>
            </div>
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="scanner-panel error-panel" role="alert">
          <h2 className="panel-title">{palletItemErrorTitle(error)}</h2>
          <p className="error-message">{error.message}</p>
          {error.status != null ? (
            <p className="muted small">HTTP {error.status}</p>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
