"use client";

import { useState, type FormEvent } from "react";
import {
  searchPalletsByWarehouseCode,
  type PalletSearchRow,
} from "./palletSearchApi";

function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function formatUpdatedAt(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP");
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
  tableWrap: {
    overflowX: "auto" as const,
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
    whiteSpace: "nowrap" as const,
  },
  td: {
    borderBottom: "1px solid #eee",
    padding: "0.55rem",
    whiteSpace: "nowrap" as const,
  },
};

export function PalletSearchSection() {
  const [warehouseCode, setWarehouseCode] = useState("KOMATSU");
  const [rows, setRows] = useState<PalletSearchRow[]>([]);
  const [searchedWarehouseCode, setSearchedWarehouseCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const code = warehouseCode.trim();
    setError(null);

    if (!code) {
      setError("warehouse_code を入力してください。");
      return;
    }

    setLoading(true);
    try {
      const result = await searchPalletsByWarehouseCode(code);
      if (!result.ok) {
        setRows([]);
        setError(result.error);
        return;
      }
      setRows(result.pallets);
      setSearchedWarehouseCode(code);
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : "検索中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={styles.panel}>
      <h2>パレット検索</h2>
      <p>warehouse_code を指定して、パレットと積載品番を一覧表示します。</p>

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
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? "検索中..." : "検索"}
        </button>
      </form>

      {error ? <div style={styles.error}>{error}</div> : null}

      <p>
        件数: {rows.length}
        {searchedWarehouseCode ? `（${searchedWarehouseCode}）` : ""}
      </p>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>warehouse_code</th>
              <th style={styles.th}>棚番</th>
              <th style={styles.th}>PL</th>
              <th style={styles.th}>状態</th>
              <th style={styles.th}>品番</th>
              <th style={styles.th}>品名</th>
              <th style={styles.th}>数量</th>
              <th style={styles.th}>単位</th>
              <th style={styles.th}>更新日時</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.pallet_id}-${row.part_no ?? "empty"}-${index}`}>
                <td style={styles.td}>{row.warehouse_code}</td>
                <td style={styles.td}>{displayValue(row.current_location_code)}</td>
                <td style={styles.td}>{row.pallet_code}</td>
                <td style={styles.td}>{displayValue(row.current_status)}</td>
                <td style={styles.td}>{displayValue(row.part_no)}</td>
                <td style={styles.td}>{displayValue(row.part_name)}</td>
                <td style={styles.td}>{displayValue(row.quantity)}</td>
                <td style={styles.td}>{displayValue(row.quantity_unit)}</td>
                <td style={styles.td}>{formatUpdatedAt(row.updated_at)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td style={styles.td} colSpan={9}>
                  検索結果はありません。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
