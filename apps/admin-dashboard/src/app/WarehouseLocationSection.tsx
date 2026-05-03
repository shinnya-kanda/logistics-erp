"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  createWarehouseLocation,
  getUnregisteredWarehouseLocations,
  searchWarehouseLocations,
  updateWarehouseLocationActive,
  type UnregisteredWarehouseLocationRow,
  type WarehouseLocationRow,
} from "./palletSearchApi";

type ActiveFilter = "ALL" | "ACTIVE" | "INACTIVE";

function formatUpdatedAt(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP");
}

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
  secondaryButton: {
    padding: "0.45rem 0.75rem",
    border: "1px solid #aaa",
    borderRadius: "8px",
    background: "#fff",
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
  success: {
    margin: "1rem 0",
    padding: "0.75rem",
    border: "1px solid #2e7d32",
    borderRadius: "8px",
    background: "#e8f5e9",
    color: "#1b5e20",
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
  inactiveRow: {
    background: "#f5f5f5",
    color: "#777",
  },
};

export function WarehouseLocationSection() {
  const [warehouseCode, setWarehouseCode] = useState("KOMATSU");
  const [locationCode, setLocationCode] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("ALL");
  const [newWarehouseCode, setNewWarehouseCode] = useState("KOMATSU");
  const [newLocationCode, setNewLocationCode] = useState("");
  const [newRemarks, setNewRemarks] = useState("");
  const [rows, setRows] = useState<WarehouseLocationRow[]>([]);
  const [unregisteredRows, setUnregisteredRows] = useState<UnregisteredWarehouseLocationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [unregisteredLoading, setUnregisteredLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadUnregisteredLocations() {
    setUnregisteredLoading(true);
    setError(null);
    try {
      const result = await getUnregisteredWarehouseLocations();
      if (!result.ok) {
        setUnregisteredRows([]);
        setError(result.error);
        return;
      }
      setUnregisteredRows(result.locations);
    } catch (err) {
      setUnregisteredRows([]);
      setError(err instanceof Error ? err.message : "未登録棚番の取得中にエラーが発生しました。");
    } finally {
      setUnregisteredLoading(false);
    }
  }

  useEffect(() => {
    void loadUnregisteredLocations();
  }, []);

  async function loadLocations() {
    setLoading(true);
    setError(null);
    try {
      const result = await searchWarehouseLocations({
        warehouseCode,
        locationCode,
        isActive: activeFilter,
      });
      if (!result.ok) {
        setRows([]);
        setError(result.error);
        return;
      }
      setRows(result.locations);
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : "棚番マスタ検索中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    await loadLocations();
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const code = newWarehouseCode.trim();
    const loc = newLocationCode.trim();
    if (!code) {
      setError("warehouse_code を入力してください。");
      return;
    }
    if (!loc) {
      setError("location_code を入力してください。");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await createWarehouseLocation({
        warehouseCode: code,
        locationCode: loc,
        remarks: newRemarks,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(result.created ? "棚番を登録しました。" : "既存の棚番を取得しました。");
      setNewLocationCode("");
      setNewRemarks("");
      await loadLocations();
      await loadUnregisteredLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "棚番登録中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(row: WarehouseLocationRow) {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await updateWarehouseLocationActive({
        id: row.id,
        isActive: !row.is_active,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRows((current) =>
        current.map((item) => (item.id === result.location.id ? result.location : item))
      );
      setMessage(`${row.location_code} を${result.location.is_active ? "有効" : "無効"}にしました。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "有効/無効の更新中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={styles.panel}>
      <h2>棚番マスタ</h2>
      <p>warehouse_locations を確認・登録・有効/無効管理します。物理削除は行いません。</p>

      <h3>検索</h3>
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
          <span>location_code</span>
          <input
            style={styles.input}
            value={locationCode}
            onChange={(e) => setLocationCode(e.target.value)}
            autoComplete="off"
          />
        </label>
        <label style={styles.field}>
          <span>is_active</span>
          <select
            style={styles.input}
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
          >
            <option value="ALL">全て</option>
            <option value="ACTIVE">有効</option>
            <option value="INACTIVE">無効</option>
          </select>
        </label>
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? "検索中..." : "検索"}
        </button>
      </form>

      <h3>新規登録</h3>
      <form style={styles.form} onSubmit={handleCreate}>
        <label style={styles.field}>
          <span>warehouse_code *</span>
          <input
            style={styles.input}
            value={newWarehouseCode}
            onChange={(e) => setNewWarehouseCode(e.target.value)}
            autoComplete="off"
          />
        </label>
        <label style={styles.field}>
          <span>location_code *</span>
          <input
            style={styles.input}
            value={newLocationCode}
            onChange={(e) => setNewLocationCode(e.target.value)}
            autoComplete="off"
          />
        </label>
        <label style={styles.field}>
          <span>remarks</span>
          <input
            style={styles.input}
            value={newRemarks}
            onChange={(e) => setNewRemarks(e.target.value)}
            autoComplete="off"
          />
        </label>
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? "登録中..." : "棚番を登録"}
        </button>
      </form>

      {error ? <div style={styles.error}>{error}</div> : null}
      {message ? <div style={styles.success}>{message}</div> : null}

      <p>検索結果：{rows.length}件</p>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>warehouse_code</th>
              <th style={styles.th}>location_code</th>
              <th style={styles.th}>is_active</th>
              <th style={styles.th}>remarks</th>
              <th style={styles.th}>updated_at</th>
              <th style={styles.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} style={row.is_active ? undefined : styles.inactiveRow}>
                <td style={styles.td}>{row.warehouse_code}</td>
                <td style={styles.td}>{row.location_code}</td>
                <td style={styles.td}>{row.is_active ? "有効" : "無効"}</td>
                <td style={styles.td}>{displayValue(row.remarks)}</td>
                <td style={styles.td}>{formatUpdatedAt(row.updated_at)}</td>
                <td style={styles.td}>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => void handleToggle(row)}
                    disabled={loading}
                  >
                    {row.is_active ? "無効にする" : "有効にする"}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td style={styles.td} colSpan={6}>
                  検索結果はありません。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <h3>未登録棚番一覧</h3>
      <p>
        パレットで使われている現在棚番のうち、warehouse_locations に未登録の棚番を表示します。
      </p>
      <button
        type="button"
        style={styles.secondaryButton}
        onClick={() => void loadUnregisteredLocations()}
        disabled={unregisteredLoading}
      >
        {unregisteredLoading ? "取得中..." : "未登録棚番を再読み込み"}
      </button>
      <p>未登録棚番：{unregisteredRows.length}件</p>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>warehouse_code</th>
              <th style={styles.th}>location_code</th>
              <th style={styles.th}>usage_count</th>
              <th style={styles.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {unregisteredRows.map((row) => (
              <tr key={`${row.warehouse_code}:${row.location_code}`}>
                <td style={styles.td}>{row.warehouse_code}</td>
                <td style={styles.td}>{row.location_code}</td>
                <td style={styles.td}>{row.usage_count}</td>
                <td style={styles.td}>
                  <button type="button" style={styles.secondaryButton} disabled>
                    登録（今後）
                  </button>
                </td>
              </tr>
            ))}
            {unregisteredRows.length === 0 ? (
              <tr>
                <td style={styles.td} colSpan={4}>
                  未登録棚番はありません。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
