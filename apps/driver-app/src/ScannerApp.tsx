import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { ScanInputPayload } from "@logistics-erp/schema";
import { getScanApiBaseUrl } from "./config.js";
import {
  getHealth,
  postScan,
  type ScanApiError,
  type ScanHttpPostScansSuccessBody,
} from "./scanApiClient.js";
import {
  getAmbiguousCandidates,
  getScanBanner,
  scanErrorKindLabel,
} from "./scanDisplay.js";

function trimOrNull(s: string): string | null {
  const t = s.trim();
  return t || null;
}

function buildScanPayload(
  fields: FormFields,
  idempotency_key: string,
  options?: { selected_shipment_item_id?: string }
): ScanInputPayload {
  const quantity_scannedStr = fields.quantity_scanned.trim();
  let quantity_scanned: number | null = null;
  if (quantity_scannedStr) {
    const n = Number(quantity_scannedStr);
    if (Number.isInteger(n) && n >= 1) {
      quantity_scanned = n;
    }
  }

  const payload: ScanInputPayload = {
    scanned_code: fields.scanned_code.trim(),
    scan_type: fields.scan_type.trim(),
    scanned_part_no: trimOrNull(fields.scanned_part_no),
    quantity_scanned,
    quantity_unit: trimOrNull(fields.quantity_unit),
    unload_location_scanned: trimOrNull(fields.unload_location_scanned),
    trace_id: trimOrNull(fields.trace_id),
    scope_shipment_id: trimOrNull(fields.scope_shipment_id),
    operator_name: trimOrNull(fields.operator_name),
    device_id: trimOrNull(fields.device_id),
    idempotency_key,
  };
  if (options?.selected_shipment_item_id) {
    payload.selected_shipment_item_id = options.selected_shipment_item_id;
  }
  return payload;
}

type FormFields = {
  scanned_code: string;
  scan_type: string;
  scanned_part_no: string;
  quantity_scanned: string;
  quantity_unit: string;
  unload_location_scanned: string;
  trace_id: string;
  scope_shipment_id: string;
  operator_name: string;
  device_id: string;
};

const emptyForm: FormFields = {
  scanned_code: "",
  scan_type: "unload",
  scanned_part_no: "",
  quantity_scanned: "",
  quantity_unit: "",
  unload_location_scanned: "",
  trace_id: "",
  scope_shipment_id: "",
  operator_name: "",
  device_id: "",
};

export function ScannerApp() {
  const codeInputRef = useRef<HTMLInputElement>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const lastSentRef = useRef<{ code: string; type: string } | null>(null);

  const [fields, setFields] = useState<FormFields>(emptyForm);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [healthCheckedAt, setHealthCheckedAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ScanHttpPostScansSuccessBody | null>(
    null
  );
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<ScanApiError | null>(null);
  const [resolvingItemId, setResolvingItemId] = useState<string | null>(null);

  const baseUrl = getScanApiBaseUrl();

  const runHealth = useCallback(async () => {
    const r = await getHealth();
    setHealthCheckedAt(new Date().toLocaleTimeString());
    setHealthOk(r.ok);
  }, []);

  useEffect(() => {
    void runHealth();
  }, [runHealth]);

  useEffect(() => {
    codeInputRef.current?.focus();
  }, []);

  function ensureIdempotencyKey(code: string, type: string): string {
    const prev = lastSentRef.current;
    const bodyChanged =
      prev !== null && (prev.code !== code || prev.type !== type);
    if (idempotencyKeyRef.current === null || bodyChanged) {
      idempotencyKeyRef.current = crypto.randomUUID();
    }
    lastSentRef.current = { code, type };
    return idempotencyKeyRef.current;
  }

  function resetAfterSuccess() {
    idempotencyKeyRef.current = null;
    lastSentRef.current = null;
    setResult(null);
    setHttpStatus(null);
    setSubmitError(null);
    setFields((f) => ({ ...emptyForm, scan_type: f.scan_type }));
    requestAnimationFrame(() => codeInputRef.current?.focus());
  }

  async function sendScan() {
    const code = fields.scanned_code.trim();
    const st = fields.scan_type.trim();
    if (!code) {
      setSubmitError({
        kind: "validation",
        message: "スキャンコードを入力してください。",
      });
      return;
    }
    if (!st) {
      setSubmitError({
        kind: "validation",
        message: "scan_type を入力してください。",
      });
      return;
    }

    const qStr = fields.quantity_scanned.trim();
    if (qStr) {
      const n = Number(qStr);
      if (!Number.isInteger(n) || n < 1) {
        setSubmitError({
          kind: "validation",
          message: "数量は 1 以上の整数で入力するか、空にしてください。",
        });
        return;
      }
    }

    const idem = ensureIdempotencyKey(code, st);
    const payload = buildScanPayload(fields, idem);

    setSubmitting(true);
    setSubmitError(null);
    setResult(null);
    setHttpStatus(null);

    const res = await postScan(payload);
    setSubmitting(false);

    if (res.ok) {
      if (res.data.match.kind !== "ambiguous") {
        idempotencyKeyRef.current = null;
        lastSentRef.current = null;
      }
      setResult(res.data);
      setHttpStatus(res.status);
      return;
    }
    setSubmitError(res.error);
  }

  async function submitWithSelectedShipmentItem(shipmentItemId: string) {
    const code = fields.scanned_code.trim();
    const st = fields.scan_type.trim();
    if (!code) {
      setSubmitError({
        kind: "validation",
        message: "スキャンコードを入力してください。",
      });
      return;
    }
    if (!st) {
      setSubmitError({
        kind: "validation",
        message: "scan_type を入力してください。",
      });
      return;
    }

    const qStr = fields.quantity_scanned.trim();
    if (qStr) {
      const n = Number(qStr);
      if (!Number.isInteger(n) || n < 1) {
        setSubmitError({
          kind: "validation",
          message: "数量は 1 以上の整数で入力するか、空にしてください。",
        });
        return;
      }
    }

    /** 候補確定は初回 ambiguous とは別リクエスト — 必ず新しい冪等キー */
    const freshKey = crypto.randomUUID();
    const payload = buildScanPayload(fields, freshKey, {
      selected_shipment_item_id: shipmentItemId,
    });

    setResolvingItemId(shipmentItemId);
    setSubmitting(true);
    setSubmitError(null);
    setResult(null);
    setHttpStatus(null);

    const res = await postScan(payload);
    setSubmitting(false);
    setResolvingItemId(null);

    if (res.ok) {
      idempotencyKeyRef.current = null;
      lastSentRef.current = null;
      setResult(res.data);
      setHttpStatus(res.status);
      return;
    }
    setSubmitError(res.error);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendScan();
  }

  const banner = result ? getScanBanner(result) : null;
  const ambiguousCandidates = result ? getAmbiguousCandidates(result) : [];

  return (
    <div className="scanner-shell">
      <header className="scanner-header">
        <h1 className="scanner-title">Logistics ERP Scanner</h1>
        <p className="scanner-sub">手入力スキャン（Phase 2.2 / 2.3）</p>
      </header>

      <section className="scanner-panel connection-panel" aria-label="接続">
        <div className="connection-row">
          <span className="label">API</span>
          <span className="mono wrap">{baseUrl}</span>
        </div>
        <div className="connection-row">
          <span className="label">接続</span>
          {healthOk === null ? (
            <span className="muted">確認中…</span>
          ) : healthOk ? (
            <span className="ok-text">OK</span>
          ) : (
            <span className="ng-text">接続できません</span>
          )}
          {healthCheckedAt ? (
            <span className="muted small">{healthCheckedAt}</span>
          ) : null}
        </div>
        <button
          type="button"
          className="btn secondary"
          onClick={() => void runHealth()}
        >
          接続を再確認
        </button>
      </section>

      <form className="scanner-form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="label">scanned_code *</span>
          <input
            ref={codeInputRef}
            className="input large"
            value={fields.scanned_code}
            onChange={(e) =>
              setFields((f) => ({ ...f, scanned_code: e.target.value }))
            }
            autoComplete="off"
            enterKeyHint="send"
            disabled={submitting}
          />
        </label>

        <label className="field">
          <span className="label">scan_type *</span>
          <input
            className="input large"
            value={fields.scan_type}
            onChange={(e) =>
              setFields((f) => ({ ...f, scan_type: e.target.value }))
            }
            placeholder="例: unload"
            disabled={submitting}
          />
        </label>

        <details className="optional-block">
          <summary>任意項目</summary>
          <label className="field">
            <span className="label">scanned_part_no</span>
            <input
              className="input"
              value={fields.scanned_part_no}
              onChange={(e) =>
                setFields((f) => ({ ...f, scanned_part_no: e.target.value }))
              }
              disabled={submitting}
            />
          </label>
          <label className="field">
            <span className="label">quantity_scanned</span>
            <input
              className="input"
              inputMode="numeric"
              value={fields.quantity_scanned}
              onChange={(e) =>
                setFields((f) => ({ ...f, quantity_scanned: e.target.value }))
              }
              disabled={submitting}
            />
          </label>
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
            <span className="label">unload_location_scanned</span>
            <input
              className="input"
              value={fields.unload_location_scanned}
              onChange={(e) =>
                setFields((f) => ({
                  ...f,
                  unload_location_scanned: e.target.value,
                }))
              }
              disabled={submitting}
            />
          </label>
          <label className="field">
            <span className="label">trace_id</span>
            <input
              className="input"
              value={fields.trace_id}
              onChange={(e) =>
                setFields((f) => ({ ...f, trace_id: e.target.value }))
              }
              disabled={submitting}
            />
          </label>
          <label className="field">
            <span className="label">scope_shipment_id</span>
            <input
              className="input"
              value={fields.scope_shipment_id}
              onChange={(e) =>
                setFields((f) => ({
                  ...f,
                  scope_shipment_id: e.target.value,
                }))
              }
              disabled={submitting}
            />
          </label>
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
            <span className="label">device_id</span>
            <input
              className="input"
              value={fields.device_id}
              onChange={(e) =>
                setFields((f) => ({ ...f, device_id: e.target.value }))
              }
              disabled={submitting}
            />
          </label>
        </details>

        <div className="actions">
          <button
            type="submit"
            className="btn primary"
            disabled={submitting}
          >
            {submitting ? "送信中…" : "スキャン送信"}
          </button>
          {submitError ? (
            <button
              type="button"
              className="btn secondary"
              disabled={submitting}
              onClick={() => void sendScan()}
            >
              再送（同じ idempotency_key）
            </button>
          ) : null}
        </div>
      </form>

      {submitError ? (
        <section className="scanner-panel error-panel" role="alert">
          <h2 className="panel-title">{scanErrorKindLabel(submitError.kind)}</h2>
          <p className="error-message">{submitError.message}</p>
          {submitError.status != null ? (
            <p className="muted small">HTTP {submitError.status}</p>
          ) : null}
        </section>
      ) : null}

      {result ? (
        <section className="scanner-panel result-panel" aria-label="結果">
          {banner ? (
            <div className={`result-banner tone-${banner.tone}`}>
              <div className="result-banner-title">{banner.title}</div>
              {banner.subtitle ? (
                <div className="result-banner-sub">{banner.subtitle}</div>
              ) : null}
            </div>
          ) : null}
          <ul className="result-meta">
            <li>
              <span className="label">HTTP</span> {httpStatus ?? "—"}
            </li>
            <li>
              <span className="label">idempotency_hit</span>{" "}
              {result.idempotency_hit ? "yes" : "no"}
            </li>
            <li>
              <span className="label">created_new_scan</span>{" "}
              {result.created_new_scan ? "yes" : "no"}
            </li>
            <li>
              <span className="label">result_status</span>{" "}
              <span className="mono">{result.scanEvent.result_status}</span>
            </li>
            <li>
              <span className="label">match.kind</span>{" "}
              <span className="mono">{result.match.kind}</span>
            </li>
            {result.match.kind === "unique" ? (
              <li>
                <span className="label">shipment_item_id</span>{" "}
                <span className="mono wrap">{result.match.shipment_item_id}</span>
              </li>
            ) : null}
            {result.progress ? (
              <li>
                <span className="label">progress_status</span>{" "}
                <span className="mono">{result.progress.progress_status}</span>
              </li>
            ) : null}
            {result.issue ? (
              <li>
                <span className="label">issue_type</span>{" "}
                <span className="mono">{result.issue.issue_type}</span>
              </li>
            ) : null}
          </ul>

          {result.verification?.issue ? (
            <div className="issue-box">
              <div className="label">issue（expected / actual）</div>
              <div className="mono small">
                expected: {result.verification.issue.expected_value}
              </div>
              <div className="mono small">
                actual: {result.verification.issue.actual_value}
              </div>
            </div>
          ) : null}

          {result.match.kind === "ambiguous" ? (
            <div className="ambiguous-panel" aria-label="ambiguous 候補">
              <h3 className="ambiguous-title">候補から 1 件を選んで再照合</h3>
              <p className="ambiguous-hint muted small">
                自動では確定しません。タップで明示指定します（新しい
                idempotency_key で送信）。
              </p>
              {ambiguousCandidates.length === 0 ? (
                <p className="muted small">
                  候補の詳細が取得できませんでした。ID:{" "}
                  {result.match.candidate_ids.join(", ")}
                </p>
              ) : (
                <ul className="ambiguous-list">
                  {ambiguousCandidates.map((c) => (
                    <li key={c.shipment_item_id} className="ambiguous-card">
                      <div className="ambiguous-card-head">
                        <span className="mono basis-pill">{c.match_basis}</span>
                      </div>
                      <div className="ambiguous-card-body">
                        <div>
                          <span className="label">part_no</span>{" "}
                          <span className="mono">{c.part_no}</span>
                        </div>
                        {c.part_name ? (
                          <div className="small">{c.part_name}</div>
                        ) : null}
                        <div>
                          <span className="label">予定数量</span>{" "}
                          {c.quantity_expected}
                          {c.quantity_unit ? ` ${c.quantity_unit}` : ""}
                        </div>
                        {c.unload_location ? (
                          <div>
                            <span className="label">荷卸</span> {c.unload_location}
                          </div>
                        ) : null}
                        {c.trace_id ? (
                          <div className="mono small wrap">trace: {c.trace_id}</div>
                        ) : null}
                        {c.delivery_date ? (
                          <div className="small">納期: {c.delivery_date}</div>
                        ) : null}
                        <div className="mono small wrap">
                          shipment_item_id: {c.shipment_item_id}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn primary ambiguous-resolve-btn"
                        disabled={submitting}
                        onClick={() =>
                          void submitWithSelectedShipmentItem(c.shipment_item_id)
                        }
                      >
                        {resolvingItemId === c.shipment_item_id && submitting
                          ? "再照合中…"
                          : "これで再照合"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          <details className="result-details">
            <summary>詳細 JSON</summary>
            <pre className="json-dump">{JSON.stringify(result, null, 2)}</pre>
          </details>

          <button
            type="button"
            className={
              result.match.kind === "ambiguous"
                ? "btn secondary next-scan"
                : "btn primary next-scan"
            }
            onClick={resetAfterSuccess}
          >
            {result.match.kind === "ambiguous"
              ? "やり直し（次のスキャン）"
              : "次のスキャン"}
          </button>
        </section>
      ) : null}

      <footer className="scanner-footer muted small">
        カメラ・バーコードは未対応。本画面は scanner shell です。
      </footer>
    </div>
  );
}
