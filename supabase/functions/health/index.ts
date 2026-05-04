import { serve } from "https://deno.land/std/http/server.ts";
import { requireAdminRole as adminGuard } from "../_shared/adminGuard.ts";

serve(async (req) => {
  const guard = await adminGuard(req);

  if (!guard.ok) {
    return new Response(JSON.stringify(guard.body), {
      status: guard.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      message: "edge health ok",
      warehouseCode: guard.warehouseCode,
      role: guard.role,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
});
