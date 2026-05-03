"use client";

import { useState, type FormEvent } from "react";
import {
  getUnregisteredWarehouseLocations,
  searchPallets,
  type PalletSearchRow,
} from "./palletSearchApi";

type BillingCategory = "storage" | "pallet_out" | "part_related" | "unknown";
type LocationRegisteredStatus = "registered" | "unregistered" | "unknown";

type BillingPalletRow = {
  pallet_id: string;
  billing_month: string;
  warehouse_code: string;
  project_no: string;
  pallet_code: string;
  location_code: string;
  location_registered_status: LocationRegisteredStatus;
  current_status: string;
  load_status: string;
  item_count: number;
  part_no: string;
  quantity: string;
  quantity_unit: string;
  billing_category: BillingCategory;
  storage_pallet_count: number;
  updated_at: string;
};

type ProjectSummaryRow = {
  project_no: string;
  pallet_count: number;
  storage_count: number;
  pallet_out_count: number;
  part_related_count: number;
};

function currentBillingMonth(date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function csvFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `pallet_billing_check_${yyyy}${mm}${dd}_${hh}${min}.csv`;
}

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function locationKey(warehouseCode: string, locationCode: string): string {
  return `${warehouseCode}:${locationCode}`;
}

function uniqueJoined(values: Array<string | number | null | undefined>): string {
  return Array.from(
    new Set(
      values
        .filter((value): value is string | number => value !== null && value !== undefined)
        .map((value) => String(value).trim())
        .filter(Boolean)
    )
  ).join(" / ");
}

function loadStatus(itemCount: number, currentStatus: string | null): string {
  if (currentStatus === "OUT") return "出庫済";
  if (itemCount === 0) return "空";
  if (itemCount <= 4) return "少";
  if (itemCount <= 10) return "中";
  return "満載";
}

function billingCategory(row: PalletSearchRow, itemCount: number): BillingCategory {
  if (row.current_status === "OUT") return "pallet_out";
  if (row.current_status && row.current_status !== "OUT") return "storage";
  if (row.part_no || itemCount > 0) return "part_related";
  return "unknown";
}

function buildBillingPalletRows(
  rows: PalletSearchRow[],
  billingMonth: string,
  unregisteredLocationKeys: Set<string>,
  locationStatusAvailable: boolean
): BillingPalletRow[] {
  const rowsByPallet = rows.reduce<Map<string, PalletSearchRow[]>>((map, row) => {
    const current = map.get(row.pallet_id) ?? [];
    current.push(row);
    map.set(row.pallet_id, current);
    return map;
  }, new Map<string, PalletSearchRow[]>());

  return Array.from(rowsByPallet.values())
    .map((palletRows) => {
      const first = palletRows[0];
      const itemCount = palletRows.filter((row) => row.part_no).length;
      const locationCode = first.current_location_code ?? "";
      const registeredStatus: LocationRegisteredStatus = !locationCode
        ? "unknown"
        : unregisteredLocationKeys.has(locationKey(first.warehouse_code, locationCode))
          ? "unregistered"
          : locationStatusAvailable
            ? "registered"
            : "unknown";
      const category = billingCategory(first, itemCount);

      return {
        pallet_id: first.pallet_id,
        billing_month: billingMonth,
        warehouse_code: first.warehouse_code,
        project_no: first.project_no ?? "",
        pallet_code: first.pallet_code,
        location_code: locationCode,
        location_registered_status: registeredStatus,
        current_status: first.current_status ?? "",
        load_status: loadStatus(itemCount, first.current_status),
        item_count: itemCount,
        part_no: uniqueJoined(palletRows.map((row) => row.part_no)),
        quantity: uniqueJoined(palletRows.map((row) => row.quantity)),
        quantity_unit: uniqueJoined(palletRows.map((row) => row.quantity_unit)),
        billing_category: category,
        storage_pallet_count: first.current_status === "OUT" ? 0 : 1,
        updated_at: first.updated_at ?? "",
      };
    })
    .sort((a, b) => {
      const projectCompare = a.project_no.localeCompare(b.project_no, "ja");
      if (projectCompare !== 0) return projectCompare;
      return a.pallet_code.localeCompare(b.pallet_code, "ja");
    });
}

function buildProjectSummary(rows: BillingPalletRow[]): ProjectSummaryRow[] {
  const summary = rows.reduce<Map<string, ProjectSummaryRow>>((map, row) => {
    const key = row.project_no || "(未設定)";
    const current =
      map.get(key) ??
      ({
        project_no: key,
        pallet_count: 0,
        storage_count: 0,
        pallet_out_count: 0,
        part_related_count: 0,
      } satisfies ProjectSummaryRow);
    current.pallet_count += 1;
    current.storage_count += row.storage_pallet_count;
    if (row.current_status === "OUT") current.pallet_out_count += 1;
    if (row.part_no || row.item_count > 0) current.part_related_count += 1;
    map.set(key, current);
    return map;
  }, new Map<string, ProjectSummaryRow>());

  return Array.from(summary.values()).sort((a, b) => a.project_no.localeCompare(b.project_no, "ja"));
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

export function BillingCheckSection() {
  const [warehouseCode, setWarehouseCode] = useState("KOMATSU");
  const [projectNo, setProjectNo] = useState("");
  const [billingMonth] = useState(currentBillingMonth);
  const [rows, setRows] = useState<BillingPalletRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectSummaryRows = buildProjectSummary(rows);
  const projectNoKinds = new Set(rows.map((row) => row.project_no).filter(Boolean)).size;
  const storageCount = rows.reduce((sum, row) => sum + row.storage_pallet_count, 0);
  const outCount = rows.filter((row) => row.current_status === "OUT").length;
  const projectNoMissingCount = rows.filter((row) => !row.project_no).length;

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
      const [palletResult, locationResult] = await Promise.all([
        searchPallets({ warehouseCode: code, projectNo: project, status: "ALL" }),
        getUnregisteredWarehouseLocations(),
      ]);
      if (!palletResult.ok) {
        setRows([]);
        setError(palletResult.error);
        return;
      }
      const unregisteredKeys =
        locationResult.ok
          ? new Set(
              locationResult.locations.map((row) =>
                locationKey(row.warehouse_code, row.location_code)
              )
            )
          : new Set<string>();
      setRows(
        buildBillingPalletRows(
          palletResult.pallets,
          billingMonth,
          unregisteredKeys,
          locationResult.ok
        )
      );
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : "請求確認データの取得中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadCsv() {
    const header = [
      "billing_month",
      "warehouse_code",
      "project_no",
      "pallet_code",
      "location_code",
      "location_registered_status",
      "current_status",
      "load_status",
      "item_count",
      "part_no",
      "quantity",
      "quantity_unit",
      "billing_category",
      "storage_pallet_count",
      "updated_at",
    ];
    const csv = [
      header,
      ...rows.map((row) => [
        row.billing_month,
        row.warehouse_code,
        row.project_no,
        row.pallet_code,
        row.location_code,
        row.location_registered_status,
        row.current_status,
        row.load_status,
        row.item_count,
        row.part_no,
        row.quantity,
        row.quantity_unit,
        row.billing_category,
        row.storage_pallet_count,
        row.updated_at,
      ]),
    ]
      .map((line) => line.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFileName();
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section style={styles.panel}>
      <h2>請求確認</h2>
      <p>
        請求確定ではなく、project_no単位でパレット数・出庫種別・保管対象を確認するための画面です。
      </p>

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
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? "集計中..." : "請求確認データ取得"}
        </button>
        <button
          style={styles.secondaryButton}
          type="button"
          onClick={handleDownloadCsv}
          disabled={rows.length === 0}
        >
          請求確認CSV出力
        </button>
      </form>

      {error ? <div style={styles.error}>{error}</div> : null}

      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>請求月</div>
          <div style={styles.summaryValue}>{billingMonth}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>project_no種類数</div>
          <div style={styles.summaryValue}>{projectNoKinds}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>総パレット数</div>
          <div style={styles.summaryValue}>{rows.length}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>保管対象パレット数</div>
          <div style={styles.summaryValue}>{storageCount}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>出庫済パレット数</div>
          <div style={styles.summaryValue}>{outCount}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>project_no未設定件数</div>
          <div style={styles.summaryValue}>{projectNoMissingCount}</div>
        </div>
      </div>

      <h3>project_no別集計</h3>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>project_no</th>
              <th style={styles.th}>pallet_count</th>
              <th style={styles.th}>storage_count</th>
              <th style={styles.th}>pallet_out_count</th>
              <th style={styles.th}>part_related_count</th>
            </tr>
          </thead>
          <tbody>
            {projectSummaryRows.map((row) => (
              <tr key={row.project_no}>
                <td style={styles.td}>{displayValue(row.project_no)}</td>
                <td style={styles.td}>{row.pallet_count}</td>
                <td style={styles.td}>{row.storage_count}</td>
                <td style={styles.td}>{row.pallet_out_count}</td>
                <td style={styles.td}>{row.part_related_count}</td>
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

      <h3>パレット明細（CSV対象）</h3>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>project_no</th>
              <th style={styles.th}>pallet_code</th>
              <th style={styles.th}>location_code</th>
              <th style={styles.th}>current_status</th>
              <th style={styles.th}>load_status</th>
              <th style={styles.th}>item_count</th>
              <th style={styles.th}>billing_category</th>
              <th style={styles.th}>storage_pallet_count</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.pallet_id}>
                <td style={styles.td}>{displayValue(row.project_no)}</td>
                <td style={styles.td}>{row.pallet_code}</td>
                <td style={styles.td}>{displayValue(row.location_code)}</td>
                <td style={styles.td}>{displayValue(row.current_status)}</td>
                <td style={styles.td}>{row.load_status}</td>
                <td style={styles.td}>{row.item_count}</td>
                <td style={styles.td}>{row.billing_category}</td>
                <td style={styles.td}>{row.storage_pallet_count}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td style={styles.td} colSpan={8}>
                  パレット明細はありません。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
