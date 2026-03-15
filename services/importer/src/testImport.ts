import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

console.log("cwd =", process.cwd());
console.log("INIT_CWD =", process.env.INIT_CWD);
console.log("SUPABASE_URL =", process.env.SUPABASE_URL);
console.log("SUPABASE_ANON_KEY exists =", Boolean(process.env.SUPABASE_ANON_KEY));

const __filename = fileURLToPath(import.meta.url);
import { importShipments } from "./importShipments.js";

const __dirname = dirname(__filename);

async function main() {
  const samplePath = join(__dirname, "sample.csv");
  console.log("Loading CSV:", samplePath);

  const result = await importShipments(samplePath);

  console.log("Result:", {
    total: result.total,
    inserted: result.inserted,
    rows: result.rows.length,
  });
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
