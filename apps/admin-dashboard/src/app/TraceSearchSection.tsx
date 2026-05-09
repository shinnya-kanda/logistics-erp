"use client";

import { useState, type FormEvent } from "react";
import { searchTraceEvents, type TraceEventRow } from "./palletSearchApi";

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

function eventLocation(event: TraceEventRow): string {
  const from = event.from_location_code;
  const to = event.to_location_code;
  if (from && to) return `${from} → ${to}`;
  return displayValue(event.location_code ?? from ?? to);
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
    minWidth: "24rem",
    maxWidth: "100%",
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
  sourceBadge: {
    display: "inline-block",
    padding: "0.2rem 0.45rem",
    borderRadius: "999px",
    background: "#eef5ff",
    color: "#0d47a1",
    fontSize: "0.8rem",
    fontWeight: 700,
  },
  traceText: {
    fontFamily: "monospace",
    wordBreak: "break-all" as const,
  },
};

export function TraceSearchSection() {
  const [traceId, setTraceId] = useState("");
  const [searchedTraceId, setSearchedTraceId] = useState<string | null>(null);
  const [events, setEvents] = useState<TraceEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTraceId = traceId.trim();
    if (!trimmedTraceId) {
      setError("trace_idを入力してください。");
      setEvents([]);
      setSearchedTraceId(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await searchTraceEvents(trimmedTraceId);
      if (!result.ok) {
        setError(result.error);
        setEvents([]);
        setSearchedTraceId(trimmedTraceId);
        return;
      }

      setEvents(result.events);
      setSearchedTraceId(result.trace_id);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={styles.panel}>
      <h2 style={{ marginTop: 0 }}>trace検索</h2>
      <p style={{ color: "#555" }}>
        trace_id をキーに、在庫・パレット・棚番履歴を横断して確認します。
      </p>

      <form onSubmit={(event) => void handleSubmit(event)} style={styles.form}>
        <label style={styles.field}>
          <span>trace_id</span>
          <input
            value={traceId}
            onChange={(event) => setTraceId(event.target.value)}
            placeholder="例: 69219155-2060-4606-879b-ddb33c2f6bc5"
            style={styles.input}
          />
        </label>
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "検索中..." : "検索"}
        </button>
      </form>

      {error ? <div style={styles.error}>{error}</div> : null}

      {searchedTraceId ? (
        <div style={styles.resultSummary}>
          <span>検索対象: <span style={styles.traceText}>{searchedTraceId}</span></span>
          <span style={styles.resultSummarySub}>イベント数: {events.length}件</span>
        </div>
      ) : null}

      {searchedTraceId && events.length === 0 && !error ? (
        <p style={{ color: "#555" }}>該当するイベントはありません。</p>
      ) : null}

      {events.length > 0 ? (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>source</th>
                <th style={styles.th}>event_type</th>
                <th style={styles.th}>warehouse_code</th>
                <th style={styles.th}>created_at</th>
                <th style={styles.th}>location</th>
                <th style={styles.th}>part_no</th>
                <th style={styles.th}>quantity</th>
                <th style={styles.th}>pallet_code</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, index) => (
                <tr key={`${event.source}:${event.id}:${index}`}>
                  <td style={styles.td}>
                    <span style={styles.sourceBadge}>{event.source}</span>
                  </td>
                  <td style={styles.td}>{displayValue(event.event_type)}</td>
                  <td style={styles.td}>{event.warehouse_code}</td>
                  <td style={styles.td}>{formatDateTime(event.created_at)}</td>
                  <td style={styles.td}>{eventLocation(event)}</td>
                  <td style={styles.td}>{displayValue(event.part_no)}</td>
                  <td style={styles.td}>
                    {event.quantity === null || event.quantity === undefined
                      ? "-"
                      : `${event.quantity}${event.quantity_unit ? ` ${event.quantity_unit}` : ""}`}
                  </td>
                  <td style={styles.td}>
                    {displayValue(event.pallet_code ?? event.pallet_id)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
