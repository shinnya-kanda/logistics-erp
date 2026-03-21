import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { processScanInput } from "@logistics-erp/db";
import { ScanInputValidationError } from "@logistics-erp/schema";

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
    const chunks: Buffer[] = [];
    try {
      for await (const chunk of req) {
        chunks.push(chunk as Buffer);
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      let body: unknown;
      try {
        body = raw.trim() ? JSON.parse(raw) : {};
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
