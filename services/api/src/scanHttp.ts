import { createServer } from "node:http";
import { processScanInput } from "@logistics-erp/db";
import { ScanInputValidationError } from "@logistics-erp/schema";
import { loadEnv } from "@logistics-erp/db/load-env";

loadEnv();

/** POST /scans: 201 = 新規 scan_events 行作成, 200 = idempotency replay（同一 idempotency_key） */
const port = Number(process.env.SCAN_HTTP_PORT ?? "3040");

const server = createServer(async (req, res) => {
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
});

server.listen(port, () => {
  console.log(
    `[logistics-erp/scan-api] listening on http://localhost:${port} POST /scans`
  );
});
