"use client";

import { useState, type FormEvent } from "react";
import { getEmptyPallets, type EmptyPalletRow } from "./palletSearchApi";

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
  error: {
    margin: "1rem 0",
    padding: "0.75rem",
    border: "1px solid #c62828",
    borderRadius: "8px",
    background: "#ffebee",
    color: "#b71c1c",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.92rem",
  },
  th: {
    textAlign: "left" as const,
    borderBottom: "2px solid #ddd",
    padding: "0.55rem",
  },
  td: {
    borderBottom: "1px solid #eee",
    padding: "0.55rem",
  },
};

export function EmptyPalletSearchSection() {
  const [warehouseCode, setWarehouseCode] = useState("KOMATSU");
  const [projectNo, setProjectNo] = useState("");
  const [rows, setRows] = useState<EmptyPalletRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await getEmptyPallets({
        warehouseCode,
        projectNo,
      });
      if (!result.ok) {
        setRows([]);
        setError(result.error);
        return;
      }
      setRows(result.pallets);
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : "空パレット検索中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={styles.panel}>
      <h2>空パレット検索</h2>
      <form style={styles.form} onSubmit={handleSubmit}>
        <label style={styles.field}>
          <span>warehouse_code</span>
          <input
            style={styles.input}
            value={warehouseCode}
            onChange={(e) => setWarehouseCode(e.target.value)}
            autoComplete="off"
          />
        </label>
        <label style={styles.field}>
          <span>製番 / project_no</span>
          <input
            style={styles.input}
            value={projectNo}
            onChange={(e) => setProjectNo(e.target.value)}
            autoComplete="off"
          />
        </label>
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? "検索中..." : "検索"}
        </button>
      </form>

      {error ? <div style={styles.error}>{error}</div> : null}

      <p>検索結果：{rows.length}件</p>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>warehouse_code</th>
            <th style={styles.th}>棚番</th>
            <th style={styles.th}>PL</th>
            <th style={styles.th}>状態</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.pallet_id}>
              <td style={styles.td}>{row.warehouse_code}</td>
              <td style={styles.td}>{displayValue(row.current_location_code)}</td>
              <td style={styles.td}>{row.pallet_code}</td>
              <td style={styles.td}>{displayValue(row.current_status)}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td style={styles.td} colSpan={4}>
                検索結果はありません。
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}
