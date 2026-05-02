import { useState, type FormEvent } from "react";
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

export function InventoryMoveApp() {
  const [fields, setFields] = useState<MoveFormFields>(emptyMoveForm);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<InventoryMoveSuccessBody | null>(null);
  const [error, setError] = useState<ScanApiError | null>(null);

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
