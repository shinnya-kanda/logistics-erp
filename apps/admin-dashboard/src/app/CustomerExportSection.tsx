"use client";

import { useState, type FormEvent } from "react";
import { searchPallets, type PalletSearchRow } from "./palletSearchApi";

type CustomerExportRow = {
  output_date: string;
  pj_no: string;
  location_code: string;
  pallet_code: string;
  part_no: string;
  quantity: string;
  quantity_unit: string;
  pallet_status: "保管中" | "出庫済";
  pallet_id: string;
};

type ProjectSummaryRow = {
  pj_no: string;
  pallet_count: number;
  part_row_count: number;
  quantity_total: number;
  shipped_count: number;
};

function dateInputValue(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

function compactDate(value: string): string {
  return value.replace(/-/g, "");
}

function csvFileName(outputDate: string): string {
  return `customer_pallet_report_${compactDate(outputDate)}.csv`;
}

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function quantityNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function palletStatus(currentStatus: string | null): "保管中" | "出庫済" {
  return currentStatus === "OUT" ? "出庫済" : "保管中";
}

function buildCustomerExportRows(
  rows: PalletSearchRow[],
  outputDate: string
): CustomerExportRow[] {
  return rows
    .map((row) => ({
      output_date: outputDate,
      pj_no: row.project_no ?? "",
      location_code: row.current_location_code ?? "",
      pallet_code: row.pallet_code,
      part_no: row.part_no ?? "",
      quantity: row.quantity === null || row.quantity === undefined ? "" : String(row.quantity),
      quantity_unit: row.quantity_unit ?? "",
      pallet_status: palletStatus(row.current_status),
      pallet_id: row.pallet_id,
    }))
    .sort((a, b) => {
      const dateCompare = a.output_date.localeCompare(b.output_date, "ja");
      if (dateCompare !== 0) return dateCompare;
      const projectCompare = a.pj_no.localeCompare(b.pj_no, "ja");
      if (projectCompare !== 0) return projectCompare;
      const locationCompare = a.location_code.localeCompare(b.location_code, "ja");
      if (locationCompare !== 0) return locationCompare;
      const palletCompare = a.pallet_code.localeCompare(b.pallet_code, "ja");
      if (palletCompare !== 0) return palletCompare;
      return a.part_no.localeCompare(b.part_no, "ja");
    });
}

function uniquePalletCount(rows: CustomerExportRow[]): number {
  return new Set(rows.map((row) => row.pallet_id)).size;
}

function shippedPalletCount(rows: CustomerExportRow[]): number {
  const shipped = rows
    .filter((row) => row.pallet_status === "出庫済")
    .map((row) => row.pallet_id);
  return new Set(shipped).size;
}

function quantityTotal(rows: CustomerExportRow[]): number {
  return rows.reduce((sum, row) => sum + quantityNumber(row.quantity), 0);
}

function buildProjectSummary(rows: CustomerExportRow[]): ProjectSummaryRow[] {
  const rowsByProject = rows.reduce<Map<string, CustomerExportRow[]>>((map, row) => {
    const key = row.pj_no || "(未設定)";
    const current = map.get(key) ?? [];
    current.push(row);
    map.set(key, current);
    return map;
  }, new Map<string, CustomerExportRow[]>());

  return Array.from(rowsByProject.entries())
    .map(([pjNo, projectRows]) => ({
      pj_no: pjNo,
      pallet_count: uniquePalletCount(projectRows),
      part_row_count: projectRows.filter((row) => row.part_no).length,
      quantity_total: quantityTotal(projectRows),
      shipped_count: shippedPalletCount(projectRows),
    }))
    .sort((a, b) => a.pj_no.localeCompare(b.pj_no, "ja"));
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
    padding: "0.65rem 0.9rem",
    border: "1px solid #aaa",
    borderRadius: "8px",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },
  error: {
    margin: "1rem 0",
    padding: "0.75rem",
    border: "1px solid #c62828",
    borderRadius: "8px",
    background: "#ffebee",
    color: "#b71c1c",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
    gap: "0.75rem",
    margin: "1rem 0",
  },
  summaryCard: {
    padding: "0.85rem",
    border: "1px solid #ddd",
    borderRadius: "10px",
    background: "#f7f9fc",
  },
  summaryLabel: {
    color: "#555",
    fontSize: "0.85rem",
    fontWeight: 700,
  },
  summaryValue: {
    marginTop: "0.25rem",
    fontSize: "1.4rem",
    fontWeight: 800,
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

export function CustomerExportSection() {
  const [warehouseCode, setWarehouseCode] = useState("KOMATSU");
  const [projectNo, setProjectNo] = useState("");
  const [exportDate, setExportDate] = useState(dateInputValue);
  const [rows, setRows] = useState<CustomerExportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectSummaryRows = buildProjectSummary(rows);
  const pjNoKinds = new Set(rows.map((row) => row.pj_no).filter(Boolean)).size;
  const totalPalletCount = uniquePalletCount(rows);
  const partRowCount = rows.filter((row) => row.part_no).length;
  const totalQuantity = quantityTotal(rows);
  const shippedCount = shippedPalletCount(rows);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const code = warehouseCode.trim();
    const project = projectNo.trim();
    if (!code && !project) {
      setError("warehouse_code または project_no を入力してください。");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await searchPallets({
        warehouseCode: code,
        projectNo: project,
        status: "ALL",
      });
      if (!result.ok) {
        setRows([]);
        setError(result.error);
        return;
      }
      setRows(buildCustomerExportRows(result.pallets, exportDate));
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : "客先提出データの取得中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadCsv() {
    const header = ["出力日", "PJ NO", "棚番", "パレット番号", "品番", "数量", "単位", "状態"];
    const csv = [
      header,
      ...rows.map((row) => [
        exportDate,
        row.pj_no,
        row.location_code,
        row.pallet_code,
        row.part_no,
        row.quantity,
        row.quantity_unit,
        row.pallet_status,
      ]),
    ]
      .map((line) => line.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFileName(exportDate);
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section style={styles.panel}>
      <h2>客先提出</h2>
      <p>客先へ提出できる形式で、出力日単位・PJ NO単位のパレット在庫明細CSVを出力します。</p>

      <form style={styles.form} onSubmit={handleSearch}>
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
          <span>project_no</span>
          <input
            style={styles.input}
            value={projectNo}
            onChange={(e) => setProjectNo(e.target.value)}
            autoComplete="off"
          />
        </label>
        <label style={styles.field}>
          <span>出力日</span>
          <input
            style={styles.input}
            type="date"
            value={exportDate}
            onChange={(e) => setExportDate(e.target.value)}
          />
        </label>
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? "取得中..." : "客先提出データ取得"}
        </button>
        <button
          style={styles.secondaryButton}
          type="button"
          onClick={handleDownloadCsv}
          disabled={rows.length === 0}
        >
          客先提出CSV出力
        </button>
      </form>

      {error ? <div style={styles.error}>{error}</div> : null}

      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>出力日</div>
          <div style={styles.summaryValue}>{exportDate}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>PJ NO種類数</div>
          <div style={styles.summaryValue}>{pjNoKinds}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>総パレット数</div>
          <div style={styles.summaryValue}>{totalPalletCount}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>品番あり件数</div>
          <div style={styles.summaryValue}>{partRowCount}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>数量合計</div>
          <div style={styles.summaryValue}>{totalQuantity}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>出庫済件数</div>
          <div style={styles.summaryValue}>{shippedCount}</div>
        </div>
      </div>

      <h3>PJ NO別集計</h3>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>PJ NO</th>
              <th style={styles.th}>パレット数</th>
              <th style={styles.th}>品番あり件数</th>
              <th style={styles.th}>数量合計</th>
              <th style={styles.th}>出庫済件数</th>
            </tr>
          </thead>
          <tbody>
            {projectSummaryRows.map((row) => (
              <tr key={row.pj_no}>
                <td style={styles.td}>{displayValue(row.pj_no)}</td>
                <td style={styles.td}>{row.pallet_count}</td>
                <td style={styles.td}>{row.part_row_count}</td>
                <td style={styles.td}>{row.quantity_total}</td>
                <td style={styles.td}>{row.shipped_count}</td>
              </tr>
            ))}
            {projectSummaryRows.length === 0 ? (
              <tr>
                <td style={styles.td} colSpan={5}>
                  集計結果はありません。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <h3>客先提出明細（CSV対象）</h3>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>出力日</th>
              <th style={styles.th}>PJ NO</th>
              <th style={styles.th}>棚番</th>
              <th style={styles.th}>パレット番号</th>
              <th style={styles.th}>品番</th>
              <th style={styles.th}>数量</th>
              <th style={styles.th}>単位</th>
              <th style={styles.th}>状態</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.pallet_id}-${row.part_no}-${index}`}>
                <td style={styles.td}>{row.output_date}</td>
                <td style={styles.td}>{displayValue(row.pj_no)}</td>
                <td style={styles.td}>{displayValue(row.location_code)}</td>
                <td style={styles.td}>{row.pallet_code}</td>
                <td style={styles.td}>{displayValue(row.part_no)}</td>
                <td style={styles.td}>{displayValue(row.quantity)}</td>
                <td style={styles.td}>{displayValue(row.quantity_unit)}</td>
                <td style={styles.td}>{row.pallet_status}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td style={styles.td} colSpan={8}>
                  客先提出明細はありません。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
