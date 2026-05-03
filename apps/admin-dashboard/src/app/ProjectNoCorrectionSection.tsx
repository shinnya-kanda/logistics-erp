"use client";

import { useState, type FormEvent } from "react";
import {
  getPalletDetail,
  updatePalletProjectNo,
  type PalletDetail,
} from "./palletSearchApi";

function displayValue(value: string | null | undefined): string {
  return value || "-";
}

const styles = {
  panel: {
    marginTop: "2rem",
    padding: "1.25rem",
    border: "1px solid #ddd",
    borderRadius: "12px",
    background: "#fff",
  },
  form: {
    display: "flex",
    gap: "0.75rem",
    alignItems: "flex-end",
    flexWrap: "wrap" as const,
    marginBottom: "1rem",
  },
  field: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.35rem",
  },
  input: {
    minWidth: "14rem",
    padding: "0.65rem 0.75rem",
    border: "1px solid #bbb",
    borderRadius: "8px",
    fontSize: "1rem",
  },
  button: {
    padding: "0.7rem 1.1rem",
    border: "none",
    borderRadius: "8px",
    background: "#1976d2",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "0.65rem 1rem",
    border: "1px solid #aaa",
    borderRadius: "8px",
    background: "#fff",
    cursor: "pointer",
  },
  error: {
    margin: "1rem 0",
    padding: "0.75rem",
    border: "1px solid #c62828",
    borderRadius: "8px",
    background: "#ffebee",
    color: "#b71c1c",
  },
  success: {
    margin: "1rem 0",
    padding: "0.75rem",
    border: "1px solid #2e7d32",
    borderRadius: "8px",
    background: "#e8f5e9",
    color: "#1b5e20",
  },
  info: {
    margin: "1rem 0",
    padding: "0.75rem",
    border: "1px solid #90caf9",
    borderRadius: "8px",
    background: "#e3f2fd",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
    gap: "0.5rem 1rem",
    margin: "1rem 0",
  },
};

export function ProjectNoCorrectionSection() {
  const [palletCode, setPalletCode] = useState("");
  const [newProjectNo, setNewProjectNo] = useState("");
  const [detail, setDetail] = useState<PalletDetail | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const code = palletCode.trim();
    if (!code) {
      setError("pallet_code を入力してください。");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    setConfirming(false);
    try {
      const result = await getPalletDetail(code);
      if (!result.ok) {
        setDetail(null);
        setError(result.error);
        return;
      }
      setDetail({
        pallet: result.pallet,
        items: result.items,
        transactions: result.transactions,
      });
      setNewProjectNo(result.pallet.project_no ?? "");
    } catch (err) {
      setDetail(null);
      setError(err instanceof Error ? err.message : "パレット検索中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate() {
    if (!detail) return;
    const projectNo = newProjectNo.trim();
    if (!projectNo) {
      setError("project_no を入力してください。");
      return;
    }
    if (!confirming) {
      setConfirming(true);
      setMessage(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await updatePalletProjectNo({
        palletCode: detail.pallet.pallet_code,
        projectNo,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDetail((current) =>
        current
          ? {
              ...current,
              pallet: result.pallet,
            }
          : current
      );
      setConfirming(false);
      setMessage(
        `project_no を更新しました。pallet_item_links 更新件数: ${result.updated_item_link_count}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "project_no 更新中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={styles.panel}>
      <h2>project_no補正</h2>
      <p>現在データだけを補正します。pallet_transactions は更新しません。</p>

      <form style={styles.form} onSubmit={handleSearch}>
        <label style={styles.field}>
          <span>pallet_code</span>
          <input
            style={styles.input}
            value={palletCode}
            onChange={(e) => setPalletCode(e.target.value)}
            autoComplete="off"
          />
        </label>
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? "検索中..." : "検索"}
        </button>
      </form>

      {error ? <div style={styles.error}>{error}</div> : null}
      {message ? <div style={styles.success}>{message}</div> : null}

      {detail ? (
        <section>
          <h3>現在のパレット情報</h3>
          <div style={styles.grid}>
            <div>
              <strong>PL:</strong> {detail.pallet.pallet_code}
            </div>
            <div>
              <strong>warehouse_code:</strong> {detail.pallet.warehouse_code}
            </div>
            <div>
              <strong>project_no:</strong> {displayValue(detail.pallet.project_no)}
            </div>
            <div>
              <strong>location_code:</strong> {displayValue(detail.pallet.current_location_code)}
            </div>
          </div>

          <label style={styles.field}>
            <span>新しい project_no</span>
            <input
              style={styles.input}
              value={newProjectNo}
              onChange={(e) => {
                setNewProjectNo(e.target.value);
                setConfirming(false);
              }}
              autoComplete="off"
            />
          </label>

          {confirming ? (
            <div style={styles.info}>
              <strong>確認:</strong> {detail.pallet.pallet_code} の project_no を{" "}
              {displayValue(detail.pallet.project_no)} から {newProjectNo.trim()} に更新します。
              履歴テーブルは更新しません。
            </div>
          ) : null}

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <button style={styles.button} type="button" onClick={handleUpdate} disabled={loading}>
              {confirming ? "確定して更新" : "更新内容を確認"}
            </button>
            {confirming ? (
              <button
                style={styles.secondaryButton}
                type="button"
                onClick={() => setConfirming(false)}
                disabled={loading}
              >
                キャンセル
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
    </section>
  );
}
