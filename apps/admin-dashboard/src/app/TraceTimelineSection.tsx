"use client";

import { useMemo, useState, type FormEvent } from "react";
import { searchTraceEvents, type TraceEventRow } from "./palletSearchApi";

type RequestEventGroup = {
  requestId: string | null;
  events: TraceEventRow[];
  sources: TraceEventRow["source"][];
  flowLabels: string[];
  startedAt: string | null;
  endedAt: string | null;
};

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

function eventTimeValue(event: TraceEventRow): string | null {
  return event.created_at ?? event.event_at ?? null;
}

function eventLocation(event: TraceEventRow): string {
  const from = event.from_location_code;
  const to = event.to_location_code;
  if (from && to) return `${from} -> ${to}`;
  return displayValue(event.location_code ?? from ?? to);
}

function eventRequestId(event: TraceEventRow): string | null {
  if (
    event.source !== "inventory_transactions" &&
    event.source !== "pallet_transactions"
  ) {
    return null;
  }
  if (event.request_id) return event.request_id;

  const requestId = event.data?.request_id;
  return typeof requestId === "string" && requestId.trim() ? requestId : null;
}

function sourceLabel(source: TraceEventRow["source"]): string {
  if (source === "inventory_transactions") return "inventory";
  if (source === "pallet_transactions") return "pallet";
  return "warehouse location";
}

function sourceColor(source: TraceEventRow["source"]) {
  if (source === "inventory_transactions") {
    return { background: "#e8f5e9", color: "#1b5e20", borderColor: "#a5d6a7" };
  }
  if (source === "pallet_transactions") {
    return { background: "#e3f2fd", color: "#0d47a1", borderColor: "#90caf9" };
  }
  return { background: "#fff8e1", color: "#8a5a00", borderColor: "#ffe082" };
}

function eventFlowLabel(event: TraceEventRow): string {
  const type = event.event_type?.trim() || "unknown";
  if (event.source === "inventory_transactions") return `inventory:${type}`;
  if (event.source === "pallet_transactions") return `pallet:${type}`;
  return `location:${type}`;
}

function sortEventsByTime(events: TraceEventRow[]): TraceEventRow[] {
  return [...events].sort((a, b) => {
    const aTime = eventTimeValue(a);
    const bTime = eventTimeValue(b);
    const aMs = aTime ? new Date(aTime).getTime() : Number.POSITIVE_INFINITY;
    const bMs = bTime ? new Date(bTime).getTime() : Number.POSITIVE_INFINITY;

    if (Number.isNaN(aMs) && Number.isNaN(bMs)) return 0;
    if (Number.isNaN(aMs)) return 1;
    if (Number.isNaN(bMs)) return -1;
    return aMs - bMs;
  });
}

function uniqueSources(events: TraceEventRow[]): TraceEventRow["source"][] {
  return Array.from(new Set(events.map((event) => event.source)));
}

function groupEventsByRequest(events: TraceEventRow[]): RequestEventGroup[] {
  const groupsByRequest = new Map<string, TraceEventRow[]>();

  for (const event of events) {
    const requestId = eventRequestId(event);
    const key = requestId ?? "__no_request_id__";
    const groupEvents = groupsByRequest.get(key) ?? [];
    groupEvents.push(event);
    groupsByRequest.set(key, groupEvents);
  }

  return Array.from(groupsByRequest.entries()).map(([key, groupEvents]) => {
    const sortedGroupEvents = sortEventsByTime(groupEvents);
    const firstEvent = sortedGroupEvents[0];
    const lastEvent = sortedGroupEvents[sortedGroupEvents.length - 1];

    return {
      requestId: key === "__no_request_id__" ? null : key,
      events: sortedGroupEvents,
      sources: uniqueSources(sortedGroupEvents),
      flowLabels: sortedGroupEvents.map(eventFlowLabel),
      startedAt: firstEvent ? eventTimeValue(firstEvent) : null,
      endedAt: lastEvent ? eventTimeValue(lastEvent) : null,
    };
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
    margin: "1rem 0",
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
  notice: {
    margin: "1rem 0",
    padding: "0.8rem 0.9rem",
    borderRadius: "10px",
    background: "#f5f7fb",
    color: "#333",
  },
  summary: {
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
  relationSection: {
    marginTop: "1rem",
    padding: "1rem",
    border: "1px solid #ddd",
    borderRadius: "12px",
    background: "#fafafa",
  },
  relationGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))",
    gap: "0.85rem",
    marginTop: "0.75rem",
  },
  relationCard: {
    padding: "0.85rem",
    border: "1px solid #ddd",
    borderRadius: "12px",
    background: "#fff",
  },
  relationHeader: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.45rem 0.65rem",
    alignItems: "center",
    marginBottom: "0.6rem",
  },
  flowLine: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.35rem",
    alignItems: "center",
    marginTop: "0.5rem",
  },
  flowNode: {
    display: "inline-block",
    padding: "0.25rem 0.45rem",
    borderRadius: "8px",
    background: "#f5f7fb",
    fontSize: "0.82rem",
    fontWeight: 700,
  },
  flowArrow: {
    color: "#777",
    fontWeight: 800,
  },
  timeline: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.85rem",
    marginTop: "1rem",
  },
  eventCard: {
    padding: "0.95rem",
    border: "1px solid #ddd",
    borderRadius: "12px",
    background: "#fff",
  },
  eventHeader: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.5rem 0.75rem",
    alignItems: "center",
    marginBottom: "0.65rem",
  },
  sourceBadge: {
    display: "inline-block",
    padding: "0.22rem 0.5rem",
    border: "1px solid",
    borderRadius: "999px",
    fontSize: "0.8rem",
    fontWeight: 800,
  },
  eventType: {
    fontWeight: 800,
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
    gap: "0.45rem 0.8rem",
  },
  metaItem: {
    minWidth: 0,
  },
  metaLabel: {
    display: "block",
    color: "#555",
    fontSize: "0.78rem",
    fontWeight: 700,
  },
  mono: {
    fontFamily: "monospace",
    wordBreak: "break-all" as const,
  },
};

export function TraceTimelineSection() {
  const [traceId, setTraceId] = useState("");
  const [searchedTraceId, setSearchedTraceId] = useState<string | null>(null);
  const [events, setEvents] = useState<TraceEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedEvents = useMemo(() => sortEventsByTime(events), [events]);
  const requestGroups = useMemo(() => groupEventsByRequest(sortedEvents), [sortedEvents]);

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
      <h2 style={{ marginTop: 0 }}>trace timeline</h2>
      <p>
        trace_id 単位で、inventory / pallet / warehouse location history の履歴を時系列に確認します。
      </p>
      <div style={styles.notice}>
        timeline は参照専用であり、修正・再構築・自動同期は行いません。compare-only /
        visibility 目的の画面です。relation grouping も参照専用で、correction / replay /
        rebuild は行いません。
      </div>

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
          {loading ? "検索中..." : "timeline表示"}
        </button>
      </form>

      {error ? <div style={styles.error}>{error}</div> : null}

      {searchedTraceId ? (
        <div style={styles.summary}>
          <span>
            trace_id: <span style={styles.mono}>{searchedTraceId}</span>
          </span>
          <span>イベント数: {sortedEvents.length}件</span>
          <span>request group: {requestGroups.length}件</span>
        </div>
      ) : null}

      {searchedTraceId && sortedEvents.length === 0 && !error ? (
        <p style={{ color: "#555" }}>該当する timeline event はありません。</p>
      ) : null}

      {requestGroups.length > 0 ? (
        <section style={styles.relationSection}>
          <h3 style={{ marginTop: 0 }}>trace relation</h3>
          <p style={{ color: "#555", marginTop: 0 }}>
            request_id 単位で関連イベントをまとめ、inventory / pallet / warehouse location
            history の出所と flow を確認します。
          </p>
          <div style={styles.relationGrid}>
            {requestGroups.map((group, groupIndex) => (
              <article
                key={`${group.requestId ?? "no-request"}:${groupIndex}`}
                style={styles.relationCard}
              >
                <div style={styles.relationHeader}>
                  <strong>request</strong>
                  <span style={styles.mono}>{displayValue(group.requestId)}</span>
                  <span style={{ color: "#555" }}>{group.events.length} events</span>
                </div>

                <div style={{ marginBottom: "0.55rem" }}>
                  {group.sources.map((source) => (
                    <span
                      key={source}
                      style={{ ...styles.sourceBadge, ...sourceColor(source), marginRight: "0.35rem" }}
                    >
                      {sourceLabel(source)}
                    </span>
                  ))}
                </div>

                <div style={styles.metaGrid}>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>started_at</span>
                    <span>{formatDateTime(group.startedAt)}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>ended_at</span>
                    <span>{formatDateTime(group.endedAt)}</span>
                  </div>
                </div>

                <div style={styles.flowLine} aria-label="event flow">
                  {group.flowLabels.map((label, index) => (
                    <span key={`${label}:${index}`} style={{ display: "inline-flex", gap: "0.35rem" }}>
                      {index > 0 ? <span style={styles.flowArrow}>-&gt;</span> : null}
                      <span style={styles.flowNode}>{label}</span>
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {sortedEvents.length > 0 ? (
        <div style={styles.timeline}>
          {sortedEvents.map((event, index) => {
            const sourceStyle = sourceColor(event.source);
            const requestId = eventRequestId(event);

            return (
              <article key={`${event.source}:${event.id}:${index}`} style={styles.eventCard}>
                <div style={styles.eventHeader}>
                  <span style={{ ...styles.sourceBadge, ...sourceStyle }}>
                    {sourceLabel(event.source)}
                  </span>
                  <span style={styles.eventType}>{displayValue(event.event_type)}</span>
                  <span style={{ color: "#555" }}>{formatDateTime(eventTimeValue(event))}</span>
                </div>

                <div style={styles.metaGrid}>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>event source</span>
                    <span>{event.source}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>created_at</span>
                    <span>{formatDateTime(event.created_at)}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>trace_id</span>
                    <span style={styles.mono}>{displayValue(event.trace_id ?? searchedTraceId)}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>request_id</span>
                    <span style={styles.mono}>{displayValue(requestId)}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>transaction type</span>
                    <span>{displayValue(event.event_type)}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>warehouse_code</span>
                    <span>{event.warehouse_code}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>location</span>
                    <span>{eventLocation(event)}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>part_no / quantity</span>
                    <span>
                      {displayValue(event.part_no)} /{" "}
                      {event.quantity === null || event.quantity === undefined
                        ? "-"
                        : `${event.quantity}${event.quantity_unit ? ` ${event.quantity_unit}` : ""}`}
                    </span>
                  </div>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>pallet</span>
                    <span>{displayValue(event.pallet_code ?? event.pallet_id)}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>operator</span>
                    <span>{displayValue(event.operator_name ?? event.operator_id)}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
