import { verifyScanAgainstShipmentItem } from "@logistics-erp/db";
import type { ScanInputPayload, ShipmentItem } from "@logistics-erp/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cleanupScanContractFixtures,
  CONTRACT_IDEM_PREFIX,
  createFixtureSql,
  FX,
  seedScanContractFixtures,
  type Sql,
} from "./fixtures/scanContractFixtures.js";
import {
  getEmptyPallets,
  getPalletDetail,
  getPalletSearch,
  getWarehouseLocationCheck,
  getWarehouseLocationsSearch,
  getWarehouseLocationsUnregistered,
  getHealth,
  optionsScans,
  postInventoryIn,
  postInventoryMove,
  postInventoryOut,
  postPalletCreate,
  postPalletItemAdd,
  postPalletItemOut,
  postPalletMove,
  postPalletOut,
  postPalletProjectNoUpdate,
  postWarehouseLocationActiveUpdate,
  postWarehouseLocationCreate,
  postScans,
} from "./helpers/httpScanClient.js";
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

  describe("POST /inventory/out validation (no DB connection)", () => {
    it("400 when part_no missing", async () => {
      const { status, json } = await postInventoryOut(server.baseUrl, {
        quantity: 1,
        warehouse_code: "WH01",
      });
      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "part_no is required" });
    });

    it("400 when quantity is not positive", async () => {
      const { status, json } = await postInventoryOut(server.baseUrl, {
        part_no: "P001",
        quantity: 0,
        warehouse_code: "WH01",
      });
      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "quantity must be positive" });
    });

    it("400 when from_location_codes is not a string array", async () => {
      const { status, json } = await postInventoryOut(server.baseUrl, {
        part_no: "P001",
        quantity: 1,
        warehouse_code: "WH01",
        from_location_codes: ["A-01", 123],
      });
      expect(status).toBe(400);
      expect(json).toEqual({
        ok: false,
        error: "from_location_codes must be an array of strings",
      });
    });
  });

  describe("POST /inventory/in validation (no DB connection)", () => {
    it("400 when part_no missing", async () => {
      const { status, json } = await postInventoryIn(server.baseUrl, {
        quantity: 1,
        warehouse_code: "WH01",
        to_location_code: "LOC01",
      });
      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "part_no is required" });
    });

    it("400 when quantity is not positive", async () => {
      const { status, json } = await postInventoryIn(server.baseUrl, {
        part_no: "P001",
        quantity: 0,
        warehouse_code: "WH01",
        to_location_code: "LOC01",
      });
      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "quantity must be positive" });
    });

    it("400 when to_location_code missing", async () => {
      const { status, json } = await postInventoryIn(server.baseUrl, {
        part_no: "P001",
        quantity: 1,
        warehouse_code: "WH01",
      });
      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "to_location_code is required" });
    });
  });

  describe("POST /inventory/move validation (no DB connection)", () => {
    it("400 when required part_no is missing", async () => {
      const { status, json } = await postInventoryMove(server.baseUrl, {
        quantity: 1,
        warehouse_code: "WH01",
        from_location_code: "LOC01",
        to_location_code: "LOC02",
      });
      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "part_no is required" });
    });

    it("400 when quantity is not positive", async () => {
      const { status, json } = await postInventoryMove(server.baseUrl, {
        part_no: "P001",
        quantity: 0,
        warehouse_code: "WH01",
        from_location_code: "LOC01",
        to_location_code: "LOC02",
      });
      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "quantity must be positive" });
    });

    it("400 when from_location_code and to_location_code are the same", async () => {
      const { status, json } = await postInventoryMove(server.baseUrl, {
        part_no: "P001",
        quantity: 1,
        warehouse_code: "WH01",
        from_location_code: "LOC01",
        to_location_code: "LOC01",
      });
      expect(status).toBe(400);
      expect(json).toEqual({
        ok: false,
        error: "from_location_code and to_location_code must differ",
      });
    });
  });

  describe("POST /pallets/create validation (no DB connection)", () => {
    it("400 when pallet_code is missing", async () => {
      const { status, json } = await postPalletCreate(server.baseUrl, {
        warehouse_code: "KOMATSU",
      });

      expect(status).toBe(400);
      expect(json).toEqual({
        ok: false,
        error: "pallet_code and warehouse_code required",
      });
    });

    it("400 when warehouse_code is missing", async () => {
      const { status, json } = await postPalletCreate(server.baseUrl, {
        pallet_code: "PL-KM-260502-0001",
      });

      expect(status).toBe(400);
      expect(json).toEqual({
        ok: false,
        error: "pallet_code and warehouse_code required",
      });
    });
  });

  describe("POST /pallets/items/add validation (no DB connection)", () => {
    it("400 when pallet_code is missing", async () => {
      const { status, json } = await postPalletItemAdd(server.baseUrl, {
        part_no: "741R129590",
        quantity: 10,
        warehouse_code: "KOMATSU",
      });

      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "pallet_code is required" });
    });

    it("400 when part_no is missing", async () => {
      const { status, json } = await postPalletItemAdd(server.baseUrl, {
        pallet_code: "PL-KM-260502-0001",
        quantity: 10,
        warehouse_code: "KOMATSU",
      });

      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "part_no is required" });
    });

    it("400 when quantity is not positive", async () => {
      const { status, json } = await postPalletItemAdd(server.baseUrl, {
        pallet_code: "PL-KM-260502-0001",
        part_no: "741R129590",
        quantity: 0,
        warehouse_code: "KOMATSU",
      });

      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "quantity must be positive" });
    });

    it("400 when warehouse_code is missing", async () => {
      const { status, json } = await postPalletItemAdd(server.baseUrl, {
        pallet_code: "PL-KM-260502-0001",
        part_no: "741R129590",
        quantity: 10,
      });

      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "warehouse_code is required" });
    });
  });

  describe("POST /pallets/items/out validation (no DB connection)", () => {
    it("400 when pallet_code is missing", async () => {
      const { status, json } = await postPalletItemOut(server.baseUrl, {
        part_no: "741R129590",
        quantity: 1,
        warehouse_code: "KOMATSU",
      });

      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "pallet_code is required" });
    });

    it("400 when part_no is missing", async () => {
      const { status, json } = await postPalletItemOut(server.baseUrl, {
        pallet_code: "PL-KM-260502-0001",
        quantity: 1,
        warehouse_code: "KOMATSU",
      });

      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "part_no is required" });
    });

    it("400 when quantity is not positive", async () => {
      const { status, json } = await postPalletItemOut(server.baseUrl, {
        pallet_code: "PL-KM-260502-0001",
        part_no: "741R129590",
        quantity: 0,
        warehouse_code: "KOMATSU",
      });

      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "quantity must be positive" });
    });
  });

  describe("POST /pallets/move validation (no DB connection)", () => {
    it("400 when pallet_code is missing", async () => {
      const { status, json } = await postPalletMove(server.baseUrl, {
        to_location_code: "A-01-01",
        warehouse_code: "KOMATSU",
      });

      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "pallet_code is required" });
    });

    it("400 when to_location_code is missing", async () => {
      const { status, json } = await postPalletMove(server.baseUrl, {
        pallet_code: "PL-KM-260502-0001",
        warehouse_code: "KOMATSU",
      });

      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "to_location_code is required" });
    });
  });

  describe("POST /pallets/out validation (no DB connection)", () => {
    it("400 when pallet_code is missing", async () => {
      const { status, json } = await postPalletOut(server.baseUrl, {
        warehouse_code: "KOMATSU",
      });

      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "pallet_code is required" });
    });
  });

  describe("GET /pallets/search validation (no DB connection)", () => {
    it("400 when warehouse_code, project_no, part_no, and pallet_code are missing", async () => {
      const { status, json } = await getPalletSearch(server.baseUrl);

      expect(status).toBe(400);
      expect(json).toEqual({
        ok: false,
        error: "warehouse_code or project_no or part_no or pallet_code is required",
      });
    });

    it("500 reaches DB layer when warehouse_code only is valid", async () => {
      const { status, json } = await getPalletSearch(server.baseUrl, "KOMATSU");

      expect(status).toBe(500);
      expect(errMessage(json)).toBeTruthy();
    });

    it("500 reaches DB layer when part_no only is valid", async () => {
      const { status, json } = await getPalletSearch(
        server.baseUrl,
        undefined,
        undefined,
        "741R129590"
      );

      expect(status).toBe(500);
      expect(errMessage(json)).toBeTruthy();
    });

    it("500 reaches DB layer when pallet_code only is valid", async () => {
      const { status, json } = await getPalletSearch(
        server.baseUrl,
        undefined,
        undefined,
        undefined,
        "PL-001"
      );

      expect(status).toBe(500);
      expect(errMessage(json)).toBeTruthy();
    });

    it("500 reaches DB layer when status ACTIVE is combined", async () => {
      const { status, json } = await getPalletSearch(
        server.baseUrl,
        "KOMATSU",
        "ACTIVE",
        "741R129590",
        "PL-001"
      );

      expect(status).toBe(500);
      expect(errMessage(json)).toBeTruthy();
    });

    it("500 reaches DB layer when status OUT is valid", async () => {
      const { status, json } = await getPalletSearch(server.baseUrl, "KOMATSU", "OUT");

      expect(status).toBe(500);
      expect(errMessage(json)).toBeTruthy();
    });

    it("400 when status is invalid", async () => {
      const { status, json } = await getPalletSearch(server.baseUrl, "KOMATSU", "INVALID");

      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "status must be ACTIVE or OUT" });
    });
  });

  describe("GET /pallets/detail validation (no DB connection)", () => {
    it("400 when pallet_code is missing", async () => {
      const { status, json } = await getPalletDetail(server.baseUrl);

      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "pallet_code is required" });
    });

    it("500 reaches DB layer when pallet_code is valid", async () => {
      const { status, json } = await getPalletDetail(server.baseUrl, "PL-001");

      expect(status).toBe(500);
      expect(errMessage(json)).toBeTruthy();
    });
  });

  describe("GET /pallets/empty validation (no DB connection)", () => {
    it("500 reaches DB layer when warehouse_code is omitted", async () => {
      const { status, json } = await getEmptyPallets(server.baseUrl);

      expect(status).toBe(500);
      expect(errMessage(json)).toBeTruthy();
    });

    it("500 reaches DB layer when warehouse_code is provided", async () => {
      const { status, json } = await getEmptyPallets(server.baseUrl, "KOMATSU");

      expect(status).toBe(500);
      expect(errMessage(json)).toBeTruthy();
    });
  });

  describe("POST /pallets/project-no/update validation (no DB connection)", () => {
    it("400 when pallet_code is missing", async () => {
      const { status, json } = await postPalletProjectNoUpdate(server.baseUrl, {
        project_no: "PRJ-001",
      });

      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "pallet_code is required" });
    });

    it("400 when project_no is missing", async () => {
      const { status, json } = await postPalletProjectNoUpdate(server.baseUrl, {
        pallet_code: "PL-001",
      });

      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "project_no is required" });
    });

    it("500 reaches DB layer when required fields are valid", async () => {
      const { status, json } = await postPalletProjectNoUpdate(server.baseUrl, {
        pallet_code: "PL-001",
        project_no: "PRJ-001",
      });

      expect(status).toBe(500);
      expect(errMessage(json)).toBeTruthy();
    });
  });

  describe("warehouse locations API validation (no DB connection)", () => {
    it("400 when search is_active is invalid", async () => {
      const { status, json } = await getWarehouseLocationsSearch(server.baseUrl, {
        isActive: "maybe",
      });

      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "is_active must be true or false" });
    });

    it("500 reaches DB layer when search params are valid", async () => {
      const { status, json } = await getWarehouseLocationsSearch(server.baseUrl, {
        warehouseCode: "KOMATSU",
        isActive: "true",
      });

      expect(status).toBe(500);
      expect(errMessage(json)).toBeTruthy();
    });

    it("500 reaches DB layer when unregistered locations are requested", async () => {
      const { status, json } = await getWarehouseLocationsUnregistered(server.baseUrl);

      expect(status).toBe(500);
      expect(errMessage(json)).toBeTruthy();
    });

    it("400 when location check warehouse_code is missing", async () => {
      const { status, json } = await getWarehouseLocationCheck(server.baseUrl, {
        locationCode: "A-01",
      });

      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "warehouse_code is required" });
    });

    it("400 when location check location_code is missing", async () => {
      const { status, json } = await getWarehouseLocationCheck(server.baseUrl, {
        warehouseCode: "KOMATSU",
      });

      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "location_code is required" });
    });

    it("500 reaches DB layer when location check params are valid", async () => {
      const { status, json } = await getWarehouseLocationCheck(server.baseUrl, {
        warehouseCode: "KOMATSU",
        locationCode: "A-01",
      });

      expect(status).toBe(500);
      expect(errMessage(json)).toBeTruthy();
    });

    it("400 when create warehouse_code is missing", async () => {
      const { status, json } = await postWarehouseLocationCreate(server.baseUrl, {
        location_code: "A-01",
      });

      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "warehouse_code is required" });
    });

    it("400 when create location_code is missing", async () => {
      const { status, json } = await postWarehouseLocationCreate(server.baseUrl, {
        warehouse_code: "KOMATSU",
      });

      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "location_code is required" });
    });

    it("500 reaches DB layer when create required fields are valid", async () => {
      const { status, json } = await postWarehouseLocationCreate(server.baseUrl, {
        warehouse_code: "KOMATSU",
        location_code: "A-01",
      });

      expect(status).toBe(500);
      expect(errMessage(json)).toBeTruthy();
    });

    it("400 when active update id is missing", async () => {
      const { status, json } = await postWarehouseLocationActiveUpdate(server.baseUrl, {
        is_active: true,
      });

      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "id is required" });
    });

    it("400 when active update is_active is invalid", async () => {
      const { status, json } = await postWarehouseLocationActiveUpdate(server.baseUrl, {
        id: "00000000-0000-0000-0000-000000000000",
        is_active: "maybe",
      });

      expect(status).toBe(400);
      expect(json).toEqual({ ok: false, error: "is_active must be true or false" });
    });

    it("500 reaches DB layer when active update required fields are valid", async () => {
      const { status, json } = await postWarehouseLocationActiveUpdate(server.baseUrl, {
        id: "00000000-0000-0000-0000-000000000000",
        is_active: false,
      });

      expect(status).toBe(500);
      expect(errMessage(json)).toBeTruthy();
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

    it("match_key: unique match via match_key column, verification wrong_part vs part_no", async () => {
      const before = await countIssuesForItem(sql, FX.itemMatchKey);
      const idem = `${CONTRACT_IDEM_PREFIX}-mk-1`;
      const { status, json } = await postScans(server.baseUrl, {
        scanned_code: "CONTRACT-MK-LOOKUP",
        scan_type: "unload",
        scope_shipment_id: FX.shipmentMain,
        idempotency_key: idem,
      });
      expect(status).toBe(201);
      expect(isRecord(json)).toBe(true);
      if (!isRecord(json)) return;
      const match = json.match as Record<string, unknown>;
      expect(match.kind).toBe("unique");
      expect(match.shipment_item_id).toBe(FX.itemMatchKey);
      const se = json.scanEvent as Record<string, unknown>;
      expect(se.shipment_item_id).toBe(FX.itemMatchKey);
      expect(se.result_status).toBe("wrong_part");
      const ver = json.verification as Record<string, unknown> | null;
      expect(ver?.status).toBe("wrong_part");
      expect(json.issue).toBeTruthy();
      const after = await countIssuesForItem(sql, FX.itemMatchKey);
      expect(after).toBe(before + 1);
    });

    it("shortage: cumulative below quantity_expected", async () => {
      const idem = `${CONTRACT_IDEM_PREFIX}-sh-1`;
      const beforeIssues = await countIssuesForItem(sql, FX.itemShort);
      const beforeProg = await getProgressRow(sql, FX.itemShort);
      expect(beforeProg?.quantity_scanned_total).toBe("0");

      const { status, json } = await postScans(server.baseUrl, {
        scanned_code: "NO-SH-005",
        scan_type: "unload",
        scope_shipment_id: FX.shipmentMain,
        idempotency_key: idem,
      });
      expect(status).toBe(201);
      expect(isRecord(json)).toBe(true);
      if (!isRecord(json)) return;
      expect(json.created_new_scan).toBe(true);
      expect(json.idempotency_hit).toBe(false);
      const se = json.scanEvent as Record<string, unknown>;
      expect(se.result_status).toBe("shortage");
      expect(se.shipment_item_id).toBe(FX.itemShort);
      const ver = json.verification as Record<string, unknown> | null;
      expect(ver?.status).toBe("shortage");
      expect(json.issue).toBeTruthy();
      const match = json.match as Record<string, unknown>;
      expect(match.kind).toBe("unique");
      expect(match.shipment_item_id).toBe(FX.itemShort);
      expect(await countScanEventsByIdem(sql, idem)).toBe(1);
      const prog = await getProgressRow(sql, FX.itemShort);
      expect(prog?.quantity_scanned_total).toBe("1");
      expect(prog?.progress_status).toBe("shortage");
      expect(await countIssuesForItem(sql, FX.itemShort)).toBe(beforeIssues + 1);
    });

    it("excess: quantity_scanned delta over expected in one POST", async () => {
      const idem = `${CONTRACT_IDEM_PREFIX}-ex-1`;
      const beforeIssues = await countIssuesForItem(sql, FX.itemExcess);
      const beforeProg = await getProgressRow(sql, FX.itemExcess);
      expect(beforeProg?.quantity_scanned_total).toBe("0");

      const { status, json } = await postScans(server.baseUrl, {
        scanned_code: "NO-EX-006",
        scan_type: "unload",
        scope_shipment_id: FX.shipmentMain,
        quantity_scanned: 3,
        idempotency_key: idem,
      });
      expect(status).toBe(201);
      expect(isRecord(json)).toBe(true);
      if (!isRecord(json)) return;
      expect(json.created_new_scan).toBe(true);
      expect(json.idempotency_hit).toBe(false);
      const se = json.scanEvent as Record<string, unknown>;
      expect(se.result_status).toBe("excess");
      expect(se.shipment_item_id).toBe(FX.itemExcess);
      const ver = json.verification as Record<string, unknown> | null;
      expect(ver?.status).toBe("excess");
      expect(json.issue).toBeTruthy();
      const match = json.match as Record<string, unknown>;
      expect(match.kind).toBe("unique");
      expect(match.shipment_item_id).toBe(FX.itemExcess);
      expect(await countScanEventsByIdem(sql, idem)).toBe(1);
      const prog = await getProgressRow(sql, FX.itemExcess);
      expect(prog?.quantity_scanned_total).toBe("3");
      expect(prog?.progress_status).toBe("excess");
      expect(await countIssuesForItem(sql, FX.itemExcess)).toBe(beforeIssues + 1);
    });

    it("shortage: idempotency replay does not duplicate scan_events, progress, or issues", async () => {
      const idem = `${CONTRACT_IDEM_PREFIX}-sh-idem-1`;
      const body = {
        scanned_code: "NO-SH-IDEM",
        scan_type: "unload",
        scope_shipment_id: FX.shipmentMain,
        idempotency_key: idem,
      };
      const beforeProg = await getProgressRow(sql, FX.itemShortIdem);
      expect(beforeProg?.quantity_scanned_total).toBe("0");

      const r1 = await postScans(server.baseUrl, body);
      expect(r1.status).toBe(201);
      const j1 = r1.json;
      expect(isRecord(j1)).toBe(true);
      if (!isRecord(j1)) return;
      expect(j1.created_new_scan).toBe(true);
      expect(j1.idempotency_hit).toBe(false);
      const se1 = j1.scanEvent as Record<string, unknown>;
      expect(se1.result_status).toBe("shortage");
      expect(se1.shipment_item_id).toBe(FX.itemShortIdem);
      const m1 = j1.match as Record<string, unknown>;
      expect(m1.kind).toBe("unique");
      expect(m1.shipment_item_id).toBe(FX.itemShortIdem);
      expect(await countScanEventsByIdem(sql, idem)).toBe(1);
      const prog1 = await getProgressRow(sql, FX.itemShortIdem);
      expect(prog1?.quantity_scanned_total).toBe("1");
      expect(prog1?.progress_status).toBe("shortage");
      const issuesAfterFirst = await countIssuesForItem(sql, FX.itemShortIdem);
      expect(issuesAfterFirst).toBe(1);

      const r2 = await postScans(server.baseUrl, body);
      expect(r2.status).toBe(200);
      const j2 = r2.json;
      expect(isRecord(j2)).toBe(true);
      if (!isRecord(j2)) return;
      expect(j2.idempotency_hit).toBe(true);
      expect(j2.created_new_scan).toBe(false);
      const se2 = j2.scanEvent as Record<string, unknown>;
      expect(se2.result_status).toBe("shortage");
      expect(se2.shipment_item_id).toBe(FX.itemShortIdem);
      const m2 = j2.match as Record<string, unknown>;
      expect(m2.kind).toBe("unique");
      expect(m2.shipment_item_id).toBe(FX.itemShortIdem);
      expect(await countScanEventsByIdem(sql, idem)).toBe(1);
      const prog2 = await getProgressRow(sql, FX.itemShortIdem);
      expect(prog2?.quantity_scanned_total).toBe("1");
      expect(prog2?.progress_status).toBe("shortage");
      expect(await countIssuesForItem(sql, FX.itemShortIdem)).toBe(issuesAfterFirst);
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
      const top = json.ambiguous_candidates as unknown[] | undefined;
      expect(Array.isArray(top)).toBe(true);
      expect((top as unknown[]).length).toBe((cands as unknown[]).length);
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

  describe("verifyScanAgainstShipmentItem — unknown (engine contract)", () => {
    it("unknown when quantity_expected is not numeric (mirrors POST path if row were corrupt)", () => {
      const item: ShipmentItem = {
        id: "d0000000-0000-4000-8000-000000000099",
        shipment_id: FX.shipmentMain,
        line_no: 99,
        trace_id: "tr-verify-unk",
        part_no: "QTY-UNK-PN",
        part_name: null,
        quantity_expected: "not-a-number",
        quantity_unit: null,
        unload_location: null,
        delivery_date: null,
        lot_no: null,
        external_barcode: null,
        match_key: null,
        status: "planned",
        source_row_no: 99,
        created_at: "2020-01-01T00:00:00.000Z",
        updated_at: "2020-01-01T00:00:00.000Z",
      };
      const input: ScanInputPayload = {
        scanned_code: "QTY-UNK-PN",
        scan_type: "unload",
      };
      const r = verifyScanAgainstShipmentItem(item, input, 0, 1);
      expect(r.status).toBe("unknown");
      expect(r.expected?.shipment_item_id).toBe(item.id);
      expect(r.issue).toBeUndefined();
    });
  });
});
