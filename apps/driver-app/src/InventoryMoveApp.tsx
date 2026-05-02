import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  postInventoryMove,
  type InventoryMoveSuccessBody,
  type ScanApiError,
} from "./scanApiClient.js";

type MoveFormFields = {
  part_no: string;
  quantity: string;
  warehouse_code: string;
  from_location_code: string;
  to_location_code: string;
  operator_name: string;
  remarks: string;
};

type ReaderTarget = "part_no" | "from_location_code" | "to_location_code";

type ParsedCode39 = {
  partNo: string | null;
  quantity: number | null;
};

const emptyMoveForm: MoveFormFields = {
  part_no: "",
  quantity: "",
  warehouse_code: "",
  from_location_code: "",
  to_location_code: "",
  operator_name: "",
  remarks: "",
};

function trimOrUndefined(s: string): string | undefined {
  const t = s.trim();
  return t || undefined;
}

function normalizeCode39Input(raw: string): string {
  return raw
    .replace(/[＊*]/g, "")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    )
    .replace(/\u3000/g, " ")
    .replace(/[\r\n]+/g, "")
    .toUpperCase()
    .trim();
}

function parseCode39PartAndQuantity(raw: string): ParsedCode39 {
  const normalized = normalizeCode39Input(raw);
  const tokens = normalized.split(/[ .]+/).filter(Boolean);
  const partIndex = tokens.findIndex((token) => /^[A-Z0-9]{10,12}$/.test(token));
  if (partIndex < 0) {
    return { partNo: null, quantity: null };
  }

  const partNo = tokens[partIndex];
  const quantityToken = tokens
    .slice(partIndex + 1)
    .find((token) => /^[0-9]+$/.test(token));
  if (!quantityToken) {
    return { partNo, quantity: null };
  }

  const quantity = Number.parseInt(quantityToken, 10);
  return {
    partNo,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null,
  };
}

function nextReaderTarget(target: ReaderTarget): ReaderTarget {
  if (target === "part_no") return "from_location_code";
  if (target === "from_location_code") return "to_location_code";
  return "to_location_code";
}

function readerTargetLabel(target: ReaderTarget): string {
  if (target === "part_no") return "品番";
  if (target === "from_location_code") return "移動元棚";
  return "移動先棚";
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

function moveErrorTitle(error: ScanApiError): string {
  if (error.kind === "network") return "通信エラー";
  if (error.kind === "timeout") return "API通信タイムアウト";
  if (error.kind === "validation") {
    if (error.message.includes("insufficient stock")) return "在庫不足";
    if (error.message.includes("from_location_code and to_location_code")) {
      return "棚番エラー";
    }
    return "入力エラー";
  }
  return "不明なエラー";
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
    // 音が鳴らない環境でも業務処理は止めない。
  }
}

function vibrateOnError() {
  navigator.vibrate?.([100, 50, 100]);
}

export function InventoryMoveApp() {
  const readerInputRef = useRef<HTMLInputElement>(null);
  const [fields, setFields] = useState<MoveFormFields>(emptyMoveForm);
  const [readerTarget, setReaderTarget] = useState<ReaderTarget>("part_no");
  const [readerValue, setReaderValue] = useState("");
  const [readerMessage, setReaderMessage] = useState<string | null>(null);
  const [debugMessage, setDebugMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<InventoryMoveSuccessBody | null>(null);
  const [moveSummary, setMoveSummary] = useState<{
    partNo: string;
    fromLocation: string;
    toLocation: string;
    quantity: number;
  } | null>(null);
  const [error, setError] = useState<ScanApiError | null>(null);

  function applyReaderValue() {
    if (!readerValue.trim()) return;

    setResult(null);
    setError(null);

    if (readerTarget === "part_no") {
      const parsed = parseCode39PartAndQuantity(readerValue);
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
    } else {
      const locationCode = normalizeCode39Input(readerValue);
      if (!locationCode) {
        setReaderMessage("棚番を読み取れませんでした。");
        return;
      }
      setFields((f) => ({ ...f, [readerTarget]: locationCode }));
      setReaderMessage(`${readerTargetLabel(readerTarget)} ${locationCode} を反映しました。`);
    }

    setReaderValue("");
    setReaderTarget((target) => nextReaderTarget(target));
  }

  function handleReaderKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    applyReaderValue();
  }

  async function sendMove() {
    if (submitting) return;

    const partNo = fields.part_no.trim();
    const warehouseCode = fields.warehouse_code.trim();
    const fromLocation = fields.from_location_code.trim();
    const toLocation = fields.to_location_code.trim();
    const quantity = Number(fields.quantity);

    setResult(null);
    setMoveSummary(null);
    setError(null);
    setDebugMessage("");

    if (!partNo) {
      setError({ kind: "validation", message: "part_no を入力してください。" });
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
    if (!fromLocation) {
      setError({ kind: "validation", message: "移動元 location_code を入力してください。" });
      return;
    }
    if (!toLocation) {
      setError({ kind: "validation", message: "移動先 location_code を入力してください。" });
      return;
    }
    if (fromLocation === toLocation) {
      setError({
        kind: "validation",
        message: "移動元と移動先は別の location_code を入力してください。",
      });
      return;
    }

    setSubmitting(true);
    setDebugMessage("送信開始");
    const appendDebug = (message: string) => {
      setDebugMessage((current) => (current ? `${current}\n${message}` : message));
    };
    try {
      const res = await postInventoryMove(
        {
          part_no: partNo,
          quantity,
          warehouse_code: warehouseCode,
          from_location_code: fromLocation,
          to_location_code: toLocation,
          operator_name: trimOrUndefined(fields.operator_name),
          remarks: trimOrUndefined(fields.remarks),
          idempotency_key: createClientIdempotencyKey("inventory-move"),
        },
        {
          timeoutMs: 10_000,
          onDebug: appendDebug,
        }
      );

      if (res.ok) {
        appendDebug("移動完了");
        playSuccessBeep();
        setResult(res.data);
        setMoveSummary({ partNo, fromLocation, toLocation, quantity });
        setReaderMessage(null);
        setReaderValue("");
        setReaderTarget("part_no");
        setFields((f) => ({
          ...emptyMoveForm,
          warehouse_code: f.warehouse_code,
          operator_name: f.operator_name,
          remarks: f.remarks,
        }));
        requestAnimationFrame(() => readerInputRef.current?.focus());
        return;
      }

      appendDebug(
        res.error.kind === "timeout"
          ? "API通信タイムアウト"
          : `移動失敗: ${res.error.message}`
      );
      vibrateOnError();
      setError(res.error);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      appendDebug(`送信処理エラー: ${message}`);
      vibrateOnError();
      setError({ kind: "unknown", message });
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMove();
  }

  return (
    <section className="scanner-shell inventory-move-shell" aria-label="棚移動">
      <header className="scanner-header">
        <h1 className="scanner-title">棚移動</h1>
        <p className="scanner-sub">手入力で在庫の棚間移動を登録します</p>
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
            <option value="part_no">品番</option>
            <option value="from_location_code">移動元棚</option>
            <option value="to_location_code">移動先棚</option>
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
            placeholder="例: *1234567890      001*"
          />
        </label>
        <button
          type="button"
          className="btn secondary"
          disabled={submitting || !readerValue.trim()}
          onClick={applyReaderValue}
        >
          読み取りを反映
        </button>
        {readerMessage ? <p className="muted small reader-message">{readerMessage}</p> : null}
        <p className="muted small">
          品番読み取りでは先頭トークンのみ反映します。数量は手入力してください。
        </p>
      </section>

      <form className="scanner-form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="label">part_no *</span>
          <input
            className="input large"
            value={fields.part_no}
            onChange={(e) => setFields((f) => ({ ...f, part_no: e.target.value }))}
            disabled={submitting}
            autoComplete="off"
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

        <label className="field">
          <span className="label">from_location_code *</span>
          <input
            className="input"
            value={fields.from_location_code}
            onChange={(e) =>
              setFields((f) => ({ ...f, from_location_code: e.target.value }))
            }
            disabled={submitting}
            autoComplete="off"
          />
        </label>

        <label className="field">
          <span className="label">to_location_code *</span>
          <input
            className="input"
            value={fields.to_location_code}
            onChange={(e) =>
              setFields((f) => ({ ...f, to_location_code: e.target.value }))
            }
            disabled={submitting}
            autoComplete="off"
          />
        </label>

        <details className="optional-block">
          <summary>任意項目</summary>
          <label className="field">
            <span className="label">operator_name</span>
            <input
              className="input"
              value={fields.operator_name}
              onChange={(e) =>
                setFields((f) => ({ ...f, operator_name: e.target.value }))
              }
              disabled={submitting}
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
            {submitting ? "移動登録中…" : "棚移動を登録"}
          </button>
        </div>
      </form>

      {debugMessage ? (
        <section className="scanner-panel debug-panel" aria-label="通信デバッグ">
          <h2 className="panel-title">通信デバッグ</h2>
          <pre className="json-dump">{debugMessage}</pre>
        </section>
      ) : null}

      {result ? (
        <section className="scanner-panel result-panel" aria-label="棚移動結果">
          <div className="result-banner tone-ok">
            <div className="result-banner-title">移動完了</div>
            {moveSummary ? (
              <div className="move-success-summary">
                <div className="mono">{moveSummary.partNo}</div>
                <div>{moveSummary.fromLocation} → {moveSummary.toLocation}</div>
                <div>数量: {moveSummary.quantity}</div>
              </div>
            ) : (
              <div className="result-banner-sub">OUT / IN が作成されました</div>
            )}
          </div>
          <details className="result-details">
            <summary>詳細 JSON</summary>
            <pre className="json-dump">{JSON.stringify(result, null, 2)}</pre>
          </details>
        </section>
      ) : null}

      {error ? (
        <section className="scanner-panel error-panel" role="alert">
          <h2 className="panel-title">{moveErrorTitle(error)}</h2>
          <p className="error-message">{error.message}</p>
          {error.status != null ? (
            <p className="muted small">HTTP {error.status}</p>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
