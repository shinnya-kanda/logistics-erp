import { serve } from "https://deno.land/std/http/server.ts";
import { requireAdminRole as adminGuard } from "../_shared/adminGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const guard = await adminGuard(req);

  if (!guard.ok) {
    return jsonResponse(guard.body, guard.status);
  }

  return jsonResponse(
    {
      ok: true,
      message: "edge health ok",
      warehouseCode: guard.warehouseCode,
      role: guard.role,
    },
    200
  );
});
