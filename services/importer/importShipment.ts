import type { Shipment } from "@logistics-erp/schema";
import { insertShipment } from "@logistics-erp/db";

function normalizeShipment(raw: any): Shipment {
  const r = raw ?? {};
  const issueNo = String(r?.issueNo ?? r?.issue_no ?? "").trim();
  const partNo = String(r?.partNo ?? r?.part_no ?? "").trim();

  if (!issueNo) {
    throw new Error(
      "[@logistics-erp/importer] importShipment: 必須項目 issueNo が空です。"
    );
  }
  if (!partNo) {
    throw new Error(
      "[@logistics-erp/importer] importShipment: 必須項目 partNo が空です。"
    );
  }

  return {
    issueNo,
    supplier: String(r?.supplier ?? "").trim(),
    partNo,
    partName: String(r?.partName ?? r?.part_name ?? "").trim(),
    quantity: Number(r?.quantity ?? 0),
    dueDate: String(r?.dueDate ?? r?.due_date ?? "").trim(),
  };
}

/**
 * PDF 抽出結果などを Shipment に正規化し、Supabase の shipments テーブルへ 1 件登録する。
 */
export async function importShipment(raw: any): Promise<void> {
  const shipment = normalizeShipment(raw);
  await insertShipment(shipment);
}
