import type { Shipment } from "@logistics-erp/schema";
import { insertShipment } from "@logistics-erp/db";

function normalizeShipment(raw: any): Shipment {
  const r = raw ?? {};
  const shipment: Shipment = {
    issueNo: r.issueNo ?? r.issue_no ?? "",
    supplier: r.supplier ?? "",
    partNo: r.partNo ?? r.part_no ?? "",
    partName: r.partName ?? r.part_name ?? "",
    quantity: Number(r.quantity ?? 0),
    dueDate: r.dueDate ?? r.due_date ?? "",
  };

  if (!shipment.issueNo) {
    throw new Error(
      "[@logistics-erp/importer] importShipment: 必須項目 issueNo が空です。"
    );
  }
  if (!shipment.partNo) {
    throw new Error(
      "[@logistics-erp/importer] importShipment: 必須項目 partNo が空です。"
    );
  }

  return shipment;
}

/**
 * PDF 抽出結果などを Shipment に正規化し、Supabase の shipments テーブルへ 1 件登録する。
 */
export async function importShipment(raw: any): Promise<void> {
  const shipment = normalizeShipment(raw);
  await insertShipment(shipment);
}
