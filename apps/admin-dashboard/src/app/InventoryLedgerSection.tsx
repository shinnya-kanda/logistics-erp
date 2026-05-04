"use client";

import { useState, type FormEvent } from "react";
import {
  getUnregisteredWarehouseLocations,
  searchInventory,
  type PalletSearchRow,
} from "./palletSearchApi";

type LedgerRow = {
  pallet_id: string;
  warehouse_code: string;
  project_no: string;
  pallet_code: string;
  location_code: string;
  location_registered_status: "登録済" | "未登録";
  current_status: string;
  load_status: string;
  item_count: number;
  part_no: string;
  quantity: string;
  quantity_unit: string;
  storage_flag: 0 | 1;
  shipped_flag: 0 | 1;
  updated_at: string;
};

function dateInputValue(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

function firstDayOfCurrentMonth(date = new Date()): string {
  return dateInputValue(new Date(date.getFullYear(), date.getMonth(), 1));
}

function compactDate(value: string): string {
  return value.replace(/-/g, "");
}

function csvFileName(startDate: string, endDate: string): string {
  return `pallet_inventory_ledger_${compactDate(startDate)}_${compactDate(endDate)}.csv`;
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

function buildLedgerRows(
  rows: PalletSearchRow[],
  unregisteredLocationKeys: Set<string>
): LedgerRow[] {
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
      const isUnregistered =
        !locationCode ||
        unregisteredLocationKeys.has(locationKey(first.warehouse_code, locationCode));
      const shipped = first.current_status === "OUT";

      return {
        pallet_id: first.pallet_id,
        warehouse_code: first.warehouse_code,
        project_no: first.project_no ?? "",
        pallet_code: first.pallet_code,
        location_code: locationCode,
        location_registered_status: isUnregistered ? "未登録" : "登録済",
        current_status: first.current_status ?? "",
        load_status: loadStatus(itemCount, first.current_status),
        item_count: itemCount,
        part_no: uniqueJoined(palletRows.map((row) => row.part_no)),
        quantity: uniqueJoined(palletRows.map((row) => row.quantity)),
        quantity_unit: uniqueJoined(palletRows.map((row) => row.quantity_unit)),
        storage_flag: shipped ? 0 : 1,
        shipped_flag: shipped ? 1 : 0,
        updated_at: first.updated_at ?? "",
      } satisfies LedgerRow;
    })
    .sort((a, b) => {
      const warehouseCompare = a.warehouse_code.localeCompare(b.warehouse_code, "ja");
      if (warehouseCompare !== 0) return warehouseCompare;
      const projectCompare = a.project_no.localeCompare(b.project_no, "ja");
      if (projectCompare !== 0) return projectCompare;
      const locationCompare = a.location_code.localeCompare(b.location_code, "ja");
      if (locationCompare !== 0) return locationCompare;
      return a.pallet_code.localeCompare(b.pallet_code, "ja");
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

export function InventoryLedgerSection() {
  const [warehouseCode, setWarehouseCode] = useState("KOMATSU");
  const [projectNo, setProjectNo] = useState("");
  const [aggregationStartDate, setAggregationStartDate] = useState(firstDayOfCurrentMonth);
  const [aggregationEndDate, setAggregationEndDate] = useState(dateInputValue);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storageCount = rows.filter((row) => row.storage_flag === 1).length;
  const shippedCount = rows.filter((row) => row.shipped_flag === 1).length;
  const projectNoMissingCount = rows.filter((row) => !row.project_no).length;
  const unregisteredLocationCount = rows.filter(
    (row) => row.location_registered_status === "未登録"
  ).length;

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
        searchInventory({ projectNo: project, status: "ALL" }),
        getUnregisteredWarehouseLocations(),
      ]);
      if (!palletResult.ok) {
        setRows([]);
        setError(palletResult.error);
        return;
      }
      if (!locationResult.ok) {
        setRows([]);
        setError(locationResult.error);
        return;
      }

      const unregisteredKeys = new Set(
        locationResult.locations.map((row) =>
          locationKey(row.warehouse_code, row.location_code)
        )
      );
      setRows(buildLedgerRows(palletResult.pallets, unregisteredKeys));
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : "在庫台帳データの取得中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadCsv() {
    const header = [
      "aggregation_start_date",
      "aggregation_end_date",
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
      "storage_flag",
      "shipped_flag",
      "updated_at",
    ];
    const csv = [
      header,
      ...rows.map((row) => [
        aggregationStartDate,
        aggregationEndDate,
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
        row.storage_flag,
        row.shipped_flag,
        row.updated_at,
      ]),
    ]
      .map((line) => line.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFileName(aggregationStartDate, aggregationEndDate);
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section style={styles.panel}>
      <h2>在庫台帳</h2>
      <p>社内確認・棚管理・在庫台帳用に、現在のパレット在庫状態をCSV出力します。</p>
      <p>現在は履歴期間集計ではなく、指定期間情報付きの現在在庫台帳です</p>

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
          <span>集計開始日</span>
          <input
            style={styles.input}
            type="date"
            value={aggregationStartDate}
            onChange={(e) => setAggregationStartDate(e.target.value)}
          />
        </label>
        <label style={styles.field}>
          <span>集計終了日</span>
          <input
            style={styles.input}
            type="date"
            value={aggregationEndDate}
            onChange={(e) => setAggregationEndDate(e.target.value)}
          />
        </label>
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? "取得中..." : "在庫台帳データ取得"}
        </button>
        <button
          style={styles.secondaryButton}
          type="button"
          onClick={handleDownloadCsv}
          disabled={rows.length === 0}
        >
          在庫台帳CSV出力
        </button>
      </form>

      {error ? <div style={styles.error}>{error}</div> : null}

      <p>
        <strong>集計期間：</strong>
        {aggregationStartDate} 〜 {aggregationEndDate}
      </p>

      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>総パレット数</div>
          <div style={styles.summaryValue}>{rows.length}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>保管中パレット数</div>
          <div style={styles.summaryValue}>{storageCount}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>出庫済パレット数</div>
          <div style={styles.summaryValue}>{shippedCount}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>project_no未設定数</div>
          <div style={styles.summaryValue}>{projectNoMissingCount}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>未登録棚番数</div>
          <div style={styles.summaryValue}>{unregisteredLocationCount}</div>
        </div>
      </div>

      <h3>パレット在庫明細（CSV対象）</h3>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>warehouse_code</th>
              <th style={styles.th}>project_no</th>
              <th style={styles.th}>pallet_code</th>
              <th style={styles.th}>location_code</th>
              <th style={styles.th}>location_registered_status</th>
              <th style={styles.th}>current_status</th>
              <th style={styles.th}>load_status</th>
              <th style={styles.th}>item_count</th>
              <th style={styles.th}>storage_flag</th>
              <th style={styles.th}>shipped_flag</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.pallet_id}>
                <td style={styles.td}>{row.warehouse_code}</td>
                <td style={styles.td}>{displayValue(row.project_no)}</td>
                <td style={styles.td}>{row.pallet_code}</td>
                <td style={styles.td}>{displayValue(row.location_code)}</td>
                <td style={styles.td}>{row.location_registered_status}</td>
                <td style={styles.td}>{displayValue(row.current_status)}</td>
                <td style={styles.td}>{row.load_status}</td>
                <td style={styles.td}>{row.item_count}</td>
                <td style={styles.td}>{row.storage_flag}</td>
                <td style={styles.td}>{row.shipped_flag}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td style={styles.td} colSpan={10}>
                  パレット在庫明細はありません。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
