"use client";

import { useState, type FormEvent } from "react";
import {
  getCurrentWarehouseView,
  type CurrentWarehouseItem,
  type CurrentWarehouseLocation,
} from "./palletSearchApi";

type DifferenceSeverity = CurrentWarehouseItem["difference_severity"];

type CompareDashboardRow = {
  location_code: string | null;
  pallet_code: string;
  pallet_project_no: string | null;
  item: CurrentWarehouseItem;
};

type AgingBucket = "today" | "1-3 days" | "4-7 days" | "over 7 days" | "unknown";
type ReviewStatus = "pending" | "reviewing" | "on_hold" | "reviewed";
type HotspotDimension = "location" | "project" | "part";
type HotspotRow = {
  key: string;
  total_count: number;
  critical_count: number;
  high_count: number;
  review_required_count: number;
};

const severityOrder: DifferenceSeverity[] = ["critical", "high", "warning", "info"];
const agingOrder: AgingBucket[] = ["today", "1-3 days", "4-7 days", "over 7 days"];
const reviewStatusOrder: ReviewStatus[] = ["pending", "reviewing", "on_hold", "reviewed"];

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
  comparePanel: {
    marginTop: "1rem",
    padding: "1rem",
    border: "1px solid #ddd",
    borderRadius: "12px",
    background: "#fafafa",
  },
  compareLead: {
    color: "#555",
    lineHeight: 1.6,
  },
  severityGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))",
    gap: "0.75rem",
    marginTop: "0.8rem",
  },
  severityCard: {
    padding: "0.8rem",
    border: "1px solid #ddd",
    borderRadius: "12px",
    background: "#fff",
  },
  severityCount: {
    display: "block",
    marginTop: "0.35rem",
    fontSize: "1.6rem",
    fontWeight: 900,
  },
  reviewCard: {
    borderColor: "#c62828",
    background: "#ffebee",
    color: "#b71c1c",
  },
  reviewWorkflowCard: {
    padding: "0.75rem",
    border: "1px solid #ddd",
    borderRadius: "12px",
    background: "#fff",
  },
  hotspotGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))",
    gap: "0.85rem",
    marginTop: "0.8rem",
  },
  hotspotCard: {
    padding: "0.85rem",
    border: "1px solid #ddd",
    borderRadius: "12px",
    background: "#fff",
  },
  hotspotCriticalRow: {
    background: "#ffebee",
  },
  reviewSelect: {
    padding: "0.4rem 0.5rem",
    border: "1px solid #bbb",
    borderRadius: "8px",
    background: "#fff",
    fontWeight: 700,
  },
  agingCard: {
    padding: "0.75rem",
    border: "1px solid #ddd",
    borderRadius: "12px",
    background: "#fff",
  },
  oldAgingCard: {
    borderColor: "#ef6c00",
    background: "#fff3e0",
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

function collectCompareRows(locations: CurrentWarehouseLocation[]): CompareDashboardRow[] {
  return locations.flatMap((location) =>
    location.pallets.flatMap((pallet) =>
      pallet.items.map((item) => ({
        location_code: location.location_code,
        pallet_code: pallet.pallet_code,
        pallet_project_no: pallet.project_no,
        item,
      }))
    )
  );
}

function severityCounts(rows: CompareDashboardRow[]): Record<DifferenceSeverity, number> {
  return rows.reduce<Record<DifferenceSeverity, number>>(
    (counts, row) => {
      counts[row.item.difference_severity] += 1;
      return counts;
    },
    { info: 0, warning: 0, high: 0, critical: 0 }
  );
}

function severitySortValue(severity: DifferenceSeverity): number {
  if (severity === "critical") return 0;
  if (severity === "high") return 1;
  if (severity === "warning") return 2;
  return 3;
}

function agingBucket(updatedAt: string | null | undefined): AgingBucket {
  if (!updatedAt) return "unknown";
  const updatedAtMs = new Date(updatedAt).getTime();
  if (Number.isNaN(updatedAtMs)) return "unknown";

  const elapsedDays = Math.floor((Date.now() - updatedAtMs) / (24 * 60 * 60 * 1000));
  if (elapsedDays <= 0) return "today";
  if (elapsedDays <= 3) return "1-3 days";
  if (elapsedDays <= 7) return "4-7 days";
  return "over 7 days";
}

function agingSortValue(bucket: AgingBucket): number {
  if (bucket === "over 7 days") return 0;
  if (bucket === "4-7 days") return 1;
  if (bucket === "1-3 days") return 2;
  if (bucket === "today") return 3;
  return 4;
}

function agingCounts(rows: CompareDashboardRow[]): Record<AgingBucket, number> {
  return rows.reduce<Record<AgingBucket, number>>(
    (counts, row) => {
      counts[agingBucket(row.item.updated_at)] += 1;
      return counts;
    },
    { today: 0, "1-3 days": 0, "4-7 days": 0, "over 7 days": 0, unknown: 0 }
  );
}

function compareRowKey(row: CompareDashboardRow): string {
  return [
    row.location_code ?? "",
    row.pallet_code,
    row.item.part_no ?? "",
    row.item.inventory_type ?? "",
    row.item.project_no ?? row.pallet_project_no ?? "",
    row.item.updated_at ?? "",
  ].join("\u001f");
}

function reviewStatusLabel(status: ReviewStatus): string {
  if (status === "pending") return "pending";
  if (status === "reviewing") return "reviewing";
  if (status === "on_hold") return "on_hold";
  return "reviewed";
}

function reviewStatusCounts(
  rows: CompareDashboardRow[],
  statuses: Record<string, ReviewStatus>
): Record<ReviewStatus, number> {
  return rows.reduce<Record<ReviewStatus, number>>(
    (counts, row) => {
      const status = statuses[compareRowKey(row)] ?? "pending";
      counts[status] += 1;
      return counts;
    },
    { pending: 0, reviewing: 0, on_hold: 0, reviewed: 0 }
  );
}

function reviewStatusStyle(status: ReviewStatus) {
  if (status === "pending") {
    return { ...styles.badge, background: "#ffebee", color: "#b71c1c" };
  }
  if (status === "reviewing") {
    return { ...styles.badge, background: "#e3f2fd", color: "#0d47a1" };
  }
  if (status === "on_hold") {
    return { ...styles.badge, background: "#fff8e1", color: "#8a5a00" };
  }
  return { ...styles.badge, background: "#e8f5e9", color: "#2e7d32" };
}

function hotspotKey(row: CompareDashboardRow, dimension: HotspotDimension): string {
  if (dimension === "location") return row.location_code || "location未設定";
  if (dimension === "project") {
    return row.item.project_no || row.pallet_project_no || "project_no未設定";
  }
  return row.item.part_no || "part_no未設定";
}

function buildHotspots(
  rows: CompareDashboardRow[],
  dimension: HotspotDimension
): HotspotRow[] {
  const hotspots = new Map<string, HotspotRow>();

  for (const row of rows) {
    const key = hotspotKey(row, dimension);
    const current =
      hotspots.get(key) ??
      {
        key,
        total_count: 0,
        critical_count: 0,
        high_count: 0,
        review_required_count: 0,
      };

    current.total_count += 1;
    if (row.item.difference_severity === "critical") current.critical_count += 1;
    if (row.item.difference_severity === "high") current.high_count += 1;
    if (row.item.review_required) current.review_required_count += 1;
    hotspots.set(key, current);
  }

  return Array.from(hotspots.values())
    .sort(
      (a, b) =>
        b.critical_count - a.critical_count ||
        b.review_required_count - a.review_required_count ||
        b.high_count - a.high_count ||
        b.total_count - a.total_count ||
        a.key.localeCompare(b.key, "ja")
    )
    .slice(0, 5);
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

function severityCardStyle(severity: DifferenceSeverity) {
  if (severity === "critical") {
    return { ...styles.severityCard, borderColor: "#c62828", background: "#ffebee" };
  }
  if (severity === "high") {
    return { ...styles.severityCard, borderColor: "#ef6c00", background: "#fff3e0" };
  }
  if (severity === "warning") {
    return { ...styles.severityCard, borderColor: "#f9a825", background: "#fffde7" };
  }
  return styles.severityCard;
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
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, ReviewStatus>>({});
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
      setReviewStatuses({});
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

  const compareRows = collectCompareRows(locations);
  const countsBySeverity = severityCounts(compareRows);
  const reviewRowsBase = compareRows.filter((row) => row.item.review_required);
  const countsByAging = agingCounts(reviewRowsBase);
  const countsByReviewStatus = reviewStatusCounts(reviewRowsBase, reviewStatuses);
  const locationHotspots = buildHotspots(reviewRowsBase, "location");
  const projectHotspots = buildHotspots(reviewRowsBase, "project");
  const partHotspots = buildHotspots(reviewRowsBase, "part");
  const reviewRows = compareRows
    .filter((row) => row.item.review_required)
    .sort(
      (a, b) =>
        severitySortValue(a.item.difference_severity) -
          severitySortValue(b.item.difference_severity) ||
        agingSortValue(agingBucket(a.item.updated_at)) -
          agingSortValue(agingBucket(b.item.updated_at))
    );

  function updateReviewStatus(row: CompareDashboardRow, status: ReviewStatus) {
    const key = compareRowKey(row);
    setReviewStatuses((current) => ({ ...current, [key]: status }));
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

      {searched && compareRows.length > 0 ? (
        <section style={styles.comparePanel}>
          <h3 style={{ marginTop: 0 }}>compare dashboard（差異確認）</h3>
          <p style={styles.compareLead}>
            `inventory_current` と `pallet_units + pallet_item_links` の compare-only 結果です。
            この画面は visibility / read-only 用途であり、自動修正・correction・rebuild・replay
            は行いません。review status は一時的な UI 表示であり、DB保存はまだ行いません。
          </p>

          <div style={styles.severityGrid}>
            {severityOrder.map((severity) => (
              <div key={severity} style={severityCardStyle(severity)}>
                <span style={severityStyle(severity)}>{severityLabel(severity)}</span>
                <span style={styles.severityCount}>{countsBySeverity[severity]}</span>
              </div>
            ))}
            <div style={{ ...styles.severityCard, ...styles.reviewCard }}>
              <strong>REVIEW REQUIRED</strong>
              <span style={styles.severityCount}>{reviewRows.length}</span>
            </div>
          </div>

          <h4>aging visibility</h4>
          <p style={styles.compareLead}>
            review_required の差異がどれくらい残っているかを updated_at から分類します。
            古い差異ほど優先確認の候補です。
          </p>
          <div style={styles.severityGrid}>
            {agingOrder.map((bucket) => (
              <div
                key={bucket}
                style={{
                  ...styles.agingCard,
                  ...(bucket === "4-7 days" || bucket === "over 7 days"
                    ? styles.oldAgingCard
                    : {}),
                }}
              >
                <strong>{bucket}</strong>
                <span style={styles.severityCount}>{countsByAging[bucket]}</span>
              </div>
            ))}
          </div>

          <h4>review workflow visibility</h4>
          <p style={styles.compareLead}>
            差異の確認状況を、pending / reviewing / on_hold / reviewed として一時的に整理します。
            これは確認状態の visibility であり、補正・再構築・自動同期の実行状態ではありません。
          </p>
          <div style={styles.severityGrid}>
            {reviewStatusOrder.map((status) => (
              <div key={status} style={styles.reviewWorkflowCard}>
                <span style={reviewStatusStyle(status)}>{reviewStatusLabel(status)}</span>
                <span style={styles.severityCount}>{countsByReviewStatus[status]}</span>
              </div>
            ))}
          </div>

          <h4>hotspot analytics</h4>
          <p style={styles.compareLead}>
            review_required の差異を location_code / project_no / part_no 別に集計します。
            analytics は read-only 集計表示のみで、correction・rebuild・replay には進みません。
          </p>
          <div style={styles.hotspotGrid}>
            {[
              { title: "location_code hotspot", rows: locationHotspots },
              { title: "project_no hotspot", rows: projectHotspots },
              { title: "part_no hotspot", rows: partHotspots },
            ].map((hotspot) => (
              <section key={hotspot.title} style={styles.hotspotCard}>
                <h5 style={{ margin: "0 0 0.5rem" }}>{hotspot.title}</h5>
                {hotspot.rows.length === 0 ? (
                  <p style={{ color: "#555" }}>review_required の差異はありません。</p>
                ) : (
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>key</th>
                          <th style={styles.th}>total</th>
                          <th style={styles.th}>critical</th>
                          <th style={styles.th}>high</th>
                          <th style={styles.th}>review</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hotspot.rows.map((row) => (
                          <tr
                            key={`${hotspot.title}:${row.key}`}
                            style={row.critical_count > 0 ? styles.hotspotCriticalRow : undefined}
                          >
                            <td style={styles.td}>{row.key}</td>
                            <td style={styles.td}>{row.total_count}</td>
                            <td
                              style={
                                row.critical_count > 0
                                  ? { ...styles.td, ...styles.reviewCell }
                                  : styles.td
                              }
                            >
                              {row.critical_count}
                            </td>
                            <td style={styles.td}>{row.high_count}</td>
                            <td style={styles.td}>{row.review_required_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}
          </div>

          <h4>確認すべき差異一覧</h4>
          {reviewRows.length === 0 ? (
            <p style={{ color: "#555" }}>
              review_required の差異はありません。差異なしまたは info のみです。
            </p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>severity</th>
                    <th style={styles.th}>location_code</th>
                    <th style={styles.th}>pallet_code</th>
                    <th style={styles.th}>part_no</th>
                    <th style={styles.th}>project_no</th>
                    <th style={styles.th}>pallet qty</th>
                    <th style={styles.th}>inventory_current</th>
                    <th style={styles.th}>quantity_diff</th>
                    <th style={styles.th}>updated_at</th>
                    <th style={styles.th}>aging</th>
                    <th style={styles.th}>review status</th>
                    <th style={styles.th}>reason code</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewRows.map((row, index) => {
                    const rowKey = compareRowKey(row);
                    const reviewStatus = reviewStatuses[rowKey] ?? "pending";

                    return (
                      <tr key={`${rowKey}:${index}`} style={reviewRowStyle(row.item)}>
                          <td style={styles.td}>
                            <span style={severityStyle(row.item.difference_severity)}>
                              {severityLabel(row.item.difference_severity)}
                            </span>
                          </td>
                          <td style={styles.td}>{displayValue(row.location_code)}</td>
                          <td style={styles.td}>{row.pallet_code}</td>
                          <td style={styles.td}>{displayValue(row.item.part_no)}</td>
                          <td style={styles.td}>
                            {displayValue(row.item.project_no ?? row.pallet_project_no)}
                          </td>
                          <td style={styles.td}>{displayValue(row.item.pallet_item_quantity)}</td>
                          <td style={styles.td}>
                            {displayValue(row.item.inventory_current_quantity)}
                          </td>
                          <td style={{ ...styles.td, ...styles.warningCell }}>
                            {formatQuantityDiff(row.item.quantity_diff)}
                          </td>
                          <td style={styles.td}>{formatDateTime(row.item.updated_at)}</td>
                          <td
                            style={
                              agingBucket(row.item.updated_at) === "over 7 days"
                                ? { ...styles.td, ...styles.warningCell }
                                : styles.td
                            }
                          >
                            {agingBucket(row.item.updated_at)}
                          </td>
                          <td style={styles.td}>
                            <select
                              value={reviewStatus}
                              onChange={(event) =>
                                updateReviewStatus(row, event.target.value as ReviewStatus)
                              }
                              style={styles.reviewSelect}
                              aria-label="review status"
                            >
                              {reviewStatusOrder.map((status) => (
                                <option key={status} value={status}>
                                  {reviewStatusLabel(status)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={styles.td}>
                            {row.item.difference_reason_codes.length > 0
                              ? row.item.difference_reason_codes.join(", ")
                              : "-"}
                          </td>
                        </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
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
