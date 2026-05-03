"use client";

import { useState, type FormEvent } from "react";
import {
  getPalletDetail,
  searchPallets,
  type PalletDetail,
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

type PalletLoadState = "empty" | "low" | "medium" | "full" | "out";

function palletState(row: PalletSearchRow, itemCount?: number): PalletLoadState {
  if (row.current_status === "OUT") return "out";
  if (itemCount === undefined) return row.part_no ? "full" : "empty";
  if (itemCount === 0) return "empty";
  if (itemCount <= 4) return "low";
  if (itemCount <= 10) return "medium";
  return "full";
}

function palletStateLabel(state: PalletLoadState): string {
  if (state === "out") return "出庫済";
  if (state === "full") return "満載";
  if (state === "medium") return "中";
  if (state === "low") return "少";
  return "空";
}

function palletStateSortOrder(state: PalletLoadState): number {
  if (state === "full") return 0;
  if (state === "medium") return 1;
  if (state === "low") return 2;
  if (state === "empty") return 3;
  return 4;
}

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function fieldCsvFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `pallet_field_${yyyy}${mm}${dd}_${hh}${min}.csv`;
}

type FieldPalletRow = {
  pallet_code: string;
  project_no: string;
  location_code: string;
  load_status: string;
  item_count: number;
  sort_load_status: number;
};

function buildFieldPalletRows(
  rows: PalletSearchRow[],
  palletItemCountById: Map<string, number>
): FieldPalletRow[] {
  const palletRows = Array.from(
    rows
      .reduce<Map<string, PalletSearchRow>>((map, row) => {
        if (!map.has(row.pallet_id)) map.set(row.pallet_id, row);
        return map;
      }, new Map<string, PalletSearchRow>())
      .values()
  );

  return palletRows
    .map((row) => {
      const itemCount = palletItemCountById.get(row.pallet_id);
      const loadState = palletState(row, itemCount);
      return {
        pallet_code: row.pallet_code,
        project_no: row.project_no ?? "",
        location_code: row.current_location_code ?? "",
        load_status: palletStateLabel(loadState),
        item_count: itemCount ?? (row.part_no ? 1 : 0),
        sort_load_status: palletStateSortOrder(loadState),
      };
    })
    .sort((a, b) => {
      const projectCompare = a.project_no.localeCompare(b.project_no, "ja");
      if (projectCompare !== 0) return projectCompare;
      if (a.sort_load_status !== b.sort_load_status) {
        return a.sort_load_status - b.sort_load_status;
      }
      return a.location_code.localeCompare(b.location_code, "ja");
    });
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
  palletStateEmpty: {
    background: "#eeeeee",
    color: "#424242",
  },
  palletStateLow: {
    background: "#e3f2fd",
    color: "#0d47a1",
  },
  palletStateMedium: {
    background: "#fff3e0",
    color: "#e65100",
  },
  palletStateFull: {
    background: "#e8f5e9",
    color: "#1b5e20",
  },
  palletStateOut: {
    background: "#ffebee",
    color: "#b71c1c",
  },
  linkButton: {
    border: "none",
    padding: 0,
    background: "transparent",
    color: "#1565c0",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 700,
    textDecoration: "underline",
  },
  detailPanel: {
    margin: "1rem 0",
    padding: "1rem",
    border: "1px solid #cfd8dc",
    borderRadius: "10px",
    background: "#fafafa",
  },
  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    alignItems: "center",
    marginBottom: "0.75rem",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
    gap: "0.4rem 1rem",
    marginBottom: "1rem",
  },
  secondaryButton: {
    padding: "0.45rem 0.75rem",
    border: "1px solid #aaa",
    borderRadius: "8px",
    background: "#fff",
    cursor: "pointer",
  },
};

export function PalletSearchSection() {
  const [warehouseCode, setWarehouseCode] = useState("KOMATSU");
  const [projectNo, setProjectNo] = useState("");
  const [statusFilter, setStatusFilter] = useState<PalletSearchStatus>("ALL");
  const [partNo, setPartNo] = useState("");
  const [palletCode, setPalletCode] = useState("");
  const [rows, setRows] = useState<PalletSearchRow[]>([]);
  const [searchedWarehouseCode, setSearchedWarehouseCode] = useState("");
  const [searchedProjectNo, setSearchedProjectNo] = useState("");
  const [searchedStatus, setSearchedStatus] = useState<PalletSearchStatus>("ALL");
  const [searchedPartNo, setSearchedPartNo] = useState("");
  const [searchedPalletCode, setSearchedPalletCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<PalletDetail | null>(null);
  const [detailLoadingCode, setDetailLoadingCode] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [printIssuedAt, setPrintIssuedAt] = useState<string | null>(null);
  const activeCount = rows.filter((row) => row.current_status === "ACTIVE").length;
  const outCount = rows.filter((row) => row.current_status === "OUT").length;
  const palletItemCountById = rows.reduce<Map<string, number>>((counts, row) => {
    counts.set(row.pallet_id, (counts.get(row.pallet_id) ?? 0) + (row.part_no ? 1 : 0));
    return counts;
  }, new Map<string, number>());
  const fieldPalletRows = buildFieldPalletRows(rows, palletItemCountById);
  const searchConditionText = [
    searchedWarehouseCode ? `warehouse_code: ${searchedWarehouseCode}` : null,
    searchedProjectNo ? `project_no: ${searchedProjectNo}` : null,
    searchedStatus === "ALL" ? null : `status: ${searchedStatus}`,
    searchedPartNo ? `part_no: ${searchedPartNo}` : null,
    searchedPalletCode ? `pallet_code: ${searchedPalletCode}` : null,
  ]
    .filter(Boolean)
    .join(" / ");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const code = warehouseCode.trim();
    const project = projectNo.trim();
    const part = partNo.trim();
    const pallet = palletCode.trim();
    setError(null);
    setDetailError(null);

    if (!code && !project && !part && !pallet) {
      setError("warehouse_code、project_no、part_no、pallet_code のいずれかを入力してください。");
      return;
    }

    setLoading(true);
    try {
      const result = await searchPallets({
        warehouseCode: code,
        projectNo: project,
        status: statusFilter,
        partNo: part,
        palletCode: pallet,
      });
      if (!result.ok) {
        setRows([]);
        setDetail(null);
        setError(result.error);
        return;
      }
      setRows(result.pallets);
      setDetail(null);
      setSearchedWarehouseCode(code);
      setSearchedProjectNo(project);
      setSearchedStatus(statusFilter);
      setSearchedPartNo(part);
      setSearchedPalletCode(pallet);
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : "検索中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenDetail(code: string) {
    setDetailError(null);
    setDetailLoadingCode(code);
    try {
      const result = await getPalletDetail(code);
      if (!result.ok) {
        setDetail(null);
        setDetailError(result.error);
        return;
      }
      setDetail({
        pallet: result.pallet,
        items: result.items,
        transactions: result.transactions,
      });
    } catch (err) {
      setDetail(null);
      setDetailError(
        err instanceof Error ? err.message : "パレット詳細の取得中にエラーが発生しました。"
      );
    } finally {
      setDetailLoadingCode(null);
    }
  }

  function handleDownloadFieldCsv() {
    const header = ["pallet_code", "project_no", "location_code", "load_status", "item_count"];
    const csv = [
      header,
      ...fieldPalletRows.map((row) => [
        row.pallet_code,
        row.project_no,
        row.location_code,
        row.load_status,
        row.item_count,
      ]),
    ]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fieldCsvFileName();
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrintFieldList() {
    setPrintIssuedAt(formatUpdatedAt(new Date().toISOString()));
    window.setTimeout(() => window.print(), 0);
  }

  return (
    <section style={styles.panel}>
      <style>{`
        .print-area {
          display: none;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          html,
          body {
            height: auto;
            margin: 0;
            padding: 0;
          }

          body * {
            visibility: hidden;
          }

          .print-area,
          .print-area * {
            visibility: visible;
          }

          .print-area {
            display: block;
            position: static;
            width: 100%;
            max-width: 100%;
            height: auto;
            min-height: auto;
            overflow: visible;
            margin: 0;
            padding: 0;
            page-break-after: avoid;
            break-after: avoid;
            color: #000;
            font-family: sans-serif;
          }

          table,
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .print-area > *:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
          }

          .field-print-title {
            margin: 0 0 2mm;
            font-size: 16pt;
            line-height: 1.15;
          }

          .field-print-meta {
            display: flex;
            justify-content: space-between;
            gap: 8mm;
            margin-bottom: 2mm;
            font-size: 8.5pt;
            line-height: 1.2;
          }

          .field-print-table {
            width: 100%;
            margin: 0;
            border-collapse: collapse;
            font-size: 12px;
            line-height: 1.2;
          }

          .field-print-table th,
          .field-print-table td {
            border: 1px solid #333;
            padding: 4px 6px;
            font-size: 12px;
            line-height: 1.2;
            text-align: left;
            vertical-align: top;
          }

          .field-print-table th {
            background: #eee;
          }

          .field-print-check {
            font-size: 12pt;
            line-height: 1;
            text-align: center;
          }

          .field-print-remarks {
            min-width: 38mm;
          }

          .field-print-empty {
            display: none;
          }
        }
      `}</style>
      <h2>パレット検索</h2>
      <p>warehouse_code、project_no、part_no、pallet_code を組み合わせて検索できます。</p>

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
        <label style={styles.field}>
          <span>品番（part_no）</span>
          <input
            style={styles.input}
            value={partNo}
            onChange={(e) => setPartNo(e.target.value)}
            autoComplete="off"
          />
        </label>
        <label style={styles.field}>
          <span>パレットコード（PL）</span>
          <input
            style={styles.input}
            value={palletCode}
            onChange={(e) => setPalletCode(e.target.value)}
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
      {detailError ? <div style={styles.error}>{detailError}</div> : null}

      <div style={styles.resultSummary}>
        <span>
          検索結果：{rows.length}件
          {searchConditionText ? `（${searchConditionText}）` : ""}
        </span>
        <span style={styles.resultSummarySub}>
          ACTIVE: {activeCount} / OUT: {outCount}
        </span>
        <button
          style={styles.secondaryButton}
          type="button"
          onClick={handleDownloadFieldCsv}
          disabled={rows.length === 0}
        >
          現場CSV出力
        </button>
        <button
          style={styles.secondaryButton}
          type="button"
          onClick={handlePrintFieldList}
          disabled={rows.length === 0}
        >
          現場印刷
        </button>
      </div>

      {detailLoadingCode ? (
        <div style={styles.resultSummary}>パレット詳細を取得中です: {detailLoadingCode}</div>
      ) : null}

      {detail ? (
        <section style={styles.detailPanel} aria-label="パレット詳細">
          <div style={styles.detailHeader}>
            <h3>パレット詳細</h3>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => {
                setDetail(null);
                setDetailError(null);
              }}
            >
              閉じる
            </button>
          </div>

          <h4>パレット基本情報</h4>
          <div style={styles.detailGrid}>
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
              <strong>current_location_code:</strong>{" "}
              {displayValue(detail.pallet.current_location_code)}
            </div>
            <div>
              <strong>current_status:</strong> {statusLabel(detail.pallet.current_status)}
            </div>
            <div>
              <strong>updated_at:</strong> {formatUpdatedAt(detail.pallet.updated_at)}
            </div>
          </div>

          <h4>積載品番一覧</h4>
          {detail.items.length === 0 ? (
            <p>積載品番はありません</p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>part_no</th>
                    <th style={styles.th}>part_name</th>
                    <th style={styles.th}>quantity</th>
                    <th style={styles.th}>quantity_unit</th>
                    <th style={styles.th}>linked_at</th>
                    <th style={styles.th}>updated_at</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((item, index) => (
                    <tr key={`${item.part_no ?? "item"}-${index}`}>
                      <td style={styles.td}>{displayValue(item.part_no)}</td>
                      <td style={styles.td}>{displayValue(item.part_name)}</td>
                      <td style={styles.td}>{displayValue(item.quantity)}</td>
                      <td style={styles.td}>{displayValue(item.quantity_unit)}</td>
                      <td style={styles.td}>{formatUpdatedAt(item.linked_at)}</td>
                      <td style={styles.td}>{formatUpdatedAt(item.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h4>履歴</h4>
          {detail.transactions.length === 0 ? (
            <p>履歴はありません</p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>transaction_type</th>
                    <th style={styles.th}>from_location_code</th>
                    <th style={styles.th}>to_location_code</th>
                    <th style={styles.th}>operator_name</th>
                    <th style={styles.th}>remarks</th>
                    <th style={styles.th}>occurred_at</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.transactions.map((transaction, index) => (
                    <tr key={`${transaction.occurred_at ?? "tx"}-${index}`}>
                      <td style={styles.td}>{displayValue(transaction.transaction_type)}</td>
                      <td style={styles.td}>{displayValue(transaction.from_location_code)}</td>
                      <td style={styles.td}>{displayValue(transaction.to_location_code)}</td>
                      <td style={styles.td}>{displayValue(transaction.operator_name)}</td>
                      <td style={styles.td}>{displayValue(transaction.remarks)}</td>
                      <td style={styles.td}>{formatUpdatedAt(transaction.occurred_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>warehouse_code</th>
              <th style={styles.th}>project_no</th>
              <th style={styles.th}>棚番</th>
              <th style={styles.th}>PL</th>
              <th style={styles.th}>状態</th>
              <th style={styles.th}>積載状態</th>
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
              const loadState = palletState(row, palletItemCountById.get(row.pallet_id));
              const statusStyle =
                row.current_status === "ACTIVE"
                  ? styles.statusActive
                  : out
                    ? styles.statusOut
                    : styles.statusUnknown;
              const palletStateStyle =
                loadState === "empty"
                  ? styles.palletStateEmpty
                  : loadState === "low"
                    ? styles.palletStateLow
                    : loadState === "medium"
                      ? styles.palletStateMedium
                      : loadState === "full"
                        ? styles.palletStateFull
                        : styles.palletStateOut;
              return (
                <tr
                  key={`${row.pallet_id}-${row.part_no ?? "empty"}-${index}`}
                  style={out ? styles.outRow : undefined}
                >
                  <td style={styles.td}>{row.warehouse_code}</td>
                  <td style={styles.td}>{displayValue(row.project_no)}</td>
                  <td style={styles.td}>{displayValue(row.current_location_code)}</td>
                  <td style={styles.td}>
                    <button
                      type="button"
                      style={styles.linkButton}
                      onClick={() => void handleOpenDetail(row.pallet_code)}
                    >
                      {row.pallet_code}
                    </button>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, ...statusStyle }}>
                      {statusLabel(row.current_status)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, ...palletStateStyle }}>
                      {palletStateLabel(loadState)}
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
                <td style={styles.td} colSpan={11}>
                  検索結果はありません。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <section className="print-area field-print-area" aria-label="現場パレット確認表">
        <h1 className="field-print-title">現場パレット確認表</h1>
        <div className="field-print-meta">
          <div>出力日時: {printIssuedAt ?? formatUpdatedAt(new Date().toISOString())}</div>
          <div>件数: {fieldPalletRows.length}件</div>
        </div>
        <table className="field-print-table">
          <thead>
            <tr>
              <th>No</th>
              <th>パレット番号</th>
              <th>製番</th>
              <th>棚番</th>
              <th>積載状態</th>
              <th>積載数</th>
              <th>確認欄</th>
              <th>備考欄</th>
            </tr>
          </thead>
          <tbody>
            {fieldPalletRows.map((row, index) => (
              <tr key={`${row.pallet_code}-${index}`}>
                <td>{index + 1}</td>
                <td>{row.pallet_code}</td>
                <td>{row.project_no}</td>
                <td>{row.location_code}</td>
                <td>{row.load_status}</td>
                <td>{row.item_count}</td>
                <td className="field-print-check">□</td>
                <td className="field-print-remarks"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
}
