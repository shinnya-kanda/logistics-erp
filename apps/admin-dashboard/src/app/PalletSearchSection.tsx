"use client";

import { useState, type FormEvent } from "react";
import {
  searchPalletsByWarehouseCode,
  type PalletSearchRow,
  type PalletSearchStatus,
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

function isOutRow(row: PalletSearchRow): boolean {
  return row.current_status === "OUT";
}

function statusLabel(status: string | null): string {
  if (status === "OUT") return "OUT（出庫済み）";
  if (status === "ACTIVE") return "ACTIVE";
  return displayValue(status);
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
  resultSummary: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.5rem 1rem",
    alignItems: "baseline",
    margin: "1rem 0",
    padding: "0.75rem 0.9rem",
    borderRadius: "10px",
    background: "#f5f7fb",
    fontWeight: 700,
  },
  resultSummarySub: {
    color: "#555",
    fontWeight: 600,
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
  outRow: {
    background: "#f1f1f1",
    color: "#666",
  },
  statusBadge: {
    display: "inline-block",
    minWidth: "4.5rem",
    padding: "0.2rem 0.45rem",
    borderRadius: "999px",
    fontSize: "0.82rem",
    fontWeight: 700,
    textAlign: "center" as const,
  },
  statusActive: {
    background: "#e8f5e9",
    color: "#1b5e20",
  },
  statusOut: {
    background: "#e0e0e0",
    color: "#424242",
  },
  statusUnknown: {
    background: "#eceff1",
    color: "#455a64",
  },
};

export function PalletSearchSection() {
  const [warehouseCode, setWarehouseCode] = useState("KOMATSU");
  const [statusFilter, setStatusFilter] = useState<PalletSearchStatus>("ALL");
  const [rows, setRows] = useState<PalletSearchRow[]>([]);
  const [searchedWarehouseCode, setSearchedWarehouseCode] = useState("");
  const [searchedStatus, setSearchedStatus] = useState<PalletSearchStatus>("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeCount = rows.filter((row) => row.current_status === "ACTIVE").length;
  const outCount = rows.filter((row) => row.current_status === "OUT").length;

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
      const result = await searchPalletsByWarehouseCode(code, statusFilter);
      if (!result.ok) {
        setRows([]);
        setError(result.error);
        return;
      }
      setRows(result.pallets);
      setSearchedWarehouseCode(code);
      setSearchedStatus(statusFilter);
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
        <label style={styles.field}>
          <span>status</span>
          <select
            style={styles.input}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PalletSearchStatus)}
          >
            <option value="ALL">全て</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="OUT">OUT</option>
          </select>
        </label>
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? "検索中..." : "検索"}
        </button>
      </form>

      {error ? <div style={styles.error}>{error}</div> : null}

      <div style={styles.resultSummary}>
        <span>
          検索結果：{rows.length}件
          {searchedWarehouseCode
            ? `（warehouse_code: ${searchedWarehouseCode}${
                searchedStatus === "ALL" ? "" : ` / status: ${searchedStatus}`
              }）`
            : ""}
        </span>
        <span style={styles.resultSummarySub}>
          ACTIVE: {activeCount} / OUT: {outCount}
        </span>
      </div>

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
            {rows.map((row, index) => {
              const out = isOutRow(row);
              const statusStyle =
                row.current_status === "ACTIVE"
                  ? styles.statusActive
                  : out
                    ? styles.statusOut
                    : styles.statusUnknown;
              return (
                <tr
                  key={`${row.pallet_id}-${row.part_no ?? "empty"}-${index}`}
                  style={out ? styles.outRow : undefined}
                >
                  <td style={styles.td}>{row.warehouse_code}</td>
                  <td style={styles.td}>{displayValue(row.current_location_code)}</td>
                  <td style={styles.td}>{row.pallet_code}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, ...statusStyle }}>
                      {statusLabel(row.current_status)}
                    </span>
                  </td>
                  <td style={styles.td}>{displayValue(row.part_no)}</td>
                  <td style={styles.td}>{displayValue(row.part_name)}</td>
                  <td style={styles.td}>{displayValue(row.quantity)}</td>
                  <td style={styles.td}>{displayValue(row.quantity_unit)}</td>
                  <td style={styles.td}>{formatUpdatedAt(row.updated_at)}</td>
                </tr>
              );
            })}
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
