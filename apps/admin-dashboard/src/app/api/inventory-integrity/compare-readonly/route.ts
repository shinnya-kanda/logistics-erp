import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createInventoryIntegrityFetchResult } from "../../../inventoryIntegrityEdgeClient";
import { mapEdgeProjectionResponse } from "../../../inventoryIntegrityEdgeResponseMapper";
import { adaptFetchResponseToPayload } from "../../../inventoryIntegrityFetchAdapter";
import { getInventoryIntegrityMockData } from "../../../inventoryIntegrityMockData";
import {
  createInventoryIntegrityReadOnlyEdgeRequest,
  createInventoryIntegrityReadOnlyEndpointContract,
} from "../../../inventoryIntegrityEdgeClient";
import { realReadOnlyProjectionSourceMetadata } from "../../../inventoryIntegritySource";
import type {
  InventoryCompareClassificationMetadata,
  InventoryCompareEscalationReadiness,
  InventoryCompareEscalationReadinessMetadata,
  InventoryCompareHardeningMetadata,
  InventoryCompareMismatchClassification,
  InventoryCompareOperationalPriority,
  InventoryCompareOperationalPriorityMetadata,
  InventoryCompareOwnership,
  InventoryCompareOwnershipMetadata,
  InventoryCompareOwnerActionability,
  InventoryCompareOwnerActionabilityMetadata,
  InventoryCompareProjection,
  InventoryCompareReviewReadiness,
  InventoryCompareReviewReadinessMetadata,
  InventoryCompareSeverity,
  InventoryCompareSeverityMetadata,
  InventoryCompareSourceStatus,
  InventoryCompareStatus,
  InventoryCompareResultVisibilityStatus,
  InventoryCompareScopeValidationStatus,
  InventoryIntegrityReadOnlyData,
} from "../../../inventoryIntegrityTypes";

type GuardResult =
  | { ok: true; token: string; warehouseCode: string }
  | {
      ok: false;
      status: 401 | 403;
      error: string;
      scopeStatus: InventoryCompareScopeValidationStatus;
    };

type InventoryTransactionRow = {
  readonly transaction_type: string | null;
  readonly part_no: string | null;
  readonly quantity: number | string | null;
  readonly warehouse_code: string | null;
  readonly from_warehouse_code: string | null;
  readonly to_warehouse_code: string | null;
  readonly event_at: string | null;
  readonly created_at: string | null;
};

type InventoryCurrentRow = {
  readonly part_no: string | null;
  readonly warehouse_code: string | null;
  readonly quantity_on_hand: number | string | null;
  readonly updated_at: string | null;
};

type CompareQuantity = {
  readonly warehouseCode: string;
  readonly partNo: string;
  readonly transactionQuantity: number;
  readonly currentQuantity: number;
  readonly latestObservedAt: string;
};

const allowedRoles = new Set(["admin", "chief", "office"]);
const endpointPath = "/api/inventory-integrity/compare-readonly";

function extractBearerToken(req: NextRequest): string | null {
  const raw = req.headers.get("authorization");
  if (!raw) return null;
  const match = /^Bearer\s+(\S+)/i.exec(raw.trim());
  return match?.[1] ?? null;
}

function unavailable(
  status: 401 | 403,
  error: string,
  scopeStatus: InventoryCompareScopeValidationStatus,
): GuardResult {
  return { ok: false, status, error, scopeStatus };
}

async function requireAdminDashboardRole(req: NextRequest): Promise<GuardResult> {
  const token = extractBearerToken(req);
  if (!token) return unavailable(401, "unauthorized", "unavailable_scope");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey) {
    return unavailable(401, "unauthorized", "unavailable_scope");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) return unavailable(401, "unauthorized", "unavailable_scope");

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("user_id, role, is_active, warehouse_code")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return unavailable(403, "profile_unavailable", "unavailable_scope");
  }
  if (profile.user_id !== user.id) return unavailable(403, "profile_mismatch", "invalid_scope");
  if (profile.is_active !== true) return unavailable(403, "user_inactive", "invalid_scope");
  if (typeof profile.role !== "string" || !allowedRoles.has(profile.role)) {
    return unavailable(403, "role_not_allowed", "invalid_scope");
  }

  const warehouseCode =
    typeof profile.warehouse_code === "string" ? profile.warehouse_code.trim() : "";
  if (!warehouseCode) return unavailable(403, "warehouse_unavailable", "unavailable_scope");

  return { ok: true, token, warehouseCode };
}

function createCompareHardeningMetadata({
  sourceStatus,
  resultStatus,
  scopeStatus,
  reason,
}: {
  readonly sourceStatus: InventoryCompareSourceStatus;
  readonly resultStatus: InventoryCompareResultVisibilityStatus;
  readonly scopeStatus: InventoryCompareScopeValidationStatus;
  readonly reason: string;
}): InventoryCompareHardeningMetadata {
  return {
    hardeningId: `inventory-integrity-compare-readonly-${sourceStatus}-${resultStatus}-${scopeStatus}`,
    sourceStatus,
    resultStatus,
    scopeStatus,
    label: "read-only compare hardening semantics",
    readability:
      `${sourceStatus} / ${resultStatus} / ${scopeStatus} は compare endpoint の read-only visibility 状態です。${reason}`,
    sourceInterpretation:
      "compare source status は inventory_transactions / inventory_current を read-only source として読めるかの表示状態です。",
    resultInterpretation:
      "compare result status は empty / partial / unverified の表示状態であり、正しさ保証ではありません。",
    scopeInterpretation:
      "scope status は warehouse_code 境界の読み方であり、権限変更や在庫操作ではありません。",
    degradationVisibility:
      "degraded / unavailable は read-only degraded visibility であり、修正、再生成、在庫変更の開始条件ではありません。",
    noExecutionMeaning:
      "compare hardening は compare execution ではありません。修正、再生成、在庫変更、同期処理は実行しません。",
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareHardeningMetadata は execution authority を持ちません。修正、再生成、在庫変更は実行しません。",
  };
}

function createCompareClassificationMetadata({
  classification,
  reason,
}: {
  readonly classification: InventoryCompareMismatchClassification;
  readonly reason: string;
}): InventoryCompareClassificationMetadata {
  return {
    classificationId: `inventory-integrity-compare-readonly-${classification}`,
    classification,
    label: "read-only mismatch classification",
    reason,
    interpretation:
      "mismatch classification は差分の種類を読むための表示 metadata であり、照合確定や業務判断の自動化ではありません。",
    noExecutionMeaning:
      "classification は correction execution、reconciliation workflow、在庫変更、同期処理を開始しません。",
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareClassificationMetadata は read-only classification です。修正、再生成、在庫変更は実行しません。",
  };
}

function severityForClassification(
  classification: InventoryCompareMismatchClassification,
): InventoryCompareSeverity {
  if (classification === "compare_unverified") return "unverified";
  if (classification === "negative_projection" || classification === "negative_truth") {
    return "critical";
  }
  if (
    classification === "aggregation_mismatch" ||
    classification === "unavailable_projection"
  ) {
    return "high";
  }
  if (
    classification === "quantity_mismatch" ||
    classification === "stale_projection" ||
    classification === "compare_partial" ||
    classification === "scope_mismatch" ||
    classification === "degraded_projection"
  ) {
    return "warning";
  }
  return "info";
}

function createCompareSeverityMetadata({
  classification,
  severity,
  reason,
}: {
  readonly classification: InventoryCompareMismatchClassification;
  readonly severity: InventoryCompareSeverity;
  readonly reason: string;
}): InventoryCompareSeverityMetadata {
  return {
    severityId: `inventory-integrity-compare-readonly-${classification}-${severity}`,
    severity,
    label: "read-only compare severity semantics",
    reason,
    interpretation:
      "compare severity はどの差異を先に読むかの表示解釈であり、修正優先度の実行ではありません。",
    noExecutionMeaning:
      "severity semantics は workflow execution、correction priority execution、在庫変更、同期処理を開始しません。",
    classification,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareSeverityMetadata は read-only severity interpretation です。修正、再生成、在庫変更は実行しません。",
  };
}

function readinessForSeverity(
  severity: InventoryCompareSeverity,
  classification: InventoryCompareMismatchClassification,
): InventoryCompareReviewReadiness {
  if (classification === "compare_unverified") return "review_unverified";
  if (classification === "unavailable_projection") return "review_blocked";
  if (severity === "critical") return "review_required";
  if (severity === "high") return "review_recommended";
  if (severity === "warning") return "review_optional";
  if (severity === "unverified") return "review_unverified";
  return "review_optional";
}

function createCompareReviewReadinessMetadata({
  readiness,
  severity,
  classification,
  reason,
}: {
  readonly readiness: InventoryCompareReviewReadiness;
  readonly severity: InventoryCompareSeverity;
  readonly classification: InventoryCompareMismatchClassification;
  readonly reason: string;
}): InventoryCompareReviewReadinessMetadata {
  return {
    readinessId: `inventory-integrity-compare-readonly-${classification}-${readiness}`,
    readiness,
    label: "read-only governance review readiness semantics",
    reason,
    interpretation:
      "compare review readiness は人間レビューの必要度を読む governance interpretation であり、レビュー実行ではありません。",
    noExecutionMeaning:
      "review readiness はレビュー実行、修正手順、再生成調整、担当割当を開始しません。",
    severity,
    classification,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareReviewReadinessMetadata は read-only governance semantics です。レビュー実行、修正、再生成、在庫変更は実行しません。",
  };
}

function escalationForReviewReadiness(
  reviewReadiness: InventoryCompareReviewReadiness,
): InventoryCompareEscalationReadiness {
  if (reviewReadiness === "review_required") return "escalation_required";
  if (reviewReadiness === "review_recommended") return "escalation_recommended";
  if (reviewReadiness === "review_optional") return "escalation_optional";
  if (reviewReadiness === "review_blocked") return "escalation_blocked";
  return "escalation_unverified";
}

function createCompareEscalationReadinessMetadata({
  readiness,
  reviewReadiness,
  severity,
  classification,
  reason,
}: {
  readonly readiness: InventoryCompareEscalationReadiness;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly severity: InventoryCompareSeverity;
  readonly classification: InventoryCompareMismatchClassification;
  readonly reason: string;
}): InventoryCompareEscalationReadinessMetadata {
  return {
    readinessId: `inventory-integrity-compare-readonly-${classification}-${readiness}`,
    readiness,
    label: "read-only governance escalation readiness semantics",
    reason,
    interpretation:
      "compare escalation readiness は組織的 escalation の必要度を読む governance interpretation であり、escalation 実行ではありません。",
    noExecutionMeaning:
      "escalation readiness は escalation 実行、修正手順、再生成調整、通知、担当割当を開始しません。",
    reviewReadiness,
    severity,
    classification,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareEscalationReadinessMetadata は read-only governance semantics です。escalation 実行、修正、再生成、在庫変更は実行しません。",
  };
}

function priorityForOperationalInterpretation({
  escalationReadiness,
  reviewReadiness,
  severity,
  classification,
}: {
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly severity: InventoryCompareSeverity;
  readonly classification: InventoryCompareMismatchClassification;
}): InventoryCompareOperationalPriority {
  if (classification === "compare_unverified" || severity === "unverified") {
    return "priority_unverified";
  }
  if (escalationReadiness === "escalation_required") return "priority_p0";
  if (
    escalationReadiness === "escalation_recommended" ||
    reviewReadiness === "review_required"
  ) {
    return "priority_p1";
  }
  if (severity === "high") return "priority_p2";
  if (severity === "warning") return "priority_p3";
  return "priority_p3";
}

function createCompareOperationalPriorityMetadata({
  priority,
  escalationReadiness,
  reviewReadiness,
  severity,
  classification,
  reason,
}: {
  readonly priority: InventoryCompareOperationalPriority;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly severity: InventoryCompareSeverity;
  readonly classification: InventoryCompareMismatchClassification;
  readonly reason: string;
}): InventoryCompareOperationalPriorityMetadata {
  return {
    priorityId: `inventory-integrity-compare-readonly-${classification}-${priority}`,
    priority,
    label: "read-only operational priority semantics",
    reason,
    interpretation:
      "compare operational priority は現場として何から確認するかを読む operational interpretation であり、実行順序ではありません。",
    noExecutionMeaning:
      "operational priority は優先度に基づく実行、修正手順、再生成調整、通知、担当割当、在庫変更を開始しません。",
    escalationReadiness,
    reviewReadiness,
    severity,
    classification,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareOperationalPriorityMetadata は read-only operational semantics です。実行順序、修正、再生成、在庫変更は実行しません。",
  };
}

function ownershipForCompareSemantics({
  compareHardening,
  operationalPriority,
  escalationReadiness,
  severity,
  classification,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly severity: InventoryCompareSeverity;
  readonly classification: InventoryCompareMismatchClassification;
}): InventoryCompareOwnership {
  if (classification === "compare_unverified" || severity === "unverified") {
    return "owner_unknown";
  }
  if (compareHardening.sourceStatus === "compare_source_unavailable") {
    return "owner_unknown";
  }
  if (
    compareHardening.sourceStatus === "compare_source_degraded" ||
    compareHardening.scopeStatus !== "valid_scope"
  ) {
    return "owner_unassigned";
  }
  if (operationalPriority === "priority_p0" || escalationReadiness === "escalation_required") {
    return "owner_required";
  }
  if (
    operationalPriority === "priority_p1" ||
    escalationReadiness === "escalation_recommended" ||
    operationalPriority === "priority_p2" ||
    severity === "high"
  ) {
    return "owner_review_required";
  }
  if (operationalPriority === "priority_unverified") return "owner_unknown";
  return "owner_resolved_candidate";
}

function ownershipReason(ownership: InventoryCompareOwnership): string {
  if (ownership === "owner_required") {
    return "P0 または escalation_required として見えるため、確認先が必要な状態です";
  }
  if (ownership === "owner_review_required") {
    return "P1/P2 または escalation/review 推奨として見えるため、確認担当候補の整理が必要な状態です";
  }
  if (ownership === "owner_resolved_candidate") {
    return "P3 または warning として見えるため、確認候補として読む状態です";
  }
  if (ownership === "owner_unassigned") {
    return "compare source / scope が degraded または partial で、確認先を確定できない表示状態です";
  }
  return "compare が未検証または unavailable で、確認先を読めない状態です";
}

function createCompareOwnershipMetadata({
  ownership,
  operationalPriority,
  escalationReadiness,
  reviewReadiness,
  severity,
  classification,
  ownershipSource,
  ownershipSignals,
}: {
  readonly ownership: InventoryCompareOwnership;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly severity: InventoryCompareSeverity;
  readonly classification: InventoryCompareMismatchClassification;
  readonly ownershipSource: string;
  readonly ownershipSignals: readonly string[];
}): InventoryCompareOwnershipMetadata {
  return {
    ownershipId: `inventory-integrity-compare-readonly-${classification}-${ownership}`,
    ownership,
    ownershipReason: ownershipReason(ownership),
    ownershipSource,
    ownershipSignals,
    label: "read-only compare ownership semantics",
    interpretation:
      "compare ownership は誰が確認すべき状態かを読む governance / operational observability metadata です。",
    noExecutionMeaning:
      "ownership semantics は担当割当、担当割当の変更処理、通知、修正手順、再生成調整、在庫変更を開始しません。",
    operationalPriority,
    escalationReadiness,
    reviewReadiness,
    severity,
    classification,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareOwnershipMetadata は read-only ownership visibility です。担当割当、修正、再生成、在庫変更は実行しません。",
  };
}

function actionabilityForOwnership({
  compareHardening,
  ownership,
  operationalPriority,
  escalationReadiness,
  severity,
  classification,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly ownership: InventoryCompareOwnership;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly severity: InventoryCompareSeverity;
  readonly classification: InventoryCompareMismatchClassification;
}): InventoryCompareOwnerActionability {
  if (
    ownership === "owner_unknown" ||
    classification === "compare_unverified" ||
    severity === "unverified" ||
    compareHardening.sourceStatus === "compare_source_unavailable"
  ) {
    return "blocked_unverified";
  }
  if (
    ownership === "owner_unassigned" ||
    compareHardening.sourceStatus === "compare_source_degraded" ||
    compareHardening.scopeStatus !== "valid_scope" ||
    compareHardening.resultStatus === "compare_result_partial"
  ) {
    return "unassigned_action";
  }
  if (
    ownership === "owner_required" ||
    escalationReadiness === "escalation_required" ||
    operationalPriority === "priority_p0"
  ) {
    return "action_required";
  }
  if (
    ownership === "owner_review_required" ||
    escalationReadiness === "escalation_recommended" ||
    operationalPriority === "priority_p1" ||
    operationalPriority === "priority_p2"
  ) {
    return "action_recommended";
  }
  return "monitor_only";
}

function actionabilityReason(
  actionability: InventoryCompareOwnerActionability,
): string {
  if (actionability === "action_required") {
    return "owner_required / escalation_required / priority_p0 として見えるため、action 必須候補として読む状態です";
  }
  if (actionability === "action_recommended") {
    return "owner_review_required / escalation_recommended / priority_p1-p2 として見えるため、action 推奨候補として読む状態です";
  }
  if (actionability === "monitor_only") {
    return "owner_resolved_candidate / priority_p3 / warning として見えるため、監視中心で読む状態です";
  }
  if (actionability === "unassigned_action") {
    return "owner_unassigned / degraded / partial / scope limitation により、action 候補を確定できない状態です";
  }
  return "owner_unknown / compare_unverified / unavailable により、actionability を検証済みとして読めない状態です";
}

function createCompareOwnerActionabilityMetadata({
  ownerActionability,
  ownership,
  operationalPriority,
  escalationReadiness,
  reviewReadiness,
  severity,
  classification,
  actionabilitySource,
  actionabilitySignals,
}: {
  readonly ownerActionability: InventoryCompareOwnerActionability;
  readonly ownership: InventoryCompareOwnership;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly severity: InventoryCompareSeverity;
  readonly classification: InventoryCompareMismatchClassification;
  readonly actionabilitySource: string;
  readonly actionabilitySignals: readonly string[];
}): InventoryCompareOwnerActionabilityMetadata {
  return {
    actionabilityId: `inventory-integrity-compare-readonly-${classification}-${ownerActionability}`,
    ownerActionability,
    actionabilityReason: actionabilityReason(ownerActionability),
    actionabilitySource,
    actionabilitySignals,
    label: "read-only owner actionability semantics",
    interpretation:
      "owner actionability は差異に対してどの程度 action が必要そうに見えるかを読む governance / operational observability metadata です。",
    noExecutionMeaning:
      "owner actionability は是正対応の実行、担当割当、修正手順、同期、再生成、在庫変更を開始しません。",
    ownership,
    operationalPriority,
    escalationReadiness,
    reviewReadiness,
    severity,
    classification,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareOwnerActionabilityMetadata は read-only actionability visibility です。実行、担当割当、修正、再生成、在庫変更は実行しません。",
  };
}

function createUnavailableReadOnlyResponse({
  status,
  error,
  scopeStatus,
}: {
  readonly status: number;
  readonly error: string;
  readonly scopeStatus: InventoryCompareScopeValidationStatus;
}) {
  const compareHardening = createCompareHardeningMetadata({
    sourceStatus: "compare_source_unavailable",
    resultStatus: "compare_result_unverified",
    scopeStatus,
    reason: error,
  });
  const compareClassification = createCompareClassificationMetadata({
    classification: "compare_unverified",
    reason: "compare source is unavailable, so mismatch classification is unverified",
  });
  const compareSeverity = createCompareSeverityMetadata({
    classification: compareClassification.classification,
    severity: "unverified",
    reason: "compare source unavailable response is read as unverified severity",
  });
  const compareReviewReadiness = createCompareReviewReadinessMetadata({
    readiness: "review_unverified",
    severity: compareSeverity.severity,
    classification: compareClassification.classification,
    reason: "compare source unavailable response cannot be reviewed as a verified result",
  });
  const compareEscalationReadiness = createCompareEscalationReadinessMetadata({
    readiness: "escalation_unverified",
    reviewReadiness: compareReviewReadiness.readiness,
    severity: compareSeverity.severity,
    classification: compareClassification.classification,
    reason: "compare source unavailable response cannot be escalated as a verified result",
  });
  const compareOperationalPriority = createCompareOperationalPriorityMetadata({
    priority: "priority_unverified",
    escalationReadiness: compareEscalationReadiness.readiness,
    reviewReadiness: compareReviewReadiness.readiness,
    severity: compareSeverity.severity,
    classification: compareClassification.classification,
    reason: "compare source unavailable response cannot be ordered as a verified operational priority",
  });
  const compareOwnership = createCompareOwnershipMetadata({
    ownership: "owner_unknown",
    operationalPriority: compareOperationalPriority.priority,
    escalationReadiness: compareEscalationReadiness.readiness,
    reviewReadiness: compareReviewReadiness.readiness,
    severity: compareSeverity.severity,
    classification: compareClassification.classification,
    ownershipSource: "compare_source_unavailable",
    ownershipSignals: [
      compareHardening.sourceStatus,
      compareClassification.classification,
      compareOperationalPriority.priority,
    ],
  });
  const compareOwnerActionability = createCompareOwnerActionabilityMetadata({
    ownerActionability: "blocked_unverified",
    ownership: compareOwnership.ownership,
    operationalPriority: compareOperationalPriority.priority,
    escalationReadiness: compareEscalationReadiness.readiness,
    reviewReadiness: compareReviewReadiness.readiness,
    severity: compareSeverity.severity,
    classification: compareClassification.classification,
    actionabilitySource: "compare_source_unavailable",
    actionabilitySignals: [
      compareOwnership.ownership,
      compareClassification.classification,
      compareOperationalPriority.priority,
      compareHardening.sourceStatus,
    ],
  });

  return NextResponse.json(
    {
      ok: false,
      error,
      endpoint: endpointPath,
      method: "GET",
      truthSource: "inventory_transactions",
      cacheCompareTarget: "inventory_current",
      compareHardening,
      compareClassification,
      compareSeverity,
      compareReviewReadiness,
      compareEscalationReadiness,
      compareOperationalPriority,
      compareOwnership,
      compareOwnerActionability,
      semanticBoundary: "reasoning_visualization_only",
      executionBoundary:
        "compare-readonly endpoint failure は read-only unavailable visibility です。修正、再生成、在庫変更は実行しません。",
    },
    { status },
  );
}

function toQuantity(value: number | string | null): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatQuantity(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(3).replace(/\.?0+$/, "");
}

function compareKey(warehouseCode: string, partNo: string): string {
  return `${warehouseCode}::${partNo}`;
}

function addQuantity(
  quantities: Map<string, CompareQuantity>,
  warehouseCode: string,
  partNo: string,
  quantity: number,
  observedAt: string,
): void {
  if (!warehouseCode || !partNo || quantity === 0) return;

  const key = compareKey(warehouseCode, partNo);
  const existing = quantities.get(key);
  quantities.set(key, {
    warehouseCode,
    partNo,
    transactionQuantity: (existing?.transactionQuantity ?? 0) + quantity,
    currentQuantity: existing?.currentQuantity ?? 0,
    latestObservedAt: observedAt || existing?.latestObservedAt || "unknown",
  });
}

function addCurrentQuantity(
  quantities: Map<string, CompareQuantity>,
  row: InventoryCurrentRow,
  fallbackObservedAt: string,
): void {
  const warehouseCode = row.warehouse_code?.trim() ?? "";
  const partNo = row.part_no?.trim() ?? "";
  if (!warehouseCode || !partNo) return;

  const key = compareKey(warehouseCode, partNo);
  const existing = quantities.get(key);
  quantities.set(key, {
    warehouseCode,
    partNo,
    transactionQuantity: existing?.transactionQuantity ?? 0,
    currentQuantity: (existing?.currentQuantity ?? 0) + toQuantity(row.quantity_on_hand),
    latestObservedAt:
      row.updated_at ?? existing?.latestObservedAt ?? fallbackObservedAt,
  });
}

function addTransactionQuantity(
  quantities: Map<string, CompareQuantity>,
  row: InventoryTransactionRow,
  scopedWarehouseCode: string,
  fallbackObservedAt: string,
): void {
  const partNo = row.part_no?.trim() ?? "";
  const quantity = Math.abs(toQuantity(row.quantity));
  const transactionType = row.transaction_type?.trim().toUpperCase() ?? "";
  const observedAt = row.event_at ?? row.created_at ?? fallbackObservedAt;
  if (!partNo || quantity === 0) return;

  if (transactionType === "MOVE") {
    const fromWarehouseCode =
      row.from_warehouse_code?.trim() || row.warehouse_code?.trim() || "";
    const toWarehouseCode = row.to_warehouse_code?.trim() ?? "";
    if (fromWarehouseCode === scopedWarehouseCode) {
      addQuantity(quantities, fromWarehouseCode, partNo, -quantity, observedAt);
    }
    if (toWarehouseCode === scopedWarehouseCode) {
      addQuantity(quantities, toWarehouseCode, partNo, quantity, observedAt);
    }
    return;
  }

  const warehouseCode = row.warehouse_code?.trim() ?? "";
  if (warehouseCode !== scopedWarehouseCode) return;

  if (transactionType === "OUT") {
    addQuantity(quantities, warehouseCode, partNo, -quantity, observedAt);
    return;
  }

  addQuantity(quantities, warehouseCode, partNo, toQuantity(row.quantity), observedAt);
}

function resolveCompareStatus(
  transactionQuantity: number,
  currentQuantity: number,
): InventoryCompareStatus {
  const hasTransactionProjection = transactionQuantity !== 0;
  const hasCurrentProjection = currentQuantity !== 0;

  if (hasTransactionProjection && !hasCurrentProjection) return "missing_projection";
  if (!hasTransactionProjection && hasCurrentProjection) return "orphan_projection";
  if (transactionQuantity === currentQuantity) return "matched";
  return "mismatched";
}

function resolveMismatchClassification(
  row: CompareQuantity,
  compareStatus: InventoryCompareStatus,
  compareHardening: InventoryCompareHardeningMetadata,
  generatedAt: string,
): InventoryCompareMismatchClassification {
  if (compareHardening.sourceStatus === "compare_source_unavailable") {
    return "compare_unverified";
  }
  if (compareHardening.scopeStatus !== "valid_scope") return "scope_mismatch";
  if (row.currentQuantity < 0) return "negative_projection";
  if (row.transactionQuantity < 0) return "negative_truth";
  if (row.latestObservedAt < generatedAt.slice(0, 10)) return "stale_projection";
  if (compareStatus === "missing_projection") return "unavailable_projection";
  if (compareStatus === "orphan_projection") return "degraded_projection";
  if (compareStatus === "mismatched") return "quantity_mismatch";
  if (compareHardening.resultStatus === "compare_result_partial") return "compare_partial";
  return "compare_partial";
}

function classificationReason(
  classification: InventoryCompareMismatchClassification,
): string {
  if (classification === "quantity_mismatch") {
    return "truth quantity and projection quantity are different";
  }
  if (classification === "negative_projection") {
    return "inventory_current compare target quantity is negative";
  }
  if (classification === "negative_truth") {
    return "inventory_transactions aggregate truth quantity is negative";
  }
  if (classification === "stale_projection") {
    return "compare target observation is older than the GET visibility date";
  }
  if (classification === "aggregation_mismatch") {
    return "transaction aggregation visibility differs from compare target visibility";
  }
  if (classification === "scope_mismatch") {
    return "warehouse compare scope is degraded or unavailable";
  }
  if (classification === "compare_unverified") {
    return "compare source is unavailable or unverified";
  }
  if (classification === "degraded_projection") {
    return "projection side is visible but degraded against truth visibility";
  }
  if (classification === "unavailable_projection") {
    return "projection side is unavailable for truth visibility";
  }
  return "compare source is only partially visible";
}

function buildCompareProjection(
  row: CompareQuantity,
  generatedAt: string,
  compareHardening: InventoryCompareHardeningMetadata,
): InventoryCompareProjection {
  const differenceQuantity = row.transactionQuantity - row.currentQuantity;
  const compareStatus = resolveCompareStatus(
    row.transactionQuantity,
    row.currentQuantity,
  );
  const mismatchClassification = resolveMismatchClassification(
    row,
    compareStatus,
    compareHardening,
    generatedAt,
  );
  const compareClassification = createCompareClassificationMetadata({
    classification: mismatchClassification,
    reason: classificationReason(mismatchClassification),
  });
  const compareSeverity = createCompareSeverityMetadata({
    classification: mismatchClassification,
    severity: severityForClassification(mismatchClassification),
    reason: `classification ${mismatchClassification} を read-only severity として解釈します`,
  });
  const compareReviewReadiness = createCompareReviewReadinessMetadata({
    readiness: readinessForSeverity(compareSeverity.severity, mismatchClassification),
    severity: compareSeverity.severity,
    classification: mismatchClassification,
    reason: `severity ${compareSeverity.severity} を read-only governance review readiness として解釈します`,
  });
  const compareEscalationReadiness = createCompareEscalationReadinessMetadata({
    readiness: escalationForReviewReadiness(compareReviewReadiness.readiness),
    reviewReadiness: compareReviewReadiness.readiness,
    severity: compareSeverity.severity,
    classification: mismatchClassification,
    reason: `review readiness ${compareReviewReadiness.readiness} を read-only governance escalation readiness として解釈します`,
  });
  const compareOperationalPriority = createCompareOperationalPriorityMetadata({
    priority: priorityForOperationalInterpretation({
      escalationReadiness: compareEscalationReadiness.readiness,
      reviewReadiness: compareReviewReadiness.readiness,
      severity: compareSeverity.severity,
      classification: mismatchClassification,
    }),
    escalationReadiness: compareEscalationReadiness.readiness,
    reviewReadiness: compareReviewReadiness.readiness,
    severity: compareSeverity.severity,
    classification: mismatchClassification,
    reason: `escalation readiness ${compareEscalationReadiness.readiness} を read-only operational priority として解釈します`,
  });
  const compareOwnership = createCompareOwnershipMetadata({
    ownership: ownershipForCompareSemantics({
      compareHardening,
      operationalPriority: compareOperationalPriority.priority,
      escalationReadiness: compareEscalationReadiness.readiness,
      severity: compareSeverity.severity,
      classification: mismatchClassification,
    }),
    operationalPriority: compareOperationalPriority.priority,
    escalationReadiness: compareEscalationReadiness.readiness,
    reviewReadiness: compareReviewReadiness.readiness,
    severity: compareSeverity.severity,
    classification: mismatchClassification,
    ownershipSource: "compare_semantics_chain",
    ownershipSignals: [
      mismatchClassification,
      compareSeverity.severity,
      compareReviewReadiness.readiness,
      compareEscalationReadiness.readiness,
      compareOperationalPriority.priority,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
    ],
  });
  const compareOwnerActionability = createCompareOwnerActionabilityMetadata({
    ownerActionability: actionabilityForOwnership({
      compareHardening,
      ownership: compareOwnership.ownership,
      operationalPriority: compareOperationalPriority.priority,
      escalationReadiness: compareEscalationReadiness.readiness,
      severity: compareSeverity.severity,
      classification: mismatchClassification,
    }),
    ownership: compareOwnership.ownership,
    operationalPriority: compareOperationalPriority.priority,
    escalationReadiness: compareEscalationReadiness.readiness,
    reviewReadiness: compareReviewReadiness.readiness,
    severity: compareSeverity.severity,
    classification: mismatchClassification,
    actionabilitySource: "compare_ownership_semantics_chain",
    actionabilitySignals: [
      compareOwnership.ownership,
      compareOperationalPriority.priority,
      compareEscalationReadiness.readiness,
      compareReviewReadiness.readiness,
      compareSeverity.severity,
      mismatchClassification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
    ],
  });
  const projectionId = `real-compare-${row.warehouseCode}-${row.partNo}`;

  return {
    id: projectionId,
    scope: "part",
    label: `${row.warehouseCode} / ${row.partNo}`,
    description:
      "inventory_transactions 集計と inventory_current cache を read-only に比較した visibility です。",
    metadata: {
      identity: {
        projectionId,
        projectionType: "compare_projection",
        projectionVersion: "real-readonly-b76-10",
        scope: "part",
        generatedAt,
        contractVersion: "inventory-integrity-real-compare-readonly-contract",
      },
      snapshot: {
        snapshotId: `${projectionId}-snapshot`,
        asOfTime: row.latestObservedAt,
        observedAt: generatedAt,
        transactionCoverage: "partial",
        freshness: "fresh",
        limitation:
          "read-only select で見える範囲の比較 visibility であり、正しさ保証や更新権限ではありません。",
      },
      evidence: {
        source: {
          source: "inventory_transactions",
          label: "transaction truth aggregate",
          semanticMeaning:
            "inventory_transactions を truth として倉庫・部品単位で集計した数量です。",
        },
        confidence: {
          level: "medium",
          reason:
            "server side の read-only 集計結果を使っていますが、業務確定や正しさ保証ではありません。",
          caveat:
            "confidence は確認材料であり、在庫更新や運用処理の許可ではありません。",
        },
        freshness: {
          level: "fresh",
          reason: "GET 時点で read-only に参照した projection visibility です。",
          caveat: "鮮度は表示上の読み方であり、継続監視や再計算の開始条件ではありません。",
        },
        completeness: {
          level: "partial",
          scope: "認可された warehouse_code の warehouse + part_no compare visibility",
          caveat: "部分的な表示であり、全社在庫の完全性保証ではありません。",
        },
        gaps: [],
        semanticBoundary: "reasoning_visualization_only",
        executionBoundary:
          "compare evidence は read-only visibility です。更新、再生成、在庫変更は実行しません。",
      },
      compareHardening,
      compareClassification,
      compareSeverity,
      compareReviewReadiness,
      compareEscalationReadiness,
      compareOperationalPriority,
      compareOwnership,
      compareOwnerActionability,
      confidence: {
        level: "medium",
        reason: "real read-only compare rows から作成した visibility です。",
        caveat: "説明可能性の目安であり、truth guarantee ではありません。",
      },
      freshness: {
        level: "fresh",
        reason: "GET 時点の read-only result です。",
        caveat: "鮮度は表示上の制限であり、実行権限ではありません。",
      },
      completeness: {
        level: "partial",
        scope: "warehouse + part_no の最小 compare PoC",
        caveat: "location / project / pallet 粒度の完全比較ではありません。",
      },
      traceability: {
        sourceTraceLabel: "inventory_transactions aggregate vs inventory_current cache",
        sourceChain: [
          "inventory_transactions",
          "server-side read-only aggregate",
          "inventory_current",
        ],
        caveat: "source chain は読み方であり、処理チェーンではありません。",
      },
      lineage: {
        lineageLabel: "real read-only compare lineage",
        derivedFrom: ["inventory_transactions aggregate", "inventory_current cache"],
        caveat: "lineage は由来説明であり、在庫の修正権限ではありません。",
      },
      reviewReadiness: {
        level: compareStatus === "matched" ? "review_ready" : "partially_ready",
        reason:
          compareStatus === "matched"
            ? "数量が一致しているため参照確認できます。"
            : "差分が見えるため人が確認する材料として扱います。",
        caveat: "review readiness は実行状態ではなく、確認補助です。",
      },
      lifecycle: {
        state:
          compareStatus === "matched" ? "projection_normalized" : "projection_review_required",
        label: "real read-only compare visibility",
        readability:
          "real data 由来の compare visibility を read-only projection として読む状態です。",
        interpretation:
          "差分の有無は確認材料であり、在庫変更や運用処理を開始しません。",
        semanticBoundary: "reasoning_visualization_only",
        executionBoundary:
          "projection lifecycle は表示状態です。更新、再生成、在庫変更は実行しません。",
      },
      semanticBoundary: "reasoning_visualization_only",
      executionBoundary:
        "real compare projection は read-only visibility です。更新、再生成、在庫変更は実行しません。",
    },
    difference: {
      currentReadModelQuantity: formatQuantity(row.currentQuantity),
      transactionAggregationQuantity: formatQuantity(row.transactionQuantity),
      differenceQuantity: formatQuantity(differenceQuantity),
      compareStatus,
      mismatchClassification,
      reason: compareStatus === "matched" ? "not_compared" : "read_model_cache_gap",
      severity: compareSeverity.severity,
    },
    lineage: {
      trace: {
        traceId: `${projectionId}-trace`,
        parentTraceId: "inventory-integrity-real-compare-readonly",
        label: "real read-only compare trace",
      },
      derivedFrom: [
        {
          source: "inventory_transactions",
          label: "transaction aggregate",
          semanticMeaning: "在庫数量の truth source から read-only に集計した値です。",
        },
        {
          source: "inventory_current",
          label: "current cache",
          semanticMeaning: "比較対象の cache quantity であり truth ではありません。",
        },
      ],
      dependencies: [
        {
          id: `${projectionId}-warehouse-part-key`,
          label: "warehouse_code + part_no",
          semanticMeaning: "最小 compare PoC の集計単位です。",
        },
      ],
      evidence: [
        {
          id: `${projectionId}-readonly-select`,
          label: "read-only select result",
          semanticMeaning: "認可済み GET request 内の参照結果です。",
        },
      ],
      semanticBoundary: "reasoning_visualization_only",
    },
    truthStatement:
      "inventory_transactions aggregate が truth input で、inventory_current は compare target です。",
  };
}

function buildReadOnlyData(
  fallbackData: InventoryIntegrityReadOnlyData,
  quantities: readonly CompareQuantity[],
  generatedAt: string,
  compareHardening: InventoryCompareHardeningMetadata,
): InventoryIntegrityReadOnlyData {
  const compareProjections = quantities
    .map((quantity) => buildCompareProjection(quantity, generatedAt, compareHardening))
    .sort((a, b) => a.id.localeCompare(b.id));
  const mismatchCount = compareProjections.filter(
    (projection) => projection.difference.compareStatus !== "matched",
  ).length;

  return {
    ...fallbackData,
    summaries: [
      {
        label: "real compare visibility",
        value: `${compareProjections.length} rows`,
        level: mismatchCount > 0 ? "watch" : "stable",
        status: mismatchCount > 0 ? "review_needed" : "compare_ready",
        description:
          "inventory_transactions aggregate と inventory_current cache の read-only compare visibility です。",
      },
      ...fallbackData.summaries,
    ],
    compareProjections,
  };
}

function resolveResponseClassification(
  compareHardening: InventoryCompareHardeningMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareClassificationMetadata {
  if (compareHardening.sourceStatus === "compare_source_unavailable") {
    return createCompareClassificationMetadata({
      classification: "compare_unverified",
      reason: "compare source unavailable response",
    });
  }
  const firstVisibleClassification = compareProjections.find(
    (projection) => projection.difference.mismatchClassification,
  )?.difference.mismatchClassification;

  return createCompareClassificationMetadata({
    classification:
      firstVisibleClassification ??
      (compareHardening.resultStatus === "compare_result_empty"
        ? "compare_unverified"
        : "compare_partial"),
    reason:
      firstVisibleClassification ??
      "response level read-only compare classification visibility",
  });
}

function resolveResponseSeverity(
  compareClassification: InventoryCompareClassificationMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareSeverityMetadata {
  const firstVisibleSeverity = compareProjections.find(
    (projection) => projection.metadata.compareSeverity,
  )?.metadata.compareSeverity;

  return (
    firstVisibleSeverity ??
    createCompareSeverityMetadata({
      classification: compareClassification.classification,
      severity: severityForClassification(compareClassification.classification),
      reason: "response level read-only compare severity visibility",
    })
  );
}

function resolveResponseReviewReadiness(
  compareSeverity: InventoryCompareSeverityMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareReviewReadinessMetadata {
  const firstVisibleReadiness = compareProjections.find(
    (projection) => projection.metadata.compareReviewReadiness,
  )?.metadata.compareReviewReadiness;

  return (
    firstVisibleReadiness ??
    createCompareReviewReadinessMetadata({
      readiness: readinessForSeverity(
        compareSeverity.severity,
        compareSeverity.classification,
      ),
      severity: compareSeverity.severity,
      classification: compareSeverity.classification,
      reason: "response level read-only governance review readiness visibility",
    })
  );
}

function resolveResponseEscalationReadiness(
  compareReviewReadiness: InventoryCompareReviewReadinessMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareEscalationReadinessMetadata {
  const firstVisibleReadiness = compareProjections.find(
    (projection) => projection.metadata.compareEscalationReadiness,
  )?.metadata.compareEscalationReadiness;

  return (
    firstVisibleReadiness ??
    createCompareEscalationReadinessMetadata({
      readiness: escalationForReviewReadiness(compareReviewReadiness.readiness),
      reviewReadiness: compareReviewReadiness.readiness,
      severity: compareReviewReadiness.severity,
      classification: compareReviewReadiness.classification,
      reason: "response level read-only governance escalation readiness visibility",
    })
  );
}

function resolveResponseOperationalPriority(
  compareEscalationReadiness: InventoryCompareEscalationReadinessMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareOperationalPriorityMetadata {
  const firstVisiblePriority = compareProjections.find(
    (projection) => projection.metadata.compareOperationalPriority,
  )?.metadata.compareOperationalPriority;

  return (
    firstVisiblePriority ??
    createCompareOperationalPriorityMetadata({
      priority: priorityForOperationalInterpretation({
        escalationReadiness: compareEscalationReadiness.readiness,
        reviewReadiness: compareEscalationReadiness.reviewReadiness,
        severity: compareEscalationReadiness.severity,
        classification: compareEscalationReadiness.classification,
      }),
      escalationReadiness: compareEscalationReadiness.readiness,
      reviewReadiness: compareEscalationReadiness.reviewReadiness,
      severity: compareEscalationReadiness.severity,
      classification: compareEscalationReadiness.classification,
      reason: "response level read-only operational priority visibility",
    })
  );
}

function resolveResponseOwnership(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperationalPriority: InventoryCompareOperationalPriorityMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareOwnershipMetadata {
  const firstVisibleOwnership = compareProjections.find(
    (projection) => projection.metadata.compareOwnership,
  )?.metadata.compareOwnership;

  return (
    firstVisibleOwnership ??
    createCompareOwnershipMetadata({
      ownership: ownershipForCompareSemantics({
        compareHardening,
        operationalPriority: compareOperationalPriority.priority,
        escalationReadiness: compareOperationalPriority.escalationReadiness,
        severity: compareOperationalPriority.severity,
        classification: compareOperationalPriority.classification,
      }),
      operationalPriority: compareOperationalPriority.priority,
      escalationReadiness: compareOperationalPriority.escalationReadiness,
      reviewReadiness: compareOperationalPriority.reviewReadiness,
      severity: compareOperationalPriority.severity,
      classification: compareOperationalPriority.classification,
      ownershipSource: "response_level_compare_semantics_chain",
      ownershipSignals: [
        compareOperationalPriority.classification,
        compareOperationalPriority.severity,
        compareOperationalPriority.escalationReadiness,
        compareOperationalPriority.priority,
        compareHardening.sourceStatus,
      ],
    })
  );
}

function resolveResponseOwnerActionability(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOwnership: InventoryCompareOwnershipMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareOwnerActionabilityMetadata {
  const firstVisibleActionability = compareProjections.find(
    (projection) => projection.metadata.compareOwnerActionability,
  )?.metadata.compareOwnerActionability;

  return (
    firstVisibleActionability ??
    createCompareOwnerActionabilityMetadata({
      ownerActionability: actionabilityForOwnership({
        compareHardening,
        ownership: compareOwnership.ownership,
        operationalPriority: compareOwnership.operationalPriority,
        escalationReadiness: compareOwnership.escalationReadiness,
        severity: compareOwnership.severity,
        classification: compareOwnership.classification,
      }),
      ownership: compareOwnership.ownership,
      operationalPriority: compareOwnership.operationalPriority,
      escalationReadiness: compareOwnership.escalationReadiness,
      reviewReadiness: compareOwnership.reviewReadiness,
      severity: compareOwnership.severity,
      classification: compareOwnership.classification,
      actionabilitySource: "response_level_compare_ownership_chain",
      actionabilitySignals: [
        compareOwnership.ownership,
        compareOwnership.operationalPriority,
        compareOwnership.escalationReadiness,
        compareOwnership.severity,
        compareOwnership.classification,
        compareHardening.sourceStatus,
      ],
    })
  );
}

export async function GET(req: NextRequest) {
  const guard = await requireAdminDashboardRole(req);
  if (!guard.ok) {
    return createUnavailableReadOnlyResponse({
      status: guard.status,
      error: guard.error,
      scopeStatus: guard.scopeStatus,
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey) {
    return createUnavailableReadOnlyResponse({
      status: 500,
      error: "supabase_env_unavailable",
      scopeStatus: "unavailable_scope",
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${guard.token}` } },
  });
  const generatedAt = new Date().toISOString();
  const quantities = new Map<string, CompareQuantity>();

  const transactionResult = await supabase
    .from("inventory_transactions")
    .select(
      "transaction_type, part_no, quantity, warehouse_code, from_warehouse_code, to_warehouse_code, event_at, created_at",
    )
    .or(
      `warehouse_code.eq.${guard.warehouseCode},from_warehouse_code.eq.${guard.warehouseCode},to_warehouse_code.eq.${guard.warehouseCode}`,
    )
    .range(0, 9999);

  if (transactionResult.error) {
    return createUnavailableReadOnlyResponse({
      status: 500,
      error: "transaction_read_unavailable",
      scopeStatus: "valid_scope",
    });
  }

  const currentResult = await supabase
    .from("inventory_current")
    .select("part_no, warehouse_code, quantity_on_hand, updated_at")
    .eq("warehouse_code", guard.warehouseCode)
    .range(0, 9999);

  if (currentResult.error) {
    return createUnavailableReadOnlyResponse({
      status: 500,
      error: "current_read_unavailable",
      scopeStatus: "valid_scope",
    });
  }

  ((transactionResult.data ?? []) as InventoryTransactionRow[]).forEach((row) =>
    addTransactionQuantity(quantities, row, guard.warehouseCode, generatedAt),
  );
  ((currentResult.data ?? []) as InventoryCurrentRow[]).forEach((row) =>
    addCurrentQuantity(quantities, row, generatedAt),
  );

  const transactionRows = transactionResult.data ?? [];
  const currentRows = currentResult.data ?? [];
  const compareHardening = createCompareHardeningMetadata({
    sourceStatus:
      transactionRows.length === 0 || currentRows.length === 0
        ? "compare_source_degraded"
        : "compare_source_available",
    resultStatus:
      quantities.size === 0 ? "compare_result_empty" : "compare_result_partial",
    scopeStatus:
      transactionRows.length === 0 || currentRows.length === 0
        ? "degraded_scope"
        : "valid_scope",
    reason:
      quantities.size === 0
        ? "read-only compare source returned no comparable rows"
        : "read-only compare source returned partial visibility rows",
  });
  const fallbackData = getInventoryIntegrityMockData();
  const readOnlyData = buildReadOnlyData(
    fallbackData,
    Array.from(quantities.values()),
    generatedAt,
    compareHardening,
  );
  const compareClassification = resolveResponseClassification(
    compareHardening,
    readOnlyData.compareProjections,
  );
  const compareSeverity = resolveResponseSeverity(
    compareClassification,
    readOnlyData.compareProjections,
  );
  const compareReviewReadiness = resolveResponseReviewReadiness(
    compareSeverity,
    readOnlyData.compareProjections,
  );
  const compareEscalationReadiness = resolveResponseEscalationReadiness(
    compareReviewReadiness,
    readOnlyData.compareProjections,
  );
  const compareOperationalPriority = resolveResponseOperationalPriority(
    compareEscalationReadiness,
    readOnlyData.compareProjections,
  );
  const compareOwnership = resolveResponseOwnership(
    compareHardening,
    compareOperationalPriority,
    readOnlyData.compareProjections,
  );
  const compareOwnerActionability = resolveResponseOwnerActionability(
    compareHardening,
    compareOwnership,
    readOnlyData.compareProjections,
  );
  const endpointContract = createInventoryIntegrityReadOnlyEndpointContract(endpointPath);
  const request = createInventoryIntegrityReadOnlyEdgeRequest(endpointContract);
  const fetchResult = createInventoryIntegrityFetchResult(
    realReadOnlyProjectionSourceMetadata,
    readOnlyData,
    request,
    "future_edge_fetch_result",
    undefined,
    compareHardening,
    compareClassification,
    compareSeverity,
    compareReviewReadiness,
    compareEscalationReadiness,
    compareOperationalPriority,
    compareOwnership,
    compareOwnerActionability,
  );
  const payload = adaptFetchResponseToPayload(fetchResult);
  const mappedResponse = mapEdgeProjectionResponse({
    payload,
    semanticBoundary: payload.semanticBoundary,
    executionBoundary: payload.executionBoundary,
  });

  return NextResponse.json({
    ok: true,
    endpoint: endpointPath,
    method: "GET",
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    warehouseCode: guard.warehouseCode,
    compareHardening,
    compareClassification,
    compareSeverity,
    compareReviewReadiness,
    compareEscalationReadiness,
    compareOperationalPriority,
    compareOwnership,
    compareOwnerActionability,
    normalizedData: mappedResponse.normalizedData,
    metadata: mappedResponse.metadata,
    statusSemantics: mappedResponse.statusSemantics,
    semanticBoundary: mappedResponse.semanticBoundary,
    executionBoundary: mappedResponse.executionBoundary,
  });
}
