import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { processScanInput, rebuildShipment, requireDatabaseUrl } from "@logistics-erp/db";
import { ScanInputValidationError } from "@logistics-erp/schema";
import postgres from "postgres";

export type ScanHttpHandlerOptions = {
  /** Access-Control-Allow-Origin（既定 *） */
  corsOrigin?: string;
};

function setCors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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

function booleanOrNull(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  if (s === "true") return true;
  if (s === "false") return false;
  return null;
}

function parseRequestUrl(req: IncomingMessage): URL {
  return new URL(req.url ?? "/", "http://localhost");
}

function errorCodeOf(v: unknown): string | null {
  if (!isRecord(v) || v.ok !== false || typeof v.error !== "string") return null;
  return v.error;
}

function palletItemOutMessage(error: string): string | null {
  if (error === "pallet_not_found") return "パレットが見つかりません";
  if (error === "pallet_already_out") return "出庫済みパレットです";
  if (error === "pallet_item_not_found") return "このパレットに対象品番がありません";
  if (error === "insufficient_pallet_item_quantity") return "パレット内数量が不足しています";
  return null;
}

/**
 * POST /scans, GET /health, OPTIONS, 404。scanHttp.ts と契約テストで共有。
 */
export async function handleScanHttp(
  req: IncomingMessage,
  res: ServerResponse,
  options?: ScanHttpHandlerOptions
): Promise<void> {
  setCors(res);
  const requestUrl = parseRequestUrl(req);
  const pathname = requestUrl.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && pathname === "/scans") {
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

  if (req.method === "POST" && pathname === "/rebuild") {
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

  if (req.method === "POST" && pathname === "/inventory/out") {
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

  if (req.method === "POST" && pathname === "/inventory/in") {
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

  if (req.method === "POST" && pathname === "/inventory/move") {
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

  if (req.method === "POST" && pathname === "/pallets/create") {
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
      const projectNo = stringOrNull(body.project_no) ?? warehouseCode;

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
            p_inventory_type => ${stringOrNull(body.inventory_type) ?? "project"},
            p_project_no => ${projectNo}
          ) AS result
        `;
        const result = rows[0]?.result ?? { ok: false, error: "empty create_pallet result" };
        if (errorCodeOf(result) === "pallet_code_already_exists") {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              ok: false,
              error: "pallet_code_already_exists",
              message: "このPLコードはすでに登録されています",
            })
          );
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
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

  if (req.method === "POST" && pathname === "/pallets/items/add") {
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
      const projectNo = stringOrNull(body.project_no) ?? warehouseCode;

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
            p_remarks => ${stringOrNull(body.remarks)},
            p_project_no => ${projectNo}
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

  if (req.method === "POST" && pathname === "/pallets/items/out") {
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
      const warehouseCode = stringOrNull(body.warehouse_code) ?? "KOMATSU";
      const projectNo = stringOrNull(body.project_no) ?? warehouseCode;

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

      const idempotencyKey = stringOrNull(body.idempotency_key) ?? randomUUID();
      const sql = postgres(requireDatabaseUrl(), { max: 1 });
      try {
        const rows = await sql<{ result: unknown }[]>`
          SELECT public.out_pallet_item(
            p_pallet_code => ${palletCode},
            p_part_no => ${partNo},
            p_quantity => ${String(quantity)}::numeric,
            p_warehouse_code => ${warehouseCode},
            p_operator_id => ${stringOrNull(body.operator_id)},
            p_operator_name => ${stringOrNull(body.operator_name)},
            p_remarks => ${stringOrNull(body.remarks)},
            p_idempotency_key => ${idempotencyKey},
            p_project_no => ${projectNo}
          ) AS result
        `;
        const result = rows[0]?.result ?? { ok: false, error: "empty out_pallet_item result" };
        const errorCode = errorCodeOf(result);
        const message = errorCode ? palletItemOutMessage(errorCode) : null;
        if (errorCode && message) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: errorCode, message }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } finally {
        await sql.end({ timeout: 5 });
      }
    } catch (e) {
      const err = e as { message?: string };
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error: err.message ?? "failed to out pallet item",
        })
      );
    }
    return;
  }

  if (req.method === "POST" && pathname === "/pallets/move") {
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
      const projectNo = stringOrNull(body.project_no) ?? warehouseCode;

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
            p_idempotency_key => ${idempotencyKey},
            p_project_no => ${projectNo}
          ) AS result
        `;
        const result = rows[0]?.result ?? { ok: false, error: "empty move_pallet result" };
        if (errorCodeOf(result) === "location_already_occupied") {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              ok: false,
              error: "location_already_occupied",
              message: "この棚はすでに別のパレットで使用中です",
            })
          );
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
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

  if (req.method === "POST" && pathname === "/pallets/out") {
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
      const projectNo = stringOrNull(body.project_no) ?? warehouseCode;

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
            p_idempotency_key => ${idempotencyKey},
            p_project_no => ${projectNo}
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

  if (req.method === "GET" && pathname === "/pallets/search") {
    const warehouseCode = requestUrl.searchParams.get("warehouse_code")?.trim();
    const projectNo = requestUrl.searchParams.get("project_no")?.trim();
    const rawStatus = requestUrl.searchParams.get("status")?.trim().toUpperCase();
    const statusFilter = rawStatus && rawStatus !== "ALL" ? rawStatus : null;
    const partNo = requestUrl.searchParams.get("part_no")?.trim();
    const palletCode = requestUrl.searchParams.get("pallet_code")?.trim();
    if (!warehouseCode && !projectNo && !partNo && !palletCode) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error: "warehouse_code or project_no or part_no or pallet_code is required",
        })
      );
      return;
    }
    if (statusFilter !== null && statusFilter !== "ACTIVE" && statusFilter !== "OUT") {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "status must be ACTIVE or OUT" }));
      return;
    }

    const sql = postgres(requireDatabaseUrl(), { max: 1 });
    try {
      const linkColumnRows = await sql<{ column_name: string }[]>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'pallet_item_links'
          AND column_name IN ('part_name', 'unlinked_at', 'updated_at')
      `;
      const unitColumnRows = await sql<{ column_name: string }[]>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'pallet_units'
          AND column_name IN ('updated_at')
      `;
      const linkColumns = new Set(linkColumnRows.map((row) => row.column_name));
      const unitColumns = new Set(unitColumnRows.map((row) => row.column_name));
      const partNameSelect = linkColumns.has("part_name") ? "pil.part_name" : "null::text";
      const unlinkedJoin = linkColumns.has("unlinked_at")
        ? "and pil.unlinked_at is null"
        : "";
      const unitUpdatedAtSelect = unitColumns.has("updated_at")
        ? "pu.updated_at"
        : "null::timestamptz";
      const updatedAtSelect = linkColumns.has("updated_at")
        ? `coalesce(pil.updated_at, ${unitUpdatedAtSelect}, pu.created_at)`
        : `coalesce(${unitUpdatedAtSelect}, pu.created_at)`;

      const rows = await sql.unsafe(
        `
          SELECT
            pu.id AS pallet_id,
            pu.pallet_code,
            pu.warehouse_code,
            pu.project_no,
            pu.current_location_code,
            pu.current_status,
            pil.part_no,
            ${partNameSelect} AS part_name,
            pil.quantity,
            pil.quantity_unit,
            ${updatedAtSelect} AS updated_at
          FROM public.pallet_units pu
          LEFT JOIN public.pallet_item_links pil
            ON pil.pallet_id = pu.id
            ${unlinkedJoin}
          WHERE (
              ($1::text IS NOT NULL AND coalesce(pu.project_no, pu.warehouse_code) = $1)
              OR ($1::text IS NULL AND ($2::text IS NULL OR pu.warehouse_code = $2))
            )
            AND ($3::text IS NULL OR pu.current_status = $3)
            AND ($4::text IS NULL OR pil.part_no ILIKE ('%' || $4 || '%'))
            AND ($5::text IS NULL OR pu.pallet_code ILIKE ('%' || $5 || '%'))
          ORDER BY
            pu.current_location_code ASC NULLS LAST,
            pu.pallet_code ASC,
            pil.part_no ASC NULLS LAST
        `,
        [projectNo || null, warehouseCode || null, statusFilter, partNo || null, palletCode || null]
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, pallets: rows }));
    } catch (e) {
      const err = e as { message?: string };
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error: err.message ?? "failed to search pallets",
        })
      );
    } finally {
      await sql.end({ timeout: 5 });
    }
    return;
  }

  if (req.method === "GET" && pathname === "/pallets/empty") {
    const warehouseCode = requestUrl.searchParams.get("warehouse_code")?.trim() || "KOMATSU";
    const projectNo = requestUrl.searchParams.get("project_no")?.trim() || null;
    const sql = postgres(requireDatabaseUrl(), { max: 1 });
    try {
      const rows = await sql`
        SELECT *
        FROM public.get_empty_pallets(${warehouseCode}, ${projectNo})
      `;

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, pallets: rows }));
    } catch (e) {
      const err = e as { message?: string };
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error: err.message ?? "failed to get empty pallets",
        })
      );
    } finally {
      await sql.end({ timeout: 5 });
    }
    return;
  }

  if (req.method === "POST" && pathname === "/pallets/project-no/update") {
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
      const projectNo = stringOrNull(body.project_no);

      if (!palletCode) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "pallet_code is required" }));
        return;
      }
      if (!projectNo) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "project_no is required" }));
        return;
      }

      const sql = postgres(requireDatabaseUrl(), { max: 1 });
      try {
        type ProjectNoPalletRow = {
          pallet_id: string;
          pallet_code: string;
          warehouse_code: string;
          project_no: string | null;
          current_location_code: string | null;
          current_status: string | null;
        };

        await sql`BEGIN`;
        let result: { pallet: ProjectNoPalletRow; updated_item_link_count: number } | null = null;
        try {
          const palletRows = await sql<ProjectNoPalletRow[]>`
              SELECT
                id AS pallet_id,
                pallet_code,
                warehouse_code,
                project_no,
                current_location_code,
                current_status
              FROM public.pallet_units
              WHERE pallet_code = ${palletCode}
              FOR UPDATE
              LIMIT 1
            `;

          const pallet = palletRows[0];
          if (pallet) {
            const updatedPalletRows = await sql<ProjectNoPalletRow[]>`
              UPDATE public.pallet_units
              SET project_no = ${projectNo}
              WHERE id = ${pallet.pallet_id}
              RETURNING
                id AS pallet_id,
                pallet_code,
                warehouse_code,
                project_no,
                current_location_code,
                current_status
            `;

            const updatedLinks = await sql<{ id: string }[]>`
              UPDATE public.pallet_item_links
              SET project_no = ${projectNo}
              WHERE pallet_id = ${pallet.pallet_id}
                AND unlinked_at IS NULL
              RETURNING id
            `;

            result = {
              pallet: updatedPalletRows[0],
              updated_item_link_count: updatedLinks.length,
            };
          }

          await sql`COMMIT`;
        } catch (e) {
          await sql`ROLLBACK`;
          throw e;
        }

        if (!result) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "pallet_not_found" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, ...result }));
      } finally {
        await sql.end({ timeout: 5 });
      }
    } catch (e) {
      const err = e as { message?: string };
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error: err.message ?? "failed to update pallet project_no",
        })
      );
    }
    return;
  }

  if (req.method === "GET" && pathname === "/warehouse-locations/search") {
    const warehouseCode = requestUrl.searchParams.get("warehouse_code")?.trim();
    const locationCode = requestUrl.searchParams.get("location_code")?.trim();
    const rawIsActive = requestUrl.searchParams.get("is_active")?.trim();
    const isActive = rawIsActive === undefined ? null : booleanOrNull(rawIsActive);

    if (rawIsActive !== undefined && isActive === null) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "is_active must be true or false" }));
      return;
    }

    const sql = postgres(requireDatabaseUrl(), { max: 1 });
    try {
      const rows = await sql`
        SELECT
          id,
          warehouse_code,
          location_code,
          is_active,
          remarks,
          updated_at
        FROM public.warehouse_locations
        WHERE (${warehouseCode ?? null}::text IS NULL OR warehouse_code = ${warehouseCode ?? null})
          AND (${locationCode ?? null}::text IS NULL OR location_code ILIKE ('%' || ${locationCode ?? null} || '%'))
          AND (${isActive}::boolean IS NULL OR is_active = ${isActive})
        ORDER BY warehouse_code ASC, location_code ASC
      `;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, locations: rows }));
    } catch (e) {
      const err = e as { message?: string };
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err.message ?? "failed to search warehouse locations" }));
    } finally {
      await sql.end({ timeout: 5 });
    }
    return;
  }

  if (req.method === "GET" && pathname === "/warehouse-locations/unregistered") {
    const sql = postgres(requireDatabaseUrl(), { max: 1 });
    try {
      const rows = await sql`
        SELECT
          pu.warehouse_code,
          pu.current_location_code AS location_code,
          COUNT(*)::int AS usage_count
        FROM public.pallet_units pu
        LEFT JOIN public.warehouse_locations wl
          ON pu.warehouse_code = wl.warehouse_code
         AND pu.current_location_code = wl.location_code
        WHERE pu.current_location_code IS NOT NULL
          AND wl.location_code IS NULL
        GROUP BY pu.warehouse_code, pu.current_location_code
        ORDER BY usage_count DESC, pu.warehouse_code ASC, pu.current_location_code ASC
      `;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, locations: rows }));
    } catch (e) {
      const err = e as { message?: string };
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err.message ?? "failed to get unregistered warehouse locations" }));
    } finally {
      await sql.end({ timeout: 5 });
    }
    return;
  }

  if (req.method === "POST" && pathname === "/warehouse-locations/create") {
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

      const warehouseCode = stringOrNull(body.warehouse_code);
      const locationCode = stringOrNull(body.location_code);
      const isActive = booleanOrNull(body.is_active) ?? true;

      if (!warehouseCode) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "warehouse_code is required" }));
        return;
      }
      if (!locationCode) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "location_code is required" }));
        return;
      }

      const sql = postgres(requireDatabaseUrl(), { max: 1 });
      try {
        const inserted = await sql`
          INSERT INTO public.warehouse_locations (
            warehouse_code,
            location_code,
            is_active,
            remarks,
            updated_at
          )
          VALUES (
            ${warehouseCode},
            ${locationCode},
            ${isActive},
            ${stringOrNull(body.remarks)},
            now()
          )
          ON CONFLICT (warehouse_code, location_code) DO NOTHING
          RETURNING
            id,
            warehouse_code,
            location_code,
            is_active,
            remarks,
            updated_at
        `;

        if (inserted[0]) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, location: inserted[0], created: true }));
          return;
        }

        const existing = await sql`
          SELECT
            id,
            warehouse_code,
            location_code,
            is_active,
            remarks,
            updated_at
          FROM public.warehouse_locations
          WHERE warehouse_code = ${warehouseCode}
            AND location_code = ${locationCode}
          LIMIT 1
        `;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, location: existing[0] ?? null, created: false }));
      } finally {
        await sql.end({ timeout: 5 });
      }
    } catch (e) {
      const err = e as { message?: string };
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err.message ?? "failed to create warehouse location" }));
    }
    return;
  }

  if (req.method === "POST" && pathname === "/warehouse-locations/active/update") {
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

      const id = stringOrNull(body.id);
      const isActive = booleanOrNull(body.is_active);

      if (!id) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "id is required" }));
        return;
      }
      if (isActive === null) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "is_active must be true or false" }));
        return;
      }

      const sql = postgres(requireDatabaseUrl(), { max: 1 });
      try {
        const rows = await sql`
          UPDATE public.warehouse_locations
          SET is_active = ${isActive},
              updated_at = now()
          WHERE id = ${id}
          RETURNING
            id,
            warehouse_code,
            location_code,
            is_active,
            remarks,
            updated_at
        `;

        if (!rows[0]) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "warehouse_location_not_found" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, location: rows[0] }));
      } finally {
        await sql.end({ timeout: 5 });
      }
    } catch (e) {
      const err = e as { message?: string };
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err.message ?? "failed to update warehouse location active" }));
    }
    return;
  }

  if (req.method === "GET" && pathname === "/pallets/detail") {
    const palletCode = requestUrl.searchParams.get("pallet_code")?.trim();
    if (!palletCode) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "pallet_code is required" }));
      return;
    }

    const sql = postgres(requireDatabaseUrl(), { max: 1 });
    try {
      const linkColumnRows = await sql<{ column_name: string }[]>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'pallet_item_links'
          AND column_name IN ('pallet_id', 'pallet_unit_id', 'part_name', 'unlinked_at', 'linked_at', 'updated_at')
      `;
      const unitColumnRows = await sql<{ column_name: string }[]>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'pallet_units'
          AND column_name IN ('updated_at')
      `;
      const linkColumns = new Set(linkColumnRows.map((row) => row.column_name));
      const unitColumns = new Set(unitColumnRows.map((row) => row.column_name));
      const unitUpdatedAtSelect = unitColumns.has("updated_at")
        ? "updated_at"
        : "null::timestamptz";

      const palletRows = await sql.unsafe(
        `
          SELECT
            id AS pallet_id,
            pallet_code,
            warehouse_code,
            project_no,
            current_location_code,
            current_status,
            created_at,
            ${unitUpdatedAtSelect} AS updated_at
          FROM public.pallet_units
          WHERE pallet_code = $1
          LIMIT 1
        `,
        [palletCode]
      );
      const pallet = palletRows[0] as unknown as { pallet_id: string };
      if (!pallet) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "pallet_not_found" }));
        return;
      }

      const palletId = (pallet as { pallet_id: string }).pallet_id;
      const partNameSelect = linkColumns.has("part_name") ? "part_name" : "null::text";
      const linkedAtSelect = linkColumns.has("linked_at") ? "linked_at" : "created_at";
      const linkUpdatedAtSelect = linkColumns.has("updated_at")
        ? "updated_at"
        : "null::timestamptz";
      const linkWhereColumns = [
        linkColumns.has("pallet_id") ? "pallet_id = $1" : null,
        linkColumns.has("pallet_unit_id") ? "pallet_unit_id = $1" : null,
      ].filter(Boolean);
      const unlinkedWhere = linkColumns.has("unlinked_at") ? "AND unlinked_at IS NULL" : "";
      const items = linkWhereColumns.length
        ? await sql.unsafe(
            `
              SELECT
                part_no,
                ${partNameSelect} AS part_name,
                quantity,
                quantity_unit,
                ${linkedAtSelect} AS linked_at,
                ${linkUpdatedAtSelect} AS updated_at
              FROM public.pallet_item_links
              WHERE (${linkWhereColumns.join(" OR ")})
                ${unlinkedWhere}
              ORDER BY part_no ASC NULLS LAST
            `,
            [palletId]
          )
        : [];

      const transactions = await sql.unsafe(
        `
          SELECT
            transaction_type,
            from_location_code,
            to_location_code,
            operator_name,
            remarks,
            idempotency_key,
            occurred_at
          FROM public.pallet_transactions
          WHERE pallet_code = $1
            OR pallet_unit_id = $2
            OR pallet_id = $2
          ORDER BY occurred_at DESC
        `,
        [palletCode, palletId]
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, pallet, items, transactions }));
    } catch (e) {
      const err = e as { message?: string };
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error: err.message ?? "failed to get pallet detail",
        })
      );
    } finally {
      await sql.end({ timeout: 5 });
    }
    return;
  }

  if (req.method === "GET" && pathname === "/health") {
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
