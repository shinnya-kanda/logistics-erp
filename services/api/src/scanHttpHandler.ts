import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { processScanInput, rebuildShipment, requireDatabaseUrl } from "@logistics-erp/db";
import { ScanInputValidationError } from "@logistics-erp/schema";
import postgres from "postgres";

export type ScanHttpHandlerOptions = {
  /** Access-Control-Allow-Origin（既定 *） */
  corsOrigin?: string;
};

function setCors(res: ServerResponse, corsOrigin: string): void {
  res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw.trim() ? JSON.parse(raw) : {};
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function stringOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function parsePositiveQuantity(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseStringArray(v: unknown): string[] | null {
  if (v === undefined || v === null) return null;
  if (!Array.isArray(v)) return null;
  const out = v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean);
  return out.length === v.length ? out : null;
}

/**
 * POST /scans, GET /health, OPTIONS, 404。scanHttp.ts と契約テストで共有。
 */
export async function handleScanHttp(
  req: IncomingMessage,
  res: ServerResponse,
  options?: ScanHttpHandlerOptions
): Promise<void> {
  const corsOrigin = options?.corsOrigin ?? "*";
  setCors(res, corsOrigin);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/scans") {
    try {
      let body: unknown;
      try {
        body = await readJsonBody(req);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON body" }));
        return;
      }

      const result = await processScanInput(body);
      const statusCode = result.created_new_scan ? 201 : 200;
      res.writeHead(statusCode, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (e) {
      if (e instanceof ScanInputValidationError) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
        return;
      }
      console.error("[logistics-erp/scan-api]", e);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: e instanceof Error ? e.message : "Internal error",
        })
      );
    }
    return;
  }

  if (req.method === "POST" && req.url === "/rebuild") {
    try {
      let body: unknown;
      try {
        body = await readJsonBody(req);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Invalid JSON body" }));
        return;
      }

      const shipmentId = isRecord(body) ? body.shipment_id : undefined;
      if (typeof shipmentId !== "string" || !shipmentId.trim()) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "shipment_id is required" }));
        return;
      }

      const result = await rebuildShipment(shipmentId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, ...result }));
    } catch (e) {
      console.error("[logistics-erp/rebuild-api]", e);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "failed to rebuild shipment" }));
    }
    return;
  }

  if (req.method === "POST" && req.url === "/inventory/out") {
    try {
      let body: unknown;
      try {
        body = await readJsonBody(req);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Invalid JSON body" }));
        return;
      }

      if (!isRecord(body)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "request body must be an object" }));
        return;
      }

      const partNo = stringOrNull(body.part_no);
      const quantity = parsePositiveQuantity(body.quantity);
      const warehouseCode = stringOrNull(body.warehouse_code);
      const fromLocationCodes = parseStringArray(body.from_location_codes);

      if (!partNo) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "part_no is required" }));
        return;
      }
      if (quantity === null) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "quantity must be positive" }));
        return;
      }
      if (!warehouseCode) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "warehouse_code is required" }));
        return;
      }
      if (body.from_location_codes !== undefined && fromLocationCodes === null) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "from_location_codes must be an array of strings" }));
        return;
      }

      const sql = postgres(requireDatabaseUrl(), { max: 1 });
      try {
        const rows = await sql`
          SELECT *
          FROM public.create_distributed_inventory_out(
            p_part_no => ${partNo},
            p_quantity => ${String(quantity)}::numeric,
            p_warehouse_code => ${warehouseCode},
            p_from_location_codes => ${fromLocationCodes}::text[],
            p_inventory_type => ${stringOrNull(body.inventory_type) ?? "project"},
            p_project_no => ${stringOrNull(body.project_no)},
            p_mrp_key => ${stringOrNull(body.mrp_key)},
            p_quantity_unit => ${stringOrNull(body.quantity_unit)},
            p_idempotency_key => ${stringOrNull(body.idempotency_key)},
            p_event_at => now(),
            p_operator_id => ${stringOrNull(body.operator_id)},
            p_operator_name => ${stringOrNull(body.operator_name)},
            p_remarks => ${stringOrNull(body.remarks)}
          )
        `;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, transactions: rows }));
      } finally {
        await sql.end({ timeout: 5 });
      }
    } catch (e) {
      const err = e as { code?: string; message?: string };
      const status = err.code === "23514" ? 400 : 500;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error: err.message ?? "failed to create inventory out",
        })
      );
    }
    return;
  }

  if (req.method === "POST" && req.url === "/inventory/in") {
    try {
      let body: unknown;
      try {
        body = await readJsonBody(req);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Invalid JSON body" }));
        return;
      }

      if (!isRecord(body)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "request body must be an object" }));
        return;
      }

      const partNo = stringOrNull(body.part_no);
      const quantity = parsePositiveQuantity(body.quantity);
      const warehouseCode = stringOrNull(body.warehouse_code);
      const toLocationCode = stringOrNull(body.to_location_code);

      if (!partNo) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "part_no is required" }));
        return;
      }
      if (quantity === null) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "quantity must be positive" }));
        return;
      }
      if (!warehouseCode) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "warehouse_code is required" }));
        return;
      }
      if (!toLocationCode) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "to_location_code is required" }));
        return;
      }

      const sql = postgres(requireDatabaseUrl(), { max: 1 });
      try {
        const rows = await sql`
          SELECT *
          FROM public.create_inventory_in(
            p_part_no => ${partNo},
            p_quantity => ${String(quantity)}::numeric,
            p_warehouse_code => ${warehouseCode},
            p_to_location_code => ${toLocationCode},
            p_part_name => ${stringOrNull(body.part_name)},
            p_inventory_type => ${stringOrNull(body.inventory_type) ?? "project"},
            p_project_no => ${stringOrNull(body.project_no)},
            p_mrp_key => ${stringOrNull(body.mrp_key)},
            p_quantity_unit => ${stringOrNull(body.quantity_unit)},
            p_idempotency_key => ${stringOrNull(body.idempotency_key)},
            p_event_at => now(),
            p_operator_id => ${stringOrNull(body.operator_id)},
            p_operator_name => ${stringOrNull(body.operator_name)},
            p_remarks => ${stringOrNull(body.remarks)}
          )
        `;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, transaction: rows[0] ?? null }));
      } finally {
        await sql.end({ timeout: 5 });
      }
    } catch (e) {
      const err = e as { code?: string; message?: string };
      const status = err.code === "23514" ? 400 : 500;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error: err.message ?? "failed to create inventory in",
        })
      );
    }
    return;
  }

  if (req.method === "POST" && req.url === "/inventory/move") {
    try {
      let body: unknown;
      try {
        body = await readJsonBody(req);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Invalid JSON body" }));
        return;
      }

      if (!isRecord(body)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "request body must be an object" }));
        return;
      }

      const partNo = stringOrNull(body.part_no);
      const quantity = parsePositiveQuantity(body.quantity);
      const warehouseCode = stringOrNull(body.warehouse_code);
      const fromLocationCode = stringOrNull(body.from_location_code);
      const toLocationCode = stringOrNull(body.to_location_code);

      if (!partNo) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "part_no is required" }));
        return;
      }
      if (quantity === null) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "quantity must be positive" }));
        return;
      }
      if (!warehouseCode) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "warehouse_code is required" }));
        return;
      }
      if (!fromLocationCode) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "from_location_code is required" }));
        return;
      }
      if (!toLocationCode) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "to_location_code is required" }));
        return;
      }
      if (fromLocationCode === toLocationCode) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          ok: false,
          error: "from_location_code and to_location_code must differ",
        }));
        return;
      }

      const idempotencyKey = stringOrNull(body.idempotency_key) ?? randomUUID();
      const sql = postgres(requireDatabaseUrl(), { max: 1 });
      try {
        const rows = await sql<{ result: unknown }[]>`
          SELECT public.create_inventory_move(
            p_part_no => ${partNo},
            p_quantity => ${String(quantity)}::numeric,
            p_warehouse_code => ${warehouseCode},
            p_from_location_code => ${fromLocationCode},
            p_to_location_code => ${toLocationCode},
            p_idempotency_key => ${idempotencyKey},
            p_inventory_type => ${stringOrNull(body.inventory_type) ?? "project"},
            p_project_no => ${stringOrNull(body.project_no)},
            p_mrp_key => ${stringOrNull(body.mrp_key)},
            p_quantity_unit => ${stringOrNull(body.quantity_unit)},
            p_event_at => now(),
            p_operator_id => ${stringOrNull(body.operator_id)},
            p_operator_name => ${stringOrNull(body.operator_name)},
            p_remarks => ${stringOrNull(body.remarks)}
          ) AS result
        `;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(rows[0]?.result ?? { ok: true, move: null }));
      } finally {
        await sql.end({ timeout: 5 });
      }
    } catch (e) {
      const err = e as { code?: string; message?: string };
      const status = err.code === "23514" ? 400 : 500;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error: err.message ?? "failed to create inventory move",
        })
      );
    }
    return;
  }

  if (req.method === "POST" && req.url === "/pallets/create") {
    try {
      let body: unknown;
      try {
        body = await readJsonBody(req);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Invalid JSON body" }));
        return;
      }

      if (!isRecord(body)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "request body must be an object" }));
        return;
      }

      const palletCode = stringOrNull(body.pallet_code);
      const warehouseCode = stringOrNull(body.warehouse_code);

      if (!palletCode || !warehouseCode) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          ok: false,
          error: "pallet_code and warehouse_code required",
        }));
        return;
      }

      const sql = postgres(requireDatabaseUrl(), { max: 1 });
      try {
        const rows = await sql<{ result: unknown }[]>`
          SELECT public.create_pallet(
            p_pallet_code => ${palletCode},
            p_warehouse_code => ${warehouseCode},
            p_created_by => ${stringOrNull(body.created_by)},
            p_remarks => ${stringOrNull(body.remarks)},
            p_inventory_type => ${stringOrNull(body.inventory_type) ?? "project"}
          ) AS result
        `;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(rows[0]?.result ?? { ok: false, error: "empty create_pallet result" }));
      } finally {
        await sql.end({ timeout: 5 });
      }
    } catch (e) {
      const err = e as { message?: string };
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error: err.message ?? "failed to create pallet",
        })
      );
    }
    return;
  }

  if (req.method === "POST" && req.url === "/pallets/items/add") {
    try {
      let body: unknown;
      try {
        body = await readJsonBody(req);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Invalid JSON body" }));
        return;
      }

      if (!isRecord(body)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "request body must be an object" }));
        return;
      }

      const palletCode = stringOrNull(body.pallet_code);
      const partNo = stringOrNull(body.part_no);
      const quantity = parsePositiveQuantity(body.quantity);
      const warehouseCode = stringOrNull(body.warehouse_code);

      if (!palletCode) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "pallet_code is required" }));
        return;
      }
      if (!partNo) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "part_no is required" }));
        return;
      }
      if (quantity === null) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "quantity must be positive" }));
        return;
      }
      if (!warehouseCode) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "warehouse_code is required" }));
        return;
      }

      const sql = postgres(requireDatabaseUrl(), { max: 1 });
      try {
        const rows = await sql<{ result: unknown }[]>`
          SELECT public.add_pallet_item(
            p_pallet_code => ${palletCode},
            p_part_no => ${partNo},
            p_quantity => ${String(quantity)}::numeric,
            p_warehouse_code => ${warehouseCode},
            p_quantity_unit => ${stringOrNull(body.quantity_unit) ?? "pcs"},
            p_created_by => ${stringOrNull(body.created_by)},
            p_remarks => ${stringOrNull(body.remarks)}
          ) AS result
        `;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(rows[0]?.result ?? { ok: false, error: "empty add_pallet_item result" }));
      } finally {
        await sql.end({ timeout: 5 });
      }
    } catch (e) {
      const err = e as { message?: string };
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error: err.message ?? "failed to add pallet item",
        })
      );
    }
    return;
  }

  if (req.method === "POST" && req.url === "/pallets/move") {
    try {
      let body: unknown;
      try {
        body = await readJsonBody(req);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Invalid JSON body" }));
        return;
      }

      if (!isRecord(body)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "request body must be an object" }));
        return;
      }

      const palletCode = stringOrNull(body.pallet_code);
      const toLocationCode = stringOrNull(body.to_location_code);
      const warehouseCode = stringOrNull(body.warehouse_code) ?? "KOMATSU";

      if (!palletCode) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "pallet_code is required" }));
        return;
      }
      if (!toLocationCode) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "to_location_code is required" }));
        return;
      }
      if (!warehouseCode) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "warehouse_code is required" }));
        return;
      }

      const idempotencyKey = stringOrNull(body.idempotency_key) ?? randomUUID();
      const sql = postgres(requireDatabaseUrl(), { max: 1 });
      try {
        const rows = await sql<{ result: unknown }[]>`
          SELECT public.move_pallet(
            p_pallet_code => ${palletCode},
            p_to_location_code => ${toLocationCode},
            p_warehouse_code => ${warehouseCode},
            p_operator_id => ${stringOrNull(body.operator_id)},
            p_operator_name => ${stringOrNull(body.operator_name)},
            p_remarks => ${stringOrNull(body.remarks)},
            p_idempotency_key => ${idempotencyKey}
          ) AS result
        `;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(rows[0]?.result ?? { ok: false, error: "empty move_pallet result" }));
      } finally {
        await sql.end({ timeout: 5 });
      }
    } catch (e) {
      const err = e as { message?: string };
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error: err.message ?? "failed to move pallet",
        })
      );
    }
    return;
  }

  if (req.method === "POST" && req.url === "/pallets/out") {
    try {
      let body: unknown;
      try {
        body = await readJsonBody(req);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Invalid JSON body" }));
        return;
      }

      if (!isRecord(body)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "request body must be an object" }));
        return;
      }

      const palletCode = stringOrNull(body.pallet_code);
      const warehouseCode = stringOrNull(body.warehouse_code) ?? "KOMATSU";

      if (!palletCode) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "pallet_code is required" }));
        return;
      }
      if (!warehouseCode) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "warehouse_code is required" }));
        return;
      }

      const idempotencyKey = stringOrNull(body.idempotency_key) ?? randomUUID();
      const sql = postgres(requireDatabaseUrl(), { max: 1 });
      try {
        const rows = await sql<{ result: unknown }[]>`
          SELECT public.out_pallet(
            p_pallet_code => ${palletCode},
            p_warehouse_code => ${warehouseCode},
            p_operator_id => ${stringOrNull(body.operator_id)},
            p_operator_name => ${stringOrNull(body.operator_name)},
            p_remarks => ${stringOrNull(body.remarks)},
            p_idempotency_key => ${idempotencyKey}
          ) AS result
        `;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(rows[0]?.result ?? { ok: false, error: "empty out_pallet result" }));
      } finally {
        await sql.end({ timeout: 5 });
      }
    } catch (e) {
      const err = e as { message?: string };
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error: err.message ?? "failed to out pallet",
        })
      );
    }
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "scan-minimal" }));
    return;
  }

  res.writeHead(404);
  res.end();
}

export function createScanHttpServer(
  options?: ScanHttpHandlerOptions
): import("node:http").Server {
  return createServer((req, res) => {
    void handleScanHttp(req, res, options);
  });
}
