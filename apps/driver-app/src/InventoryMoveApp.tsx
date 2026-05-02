import { useState, type FormEvent, type KeyboardEvent } from "react";
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
  const withoutNewlines = raw.replace(/[\r\n]/g, "");
  const halfWidth = withoutNewlines.replace(/[！-～]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  );
  const normalized = halfWidth.replace(/\u3000/g, " ").trim().toUpperCase();
  return normalized.replace(/^[*＊]+/, "").replace(/[*＊]+$/, "").trim();
}

function extractPartNoFromCode39(raw: string): string | null {
  const normalized = normalizeCode39Input(raw);
  const firstToken = normalized.split(/\s+/)[0] ?? "";
  return /^[A-Z0-9]{10,12}$/.test(firstToken) ? firstToken : null;
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

export function InventoryMoveApp() {
  const [fields, setFields] = useState<MoveFormFields>(emptyMoveForm);
  const [readerTarget, setReaderTarget] = useState<ReaderTarget>("part_no");
  const [readerValue, setReaderValue] = useState("");
  const [readerMessage, setReaderMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<InventoryMoveSuccessBody | null>(null);
  const [error, setError] = useState<ScanApiError | null>(null);

  function applyReaderValue() {
    if (!readerValue.trim()) return;

    setResult(null);
    setError(null);

    if (readerTarget === "part_no") {
      const partNo = extractPartNoFromCode39(readerValue);
      if (!partNo) {
        setReaderMessage("品番を抽出できません。10〜12桁の英数字を読み取ってください。");
        return;
      }
      setFields((f) => ({ ...f, part_no: partNo }));
      setReaderMessage(`品番 ${partNo} を反映しました。`);
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
    const partNo = fields.part_no.trim();
    const warehouseCode = fields.warehouse_code.trim();
    const fromLocation = fields.from_location_code.trim();
    const toLocation = fields.to_location_code.trim();
    const quantity = Number(fields.quantity);

    setResult(null);
    setError(null);

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
    const res = await postInventoryMove({
      part_no: partNo,
      quantity,
      warehouse_code: warehouseCode,
      from_location_code: fromLocation,
      to_location_code: toLocation,
      operator_name: trimOrUndefined(fields.operator_name),
      remarks: trimOrUndefined(fields.remarks),
      idempotency_key: crypto.randomUUID(),
    });
    setSubmitting(false);

    if (res.ok) {
      setResult(res.data);
      setReaderMessage(null);
      setFields((f) => ({
        ...emptyMoveForm,
        warehouse_code: f.warehouse_code,
        operator_name: f.operator_name,
      }));
      return;
    }

    setError(res.error);
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

      {result ? (
        <section className="scanner-panel result-panel" aria-label="棚移動結果">
          <div className="result-banner tone-ok">
            <div className="result-banner-title">移動完了</div>
            <div className="result-banner-sub">OUT / IN が作成されました</div>
          </div>
          <details className="result-details">
            <summary>詳細 JSON</summary>
            <pre className="json-dump">{JSON.stringify(result, null, 2)}</pre>
          </details>
        </section>
      ) : null}

      {error ? (
        <section className="scanner-panel error-panel" role="alert">
          <h2 className="panel-title">移動失敗</h2>
          <p className="error-message">{error.message}</p>
          {error.status != null ? (
            <p className="muted small">HTTP {error.status}</p>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
