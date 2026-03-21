import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { importShipments } from "./importShipments.js";

async function main() {
  const samplePath = join(__dirname, "sample.csv");
  console.log("Loading CSV:", samplePath);
  console.log("");

  const result = await importShipments(samplePath, { registerEffects: true });

  console.log("--- Result ---");
  console.log("source_file_id:", result.source_file_id);
  console.log("shipment_id (header):", result.shipment_id);
  console.log("shipment_items:", result.inserted);
  if (result.from_existing_checksum) {
    console.log("(checksum 既存 — DB insert はスキップ、冪等)");
  }
  if (result.effects) {
    console.log("registered stock movements:", result.effects.length);
    console.log("updated inventory rows:", result.effects.length);
    console.log("inserted trace events:", result.effects.length);
    console.log("");
    result.effects.forEach((e, i) => {
      console.log(
        `  [${i + 1}] issue_no=${e.shipment.issue_no} part_no=${e.shipment.part_no} movement_id=${e.movement.id} trace_id=${e.traceEvent.trace_id}`
      );
    });
  } else {
    console.log("(registerEffects was false; no stock_movements / inventory / trace_events)");
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
