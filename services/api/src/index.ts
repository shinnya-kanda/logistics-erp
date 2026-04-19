import { createServer } from "node:http";
import { loadEnv } from "@logistics-erp/db/load-env";
import { createClient } from "@supabase/supabase-js";
import { handleScanHttp } from "./scanHttpHandler.js";

loadEnv();

const supabaseUrl = (process.env.SUPABASE_URL ?? "").trim();
const supabaseKey = (process.env.SUPABASE_ANON_KEY ?? "").trim();

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "SUPABASE_URL と SUPABASE_ANON_KEY が未設定です。リポジトリ直下の .env に設定するか、services/api/.env にコピーしてください。"
  );
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/** 既定 3040。PORT または SCAN_HTTP_PORT があれば優先（scanHttp.ts と揃える） */
const port = Number(
  process.env.PORT ?? process.env.SCAN_HTTP_PORT ?? "3040"
);

/**
 * driver-app 等からのブラウザ fetch 用。未設定時は localhost:3002 のみ許可。
 * 緩くしたい場合は SCAN_CORS_ORIGIN=* を指定。
 */
const corsOrigin =
  process.env.SCAN_CORS_ORIGIN?.trim() || "http://localhost:3002";

async function fetchSupabaseAuthHealth(): Promise<{
  ok: boolean;
  status: number | null;
}> {
  const base = supabaseUrl.replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/auth/v1/health`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: null };
  }
}

const server = createServer((req, res) => {
  const path = req.url?.split("?")[0] ?? "/";

  if (req.method === "GET" && path === "/health") {
    void (async () => {
      try {
        const auth = await fetchSupabaseAuthHealth();
        const body = JSON.stringify({
          ok: true,
          service: "@logistics-erp/api",
          scan: { ok: true, service: "scan-minimal" },
          supabase: {
            authHealth: auth.ok ? "ok" : "error",
            authHttpStatus: auth.status,
          },
        });
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Access-Control-Allow-Origin", corsOrigin);
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type, Authorization"
        );
        res.writeHead(200);
        res.end(body);
      } catch (e) {
        console.error("[GET /health]", e);
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Access-Control-Allow-Origin", corsOrigin);
        res.writeHead(500);
        res.end(JSON.stringify({ ok: false, error: "health check failed" }));
      }
    })();
    return;
  }

  void handleScanHttp(req, res, { corsOrigin });
});

void (async () => {
  const auth = await fetchSupabaseAuthHealth();
  if (auth.ok) {
    console.log(
      `Supabase Auth health OK (HTTP ${auth.status})。HTTP サーバーを起動します。`
    );
  } else {
    console.warn(
      `Supabase Auth health が応答しません（status=${auth.status}）。サーバーは起動しますが設定を確認してください。`
    );
  }

  server.listen(port, () => {
    console.log(
      `[@logistics-erp/api] http://localhost:${port}  GET /health  POST /scans  (CORS: ${corsOrigin})`
    );
  });
})();
