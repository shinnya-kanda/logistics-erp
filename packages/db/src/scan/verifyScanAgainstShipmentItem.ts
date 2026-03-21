import type { ShipmentItem } from "@logistics-erp/schema";
import type { ScanInputPayload } from "@logistics-erp/schema";
import type { VerificationResult, VerificationStatus } from "@logistics-erp/schema";

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toUpperCase();
}

/**
 * 単一スキャン × 単一 shipment_item の最小照合。
 * 評価順: 品番 → 荷卸場（両方に値がある場合のみ）→ 数量（累積 + 今回デルタ）
 */
export function verifyScanAgainstShipmentItem(
  item: ShipmentItem,
  input: ScanInputPayload,
  currentScannedTotal: number,
  quantityDelta: number
): VerificationResult {
  const scannedPart = norm(input.scanned_part_no ?? input.scanned_code);
  const expectedPart = norm(item.part_no);

  const actual: VerificationResult["actual"] = {
    scanned_code: input.scanned_code,
    scanned_part_no: input.scanned_part_no ?? null,
    quantity_delta: quantityDelta,
    unload_location_scanned: input.unload_location_scanned ?? null,
    trace_id: input.trace_id ?? null,
  };

  const expectedSummary: VerificationResult["expected"] = {
    shipment_item_id: item.id,
    part_no: item.part_no,
    quantity_expected: Number(item.quantity_expected),
    unload_location: item.unload_location ?? null,
    trace_id: item.trace_id ?? null,
  };

  if (!scannedPart) {
    return {
      status: "unknown",
      expected: expectedSummary,
      actual,
      notes: "品番相当の入力が空のため照合できません。",
    };
  }

  if (scannedPart !== expectedPart) {
    return {
      status: "wrong_part",
      expected: expectedSummary,
      actual,
      notes: "スキャン品番と Expected part_no が一致しません。",
      issue: {
        issue_type: "wrong_part",
        expected_value: item.part_no,
        actual_value: input.scanned_part_no ?? input.scanned_code,
        severity: "high",
      },
    };
  }

  const expUnload = (item.unload_location ?? "").trim();
  const actUnload = (input.unload_location_scanned ?? "").trim();
  if (expUnload && actUnload && norm(expUnload) !== norm(actUnload)) {
    return {
      status: "wrong_location",
      expected: expectedSummary,
      actual,
      notes: "荷卸場が Expected と一致しません。",
      issue: {
        issue_type: "wrong_location",
        expected_value: item.unload_location ?? "",
        actual_value: actUnload,
        severity: "medium",
      },
    };
  }

  const expectedQty = Number(item.quantity_expected);
  if (Number.isNaN(expectedQty)) {
    return {
      status: "unknown",
      expected: expectedSummary,
      actual,
      notes: "quantity_expected が数値として解釈できません。",
    };
  }

  const newTotal = currentScannedTotal + quantityDelta;
  let status: VerificationStatus;
  if (newTotal < expectedQty) status = "shortage";
  else if (newTotal > expectedQty) status = "excess";
  else status = "matched";

  if (status === "shortage") {
    return {
      status,
      expected: expectedSummary,
      actual,
      notes: `累積スキャン数量 ${newTotal} が予定 ${expectedQty} 未満です。`,
      issue: {
        issue_type: "shortage",
        expected_value: String(expectedQty),
        actual_value: String(newTotal),
        severity: "medium",
      },
    };
  }

  if (status === "excess") {
    return {
      status,
      expected: expectedSummary,
      actual,
      notes: `累積スキャン数量 ${newTotal} が予定 ${expectedQty} を超過しています。`,
      issue: {
        issue_type: "excess",
        expected_value: String(expectedQty),
        actual_value: String(newTotal),
        severity: "high",
      },
    };
  }

  return {
    status: "matched",
    expected: expectedSummary,
    actual,
    notes: "品番・数量（累積）が予定と一致しました。",
  };
}
