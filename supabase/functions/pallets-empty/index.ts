import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdminRole as adminGuard } from "../_shared/adminGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

type EmptyPalletRow = {
  pallet_id: string;
  pallet_code: string;
  warehouse_code: string;
  project_no?: string | null;
  current_location_code: string | null;
  current_status: string | null;
  updated_at: string | null;
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

function createSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY is required");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function parseLimit(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? Math.min(n, 200) : null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function stringOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST" && req.method !== "GET") {
      return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
    }

    const guard = await adminGuard(req);
    if (!guard.ok) {
      return jsonResponse(guard.body, guard.status);
    }

    const url = new URL(req.url);
    let body: Record<string, unknown> = {};
    if (req.method === "POST") {
      const parsedBody = await req.json().catch(() => ({}));
      body = isRecord(parsedBody) ? parsedBody : {};
    }

    const projectNo =
      stringOrNull(body.project_no) ?? url.searchParams.get("project_no")?.trim() ?? null;
    const keyword = (
      stringOrNull(body.keyword) ?? url.searchParams.get("keyword")?.trim() ?? ""
    ).toUpperCase() || null;
    const limit = parseLimit(stringOrNull(body.limit) ?? url.searchParams.get("limit"));

    let supabase;
    try {
      supabase = createSupabaseClient();
    } catch {
      return jsonResponse({ ok: false, error: "internal_error" }, 500);
    }

    const { data, error } = await supabase.rpc("get_empty_pallets", {
      p_warehouse_code: guard.warehouseCode,
      p_project_no: projectNo,
    });

    if (error) {
      return jsonResponse({ ok: false, error: "failed_to_get_empty_pallets" }, 500);
    }

    let pallets = (data ?? []) as EmptyPalletRow[];
    if (keyword) {
      pallets = pallets.filter((row) => {
        const values = [
          row.pallet_code,
          row.project_no,
          row.current_location_code,
          row.current_status,
        ];
        return values.some((value) => value?.toUpperCase().includes(keyword));
      });
    }
    if (limit !== null) {
      pallets = pallets.slice(0, limit);
    }

    return jsonResponse({ ok: true, pallets });
  } catch {
    return jsonResponse({ ok: false, error: "internal_error" }, 500);
  }
});
