"use client";

import { useState, type FormEvent } from "react";
import {
  searchInventoryCurrent,
  type InventoryCurrentRow,
} from "./palletSearchApi";

function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function formatDateTime(value: string | null | undefined): string {
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
    margin: "1rem 0",
  },
  field: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.35rem",
  },
  input: {
    minWidth: "13rem",
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
  summary: {
    margin: "1rem 0",
    padding: "0.75rem 0.9rem",
    borderRadius: "10px",
    background: "#f5f7fb",
    fontWeight: 700,
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

export function InventoryCurrentSection() {
  const [partNo, setPartNo] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [projectNo, setProjectNo] = useState("");
  const [inventoryType, setInventoryType] = useState("");
  const [rows, setRows] = useState<InventoryCurrentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const result = await searchInventoryCurrent({
        partNo,
        locationCode,
        projectNo,
        inventoryType,
      });
      if (!result.ok) {
        setRows([]);
        setError(result.error);
        return;
      }

      setRows(result.items);
    } catch (err) {
      setRows([]);
      setError(
        err instanceof Error
          ? err.message
          : "部品現在庫データの取得中にエラーが発生しました。"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={styles.panel}>
      <h2 style={{ marginTop: 0 }}>部品現在庫</h2>
      <p>
        この画面は `inventory_current` を表示する現在庫 read model です。
        `inventory_current` は source of truth ではありません。
      </p>
      <p>
        source of truth は `inventory_transactions` です。数量差異がある場合は
        `inventory_transactions` との照合が必要です。
      </p>

      <form onSubmit={(event) => void handleSubmit(event)} style={styles.form}>
        <label style={styles.field}>
          <span>part_no</span>
          <input
            value={partNo}
            onChange={(event) => setPartNo(event.target.value)}
            style={styles.input}
            autoComplete="off"
          />
        </label>
        <label style={styles.field}>
          <span>location_code</span>
          <input
            value={locationCode}
            onChange={(event) => setLocationCode(event.target.value)}
            style={styles.input}
            autoComplete="off"
          />
        </label>
        <label style={styles.field}>
          <span>project_no</span>
          <input
            value={projectNo}
            onChange={(event) => setProjectNo(event.target.value)}
            style={styles.input}
            autoComplete="off"
          />
        </label>
        <label style={styles.field}>
          <span>inventory_type</span>
          <input
            value={inventoryType}
            onChange={(event) => setInventoryType(event.target.value)}
            style={styles.input}
            placeholder="project"
            autoComplete="off"
          />
        </label>
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "検索中..." : "部品現在庫検索"}
        </button>
      </form>

      {error ? <div style={styles.error}>{error}</div> : null}

      {searched ? (
        <div style={styles.summary}>検索結果: {rows.length}件</div>
      ) : null}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>part_no</th>
              <th style={styles.th}>part_name</th>
              <th style={styles.th}>location_code</th>
              <th style={styles.th}>quantity_on_hand</th>
              <th style={styles.th}>quantity_unit</th>
              <th style={styles.th}>inventory_type</th>
              <th style={styles.th}>project_no</th>
              <th style={styles.th}>updated_at</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td style={styles.td}>{row.part_no}</td>
                <td style={styles.td}>{displayValue(row.part_name)}</td>
                <td style={styles.td}>{row.location_code}</td>
                <td style={styles.td}>{displayValue(row.quantity_on_hand)}</td>
                <td style={styles.td}>{displayValue(row.quantity_unit)}</td>
                <td style={styles.td}>{row.inventory_type}</td>
                <td style={styles.td}>{displayValue(row.project_no)}</td>
                <td style={styles.td}>{formatDateTime(row.updated_at)}</td>
              </tr>
            ))}
            {searched && rows.length === 0 && !error ? (
              <tr>
                <td style={styles.td} colSpan={8}>
                  該当する部品現在庫はありません。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
