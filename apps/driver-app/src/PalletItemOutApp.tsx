import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useAuth } from "./auth/AuthProvider.js";
import {
  getStoredWarehouseCode,
  postPalletItemOut,
  setStoredWarehouseCode,
  type PalletItemOutCandidate,
  type PalletItemOutSuccessBody,
  type ScanApiError,
} from "./scanApiClient.js";

type PalletItemOutFields = {
  pallet_code: string;
  part_no: string;
  quantity: string;
  operator_name: string;
  remarks: string;
};

type ParsedPartCode39 = {
  partNo: string | null;
  quantity: number | null;
};

type CandidateLookupRow = {
  id: string;
  quantity: string | number;
  project_no: string | null;
  pallet_units:
    | {
        pallet_code: string | null;
        project_no: string | null;
        current_location_code: string | null;
        current_status: string | null;
      }
    | {
        pallet_code: string | null;
        project_no: string | null;
        current_location_code: string | null;
        current_status: string | null;
      }[]
    | null;
};

const initialFields: PalletItemOutFields = {
  pallet_code: "",
  part_no: "",
  quantity: "1",
  operator_name: "",
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

function parsePartCode39(raw: string): ParsedPartCode39 {
  const normalized = normalizeCode39Base(raw)
    .replace(/\u3000/g, " ")
    .replace(/[\r\n]+/g, "")
    .replace(/\./g, " ");
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const partIndex = tokens.findIndex((token) => /^[A-Z0-9]{10,12}$/.test(token));
  if (partIndex < 0) return { partNo: null, quantity: null };

  const quantityToken = tokens
    .slice(partIndex + 1)
    .find((token) => /^[0-9]+$/.test(token));
  const quantity = quantityToken ? Number.parseInt(quantityToken, 10) : null;
  return {
    partNo: tokens[partIndex],
    quantity: quantity !== null && Number.isFinite(quantity) && quantity > 0 ? quantity : null,
  };
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
    oscillator.frequency.value = 740;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.14);
    oscillator.addEventListener("ended", () => void ctx.close(), { once: true });
  } catch {
    // 音が鳴らない端末でも出庫処理は止めない。
  }
}

function vibrateOnError() {
  navigator.vibrate?.([100, 50, 100]);
}

function itemOutErrorTitle(error: ScanApiError): string {
  if (error.kind === "network") return "通信エラー";
  if (error.kind === "timeout") return "API通信タイムアウト";
  if (error.kind === "validation") return "入力エラー";
  if (error.kind === "server") return "出庫エラー";
  return "不明なエラー";
}

function transactionText(transaction: Record<string, unknown>, key: string): string {
  const value = transaction[key];
  return typeof value === "string" ? value : "";
}

function displayNumber(value: string | number | undefined): string {
  if (value === undefined || value === "") return "-";
  return String(value);
}

export function PalletItemOutApp() {
  const { client, profile } = useAuth();
  const readerInputRef = useRef<HTMLInputElement>(null);
  const [fields, setFields] = useState<PalletItemOutFields>(initialFields);
  const [warehouseCodeDraft, setWarehouseCodeDraft] = useState(getStoredWarehouseCode);
  const [readerValue, setReaderValue] = useState("");
  const [readerMessage, setReaderMessage] = useState<string | null>(null);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PalletItemOutSuccessBody | null>(null);
  const [error, setError] = useState<ScanApiError | null>(null);
  const [candidates, setCandidates] = useState<PalletItemOutCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<PalletItemOutCandidate | null>(null);
  const [pendingIdempotencyKey, setPendingIdempotencyKey] = useState<string | null>(null);
  const [candidateModalOpen, setCandidateModalOpen] = useState(false);

  function selectCandidate(candidate: PalletItemOutCandidate) {
    setSelectedCandidate(candidate);
    setFields((f) => ({ ...f, pallet_code: candidate.pallet_code }));
    setCandidateModalOpen(false);
    setReaderMessage(`パレット ${candidate.pallet_code} を選択しました。`);
  }

  async function lookupCandidates(partNo: string): Promise<PalletItemOutCandidate[]> {
    const warehouseCode = profile?.warehouse_code ?? setStoredWarehouseCode(warehouseCodeDraft);
    const { data, error: lookupError } = await client
      .from("pallet_item_links")
      .select(
        "id, quantity, project_no, pallet_units!inner(pallet_code, project_no, current_location_code, current_status, warehouse_code)"
      )
      .eq("part_no", partNo)
      .eq("warehouse_code", warehouseCode)
      .is("unlinked_at", null)
      .gt("quantity", 0)
      .eq("pallet_units.warehouse_code", warehouseCode);

    if (lookupError) {
      throw new Error(lookupError.message);
    }

    return ((data ?? []) as CandidateLookupRow[])
      .map((row) => {
        const unit = Array.isArray(row.pallet_units) ? row.pallet_units[0] : row.pallet_units;
        if (!unit || unit.current_status === "OUT" || !unit.pallet_code) return null;
        return {
          pallet_item_id: row.id,
          pallet_code: unit.pallet_code,
          project_no: row.project_no ?? unit.project_no ?? null,
          location_code: unit.current_location_code ?? null,
          quantity: row.quantity,
        };
      })
      .filter((candidate): candidate is PalletItemOutCandidate => candidate !== null);
  }

  async function applyReaderValue() {
    if (!readerValue.trim()) return;

    setResult(null);
    setError(null);
    setCandidates([]);
    setSelectedCandidate(null);
    setPendingIdempotencyKey(null);
    setCandidateModalOpen(false);

    const parsed = parsePartCode39(readerValue);
    if (!parsed.partNo) {
      setReaderMessage("品番を抽出できません。10〜12桁の英数字を読み取ってください。");
      return;
    }

    setFields((f) => ({
      ...f,
      part_no: parsed.partNo ?? f.part_no,
      quantity: parsed.quantity !== null ? String(parsed.quantity) : f.quantity,
      pallet_code: "",
    }));

    setCandidateLoading(true);
    try {
      const nextCandidates = await lookupCandidates(parsed.partNo);
      setCandidates(nextCandidates);
      if (nextCandidates.length === 1) {
        selectCandidate(nextCandidates[0]);
        setReaderMessage(
          parsed.quantity !== null
            ? `品番 ${parsed.partNo}、数量 ${parsed.quantity} を反映し、候補を自動選択しました。`
            : `品番 ${parsed.partNo} を反映し、候補を自動選択しました。`
        );
      } else if (nextCandidates.length > 1) {
        setCandidateModalOpen(true);
        setReaderMessage(
          parsed.quantity !== null
            ? `品番 ${parsed.partNo}、数量 ${parsed.quantity} を反映しました。候補を選択してください。`
            : `品番 ${parsed.partNo} を反映しました。候補を選択してください。`
        );
      } else {
        setReaderMessage(
          parsed.quantity !== null
            ? `品番 ${parsed.partNo}、数量 ${parsed.quantity} を反映しました。候補は見つかりませんでした。`
            : `品番 ${parsed.partNo} を反映しました。候補は見つかりませんでした。`
        );
      }
      setReaderValue("");
      requestAnimationFrame(() => readerInputRef.current?.focus());
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      vibrateOnError();
      setError({ kind: "server", message });
    } finally {
      setCandidateLoading(false);
    }
  }

  function handleReaderKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    void applyReaderValue();
  }

  async function sendPalletItemOut() {
    if (submitting) return;

    const palletCode = fields.pallet_code.trim().toUpperCase();
    const partNo = fields.part_no.trim().toUpperCase();
    const quantity = Number(fields.quantity);
    setStoredWarehouseCode(warehouseCodeDraft);
    const idempotencyKey = pendingIdempotencyKey ?? createClientIdempotencyKey("pallet-item-out");

    setResult(null);
    setError(null);

    if (!partNo) {
      setError({ kind: "validation", message: "品番を入力してください。" });
      return;
    }
    if (!/^[A-Z0-9]{10,12}$/.test(partNo)) {
      setError({ kind: "validation", message: "品番は10〜12桁の英数字で入力してください。" });
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError({ kind: "validation", message: "数量は 0 より大きい数値で入力してください。" });
      return;
    }
    if (candidates.length > 1 && !selectedCandidate) {
      setCandidateModalOpen(true);
      setReaderMessage("出庫対象のパレットを選択してください。");
      return;
    }

    setFields((f) => ({
      ...f,
      pallet_code: palletCode,
      part_no: partNo,
    }));
    setSubmitting(true);

    try {
      const res = await postPalletItemOut(
        {
          pallet_code: palletCode || selectedCandidate?.pallet_code,
          part_no: partNo,
          quantity,
          selected_pallet_item_id: selectedCandidate?.pallet_item_id,
          operator_name: trimOrUndefined(fields.operator_name),
          remarks: trimOrUndefined(fields.remarks),
          idempotency_key: idempotencyKey,
        },
        { timeoutMs: 10_000 }
      );

      if (res.ok) {
        playSuccessBeep();
        setResult(res.data);
        setFields((f) => ({
          ...initialFields,
          operator_name: f.operator_name,
        }));
        setCandidates([]);
        setSelectedCandidate(null);
        setPendingIdempotencyKey(null);
        setCandidateModalOpen(false);
        setReaderValue("");
        setReaderMessage(null);
        requestAnimationFrame(() => readerInputRef.current?.focus());
        return;
      }

      if ("requiresSelection" in res && res.requiresSelection) {
        const nextCandidates = res.data.candidates;
        setPendingIdempotencyKey(idempotencyKey);
        setCandidates(nextCandidates);
        if (nextCandidates.length === 1) {
          const candidate = nextCandidates[0];
          setSelectedCandidate(candidate);
          setFields((f) => ({ ...f, pallet_code: candidate.pallet_code }));
          setCandidateModalOpen(false);
          setReaderMessage(`パレット ${candidate.pallet_code} を自動選択しました。`);
          return;
        }
        setSelectedCandidate(null);
        setCandidateModalOpen(true);
        setReaderMessage("出庫対象のパレットを選択してください。");
        return;
      }

      if ("error" in res) {
        vibrateOnError();
        setError(res.error);
      }
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
    void sendPalletItemOut();
  }

  function cancelCandidateSelection() {
    setSelectedCandidate(null);
    setCandidateModalOpen(false);
    setReaderMessage("候補選択をキャンセルしました。");
  }

  const transaction = result?.transaction;

  return (
    <section className="scanner-shell pallet-item-out-shell" aria-label="品番単位出庫">
      <header className="scanner-header">
        <h1 className="scanner-title">品番単位出庫</h1>
        <p className="scanner-sub">パレット内の特定品番だけを数量指定で出庫します</p>
      </header>

      <section className="scanner-panel reader-panel" aria-label="Bluetoothリーダー入力">
        <h2 className="panel-title">Bluetoothリーダー入力</h2>
        <label className="field">
          <span className="label">品番読み取り（Enterで確定）</span>
          <input
            ref={readerInputRef}
            className="input large"
            value={readerValue}
            onChange={(e) => setReaderValue(e.target.value)}
            onKeyDown={handleReaderKeyDown}
            disabled={submitting || candidateLoading}
            autoComplete="off"
            autoCapitalize="characters"
            inputMode="text"
            placeholder="例: 741R129590 2"
          />
        </label>
        <button
          type="button"
          className="btn secondary"
          disabled={submitting || candidateLoading || !readerValue.trim()}
          onClick={() => void applyReaderValue()}
        >
          {candidateLoading ? "候補確認中…" : "品番を反映"}
        </button>
        {readerMessage ? <p className="muted small reader-message">{readerMessage}</p> : null}
      </section>

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

          <div className="field">
            <span className="label">選択中の在庫</span>
            {selectedCandidate ? (
              <div className="muted small">
                project_no: {selectedCandidate.project_no ?? "-"}
                <br />
                pallet_code: {selectedCandidate.pallet_code}
                <br />
                location_code: {selectedCandidate.location_code ?? "-"}
              </div>
            ) : candidates.length > 0 ? (
              <div className="muted small">候補を選択してください。</div>
            ) : (
              <div className="muted small">未選択</div>
            )}
          </div>

          <label className="field">
            <span className="label">品番 *</span>
            <input
              className="input large"
              value={fields.part_no}
              onChange={(e) => {
                setCandidates([]);
                setSelectedCandidate(null);
                setPendingIdempotencyKey(null);
                setCandidateModalOpen(false);
                setFields((f) => ({ ...f, part_no: e.target.value.toUpperCase() }));
              }}
              disabled={submitting}
              autoComplete="off"
              autoCapitalize="characters"
            />
          </label>

          <label className="field">
            <span className="label">数量 *</span>
            <input
              className="input large"
              type="number"
              min="1"
              step="1"
              value={fields.quantity}
              onChange={(e) => setFields((f) => ({ ...f, quantity: e.target.value }))}
              disabled={submitting}
              inputMode="numeric"
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
                onChange={(e) => setFields((f) => ({ ...f, remarks: e.target.value }))}
                disabled={submitting}
              />
            </label>
          </details>

          <div className="actions">
            <button type="submit" className="btn primary" disabled={submitting}>
              {submitting ? "出庫中…" : "品番を出庫"}
            </button>
          </div>
        </section>
      </form>

      {candidateModalOpen && candidates.length > 1 ? (
        <div className="candidate-modal-backdrop" role="presentation">
          <section
            className="candidate-modal scanner-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="candidate-modal-title"
          >
            <h2 id="candidate-modal-title" className="panel-title">
              出庫対象を選択
            </h2>
            <p className="muted small">同じ品番が複数のパレットにあります。対象を選択してください。</p>
            <div className="candidate-card-list">
              {candidates.map((candidate, index) => (
                <button
                  key={candidate.pallet_item_id}
                  type="button"
                  className="candidate-card"
                  disabled={submitting}
                  onClick={() => selectCandidate(candidate)}
                >
                  <span className="candidate-title">候補{index + 1}</span>
                  <span>PL: {candidate.pallet_code}</span>
                  <span>PJ: {candidate.project_no ?? "-"}</span>
                  <span>棚: {candidate.location_code ?? "-"}</span>
                  <span>数量: {displayNumber(candidate.quantity)}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn secondary candidate-cancel"
              disabled={submitting}
              onClick={cancelCandidateSelection}
            >
              キャンセル
            </button>
          </section>
        </div>
      ) : null}

      {transaction ? (
        <section className="scanner-panel result-panel" aria-label="品番単位出庫結果">
          <div className="result-banner tone-ok">
            <div className="result-banner-title">品番出庫完了</div>
            <div className="move-success-summary">
              <div className="mono">{transactionText(transaction, "pallet_code")}</div>
              <div>{result?.part_no ?? fields.part_no}</div>
              <div>
                出庫 {displayNumber(result?.quantity_out)} / 残{" "}
                {displayNumber(result?.remaining_quantity)}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="scanner-panel error-panel" role="alert">
          <h2 className="panel-title">{itemOutErrorTitle(error)}</h2>
          <p className="error-message">{error.message}</p>
          {error.status != null ? (
            <p className="muted small">HTTP {error.status}</p>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
