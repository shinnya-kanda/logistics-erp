import type { Shipment } from "@logistics-erp/schema";
import { supabase } from "./client.js";

export async function insertShipment(shipment: Shipment): Promise<void> {
  const { error } = await supabase.from("shipments").insert({
    issue_no: shipment.issueNo,
    supplier: shipment.supplier,
    part_no: shipment.partNo,
    part_name: shipment.partName,
    quantity: shipment.quantity,
    due_date: shipment.dueDate,
  });

  if (error) {
    throw new Error(
      `[@logistics-erp/db] insertShipment failed: ${error.message}`,
      { cause: error }
    );
  }
}
