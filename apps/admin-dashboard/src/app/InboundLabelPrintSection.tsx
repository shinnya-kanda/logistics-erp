"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

type InboundLabelRow = {
  no: number;
  total: number;
  pl_no: string;
  pj_no: string;
  output_date: string;
};

function dateInputValue(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeCode39Text(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function barcodeText(value: string): string {
  return `*${value}*`;
}

function buildPlNo(prefix: string, pjNo: string, serial: number): string {
  return `${prefix}-${pjNo}-${String(serial).padStart(4, "0")}`;
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
  actions: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.75rem",
    margin: "1rem 0",
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

export function InboundLabelPrintSection() {
  const [mounted, setMounted] = useState(false);
  const [pjNo, setPjNo] = useState("");
  const [palletCount, setPalletCount] = useState("5");
  const [plPrefix, setPlPrefix] = useState("PL");
  const [startNumber, setStartNumber] = useState("1");
  const [outputDate, setOutputDate] = useState(dateInputValue);
  const [rows, setRows] = useState<InboundLabelRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleGenerate(e: FormEvent) {
    e.preventDefault();
    const normalizedPjNo = normalizeCode39Text(pjNo);
    const normalizedPrefix = normalizeCode39Text(plPrefix);
    const count = Number(palletCount);
    const start = Number(startNumber);

    setError(null);
    if (!normalizedPjNo) {
      setRows([]);
      setError("PJ NO を入力してください。");
      return;
    }
    if (!normalizedPrefix) {
      setRows([]);
      setError("PL NO接頭辞を入力してください。");
      return;
    }
    if (!Number.isInteger(count) || count <= 0) {
      setRows([]);
      setError("入庫PL数は 1 以上の整数で入力してください。");
      return;
    }
    if (!Number.isInteger(start) || start <= 0) {
      setRows([]);
      setError("開始番号は 1 以上の整数で入力してください。");
      return;
    }

    const generated = Array.from({ length: count }, (_, index) => {
      const serial = start + index;
      return {
        no: index + 1,
        total: count,
        pl_no: buildPlNo(normalizedPrefix, normalizedPjNo, serial),
        pj_no: normalizedPjNo,
        output_date: outputDate,
      };
    });

    setPjNo(normalizedPjNo);
    setPlPrefix(normalizedPrefix);
    setRows(generated);
  }

  function handlePrint() {
    window.setTimeout(() => window.print(), 0);
  }

  const printArea = (
    <section className="inbound-label-print-area" aria-label="入庫前ラベル">
      <div className="inbound-print-header">
        <h1>入庫前ラベル</h1>
        <div>出力日: {outputDate}</div>
      </div>

      <h2>PL NOラベル</h2>
      <div className="inbound-label-grid">
        {rows.map((row) => (
          <article className="inbound-label-card" key={`pl-${row.pl_no}`}>
            <div className="inbound-label-kind">PL NO</div>
            <div className="inbound-label-main">{row.pl_no}</div>
            <div className="inbound-label-barcode">{barcodeText(row.pl_no)}</div>
            <div className="inbound-label-meta">PJ NO: {row.pj_no}</div>
            <div className="inbound-label-meta">出力日: {row.output_date}</div>
            <div className="inbound-label-meta">
              No. {row.no} / {row.total}
            </div>
          </article>
        ))}
      </div>

      <h2 className="inbound-print-section-title">PJ NOラベル</h2>
      <div className="inbound-label-grid">
        {rows.map((row) => (
          <article className="inbound-label-card" key={`pj-${row.no}-${row.pj_no}`}>
            <div className="inbound-label-kind">PJ NO</div>
            <div className="inbound-label-main">{row.pj_no}</div>
            <div className="inbound-label-barcode">{barcodeText(row.pj_no)}</div>
            <div className="inbound-label-meta">出力日: {row.output_date}</div>
            <div className="inbound-label-meta">
              No. {row.no} / {row.total}
            </div>
          </article>
        ))}
      </div>
    </section>
  );

  return (
    <section style={styles.panel}>
      <style>{`
        .inbound-label-print-area {
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
            display: none !important;
          }

          .inbound-label-print-area {
            display: block !important;
            position: static !important;
            width: 100%;
            max-width: 100%;
            height: auto;
            min-height: auto;
            overflow: visible;
            margin: 0;
            padding: 0;
            color: #000;
            font-family: sans-serif;
          }

          .inbound-label-print-area * {
            display: revert !important;
          }

          .inbound-print-header {
            display: flex !important;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 3mm;
            font-size: 9pt;
          }

          .inbound-print-header h1 {
            margin: 0;
            font-size: 16pt;
          }

          .inbound-label-print-area h2 {
            margin: 2mm 0;
            font-size: 11pt;
          }

          .inbound-print-section-title {
            page-break-before: auto;
            break-before: auto;
            margin-top: 4mm !important;
          }

          .inbound-label-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr);
            gap: 4mm;
            margin-bottom: 2mm;
          }

          .inbound-label-card {
            display: block !important;
            min-height: 34mm;
            padding: 4mm;
            border: 1px solid #111;
            border-radius: 2mm;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .inbound-label-kind {
            font-size: 8pt;
            font-weight: 700;
            letter-spacing: 0.08em;
          }

          .inbound-label-main {
            margin-top: 1.5mm;
            font-size: 15pt;
            font-weight: 800;
            word-break: break-all;
          }

          .inbound-label-barcode {
            margin-top: 2mm;
            padding: 1.5mm 2mm;
            border: 1px solid #333;
            font-family: monospace;
            font-size: 14pt;
            letter-spacing: 0.08em;
            text-align: center;
            word-break: break-all;
          }

          .inbound-label-meta {
            margin-top: 1.5mm;
            font-size: 8.5pt;
            line-height: 1.15;
          }
        }
      `}</style>

      <h2>入庫ラベル発行</h2>
      <p>
        入庫前準備として、PJ NO単位で入庫予定PL数分のPL NOラベルとPJ NOラベルを印刷します。
        生成したPL NOはDB登録しません。
      </p>

      <form style={styles.form} onSubmit={handleGenerate}>
        <label style={styles.field}>
          <span>PJ NO</span>
          <input
            style={styles.input}
            value={pjNo}
            onChange={(e) => setPjNo(e.target.value)}
            autoComplete="off"
          />
        </label>
        <label style={styles.field}>
          <span>入庫PL数</span>
          <input
            style={styles.input}
            type="number"
            min="1"
            step="1"
            value={palletCount}
            onChange={(e) => setPalletCount(e.target.value)}
          />
        </label>
        <label style={styles.field}>
          <span>PL NO接頭辞</span>
          <input
            style={styles.input}
            value={plPrefix}
            onChange={(e) => setPlPrefix(e.target.value)}
            autoComplete="off"
          />
        </label>
        <label style={styles.field}>
          <span>開始番号</span>
          <input
            style={styles.input}
            type="number"
            min="1"
            step="1"
            value={startNumber}
            onChange={(e) => setStartNumber(e.target.value)}
          />
        </label>
        <label style={styles.field}>
          <span>出力日</span>
          <input
            style={styles.input}
            type="date"
            value={outputDate}
            onChange={(e) => setOutputDate(e.target.value)}
          />
        </label>
        <button style={styles.button} type="submit">
          ラベル生成
        </button>
      </form>

      {error ? <div style={styles.error}>{error}</div> : null}

      <div style={styles.actions}>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={handlePrint}
          disabled={rows.length === 0}
        >
          印刷
        </button>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>No</th>
              <th style={styles.th}>PL NO</th>
              <th style={styles.th}>PJ NO</th>
              <th style={styles.th}>出力日</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.pl_no}>
                <td style={styles.td}>{row.no}</td>
                <td style={styles.td}>{row.pl_no}</td>
                <td style={styles.td}>{row.pj_no}</td>
                <td style={styles.td}>{row.output_date}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td style={styles.td} colSpan={4}>
                  ラベルはまだ生成されていません。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {mounted ? createPortal(printArea, document.body) : null}
    </section>
  );
}
