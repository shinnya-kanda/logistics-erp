import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cleanupScanContractFixtures,
  CONTRACT_IDEM_PREFIX,
  createFixtureSql,
  FX,
  seedScanContractFixtures,
  type Sql,
} from "./fixtures/scanContractFixtures.js";
import { getHealth, optionsScans, postScans } from "./helpers/httpScanClient.js";
import {
  startTestScanServer,
  type TestScanServer,
} from "./helpers/testScanServer.js";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function errMessage(json: unknown): string | undefined {
  if (!isRecord(json)) return undefined;
  return typeof json.error === "string" ? json.error : undefined;
}

async function countScanEventsByIdem(sql: Sql, key: string): Promise<number> {
  const rows = await sql<{ c: string }[]>`
    SELECT count(*)::text AS c
    FROM public.scan_events
    WHERE idempotency_key = ${key}
  `;
  return Number(rows[0]?.c ?? 0);
}

async function countIssuesForItem(sql: Sql, itemId: string): Promise<number> {
  const rows = await sql<{ c: string }[]>`
    SELECT count(*)::text AS c
    FROM public.shipment_item_issues
    WHERE shipment_item_id = ${itemId}::uuid
  `;
  return Number(rows[0]?.c ?? 0);
}

async function getProgressRow(sql: Sql, itemId: string) {
  const rows = await sql<
    { quantity_scanned_total: string; progress_status: string }[]
  >`
    SELECT quantity_scanned_total::text, progress_status
    FROM public.shipment_item_progress
    WHERE shipment_item_id = ${itemId}::uuid
  `;
  return rows[0] ?? null;
}

const dbEnabled = Boolean(process.env.SCAN_CONTRACT_TEST_DATABASE_URL?.trim());

describe("scan minimal HTTP contract", () => {
  let server: TestScanServer;

  beforeAll(async () => {
    server = await startTestScanServer();
  });

  afterAll(async () => {
    await server.close();
  });

  describe("GET /health", () => {
    it("returns 200 and minimal JSON body", async () => {
      const { status, json } = await getHealth(server.baseUrl);
      expect(status).toBe(200);
      expect(json).toEqual({ ok: true, service: "scan-minimal" });
    });
  });

  describe("OPTIONS /scans (CORS)", () => {
    it("returns 204 with Access-Control headers", async () => {
      const res = await optionsScans(server.baseUrl);
      expect(res.status).toBe(204);
      expect(res.headers.get("access-control-allow-origin")).toBeTruthy();
      expect(res.headers.get("access-control-allow-methods")).toContain("POST");
    });
  });

  describe("POST /scans validation (no DB connection)", () => {
    it("400 when scanned_code missing", async () => {
      const { status, json } = await postScans(server.baseUrl, {
        scan_type: "unload",
      });
      expect(status).toBe(400);
      expect(errMessage(json)).toContain("scanned_code");
    });

    it("400 when scan_type missing", async () => {
      const { status, json } = await postScans(server.baseUrl, {
        scanned_code: "X",
      });
      expect(status).toBe(400);
      expect(errMessage(json)).toContain("scan_type");
    });

    it("400 when idempotency_key is whitespace only", async () => {
      const { status, json } = await postScans(server.baseUrl, {
        scanned_code: "X",
        scan_type: "unload",
        idempotency_key: "   ",
      });
      expect(status).toBe(400);
      expect(errMessage(json)).toContain("idempotency_key");
    });

    it("400 when selected_shipment_item_id empty string", async () => {
      const { status, json } = await postScans(server.baseUrl, {
        scanned_code: "X",
        scan_type: "unload",
        selected_shipment_item_id: "",
      });
      expect(status).toBe(400);
      expect(errMessage(json)).toContain("selected_shipment_item_id");
    });

    it("400 when selected_shipment_item_id not a UUID", async () => {
      const { status, json } = await postScans(server.baseUrl, {
        scanned_code: "X",
        scan_type: "unload",
        selected_shipment_item_id: "not-a-uuid",
      });
      expect(status).toBe(400);
      expect(errMessage(json)).toContain("UUID");
    });

    it("400 invalid JSON body", async () => {
      const res = await fetch(`${server.baseUrl}/scans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      });
      expect(res.status).toBe(400);
      const j = (await res.json()) as { error?: string };
      expect(j.error).toBe("Invalid JSON body");
    });
  });

  describe.skipIf(!dbEnabled)("POST /scans with database fixtures", () => {
    let sql: Sql;

    beforeAll(async () => {
      const url = process.env.DATABASE_URL?.trim();
      if (!url) throw new Error("DATABASE_URL missing after vitest.setup");
      sql = createFixtureSql(url);
      await seedScanContractFixtures(sql);
    });

    afterAll(async () => {
      await cleanupScanContractFixtures(sql);
      await sql.end({ timeout: 5 });
    });

    it("idempotency replay: second POST does not duplicate scan_events or progress", async () => {
      const idem = `${CONTRACT_IDEM_PREFIX}-idem-replay-1`;
      const body = {
        scanned_code: "MATCH-IDEM",
        scan_type: "unload",
        scope_shipment_id: FX.shipmentMain,
        idempotency_key: idem,
      };
      const beforeProg = await getProgressRow(sql, FX.itemIdem);
      expect(beforeProg?.quantity_scanned_total).toBe("0");

      const r1 = await postScans(server.baseUrl, body);
      expect(r1.status).toBe(201);
      const j1 = r1.json;
      expect(isRecord(j1)).toBe(true);
      if (!isRecord(j1)) return;
      expect(j1.created_new_scan).toBe(true);
      expect(j1.idempotency_hit).toBe(false);

      const c1 = await countScanEventsByIdem(sql, idem);
      expect(c1).toBe(1);
      const prog1 = await getProgressRow(sql, FX.itemIdem);
      expect(prog1?.quantity_scanned_total).toBe("1");

      const r2 = await postScans(server.baseUrl, body);
      expect(r2.status).toBe(200);
      const j2 = r2.json;
      expect(isRecord(j2)).toBe(true);
      if (!isRecord(j2)) return;
      expect(j2.idempotency_hit).toBe(true);
      expect(j2.created_new_scan).toBe(false);

      const c2 = await countScanEventsByIdem(sql, idem);
      expect(c2).toBe(1);
      const prog2 = await getProgressRow(sql, FX.itemIdem);
      expect(prog2?.quantity_scanned_total).toBe("1");
    });

    it("matched: unique match, progress updated, no issue", async () => {
      const idem = `${CONTRACT_IDEM_PREFIX}-match-ok-1`;
      const { status, json } = await postScans(server.baseUrl, {
        scanned_code: "MATCH-001",
        scan_type: "unload",
        scope_shipment_id: FX.shipmentMain,
        idempotency_key: idem,
      });
      expect(status).toBe(201);
      expect(isRecord(json)).toBe(true);
      if (!isRecord(json)) return;
      expect(json.scanEvent).toBeDefined();
      const se = json.scanEvent as Record<string, unknown>;
      expect(se.result_status).toBe("matched");
      expect(se.shipment_item_id).toBe(FX.itemMatched);
      expect(json.created_new_scan).toBe(true);
      expect(json.idempotency_hit).toBe(false);
      const match = json.match as Record<string, unknown>;
      expect(match.kind).toBe("unique");
      const ver = json.verification as Record<string, unknown> | null;
      expect(ver?.status).toBe("matched");

      const issues = await countIssuesForItem(sql, FX.itemMatched);
      expect(issues).toBe(0);
      const prog = await getProgressRow(sql, FX.itemMatched);
      expect(prog?.quantity_scanned_total).toBe("1");
      expect(prog?.progress_status).toBe("matched");
    });

    it("wrong_part: issue row created, quantity not incremented", async () => {
      const before = await countIssuesForItem(sql, FX.itemWrongPart);
      const progBefore = await getProgressRow(sql, FX.itemWrongPart);
      const idem = `${CONTRACT_IDEM_PREFIX}-wp-1`;
      const { status, json } = await postScans(server.baseUrl, {
        scanned_code: "EXT-BAR-WP",
        scan_type: "unload",
        scope_shipment_id: FX.shipmentMain,
        idempotency_key: idem,
      });
      expect(status).toBe(201);
      expect(isRecord(json)).toBe(true);
      if (!isRecord(json)) return;
      const se = json.scanEvent as Record<string, unknown>;
      expect(se.result_status).toBe("wrong_part");
      expect(se.shipment_item_id).toBe(FX.itemWrongPart);
      const ver = json.verification as Record<string, unknown> | null;
      expect(ver?.status).toBe("wrong_part");
      expect(json.issue).toBeTruthy();

      const after = await countIssuesForItem(sql, FX.itemWrongPart);
      expect(after).toBe(before + 1);
      const progAfter = await getProgressRow(sql, FX.itemWrongPart);
      expect(progAfter?.quantity_scanned_total).toBe(
        progBefore?.quantity_scanned_total ?? "0"
      );
    });

    it("wrong_location: issue created", async () => {
      const before = await countIssuesForItem(sql, FX.itemWrongLoc);
      const idem = `${CONTRACT_IDEM_PREFIX}-wl-1`;
      const { status, json } = await postScans(server.baseUrl, {
        scanned_code: "LOC-001",
        scan_type: "unload",
        unload_location_scanned: "WRONG-DOCK",
        scope_shipment_id: FX.shipmentMain,
        idempotency_key: idem,
      });
      expect(status).toBe(201);
      expect(isRecord(json)).toBe(true);
      if (!isRecord(json)) return;
      const se = json.scanEvent as Record<string, unknown>;
      expect(se.result_status).toBe("wrong_location");
      expect(se.shipment_item_id).toBe(FX.itemWrongLoc);
      const ver = json.verification as Record<string, unknown> | null;
      expect(ver?.status).toBe("wrong_location");
      expect(json.issue).toBeTruthy();
      const after = await countIssuesForItem(sql, FX.itemWrongLoc);
      expect(after).toBe(before + 1);
    });

    it("none: scan saved without shipment_item_id, no progress mutation on fixture items", async () => {
      const idem = `${CONTRACT_IDEM_PREFIX}-none-1`;
      const progBefore = await getProgressRow(sql, FX.itemMatched);
      const { status, json } = await postScans(server.baseUrl, {
        scanned_code: "NOSUCHCODE999ZZ",
        scan_type: "unload",
        idempotency_key: idem,
      });
      expect(status).toBe(201);
      expect(isRecord(json)).toBe(true);
      if (!isRecord(json)) return;
      const match = json.match as Record<string, unknown>;
      expect(match.kind).toBe("none");
      const se = json.scanEvent as Record<string, unknown>;
      expect(se.shipment_item_id).toBeNull();
      expect(json.verification).toBeNull();
      expect(json.progress).toBeNull();
      const progAfter = await getProgressRow(sql, FX.itemMatched);
      expect(progAfter?.quantity_scanned_total).toBe(
        progBefore?.quantity_scanned_total
      );
    });

    it("ambiguous: candidates length >= 2, shipment_item_id null on scan_event", async () => {
      const idem = `${CONTRACT_IDEM_PREFIX}-amb-1`;
      const { status, json } = await postScans(server.baseUrl, {
        scanned_code: "AMB-SAME",
        scan_type: "unload",
        scope_shipment_id: FX.shipmentAmb,
        idempotency_key: idem,
      });
      expect(status).toBe(201);
      expect(isRecord(json)).toBe(true);
      if (!isRecord(json)) return;
      const match = json.match as Record<string, unknown>;
      expect(match.kind).toBe("ambiguous");
      const cands = match.candidates as unknown[] | undefined;
      expect(Array.isArray(cands)).toBe(true);
      expect((cands as unknown[]).length).toBeGreaterThanOrEqual(2);
      const se = json.scanEvent as Record<string, unknown>;
      expect(se.shipment_item_id).toBeNull();
      expect(json.progress).toBeNull();
      expect(json.issue).toBeNull();
    });

    it("ambiguous idempotency replay: same candidates, single scan row", async () => {
      const idem = `${CONTRACT_IDEM_PREFIX}-amb-replay-1`;
      const body = {
        scanned_code: "AMB-SAME",
        scan_type: "unload",
        scope_shipment_id: FX.shipmentAmb,
        idempotency_key: idem,
      };
      const r1 = await postScans(server.baseUrl, body);
      expect(r1.status).toBe(201);
      const r2 = await postScans(server.baseUrl, body);
      expect(r2.status).toBe(200);
      const j2 = r2.json;
      expect(isRecord(j2)).toBe(true);
      if (!isRecord(j2)) return;
      expect(j2.idempotency_hit).toBe(true);
      const match = j2.match as Record<string, unknown>;
      expect(match.kind).toBe("ambiguous");
      const cands = match.candidates as unknown[];
      expect(cands.length).toBeGreaterThanOrEqual(2);
      expect(await countScanEventsByIdem(sql, idem)).toBe(1);
    });

    it("manual ambiguous resolution: selected_shipment_item_id + new idempotency key", async () => {
      const ambIdem = `${CONTRACT_IDEM_PREFIX}-man-amb-1`;
      await postScans(server.baseUrl, {
        scanned_code: "AMB-SAME",
        scan_type: "unload",
        scope_shipment_id: FX.shipmentAmb,
        idempotency_key: ambIdem,
      });

      const manualIdem = `${CONTRACT_IDEM_PREFIX}-man-resolve-1`;
      const { status, json } = await postScans(server.baseUrl, {
        scanned_code: "AMB-SAME",
        scan_type: "unload",
        scope_shipment_id: FX.shipmentAmb,
        idempotency_key: manualIdem,
        selected_shipment_item_id: FX.itemAmb1,
      });
      expect(status).toBe(201);
      expect(isRecord(json)).toBe(true);
      if (!isRecord(json)) return;
      const se = json.scanEvent as Record<string, unknown>;
      expect(se.shipment_item_id).toBe(FX.itemAmb1);
      const raw = se.raw_payload as Record<string, unknown> | null;
      expect(raw?.manual_ambiguous_resolution).toBe(true);
      expect(raw?.selected_shipment_item_id).toBe(FX.itemAmb1);
      const ver = json.verification as Record<string, unknown> | null;
      expect(ver?.status).toBe("matched");
      expect(se.result_status).toBe("matched");
    });
  });
});
