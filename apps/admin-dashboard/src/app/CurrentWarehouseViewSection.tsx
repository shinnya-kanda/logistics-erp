"use client";

import { useState, type FormEvent } from "react";
import {
  getCurrentWarehouseView,
  type CurrentWarehouseItem,
  type CurrentWarehouseLocation,
} from "./palletSearchApi";

function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
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
  locationCard: {
    marginTop: "1rem",
    padding: "1rem",
    border: "1px solid #ddd",
    borderRadius: "12px",
    background: "#fafafa",
  },
  palletCard: {
    marginTop: "0.75rem",
    padding: "0.85rem",
    border: "1px solid #e0e0e0",
    borderRadius: "10px",
    background: "#fff",
  },
  tableWrap: {
    overflowX: "auto" as const,
    marginTop: "0.6rem",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.92rem",
  },
  th: {
    textAlign: "left" as const,
    borderBottom: "2px solid #ddd",
    padding: "0.5rem",
    whiteSpace: "nowrap" as const,
  },
  td: {
    borderBottom: "1px solid #eee",
    padding: "0.5rem",
    whiteSpace: "nowrap" as const,
  },
  warningRow: {
    background: "#fff8e1",
  },
  highRow: {
    background: "#fff3e0",
  },
  criticalRow: {
    background: "#ffebee",
  },
  warningCell: {
    color: "#b26a00",
    fontWeight: 700,
  },
  reviewCell: {
    color: "#b71c1c",
    fontWeight: 800,
  },
  badge: {
    display: "inline-block",
    padding: "0.2rem 0.45rem",
    borderRadius: "999px",
    fontSize: "0.78rem",
    fontWeight: 800,
  },
};

function countPallets(locations: CurrentWarehouseLocation[]): number {
  return locations.reduce((sum, location) => sum + location.pallets.length, 0);
}

function countQuantityDiffs(locations: CurrentWarehouseLocation[]): number {
  return locations.reduce(
    (locationSum, location) =>
      locationSum +
      location.pallets.reduce(
        (palletSum, pallet) =>
          palletSum +
          pallet.items.filter(
            (item) => typeof item.quantity_diff === "number" && item.quantity_diff !== 0
          ).length,
        0
      ),
    0
  );
}

function countReviewRequired(locations: CurrentWarehouseLocation[]): number {
  return locations.reduce(
    (locationSum, location) =>
      locationSum +
      location.pallets.reduce(
        (palletSum, pallet) =>
          palletSum + pallet.items.filter((item) => item.review_required).length,
        0
      ),
    0
  );
}

function formatQuantityDiff(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  if (value > 0) return `+${value}`;
  return String(value);
}

function severityLabel(severity: CurrentWarehouseItem["difference_severity"]): string {
  return `[${severity.toUpperCase()}]`;
}

function severityStyle(severity: CurrentWarehouseItem["difference_severity"]) {
  if (severity === "critical") {
    return { ...styles.badge, background: "#c62828", color: "#fff" };
  }
  if (severity === "high") {
    return { ...styles.badge, background: "#ef6c00", color: "#fff" };
  }
  if (severity === "warning") {
    return { ...styles.badge, background: "#fff8e1", color: "#8a5a00" };
  }
  return { ...styles.badge, background: "#e8f5e9", color: "#2e7d32" };
}

function reviewRowStyle(item: CurrentWarehouseItem) {
  if (item.difference_severity === "critical") return styles.criticalRow;
  if (item.difference_severity === "high") return styles.highRow;
  if (item.difference_severity === "warning") return styles.warningRow;
  return undefined;
}

export function CurrentWarehouseViewSection() {
  const [locationCode, setLocationCode] = useState("");
  const [palletCode, setPalletCode] = useState("");
  const [partNo, setPartNo] = useState("");
  const [projectNo, setProjectNo] = useState("");
  const [locations, setLocations] = useState<CurrentWarehouseLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const result = await getCurrentWarehouseView({
        locationCode,
        palletCode,
        partNo,
        projectNo,
      });
      if (!result.ok) {
        setLocations([]);
        setError(result.error);
        return;
      }

      setLocations(result.locations);
    } catch (err) {
      setLocations([]);
      setError(
        err instanceof Error
          ? err.message
          : "現在保管状態データの取得中にエラーが発生しました。"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={styles.panel}>
      <h2 style={{ marginTop: 0 }}>現在保管状態</h2>
      <p>
        この画面は `pallet_units` + `pallet_item_links` の現在保管状態 read model です。
      </p>
      <p>
        source of truth は `inventory_transactions` です。`inventory_current` は部品現在庫
        projection であり、source of truth ではありません。
      </p>
      <p>
        数量差異がある場合は、この画面で修正せず `inventory_transactions` との照合が必要です。
      </p>
      <p>
        severity は compare-only 判定です。correction / recovery は自動実行せず、source of
        truth の確認が必要です。
      </p>

      <form onSubmit={(event) => void handleSubmit(event)} style={styles.form}>
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
          <span>pallet_code</span>
          <input
            value={palletCode}
            onChange={(event) => setPalletCode(event.target.value)}
            style={styles.input}
            autoComplete="off"
          />
        </label>
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
          <span>project_no</span>
          <input
            value={projectNo}
            onChange={(event) => setProjectNo(event.target.value)}
            style={styles.input}
            autoComplete="off"
          />
        </label>
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "検索中..." : "現在保管状態検索"}
        </button>
      </form>

      {error ? <div style={styles.error}>{error}</div> : null}

      {searched ? (
        <div style={styles.summary}>
          棚数: {locations.length} / PL数: {countPallets(locations)} / 数量差異:{" "}
          {countQuantityDiffs(locations)} / 要確認: {countReviewRequired(locations)}
        </div>
      ) : null}

      {searched && locations.length === 0 && !error ? (
        <p style={{ color: "#555" }}>該当する現在保管状態はありません。</p>
      ) : null}

      {locations.map((location) => (
        <section
          key={location.location_code ?? "__no_location__"}
          style={styles.locationCard}
        >
          <h3 style={{ marginTop: 0 }}>
            棚番: {displayValue(location.location_code)}
          </h3>
          {location.pallets.map((pallet) => (
            <div key={pallet.pallet_id} style={styles.palletCard}>
              <h4 style={{ margin: "0 0 0.25rem" }}>
                PL: {pallet.pallet_code}
              </h4>
              <div style={{ color: "#555" }}>
                project_no: {displayValue(pallet.project_no)} / status:{" "}
                {displayValue(pallet.current_status)}
              </div>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>part_no</th>
                      <th style={styles.th}>part_name</th>
                      <th style={styles.th}>quantity</th>
                      <th style={styles.th}>unit</th>
                      <th style={styles.th}>inventory_type</th>
                      <th style={styles.th}>project_no</th>
                      <th style={styles.th}>現在保管状態</th>
                      <th style={styles.th}>inventory_current</th>
                      <th style={styles.th}>差異</th>
                      <th style={styles.th}>severity</th>
                      <th style={styles.th}>reason</th>
                      <th style={styles.th}>review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pallet.items.map((item, index) => {
                      const hasDiff =
                        typeof item.quantity_diff === "number" && item.quantity_diff !== 0;
                      const diffStyle = hasDiff
                        ? { ...styles.td, ...styles.warningCell }
                        : styles.td;
                      const reviewStyle = item.review_required
                        ? { ...styles.td, ...styles.reviewCell }
                        : styles.td;

                      return (
                        <tr
                          key={`${pallet.pallet_id}:${item.part_no ?? "empty"}:${index}`}
                          style={reviewRowStyle(item)}
                        >
                          <td style={styles.td}>{displayValue(item.part_no)}</td>
                          <td style={styles.td}>{displayValue(item.part_name)}</td>
                          <td style={styles.td}>{displayValue(item.quantity)}</td>
                          <td style={styles.td}>{displayValue(item.quantity_unit)}</td>
                          <td style={styles.td}>{displayValue(item.inventory_type)}</td>
                          <td style={styles.td}>{displayValue(item.project_no)}</td>
                          <td style={styles.td}>{displayValue(item.pallet_item_quantity)}</td>
                          <td style={styles.td}>
                            {displayValue(item.inventory_current_quantity)}
                          </td>
                          <td style={diffStyle}>{formatQuantityDiff(item.quantity_diff)}</td>
                          <td style={styles.td}>
                            <span style={severityStyle(item.difference_severity)}>
                              {severityLabel(item.difference_severity)}
                            </span>
                          </td>
                          <td style={styles.td}>
                            {item.difference_reason_codes.length > 0
                              ? item.difference_reason_codes.join(", ")
                              : "-"}
                          </td>
                          <td style={reviewStyle}>
                            {item.review_required ? "要確認" : "通常"}
                          </td>
                        </tr>
                      );
                    })}
                    {pallet.items.length === 0 ? (
                      <tr>
                        <td style={styles.td} colSpan={12}>
                          このPLに紐づく品番はありません。
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      ))}
    </section>
  );
}
