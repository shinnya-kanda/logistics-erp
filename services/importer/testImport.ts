import { importShipment } from "./importShipment.js";

async function main() {
  const raw = {
    issueNo: "TEST-001",
    supplier: "Test Supplier",
    partNo: "P-001",
    partName: "Test Part",
    quantity: 10,
    dueDate: "2026-03-20",
  };

  await importShipment(raw);
  console.log("insert success");
}

main().catch(console.error);
