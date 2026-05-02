import { loadEnv } from "@logistics-erp/db/load-env";
import { createScanHttpServer } from "./scanHttpHandler.js";

loadEnv();

/** POST /scans: 201 = 新規 scan_events 行作成, 200 = idempotency replay（同一 idempotency_key） */
const port = Number(process.env.SCAN_HTTP_PORT ?? "3040");
const scanCorsOrigin = "*";

const server = createScanHttpServer({ corsOrigin: scanCorsOrigin });

server.listen(port, () => {
  console.log(
    `[logistics-erp/scan-api] listening on http://localhost:${port} POST /scans`
  );
});
