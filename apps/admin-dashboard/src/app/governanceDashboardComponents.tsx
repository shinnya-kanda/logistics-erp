import type { CSSProperties, ReactNode } from "react";
import type {
  GovernanceBadgeTone,
  GovernanceDisplayState,
  GovernanceLifecycleState,
  GovernanceOverviewTone,
  GovernanceReadOnlyNote,
  GovernanceRenderState,
  GovernanceSemanticBadge,
  GovernanceSeverity,
  GovernanceStateNotice,
  GovernanceSummaryRow,
  GovernanceTimelineDisplayItem,
} from "./governanceDashboardTypes";

type GovernanceSectionCardProps = {
  readonly title: string;
  readonly value?: string;
  readonly description: string;
  readonly severity: GovernanceSeverity;
  readonly lifecycleState: GovernanceLifecycleState;
  readonly tone?: GovernanceOverviewTone;
  readonly semanticBadges?: readonly GovernanceSemanticBadge[];
};

type GovernanceReadOnlyNoticeProps = {
  readonly children: ReactNode;
  readonly tone?: "warning" | "neutral";
};

const styles: Record<string, CSSProperties> = {
  badge: {
    display: "inline-flex",
    alignItems: "center",
    border: "1px solid #90a4ae",
    borderRadius: "999px",
    padding: "0.2rem 0.5rem",
    background: "#f5f7fb",
    color: "#333",
    fontSize: "0.78rem",
    fontWeight: 800,
    letterSpacing: "0.02em",
  },
  readOnlyBadge: {
    borderColor: "#0d47a1",
    background: "#e3f2fd",
    color: "#0d47a1",
    padding: "0.35rem 0.7rem",
    fontSize: "0.9rem",
    fontWeight: 900,
  },
  noExecutionBadge: {
    borderColor: "#1b5e20",
    background: "#e8f5e9",
    color: "#1b5e20",
    padding: "0.35rem 0.7rem",
    fontSize: "0.9rem",
    fontWeight: 900,
  },
  badgeRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.45rem",
    alignItems: "center",
  },
  notice: {
    margin: "1rem 0",
    padding: "0.9rem 1rem",
    border: "1px solid #ef6c00",
    borderRadius: "12px",
    background: "#fff3e0",
    color: "#5d3900",
    fontWeight: 700,
    lineHeight: 1.6,
  },
  neutralNotice: {
    border: "1px dashed #90a4ae",
    background: "#f5f7fb",
    color: "#333",
    fontWeight: 400,
  },
  section: {
    marginTop: "1.25rem",
    padding: "1rem",
    border: "1px solid #ddd",
    borderRadius: "12px",
    background: "#fafafa",
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: "0.35rem",
  },
  lead: {
    marginTop: "0.5rem",
    color: "#555",
    lineHeight: 1.7,
    maxWidth: "58rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
    gap: "0.85rem",
    marginTop: "0.9rem",
  },
  card: {
    padding: "0.9rem",
    border: "1px solid #ddd",
    borderRadius: "12px",
    background: "#fff",
  },
  cardLabel: {
    margin: 0,
    color: "#555",
    fontSize: "0.88rem",
    fontWeight: 700,
  },
  cardValue: {
    display: "block",
    marginTop: "0.35rem",
    fontSize: "1.65rem",
    fontWeight: 900,
  },
  cardDescription: {
    margin: "0.45rem 0 0",
    color: "#555",
    lineHeight: 1.5,
  },
  metadataRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.45rem",
    marginTop: "0.7rem",
  },
  noteCard: {
    padding: "0.9rem",
    border: "1px solid #cfd8dc",
    borderRadius: "12px",
    background: "#fff",
    lineHeight: 1.6,
  },
  noteCategory: {
    display: "inline-block",
    marginBottom: "0.45rem",
    padding: "0.2rem 0.45rem",
    borderRadius: "999px",
    background: "#f5f7fb",
    color: "#333",
    fontSize: "0.82rem",
    fontWeight: 800,
  },
  timelineList: {
    display: "grid",
    gap: "0.75rem",
    marginTop: "0.85rem",
  },
  timelineItem: {
    padding: "0.9rem",
    border: "1px solid #ddd",
    borderRadius: "12px",
    background: "#fff",
    lineHeight: 1.6,
  },
  timelineHeader: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  timelineTime: {
    color: "#555",
    fontSize: "0.88rem",
    fontWeight: 800,
  },
};

function cardToneStyle(tone: GovernanceOverviewTone | undefined): CSSProperties {
  if (tone === "critical") {
    return { borderColor: "#c62828", background: "#ffebee", color: "#7f0000" };
  }

  if (tone === "high" || tone === "warning") {
    return { borderColor: "#ef6c00", background: "#fff3e0", color: "#5d3900" };
  }

  if (tone === "safe") {
    return { borderColor: "#2e7d32", background: "#e8f5e9", color: "#1b5e20" };
  }

  return { borderColor: "#90caf9", background: "#e3f2fd", color: "#0d47a1" };
}

function severityLabel(severity: GovernanceSeverity): string {
  if (severity === "critical") return "Severity: critical";
  if (severity === "high") return "Severity: high";
  if (severity === "warning") return "Severity: warning";
  return "Severity: info";
}

function lifecycleLabel(lifecycleState: GovernanceLifecycleState): string {
  if (lifecycleState === "detected") return "Lifecycle: detected";
  if (lifecycleState === "reviewing") return "Lifecycle: reviewing";
  if (lifecycleState === "classified") return "Lifecycle: classified";
  return "Lifecycle: reaffirmed";
}

function displayStateLabel(displayState: GovernanceDisplayState): string {
  if (displayState === "loading") return "Display state: loading";
  if (displayState === "empty") return "Display state: empty";
  if (displayState === "stale") return "Display state: stale";
  if (displayState === "partial") return "Display state: partial";
  if (displayState === "degraded") return "Display state: degraded";
  return "Display state: ready";
}

function renderStateLabel(renderState: GovernanceRenderState): string {
  if (renderState === "readonly") return "Render state: readonly";
  if (renderState === "partial") return "Render state: partial";
  if (renderState === "stale") return "Render state: stale";
  if (renderState === "degraded") return "Render state: degraded";
  return "Render state: ready";
}

function badgeToneStyle(tone: GovernanceBadgeTone): CSSProperties {
  if (tone === "critical") return { borderColor: "#c62828", background: "#ffebee", color: "#7f0000" };
  if (tone === "high" || tone === "warning") {
    return { borderColor: "#ef6c00", background: "#fff3e0", color: "#5d3900" };
  }
  if (tone === "safe") return { borderColor: "#2e7d32", background: "#e8f5e9", color: "#1b5e20" };
  if (tone === "info") return { borderColor: "#90caf9", background: "#e3f2fd", color: "#0d47a1" };
  return {};
}

function severityBadge(severity: GovernanceSeverity): GovernanceSemanticBadge {
  return {
    id: `severity-${severity}`,
    category: "severity",
    label: severityLabel(severity),
    tone: severity === "critical" ? "critical" : severity === "high" ? "high" : severity,
    visibility: "summary",
    semanticMeaning: "review attention level の表示であり、処理優先度ではありません。",
  };
}

function lifecycleBadge(lifecycleState: GovernanceLifecycleState): GovernanceSemanticBadge {
  return {
    id: `lifecycle-${lifecycleState}`,
    category: "lifecycle",
    label: lifecycleLabel(lifecycleState),
    tone: "neutral",
    visibility: "summary",
    semanticMeaning: "read-only review lifecycle の表示であり、実行状態遷移ではありません。",
  };
}

export function GovernanceSemanticBadgePill({
  badge,
}: {
  readonly badge: GovernanceSemanticBadge;
}) {
  return (
    <span style={{ ...styles.badge, ...badgeToneStyle(badge.tone) }} title={badge.semanticMeaning}>
      {badge.label}
    </span>
  );
}

export function GovernanceSeverityBadge({
  severity,
}: {
  readonly severity: GovernanceSeverity;
}) {
  return <GovernanceSemanticBadgePill badge={severityBadge(severity)} />;
}

export function GovernanceLifecycleBadge({
  lifecycleState,
}: {
  readonly lifecycleState: GovernanceLifecycleState;
}) {
  return <GovernanceSemanticBadgePill badge={lifecycleBadge(lifecycleState)} />;
}

export function GovernanceDisplayStateBadge({
  displayState,
}: {
  readonly displayState: GovernanceDisplayState;
}) {
  return <span style={styles.badge}>{displayStateLabel(displayState)}</span>;
}

export function GovernanceRenderStateBadge({
  renderState,
}: {
  readonly renderState: GovernanceRenderState;
}) {
  return <span style={styles.badge}>{renderStateLabel(renderState)}</span>;
}

export function GovernanceSemanticBadgeList({
  badges,
}: {
  readonly badges?: readonly GovernanceSemanticBadge[];
}) {
  if (!badges?.length) return null;

  return (
    <>
      {badges.map((badge) => (
        <GovernanceSemanticBadgePill key={badge.id} badge={badge} />
      ))}
    </>
  );
}

export function GovernanceReadOnlyNotice({
  children,
  tone = "warning",
}: GovernanceReadOnlyNoticeProps) {
  return (
    <div
      style={{
        ...styles.notice,
        ...(tone === "neutral" ? styles.neutralNotice : {}),
      }}
    >
      {children}
    </div>
  );
}

export function GovernanceReadOnlyBoundaryBadges() {
  return (
    <div style={styles.badgeRow} aria-label="Read-only governance badges">
      <span style={{ ...styles.badge, ...styles.readOnlyBadge }}>READ ONLY</span>
      <span style={{ ...styles.badge, ...styles.noExecutionBadge }}>NO EXECUTION</span>
    </div>
  );
}

export function GovernanceStateNotice({ notice }: { readonly notice: GovernanceStateNotice }) {
  return (
    <GovernanceReadOnlyNotice tone={notice.displayState === "ready" ? "neutral" : "warning"}>
      <strong>{notice.title}</strong>
      <br />
      {notice.message}
      <div style={styles.metadataRow}>
        <GovernanceDisplayStateBadge displayState={notice.displayState} />
        <GovernanceRenderStateBadge renderState={notice.renderState} />
        <GovernanceSemanticBadgeList badges={notice.semanticBadges} />
      </div>
    </GovernanceReadOnlyNotice>
  );
}

export function GovernanceSectionCard({
  title,
  value,
  description,
  severity,
  lifecycleState,
  tone,
  semanticBadges,
}: GovernanceSectionCardProps) {
  return (
    <article style={{ ...styles.card, ...cardToneStyle(tone) }}>
      <p style={styles.cardLabel}>{title}</p>
      {value ? <span style={styles.cardValue}>{value}</span> : null}
      <p style={styles.cardDescription}>{description}</p>
      <div style={styles.metadataRow}>
        <GovernanceSeverityBadge severity={severity} />
        <GovernanceLifecycleBadge lifecycleState={lifecycleState} />
        <GovernanceSemanticBadgeList badges={semanticBadges} />
      </div>
    </article>
  );
}

export function GovernanceSummarySection({
  title,
  description,
  rows,
}: {
  readonly title: string;
  readonly description: string;
  readonly rows: readonly GovernanceSummaryRow[];
}) {
  return (
    <section style={styles.section}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      <p style={styles.lead}>{description}</p>
      <div style={styles.grid}>
        {rows.map((row) => (
          <GovernanceSectionCard
            key={row.label}
            title={row.label}
            value={row.value}
            description={row.note}
            severity={row.severity}
            lifecycleState={row.lifecycleState}
            semanticBadges={row.semanticBadges}
          />
        ))}
      </div>
    </section>
  );
}

export function GovernanceSemanticNoteCard({ note }: { readonly note: GovernanceReadOnlyNote }) {
  return (
    <article style={styles.noteCard}>
      <span style={styles.noteCategory}>{note.categoryLabel}</span>
      <h4 style={{ margin: "0 0 0.35rem" }}>{note.title}</h4>
      <p style={{ margin: 0 }}>{note.note}</p>
      <div style={styles.metadataRow}>
        <GovernanceSeverityBadge severity={note.severity} />
        <GovernanceLifecycleBadge lifecycleState={note.lifecycleState} />
      </div>
    </article>
  );
}

export function GovernanceTimelineSection({
  title,
  description,
  items,
}: {
  readonly title: string;
  readonly description: string;
  readonly items: readonly GovernanceTimelineDisplayItem[];
}) {
  return (
    <section style={styles.section}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      <p style={styles.lead}>{description}</p>
      <div style={styles.timelineList}>
        {items.map((item) => (
          <article key={item.id} style={styles.timelineItem}>
            <div style={styles.timelineHeader}>
              <span style={styles.noteCategory}>{item.categoryLabel}</span>
              <span style={styles.timelineTime}>{item.occurredAtLabel}</span>
            </div>
            <h4 style={{ margin: "0.45rem 0 0.35rem" }}>{item.title}</h4>
            <p style={{ margin: 0 }}>{item.description}</p>
            <p style={{ margin: "0.45rem 0 0", color: "#555" }}>
              Source: {item.sourceLabel}
            </p>
            <div style={styles.metadataRow}>
              <GovernanceSeverityBadge severity={item.severity} />
              <GovernanceLifecycleBadge lifecycleState={item.lifecycleState} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export const governanceComponentStyles = {
  grid: styles.grid,
  section: styles.section,
  sectionTitle: styles.sectionTitle,
  lead: styles.lead,
};
