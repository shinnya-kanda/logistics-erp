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
  InventoryCompareConfidence,
  InventoryCompareConfidenceMetadata,
  InventoryCompareDecisionReadiness,
  InventoryCompareDecisionReadinessMetadata,
  InventoryCompareEvidenceMetadata,
  InventoryCompareEvidenceStrength,
  InventoryCompareEscalationReadiness,
  InventoryCompareEscalationReadinessMetadata,
  InventoryCompareHardeningMetadata,
  InventoryCompareInterpretationStability,
  InventoryCompareInterpretationStabilityMetadata,
  InventoryCompareMismatchClassification,
  InventoryCompareOperationalPriority,
  InventoryCompareOperationalPriorityMetadata,
  InventoryCompareOperationalAttention,
  InventoryCompareOperationalAttentionMetadata,
  InventoryCompareGovernancePosture,
  InventoryCompareGovernancePostureMetadata,
  InventoryCompareGovernanceDisposition,
  InventoryCompareGovernanceDispositionMetadata,
  InventoryCompareGovernanceRetention,
  InventoryCompareGovernanceRetentionMetadata,
  InventoryCompareGovernanceAuditTrail,
  InventoryCompareGovernanceAuditTrailMetadata,
  InventoryCompareGovernanceExplainability,
  InventoryCompareGovernanceExplainabilityMetadata,
  InventoryCompareGovernanceReasoningCoherence,
  InventoryCompareGovernanceReasoningCoherenceMetadata,
  InventoryCompareGovernanceSemanticDrift,
  InventoryCompareGovernanceSemanticDriftMetadata,
  InventoryCompareGovernanceSemanticConvergence,
  InventoryCompareGovernanceSemanticConvergenceMetadata,
  InventoryCompareGovernanceSemanticResilience,
  InventoryCompareGovernanceSemanticResilienceMetadata,
  InventoryCompareGovernanceSemanticIntegrityBoundary,
  InventoryCompareGovernanceSemanticIntegrityBoundaryMetadata,
  InventoryCompareGovernanceSemanticRecoverability,
  InventoryCompareGovernanceSemanticRecoverabilityMetadata,
  InventoryCompareGovernanceSemanticObservabilityContinuity,
  InventoryCompareGovernanceSemanticObservabilityContinuityMetadata,
  InventoryCompareGovernanceSemanticDegradationTolerance,
  InventoryCompareGovernanceSemanticDegradationToleranceMetadata,
  InventoryCompareGovernanceSemanticSurvivability,
  InventoryCompareGovernanceSemanticSurvivabilityMetadata,
  InventoryCompareGovernanceSemanticSustainability,
  InventoryCompareGovernanceSemanticSustainabilityMetadata,
  InventoryCompareGovernanceSemanticMaintainability,
  InventoryCompareGovernanceSemanticMaintainabilityMetadata,
  InventoryCompareGovernanceSemanticEvolvability,
  InventoryCompareGovernanceSemanticEvolvabilityMetadata,
  InventoryCompareOperationalImpact,
  InventoryCompareOperationalImpactMetadata,
  InventoryCompareOwnership,
  InventoryCompareOwnershipMetadata,
  InventoryCompareOwnerActionability,
  InventoryCompareOwnerActionabilityMetadata,
  InventoryCompareOperatorGuidance,
  InventoryCompareOperatorGuidanceMetadata,
  InventoryCompareOperatorMessage,
  InventoryCompareOperatorMessageMetadata,
  InventoryCompareOperatorSummary,
  InventoryCompareOperatorSummaryMetadata,
  InventoryCompareOperatorTimeline,
  InventoryCompareOperatorTimelineMetadata,
  InventoryCompareProjectionFreshness,
  InventoryCompareProjectionFreshnessMetadata,
  InventoryCompareProjection,
  InventoryCompareReviewReadiness,
  InventoryCompareReviewReadinessMetadata,
  InventoryCompareRisk,
  InventoryCompareRiskMetadata,
  InventoryCompareSeverity,
  InventoryCompareSeverityMetadata,
  InventoryCompareSourceStatus,
  InventoryCompareStatus,
  InventoryCompareTruthAggregationQuality,
  InventoryCompareTruthAggregationQualityMetadata,
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

function guidanceForActionability({
  compareHardening,
  ownerActionability,
  ownership,
  operationalPriority,
  escalationReadiness,
  severity,
  classification,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly ownerActionability: InventoryCompareOwnerActionability;
  readonly ownership: InventoryCompareOwnership;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly severity: InventoryCompareSeverity;
  readonly classification: InventoryCompareMismatchClassification;
}): InventoryCompareOperatorGuidance {
  if (
    ownerActionability === "blocked_unverified" ||
    ownership === "owner_unknown" ||
    classification === "compare_unverified" ||
    severity === "unverified" ||
    compareHardening.sourceStatus === "compare_source_unavailable"
  ) {
    return "guidance_wait_for_source";
  }
  if (
    ownerActionability === "unassigned_action" ||
    ownership === "owner_unassigned" ||
    compareHardening.sourceStatus === "compare_source_degraded" ||
    compareHardening.scopeStatus !== "valid_scope" ||
    compareHardening.resultStatus === "compare_result_partial"
  ) {
    return "guidance_assign_owner_later";
  }
  if (
    ownerActionability === "action_required" ||
    ownership === "owner_required" ||
    operationalPriority === "priority_p0" ||
    escalationReadiness === "escalation_required" ||
    severity === "critical"
  ) {
    return "guidance_verify_truth_source";
  }
  if (
    ownerActionability === "action_recommended" ||
    ownership === "owner_review_required" ||
    operationalPriority === "priority_p1" ||
    operationalPriority === "priority_p2" ||
    severity === "high" ||
    classification === "aggregation_mismatch" ||
    classification === "quantity_mismatch"
  ) {
    return "guidance_review_projection";
  }
  return "guidance_monitor";
}

function guidanceReason(guidance: InventoryCompareOperatorGuidance): string {
  if (guidance === "guidance_verify_truth_source") {
    return "critical / priority_p0 / escalation_required / owner_required として見えるため、truth source 側の根拠を確認して読む候補です";
  }
  if (guidance === "guidance_review_projection") {
    return "high / priority_p1-p2 / quantity or aggregation mismatch として見えるため、projection 側の表示差分を確認して読む候補です";
  }
  if (guidance === "guidance_monitor") {
    return "monitor_only / owner_resolved_candidate / priority_p3 / warning として見えるため、監視中心で読む候補です";
  }
  if (guidance === "guidance_assign_owner_later") {
    return "owner_unassigned / degraded / partial / invalid scope として見えるため、担当設定の必要性を後で検討して読む候補です";
  }
  return "blocked_unverified / owner_unknown / compare_unverified / unavailable として見えるため、source の検証状態を待って読む候補です";
}

function createCompareOperatorGuidanceMetadata({
  operatorGuidance,
  ownerActionability,
  ownership,
  operationalPriority,
  escalationReadiness,
  reviewReadiness,
  severity,
  classification,
  guidanceSource,
  guidanceSignals,
}: {
  readonly operatorGuidance: InventoryCompareOperatorGuidance;
  readonly ownerActionability: InventoryCompareOwnerActionability;
  readonly ownership: InventoryCompareOwnership;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly severity: InventoryCompareSeverity;
  readonly classification: InventoryCompareMismatchClassification;
  readonly guidanceSource: string;
  readonly guidanceSignals: readonly string[];
}): InventoryCompareOperatorGuidanceMetadata {
  return {
    guidanceId: `inventory-integrity-compare-readonly-${classification}-${operatorGuidance}`,
    operatorGuidance,
    guidanceReason: guidanceReason(operatorGuidance),
    guidanceSource,
    guidanceSignals,
    label: "read-only operator guidance semantics",
    interpretation:
      "operator guidance は画面を見る担当者が次にどの観点を確認して読むとよいかを示す governance / operational observability metadata です。",
    noExecutionMeaning:
      "operator guidance は在庫操作、外部連携、担当設定の変更、案内に基づく実行、在庫変更を開始しません。",
    ownerActionability,
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
      "InventoryCompareOperatorGuidanceMetadata は read-only guidance visibility です。操作導線、担当設定の変更、在庫変更は実行しません。",
  };
}

function messageForGuidance({
  compareHardening,
  operatorGuidance,
  ownerActionability,
  ownership,
  operationalPriority,
  severity,
  classification,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly operatorGuidance: InventoryCompareOperatorGuidance;
  readonly ownerActionability: InventoryCompareOwnerActionability;
  readonly ownership: InventoryCompareOwnership;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly severity: InventoryCompareSeverity;
  readonly classification: InventoryCompareMismatchClassification;
}): InventoryCompareOperatorMessage {
  if (
    operatorGuidance === "guidance_wait_for_source" ||
    ownerActionability === "blocked_unverified" ||
    ownership === "owner_unknown" ||
    classification === "compare_unverified" ||
    severity === "unverified" ||
    compareHardening.sourceStatus === "compare_source_unavailable"
  ) {
    return "message_wait_for_compare_source";
  }
  if (
    operatorGuidance === "guidance_assign_owner_later" ||
    ownerActionability === "unassigned_action" ||
    ownership === "owner_unassigned" ||
    compareHardening.sourceStatus === "compare_source_degraded" ||
    compareHardening.scopeStatus !== "valid_scope" ||
    compareHardening.resultStatus === "compare_result_partial"
  ) {
    return "message_owner_not_assigned";
  }
  if (
    operatorGuidance === "guidance_verify_truth_source" ||
    ownerActionability === "action_required" ||
    ownership === "owner_required" ||
    operationalPriority === "priority_p0" ||
    severity === "critical"
  ) {
    return "message_verify_transaction_history";
  }
  if (
    operatorGuidance === "guidance_review_projection" ||
    ownerActionability === "action_recommended" ||
    operationalPriority === "priority_p1" ||
    operationalPriority === "priority_p2" ||
    severity === "high" ||
    classification === "aggregation_mismatch" ||
    classification === "quantity_mismatch"
  ) {
    return "message_check_projection_cache";
  }
  return "message_monitor_minor_difference";
}

function messageText(message: InventoryCompareOperatorMessage): string {
  if (message === "message_verify_transaction_history") {
    return "transaction history の確認候補です";
  }
  if (message === "message_check_projection_cache") {
    return "projection cache の差異確認候補です";
  }
  if (message === "message_monitor_minor_difference") {
    return "軽微な差異として監視する表示です";
  }
  if (message === "message_owner_not_assigned") {
    return "owner 未確定のため確認担当の整理が必要そうです";
  }
  return "compare source の検証後に判断する表示です";
}

function messageReason(message: InventoryCompareOperatorMessage): string {
  if (message === "message_verify_transaction_history") {
    return "truth source の履歴確認候補として読むための短い表示文です";
  }
  if (message === "message_check_projection_cache") {
    return "projection cache 側の差異確認候補として読むための短い表示文です";
  }
  if (message === "message_monitor_minor_difference") {
    return "監視中心で読む候補として整理するための短い表示文です";
  }
  if (message === "message_owner_not_assigned") {
    return "owner が未確定に見える状態を担当設定済みと誤読しないための短い表示文です";
  }
  return "compare source が未検証に見える状態を確定情報と誤読しないための短い表示文です";
}

function createCompareOperatorMessageMetadata({
  operatorMessage,
  operatorGuidance,
  ownerActionability,
  ownership,
  operationalPriority,
  escalationReadiness,
  reviewReadiness,
  severity,
  classification,
  messageSource,
  messageSignals,
}: {
  readonly operatorMessage: InventoryCompareOperatorMessage;
  readonly operatorGuidance: InventoryCompareOperatorGuidance;
  readonly ownerActionability: InventoryCompareOwnerActionability;
  readonly ownership: InventoryCompareOwnership;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly severity: InventoryCompareSeverity;
  readonly classification: InventoryCompareMismatchClassification;
  readonly messageSource: string;
  readonly messageSignals: readonly string[];
}): InventoryCompareOperatorMessageMetadata {
  return {
    messageId: `inventory-integrity-compare-readonly-${classification}-${operatorMessage}`,
    operatorMessage,
    messageText: messageText(operatorMessage),
    messageReason: messageReason(operatorMessage),
    messageSource,
    messageSignals,
    label: "read-only operator message semantics",
    interpretation:
      "operator message は担当者が差異を短く理解するための governance / operational observability metadata です。",
    noExecutionMeaning:
      "operator message は在庫操作、外部連携、担当設定の変更、案内文に基づく実行、在庫変更を開始しません。",
    operatorGuidance,
    ownerActionability,
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
      "InventoryCompareOperatorMessageMetadata は read-only message visibility です。操作導線、担当設定の変更、在庫変更は実行しません。",
  };
}

function summaryText(summary: InventoryCompareOperatorSummary): string {
  if (summary === "summary_action_required") {
    return "即確認が必要な差異があります";
  }
  if (summary === "summary_source_unverified") {
    return "compare source 未検証のため確認保留です";
  }
  if (summary === "summary_owner_unassigned") {
    return "owner 未確定の差異があります";
  }
  if (summary === "summary_review_needed") {
    return "レビュー対象の差異があります";
  }
  return "重大な差異はありません";
}

function summaryReason(summary: InventoryCompareOperatorSummary): string {
  if (summary === "summary_action_required") {
    return "action_required / priority_p0 / owner_required / truth source guidance が少なくとも1件見えるため、全体を即確認候補として表示します";
  }
  if (summary === "summary_source_unverified") {
    return "blocked_unverified / owner_unknown / compare_unverified / source 待ち guidance が少なくとも1件見えるため、全体を source 未検証として表示します";
  }
  if (summary === "summary_owner_unassigned") {
    return "owner_unassigned / unassigned_action / owner 整理 guidance が少なくとも1件見えるため、全体を owner 未確定として表示します";
  }
  if (summary === "summary_review_needed") {
    return "action_recommended / review_required / review_recommended / priority_p1-p2 が少なくとも1件見えるため、全体をレビュー対象として表示します";
  }
  return "重大な確認対象が見えないため、全体を参照表示として集約します";
}

function summaryForCompareResult(
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareOperatorSummary {
  const metadataList = compareProjections.map((projection) => projection.metadata);
  if (
    metadataList.some(
      (metadata) =>
        metadata.compareOwnerActionability?.ownerActionability === "action_required" ||
        metadata.compareOperationalPriority?.priority === "priority_p0" ||
        metadata.compareOwnership?.ownership === "owner_required" ||
        metadata.compareOperatorGuidance?.operatorGuidance ===
          "guidance_verify_truth_source",
    )
  ) {
    return "summary_action_required";
  }
  if (
    metadataList.some(
      (metadata) =>
        metadata.compareOwnerActionability?.ownerActionability === "blocked_unverified" ||
        metadata.compareOwnership?.ownership === "owner_unknown" ||
        metadata.compareClassification?.classification === "compare_unverified" ||
        metadata.compareOperatorGuidance?.operatorGuidance === "guidance_wait_for_source",
    )
  ) {
    return "summary_source_unverified";
  }
  if (
    metadataList.some(
      (metadata) =>
        metadata.compareOwnership?.ownership === "owner_unassigned" ||
        metadata.compareOwnerActionability?.ownerActionability === "unassigned_action" ||
        metadata.compareOperatorGuidance?.operatorGuidance ===
          "guidance_assign_owner_later",
    )
  ) {
    return "summary_owner_unassigned";
  }
  if (
    metadataList.some(
      (metadata) =>
        metadata.compareOwnerActionability?.ownerActionability ===
          "action_recommended" ||
        metadata.compareReviewReadiness?.readiness === "review_required" ||
        metadata.compareReviewReadiness?.readiness === "review_recommended" ||
        metadata.compareOperationalPriority?.priority === "priority_p1" ||
        metadata.compareOperationalPriority?.priority === "priority_p2",
    )
  ) {
    return "summary_review_needed";
  }
  return "summary_all_clear";
}

function summarySignalsForCompareResult(
  compareProjections: readonly InventoryCompareProjection[],
): readonly string[] {
  return compareProjections.flatMap((projection) => {
    const metadata = projection.metadata;
    return [
      projection.id,
      metadata.compareClassification?.classification,
      metadata.compareSeverity?.severity,
      metadata.compareReviewReadiness?.readiness,
      metadata.compareEscalationReadiness?.readiness,
      metadata.compareOperationalPriority?.priority,
      metadata.compareOwnership?.ownership,
      metadata.compareOwnerActionability?.ownerActionability,
      metadata.compareOperatorGuidance?.operatorGuidance,
      metadata.compareOperatorMessage?.operatorMessage,
    ].filter((signal): signal is string => typeof signal === "string");
  });
}

function createCompareOperatorSummaryMetadata({
  operatorSummary,
  itemCount,
  summarySource,
  summarySignals,
}: {
  readonly operatorSummary: InventoryCompareOperatorSummary;
  readonly itemCount: number;
  readonly summarySource: string;
  readonly summarySignals: readonly string[];
}): InventoryCompareOperatorSummaryMetadata {
  return {
    summaryId: `inventory-integrity-compare-readonly-${operatorSummary}`,
    operatorSummary,
    summaryText: summaryText(operatorSummary),
    summaryReason: summaryReason(operatorSummary),
    summarySource,
    summarySignals,
    itemCount,
    label: "read-only operator summary semantics",
    interpretation:
      "operator summary は compare result 全体を短く把握するための governance / operational observability metadata です。",
    noExecutionMeaning:
      "operator summary は在庫操作、外部連携、担当設定の変更、summary に基づく実行、在庫変更を開始しません。",
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareOperatorSummaryMetadata は read-only summary visibility です。操作導線、担当設定の変更、在庫変更は実行しません。",
  };
}

function timelineForSemantics({
  compareHardening,
  operatorGuidance,
  ownerActionability,
  ownership,
  operationalPriority,
  severity,
  classification,
  operatorSummary,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly operatorGuidance: InventoryCompareOperatorGuidance;
  readonly ownerActionability: InventoryCompareOwnerActionability;
  readonly ownership: InventoryCompareOwnership;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly severity: InventoryCompareSeverity;
  readonly classification: InventoryCompareMismatchClassification;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
}): InventoryCompareOperatorTimeline {
  if (
    operatorGuidance === "guidance_wait_for_source" ||
    ownerActionability === "blocked_unverified" ||
    classification === "compare_unverified" ||
    severity === "unverified" ||
    operatorSummary === "summary_source_unverified" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.resultStatus === "compare_result_unverified"
  ) {
    return "timeline_wait_for_confirmation";
  }
  if (
    operatorGuidance === "guidance_assign_owner_later" ||
    ownerActionability === "unassigned_action" ||
    ownership === "owner_unassigned" ||
    operatorSummary === "summary_owner_unassigned" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    compareHardening.scopeStatus === "invalid_scope"
  ) {
    return "timeline_review_owner_boundary";
  }
  if (
    operatorGuidance === "guidance_verify_truth_source" ||
    ownerActionability === "action_required" ||
    ownership === "owner_required" ||
    operationalPriority === "priority_p0" ||
    severity === "critical" ||
    operatorSummary === "summary_action_required"
  ) {
    return "timeline_verify_source";
  }
  if (
    operatorGuidance === "guidance_review_projection" ||
    ownerActionability === "action_recommended" ||
    classification === "aggregation_mismatch" ||
    classification === "quantity_mismatch" ||
    classification === "degraded_projection"
  ) {
    return "timeline_review_projection";
  }
  return "timeline_monitor_difference";
}

function timelineText(timeline: InventoryCompareOperatorTimeline): string {
  if (timeline === "timeline_verify_source") {
    return "source transaction の確認順です";
  }
  if (timeline === "timeline_review_projection") {
    return "projection 差異確認順です";
  }
  if (timeline === "timeline_wait_for_confirmation") {
    return "compare source 検証待ち順です";
  }
  if (timeline === "timeline_review_owner_boundary") {
    return "owner boundary 確認順です";
  }
  return "軽微差異監視順です";
}

function timelineReason(timeline: InventoryCompareOperatorTimeline): string {
  if (timeline === "timeline_verify_source") {
    return "truth source 側から読むと安全な差異候補として整理します";
  }
  if (timeline === "timeline_review_projection") {
    return "projection / cache 側の差異として読むと安全な候補として整理します";
  }
  if (timeline === "timeline_wait_for_confirmation") {
    return "compare source が未検証または不足して見えるため、判断保留の読み順として整理します";
  }
  if (timeline === "timeline_review_owner_boundary") {
    return "owner や scope の境界が曖昧に見えるため、境界確認の読み順として整理します";
  }
  return "重大な確認対象が見えないため、監視中心の読み順として整理します";
}

function createCompareOperatorTimelineMetadata({
  operatorTimeline,
  operatorSummary,
  operatorMessage,
  operatorGuidance,
  ownerActionability,
  ownership,
  operationalPriority,
  escalationReadiness,
  reviewReadiness,
  severity,
  classification,
  timelineSource,
  timelineSignals,
}: {
  readonly operatorTimeline: InventoryCompareOperatorTimeline;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorMessage: InventoryCompareOperatorMessage;
  readonly operatorGuidance: InventoryCompareOperatorGuidance;
  readonly ownerActionability: InventoryCompareOwnerActionability;
  readonly ownership: InventoryCompareOwnership;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly severity: InventoryCompareSeverity;
  readonly classification: InventoryCompareMismatchClassification;
  readonly timelineSource: string;
  readonly timelineSignals: readonly string[];
}): InventoryCompareOperatorTimelineMetadata {
  return {
    timelineId: `inventory-integrity-compare-readonly-${classification}-${operatorTimeline}`,
    operatorTimeline,
    timelineText: timelineText(operatorTimeline),
    timelineReason: timelineReason(operatorTimeline),
    timelineSource,
    timelineSignals,
    label: "read-only operator timeline semantics",
    interpretation:
      "operator timeline は差異を安全に読む確認順を示す governance / operational observability metadata です。",
    noExecutionMeaning:
      "operator timeline は在庫操作、外部連携、担当設定の変更、確認順に基づく在庫変更を開始しません。",
    operatorSummary,
    operatorMessage,
    operatorGuidance,
    ownerActionability,
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
      "InventoryCompareOperatorTimelineMetadata は read-only timeline visibility です。操作導線、担当設定の変更、在庫変更は実行しません。",
  };
}

function confidenceForSemantics({
  compareHardening,
  classification,
  severity,
  operatorSummary,
  operatorTimeline,
  compareStatus,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly classification: InventoryCompareMismatchClassification;
  readonly severity: InventoryCompareSeverity;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly compareStatus?: InventoryCompareStatus;
}): InventoryCompareConfidence {
  if (
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "invalid_scope" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    compareHardening.resultStatus === "compare_result_unverified" ||
    classification === "unavailable_projection"
  ) {
    return "confidence_blocked";
  }
  if (
    classification === "compare_unverified" ||
    severity === "unverified" ||
    operatorSummary === "summary_source_unverified" ||
    operatorTimeline === "timeline_wait_for_confirmation"
  ) {
    return "confidence_unverified";
  }
  if (
    compareHardening.sourceStatus === "compare_source_degraded" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    compareHardening.resultStatus === "compare_result_empty" ||
    classification === "stale_projection" ||
    classification === "degraded_projection" ||
    classification === "scope_mismatch" ||
    (classification === "compare_partial" && compareStatus !== "matched") ||
    operatorTimeline === "timeline_review_owner_boundary"
  ) {
    return "confidence_low";
  }
  if (
    classification === "quantity_mismatch" ||
    classification === "aggregation_mismatch" ||
    classification === "negative_projection" ||
    classification === "negative_truth" ||
    operatorTimeline === "timeline_review_projection" ||
    severity === "high" ||
    severity === "critical"
  ) {
    return "confidence_medium";
  }
  return "confidence_high";
}

function confidenceText(confidence: InventoryCompareConfidence): string {
  if (confidence === "confidence_high") {
    return "compare 結果は高信頼です";
  }
  if (confidence === "confidence_medium") {
    return "compare 結果は条件付きで確認できます";
  }
  if (confidence === "confidence_low") {
    return "compare 結果は低信頼として扱います";
  }
  if (confidence === "confidence_unverified") {
    return "compare source 未検証のため信頼度未確定です";
  }
  return "compare source unavailable のため判断保留です";
}

function confidenceReason(confidence: InventoryCompareConfidence): string {
  if (confidence === "confidence_high") {
    return "source / scope が確認可能で、強い制限 signal が見えないため、説明材料が比較的そろっている表示です";
  }
  if (confidence === "confidence_medium") {
    return "source / scope は確認可能ですが、差異や確認候補が見えるため、条件付きの説明材料として表示します";
  }
  if (confidence === "confidence_low") {
    return "partial / degraded / stale / scope 制限が見えるため、過信しない表示として整理します";
  }
  if (confidence === "confidence_unverified") {
    return "compare source または判定材料が未検証に見えるため、信頼度を確定しない表示として整理します";
  }
  return "compare source または scope が利用できないため、判断保留の表示として整理します";
}

function createCompareConfidenceMetadata({
  compareConfidence,
  compareHardening,
  classification,
  severity,
  operatorSummary,
  operatorTimeline,
  confidenceSource,
  confidenceSignals,
}: {
  readonly compareConfidence: InventoryCompareConfidence;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly classification: InventoryCompareMismatchClassification;
  readonly severity: InventoryCompareSeverity;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly confidenceSource: string;
  readonly confidenceSignals: readonly string[];
}): InventoryCompareConfidenceMetadata {
  return {
    confidenceId: `inventory-integrity-compare-readonly-${classification}-${compareConfidence}`,
    compareConfidence,
    confidenceText: confidenceText(compareConfidence),
    confidenceReason: confidenceReason(compareConfidence),
    confidenceSource,
    confidenceSignals,
    label: "read-only compare confidence semantics",
    interpretation:
      "compare confidence は compare 結果の説明材料がどの程度そろって見えるかを示す governance / operational observability metadata です。",
    noExecutionMeaning:
      "compare confidence は在庫操作、外部連携、担当設定の変更、信頼度に基づく在庫変更を開始しません。",
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    classification,
    severity,
    operatorSummary,
    operatorTimeline,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareConfidenceMetadata は read-only confidence visibility です。操作導線、担当設定の変更、在庫変更は実行しません。",
  };
}

function projectionFreshnessForSemantics({
  compareHardening,
  compareConfidence,
  classification,
  severity,
  operatorSummary,
  operatorTimeline,
  compareStatus,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly classification: InventoryCompareMismatchClassification;
  readonly severity: InventoryCompareSeverity;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly compareStatus?: InventoryCompareStatus;
}): InventoryCompareProjectionFreshness {
  if (
    compareConfidence === "confidence_blocked" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    classification === "unavailable_projection"
  ) {
    return "freshness_unavailable";
  }
  if (
    compareConfidence === "confidence_unverified" ||
    classification === "compare_unverified" ||
    severity === "unverified" ||
    operatorSummary === "summary_source_unverified" ||
    operatorTimeline === "timeline_wait_for_confirmation" ||
    compareHardening.resultStatus === "compare_result_unverified"
  ) {
    return "freshness_unknown";
  }
  if (
    compareConfidence === "confidence_low" ||
    compareHardening.sourceStatus === "compare_source_degraded" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    compareHardening.scopeStatus === "invalid_scope" ||
    compareHardening.resultStatus === "compare_result_empty" ||
    classification === "stale_projection" ||
    classification === "degraded_projection" ||
    classification === "scope_mismatch" ||
    (classification === "compare_partial" && compareStatus !== "matched")
  ) {
    return "freshness_stale";
  }
  if (
    compareConfidence === "confidence_medium" ||
    classification === "quantity_mismatch" ||
    classification === "aggregation_mismatch" ||
    classification === "negative_projection" ||
    classification === "negative_truth" ||
    operatorTimeline === "timeline_review_projection" ||
    severity === "warning" ||
    severity === "high" ||
    severity === "critical"
  ) {
    return "freshness_recent";
  }
  return "freshness_current";
}

function projectionFreshnessText(freshness: InventoryCompareProjectionFreshness): string {
  if (freshness === "freshness_current") {
    return "projection は現在状態として扱えます";
  }
  if (freshness === "freshness_recent") {
    return "projection は直近状態として参考表示です";
  }
  if (freshness === "freshness_stale") {
    return "projection は古い可能性があります";
  }
  if (freshness === "freshness_unknown") {
    return "projection 鮮度は未確定です";
  }
  return "projection が利用できないため判断保留です";
}

function projectionFreshnessReason(freshness: InventoryCompareProjectionFreshness): string {
  if (freshness === "freshness_current") {
    return "source / scope / confidence が確認可能で、stale や degraded の signal が見えないため、現在状態に近い表示として整理します";
  }
  if (freshness === "freshness_recent") {
    return "source は利用可能ですが、差異や warning が見えるため、直近の参考表示として整理します";
  }
  if (freshness === "freshness_stale") {
    return "stale / degraded / partial / low confidence の signal が見えるため、古い可能性のある表示として整理します";
  }
  if (freshness === "freshness_unknown") {
    return "compare source または判定材料が未検証に見えるため、projection の鮮度を確定しない表示として整理します";
  }
  return "projection source または scope が利用できないため、判断保留の表示として整理します";
}

function createCompareProjectionFreshnessMetadata({
  projectionFreshness,
  compareHardening,
  compareConfidence,
  classification,
  severity,
  operatorSummary,
  operatorTimeline,
  freshnessSource,
  freshnessSignals,
}: {
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly classification: InventoryCompareMismatchClassification;
  readonly severity: InventoryCompareSeverity;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly freshnessSource: string;
  readonly freshnessSignals: readonly string[];
}): InventoryCompareProjectionFreshnessMetadata {
  return {
    freshnessId: `inventory-integrity-compare-readonly-${classification}-${projectionFreshness}`,
    projectionFreshness,
    freshnessText: projectionFreshnessText(projectionFreshness),
    freshnessReason: projectionFreshnessReason(projectionFreshness),
    freshnessSource,
    freshnessSignals,
    label: "read-only compare projection freshness semantics",
    interpretation:
      "projection freshness は inventory_current / projection の鮮度や古さを読むための governance / operational observability metadata です。",
    noExecutionMeaning:
      "projection freshness は在庫操作、外部連携、担当設定の変更、鮮度に基づく在庫変更を開始しません。",
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    compareConfidence,
    classification,
    severity,
    operatorSummary,
    operatorTimeline,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareProjectionFreshnessMetadata は read-only freshness visibility です。操作導線、担当設定の変更、在庫変更は実行しません。",
  };
}

function truthAggregationQualityForSemantics({
  compareHardening,
  compareConfidence,
  projectionFreshness,
  classification,
  severity,
  operatorSummary,
  operatorTimeline,
  compareStatus,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly classification: InventoryCompareMismatchClassification;
  readonly severity: InventoryCompareSeverity;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly compareStatus?: InventoryCompareStatus;
}): InventoryCompareTruthAggregationQuality {
  if (
    compareConfidence === "confidence_blocked" ||
    projectionFreshness === "freshness_unavailable" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    classification === "unavailable_projection"
  ) {
    return "truth_quality_unavailable";
  }
  if (
    compareConfidence === "confidence_unverified" ||
    projectionFreshness === "freshness_unknown" ||
    classification === "compare_unverified" ||
    severity === "unverified" ||
    operatorSummary === "summary_source_unverified" ||
    operatorTimeline === "timeline_wait_for_confirmation" ||
    compareHardening.resultStatus === "compare_result_unverified"
  ) {
    return "truth_quality_unverified";
  }
  if (
    compareHardening.sourceStatus === "compare_source_degraded" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    compareHardening.scopeStatus === "invalid_scope" ||
    compareHardening.resultStatus === "compare_result_empty" ||
    compareHardening.resultStatus === "compare_result_partial" ||
    classification === "scope_mismatch" ||
    classification === "compare_partial"
  ) {
    return "truth_quality_incomplete";
  }
  if (
    classification === "negative_truth" ||
    classification === "aggregation_mismatch" ||
    severity === "high" ||
    severity === "critical" ||
    operatorSummary === "summary_action_required" ||
    operatorSummary === "summary_review_needed" ||
    operatorTimeline === "timeline_verify_source"
  ) {
    return "truth_quality_warning";
  }
  if (
    compareHardening.sourceStatus === "compare_source_available" &&
    compareHardening.scopeStatus === "valid_scope" &&
    compareConfidence === "confidence_high" &&
    projectionFreshness !== "freshness_stale" &&
    compareStatus === "matched"
  ) {
    return "truth_quality_stable";
  }
  return "truth_quality_warning";
}

function truthQualityText(quality: InventoryCompareTruthAggregationQuality): string {
  if (quality === "truth_quality_stable") {
    return "truth 集計は安定して見えます";
  }
  if (quality === "truth_quality_warning") {
    return "truth 集計に注意が必要です";
  }
  if (quality === "truth_quality_incomplete") {
    return "truth 集計は不完全な可能性があります";
  }
  if (quality === "truth_quality_unverified") {
    return "truth 集計は未検証です";
  }
  return "truth source が利用できないため判断保留です";
}

function truthQualityReason(quality: InventoryCompareTruthAggregationQuality): string {
  if (quality === "truth_quality_stable") {
    return "source / scope / confidence が確認可能で、truth 側の強い注意 signal が見えないため、安定した集計表示として整理します";
  }
  if (quality === "truth_quality_warning") {
    return "negative truth / aggregation mismatch / high severity などの signal が見えるため、注意して読む集計表示として整理します";
  }
  if (quality === "truth_quality_incomplete") {
    return "partial / degraded / scope 制限が見えるため、truth 集計の説明範囲が不完全な可能性として整理します";
  }
  if (quality === "truth_quality_unverified") {
    return "compare source または判定材料が未検証に見えるため、truth 集計を確定しない表示として整理します";
  }
  return "truth source または scope が利用できないため、判断保留の表示として整理します";
}

function createCompareTruthAggregationQualityMetadata({
  truthAggregationQuality,
  compareHardening,
  compareConfidence,
  projectionFreshness,
  classification,
  severity,
  operatorSummary,
  operatorTimeline,
  truthQualitySource,
  truthQualitySignals,
}: {
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly classification: InventoryCompareMismatchClassification;
  readonly severity: InventoryCompareSeverity;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly truthQualitySource: string;
  readonly truthQualitySignals: readonly string[];
}): InventoryCompareTruthAggregationQualityMetadata {
  return {
    truthQualityId: `inventory-integrity-compare-readonly-${classification}-${truthAggregationQuality}`,
    truthAggregationQuality,
    truthQualityText: truthQualityText(truthAggregationQuality),
    truthQualityReason: truthQualityReason(truthAggregationQuality),
    truthQualitySource,
    truthQualitySignals,
    label: "read-only truth aggregation quality semantics",
    interpretation:
      "truth aggregation quality は inventory_transactions 由来の集計結果がどの程度安定して読めるかを示す governance / operational observability metadata です。",
    noExecutionMeaning:
      "truth aggregation quality は在庫操作、外部連携、担当設定の変更、truth 集計品質に基づく在庫変更を開始しません。",
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    compareConfidence,
    projectionFreshness,
    classification,
    severity,
    operatorSummary,
    operatorTimeline,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareTruthAggregationQualityMetadata は read-only truth aggregation visibility です。操作導線、担当設定の変更、在庫変更は実行しません。",
  };
}

function compareEvidenceForSemantics({
  compareHardening,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  classification,
  severity,
  operatorSummary,
  operatorTimeline,
  compareStatus,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly classification: InventoryCompareMismatchClassification;
  readonly severity: InventoryCompareSeverity;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly compareStatus?: InventoryCompareStatus;
}): InventoryCompareEvidenceStrength {
  if (
    compareConfidence === "confidence_blocked" ||
    projectionFreshness === "freshness_unavailable" ||
    truthAggregationQuality === "truth_quality_unavailable" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    classification === "unavailable_projection"
  ) {
    return "evidence_unavailable";
  }
  if (
    compareConfidence === "confidence_unverified" ||
    projectionFreshness === "freshness_unknown" ||
    truthAggregationQuality === "truth_quality_unverified" ||
    classification === "compare_unverified" ||
    severity === "unverified" ||
    operatorSummary === "summary_source_unverified" ||
    operatorTimeline === "timeline_wait_for_confirmation" ||
    compareHardening.resultStatus === "compare_result_unverified"
  ) {
    return "evidence_missing";
  }
  if (
    compareConfidence === "confidence_low" ||
    projectionFreshness === "freshness_stale" ||
    truthAggregationQuality === "truth_quality_incomplete" ||
    compareHardening.sourceStatus === "compare_source_degraded" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    compareHardening.scopeStatus === "invalid_scope" ||
    compareHardening.resultStatus === "compare_result_empty" ||
    compareHardening.resultStatus === "compare_result_partial" ||
    classification === "compare_partial" ||
    classification === "scope_mismatch" ||
    classification === "stale_projection" ||
    classification === "degraded_projection"
  ) {
    return "evidence_weak";
  }
  if (
    compareConfidence === "confidence_medium" ||
    projectionFreshness === "freshness_recent" ||
    truthAggregationQuality === "truth_quality_warning" ||
    severity === "warning" ||
    severity === "high" ||
    severity === "critical" ||
    operatorSummary === "summary_review_needed" ||
    operatorSummary === "summary_action_required" ||
    operatorTimeline === "timeline_verify_source" ||
    operatorTimeline === "timeline_review_projection" ||
    classification === "aggregation_mismatch" ||
    classification === "negative_truth"
  ) {
    return "evidence_moderate";
  }
  if (
    compareHardening.sourceStatus === "compare_source_available" &&
    compareHardening.scopeStatus === "valid_scope" &&
    compareHardening.resultStatus === "compare_result_available" &&
    compareConfidence === "confidence_high" &&
    projectionFreshness === "freshness_current" &&
    truthAggregationQuality === "truth_quality_stable" &&
    compareStatus === "matched"
  ) {
    return "evidence_strong";
  }
  return "evidence_moderate";
}

function evidenceText(evidence: InventoryCompareEvidenceStrength): string {
  if (evidence === "evidence_strong") {
    return "compare 判断根拠は強く見えます";
  }
  if (evidence === "evidence_moderate") {
    return "compare 判断根拠は条件付きです";
  }
  if (evidence === "evidence_weak") {
    return "compare 判断根拠は弱い可能性があります";
  }
  if (evidence === "evidence_missing") {
    return "compare 判断根拠が不足しています";
  }
  return "compare evidence source が利用できないため判断保留です";
}

function evidenceReason(evidence: InventoryCompareEvidenceStrength): string {
  if (evidence === "evidence_strong") {
    return "source / scope / confidence / freshness / truth quality がそろって見えるため、根拠は強い表示として整理します";
  }
  if (evidence === "evidence_moderate") {
    return "主要な根拠は見えますが、注意 signal や条件付きの読み方が残るため、中程度の根拠表示として整理します";
  }
  if (evidence === "evidence_weak") {
    return "partial / degraded / stale / low confidence などの signal が見えるため、根拠に制限がある表示として整理します";
  }
  if (evidence === "evidence_missing") {
    return "未検証または時点不明の signal が見えるため、根拠不足の表示として整理します";
  }
  return "source または scope が利用できないため、根拠 source を判断保留として整理します";
}

function createCompareEvidenceMetadata({
  compareEvidence,
  compareHardening,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  classification,
  severity,
  operatorSummary,
  operatorTimeline,
  evidenceSource,
  evidenceSignals,
}: {
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly classification: InventoryCompareMismatchClassification;
  readonly severity: InventoryCompareSeverity;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly evidenceSource: string;
  readonly evidenceSignals: readonly string[];
}): InventoryCompareEvidenceMetadata {
  return {
    evidenceId: `inventory-integrity-compare-readonly-${classification}-${compareEvidence}`,
    compareEvidence,
    evidenceText: evidenceText(compareEvidence),
    evidenceReason: evidenceReason(compareEvidence),
    evidenceSource,
    evidenceSignals,
    label: "read-only compare evidence semantics",
    interpretation:
      "compare evidence は compare 判断をどの程度の根拠で読めるかを示す governance / operational observability metadata です。",
    noExecutionMeaning:
      "compare evidence は在庫操作、外部連携、担当設定の変更、根拠強度に基づく在庫変更を開始しません。",
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    compareConfidence,
    projectionFreshness,
    truthAggregationQuality,
    classification,
    severity,
    operatorSummary,
    operatorTimeline,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareEvidenceMetadata は read-only evidence visibility です。操作導線、担当設定の変更、在庫変更は実行しません。",
  };
}

function compareRiskForSemantics({
  compareHardening,
  severity,
  operationalPriority,
  ownerActionability,
  operatorSummary,
  operatorTimeline,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  compareEvidence,
  classification,
  compareStatus,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority?: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly classification: InventoryCompareMismatchClassification;
  readonly compareStatus?: InventoryCompareStatus;
}): InventoryCompareRisk {
  if (
    compareConfidence === "confidence_blocked" ||
    compareConfidence === "confidence_unverified" ||
    projectionFreshness === "freshness_unknown" ||
    projectionFreshness === "freshness_unavailable" ||
    truthAggregationQuality === "truth_quality_unverified" ||
    truthAggregationQuality === "truth_quality_unavailable" ||
    compareEvidence === "evidence_missing" ||
    compareEvidence === "evidence_unavailable" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "invalid_scope" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    compareHardening.resultStatus === "compare_result_unverified" ||
    classification === "compare_unverified" ||
    classification === "unavailable_projection" ||
    severity === "unverified"
  ) {
    return "risk_unassessable";
  }
  if (
    severity === "critical" ||
    operationalPriority === "priority_p0" ||
    ownerActionability === "action_required" ||
    operatorSummary === "summary_action_required" ||
    (truthAggregationQuality === "truth_quality_warning" &&
      severity === "high") ||
    ((compareEvidence === "evidence_strong" ||
      compareEvidence === "evidence_moderate") &&
      severity === "high")
  ) {
    return "risk_critical";
  }
  if (
    severity === "high" ||
    operationalPriority === "priority_p1" ||
    operationalPriority === "priority_p2" ||
    ownerActionability === "action_recommended" ||
    operatorSummary === "summary_review_needed" ||
    operatorTimeline === "timeline_verify_source" ||
    operatorTimeline === "timeline_review_projection" ||
    truthAggregationQuality === "truth_quality_warning" ||
    projectionFreshness === "freshness_stale" ||
    compareConfidence === "confidence_low" ||
    compareEvidence === "evidence_weak"
  ) {
    return "risk_high";
  }
  if (
    severity === "warning" ||
    operationalPriority === "priority_p3" ||
    projectionFreshness === "freshness_recent" ||
    compareConfidence === "confidence_medium" ||
    compareEvidence === "evidence_moderate"
  ) {
    return "risk_medium";
  }
  if (
    compareStatus === "matched" &&
    severity === "info" &&
    compareConfidence === "confidence_high" &&
    projectionFreshness === "freshness_current" &&
    truthAggregationQuality === "truth_quality_stable" &&
    compareEvidence === "evidence_strong"
  ) {
    return "risk_low";
  }
  return "risk_medium";
}

function riskText(risk: InventoryCompareRisk): string {
  if (risk === "risk_low") {
    return "業務リスクは低く見えます";
  }
  if (risk === "risk_medium") {
    return "業務リスクは中程度です";
  }
  if (risk === "risk_high") {
    return "業務リスクは高めです";
  }
  if (risk === "risk_critical") {
    return "業務リスクは重大です";
  }
  return "source / evidence 未確定のためリスク評価保留です";
}

function riskReason(risk: InventoryCompareRisk): string {
  if (risk === "risk_low") {
    return "match / info / high confidence / current freshness / stable truth quality / strong evidence がそろって見えるため、低いリスク表示として整理します";
  }
  if (risk === "risk_medium") {
    return "warning または条件付きの confidence / freshness / evidence signal が見えるため、中程度のリスク表示として整理します";
  }
  if (risk === "risk_high") {
    return "high severity、古い可能性、低い説明可能性、弱い根拠などの signal が見えるため、高めのリスク表示として整理します";
  }
  if (risk === "risk_critical") {
    return "critical / p0 / strong attention / high impact signal が見えるため、重大なリスク表示として整理します";
  }
  return "source / scope / confidence / freshness / truth quality / evidence のいずれかが未確定または利用不能に見えるため、評価保留として整理します";
}

function createCompareRiskMetadata({
  compareRisk,
  compareHardening,
  severity,
  operationalPriority,
  ownerActionability,
  operatorSummary,
  operatorTimeline,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  compareEvidence,
  classification,
  riskSource,
  riskSignals,
}: {
  readonly compareRisk: InventoryCompareRisk;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority?: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly classification: InventoryCompareMismatchClassification;
  readonly riskSource: string;
  readonly riskSignals: readonly string[];
}): InventoryCompareRiskMetadata {
  return {
    riskId: `inventory-integrity-compare-readonly-${classification}-${compareRisk}`,
    compareRisk,
    riskText: riskText(compareRisk),
    riskReason: riskReason(compareRisk),
    riskSource,
    riskSignals,
    label: "read-only compare risk semantics",
    interpretation:
      "compare risk は compare 結果が業務上どれくらい注意して読まれるべきかを示す governance / operational observability metadata です。",
    noExecutionMeaning:
      "compare risk は在庫操作、外部連携、担当設定の変更、リスク表示に基づく在庫変更を開始しません。",
    severity,
    operationalPriority,
    ownerActionability,
    operatorSummary,
    operatorTimeline,
    compareConfidence,
    projectionFreshness,
    truthAggregationQuality,
    compareEvidence,
    classification,
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareRiskMetadata は read-only risk visibility です。操作導線、担当設定の変更、在庫変更は実行しません。",
  };
}

function interpretationStabilityForSemantics({
  compareHardening,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  compareEvidence,
  compareRisk,
  classification,
  severity,
  operatorSummary,
  operatorTimeline,
  compareStatus,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareRisk: InventoryCompareRisk;
  readonly classification: InventoryCompareMismatchClassification;
  readonly severity: InventoryCompareSeverity;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly compareStatus?: InventoryCompareStatus;
}): InventoryCompareInterpretationStability {
  if (
    compareConfidence === "confidence_blocked" ||
    projectionFreshness === "freshness_unavailable" ||
    truthAggregationQuality === "truth_quality_unavailable" ||
    compareEvidence === "evidence_unavailable" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    classification === "unavailable_projection"
  ) {
    return "stability_unavailable";
  }
  if (
    compareConfidence === "confidence_unverified" ||
    projectionFreshness === "freshness_unknown" ||
    truthAggregationQuality === "truth_quality_unverified" ||
    compareEvidence === "evidence_missing" ||
    compareRisk === "risk_unassessable" ||
    classification === "compare_unverified" ||
    severity === "unverified" ||
    operatorSummary === "summary_source_unverified" ||
    operatorTimeline === "timeline_wait_for_confirmation" ||
    compareHardening.resultStatus === "compare_result_unverified"
  ) {
    return "stability_unverified";
  }
  if (
    compareConfidence === "confidence_low" ||
    projectionFreshness === "freshness_stale" ||
    truthAggregationQuality === "truth_quality_incomplete" ||
    compareEvidence === "evidence_weak" ||
    compareRisk === "risk_high" ||
    compareRisk === "risk_critical" ||
    compareHardening.sourceStatus === "compare_source_degraded" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    compareHardening.scopeStatus === "invalid_scope" ||
    compareHardening.resultStatus === "compare_result_empty" ||
    compareHardening.resultStatus === "compare_result_partial" ||
    classification === "compare_partial" ||
    classification === "scope_mismatch" ||
    classification === "stale_projection" ||
    classification === "degraded_projection"
  ) {
    return "stability_fragile";
  }
  if (
    severity === "warning" ||
    compareConfidence === "confidence_medium" ||
    projectionFreshness === "freshness_recent" ||
    truthAggregationQuality === "truth_quality_warning" ||
    compareEvidence === "evidence_moderate" ||
    compareRisk === "risk_medium" ||
    operatorSummary === "summary_review_needed" ||
    operatorSummary === "summary_action_required" ||
    operatorTimeline === "timeline_verify_source" ||
    operatorTimeline === "timeline_review_projection"
  ) {
    return "stability_fluctuating";
  }
  if (
    compareHardening.sourceStatus === "compare_source_available" &&
    compareHardening.scopeStatus === "valid_scope" &&
    compareConfidence === "confidence_high" &&
    projectionFreshness === "freshness_current" &&
    truthAggregationQuality === "truth_quality_stable" &&
    compareEvidence === "evidence_strong" &&
    compareRisk === "risk_low" &&
    severity === "info" &&
    compareStatus === "matched"
  ) {
    return "stability_stable";
  }
  return "stability_fluctuating";
}

function stabilityText(
  stability: InventoryCompareInterpretationStability,
): string {
  if (stability === "stability_stable") {
    return "compare 解釈は安定して見えます";
  }
  if (stability === "stability_fluctuating") {
    return "compare 解釈は変動する可能性があります";
  }
  if (stability === "stability_fragile") {
    return "compare 解釈は不安定な可能性があります";
  }
  if (stability === "stability_unverified") {
    return "compare 解釈は未検証です";
  }
  return "source / evidence unavailable のため解釈保留です";
}

function stabilityReason(
  stability: InventoryCompareInterpretationStability,
): string {
  if (stability === "stability_stable") {
    return "confidence / freshness / truth quality / evidence / risk がそろって見えるため、安定した解釈表示として整理します";
  }
  if (stability === "stability_fluctuating") {
    return "warning、medium confidence、recent freshness、moderate evidence などの条件付き signal が見えるため、変動し得る解釈表示として整理します";
  }
  if (stability === "stability_fragile") {
    return "partial / degraded / stale / low confidence / weak evidence / high risk などの signal が見えるため、不安定な解釈表示として整理します";
  }
  if (stability === "stability_unverified") {
    return "未検証または根拠不足の signal が見えるため、解釈を確定しない表示として整理します";
  }
  return "source または scope が利用できないため、解釈保留の表示として整理します";
}

function createCompareInterpretationStabilityMetadata({
  interpretationStability,
  compareHardening,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  compareEvidence,
  compareRisk,
  classification,
  severity,
  operatorSummary,
  operatorTimeline,
  stabilitySource,
  stabilitySignals,
}: {
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareRisk: InventoryCompareRisk;
  readonly classification: InventoryCompareMismatchClassification;
  readonly severity: InventoryCompareSeverity;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly stabilitySource: string;
  readonly stabilitySignals: readonly string[];
}): InventoryCompareInterpretationStabilityMetadata {
  return {
    stabilityId: `inventory-integrity-compare-readonly-${classification}-${interpretationStability}`,
    interpretationStability,
    stabilityText: stabilityText(interpretationStability),
    stabilityReason: stabilityReason(interpretationStability),
    stabilitySource,
    stabilitySignals,
    label: "read-only compare interpretation stability semantics",
    interpretation:
      "compare interpretation stability は compare 解釈がどの程度安定して読めるかを示す governance / operational observability metadata です。",
    noExecutionMeaning:
      "compare interpretation stability は在庫操作、外部連携、担当設定の変更、安定性表示に基づく在庫変更を開始しません。",
    compareConfidence,
    projectionFreshness,
    truthAggregationQuality,
    compareEvidence,
    compareRisk,
    classification,
    severity,
    operatorSummary,
    operatorTimeline,
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareInterpretationStabilityMetadata は read-only stability visibility です。操作導線、担当設定の変更、在庫変更は実行しません。",
  };
}

function decisionReadinessForSemantics({
  compareHardening,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  compareEvidence,
  compareRisk,
  interpretationStability,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operationalPriority,
  classification,
  severity,
  compareStatus,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareRisk: InventoryCompareRisk;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly classification: InventoryCompareMismatchClassification;
  readonly severity: InventoryCompareSeverity;
  readonly compareStatus?: InventoryCompareStatus;
}): InventoryCompareDecisionReadiness {
  if (
    compareConfidence === "confidence_blocked" ||
    projectionFreshness === "freshness_unavailable" ||
    truthAggregationQuality === "truth_quality_unavailable" ||
    compareEvidence === "evidence_unavailable" ||
    interpretationStability === "stability_unavailable" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    compareHardening.scopeStatus === "invalid_scope" ||
    classification === "unavailable_projection"
  ) {
    return "decision_hold_unavailable";
  }
  if (
    compareConfidence === "confidence_unverified" ||
    projectionFreshness === "freshness_unknown" ||
    truthAggregationQuality === "truth_quality_unverified" ||
    compareEvidence === "evidence_missing" ||
    interpretationStability === "stability_unverified" ||
    compareRisk === "risk_unassessable" ||
    classification === "compare_unverified" ||
    severity === "unverified" ||
    ownerActionability === "blocked_unverified" ||
    reviewReadiness === "review_unverified" ||
    escalationReadiness === "escalation_unverified" ||
    operationalPriority === "priority_unverified" ||
    operatorSummary === "summary_source_unverified" ||
    operatorTimeline === "timeline_wait_for_confirmation" ||
    operatorMessage === "message_wait_for_compare_source" ||
    compareHardening.resultStatus === "compare_result_unverified"
  ) {
    return "decision_hold_unverified";
  }
  if (
    compareRisk === "risk_high" ||
    compareRisk === "risk_critical" ||
    interpretationStability === "stability_fragile" ||
    interpretationStability === "stability_fluctuating" ||
    ownerActionability === "action_required" ||
    ownerActionability === "action_recommended" ||
    reviewReadiness === "review_required" ||
    reviewReadiness === "review_recommended" ||
    reviewReadiness === "review_blocked" ||
    escalationReadiness === "escalation_required" ||
    escalationReadiness === "escalation_recommended" ||
    escalationReadiness === "escalation_blocked" ||
    operationalPriority === "priority_p0" ||
    operationalPriority === "priority_p1" ||
    operationalPriority === "priority_p2" ||
    compareEvidence === "evidence_weak" ||
    compareEvidence === "evidence_moderate" ||
    compareConfidence === "confidence_low" ||
    projectionFreshness === "freshness_stale" ||
    truthAggregationQuality === "truth_quality_incomplete" ||
    compareHardening.sourceStatus === "compare_source_degraded" ||
    compareHardening.resultStatus === "compare_result_empty" ||
    compareHardening.resultStatus === "compare_result_partial" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    classification === "compare_partial" ||
    classification === "scope_mismatch" ||
    classification === "stale_projection" ||
    classification === "degraded_projection"
  ) {
    return "decision_review_needed";
  }
  if (
    compareStatus === "matched" &&
    severity === "info" &&
    compareRisk === "risk_low" &&
    interpretationStability === "stability_stable" &&
    ownerActionability === "monitor_only" &&
    reviewReadiness === "review_optional" &&
    escalationReadiness === "escalation_optional" &&
    operationalPriority === "priority_p3" &&
    operatorSummary === "summary_all_clear"
  ) {
    return "decision_not_required";
  }
  if (
    (compareRisk === "risk_low" || compareRisk === "risk_medium") &&
    (interpretationStability === "stability_stable" ||
      interpretationStability === "stability_fluctuating") &&
    (compareConfidence === "confidence_high" ||
      compareConfidence === "confidence_medium") &&
    (compareEvidence === "evidence_strong" ||
      compareEvidence === "evidence_moderate") &&
    compareHardening.sourceStatus === "compare_source_available" &&
    compareHardening.scopeStatus === "valid_scope"
  ) {
    return "decision_ready";
  }
  return "decision_review_needed";
}

function decisionText(decision: InventoryCompareDecisionReadiness): string {
  if (decision === "decision_ready") {
    return "判断可能な状態です";
  }
  if (decision === "decision_review_needed") {
    return "レビュー後に判断する状態です";
  }
  if (decision === "decision_hold_unverified") {
    return "未検証のため判断保留です";
  }
  if (decision === "decision_hold_unavailable") {
    return "source unavailable のため判断保留です";
  }
  return "判断不要に見える状態です";
}

function decisionReason(decision: InventoryCompareDecisionReadiness): string {
  if (decision === "decision_ready") {
    return "confidence / freshness / truth quality / evidence / risk / stability が判断材料として読める範囲に見えるため、判断可能な表示として整理します";
  }
  if (decision === "decision_review_needed") {
    return "risk、stability、evidence、priority、review signal のいずれかに注意して読む条件があるため、レビュー後に判断する表示として整理します";
  }
  if (decision === "decision_hold_unverified") {
    return "未検証または判断材料不足の signal が見えるため、判断保留の表示として整理します";
  }
  if (decision === "decision_hold_unavailable") {
    return "source、scope、evidence、freshness のいずれかが利用できないため、判断保留の表示として整理します";
  }
  return "matched / all clear / monitor only の signal がそろって見えるため、判断不要に見える表示として整理します";
}

function createCompareDecisionReadinessMetadata({
  decisionReadiness,
  compareHardening,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  compareEvidence,
  compareRisk,
  interpretationStability,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operationalPriority,
  classification,
  severity,
  decisionSource,
  decisionSignals,
}: {
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareRisk: InventoryCompareRisk;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly classification: InventoryCompareMismatchClassification;
  readonly severity: InventoryCompareSeverity;
  readonly decisionSource: string;
  readonly decisionSignals: readonly string[];
}): InventoryCompareDecisionReadinessMetadata {
  return {
    decisionId: `inventory-integrity-compare-readonly-${classification}-${decisionReadiness}`,
    decisionReadiness,
    decisionText: decisionText(decisionReadiness),
    decisionReason: decisionReason(decisionReadiness),
    decisionSource,
    decisionSignals,
    label: "read-only compare decision readiness semantics",
    interpretation:
      "compare decision readiness は compare 結果を人間の判断材料として読める状態かを示す governance / operational observability metadata です。",
    noExecutionMeaning:
      "compare decision readiness は在庫操作、外部連携、承認状態の変更、判断表示に基づく在庫変更を開始しません。",
    compareConfidence,
    projectionFreshness,
    truthAggregationQuality,
    compareEvidence,
    compareRisk,
    interpretationStability,
    operatorSummary,
    operatorTimeline,
    operatorMessage,
    ownerActionability,
    reviewReadiness,
    escalationReadiness,
    operationalPriority,
    classification,
    severity,
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareDecisionReadinessMetadata は read-only decision visibility です。操作導線、担当設定の変更、在庫変更は実行しません。",
  };
}

function operationalImpactForSemantics({
  compareHardening,
  compareRisk,
  interpretationStability,
  decisionReadiness,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  classification,
  compareStatus,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly compareRisk: InventoryCompareRisk;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly classification: InventoryCompareMismatchClassification;
  readonly compareStatus?: InventoryCompareStatus;
}): InventoryCompareOperationalImpact {
  if (
    compareRisk === "risk_unassessable" ||
    decisionReadiness === "decision_hold_unavailable" ||
    decisionReadiness === "decision_hold_unverified" ||
    compareConfidence === "confidence_blocked" ||
    compareConfidence === "confidence_unverified" ||
    compareEvidence === "evidence_missing" ||
    compareEvidence === "evidence_unavailable" ||
    projectionFreshness === "freshness_unknown" ||
    projectionFreshness === "freshness_unavailable" ||
    truthAggregationQuality === "truth_quality_unverified" ||
    truthAggregationQuality === "truth_quality_unavailable" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    compareHardening.resultStatus === "compare_result_unverified" ||
    classification === "compare_unverified" ||
    classification === "unavailable_projection"
  ) {
    return "impact_unassessable";
  }
  if (
    compareRisk === "risk_critical" ||
    severity === "critical" ||
    operationalPriority === "priority_p0" ||
    ownerActionability === "action_required" ||
    escalationReadiness === "escalation_required" ||
    operatorSummary === "summary_action_required" ||
    classification === "negative_truth" ||
    classification === "negative_projection" ||
    (interpretationStability === "stability_fragile" &&
      (severity === "high" || compareRisk === "risk_high"))
  ) {
    return "impact_critical";
  }
  if (
    compareRisk === "risk_high" ||
    severity === "high" ||
    operationalPriority === "priority_p1" ||
    operationalPriority === "priority_p2" ||
    ownerActionability === "action_recommended" ||
    reviewReadiness === "review_required" ||
    reviewReadiness === "review_recommended" ||
    escalationReadiness === "escalation_recommended" ||
    projectionFreshness === "freshness_stale" ||
    truthAggregationQuality === "truth_quality_warning" ||
    truthAggregationQuality === "truth_quality_incomplete" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    compareHardening.resultStatus === "compare_result_partial" ||
    classification === "compare_partial" ||
    classification === "degraded_projection" ||
    classification === "stale_projection"
  ) {
    return "impact_operational";
  }
  if (
    compareRisk === "risk_medium" ||
    severity === "warning" ||
    operationalPriority === "priority_p3" ||
    projectionFreshness === "freshness_recent" ||
    compareConfidence === "confidence_medium" ||
    compareEvidence === "evidence_moderate" ||
    (decisionReadiness === "decision_ready" &&
      (operatorTimeline === "timeline_review_projection" ||
        operatorTimeline === "timeline_verify_source"))
  ) {
    return "impact_observable";
  }
  if (
    compareRisk === "risk_low" &&
    compareStatus === "matched" &&
    severity === "info" &&
    compareConfidence === "confidence_high" &&
    projectionFreshness === "freshness_current" &&
    truthAggregationQuality === "truth_quality_stable" &&
    compareEvidence === "evidence_strong" &&
    decisionReadiness === "decision_not_required" &&
    reviewReadiness === "review_optional" &&
    ownerActionability === "monitor_only"
  ) {
    return "impact_minimal";
  }
  return "impact_observable";
}

function impactText(impact: InventoryCompareOperationalImpact): string {
  if (impact === "impact_minimal") {
    return "現場影響は小さく見えます";
  }
  if (impact === "impact_observable") {
    return "現場影響は観測対象です";
  }
  if (impact === "impact_operational") {
    return "現場運営への影響に注意が必要です";
  }
  if (impact === "impact_critical") {
    return "現場運営への重大影響候補です";
  }
  return "source / evidence 未確定のため影響評価保留です";
}

function impactReason(impact: InventoryCompareOperationalImpact): string {
  if (impact === "impact_minimal") {
    return "matched / low risk / high confidence / stable evidence がそろって見えるため、現場影響は小さい表示として整理します";
  }
  if (impact === "impact_observable") {
    return "medium risk、warning、recent freshness など観測して読む signal が見えるため、現場影響の観測対象として整理します";
  }
  if (impact === "impact_operational") {
    return "high risk、stale、incomplete、review signal など運営上注意して読む条件があるため、現場運営への影響候補として整理します";
  }
  if (impact === "impact_critical") {
    return "critical / p0 / action required / negative quantity など強い注意 signal が見えるため、重大影響候補として整理します";
  }
  return "source、scope、confidence、evidence、freshness のいずれかが未確定または利用できないため、影響評価保留として整理します";
}

function createCompareOperationalImpactMetadata({
  operationalImpact,
  compareHardening,
  compareRisk,
  interpretationStability,
  decisionReadiness,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  classification,
  impactSource,
  impactSignals,
}: {
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly compareRisk: InventoryCompareRisk;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly classification: InventoryCompareMismatchClassification;
  readonly impactSource: string;
  readonly impactSignals: readonly string[];
}): InventoryCompareOperationalImpactMetadata {
  return {
    impactId: `inventory-integrity-compare-readonly-${classification}-${operationalImpact}`,
    operationalImpact,
    impactText: impactText(operationalImpact),
    impactReason: impactReason(operationalImpact),
    impactSource,
    impactSignals,
    label: "read-only compare operational impact semantics",
    interpretation:
      "compare operational impact は compare 差異が現場運営へどの程度影響しそうかを示す governance / operational observability metadata です。",
    noExecutionMeaning:
      "compare operational impact は現場作業、担当設定の変更、在庫変更を開始しません。",
    compareRisk,
    interpretationStability,
    decisionReadiness,
    compareEvidence,
    compareConfidence,
    projectionFreshness,
    truthAggregationQuality,
    severity,
    operationalPriority,
    ownerActionability,
    reviewReadiness,
    escalationReadiness,
    operatorSummary,
    operatorTimeline,
    classification,
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareOperationalImpactMetadata は read-only impact visibility です。操作導線、担当設定の変更、在庫変更は実行しません。",
  };
}

function operationalAttentionForSemantics({
  compareHardening,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  classification,
  compareStatus,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly classification: InventoryCompareMismatchClassification;
  readonly compareStatus?: InventoryCompareStatus;
}): InventoryCompareOperationalAttention {
  if (
    operationalImpact === "impact_unassessable" ||
    compareRisk === "risk_unassessable" ||
    decisionReadiness === "decision_hold_unavailable" ||
    decisionReadiness === "decision_hold_unverified" ||
    compareConfidence === "confidence_blocked" ||
    compareConfidence === "confidence_unverified" ||
    compareEvidence === "evidence_missing" ||
    compareEvidence === "evidence_unavailable" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    compareHardening.resultStatus === "compare_result_unverified" ||
    classification === "compare_unverified" ||
    classification === "unavailable_projection"
  ) {
    return "attention_unassessable";
  }
  if (
    operationalImpact === "impact_critical" ||
    compareRisk === "risk_critical" ||
    severity === "critical" ||
    operationalPriority === "priority_p0" ||
    ownerActionability === "action_required" ||
    escalationReadiness === "escalation_required" ||
    operatorSummary === "summary_action_required" ||
    (interpretationStability === "stability_fragile" &&
      (severity === "high" || compareRisk === "risk_high"))
  ) {
    return "attention_immediate";
  }
  if (
    operationalImpact === "impact_operational" ||
    compareRisk === "risk_high" ||
    severity === "high" ||
    operationalPriority === "priority_p1" ||
    operationalPriority === "priority_p2" ||
    ownerActionability === "action_recommended" ||
    reviewReadiness === "review_required" ||
    reviewReadiness === "review_recommended" ||
    projectionFreshness === "freshness_stale" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    compareHardening.resultStatus === "compare_result_partial" ||
    classification === "compare_partial" ||
    classification === "degraded_projection" ||
    classification === "stale_projection"
  ) {
    return "attention_required";
  }
  if (
    operationalImpact === "impact_observable" ||
    compareRisk === "risk_medium" ||
    severity === "warning" ||
    projectionFreshness === "freshness_recent" ||
    compareConfidence === "confidence_medium" ||
    compareEvidence === "evidence_moderate"
  ) {
    return "attention_observe";
  }
  if (
    operationalImpact === "impact_minimal" &&
    compareRisk === "risk_low" &&
    compareStatus === "matched" &&
    severity === "info" &&
    compareConfidence === "confidence_high" &&
    projectionFreshness === "freshness_current" &&
    truthAggregationQuality === "truth_quality_stable" &&
    compareEvidence === "evidence_strong" &&
    decisionReadiness === "decision_not_required" &&
    reviewReadiness === "review_optional" &&
    ownerActionability === "monitor_only"
  ) {
    return "attention_normal";
  }
  return "attention_observe";
}

function attentionText(attention: InventoryCompareOperationalAttention): string {
  if (attention === "attention_normal") {
    return "通常監視範囲に見えます";
  }
  if (attention === "attention_observe") {
    return "継続観測対象です";
  }
  if (attention === "attention_required") {
    return "注意が必要な状態です";
  }
  if (attention === "attention_immediate") {
    return "即時注意対象に見えます";
  }
  return "source / evidence 未確定のため注意評価保留です";
}

function attentionReason(attention: InventoryCompareOperationalAttention): string {
  if (attention === "attention_normal") {
    return "minimal impact / low risk / matched / high confidence がそろって見えるため、通常監視範囲の表示として整理します";
  }
  if (attention === "attention_observe") {
    return "observable impact、medium risk、warning、recent freshness など観測して読む signal が見えるため、継続観測対象として整理します";
  }
  if (attention === "attention_required") {
    return "operational impact、high risk、stale、partial、review signal など注意して読む条件があるため、注意対象として整理します";
  }
  if (attention === "attention_immediate") {
    return "critical impact、critical risk、p0、action required など強い注意 signal が見えるため、即時注意対象として整理します";
  }
  return "source、scope、confidence、evidence のいずれかが未確定または利用できないため、注意評価保留として整理します";
}

function createCompareOperationalAttentionMetadata({
  operationalAttention,
  compareHardening,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  classification,
  attentionSource,
  attentionSignals,
}: {
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly classification: InventoryCompareMismatchClassification;
  readonly attentionSource: string;
  readonly attentionSignals: readonly string[];
}): InventoryCompareOperationalAttentionMetadata {
  return {
    attentionId: `inventory-integrity-compare-readonly-${classification}-${operationalAttention}`,
    operationalAttention,
    attentionText: attentionText(operationalAttention),
    attentionReason: attentionReason(operationalAttention),
    attentionSource,
    attentionSignals,
    label: "read-only compare operational attention semantics",
    interpretation:
      "compare operational attention は compare 差異へ現場・事務所がどの程度注意を向ける状態かを示す governance / operational observability metadata です。",
    noExecutionMeaning:
      "compare operational attention は現場作業、担当設定の変更、在庫変更を開始しません。",
    operationalImpact,
    decisionReadiness,
    interpretationStability,
    compareRisk,
    compareEvidence,
    compareConfidence,
    projectionFreshness,
    truthAggregationQuality,
    severity,
    operationalPriority,
    ownerActionability,
    reviewReadiness,
    escalationReadiness,
    operatorSummary,
    operatorTimeline,
    classification,
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareOperationalAttentionMetadata は read-only attention visibility です。操作導線、担当設定の変更、在庫変更は実行しません。",
  };
}

function governancePostureForSemantics({
  compareHardening,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  classification,
  compareStatus,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly classification: InventoryCompareMismatchClassification;
  readonly compareStatus?: InventoryCompareStatus;
}): InventoryCompareGovernancePosture {
  if (
    operationalAttention === "attention_unassessable" ||
    operationalImpact === "impact_unassessable" ||
    compareRisk === "risk_unassessable" ||
    decisionReadiness === "decision_hold_unavailable" ||
    decisionReadiness === "decision_hold_unverified" ||
    compareConfidence === "confidence_blocked" ||
    compareConfidence === "confidence_unverified" ||
    compareEvidence === "evidence_missing" ||
    compareEvidence === "evidence_unavailable" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    compareHardening.resultStatus === "compare_result_unverified" ||
    classification === "compare_unverified" ||
    classification === "unavailable_projection"
  ) {
    return "posture_unassessable";
  }
  if (
    operationalAttention === "attention_immediate" ||
    operationalImpact === "impact_critical" ||
    compareRisk === "risk_critical" ||
    severity === "critical" ||
    operationalPriority === "priority_p0" ||
    ownerActionability === "action_required" ||
    escalationReadiness === "escalation_required" ||
    operatorSummary === "summary_action_required" ||
    (interpretationStability === "stability_fragile" &&
      (severity === "high" || compareRisk === "risk_high"))
  ) {
    return "posture_escalated";
  }
  if (
    operationalAttention === "attention_required" ||
    operationalImpact === "impact_operational" ||
    compareRisk === "risk_high" ||
    severity === "high" ||
    operationalPriority === "priority_p1" ||
    operationalPriority === "priority_p2" ||
    ownerActionability === "action_recommended" ||
    reviewReadiness === "review_required" ||
    reviewReadiness === "review_recommended" ||
    projectionFreshness === "freshness_stale" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    compareHardening.resultStatus === "compare_result_partial" ||
    classification === "compare_partial" ||
    classification === "degraded_projection" ||
    classification === "stale_projection"
  ) {
    return "posture_review";
  }
  if (
    operationalAttention === "attention_observe" ||
    operationalImpact === "impact_observable" ||
    compareRisk === "risk_medium" ||
    severity === "warning" ||
    projectionFreshness === "freshness_recent" ||
    compareConfidence === "confidence_medium" ||
    compareEvidence === "evidence_moderate"
  ) {
    return "posture_observe";
  }
  if (
    operationalAttention === "attention_normal" &&
    operationalImpact === "impact_minimal" &&
    compareRisk === "risk_low" &&
    compareStatus === "matched" &&
    severity === "info" &&
    compareConfidence === "confidence_high" &&
    projectionFreshness === "freshness_current" &&
    truthAggregationQuality === "truth_quality_stable" &&
    compareEvidence === "evidence_strong" &&
    decisionReadiness === "decision_not_required" &&
    reviewReadiness === "review_optional" &&
    ownerActionability === "monitor_only"
  ) {
    return "posture_normal";
  }
  return "posture_observe";
}

function postureText(posture: InventoryCompareGovernancePosture): string {
  if (posture === "posture_normal") {
    return "通常 governance 範囲に見えます";
  }
  if (posture === "posture_observe") {
    return "継続観測 governance 対象です";
  }
  if (posture === "posture_review") {
    return "review governance 対象です";
  }
  if (posture === "posture_escalated") {
    return "escalation governance 対象です";
  }
  return "source / evidence 未確定のため posture 評価保留です";
}

function postureReason(posture: InventoryCompareGovernancePosture): string {
  if (posture === "posture_normal") {
    return "normal attention / minimal impact / low risk / matched / stable evidence がそろって見えるため、通常 governance 範囲として整理します";
  }
  if (posture === "posture_observe") {
    return "observe attention、observable impact、medium risk、warning など継続観測する governance signal が見えるため、観測対象として整理します";
  }
  if (posture === "posture_review") {
    return "required attention、operational impact、high risk、stale、partial、review signal など governance review で読む条件があるため、review 対象として整理します";
  }
  if (posture === "posture_escalated") {
    return "immediate attention、critical impact、critical risk、p0、escalation required など強い governance signal が見えるため、escalation 対象として整理します";
  }
  return "source、scope、confidence、evidence のいずれかが未確定または利用できないため、governance posture 評価保留として整理します";
}

function createCompareGovernancePostureMetadata({
  governancePosture,
  compareHardening,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  classification,
  postureSource,
  postureSignals,
}: {
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly classification: InventoryCompareMismatchClassification;
  readonly postureSource: string;
  readonly postureSignals: readonly string[];
}): InventoryCompareGovernancePostureMetadata {
  return {
    postureId: `inventory-integrity-compare-readonly-${classification}-${governancePosture}`,
    governancePosture,
    postureText: postureText(governancePosture),
    postureReason: postureReason(governancePosture),
    postureSource,
    postureSignals,
    label: "read-only compare governance posture semantics",
    interpretation:
      "compare governance posture は compare 状態を governance 的にどう扱うかを示す review / observability metadata です。",
    noExecutionMeaning:
      "compare governance posture は承認、監査開始、現場作業、担当設定の変更、在庫変更を開始しません。",
    operationalAttention,
    operationalImpact,
    decisionReadiness,
    interpretationStability,
    compareRisk,
    compareEvidence,
    compareConfidence,
    projectionFreshness,
    truthAggregationQuality,
    severity,
    operationalPriority,
    ownerActionability,
    reviewReadiness,
    escalationReadiness,
    operatorSummary,
    operatorTimeline,
    classification,
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareGovernancePostureMetadata は read-only governance posture visibility です。操作導線、承認、監査開始、在庫変更は実行しません。",
  };
}

function governanceDispositionForSemantics({
  compareHardening,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  classification,
  compareStatus,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly classification: InventoryCompareMismatchClassification;
  readonly compareStatus?: InventoryCompareStatus;
}): InventoryCompareGovernanceDisposition {
  if (
    governancePosture === "posture_unassessable" ||
    operationalAttention === "attention_unassessable" ||
    operationalImpact === "impact_unassessable" ||
    decisionReadiness === "decision_hold_unavailable" ||
    decisionReadiness === "decision_hold_unverified" ||
    compareConfidence === "confidence_blocked" ||
    compareConfidence === "confidence_unverified" ||
    compareEvidence === "evidence_missing" ||
    compareEvidence === "evidence_unavailable" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    compareHardening.resultStatus === "compare_result_unverified" ||
    classification === "compare_unverified" ||
    classification === "unavailable_projection"
  ) {
    return "disposition_hold";
  }
  if (
    governancePosture === "posture_escalated" ||
    operationalAttention === "attention_immediate" ||
    operationalImpact === "impact_critical" ||
    compareRisk === "risk_critical" ||
    severity === "critical" ||
    operationalPriority === "priority_p0" ||
    ownerActionability === "action_required" ||
    escalationReadiness === "escalation_required"
  ) {
    return "disposition_escalated_queue";
  }
  if (
    governancePosture === "posture_review" ||
    operationalAttention === "attention_required" ||
    operationalImpact === "impact_operational" ||
    compareRisk === "risk_high" ||
    severity === "high" ||
    operationalPriority === "priority_p1" ||
    operationalPriority === "priority_p2" ||
    ownerActionability === "action_recommended" ||
    reviewReadiness === "review_required" ||
    reviewReadiness === "review_recommended"
  ) {
    return "disposition_review_queue";
  }
  if (
    governancePosture === "posture_observe" ||
    operationalAttention === "attention_observe" ||
    operationalImpact === "impact_observable" ||
    compareRisk === "risk_medium" ||
    severity === "warning" ||
    projectionFreshness === "freshness_recent" ||
    compareConfidence === "confidence_medium"
  ) {
    return "disposition_observe_queue";
  }
  if (
    governancePosture === "posture_normal" &&
    operationalAttention === "attention_normal" &&
    operationalImpact === "impact_minimal" &&
    compareRisk === "risk_low" &&
    compareStatus === "matched" &&
    severity === "info" &&
    compareConfidence === "confidence_high" &&
    projectionFreshness === "freshness_current" &&
    truthAggregationQuality === "truth_quality_stable" &&
    compareEvidence === "evidence_strong" &&
    decisionReadiness === "decision_not_required"
  ) {
    return "disposition_normal";
  }
  return "disposition_observe_queue";
}

function dispositionText(
  disposition: InventoryCompareGovernanceDisposition,
): string {
  if (disposition === "disposition_normal") {
    return "通常 disposition 範囲に見えます";
  }
  if (disposition === "disposition_observe_queue") {
    return "observe queue 対象です";
  }
  if (disposition === "disposition_review_queue") {
    return "review queue 対象です";
  }
  if (disposition === "disposition_escalated_queue") {
    return "escalated queue 対象です";
  }
  return "source / evidence 未確定のため disposition 保留です";
}

function dispositionReason(
  disposition: InventoryCompareGovernanceDisposition,
): string {
  if (disposition === "disposition_normal") {
    return "normal posture / normal attention / minimal impact / low risk がそろって見えるため、通常 disposition 範囲として整理します";
  }
  if (disposition === "disposition_observe_queue") {
    return "observe posture、observe attention、observable impact、medium risk など継続観測する governance signal が見えるため、observe queue 対象として整理します";
  }
  if (disposition === "disposition_review_queue") {
    return "review posture、required attention、operational impact、high risk、review signal など governance review で読む条件があるため、review queue 対象として整理します";
  }
  if (disposition === "disposition_escalated_queue") {
    return "escalated posture、immediate attention、critical impact、p0、escalation required など強い governance signal が見えるため、escalated queue 対象として整理します";
  }
  return "source、scope、confidence、evidence のいずれかが未確定または利用できないため、governance disposition 保留として整理します";
}

function createCompareGovernanceDispositionMetadata({
  governanceDisposition,
  compareHardening,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  classification,
  dispositionSource,
  dispositionSignals,
}: {
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly classification: InventoryCompareMismatchClassification;
  readonly dispositionSource: string;
  readonly dispositionSignals: readonly string[];
}): InventoryCompareGovernanceDispositionMetadata {
  return {
    dispositionId: `inventory-integrity-compare-readonly-${classification}-${governanceDisposition}`,
    governanceDisposition,
    dispositionText: dispositionText(governanceDisposition),
    dispositionReason: dispositionReason(governanceDisposition),
    dispositionSource,
    dispositionSignals,
    label: "read-only compare governance disposition semantics",
    interpretation:
      "compare governance disposition は compare 状態を governance 上どの queue / hold 表示として扱うかを示す observability metadata です。",
    noExecutionMeaning:
      "compare governance disposition は queue の実体、承認、監査開始、現場作業、担当設定の変更、在庫変更を開始しません。",
    governancePosture,
    operationalAttention,
    operationalImpact,
    decisionReadiness,
    interpretationStability,
    compareRisk,
    compareEvidence,
    compareConfidence,
    projectionFreshness,
    truthAggregationQuality,
    severity,
    operationalPriority,
    ownerActionability,
    reviewReadiness,
    escalationReadiness,
    operatorSummary,
    operatorTimeline,
    classification,
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareGovernanceDispositionMetadata は read-only disposition visibility です。操作導線、queue の実体、承認、監査開始、在庫変更は実行しません。",
  };
}

function governanceRetentionForSemantics({
  compareHardening,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  classification,
  compareStatus,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly classification: InventoryCompareMismatchClassification;
  readonly compareStatus?: InventoryCompareStatus;
}): InventoryCompareGovernanceRetention {
  if (
    governanceDisposition === "disposition_hold" ||
    governancePosture === "posture_unassessable" ||
    operationalAttention === "attention_unassessable" ||
    operationalImpact === "impact_unassessable" ||
    decisionReadiness === "decision_hold_unavailable" ||
    decisionReadiness === "decision_hold_unverified" ||
    compareConfidence === "confidence_blocked" ||
    compareConfidence === "confidence_unverified" ||
    compareEvidence === "evidence_missing" ||
    compareEvidence === "evidence_unavailable" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    compareHardening.resultStatus === "compare_result_unverified" ||
    classification === "compare_unverified" ||
    classification === "unavailable_projection"
  ) {
    return "retention_hold";
  }
  if (
    governanceDisposition === "disposition_escalated_queue" ||
    governancePosture === "posture_escalated" ||
    operationalAttention === "attention_immediate" ||
    operationalImpact === "impact_critical" ||
    compareRisk === "risk_critical" ||
    severity === "critical" ||
    operationalPriority === "priority_p0" ||
    ownerActionability === "action_required" ||
    escalationReadiness === "escalation_required" ||
    (interpretationStability === "stability_fragile" &&
      (severity === "high" || compareRisk === "risk_high"))
  ) {
    return "retention_persistent";
  }
  if (
    governanceDisposition === "disposition_review_queue" ||
    governancePosture === "posture_review" ||
    operationalAttention === "attention_required" ||
    operationalImpact === "impact_operational" ||
    compareRisk === "risk_high" ||
    severity === "high" ||
    operationalPriority === "priority_p1" ||
    operationalPriority === "priority_p2" ||
    ownerActionability === "action_recommended" ||
    reviewReadiness === "review_required" ||
    reviewReadiness === "review_recommended" ||
    projectionFreshness === "freshness_stale" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    compareHardening.resultStatus === "compare_result_partial" ||
    classification === "compare_partial" ||
    classification === "degraded_projection" ||
    classification === "stale_projection"
  ) {
    return "retention_review";
  }
  if (
    governanceDisposition === "disposition_observe_queue" ||
    governancePosture === "posture_observe" ||
    operationalAttention === "attention_observe" ||
    operationalImpact === "impact_observable" ||
    compareRisk === "risk_medium" ||
    severity === "warning" ||
    projectionFreshness === "freshness_recent" ||
    compareConfidence === "confidence_medium"
  ) {
    return "retention_observe";
  }
  if (
    governanceDisposition === "disposition_normal" &&
    governancePosture === "posture_normal" &&
    operationalAttention === "attention_normal" &&
    operationalImpact === "impact_minimal" &&
    compareRisk === "risk_low" &&
    compareStatus === "matched" &&
    severity === "info" &&
    compareConfidence === "confidence_high" &&
    projectionFreshness === "freshness_current" &&
    truthAggregationQuality === "truth_quality_stable" &&
    compareEvidence === "evidence_strong" &&
    decisionReadiness === "decision_not_required"
  ) {
    return "retention_transient";
  }
  return "retention_observe";
}

function retentionText(retention: InventoryCompareGovernanceRetention): string {
  if (retention === "retention_transient") {
    return "transient retention 範囲に見えます";
  }
  if (retention === "retention_observe") {
    return "observe retention 対象です";
  }
  if (retention === "retention_review") {
    return "review retention 対象です";
  }
  if (retention === "retention_persistent") {
    return "persistent retention 対象です";
  }
  return "source / evidence 未確定のため retention 保留です";
}

function retentionReason(retention: InventoryCompareGovernanceRetention): string {
  if (retention === "retention_transient") {
    return "normal disposition / normal posture / low risk / stable evidence がそろって見えるため、transient retention 範囲として整理します";
  }
  if (retention === "retention_observe") {
    return "observe disposition、observe posture、observable impact、medium risk など継続観測する governance signal が見えるため、observe retention 対象として整理します";
  }
  if (retention === "retention_review") {
    return "review disposition、required attention、operational impact、high risk、stale、partial など review で追跡する条件があるため、review retention 対象として整理します";
  }
  if (retention === "retention_persistent") {
    return "escalated disposition、critical impact、critical risk、p0、fragile stability など強い governance signal が見えるため、persistent retention 対象として整理します";
  }
  return "source、scope、confidence、evidence のいずれかが未確定または利用できないため、governance retention 保留として整理します";
}

function createCompareGovernanceRetentionMetadata({
  governanceRetention,
  compareHardening,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  classification,
  retentionSource,
  retentionSignals,
}: {
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly classification: InventoryCompareMismatchClassification;
  readonly retentionSource: string;
  readonly retentionSignals: readonly string[];
}): InventoryCompareGovernanceRetentionMetadata {
  return {
    retentionId: `inventory-integrity-compare-readonly-${classification}-${governanceRetention}`,
    governanceRetention,
    retentionText: retentionText(governanceRetention),
    retentionReason: retentionReason(governanceRetention),
    retentionSource,
    retentionSignals,
    label: "read-only compare governance retention semantics",
    interpretation:
      "compare governance retention は compare 状態を governance 上どれくらい保持・追跡表示として扱うかを示す observability metadata です。",
    noExecutionMeaning:
      "compare governance retention は保持処理、追跡処理、承認、監査開始、現場作業、担当設定の変更、在庫変更を開始しません。",
    governanceDisposition,
    governancePosture,
    operationalAttention,
    operationalImpact,
    decisionReadiness,
    interpretationStability,
    compareRisk,
    compareEvidence,
    compareConfidence,
    projectionFreshness,
    truthAggregationQuality,
    severity,
    operationalPriority,
    ownerActionability,
    reviewReadiness,
    escalationReadiness,
    operatorSummary,
    operatorTimeline,
    classification,
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareGovernanceRetentionMetadata は read-only retention visibility です。操作導線、保持処理、追跡処理、承認、監査開始、在庫変更は実行しません。",
  };
}

function governanceAuditTrailForSemantics({
  compareHardening,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  classification,
  compareStatus,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly classification: InventoryCompareMismatchClassification;
  readonly compareStatus?: InventoryCompareStatus;
}): InventoryCompareGovernanceAuditTrail {
  if (
    governanceRetention === "retention_hold" ||
    governanceDisposition === "disposition_hold" ||
    governancePosture === "posture_unassessable" ||
    operationalAttention === "attention_unassessable" ||
    operationalImpact === "impact_unassessable" ||
    decisionReadiness === "decision_hold_unavailable" ||
    compareRisk === "risk_unassessable" ||
    compareConfidence === "confidence_blocked" ||
    compareEvidence === "evidence_unavailable" ||
    projectionFreshness === "freshness_unavailable" ||
    truthAggregationQuality === "truth_quality_unavailable" ||
    interpretationStability === "stability_unavailable" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    classification === "unavailable_projection"
  ) {
    return "audit_unavailable";
  }
  if (
    compareEvidence === "evidence_missing" ||
    compareConfidence === "confidence_unverified" ||
    truthAggregationQuality === "truth_quality_unverified" ||
    projectionFreshness === "freshness_unknown" ||
    decisionReadiness === "decision_hold_unverified" ||
    interpretationStability === "stability_unverified" ||
    compareHardening.resultStatus === "compare_result_unverified" ||
    classification === "compare_unverified"
  ) {
    return "audit_missing";
  }
  if (
    compareEvidence === "evidence_weak" ||
    compareConfidence === "confidence_low" ||
    compareRisk === "risk_high" ||
    governanceRetention === "retention_review" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    compareHardening.resultStatus === "compare_result_partial" ||
    projectionFreshness === "freshness_stale" ||
    interpretationStability === "stability_fragile" ||
    classification === "compare_partial" ||
    classification === "degraded_projection" ||
    classification === "stale_projection"
  ) {
    return "audit_weak";
  }
  if (
    compareEvidence === "evidence_moderate" ||
    compareConfidence === "confidence_medium" ||
    compareRisk === "risk_medium" ||
    governanceRetention === "retention_observe" ||
    governanceDisposition === "disposition_observe_queue" ||
    governancePosture === "posture_observe" ||
    operationalAttention === "attention_observe" ||
    projectionFreshness === "freshness_recent"
  ) {
    return "audit_partial";
  }
  if (
    compareEvidence === "evidence_strong" &&
    compareConfidence === "confidence_high" &&
    projectionFreshness === "freshness_current" &&
    truthAggregationQuality === "truth_quality_stable" &&
    interpretationStability === "stability_stable" &&
    compareRisk === "risk_low" &&
    compareStatus === "matched" &&
    severity === "info" &&
    (governanceRetention === "retention_transient" ||
      governanceRetention === "retention_persistent") &&
    ownerActionability === "monitor_only" &&
    reviewReadiness === "review_optional" &&
    escalationReadiness === "escalation_optional" &&
    operationalPriority === "priority_p3"
  ) {
    return "audit_traceable";
  }
  return "audit_partial";
}

function auditTrailText(
  auditTrail: InventoryCompareGovernanceAuditTrail,
): string {
  if (auditTrail === "audit_traceable") {
    return "audit trace が確認可能です";
  }
  if (auditTrail === "audit_partial") {
    return "partial audit trace 状態です";
  }
  if (auditTrail === "audit_weak") {
    return "audit trace が弱い可能性があります";
  }
  if (auditTrail === "audit_missing") {
    return "audit trace が不足しています";
  }
  return "source / evidence unavailable のため audit trace 保留です";
}

function auditTrailReason(
  auditTrail: InventoryCompareGovernanceAuditTrail,
): string {
  if (auditTrail === "audit_traceable") {
    return "truth source、strong evidence、high confidence、current freshness、stable interpretation がそろって見えるため、audit trace を確認しやすい状態として整理します";
  }
  if (auditTrail === "audit_partial") {
    return "moderate evidence、medium confidence、observe retention など一部 caveat を含むため、partial audit trace として整理します";
  }
  if (auditTrail === "audit_weak") {
    return "weak evidence、low confidence、degraded scope、partial compare、stale projection など追跡説明が弱く見える signal があるため、audit trace weak として整理します";
  }
  if (auditTrail === "audit_missing") {
    return "missing evidence、unverified confidence、unknown freshness、unverified truth quality など監査説明材料が不足して見えるため、audit trace missing として整理します";
  }
  return "source、scope、evidence、confidence のいずれかが利用できないため、audit trace unavailable として整理します";
}

function createCompareGovernanceAuditTrailMetadata({
  governanceAuditTrail,
  compareHardening,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  classification,
  auditTrailSource,
  auditTrailSignals,
}: {
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly classification: InventoryCompareMismatchClassification;
  readonly auditTrailSource: string;
  readonly auditTrailSignals: readonly string[];
}): InventoryCompareGovernanceAuditTrailMetadata {
  return {
    auditTrailId: `inventory-integrity-compare-readonly-${classification}-${governanceAuditTrail}`,
    governanceAuditTrail,
    auditTrailText: auditTrailText(governanceAuditTrail),
    auditTrailReason: auditTrailReason(governanceAuditTrail),
    auditTrailSource,
    auditTrailSignals,
    label: "read-only compare governance audit trail semantics",
    interpretation:
      "compare governance audit trail は compare 状態が後からどの程度 trace / audit 可能に見えるかを示す observability metadata です。",
    noExecutionMeaning:
      "compare governance audit trail は監査開始、追跡処理、承認、現場作業、担当設定の変更、在庫変更を開始しません。",
    governanceRetention,
    governanceDisposition,
    governancePosture,
    operationalAttention,
    operationalImpact,
    decisionReadiness,
    interpretationStability,
    compareRisk,
    compareEvidence,
    compareConfidence,
    projectionFreshness,
    truthAggregationQuality,
    severity,
    operationalPriority,
    ownerActionability,
    reviewReadiness,
    escalationReadiness,
    operatorSummary,
    operatorTimeline,
    classification,
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareGovernanceAuditTrailMetadata は read-only audit trail visibility です。操作導線、監査開始、追跡処理、承認、在庫変更は実行しません。",
  };
}

function governanceExplainabilityForSemantics({
  compareHardening,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
  compareStatus,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
  readonly compareStatus?: InventoryCompareStatus;
}): InventoryCompareGovernanceExplainability {
  if (
    governanceAuditTrail === "audit_unavailable" ||
    governanceRetention === "retention_hold" ||
    governanceDisposition === "disposition_hold" ||
    governancePosture === "posture_unassessable" ||
    operationalAttention === "attention_unassessable" ||
    operationalImpact === "impact_unassessable" ||
    decisionReadiness === "decision_hold_unavailable" ||
    compareRisk === "risk_unassessable" ||
    compareConfidence === "confidence_blocked" ||
    compareEvidence === "evidence_unavailable" ||
    projectionFreshness === "freshness_unavailable" ||
    truthAggregationQuality === "truth_quality_unavailable" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    classification === "unavailable_projection"
  ) {
    return "explainability_unavailable";
  }
  if (
    governanceAuditTrail === "audit_missing" ||
    compareEvidence === "evidence_missing" ||
    compareConfidence === "confidence_unverified" ||
    truthAggregationQuality === "truth_quality_unverified" ||
    projectionFreshness === "freshness_unknown" ||
    decisionReadiness === "decision_hold_unverified" ||
    interpretationStability === "stability_unverified" ||
    compareHardening.resultStatus === "compare_result_unverified" ||
    classification === "compare_unverified"
  ) {
    return "not_explainable";
  }
  if (
    governanceAuditTrail === "audit_weak" ||
    compareEvidence === "evidence_weak" ||
    compareConfidence === "confidence_low" ||
    compareRisk === "risk_high" ||
    governanceRetention === "retention_review" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    compareHardening.resultStatus === "compare_result_partial" ||
    projectionFreshness === "freshness_stale" ||
    interpretationStability === "stability_fragile" ||
    classification === "compare_partial" ||
    classification === "degraded_projection" ||
    classification === "stale_projection"
  ) {
    return "weakly_explainable";
  }
  if (
    governanceAuditTrail === "audit_partial" ||
    compareEvidence === "evidence_moderate" ||
    compareConfidence === "confidence_medium" ||
    compareRisk === "risk_medium" ||
    governanceRetention === "retention_observe" ||
    governanceDisposition === "disposition_observe_queue" ||
    governancePosture === "posture_observe" ||
    operationalAttention === "attention_observe" ||
    projectionFreshness === "freshness_recent"
  ) {
    return "partially_explainable";
  }
  if (
    governanceAuditTrail === "audit_traceable" &&
    compareEvidence === "evidence_strong" &&
    compareConfidence === "confidence_high" &&
    projectionFreshness === "freshness_current" &&
    truthAggregationQuality === "truth_quality_stable" &&
    interpretationStability === "stability_stable" &&
    compareRisk === "risk_low" &&
    compareStatus === "matched" &&
    severity === "info" &&
    operationalPriority === "priority_p3" &&
    ownerActionability === "monitor_only" &&
    reviewReadiness === "review_optional" &&
    escalationReadiness === "escalation_optional" &&
    operatorSummary === "summary_all_clear" &&
    operatorTimeline === "timeline_monitor_difference" &&
    operatorMessage === "message_monitor_minor_difference" &&
    operatorGuidance === "guidance_monitor"
  ) {
    return "explainable";
  }
  return "partially_explainable";
}

function explainabilityText(
  explainability: InventoryCompareGovernanceExplainability,
): string {
  if (explainability === "explainable") {
    return "explainability が確認可能です";
  }
  if (explainability === "partially_explainable") {
    return "partial explainability 状態です";
  }
  if (explainability === "weakly_explainable") {
    return "explainability が弱い可能性があります";
  }
  if (explainability === "not_explainable") {
    return "explainability が不足しています";
  }
  return "source / evidence unavailable のため explainability 保留です";
}

function explainabilityReason(
  explainability: InventoryCompareGovernanceExplainability,
): string {
  if (explainability === "explainable") {
    return "audit trace、strong evidence、high confidence、current freshness、stable interpretation、readable reasoning chain がそろって見えるため、説明しやすい状態として整理します";
  }
  if (explainability === "partially_explainable") {
    return "partial audit trace、moderate evidence、medium confidence、observe retention など一部 caveat を含むため、partial explainability として整理します";
  }
  if (explainability === "weakly_explainable") {
    return "weak audit trail、weak evidence、low confidence、degraded scope、stale projection など説明材料が弱く見える signal があるため、weak explainability として整理します";
  }
  if (explainability === "not_explainable") {
    return "missing audit trail、missing evidence、unverified confidence、unverified truth quality など人間向け説明材料が不足して見えるため、not explainable として整理します";
  }
  return "source、scope、evidence、audit trail のいずれかが利用できないため、explainability unavailable として整理します";
}

function createCompareGovernanceExplainabilityMetadata({
  governanceExplainability,
  compareHardening,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
  explainabilitySource,
  explainabilitySignals,
}: {
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
  readonly explainabilitySource: string;
  readonly explainabilitySignals: readonly string[];
}): InventoryCompareGovernanceExplainabilityMetadata {
  return {
    explainabilityId: `inventory-integrity-compare-readonly-${classification}-${governanceExplainability}`,
    governanceExplainability,
    explainabilityText: explainabilityText(governanceExplainability),
    explainabilityReason: explainabilityReason(governanceExplainability),
    explainabilitySource,
    explainabilitySignals,
    label: "read-only compare governance explainability semantics",
    interpretation:
      "compare governance explainability は compare 状態が人間へどの程度説明可能に見えるかを示す observability metadata です。",
    noExecutionMeaning:
      "compare governance explainability は説明生成、監査開始、承認、現場作業、担当設定の変更、在庫変更を開始しません。",
    governanceAuditTrail,
    governanceRetention,
    governanceDisposition,
    governancePosture,
    operationalAttention,
    operationalImpact,
    decisionReadiness,
    interpretationStability,
    compareRisk,
    compareEvidence,
    compareConfidence,
    projectionFreshness,
    truthAggregationQuality,
    severity,
    operationalPriority,
    ownerActionability,
    reviewReadiness,
    escalationReadiness,
    operatorSummary,
    operatorTimeline,
    operatorMessage,
    operatorGuidance,
    classification,
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareGovernanceExplainabilityMetadata は read-only explainability visibility です。操作導線、説明生成、監査開始、承認、在庫変更は実行しません。",
  };
}

function governanceReasoningCoherenceForSemantics({
  compareHardening,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
  compareStatus,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
  readonly compareStatus?: InventoryCompareStatus;
}): InventoryCompareGovernanceReasoningCoherence {
  if (
    governanceExplainability === "explainability_unavailable" ||
    governanceAuditTrail === "audit_unavailable" ||
    governanceRetention === "retention_hold" ||
    governanceDisposition === "disposition_hold" ||
    decisionReadiness === "decision_hold_unavailable" ||
    compareConfidence === "confidence_blocked" ||
    compareEvidence === "evidence_unavailable" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    classification === "unavailable_projection"
  ) {
    return "reasoning_unavailable";
  }
  if (
    (compareConfidence === "confidence_high" &&
      (compareEvidence === "evidence_missing" ||
        compareEvidence === "evidence_weak")) ||
    (compareRisk === "risk_low" &&
      (governancePosture === "posture_escalated" ||
        governanceDisposition === "disposition_escalated_queue" ||
        operationalAttention === "attention_immediate" ||
        operationalImpact === "impact_critical")) ||
    (governanceExplainability === "explainable" &&
      (governanceAuditTrail === "audit_missing" ||
        governanceAuditTrail === "audit_weak")) ||
    (interpretationStability === "stability_stable" &&
      (truthAggregationQuality === "truth_quality_unavailable" ||
        truthAggregationQuality === "truth_quality_unverified")) ||
    (operatorSummary === "summary_all_clear" &&
      (compareRisk === "risk_high" ||
        compareRisk === "risk_critical" ||
        severity === "critical" ||
        operationalPriority === "priority_p0")) ||
    (compareStatus === "matched" &&
      classification === "quantity_mismatch")
  ) {
    return "contradictory_reasoning";
  }
  if (
    governanceExplainability === "weakly_explainable" ||
    governanceAuditTrail === "audit_weak" ||
    compareEvidence === "evidence_weak" ||
    compareConfidence === "confidence_low" ||
    projectionFreshness === "freshness_stale" ||
    interpretationStability === "stability_fragile" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    compareHardening.resultStatus === "compare_result_partial" ||
    governanceRetention === "retention_review" ||
    classification === "compare_partial" ||
    classification === "degraded_projection" ||
    classification === "stale_projection"
  ) {
    return "fragile_reasoning";
  }
  if (
    governanceExplainability === "partially_explainable" ||
    governanceAuditTrail === "audit_partial" ||
    compareEvidence === "evidence_moderate" ||
    compareConfidence === "confidence_medium" ||
    compareRisk === "risk_medium" ||
    governanceRetention === "retention_observe" ||
    governanceDisposition === "disposition_observe_queue" ||
    governancePosture === "posture_observe" ||
    operationalAttention === "attention_observe" ||
    projectionFreshness === "freshness_recent" ||
    interpretationStability === "stability_fluctuating"
  ) {
    return "partially_coherent";
  }
  if (
    governanceExplainability === "explainable" &&
    governanceAuditTrail === "audit_traceable" &&
    compareEvidence === "evidence_strong" &&
    compareConfidence === "confidence_high" &&
    projectionFreshness === "freshness_current" &&
    truthAggregationQuality === "truth_quality_stable" &&
    interpretationStability === "stability_stable" &&
    compareRisk === "risk_low" &&
    operationalImpact === "impact_minimal" &&
    operationalAttention === "attention_normal" &&
    governancePosture === "posture_normal" &&
    governanceDisposition === "disposition_normal" &&
    compareStatus === "matched" &&
    severity === "info" &&
    operationalPriority === "priority_p3" &&
    ownerActionability === "monitor_only" &&
    reviewReadiness === "review_optional" &&
    escalationReadiness === "escalation_optional" &&
    operatorSummary === "summary_all_clear" &&
    operatorTimeline === "timeline_monitor_difference" &&
    operatorMessage === "message_monitor_minor_difference" &&
    operatorGuidance === "guidance_monitor"
  ) {
    return "coherent_reasoning";
  }
  return "partially_coherent";
}

function reasoningCoherenceText(
  reasoningCoherence: InventoryCompareGovernanceReasoningCoherence,
): string {
  if (reasoningCoherence === "coherent_reasoning") {
    return "reasoning coherence が確認可能です";
  }
  if (reasoningCoherence === "partially_coherent") {
    return "partial reasoning coherence 状態です";
  }
  if (reasoningCoherence === "fragile_reasoning") {
    return "reasoning coherence が不安定な可能性があります";
  }
  if (reasoningCoherence === "contradictory_reasoning") {
    return "reasoning chain に矛盾があります";
  }
  return "source / evidence unavailable のため reasoning coherence 保留です";
}

function reasoningCoherenceReason(
  reasoningCoherence: InventoryCompareGovernanceReasoningCoherence,
): string {
  if (reasoningCoherence === "coherent_reasoning") {
    return "explainability、audit trace、evidence、confidence、freshness、truth quality、risk、impact、attention、posture が整合して見えるため、coherent reasoning として整理します";
  }
  if (reasoningCoherence === "partially_coherent") {
    return "partial explainability、partial audit trace、medium confidence、observe retention など一部 caveat を含むため、partial reasoning coherence として整理します";
  }
  if (reasoningCoherence === "fragile_reasoning") {
    return "weak evidence、low confidence、stale projection、degraded scope、fragile stability など reasoning chain が不安定に見える signal があるため、fragile reasoning として整理します";
  }
  if (reasoningCoherence === "contradictory_reasoning") {
    return "confidence、evidence、risk、posture、summary、truth quality などの間に整合しにくい組み合わせがあるため、contradictory reasoning として整理します";
  }
  return "source、scope、evidence、explainability、audit trail のいずれかが利用できないため、reasoning coherence unavailable として整理します";
}

function createCompareGovernanceReasoningCoherenceMetadata({
  governanceReasoningCoherence,
  compareHardening,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
  reasoningCoherenceSource,
  reasoningCoherenceSignals,
}: {
  readonly governanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherence;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
  readonly reasoningCoherenceSource: string;
  readonly reasoningCoherenceSignals: readonly string[];
}): InventoryCompareGovernanceReasoningCoherenceMetadata {
  return {
    reasoningCoherenceId: `inventory-integrity-compare-readonly-${classification}-${governanceReasoningCoherence}`,
    governanceReasoningCoherence,
    reasoningCoherenceText: reasoningCoherenceText(governanceReasoningCoherence),
    reasoningCoherenceReason: reasoningCoherenceReason(governanceReasoningCoherence),
    reasoningCoherenceSource,
    reasoningCoherenceSignals,
    label: "read-only compare governance reasoning coherence semantics",
    interpretation:
      "compare governance reasoning coherence は compare reasoning chain 自体が内部的にどの程度整合して見えるかを示す observability metadata です。",
    noExecutionMeaning:
      "compare governance reasoning coherence は整合判定処理、説明生成、監査開始、承認、現場作業、在庫変更を開始しません。",
    governanceExplainability,
    governanceAuditTrail,
    governanceRetention,
    governanceDisposition,
    governancePosture,
    operationalAttention,
    operationalImpact,
    decisionReadiness,
    interpretationStability,
    compareRisk,
    compareEvidence,
    compareConfidence,
    projectionFreshness,
    truthAggregationQuality,
    severity,
    operationalPriority,
    ownerActionability,
    reviewReadiness,
    escalationReadiness,
    operatorSummary,
    operatorTimeline,
    operatorMessage,
    operatorGuidance,
    classification,
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareGovernanceReasoningCoherenceMetadata は read-only reasoning coherence visibility です。操作導線、整合判定処理、説明生成、監査開始、承認、在庫変更は実行しません。",
  };
}

function governanceSemanticDriftForSemantics({
  compareHardening,
  governanceReasoningCoherence,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherence;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
}): InventoryCompareGovernanceSemanticDrift {
  if (
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    governanceReasoningCoherence === "reasoning_unavailable" ||
    governanceExplainability === "explainability_unavailable" ||
    governanceAuditTrail === "audit_unavailable" ||
    compareEvidence === "evidence_unavailable" ||
    compareConfidence === "confidence_blocked" ||
    projectionFreshness === "freshness_unavailable" ||
    truthAggregationQuality === "truth_quality_unavailable" ||
    classification === "unavailable_projection"
  ) {
    return "drift_unavailable";
  }
  if (
    governanceReasoningCoherence === "contradictory_reasoning" ||
    interpretationStability === "stability_fragile" ||
    (compareRisk === "risk_critical" &&
      (compareEvidence === "evidence_missing" ||
        compareEvidence === "evidence_weak" ||
        compareConfidence === "confidence_low")) ||
    (compareRisk === "risk_high" &&
      compareEvidence === "evidence_weak" &&
      compareConfidence === "confidence_low") ||
    (projectionFreshness === "freshness_stale" &&
      (truthAggregationQuality === "truth_quality_incomplete" ||
        compareConfidence === "confidence_low" ||
        governanceAuditTrail === "audit_missing")) ||
    (governanceExplainability === "not_explainable" &&
      governanceAuditTrail === "audit_missing") ||
    governanceDisposition === "disposition_hold" ||
    decisionReadiness === "decision_hold_unavailable" ||
    severity === "critical" ||
    operationalPriority === "priority_p0"
  ) {
    return "severely_drifting";
  }
  if (
    governanceReasoningCoherence === "fragile_reasoning" ||
    governanceExplainability === "weakly_explainable" ||
    governanceAuditTrail === "audit_weak" ||
    compareEvidence === "evidence_weak" ||
    compareConfidence === "confidence_low" ||
    projectionFreshness === "freshness_stale" ||
    truthAggregationQuality === "truth_quality_incomplete" ||
    interpretationStability === "stability_unverified" ||
    governanceRetention === "retention_review" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    compareHardening.resultStatus === "compare_result_partial" ||
    classification === "stale_projection" ||
    classification === "degraded_projection" ||
    classification === "compare_partial"
  ) {
    return "drifting_semantics";
  }
  if (
    governanceReasoningCoherence === "partially_coherent" ||
    governanceExplainability === "partially_explainable" ||
    governanceAuditTrail === "audit_partial" ||
    compareEvidence === "evidence_moderate" ||
    compareConfidence === "confidence_medium" ||
    projectionFreshness === "freshness_recent" ||
    truthAggregationQuality === "truth_quality_warning" ||
    interpretationStability === "stability_fluctuating" ||
    governanceDisposition === "disposition_observe_queue" ||
    governanceRetention === "retention_observe" ||
    governancePosture === "posture_observe" ||
    operationalAttention === "attention_observe" ||
    reviewReadiness === "review_recommended" ||
    escalationReadiness === "escalation_recommended"
  ) {
    return "slightly_drifting";
  }
  if (
    governanceReasoningCoherence === "coherent_reasoning" &&
    governanceExplainability === "explainable" &&
    governanceAuditTrail === "audit_traceable" &&
    compareEvidence === "evidence_strong" &&
    compareConfidence === "confidence_high" &&
    projectionFreshness === "freshness_current" &&
    truthAggregationQuality === "truth_quality_stable" &&
    interpretationStability === "stability_stable" &&
    compareRisk === "risk_low" &&
    operationalImpact === "impact_minimal" &&
    operationalAttention === "attention_normal" &&
    governancePosture === "posture_normal" &&
    governanceDisposition === "disposition_normal" &&
    governanceRetention === "retention_transient" &&
    severity === "info" &&
    operationalPriority === "priority_p3" &&
    ownerActionability === "monitor_only" &&
    reviewReadiness === "review_optional" &&
    escalationReadiness === "escalation_optional" &&
    operatorSummary === "summary_all_clear" &&
    operatorTimeline === "timeline_monitor_difference" &&
    operatorMessage === "message_monitor_minor_difference" &&
    operatorGuidance === "guidance_monitor"
  ) {
    return "stable_semantics";
  }
  return "slightly_drifting";
}

function semanticDriftText(
  semanticDrift: InventoryCompareGovernanceSemanticDrift,
): string {
  if (semanticDrift === "stable_semantics") {
    return "semantic drift は安定しています";
  }
  if (semanticDrift === "slightly_drifting") {
    return "slight semantic drift 状態です";
  }
  if (semanticDrift === "drifting_semantics") {
    return "semantic drift が進行している可能性があります";
  }
  if (semanticDrift === "severely_drifting") {
    return "semantic drift が大きい可能性があります";
  }
  return "source / evidence unavailable のため semantic drift 保留です";
}

function semanticDriftReason(
  semanticDrift: InventoryCompareGovernanceSemanticDrift,
): string {
  if (semanticDrift === "stable_semantics") {
    return "freshness、confidence、evidence、audit、explainability、reasoning coherence、risk、impact、attention、posture が安定して見えるため、stable semantics として整理します";
  }
  if (semanticDrift === "slightly_drifting") {
    return "recent freshness、medium confidence、partial audit、partially explainable、observe retention など軽い caveat があるため、slight semantic drift として整理します";
  }
  if (semanticDrift === "drifting_semantics") {
    return "stale projection、degraded scope、weak evidence、fragile reasoning、low confidence など semantic drift が進行して見える signal があるため、drifting semantics として整理します";
  }
  if (semanticDrift === "severely_drifting") {
    return "contradictory reasoning、unstable interpretation、高い risk と弱い evidence、強い freshness 劣化などがあるため、severe semantic drift として整理します";
  }
  return "source、scope、evidence、truth quality、reasoning coherence、explainability、audit trail のいずれかが利用できないため、semantic drift unavailable として整理します";
}

function createCompareGovernanceSemanticDriftMetadata({
  governanceSemanticDrift,
  compareHardening,
  governanceReasoningCoherence,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
  semanticDriftSource,
  semanticDriftSignals,
}: {
  readonly governanceSemanticDrift: InventoryCompareGovernanceSemanticDrift;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherence;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
  readonly semanticDriftSource: string;
  readonly semanticDriftSignals: readonly string[];
}): InventoryCompareGovernanceSemanticDriftMetadata {
  return {
    semanticDriftId: `inventory-integrity-compare-readonly-${classification}-${governanceSemanticDrift}`,
    governanceSemanticDrift,
    semanticDriftText: semanticDriftText(governanceSemanticDrift),
    semanticDriftReason: semanticDriftReason(governanceSemanticDrift),
    semanticDriftSource,
    semanticDriftSignals,
    label: "read-only compare governance semantic drift semantics",
    interpretation:
      "compare governance semantic drift は時間経過、projection 更新、freshness 劣化に対して semantics がどの程度揺れて見えるかを示す observability metadata です。",
    noExecutionMeaning:
      "compare governance semantic drift は semantic engine、説明生成、監査開始、承認、現場作業、在庫変更を開始しません。",
    governanceReasoningCoherence,
    governanceExplainability,
    governanceAuditTrail,
    governanceRetention,
    governanceDisposition,
    governancePosture,
    operationalAttention,
    operationalImpact,
    decisionReadiness,
    interpretationStability,
    compareRisk,
    compareEvidence,
    compareConfidence,
    projectionFreshness,
    truthAggregationQuality,
    severity,
    operationalPriority,
    ownerActionability,
    reviewReadiness,
    escalationReadiness,
    operatorSummary,
    operatorTimeline,
    operatorMessage,
    operatorGuidance,
    classification,
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareGovernanceSemanticDriftMetadata は read-only semantic drift visibility です。操作導線、semantic engine、説明生成、監査開始、承認、在庫変更は実行しません。",
  };
}

function governanceSemanticConvergenceForSemantics({
  compareHardening,
  governanceSemanticDrift,
  governanceReasoningCoherence,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceSemanticDrift: InventoryCompareGovernanceSemanticDrift;
  readonly governanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherence;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
}): InventoryCompareGovernanceSemanticConvergence {
  if (
    governanceSemanticDrift === "drift_unavailable" ||
    governanceReasoningCoherence === "reasoning_unavailable" ||
    governanceExplainability === "explainability_unavailable" ||
    governanceAuditTrail === "audit_unavailable" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    compareEvidence === "evidence_unavailable" ||
    compareConfidence === "confidence_blocked" ||
    projectionFreshness === "freshness_unavailable" ||
    truthAggregationQuality === "truth_quality_unavailable" ||
    classification === "unavailable_projection"
  ) {
    return "convergence_unavailable";
  }
  if (
    governanceSemanticDrift === "severely_drifting" ||
    governanceReasoningCoherence === "contradictory_reasoning" ||
    governanceExplainability === "not_explainable" ||
    compareRisk === "risk_critical" ||
    operationalImpact === "impact_critical" ||
    governancePosture === "posture_escalated" ||
    governanceDisposition === "disposition_escalated_queue" ||
    decisionReadiness === "decision_hold_unavailable" ||
    severity === "critical" ||
    operationalPriority === "priority_p0"
  ) {
    return "nonconverging_semantics";
  }
  if (
    governanceSemanticDrift === "drifting_semantics" ||
    governanceReasoningCoherence === "fragile_reasoning" ||
    governanceExplainability === "weakly_explainable" ||
    governanceAuditTrail === "audit_weak" ||
    compareEvidence === "evidence_weak" ||
    compareConfidence === "confidence_low" ||
    projectionFreshness === "freshness_stale" ||
    truthAggregationQuality === "truth_quality_incomplete" ||
    interpretationStability === "stability_fragile" ||
    governanceRetention === "retention_review" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    classification === "stale_projection" ||
    classification === "degraded_projection"
  ) {
    return "slow_convergence";
  }
  if (
    governanceSemanticDrift === "slightly_drifting" ||
    governanceReasoningCoherence === "partially_coherent" ||
    governanceExplainability === "partially_explainable" ||
    governanceAuditTrail === "audit_partial" ||
    compareEvidence === "evidence_moderate" ||
    compareConfidence === "confidence_medium" ||
    projectionFreshness === "freshness_recent" ||
    truthAggregationQuality === "truth_quality_warning" ||
    governanceDisposition === "disposition_observe_queue" ||
    governanceRetention === "retention_observe" ||
    governancePosture === "posture_observe" ||
    operationalAttention === "attention_observe" ||
    reviewReadiness === "review_recommended" ||
    escalationReadiness === "escalation_recommended"
  ) {
    return "converging_semantics";
  }
  if (
    governanceSemanticDrift === "stable_semantics" &&
    governanceReasoningCoherence === "coherent_reasoning" &&
    governanceExplainability === "explainable" &&
    governanceAuditTrail === "audit_traceable" &&
    compareEvidence === "evidence_strong" &&
    compareConfidence === "confidence_high" &&
    projectionFreshness === "freshness_current" &&
    truthAggregationQuality === "truth_quality_stable" &&
    interpretationStability === "stability_stable" &&
    compareRisk === "risk_low" &&
    operationalImpact === "impact_minimal" &&
    operationalAttention === "attention_normal" &&
    governancePosture === "posture_normal" &&
    governanceDisposition === "disposition_normal" &&
    governanceRetention === "retention_transient" &&
    severity === "info" &&
    operationalPriority === "priority_p3" &&
    ownerActionability === "monitor_only" &&
    reviewReadiness === "review_optional" &&
    escalationReadiness === "escalation_optional" &&
    operatorSummary === "summary_all_clear" &&
    operatorTimeline === "timeline_monitor_difference" &&
    operatorMessage === "message_monitor_minor_difference" &&
    operatorGuidance === "guidance_monitor"
  ) {
    return "stable_convergence";
  }
  return "converging_semantics";
}

function semanticConvergenceText(
  convergence: InventoryCompareGovernanceSemanticConvergence,
): string {
  if (convergence === "stable_convergence") {
    return "semantic convergence は安定しています";
  }
  if (convergence === "converging_semantics") {
    return "semantic convergence は収束傾向です";
  }
  if (convergence === "slow_convergence") {
    return "semantic convergence は遅い可能性があります";
  }
  if (convergence === "nonconverging_semantics") {
    return "semantics は収束していない可能性があります";
  }
  return "source / evidence unavailable のため convergence 保留です";
}

function semanticConvergenceReason(
  convergence: InventoryCompareGovernanceSemanticConvergence,
): string {
  if (convergence === "stable_convergence") {
    return "semantic drift、reasoning coherence、explainability、audit trace、evidence、confidence、freshness、truth quality が安定方向に揃って見えるため、stable convergence として整理します";
  }
  if (convergence === "converging_semantics") {
    return "slight drift、partial coherence、moderate evidence、medium confidence、observe retention など軽い caveat を含みつつ収束傾向に見えるため、converging semantics として整理します";
  }
  if (convergence === "slow_convergence") {
    return "drifting semantics、fragile reasoning、weak evidence、low confidence、stale freshness など収束が遅く見える signal があるため、slow convergence として整理します";
  }
  if (convergence === "nonconverging_semantics") {
    return "severe drift、contradictory reasoning、高い risk、強い impact、escalated posture など収束していない可能性があるため、nonconverging semantics として整理します";
  }
  return "source、scope、evidence、semantic drift、reasoning coherence、explainability、audit trail のいずれかが利用できないため、semantic convergence unavailable として整理します";
}

function createCompareGovernanceSemanticConvergenceMetadata({
  governanceSemanticConvergence,
  compareHardening,
  governanceSemanticDrift,
  governanceReasoningCoherence,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
  semanticConvergenceSource,
  semanticConvergenceSignals,
}: {
  readonly governanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergence;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceSemanticDrift: InventoryCompareGovernanceSemanticDrift;
  readonly governanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherence;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
  readonly semanticConvergenceSource: string;
  readonly semanticConvergenceSignals: readonly string[];
}): InventoryCompareGovernanceSemanticConvergenceMetadata {
  return {
    semanticConvergenceId: `inventory-integrity-compare-readonly-${classification}-${governanceSemanticConvergence}`,
    governanceSemanticConvergence,
    semanticConvergenceText: semanticConvergenceText(governanceSemanticConvergence),
    semanticConvergenceReason: semanticConvergenceReason(
      governanceSemanticConvergence,
    ),
    semanticConvergenceSource,
    semanticConvergenceSignals,
    label: "read-only compare governance semantic convergence semantics",
    interpretation:
      "compare governance semantic convergence は compare semantics が安定方向へどの程度収束して見えるかを示す observability metadata です。",
    noExecutionMeaning:
      "compare governance semantic convergence は convergence engine、説明生成、監査開始、承認、現場作業、在庫変更を開始しません。",
    governanceSemanticDrift,
    governanceReasoningCoherence,
    governanceExplainability,
    governanceAuditTrail,
    governanceRetention,
    governanceDisposition,
    governancePosture,
    operationalAttention,
    operationalImpact,
    decisionReadiness,
    interpretationStability,
    compareRisk,
    compareEvidence,
    compareConfidence,
    projectionFreshness,
    truthAggregationQuality,
    severity,
    operationalPriority,
    ownerActionability,
    reviewReadiness,
    escalationReadiness,
    operatorSummary,
    operatorTimeline,
    operatorMessage,
    operatorGuidance,
    classification,
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareGovernanceSemanticConvergenceMetadata は read-only semantic convergence visibility です。操作導線、convergence engine、説明生成、監査開始、承認、在庫変更は実行しません。",
  };
}

function governanceSemanticResilienceForSemantics({
  compareHardening,
  governanceSemanticConvergence,
  governanceSemanticDrift,
  governanceReasoningCoherence,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergence;
  readonly governanceSemanticDrift: InventoryCompareGovernanceSemanticDrift;
  readonly governanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherence;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
}): InventoryCompareGovernanceSemanticResilience {
  if (
    governanceSemanticConvergence === "convergence_unavailable" ||
    governanceSemanticDrift === "drift_unavailable" ||
    governanceReasoningCoherence === "reasoning_unavailable" ||
    governanceExplainability === "explainability_unavailable" ||
    governanceAuditTrail === "audit_unavailable" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    compareEvidence === "evidence_unavailable" ||
    compareConfidence === "confidence_blocked" ||
    projectionFreshness === "freshness_unavailable" ||
    truthAggregationQuality === "truth_quality_unavailable" ||
    interpretationStability === "stability_unavailable" ||
    classification === "unavailable_projection"
  ) {
    return "resilience_unavailable";
  }
  if (
    governanceSemanticConvergence === "nonconverging_semantics" ||
    governanceSemanticDrift === "severely_drifting" ||
    governanceReasoningCoherence === "contradictory_reasoning" ||
    governanceExplainability === "not_explainable" ||
    interpretationStability === "stability_unverified" ||
    interpretationStability === "stability_fragile" ||
    compareRisk === "risk_critical" ||
    operationalImpact === "impact_critical" ||
    governancePosture === "posture_escalated" ||
    governanceDisposition === "disposition_escalated_queue" ||
    decisionReadiness === "decision_hold_unavailable" ||
    severity === "critical" ||
    operationalPriority === "priority_p0"
  ) {
    return "collapsed_resilience";
  }
  if (
    governanceSemanticConvergence === "slow_convergence" ||
    governanceSemanticDrift === "drifting_semantics" ||
    governanceReasoningCoherence === "fragile_reasoning" ||
    governanceExplainability === "weakly_explainable" ||
    governanceAuditTrail === "audit_weak" ||
    compareEvidence === "evidence_weak" ||
    compareConfidence === "confidence_low" ||
    projectionFreshness === "freshness_stale" ||
    truthAggregationQuality === "truth_quality_incomplete" ||
    interpretationStability === "stability_fluctuating" ||
    governanceRetention === "retention_review" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    classification === "stale_projection" ||
    classification === "degraded_projection"
  ) {
    return "fragile_resilience";
  }
  if (
    governanceSemanticConvergence === "converging_semantics" ||
    governanceSemanticDrift === "slightly_drifting" ||
    governanceReasoningCoherence === "partially_coherent" ||
    governanceExplainability === "partially_explainable" ||
    governanceAuditTrail === "audit_partial" ||
    compareEvidence === "evidence_moderate" ||
    compareConfidence === "confidence_medium" ||
    projectionFreshness === "freshness_recent" ||
    truthAggregationQuality === "truth_quality_warning" ||
    governanceDisposition === "disposition_observe_queue" ||
    governanceRetention === "retention_observe" ||
    governancePosture === "posture_observe" ||
    operationalAttention === "attention_observe" ||
    reviewReadiness === "review_recommended" ||
    escalationReadiness === "escalation_recommended"
  ) {
    return "partially_resilient";
  }
  if (
    governanceSemanticConvergence === "stable_convergence" &&
    governanceSemanticDrift === "stable_semantics" &&
    governanceReasoningCoherence === "coherent_reasoning" &&
    governanceExplainability === "explainable" &&
    governanceAuditTrail === "audit_traceable" &&
    compareEvidence === "evidence_strong" &&
    compareConfidence === "confidence_high" &&
    projectionFreshness === "freshness_current" &&
    truthAggregationQuality === "truth_quality_stable" &&
    interpretationStability === "stability_stable" &&
    compareRisk === "risk_low" &&
    operationalImpact === "impact_minimal" &&
    operationalAttention === "attention_normal" &&
    governancePosture === "posture_normal" &&
    governanceDisposition === "disposition_normal" &&
    governanceRetention === "retention_transient" &&
    severity === "info" &&
    operationalPriority === "priority_p3" &&
    ownerActionability === "monitor_only" &&
    reviewReadiness === "review_optional" &&
    escalationReadiness === "escalation_optional" &&
    operatorSummary === "summary_all_clear" &&
    operatorTimeline === "timeline_monitor_difference" &&
    operatorMessage === "message_monitor_minor_difference" &&
    operatorGuidance === "guidance_monitor"
  ) {
    return "resilient_semantics";
  }
  return "partially_resilient";
}

function semanticResilienceText(
  resilience: InventoryCompareGovernanceSemanticResilience,
): string {
  if (resilience === "resilient_semantics") {
    return "semantic resilience は安定しています";
  }
  if (resilience === "partially_resilient") {
    return "semantic resilience は部分維持されています";
  }
  if (resilience === "fragile_resilience") {
    return "semantic resilience が脆弱な可能性があります";
  }
  if (resilience === "collapsed_resilience") {
    return "semantic resilience が崩壊している可能性があります";
  }
  return "source / evidence unavailable のため resilience 保留です";
}

function semanticResilienceReason(
  resilience: InventoryCompareGovernanceSemanticResilience,
): string {
  if (resilience === "resilient_semantics") {
    return "semantic convergence、drift、reasoning coherence、explainability、audit trace、evidence、confidence、freshness、truth quality、interpretation stability が安定方向に揃って見えるため、resilient semantics として整理します";
  }
  if (resilience === "partially_resilient") {
    return "slight drift、partial coherence、moderate evidence、medium confidence、observe retention など軽い caveat を含みつつ semantics が部分維持されて見えるため、partially resilient として整理します";
  }
  if (resilience === "fragile_resilience") {
    return "drifting semantics、fragile reasoning、weak evidence、low confidence、stale freshness、degraded scope など semantics が脆弱に見える signal があるため、fragile resilience として整理します";
  }
  if (resilience === "collapsed_resilience") {
    return "nonconverging semantics、contradictory reasoning、unstable interpretation、高い risk、強い impact、escalated posture など semantics が崩壊している可能性があるため、collapsed resilience として整理します";
  }
  return "source、scope、evidence、semantic convergence、semantic drift、reasoning coherence、explainability、audit trail のいずれかが利用できないため、semantic resilience unavailable として整理します";
}

function createCompareGovernanceSemanticResilienceMetadata({
  governanceSemanticResilience,
  compareHardening,
  governanceSemanticConvergence,
  governanceSemanticDrift,
  governanceReasoningCoherence,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
  semanticResilienceSource,
  semanticResilienceSignals,
}: {
  readonly governanceSemanticResilience: InventoryCompareGovernanceSemanticResilience;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergence;
  readonly governanceSemanticDrift: InventoryCompareGovernanceSemanticDrift;
  readonly governanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherence;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
  readonly semanticResilienceSource: string;
  readonly semanticResilienceSignals: readonly string[];
}): InventoryCompareGovernanceSemanticResilienceMetadata {
  return {
    semanticResilienceId: `inventory-integrity-compare-readonly-${classification}-${governanceSemanticResilience}`,
    governanceSemanticResilience,
    semanticResilienceText: semanticResilienceText(governanceSemanticResilience),
    semanticResilienceReason: semanticResilienceReason(governanceSemanticResilience),
    semanticResilienceSource,
    semanticResilienceSignals,
    label: "read-only compare governance semantic resilience semantics",
    interpretation:
      "compare governance semantic resilience は異常・freshness 劣化・evidence 劣化・partial/degraded 状態でも compare semantics がどの程度維持されて見えるかを示す observability metadata です。",
    noExecutionMeaning:
      "compare governance semantic resilience は resilience engine、説明生成、監査開始、承認、現場作業、在庫変更を開始しません。",
    governanceSemanticConvergence,
    governanceSemanticDrift,
    governanceReasoningCoherence,
    governanceExplainability,
    governanceAuditTrail,
    governanceRetention,
    governanceDisposition,
    governancePosture,
    operationalAttention,
    operationalImpact,
    decisionReadiness,
    interpretationStability,
    compareRisk,
    compareEvidence,
    compareConfidence,
    projectionFreshness,
    truthAggregationQuality,
    severity,
    operationalPriority,
    ownerActionability,
    reviewReadiness,
    escalationReadiness,
    operatorSummary,
    operatorTimeline,
    operatorMessage,
    operatorGuidance,
    classification,
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareGovernanceSemanticResilienceMetadata は read-only semantic resilience visibility です。操作導線、resilience engine、説明生成、監査開始、承認、在庫変更は実行しません。",
  };
}

function governanceSemanticIntegrityBoundaryForSemantics({
  compareHardening,
  governanceSemanticResilience,
  governanceSemanticConvergence,
  governanceSemanticDrift,
  governanceReasoningCoherence,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceSemanticResilience: InventoryCompareGovernanceSemanticResilience;
  readonly governanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergence;
  readonly governanceSemanticDrift: InventoryCompareGovernanceSemanticDrift;
  readonly governanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherence;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
}): InventoryCompareGovernanceSemanticIntegrityBoundary {
  if (
    governanceSemanticResilience === "resilience_unavailable" ||
    governanceSemanticConvergence === "convergence_unavailable" ||
    governanceSemanticDrift === "drift_unavailable" ||
    governanceReasoningCoherence === "reasoning_unavailable" ||
    governanceExplainability === "explainability_unavailable" ||
    governanceAuditTrail === "audit_unavailable" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    compareEvidence === "evidence_unavailable" ||
    compareConfidence === "confidence_blocked" ||
    projectionFreshness === "freshness_unavailable" ||
    truthAggregationQuality === "truth_quality_unavailable" ||
    interpretationStability === "stability_unavailable" ||
    classification === "unavailable_projection"
  ) {
    return "boundary_unavailable";
  }
  if (
    governanceSemanticResilience === "collapsed_resilience" ||
    governanceSemanticConvergence === "nonconverging_semantics" ||
    governanceSemanticDrift === "severely_drifting" ||
    governanceReasoningCoherence === "contradictory_reasoning" ||
    governanceExplainability === "not_explainable" ||
    interpretationStability === "stability_unverified" ||
    interpretationStability === "stability_fragile" ||
    compareRisk === "risk_critical" ||
    operationalImpact === "impact_critical" ||
    governancePosture === "posture_escalated" ||
    governanceDisposition === "disposition_escalated_queue" ||
    decisionReadiness === "decision_hold_unavailable" ||
    severity === "critical" ||
    operationalPriority === "priority_p0"
  ) {
    return "outside_integrity_boundary";
  }
  if (
    governanceSemanticResilience === "fragile_resilience" ||
    governanceSemanticConvergence === "slow_convergence" ||
    governanceSemanticDrift === "drifting_semantics" ||
    governanceReasoningCoherence === "fragile_reasoning" ||
    governanceExplainability === "weakly_explainable" ||
    governanceAuditTrail === "audit_weak" ||
    compareEvidence === "evidence_weak" ||
    compareConfidence === "confidence_low" ||
    projectionFreshness === "freshness_stale" ||
    truthAggregationQuality === "truth_quality_incomplete" ||
    interpretationStability === "stability_fluctuating" ||
    governanceRetention === "retention_review" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    classification === "stale_projection" ||
    classification === "degraded_projection"
  ) {
    return "crossing_integrity_boundary";
  }
  if (
    governanceSemanticResilience === "partially_resilient" ||
    governanceSemanticConvergence === "converging_semantics" ||
    governanceSemanticDrift === "slightly_drifting" ||
    governanceReasoningCoherence === "partially_coherent" ||
    governanceExplainability === "partially_explainable" ||
    governanceAuditTrail === "audit_partial" ||
    compareEvidence === "evidence_moderate" ||
    compareConfidence === "confidence_medium" ||
    projectionFreshness === "freshness_recent" ||
    truthAggregationQuality === "truth_quality_warning" ||
    governanceDisposition === "disposition_observe_queue" ||
    governanceRetention === "retention_observe" ||
    governancePosture === "posture_observe" ||
    operationalAttention === "attention_observe" ||
    reviewReadiness === "review_recommended" ||
    escalationReadiness === "escalation_recommended"
  ) {
    return "near_integrity_boundary";
  }
  if (
    governanceSemanticResilience === "resilient_semantics" &&
    governanceSemanticConvergence === "stable_convergence" &&
    governanceSemanticDrift === "stable_semantics" &&
    governanceReasoningCoherence === "coherent_reasoning" &&
    governanceExplainability === "explainable" &&
    governanceAuditTrail === "audit_traceable" &&
    compareEvidence === "evidence_strong" &&
    compareConfidence === "confidence_high" &&
    projectionFreshness === "freshness_current" &&
    truthAggregationQuality === "truth_quality_stable" &&
    interpretationStability === "stability_stable" &&
    compareRisk === "risk_low" &&
    operationalImpact === "impact_minimal" &&
    operationalAttention === "attention_normal" &&
    governancePosture === "posture_normal" &&
    governanceDisposition === "disposition_normal" &&
    governanceRetention === "retention_transient" &&
    severity === "info" &&
    operationalPriority === "priority_p3" &&
    ownerActionability === "monitor_only" &&
    reviewReadiness === "review_optional" &&
    escalationReadiness === "escalation_optional" &&
    operatorSummary === "summary_all_clear" &&
    operatorTimeline === "timeline_monitor_difference" &&
    operatorMessage === "message_monitor_minor_difference" &&
    operatorGuidance === "guidance_monitor"
  ) {
    return "inside_integrity_boundary";
  }
  return "near_integrity_boundary";
}

function semanticIntegrityBoundaryText(
  boundary: InventoryCompareGovernanceSemanticIntegrityBoundary,
): string {
  if (boundary === "inside_integrity_boundary") {
    return "semantic integrity boundary 内です";
  }
  if (boundary === "near_integrity_boundary") {
    return "semantic integrity boundary に近づいています";
  }
  if (boundary === "crossing_integrity_boundary") {
    return "semantic integrity boundary を横断している可能性があります";
  }
  if (boundary === "outside_integrity_boundary") {
    return "semantic integrity boundary 外の可能性があります";
  }
  return "source / evidence unavailable のため integrity boundary 保留です";
}

function semanticIntegrityBoundaryReason(
  boundary: InventoryCompareGovernanceSemanticIntegrityBoundary,
): string {
  if (boundary === "inside_integrity_boundary") {
    return "resilient semantics、stable convergence、coherent reasoning、explainable、traceable audit、strong evidence、stable interpretation が integrity boundary 内に揃って見えるため、inside integrity boundary として整理します";
  }
  if (boundary === "near_integrity_boundary") {
    return "partially resilient、converging semantics、partial coherence、moderate evidence、observe retention など軽い caveat を含みつつ integrity boundary に近づいているため、near integrity boundary として整理します";
  }
  if (boundary === "crossing_integrity_boundary") {
    return "fragile resilience、slow convergence、drifting semantics、weak evidence、low confidence、stale freshness など boundary を横断している可能性がある signal があるため、crossing integrity boundary として整理します";
  }
  if (boundary === "outside_integrity_boundary") {
    return "collapsed resilience、nonconverging semantics、contradictory reasoning、unstable interpretation、高い risk、強い impact、escalated posture など integrity boundary 外の可能性があるため、outside integrity boundary として整理します";
  }
  return "source、scope、evidence、semantic resilience、semantic convergence、semantic drift、reasoning coherence、explainability、audit trail のいずれかが利用できないため、semantic integrity boundary unavailable として整理します";
}

function createCompareGovernanceSemanticIntegrityBoundaryMetadata({
  governanceSemanticIntegrityBoundary,
  compareHardening,
  governanceSemanticResilience,
  governanceSemanticConvergence,
  governanceSemanticDrift,
  governanceReasoningCoherence,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
  semanticIntegrityBoundarySource,
  semanticIntegrityBoundarySignals,
}: {
  readonly governanceSemanticIntegrityBoundary: InventoryCompareGovernanceSemanticIntegrityBoundary;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceSemanticResilience: InventoryCompareGovernanceSemanticResilience;
  readonly governanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergence;
  readonly governanceSemanticDrift: InventoryCompareGovernanceSemanticDrift;
  readonly governanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherence;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
  readonly semanticIntegrityBoundarySource: string;
  readonly semanticIntegrityBoundarySignals: readonly string[];
}): InventoryCompareGovernanceSemanticIntegrityBoundaryMetadata {
  return {
    semanticIntegrityBoundaryId: `inventory-integrity-compare-readonly-${classification}-${governanceSemanticIntegrityBoundary}`,
    governanceSemanticIntegrityBoundary,
    semanticIntegrityBoundaryText: semanticIntegrityBoundaryText(
      governanceSemanticIntegrityBoundary,
    ),
    semanticIntegrityBoundaryReason: semanticIntegrityBoundaryReason(
      governanceSemanticIntegrityBoundary,
    ),
    semanticIntegrityBoundarySource,
    semanticIntegrityBoundarySignals,
    label: "read-only compare governance semantic integrity boundary semantics",
    interpretation:
      "compare governance semantic integrity boundary は compare semantics がどこまで integrity の安全境界内に見えるかを示す observability metadata です。",
    noExecutionMeaning:
      "compare governance semantic integrity boundary は boundary engine、説明生成、監査開始、承認、現場作業、在庫変更を開始しません。",
    governanceSemanticResilience,
    governanceSemanticConvergence,
    governanceSemanticDrift,
    governanceReasoningCoherence,
    governanceExplainability,
    governanceAuditTrail,
    governanceRetention,
    governanceDisposition,
    governancePosture,
    operationalAttention,
    operationalImpact,
    decisionReadiness,
    interpretationStability,
    compareRisk,
    compareEvidence,
    compareConfidence,
    projectionFreshness,
    truthAggregationQuality,
    severity,
    operationalPriority,
    ownerActionability,
    reviewReadiness,
    escalationReadiness,
    operatorSummary,
    operatorTimeline,
    operatorMessage,
    operatorGuidance,
    classification,
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareGovernanceSemanticIntegrityBoundaryMetadata は read-only semantic integrity boundary visibility です。操作導線、boundary engine、説明生成、監査開始、承認、在庫変更は実行しません。",
  };
}

function governanceSemanticRecoverabilityForSemantics({
  compareHardening,
  governanceSemanticIntegrityBoundary,
  governanceSemanticResilience,
  governanceSemanticConvergence,
  governanceSemanticDrift,
  governanceReasoningCoherence,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceSemanticIntegrityBoundary: InventoryCompareGovernanceSemanticIntegrityBoundary;
  readonly governanceSemanticResilience: InventoryCompareGovernanceSemanticResilience;
  readonly governanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergence;
  readonly governanceSemanticDrift: InventoryCompareGovernanceSemanticDrift;
  readonly governanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherence;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
}): InventoryCompareGovernanceSemanticRecoverability {
  if (
    governanceSemanticIntegrityBoundary === "boundary_unavailable" ||
    governanceSemanticResilience === "resilience_unavailable" ||
    governanceSemanticConvergence === "convergence_unavailable" ||
    governanceSemanticDrift === "drift_unavailable" ||
    governanceReasoningCoherence === "reasoning_unavailable" ||
    governanceExplainability === "explainability_unavailable" ||
    governanceAuditTrail === "audit_unavailable" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    compareEvidence === "evidence_unavailable" ||
    compareConfidence === "confidence_blocked" ||
    projectionFreshness === "freshness_unavailable" ||
    truthAggregationQuality === "truth_quality_unavailable" ||
    interpretationStability === "stability_unavailable" ||
    classification === "unavailable_projection"
  ) {
    return "recovery_unavailable";
  }
  if (
    governanceSemanticIntegrityBoundary === "outside_integrity_boundary" ||
    governanceSemanticResilience === "collapsed_resilience" ||
    governanceSemanticConvergence === "nonconverging_semantics" ||
    governanceSemanticDrift === "severely_drifting" ||
    governanceReasoningCoherence === "contradictory_reasoning" ||
    governanceExplainability === "not_explainable" ||
    interpretationStability === "stability_unverified" ||
    interpretationStability === "stability_fragile" ||
    compareRisk === "risk_critical" ||
    operationalImpact === "impact_critical" ||
    governancePosture === "posture_escalated" ||
    governanceDisposition === "disposition_escalated_queue" ||
    decisionReadiness === "decision_hold_unavailable" ||
    severity === "critical" ||
    operationalPriority === "priority_p0"
  ) {
    return "nonrecoverable_semantics";
  }
  if (
    governanceSemanticIntegrityBoundary === "crossing_integrity_boundary" ||
    governanceSemanticResilience === "fragile_resilience" ||
    governanceSemanticConvergence === "slow_convergence" ||
    governanceSemanticDrift === "drifting_semantics" ||
    governanceReasoningCoherence === "fragile_reasoning" ||
    governanceExplainability === "weakly_explainable" ||
    governanceAuditTrail === "audit_weak" ||
    compareEvidence === "evidence_weak" ||
    compareConfidence === "confidence_low" ||
    projectionFreshness === "freshness_stale" ||
    truthAggregationQuality === "truth_quality_incomplete" ||
    interpretationStability === "stability_fluctuating" ||
    governanceRetention === "retention_review" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    classification === "stale_projection" ||
    classification === "degraded_projection"
  ) {
    return "difficult_recovery";
  }
  if (
    governanceSemanticIntegrityBoundary === "near_integrity_boundary" ||
    governanceSemanticResilience === "partially_resilient" ||
    governanceSemanticConvergence === "converging_semantics" ||
    governanceSemanticDrift === "slightly_drifting" ||
    governanceReasoningCoherence === "partially_coherent" ||
    governanceExplainability === "partially_explainable" ||
    governanceAuditTrail === "audit_partial" ||
    compareEvidence === "evidence_moderate" ||
    compareConfidence === "confidence_medium" ||
    projectionFreshness === "freshness_recent" ||
    truthAggregationQuality === "truth_quality_warning" ||
    governanceDisposition === "disposition_observe_queue" ||
    governanceRetention === "retention_observe" ||
    governancePosture === "posture_observe" ||
    operationalAttention === "attention_observe" ||
    reviewReadiness === "review_recommended" ||
    escalationReadiness === "escalation_recommended"
  ) {
    return "partially_recoverable";
  }
  if (
    governanceSemanticIntegrityBoundary === "inside_integrity_boundary" &&
    governanceSemanticResilience === "resilient_semantics" &&
    governanceSemanticConvergence === "stable_convergence" &&
    governanceSemanticDrift === "stable_semantics" &&
    governanceReasoningCoherence === "coherent_reasoning" &&
    governanceExplainability === "explainable" &&
    governanceAuditTrail === "audit_traceable" &&
    compareEvidence === "evidence_strong" &&
    compareConfidence === "confidence_high" &&
    projectionFreshness === "freshness_current" &&
    truthAggregationQuality === "truth_quality_stable" &&
    interpretationStability === "stability_stable" &&
    compareRisk === "risk_low" &&
    operationalImpact === "impact_minimal" &&
    operationalAttention === "attention_normal" &&
    governancePosture === "posture_normal" &&
    governanceDisposition === "disposition_normal" &&
    governanceRetention === "retention_transient" &&
    severity === "info" &&
    operationalPriority === "priority_p3" &&
    ownerActionability === "monitor_only" &&
    reviewReadiness === "review_optional" &&
    escalationReadiness === "escalation_optional" &&
    operatorSummary === "summary_all_clear" &&
    operatorTimeline === "timeline_monitor_difference" &&
    operatorMessage === "message_monitor_minor_difference" &&
    operatorGuidance === "guidance_monitor"
  ) {
    return "recoverable_semantics";
  }
  return "partially_recoverable";
}

function semanticRecoverabilityText(
  recoverability: InventoryCompareGovernanceSemanticRecoverability,
): string {
  if (recoverability === "recoverable_semantics") {
    return "semantic recoverability は維持されています";
  }
  if (recoverability === "partially_recoverable") {
    return "semantic recoverability は部分維持されています";
  }
  if (recoverability === "difficult_recovery") {
    return "semantic recovery が難しい可能性があります";
  }
  if (recoverability === "nonrecoverable_semantics") {
    return "semantic recovery が困難な可能性があります";
  }
  return "source / evidence unavailable のため recoverability 保留です";
}

function semanticRecoverabilityReason(
  recoverability: InventoryCompareGovernanceSemanticRecoverability,
): string {
  if (recoverability === "recoverable_semantics") {
    return "inside integrity boundary、resilient semantics、stable convergence、coherent reasoning、explainable、traceable audit、strong evidence、stable interpretation が揃って見えるため、recoverable semantics として整理します";
  }
  if (recoverability === "partially_recoverable") {
    return "near integrity boundary、partially resilient、converging semantics、partial coherence、moderate evidence、observe retention など軽い caveat を含みつつ recoverability が部分維持されて見えるため、partially recoverable として整理します";
  }
  if (recoverability === "difficult_recovery") {
    return "crossing integrity boundary、fragile resilience、slow convergence、drifting semantics、weak evidence、low confidence、stale freshness など recovery が難しい可能性がある signal があるため、difficult recovery として整理します";
  }
  if (recoverability === "nonrecoverable_semantics") {
    return "outside integrity boundary、collapsed resilience、nonconverging semantics、contradictory reasoning、unstable interpretation、高い risk、強い impact、escalated posture など recovery が困難な可能性があるため、nonrecoverable semantics として整理します";
  }
  return "source、scope、evidence、semantic integrity boundary、semantic resilience、semantic convergence、semantic drift、reasoning coherence、explainability、audit trail のいずれかが利用できないため、semantic recoverability unavailable として整理します";
}

function createCompareGovernanceSemanticRecoverabilityMetadata({
  governanceSemanticRecoverability,
  compareHardening,
  governanceSemanticIntegrityBoundary,
  governanceSemanticResilience,
  governanceSemanticConvergence,
  governanceSemanticDrift,
  governanceReasoningCoherence,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
  semanticRecoverabilitySource,
  semanticRecoverabilitySignals,
}: {
  readonly governanceSemanticRecoverability: InventoryCompareGovernanceSemanticRecoverability;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceSemanticIntegrityBoundary: InventoryCompareGovernanceSemanticIntegrityBoundary;
  readonly governanceSemanticResilience: InventoryCompareGovernanceSemanticResilience;
  readonly governanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergence;
  readonly governanceSemanticDrift: InventoryCompareGovernanceSemanticDrift;
  readonly governanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherence;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
  readonly semanticRecoverabilitySource: string;
  readonly semanticRecoverabilitySignals: readonly string[];
}): InventoryCompareGovernanceSemanticRecoverabilityMetadata {
  return {
    semanticRecoverabilityId: `inventory-integrity-compare-readonly-${classification}-${governanceSemanticRecoverability}`,
    governanceSemanticRecoverability,
    semanticRecoverabilityText: semanticRecoverabilityText(governanceSemanticRecoverability),
    semanticRecoverabilityReason: semanticRecoverabilityReason(governanceSemanticRecoverability),
    semanticRecoverabilitySource,
    semanticRecoverabilitySignals,
    label: "read-only compare governance semantic recoverability semantics",
    interpretation:
      "compare governance semantic recoverability は semantic integrity boundary を超えた場合でも compare semantics の integrity がどの程度 recover 可能に見えるかを示す observability metadata です。",
    noExecutionMeaning:
      "compare governance semantic recoverability は recovery engine、説明生成、監査開始、承認、現場作業、在庫変更を開始しません。",
    governanceSemanticIntegrityBoundary,
    governanceSemanticResilience,
    governanceSemanticConvergence,
    governanceSemanticDrift,
    governanceReasoningCoherence,
    governanceExplainability,
    governanceAuditTrail,
    governanceRetention,
    governanceDisposition,
    governancePosture,
    operationalAttention,
    operationalImpact,
    decisionReadiness,
    interpretationStability,
    compareRisk,
    compareEvidence,
    compareConfidence,
    projectionFreshness,
    truthAggregationQuality,
    severity,
    operationalPriority,
    ownerActionability,
    reviewReadiness,
    escalationReadiness,
    operatorSummary,
    operatorTimeline,
    operatorMessage,
    operatorGuidance,
    classification,
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareGovernanceSemanticRecoverabilityMetadata は read-only semantic recoverability visibility です。操作導線、recovery engine、説明生成、監査開始、承認、在庫変更は実行しません。",
  };
}

function governanceSemanticObservabilityContinuityForSemantics({
  compareHardening,
  governanceSemanticRecoverability,
  governanceSemanticIntegrityBoundary,
  governanceSemanticResilience,
  governanceSemanticConvergence,
  governanceSemanticDrift,
  governanceReasoningCoherence,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceSemanticRecoverability: InventoryCompareGovernanceSemanticRecoverability;
  readonly governanceSemanticIntegrityBoundary: InventoryCompareGovernanceSemanticIntegrityBoundary;
  readonly governanceSemanticResilience: InventoryCompareGovernanceSemanticResilience;
  readonly governanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergence;
  readonly governanceSemanticDrift: InventoryCompareGovernanceSemanticDrift;
  readonly governanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherence;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
}): InventoryCompareGovernanceSemanticObservabilityContinuity {
  if (
    governanceSemanticRecoverability === "recovery_unavailable" ||
    governanceSemanticIntegrityBoundary === "boundary_unavailable" ||
    governanceSemanticResilience === "resilience_unavailable" ||
    governanceSemanticConvergence === "convergence_unavailable" ||
    governanceSemanticDrift === "drift_unavailable" ||
    governanceReasoningCoherence === "reasoning_unavailable" ||
    governanceExplainability === "explainability_unavailable" ||
    governanceAuditTrail === "audit_unavailable" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    compareEvidence === "evidence_unavailable" ||
    compareConfidence === "confidence_blocked" ||
    projectionFreshness === "freshness_unavailable" ||
    truthAggregationQuality === "truth_quality_unavailable" ||
    interpretationStability === "stability_unavailable" ||
    classification === "unavailable_projection"
  ) {
    return "continuity_unavailable";
  }
  if (
    governanceSemanticRecoverability === "nonrecoverable_semantics" ||
    governanceSemanticIntegrityBoundary === "outside_integrity_boundary" ||
    governanceSemanticResilience === "collapsed_resilience" ||
    governanceSemanticConvergence === "nonconverging_semantics" ||
    governanceSemanticDrift === "severely_drifting" ||
    governanceReasoningCoherence === "contradictory_reasoning" ||
    governanceExplainability === "not_explainable" ||
    interpretationStability === "stability_unverified" ||
    interpretationStability === "stability_fragile" ||
    truthAggregationQuality === "truth_quality_unverified" ||
    compareRisk === "risk_critical" ||
    operationalImpact === "impact_critical" ||
    governancePosture === "posture_escalated" ||
    governanceDisposition === "disposition_escalated_queue" ||
    decisionReadiness === "decision_hold_unavailable" ||
    severity === "critical" ||
    operationalPriority === "priority_p0"
  ) {
    return "broken_continuity";
  }
  if (
    governanceSemanticRecoverability === "difficult_recovery" ||
    governanceSemanticIntegrityBoundary === "crossing_integrity_boundary" ||
    governanceSemanticResilience === "fragile_resilience" ||
    governanceSemanticConvergence === "slow_convergence" ||
    governanceSemanticDrift === "drifting_semantics" ||
    governanceReasoningCoherence === "fragile_reasoning" ||
    governanceExplainability === "weakly_explainable" ||
    governanceAuditTrail === "audit_weak" ||
    compareEvidence === "evidence_weak" ||
    compareConfidence === "confidence_low" ||
    projectionFreshness === "freshness_stale" ||
    truthAggregationQuality === "truth_quality_incomplete" ||
    interpretationStability === "stability_fluctuating" ||
    governanceRetention === "retention_review" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    classification === "stale_projection" ||
    classification === "degraded_projection"
  ) {
    return "interrupted_continuity";
  }
  if (
    governanceSemanticRecoverability === "partially_recoverable" ||
    governanceSemanticIntegrityBoundary === "near_integrity_boundary" ||
    governanceSemanticResilience === "partially_resilient" ||
    governanceSemanticConvergence === "converging_semantics" ||
    governanceSemanticDrift === "slightly_drifting" ||
    governanceReasoningCoherence === "partially_coherent" ||
    governanceExplainability === "partially_explainable" ||
    governanceAuditTrail === "audit_partial" ||
    compareEvidence === "evidence_moderate" ||
    compareConfidence === "confidence_medium" ||
    projectionFreshness === "freshness_recent" ||
    truthAggregationQuality === "truth_quality_warning" ||
    governanceDisposition === "disposition_observe_queue" ||
    governanceRetention === "retention_observe" ||
    governancePosture === "posture_observe" ||
    operationalAttention === "attention_observe" ||
    reviewReadiness === "review_recommended" ||
    escalationReadiness === "escalation_recommended"
  ) {
    return "partially_continuous";
  }
  if (
    governanceSemanticRecoverability === "recoverable_semantics" &&
    governanceSemanticIntegrityBoundary === "inside_integrity_boundary" &&
    governanceSemanticResilience === "resilient_semantics" &&
    governanceSemanticConvergence === "stable_convergence" &&
    governanceSemanticDrift === "stable_semantics" &&
    governanceReasoningCoherence === "coherent_reasoning" &&
    governanceExplainability === "explainable" &&
    governanceAuditTrail === "audit_traceable" &&
    compareEvidence === "evidence_strong" &&
    compareConfidence === "confidence_high" &&
    projectionFreshness === "freshness_current" &&
    truthAggregationQuality === "truth_quality_stable" &&
    interpretationStability === "stability_stable" &&
    compareRisk === "risk_low" &&
    operationalImpact === "impact_minimal" &&
    operationalAttention === "attention_normal" &&
    governancePosture === "posture_normal" &&
    governanceDisposition === "disposition_normal" &&
    governanceRetention === "retention_transient" &&
    severity === "info" &&
    operationalPriority === "priority_p3" &&
    ownerActionability === "monitor_only" &&
    reviewReadiness === "review_optional" &&
    escalationReadiness === "escalation_optional" &&
    operatorSummary === "summary_all_clear" &&
    operatorTimeline === "timeline_monitor_difference" &&
    operatorMessage === "message_monitor_minor_difference" &&
    operatorGuidance === "guidance_monitor"
  ) {
    return "continuous_observability";
  }
  return "partially_continuous";
}

function semanticObservabilityContinuityText(
  continuity: InventoryCompareGovernanceSemanticObservabilityContinuity,
): string {
  if (continuity === "continuous_observability") {
    return "semantic observability continuity は維持されています";
  }
  if (continuity === "partially_continuous") {
    return "semantic observability continuity は部分維持されています";
  }
  if (continuity === "interrupted_continuity") {
    return "semantic observability continuity が中断している可能性があります";
  }
  if (continuity === "broken_continuity") {
    return "semantic observability continuity が崩壊している可能性があります";
  }
  return "source / evidence unavailable のため continuity 保留です";
}

function semanticObservabilityContinuityReason(
  continuity: InventoryCompareGovernanceSemanticObservabilityContinuity,
): string {
  if (continuity === "continuous_observability") {
    return "recoverable semantics、inside integrity boundary、resilient semantics、stable convergence、coherent reasoning、explainable、traceable audit、strong evidence、stable interpretation が時間方向に連続維持されて見えるため、continuous observability として整理します";
  }
  if (continuity === "partially_continuous") {
    return "partially recoverable、near integrity boundary、converging semantics、partial coherence、moderate evidence、observe retention など軽い caveat を含みつつ observability continuity が部分維持されて見えるため、partially continuous として整理します";
  }
  if (continuity === "interrupted_continuity") {
    return "difficult recovery、crossing integrity boundary、fragile resilience、slow convergence、drifting semantics、weak evidence、low confidence、stale freshness など continuity が中断している可能性がある signal があるため、interrupted continuity として整理します";
  }
  if (continuity === "broken_continuity") {
    return "nonrecoverable semantics、outside integrity boundary、collapsed resilience、contradictory reasoning、unstable interpretation、高い risk、強い impact、escalated posture など continuity が崩壊している可能性があるため、broken continuity として整理します";
  }
  return "source、scope、evidence、semantic recoverability、semantic integrity boundary、semantic resilience、semantic convergence、semantic drift、reasoning coherence、explainability、audit trail のいずれかが利用できないため、semantic observability continuity unavailable として整理します";
}

function createCompareGovernanceSemanticObservabilityContinuityMetadata({
  governanceSemanticObservabilityContinuity,
  compareHardening,
  governanceSemanticRecoverability,
  governanceSemanticIntegrityBoundary,
  governanceSemanticResilience,
  governanceSemanticConvergence,
  governanceSemanticDrift,
  governanceReasoningCoherence,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
  semanticObservabilityContinuitySource,
  semanticObservabilityContinuitySignals,
}: {
  readonly governanceSemanticObservabilityContinuity: InventoryCompareGovernanceSemanticObservabilityContinuity;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceSemanticRecoverability: InventoryCompareGovernanceSemanticRecoverability;
  readonly governanceSemanticIntegrityBoundary: InventoryCompareGovernanceSemanticIntegrityBoundary;
  readonly governanceSemanticResilience: InventoryCompareGovernanceSemanticResilience;
  readonly governanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergence;
  readonly governanceSemanticDrift: InventoryCompareGovernanceSemanticDrift;
  readonly governanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherence;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
  readonly semanticObservabilityContinuitySource: string;
  readonly semanticObservabilityContinuitySignals: readonly string[];
}): InventoryCompareGovernanceSemanticObservabilityContinuityMetadata {
  return {
    semanticObservabilityContinuityId: `inventory-integrity-compare-readonly-${classification}-${governanceSemanticObservabilityContinuity}`,
    governanceSemanticObservabilityContinuity,
    semanticObservabilityContinuityText: semanticObservabilityContinuityText(
      governanceSemanticObservabilityContinuity,
    ),
    semanticObservabilityContinuityReason: semanticObservabilityContinuityReason(
      governanceSemanticObservabilityContinuity,
    ),
    semanticObservabilityContinuitySource,
    semanticObservabilityContinuitySignals,
    label: "read-only compare governance semantic observability continuity semantics",
    interpretation:
      "compare governance semantic observability continuity は semantic observability が時間方向にどの程度連続維持されて見えるかを示す observability metadata です。",
    noExecutionMeaning:
      "compare governance semantic observability continuity は continuity engine、説明生成、監査開始、承認、現場作業、在庫変更を開始しません。",
    governanceSemanticRecoverability,
    governanceSemanticIntegrityBoundary,
    governanceSemanticResilience,
    governanceSemanticConvergence,
    governanceSemanticDrift,
    governanceReasoningCoherence,
    governanceExplainability,
    governanceAuditTrail,
    governanceRetention,
    governanceDisposition,
    governancePosture,
    operationalAttention,
    operationalImpact,
    decisionReadiness,
    interpretationStability,
    compareRisk,
    compareEvidence,
    compareConfidence,
    projectionFreshness,
    truthAggregationQuality,
    severity,
    operationalPriority,
    ownerActionability,
    reviewReadiness,
    escalationReadiness,
    operatorSummary,
    operatorTimeline,
    operatorMessage,
    operatorGuidance,
    classification,
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareGovernanceSemanticObservabilityContinuityMetadata は read-only semantic observability continuity visibility です。操作導線、continuity engine、説明生成、監査開始、承認、在庫変更は実行しません。",
  };
}

function governanceSemanticDegradationToleranceForSemantics({
  compareHardening,
  governanceSemanticObservabilityContinuity,
  governanceSemanticRecoverability,
  governanceSemanticIntegrityBoundary,
  governanceSemanticResilience,
  governanceSemanticConvergence,
  governanceSemanticDrift,
  governanceReasoningCoherence,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceSemanticObservabilityContinuity: InventoryCompareGovernanceSemanticObservabilityContinuity;
  readonly governanceSemanticRecoverability: InventoryCompareGovernanceSemanticRecoverability;
  readonly governanceSemanticIntegrityBoundary: InventoryCompareGovernanceSemanticIntegrityBoundary;
  readonly governanceSemanticResilience: InventoryCompareGovernanceSemanticResilience;
  readonly governanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergence;
  readonly governanceSemanticDrift: InventoryCompareGovernanceSemanticDrift;
  readonly governanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherence;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
}): InventoryCompareGovernanceSemanticDegradationTolerance {
  if (
    governanceSemanticObservabilityContinuity === "continuity_unavailable" ||
    governanceSemanticRecoverability === "recovery_unavailable" ||
    governanceSemanticIntegrityBoundary === "boundary_unavailable" ||
    governanceSemanticResilience === "resilience_unavailable" ||
    governanceSemanticConvergence === "convergence_unavailable" ||
    governanceSemanticDrift === "drift_unavailable" ||
    governanceReasoningCoherence === "reasoning_unavailable" ||
    governanceExplainability === "explainability_unavailable" ||
    governanceAuditTrail === "audit_unavailable" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    compareEvidence === "evidence_unavailable" ||
    compareConfidence === "confidence_blocked" ||
    projectionFreshness === "freshness_unavailable" ||
    truthAggregationQuality === "truth_quality_unavailable" ||
    interpretationStability === "stability_unavailable" ||
    classification === "unavailable_projection"
  ) {
    return "tolerance_unavailable";
  }
  if (
    governanceSemanticObservabilityContinuity === "broken_continuity" ||
    governanceSemanticRecoverability === "nonrecoverable_semantics" ||
    governanceSemanticIntegrityBoundary === "outside_integrity_boundary" ||
    governanceSemanticResilience === "collapsed_resilience" ||
    governanceSemanticConvergence === "nonconverging_semantics" ||
    governanceSemanticDrift === "severely_drifting" ||
    governanceReasoningCoherence === "contradictory_reasoning" ||
    governanceExplainability === "not_explainable" ||
    interpretationStability === "stability_unverified" ||
    interpretationStability === "stability_fragile" ||
    truthAggregationQuality === "truth_quality_unverified" ||
    compareRisk === "risk_critical" ||
    operationalImpact === "impact_critical" ||
    governancePosture === "posture_escalated" ||
    governanceDisposition === "disposition_escalated_queue" ||
    decisionReadiness === "decision_hold_unavailable" ||
    severity === "critical" ||
    operationalPriority === "priority_p0"
  ) {
    return "intolerable_degradation";
  }
  if (
    governanceSemanticObservabilityContinuity === "interrupted_continuity" ||
    governanceSemanticRecoverability === "difficult_recovery" ||
    governanceSemanticIntegrityBoundary === "crossing_integrity_boundary" ||
    governanceSemanticResilience === "fragile_resilience" ||
    governanceSemanticConvergence === "slow_convergence" ||
    governanceSemanticDrift === "drifting_semantics" ||
    governanceReasoningCoherence === "fragile_reasoning" ||
    governanceExplainability === "weakly_explainable" ||
    governanceAuditTrail === "audit_weak" ||
    compareEvidence === "evidence_weak" ||
    compareConfidence === "confidence_low" ||
    projectionFreshness === "freshness_stale" ||
    truthAggregationQuality === "truth_quality_incomplete" ||
    interpretationStability === "stability_fluctuating" ||
    governanceRetention === "retention_review" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    classification === "stale_projection" ||
    classification === "degraded_projection"
  ) {
    return "limited_tolerance";
  }
  if (
    governanceSemanticObservabilityContinuity === "partially_continuous" ||
    governanceSemanticRecoverability === "partially_recoverable" ||
    governanceSemanticIntegrityBoundary === "near_integrity_boundary" ||
    governanceSemanticResilience === "partially_resilient" ||
    governanceSemanticConvergence === "converging_semantics" ||
    governanceSemanticDrift === "slightly_drifting" ||
    governanceReasoningCoherence === "partially_coherent" ||
    governanceExplainability === "partially_explainable" ||
    governanceAuditTrail === "audit_partial" ||
    compareEvidence === "evidence_moderate" ||
    compareConfidence === "confidence_medium" ||
    projectionFreshness === "freshness_recent" ||
    truthAggregationQuality === "truth_quality_warning" ||
    governanceDisposition === "disposition_observe_queue" ||
    governanceRetention === "retention_observe" ||
    governancePosture === "posture_observe" ||
    operationalAttention === "attention_observe" ||
    reviewReadiness === "review_recommended" ||
    escalationReadiness === "escalation_recommended"
  ) {
    return "moderate_tolerance";
  }
  if (
    governanceSemanticObservabilityContinuity === "continuous_observability" &&
    governanceSemanticRecoverability === "recoverable_semantics" &&
    governanceSemanticIntegrityBoundary === "inside_integrity_boundary" &&
    governanceSemanticResilience === "resilient_semantics" &&
    governanceSemanticConvergence === "stable_convergence" &&
    governanceSemanticDrift === "stable_semantics" &&
    governanceReasoningCoherence === "coherent_reasoning" &&
    governanceExplainability === "explainable" &&
    governanceAuditTrail === "audit_traceable" &&
    compareEvidence === "evidence_strong" &&
    compareConfidence === "confidence_high" &&
    projectionFreshness === "freshness_current" &&
    truthAggregationQuality === "truth_quality_stable" &&
    interpretationStability === "stability_stable" &&
    compareRisk === "risk_low" &&
    operationalImpact === "impact_minimal" &&
    operationalAttention === "attention_normal" &&
    governancePosture === "posture_normal" &&
    governanceDisposition === "disposition_normal" &&
    governanceRetention === "retention_transient" &&
    severity === "info" &&
    operationalPriority === "priority_p3" &&
    ownerActionability === "monitor_only" &&
    reviewReadiness === "review_optional" &&
    escalationReadiness === "escalation_optional" &&
    operatorSummary === "summary_all_clear" &&
    operatorTimeline === "timeline_monitor_difference" &&
    operatorMessage === "message_monitor_minor_difference" &&
    operatorGuidance === "guidance_monitor"
  ) {
    return "high_tolerance";
  }
  return "limited_tolerance";
}

function semanticDegradationToleranceText(
  tolerance: InventoryCompareGovernanceSemanticDegradationTolerance,
): string {
  if (tolerance === "high_tolerance") {
    return "semantic degradation tolerance は高い状態です";
  }
  if (tolerance === "moderate_tolerance") {
    return "semantic degradation tolerance は維持されています";
  }
  if (tolerance === "limited_tolerance") {
    return "semantic degradation tolerance が限定的な可能性があります";
  }
  if (tolerance === "intolerable_degradation") {
    return "semantic degradation を許容できない可能性があります";
  }
  return "source / evidence unavailable のため degradation tolerance 保留です";
}

function semanticDegradationToleranceReason(
  tolerance: InventoryCompareGovernanceSemanticDegradationTolerance,
): string {
  if (tolerance === "high_tolerance") {
    return "continuous observability、recoverable semantics、inside integrity boundary、resilient semantics、stable convergence、coherent reasoning、explainable、traceable audit、strong evidence、stable interpretation が揃い、degraded / stale / partial 状態を吸収しつつ semantic integrity を維持できて見えるため、high tolerance として整理します";
  }
  if (tolerance === "moderate_tolerance") {
    return "partially continuous、partially recoverable、near integrity boundary、converging semantics、moderate evidence、observe retention など軽い caveat を含みつつ degradation をある程度吸収できて見えるため、moderate tolerance として整理します";
  }
  if (tolerance === "limited_tolerance") {
    return "interrupted continuity、difficult recovery、crossing integrity boundary、fragile resilience、stale freshness、weak evidence、low confidence など degradation 吸収余地が限定的な signal があるため、limited tolerance として整理します";
  }
  if (tolerance === "intolerable_degradation") {
    return "broken continuity、nonrecoverable semantics、outside integrity boundary、collapsed resilience、contradictory reasoning、severe drift、高い risk、escalated posture など semantic degradation を許容できない可能性があるため、intolerable degradation として整理します";
  }
  return "source、scope、evidence、semantic observability continuity、semantic recoverability、semantic integrity boundary、semantic resilience、semantic convergence、semantic drift、reasoning coherence、explainability、audit trail のいずれかが利用できないため、semantic degradation tolerance unavailable として整理します";
}

function createCompareGovernanceSemanticDegradationToleranceMetadata({
  governanceSemanticDegradationTolerance,
  compareHardening,
  governanceSemanticObservabilityContinuity,
  governanceSemanticRecoverability,
  governanceSemanticIntegrityBoundary,
  governanceSemanticResilience,
  governanceSemanticConvergence,
  governanceSemanticDrift,
  governanceReasoningCoherence,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
  semanticDegradationToleranceSource,
  semanticDegradationToleranceSignals,
}: {
  readonly governanceSemanticDegradationTolerance: InventoryCompareGovernanceSemanticDegradationTolerance;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceSemanticObservabilityContinuity: InventoryCompareGovernanceSemanticObservabilityContinuity;
  readonly governanceSemanticRecoverability: InventoryCompareGovernanceSemanticRecoverability;
  readonly governanceSemanticIntegrityBoundary: InventoryCompareGovernanceSemanticIntegrityBoundary;
  readonly governanceSemanticResilience: InventoryCompareGovernanceSemanticResilience;
  readonly governanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergence;
  readonly governanceSemanticDrift: InventoryCompareGovernanceSemanticDrift;
  readonly governanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherence;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
  readonly semanticDegradationToleranceSource: string;
  readonly semanticDegradationToleranceSignals: readonly string[];
}): InventoryCompareGovernanceSemanticDegradationToleranceMetadata {
  return {
    semanticDegradationToleranceId: `inventory-integrity-compare-readonly-${classification}-${governanceSemanticDegradationTolerance}`,
    governanceSemanticDegradationTolerance,
    semanticDegradationToleranceText: semanticDegradationToleranceText(
      governanceSemanticDegradationTolerance,
    ),
    semanticDegradationToleranceReason: semanticDegradationToleranceReason(
      governanceSemanticDegradationTolerance,
    ),
    semanticDegradationToleranceSource,
    semanticDegradationToleranceSignals,
    label: "read-only compare governance semantic degradation tolerance semantics",
    interpretation:
      "compare governance semantic degradation tolerance は degraded / stale / partial / fragile 状態をどこまで吸収して semantic integrity を維持できるかを示す observability metadata です。",
    noExecutionMeaning:
      "compare governance semantic degradation tolerance は tolerance engine、説明生成、監査開始、承認、現場作業、在庫変更を開始しません。",
    governanceSemanticObservabilityContinuity,
    governanceSemanticRecoverability,
    governanceSemanticIntegrityBoundary,
    governanceSemanticResilience,
    governanceSemanticConvergence,
    governanceSemanticDrift,
    governanceReasoningCoherence,
    governanceExplainability,
    governanceAuditTrail,
    governanceRetention,
    governanceDisposition,
    governancePosture,
    operationalAttention,
    operationalImpact,
    decisionReadiness,
    interpretationStability,
    compareRisk,
    compareEvidence,
    compareConfidence,
    projectionFreshness,
    truthAggregationQuality,
    severity,
    operationalPriority,
    ownerActionability,
    reviewReadiness,
    escalationReadiness,
    operatorSummary,
    operatorTimeline,
    operatorMessage,
    operatorGuidance,
    classification,
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareGovernanceSemanticDegradationToleranceMetadata は read-only semantic degradation tolerance visibility です。操作導線、tolerance engine、説明生成、監査開始、承認、在庫変更は実行しません。",
  };
}

function governanceSemanticSurvivabilityForSemantics({
  compareHardening,
  governanceSemanticDegradationTolerance,
  governanceSemanticObservabilityContinuity,
  governanceSemanticRecoverability,
  governanceSemanticIntegrityBoundary,
  governanceSemanticResilience,
  governanceSemanticConvergence,
  governanceSemanticDrift,
  governanceReasoningCoherence,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceSemanticDegradationTolerance: InventoryCompareGovernanceSemanticDegradationTolerance;
  readonly governanceSemanticObservabilityContinuity: InventoryCompareGovernanceSemanticObservabilityContinuity;
  readonly governanceSemanticRecoverability: InventoryCompareGovernanceSemanticRecoverability;
  readonly governanceSemanticIntegrityBoundary: InventoryCompareGovernanceSemanticIntegrityBoundary;
  readonly governanceSemanticResilience: InventoryCompareGovernanceSemanticResilience;
  readonly governanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergence;
  readonly governanceSemanticDrift: InventoryCompareGovernanceSemanticDrift;
  readonly governanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherence;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
}): InventoryCompareGovernanceSemanticSurvivability {
  if (
    governanceSemanticDegradationTolerance === "tolerance_unavailable" ||
    governanceSemanticObservabilityContinuity === "continuity_unavailable" ||
    governanceSemanticRecoverability === "recovery_unavailable" ||
    governanceSemanticIntegrityBoundary === "boundary_unavailable" ||
    governanceSemanticResilience === "resilience_unavailable" ||
    governanceSemanticConvergence === "convergence_unavailable" ||
    governanceSemanticDrift === "drift_unavailable" ||
    governanceReasoningCoherence === "reasoning_unavailable" ||
    governanceExplainability === "explainability_unavailable" ||
    governanceAuditTrail === "audit_unavailable" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    compareEvidence === "evidence_unavailable" ||
    compareConfidence === "confidence_blocked" ||
    projectionFreshness === "freshness_unavailable" ||
    truthAggregationQuality === "truth_quality_unavailable" ||
    interpretationStability === "stability_unavailable" ||
    classification === "unavailable_projection"
  ) {
    return "survivability_unavailable";
  }
  if (
    governanceSemanticDegradationTolerance === "intolerable_degradation" ||
    governanceSemanticObservabilityContinuity === "broken_continuity" ||
    governanceSemanticRecoverability === "nonrecoverable_semantics" ||
    governanceSemanticIntegrityBoundary === "outside_integrity_boundary" ||
    governanceSemanticResilience === "collapsed_resilience" ||
    governanceSemanticConvergence === "nonconverging_semantics" ||
    governanceSemanticDrift === "severely_drifting" ||
    governanceReasoningCoherence === "contradictory_reasoning" ||
    governanceExplainability === "not_explainable" ||
    interpretationStability === "stability_unverified" ||
    interpretationStability === "stability_fragile" ||
    truthAggregationQuality === "truth_quality_unverified" ||
    compareRisk === "risk_critical" ||
    operationalImpact === "impact_critical" ||
    governancePosture === "posture_escalated" ||
    governanceDisposition === "disposition_escalated_queue" ||
    decisionReadiness === "decision_hold_unavailable" ||
    severity === "critical" ||
    operationalPriority === "priority_p0"
  ) {
    return "nonsurvivable_semantics";
  }
  if (
    governanceSemanticDegradationTolerance === "limited_tolerance" ||
    governanceSemanticObservabilityContinuity === "interrupted_continuity" ||
    governanceSemanticRecoverability === "difficult_recovery" ||
    governanceSemanticIntegrityBoundary === "crossing_integrity_boundary" ||
    governanceSemanticResilience === "fragile_resilience" ||
    governanceSemanticConvergence === "slow_convergence" ||
    governanceSemanticDrift === "drifting_semantics" ||
    governanceReasoningCoherence === "fragile_reasoning" ||
    governanceExplainability === "weakly_explainable" ||
    governanceAuditTrail === "audit_weak" ||
    compareEvidence === "evidence_weak" ||
    compareConfidence === "confidence_low" ||
    projectionFreshness === "freshness_stale" ||
    truthAggregationQuality === "truth_quality_incomplete" ||
    interpretationStability === "stability_fluctuating" ||
    governanceRetention === "retention_review" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    classification === "stale_projection" ||
    classification === "degraded_projection"
  ) {
    return "critical_survivability";
  }
  if (
    governanceSemanticDegradationTolerance === "moderate_tolerance" ||
    governanceSemanticObservabilityContinuity === "partially_continuous" ||
    governanceSemanticRecoverability === "partially_recoverable" ||
    governanceSemanticIntegrityBoundary === "near_integrity_boundary" ||
    governanceSemanticResilience === "partially_resilient" ||
    governanceSemanticConvergence === "converging_semantics" ||
    governanceSemanticDrift === "slightly_drifting" ||
    governanceReasoningCoherence === "partially_coherent" ||
    governanceExplainability === "partially_explainable" ||
    governanceAuditTrail === "audit_partial" ||
    compareEvidence === "evidence_moderate" ||
    compareConfidence === "confidence_medium" ||
    projectionFreshness === "freshness_recent" ||
    truthAggregationQuality === "truth_quality_warning" ||
    governanceDisposition === "disposition_observe_queue" ||
    governanceRetention === "retention_observe" ||
    governancePosture === "posture_observe" ||
    operationalAttention === "attention_observe" ||
    reviewReadiness === "review_recommended" ||
    escalationReadiness === "escalation_recommended"
  ) {
    return "degraded_survivability";
  }
  if (
    governanceSemanticDegradationTolerance === "high_tolerance" &&
    governanceSemanticObservabilityContinuity === "continuous_observability" &&
    governanceSemanticRecoverability === "recoverable_semantics" &&
    governanceSemanticIntegrityBoundary === "inside_integrity_boundary" &&
    governanceSemanticResilience === "resilient_semantics" &&
    governanceSemanticConvergence === "stable_convergence" &&
    governanceSemanticDrift === "stable_semantics" &&
    governanceReasoningCoherence === "coherent_reasoning" &&
    governanceExplainability === "explainable" &&
    governanceAuditTrail === "audit_traceable" &&
    compareEvidence === "evidence_strong" &&
    compareConfidence === "confidence_high" &&
    projectionFreshness === "freshness_current" &&
    truthAggregationQuality === "truth_quality_stable" &&
    interpretationStability === "stability_stable" &&
    compareRisk === "risk_low" &&
    operationalImpact === "impact_minimal" &&
    operationalAttention === "attention_normal" &&
    governancePosture === "posture_normal" &&
    governanceDisposition === "disposition_normal" &&
    governanceRetention === "retention_transient" &&
    severity === "info" &&
    operationalPriority === "priority_p3" &&
    ownerActionability === "monitor_only" &&
    reviewReadiness === "review_optional" &&
    escalationReadiness === "escalation_optional" &&
    operatorSummary === "summary_all_clear" &&
    operatorTimeline === "timeline_monitor_difference" &&
    operatorMessage === "message_monitor_minor_difference" &&
    operatorGuidance === "guidance_monitor"
  ) {
    return "survivable_semantics";
  }
  return "critical_survivability";
}

function semanticSurvivabilityText(
  survivability: InventoryCompareGovernanceSemanticSurvivability,
): string {
  if (survivability === "survivable_semantics") {
    return "semantic survivability は維持されています";
  }
  if (survivability === "degraded_survivability") {
    return "semantic survivability は低下しています";
  }
  if (survivability === "critical_survivability") {
    return "semantic survivability が危険な可能性があります";
  }
  if (survivability === "nonsurvivable_semantics") {
    return "semantic survivability が崩壊している可能性があります";
  }
  return "source / evidence unavailable のため survivability 保留です";
}

function semanticSurvivabilityReason(
  survivability: InventoryCompareGovernanceSemanticSurvivability,
): string {
  if (survivability === "survivable_semantics") {
    return "high tolerance、continuous observability、recoverable semantics、inside integrity boundary、resilient semantics、stable convergence、coherent reasoning、explainable、traceable audit、strong evidence が揃い、重大 degradation 下でも governance semantics が生存可能に見えるため、survivable semantics として整理します";
  }
  if (survivability === "degraded_survivability") {
    return "moderate tolerance、partially continuous、partially recoverable、near integrity boundary、converging semantics、moderate evidence、observe retention など caveat を含みつつ governance semantics が部分的に生存可能に見えるため、degraded survivability として整理します";
  }
  if (survivability === "critical_survivability") {
    return "limited tolerance、interrupted continuity、difficult recovery、crossing integrity boundary、fragile resilience、stale freshness、weak evidence、low confidence など governance semantics の生存が危険な可能性がある signal があるため、critical survivability として整理します";
  }
  if (survivability === "nonsurvivable_semantics") {
    return "intolerable degradation、broken continuity、nonrecoverable semantics、outside integrity boundary、collapsed resilience、contradictory reasoning、severe drift、高い risk、escalated posture など governance semantics が生存不能に見えるため、nonsurvivable semantics として整理します";
  }
  return "source、scope、evidence、semantic degradation tolerance、semantic observability continuity、semantic recoverability、semantic integrity boundary、semantic resilience、semantic convergence、semantic drift、reasoning coherence、explainability、audit trail のいずれかが利用できないため、semantic survivability unavailable として整理します";
}

function createCompareGovernanceSemanticSurvivabilityMetadata({
  governanceSemanticSurvivability,
  compareHardening,
  governanceSemanticDegradationTolerance,
  governanceSemanticObservabilityContinuity,
  governanceSemanticRecoverability,
  governanceSemanticIntegrityBoundary,
  governanceSemanticResilience,
  governanceSemanticConvergence,
  governanceSemanticDrift,
  governanceReasoningCoherence,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
  semanticSurvivabilitySource,
  semanticSurvivabilitySignals,
}: {
  readonly governanceSemanticSurvivability: InventoryCompareGovernanceSemanticSurvivability;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceSemanticDegradationTolerance: InventoryCompareGovernanceSemanticDegradationTolerance;
  readonly governanceSemanticObservabilityContinuity: InventoryCompareGovernanceSemanticObservabilityContinuity;
  readonly governanceSemanticRecoverability: InventoryCompareGovernanceSemanticRecoverability;
  readonly governanceSemanticIntegrityBoundary: InventoryCompareGovernanceSemanticIntegrityBoundary;
  readonly governanceSemanticResilience: InventoryCompareGovernanceSemanticResilience;
  readonly governanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergence;
  readonly governanceSemanticDrift: InventoryCompareGovernanceSemanticDrift;
  readonly governanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherence;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
  readonly semanticSurvivabilitySource: string;
  readonly semanticSurvivabilitySignals: readonly string[];
}): InventoryCompareGovernanceSemanticSurvivabilityMetadata {
  return {
    semanticSurvivabilityId: `inventory-integrity-compare-readonly-${classification}-${governanceSemanticSurvivability}`,
    governanceSemanticSurvivability,
    semanticSurvivabilityText: semanticSurvivabilityText(governanceSemanticSurvivability),
    semanticSurvivabilityReason: semanticSurvivabilityReason(governanceSemanticSurvivability),
    semanticSurvivabilitySource,
    semanticSurvivabilitySignals,
    label: "read-only compare governance semantic survivability semantics",
    interpretation:
      "compare governance semantic survivability は重大 degradation / drift / contradiction / collapse 下でも governance semantics が生存可能かを示す observability metadata です。",
    noExecutionMeaning:
      "compare governance semantic survivability は survivability engine、説明生成、監査開始、承認、現場作業、在庫変更を開始しません。",
    governanceSemanticDegradationTolerance,
    governanceSemanticObservabilityContinuity,
    governanceSemanticRecoverability,
    governanceSemanticIntegrityBoundary,
    governanceSemanticResilience,
    governanceSemanticConvergence,
    governanceSemanticDrift,
    governanceReasoningCoherence,
    governanceExplainability,
    governanceAuditTrail,
    governanceRetention,
    governanceDisposition,
    governancePosture,
    operationalAttention,
    operationalImpact,
    decisionReadiness,
    interpretationStability,
    compareRisk,
    compareEvidence,
    compareConfidence,
    projectionFreshness,
    truthAggregationQuality,
    severity,
    operationalPriority,
    ownerActionability,
    reviewReadiness,
    escalationReadiness,
    operatorSummary,
    operatorTimeline,
    operatorMessage,
    operatorGuidance,
    classification,
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareGovernanceSemanticSurvivabilityMetadata は read-only semantic survivability visibility です。操作導線、survivability engine、説明生成、監査開始、承認、在庫変更は実行しません。",
  };
}

function governanceSemanticSustainabilityForSemantics({
  compareHardening,
  governanceSemanticSurvivability,
  governanceSemanticDegradationTolerance,
  governanceSemanticObservabilityContinuity,
  governanceSemanticRecoverability,
  governanceSemanticIntegrityBoundary,
  governanceSemanticResilience,
  governanceSemanticConvergence,
  governanceSemanticDrift,
  governanceReasoningCoherence,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceSemanticSurvivability: InventoryCompareGovernanceSemanticSurvivability;
  readonly governanceSemanticDegradationTolerance: InventoryCompareGovernanceSemanticDegradationTolerance;
  readonly governanceSemanticObservabilityContinuity: InventoryCompareGovernanceSemanticObservabilityContinuity;
  readonly governanceSemanticRecoverability: InventoryCompareGovernanceSemanticRecoverability;
  readonly governanceSemanticIntegrityBoundary: InventoryCompareGovernanceSemanticIntegrityBoundary;
  readonly governanceSemanticResilience: InventoryCompareGovernanceSemanticResilience;
  readonly governanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergence;
  readonly governanceSemanticDrift: InventoryCompareGovernanceSemanticDrift;
  readonly governanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherence;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
}): InventoryCompareGovernanceSemanticSustainability {
  if (
    governanceSemanticSurvivability === "survivability_unavailable" ||
    governanceSemanticDegradationTolerance === "tolerance_unavailable" ||
    governanceSemanticObservabilityContinuity === "continuity_unavailable" ||
    governanceSemanticRecoverability === "recovery_unavailable" ||
    governanceSemanticIntegrityBoundary === "boundary_unavailable" ||
    governanceSemanticResilience === "resilience_unavailable" ||
    governanceSemanticConvergence === "convergence_unavailable" ||
    governanceSemanticDrift === "drift_unavailable" ||
    governanceReasoningCoherence === "reasoning_unavailable" ||
    governanceExplainability === "explainability_unavailable" ||
    governanceAuditTrail === "audit_unavailable" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    compareEvidence === "evidence_unavailable" ||
    compareConfidence === "confidence_blocked" ||
    projectionFreshness === "freshness_unavailable" ||
    truthAggregationQuality === "truth_quality_unavailable" ||
    interpretationStability === "stability_unavailable" ||
    classification === "unavailable_projection"
  ) {
    return "sustainability_unavailable";
  }
  if (
    governanceSemanticSurvivability === "nonsurvivable_semantics" ||
    governanceSemanticDegradationTolerance === "intolerable_degradation" ||
    governanceSemanticObservabilityContinuity === "broken_continuity" ||
    governanceSemanticRecoverability === "nonrecoverable_semantics" ||
    governanceSemanticIntegrityBoundary === "outside_integrity_boundary" ||
    governanceSemanticResilience === "collapsed_resilience" ||
    governanceSemanticConvergence === "nonconverging_semantics" ||
    governanceSemanticDrift === "severely_drifting" ||
    governanceReasoningCoherence === "contradictory_reasoning" ||
    governanceExplainability === "not_explainable" ||
    interpretationStability === "stability_unverified" ||
    interpretationStability === "stability_fragile" ||
    truthAggregationQuality === "truth_quality_unverified" ||
    compareRisk === "risk_critical" ||
    operationalImpact === "impact_critical" ||
    governancePosture === "posture_escalated" ||
    governanceDisposition === "disposition_escalated_queue" ||
    decisionReadiness === "decision_hold_unavailable" ||
    severity === "critical" ||
    operationalPriority === "priority_p0"
  ) {
    return "unsustainable_semantics";
  }
  if (
    governanceSemanticSurvivability === "critical_survivability" ||
    governanceSemanticDegradationTolerance === "limited_tolerance" ||
    governanceSemanticObservabilityContinuity === "interrupted_continuity" ||
    governanceSemanticRecoverability === "difficult_recovery" ||
    governanceSemanticIntegrityBoundary === "crossing_integrity_boundary" ||
    governanceSemanticResilience === "fragile_resilience" ||
    governanceSemanticConvergence === "slow_convergence" ||
    governanceSemanticDrift === "drifting_semantics" ||
    governanceReasoningCoherence === "fragile_reasoning" ||
    governanceExplainability === "weakly_explainable" ||
    governanceAuditTrail === "audit_weak" ||
    compareEvidence === "evidence_weak" ||
    compareConfidence === "confidence_low" ||
    projectionFreshness === "freshness_stale" ||
    truthAggregationQuality === "truth_quality_incomplete" ||
    interpretationStability === "stability_fluctuating" ||
    governanceRetention === "retention_review" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    classification === "stale_projection" ||
    classification === "degraded_projection"
  ) {
    return "fragile_sustainability";
  }
  if (
    governanceSemanticSurvivability === "degraded_survivability" ||
    governanceSemanticDegradationTolerance === "moderate_tolerance" ||
    governanceSemanticObservabilityContinuity === "partially_continuous" ||
    governanceSemanticRecoverability === "partially_recoverable" ||
    governanceSemanticIntegrityBoundary === "near_integrity_boundary" ||
    governanceSemanticResilience === "partially_resilient" ||
    governanceSemanticConvergence === "converging_semantics" ||
    governanceSemanticDrift === "slightly_drifting" ||
    governanceReasoningCoherence === "partially_coherent" ||
    governanceExplainability === "partially_explainable" ||
    governanceAuditTrail === "audit_partial" ||
    compareEvidence === "evidence_moderate" ||
    compareConfidence === "confidence_medium" ||
    projectionFreshness === "freshness_recent" ||
    truthAggregationQuality === "truth_quality_warning" ||
    governanceDisposition === "disposition_observe_queue" ||
    governanceRetention === "retention_observe" ||
    governancePosture === "posture_observe" ||
    operationalAttention === "attention_observe" ||
    reviewReadiness === "review_recommended" ||
    escalationReadiness === "escalation_recommended"
  ) {
    return "conditionally_sustainable";
  }
  if (
    governanceSemanticSurvivability === "survivable_semantics" &&
    governanceSemanticDegradationTolerance === "high_tolerance" &&
    governanceSemanticObservabilityContinuity === "continuous_observability" &&
    governanceSemanticRecoverability === "recoverable_semantics" &&
    governanceSemanticIntegrityBoundary === "inside_integrity_boundary" &&
    governanceSemanticResilience === "resilient_semantics" &&
    governanceSemanticConvergence === "stable_convergence" &&
    governanceSemanticDrift === "stable_semantics" &&
    governanceReasoningCoherence === "coherent_reasoning" &&
    governanceExplainability === "explainable" &&
    governanceAuditTrail === "audit_traceable" &&
    compareEvidence === "evidence_strong" &&
    compareConfidence === "confidence_high" &&
    projectionFreshness === "freshness_current" &&
    truthAggregationQuality === "truth_quality_stable" &&
    interpretationStability === "stability_stable" &&
    compareRisk === "risk_low" &&
    operationalImpact === "impact_minimal" &&
    operationalAttention === "attention_normal" &&
    governancePosture === "posture_normal" &&
    governanceDisposition === "disposition_normal" &&
    governanceRetention === "retention_transient" &&
    severity === "info" &&
    operationalPriority === "priority_p3" &&
    ownerActionability === "monitor_only" &&
    reviewReadiness === "review_optional" &&
    escalationReadiness === "escalation_optional" &&
    operatorSummary === "summary_all_clear" &&
    operatorTimeline === "timeline_monitor_difference" &&
    operatorMessage === "message_monitor_minor_difference" &&
    operatorGuidance === "guidance_monitor"
  ) {
    return "sustainable_semantics";
  }
  return "fragile_sustainability";
}

function semanticSustainabilityText(
  sustainability: InventoryCompareGovernanceSemanticSustainability,
): string {
  if (sustainability === "sustainable_semantics") {
    return "semantic sustainability は維持されています";
  }
  if (sustainability === "conditionally_sustainable") {
    return "semantic sustainability は条件付きです";
  }
  if (sustainability === "fragile_sustainability") {
    return "semantic sustainability が脆弱な可能性があります";
  }
  if (sustainability === "unsustainable_semantics") {
    return "semantic sustainability が困難な可能性があります";
  }
  return "source / evidence unavailable のため sustainability 保留です";
}

function semanticSustainabilityReason(
  sustainability: InventoryCompareGovernanceSemanticSustainability,
): string {
  if (sustainability === "sustainable_semantics") {
    return "survivable semantics、high tolerance、continuous observability、recoverable semantics、inside integrity boundary、resilient semantics、stable convergence、coherent reasoning、traceable audit、strong evidence が揃い、長期運用下でも semantic governance が持続可能に見えるため、sustainable semantics として整理します";
  }
  if (sustainability === "conditionally_sustainable") {
    return "degraded survivability、moderate tolerance、partially continuous、partially recoverable、near integrity boundary、converging semantics、moderate evidence、observe retention など caveat を含みつつ条件付きで持続可能に見えるため、conditionally sustainable として整理します";
  }
  if (sustainability === "fragile_sustainability") {
    return "critical survivability、limited tolerance、interrupted continuity、difficult recovery、fragile resilience、stale freshness、weak evidence、low confidence など長期運用で sustainability が脆弱になる可能性がある signal があるため、fragile sustainability として整理します";
  }
  if (sustainability === "unsustainable_semantics") {
    return "nonsurvivable semantics、intolerable degradation、broken continuity、nonrecoverable semantics、outside integrity boundary、collapsed resilience、contradictory reasoning、severe drift、高い risk など長期運用で semantic governance の持続が困難に見えるため、unsustainable semantics として整理します";
  }
  return "source、scope、evidence、semantic survivability、semantic degradation tolerance、semantic observability continuity、semantic recoverability、semantic integrity boundary、semantic resilience、semantic convergence、semantic drift、reasoning coherence、explainability、audit trail のいずれかが利用できないため、semantic sustainability unavailable として整理します";
}

function createCompareGovernanceSemanticSustainabilityMetadata({
  governanceSemanticSustainability,
  compareHardening,
  governanceSemanticSurvivability,
  governanceSemanticDegradationTolerance,
  governanceSemanticObservabilityContinuity,
  governanceSemanticRecoverability,
  governanceSemanticIntegrityBoundary,
  governanceSemanticResilience,
  governanceSemanticConvergence,
  governanceSemanticDrift,
  governanceReasoningCoherence,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
  semanticSustainabilitySource,
  semanticSustainabilitySignals,
}: {
  readonly governanceSemanticSustainability: InventoryCompareGovernanceSemanticSustainability;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceSemanticSurvivability: InventoryCompareGovernanceSemanticSurvivability;
  readonly governanceSemanticDegradationTolerance: InventoryCompareGovernanceSemanticDegradationTolerance;
  readonly governanceSemanticObservabilityContinuity: InventoryCompareGovernanceSemanticObservabilityContinuity;
  readonly governanceSemanticRecoverability: InventoryCompareGovernanceSemanticRecoverability;
  readonly governanceSemanticIntegrityBoundary: InventoryCompareGovernanceSemanticIntegrityBoundary;
  readonly governanceSemanticResilience: InventoryCompareGovernanceSemanticResilience;
  readonly governanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergence;
  readonly governanceSemanticDrift: InventoryCompareGovernanceSemanticDrift;
  readonly governanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherence;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
  readonly semanticSustainabilitySource: string;
  readonly semanticSustainabilitySignals: readonly string[];
}): InventoryCompareGovernanceSemanticSustainabilityMetadata {
  return {
    semanticSustainabilityId: `inventory-integrity-compare-readonly-${classification}-${governanceSemanticSustainability}`,
    governanceSemanticSustainability,
    semanticSustainabilityText: semanticSustainabilityText(
      governanceSemanticSustainability,
    ),
    semanticSustainabilityReason: semanticSustainabilityReason(
      governanceSemanticSustainability,
    ),
    semanticSustainabilitySource,
    semanticSustainabilitySignals,
    label: "read-only compare governance semantic sustainability semantics",
    interpretation:
      "compare governance semantic sustainability は長期運用下でも semantic governance を持続可能かを示す observability metadata です。",
    noExecutionMeaning:
      "compare governance semantic sustainability は sustainability engine、説明生成、監査開始、承認、現場作業、在庫変更を開始しません。",
    governanceSemanticSurvivability,
    governanceSemanticDegradationTolerance,
    governanceSemanticObservabilityContinuity,
    governanceSemanticRecoverability,
    governanceSemanticIntegrityBoundary,
    governanceSemanticResilience,
    governanceSemanticConvergence,
    governanceSemanticDrift,
    governanceReasoningCoherence,
    governanceExplainability,
    governanceAuditTrail,
    governanceRetention,
    governanceDisposition,
    governancePosture,
    operationalAttention,
    operationalImpact,
    decisionReadiness,
    interpretationStability,
    compareRisk,
    compareEvidence,
    compareConfidence,
    projectionFreshness,
    truthAggregationQuality,
    severity,
    operationalPriority,
    ownerActionability,
    reviewReadiness,
    escalationReadiness,
    operatorSummary,
    operatorTimeline,
    operatorMessage,
    operatorGuidance,
    classification,
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareGovernanceSemanticSustainabilityMetadata は read-only semantic sustainability visibility です。操作導線、sustainability engine、説明生成、監査開始、承認、在庫変更は実行しません。",
  };
}

function governanceSemanticMaintainabilityForSemantics({
  compareHardening,
  governanceSemanticSustainability,
  governanceSemanticSurvivability,
  governanceSemanticDegradationTolerance,
  governanceSemanticObservabilityContinuity,
  governanceSemanticRecoverability,
  governanceSemanticIntegrityBoundary,
  governanceSemanticResilience,
  governanceSemanticConvergence,
  governanceSemanticDrift,
  governanceReasoningCoherence,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceSemanticSustainability: InventoryCompareGovernanceSemanticSustainability;
  readonly governanceSemanticSurvivability: InventoryCompareGovernanceSemanticSurvivability;
  readonly governanceSemanticDegradationTolerance: InventoryCompareGovernanceSemanticDegradationTolerance;
  readonly governanceSemanticObservabilityContinuity: InventoryCompareGovernanceSemanticObservabilityContinuity;
  readonly governanceSemanticRecoverability: InventoryCompareGovernanceSemanticRecoverability;
  readonly governanceSemanticIntegrityBoundary: InventoryCompareGovernanceSemanticIntegrityBoundary;
  readonly governanceSemanticResilience: InventoryCompareGovernanceSemanticResilience;
  readonly governanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergence;
  readonly governanceSemanticDrift: InventoryCompareGovernanceSemanticDrift;
  readonly governanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherence;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
}): InventoryCompareGovernanceSemanticMaintainability {
  if (
    governanceSemanticSustainability === "sustainability_unavailable" ||
    governanceSemanticSurvivability === "survivability_unavailable" ||
    governanceSemanticDegradationTolerance === "tolerance_unavailable" ||
    governanceSemanticObservabilityContinuity === "continuity_unavailable" ||
    governanceSemanticRecoverability === "recovery_unavailable" ||
    governanceSemanticIntegrityBoundary === "boundary_unavailable" ||
    governanceSemanticResilience === "resilience_unavailable" ||
    governanceSemanticConvergence === "convergence_unavailable" ||
    governanceSemanticDrift === "drift_unavailable" ||
    governanceReasoningCoherence === "reasoning_unavailable" ||
    governanceExplainability === "explainability_unavailable" ||
    governanceAuditTrail === "audit_unavailable" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    compareEvidence === "evidence_unavailable" ||
    compareConfidence === "confidence_blocked" ||
    projectionFreshness === "freshness_unavailable" ||
    truthAggregationQuality === "truth_quality_unavailable" ||
    interpretationStability === "stability_unavailable" ||
    classification === "unavailable_projection"
  ) {
    return "maintainability_unavailable";
  }
  if (
    governanceSemanticSustainability === "unsustainable_semantics" ||
    governanceSemanticSurvivability === "nonsurvivable_semantics" ||
    governanceSemanticDegradationTolerance === "intolerable_degradation" ||
    governanceSemanticObservabilityContinuity === "broken_continuity" ||
    governanceSemanticRecoverability === "nonrecoverable_semantics" ||
    governanceSemanticIntegrityBoundary === "outside_integrity_boundary" ||
    governanceSemanticResilience === "collapsed_resilience" ||
    governanceSemanticConvergence === "nonconverging_semantics" ||
    governanceSemanticDrift === "severely_drifting" ||
    governanceReasoningCoherence === "contradictory_reasoning" ||
    governanceExplainability === "not_explainable" ||
    interpretationStability === "stability_unverified" ||
    interpretationStability === "stability_fragile" ||
    truthAggregationQuality === "truth_quality_unverified" ||
    compareRisk === "risk_critical" ||
    operationalImpact === "impact_critical" ||
    governancePosture === "posture_escalated" ||
    governanceDisposition === "disposition_escalated_queue" ||
    decisionReadiness === "decision_hold_unavailable" ||
    severity === "critical" ||
    operationalPriority === "priority_p0"
  ) {
    return "unmaintainable_semantics";
  }
  if (
    governanceSemanticSustainability === "fragile_sustainability" ||
    governanceSemanticSurvivability === "critical_survivability" ||
    governanceSemanticDegradationTolerance === "limited_tolerance" ||
    governanceSemanticObservabilityContinuity === "interrupted_continuity" ||
    governanceSemanticRecoverability === "difficult_recovery" ||
    governanceSemanticIntegrityBoundary === "crossing_integrity_boundary" ||
    governanceSemanticResilience === "fragile_resilience" ||
    governanceSemanticConvergence === "slow_convergence" ||
    governanceSemanticDrift === "drifting_semantics" ||
    governanceReasoningCoherence === "fragile_reasoning" ||
    governanceExplainability === "weakly_explainable" ||
    governanceAuditTrail === "audit_weak" ||
    compareEvidence === "evidence_weak" ||
    compareConfidence === "confidence_low" ||
    projectionFreshness === "freshness_stale" ||
    truthAggregationQuality === "truth_quality_incomplete" ||
    interpretationStability === "stability_fluctuating" ||
    governanceRetention === "retention_review" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    classification === "stale_projection" ||
    classification === "degraded_projection"
  ) {
    return "fragile_maintainability";
  }
  if (
    governanceSemanticSustainability === "conditionally_sustainable" ||
    governanceSemanticSurvivability === "degraded_survivability" ||
    governanceSemanticDegradationTolerance === "moderate_tolerance" ||
    governanceSemanticObservabilityContinuity === "partially_continuous" ||
    governanceSemanticRecoverability === "partially_recoverable" ||
    governanceSemanticIntegrityBoundary === "near_integrity_boundary" ||
    governanceSemanticResilience === "partially_resilient" ||
    governanceSemanticConvergence === "converging_semantics" ||
    governanceSemanticDrift === "slightly_drifting" ||
    governanceReasoningCoherence === "partially_coherent" ||
    governanceExplainability === "partially_explainable" ||
    governanceAuditTrail === "audit_partial" ||
    compareEvidence === "evidence_moderate" ||
    compareConfidence === "confidence_medium" ||
    projectionFreshness === "freshness_recent" ||
    truthAggregationQuality === "truth_quality_warning" ||
    governanceDisposition === "disposition_observe_queue" ||
    governanceRetention === "retention_observe" ||
    governancePosture === "posture_observe" ||
    operationalAttention === "attention_observe" ||
    reviewReadiness === "review_recommended" ||
    escalationReadiness === "escalation_recommended"
  ) {
    return "conditionally_maintainable";
  }
  if (
    governanceSemanticSustainability === "sustainable_semantics" &&
    governanceSemanticSurvivability === "survivable_semantics" &&
    governanceSemanticDegradationTolerance === "high_tolerance" &&
    governanceSemanticObservabilityContinuity === "continuous_observability" &&
    governanceSemanticRecoverability === "recoverable_semantics" &&
    governanceSemanticIntegrityBoundary === "inside_integrity_boundary" &&
    governanceSemanticResilience === "resilient_semantics" &&
    governanceSemanticConvergence === "stable_convergence" &&
    governanceSemanticDrift === "stable_semantics" &&
    governanceReasoningCoherence === "coherent_reasoning" &&
    governanceExplainability === "explainable" &&
    governanceAuditTrail === "audit_traceable" &&
    compareEvidence === "evidence_strong" &&
    compareConfidence === "confidence_high" &&
    projectionFreshness === "freshness_current" &&
    truthAggregationQuality === "truth_quality_stable" &&
    interpretationStability === "stability_stable" &&
    compareRisk === "risk_low" &&
    operationalImpact === "impact_minimal" &&
    operationalAttention === "attention_normal" &&
    governancePosture === "posture_normal" &&
    governanceDisposition === "disposition_normal" &&
    governanceRetention === "retention_transient" &&
    severity === "info" &&
    operationalPriority === "priority_p3" &&
    ownerActionability === "monitor_only" &&
    reviewReadiness === "review_optional" &&
    escalationReadiness === "escalation_optional" &&
    operatorSummary === "summary_all_clear" &&
    operatorTimeline === "timeline_monitor_difference" &&
    operatorMessage === "message_monitor_minor_difference" &&
    operatorGuidance === "guidance_monitor"
  ) {
    return "maintainable_semantics";
  }
  return "fragile_maintainability";
}

function semanticMaintainabilityText(
  maintainability: InventoryCompareGovernanceSemanticMaintainability,
): string {
  if (maintainability === "maintainable_semantics") {
    return "semantic maintainability は維持されています";
  }
  if (maintainability === "conditionally_maintainable") {
    return "semantic maintainability は条件付きです";
  }
  if (maintainability === "fragile_maintainability") {
    return "semantic maintainability が脆弱な可能性があります";
  }
  if (maintainability === "unmaintainable_semantics") {
    return "semantic maintainability が困難な可能性があります";
  }
  return "source / evidence unavailable のため maintainability 保留です";
}

function semanticMaintainabilityReason(
  maintainability: InventoryCompareGovernanceSemanticMaintainability,
): string {
  if (maintainability === "maintainable_semantics") {
    return "sustainable semantics、survivable semantics、high tolerance、continuous observability、recoverable semantics、inside integrity boundary、resilient semantics、stable convergence、coherent reasoning、traceable audit、strong evidence が揃い、長期運用時にも semantic governance を維持・追跡しやすく見えるため、maintainable semantics として整理します";
  }
  if (maintainability === "conditionally_maintainable") {
    return "conditionally sustainable、degraded survivability、moderate tolerance、partially continuous、partially recoverable、near integrity boundary、converging semantics、moderate evidence、observe retention など caveat を含みつつ条件付きで維持しやすく見えるため、conditionally maintainable として整理します";
  }
  if (maintainability === "fragile_maintainability") {
    return "fragile sustainability、critical survivability、limited tolerance、interrupted continuity、difficult recovery、fragile resilience、stale freshness、weak evidence、low confidence など長期運用で maintainability が脆弱になる可能性がある signal があるため、fragile maintainability として整理します";
  }
  if (maintainability === "unmaintainable_semantics") {
    return "unsustainable semantics、nonsurvivable semantics、intolerable degradation、broken continuity、nonrecoverable semantics、outside integrity boundary、collapsed resilience、contradictory reasoning、severe drift、高い risk など semantic governance の維持が困難に見えるため、unmaintainable semantics として整理します";
  }
  return "source、scope、evidence、semantic sustainability、semantic survivability、semantic degradation tolerance、semantic observability continuity、semantic recoverability、semantic integrity boundary、semantic resilience、semantic convergence、semantic drift、reasoning coherence、explainability、audit trail のいずれかが利用できないため、semantic maintainability unavailable として整理します";
}

function createCompareGovernanceSemanticMaintainabilityMetadata({
  governanceSemanticMaintainability,
  compareHardening,
  governanceSemanticSustainability,
  governanceSemanticSurvivability,
  governanceSemanticDegradationTolerance,
  governanceSemanticObservabilityContinuity,
  governanceSemanticRecoverability,
  governanceSemanticIntegrityBoundary,
  governanceSemanticResilience,
  governanceSemanticConvergence,
  governanceSemanticDrift,
  governanceReasoningCoherence,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
  semanticMaintainabilitySource,
  semanticMaintainabilitySignals,
}: {
  readonly governanceSemanticMaintainability: InventoryCompareGovernanceSemanticMaintainability;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceSemanticSustainability: InventoryCompareGovernanceSemanticSustainability;
  readonly governanceSemanticSurvivability: InventoryCompareGovernanceSemanticSurvivability;
  readonly governanceSemanticDegradationTolerance: InventoryCompareGovernanceSemanticDegradationTolerance;
  readonly governanceSemanticObservabilityContinuity: InventoryCompareGovernanceSemanticObservabilityContinuity;
  readonly governanceSemanticRecoverability: InventoryCompareGovernanceSemanticRecoverability;
  readonly governanceSemanticIntegrityBoundary: InventoryCompareGovernanceSemanticIntegrityBoundary;
  readonly governanceSemanticResilience: InventoryCompareGovernanceSemanticResilience;
  readonly governanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergence;
  readonly governanceSemanticDrift: InventoryCompareGovernanceSemanticDrift;
  readonly governanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherence;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
  readonly semanticMaintainabilitySource: string;
  readonly semanticMaintainabilitySignals: readonly string[];
}): InventoryCompareGovernanceSemanticMaintainabilityMetadata {
  return {
    semanticMaintainabilityId: `inventory-integrity-compare-readonly-${classification}-${governanceSemanticMaintainability}`,
    governanceSemanticMaintainability,
    semanticMaintainabilityText: semanticMaintainabilityText(
      governanceSemanticMaintainability,
    ),
    semanticMaintainabilityReason: semanticMaintainabilityReason(
      governanceSemanticMaintainability,
    ),
    semanticMaintainabilitySource,
    semanticMaintainabilitySignals,
    label: "read-only compare governance semantic maintainability semantics",
    interpretation:
      "compare governance semantic maintainability は長期運用時に semantic governance を維持・追跡・改善し続けやすいかを示す observability metadata です。",
    noExecutionMeaning:
      "compare governance semantic maintainability は maintainability engine、説明生成、監査開始、承認、現場作業、在庫変更を開始しません。",
    governanceSemanticSustainability,
    governanceSemanticSurvivability,
    governanceSemanticDegradationTolerance,
    governanceSemanticObservabilityContinuity,
    governanceSemanticRecoverability,
    governanceSemanticIntegrityBoundary,
    governanceSemanticResilience,
    governanceSemanticConvergence,
    governanceSemanticDrift,
    governanceReasoningCoherence,
    governanceExplainability,
    governanceAuditTrail,
    governanceRetention,
    governanceDisposition,
    governancePosture,
    operationalAttention,
    operationalImpact,
    decisionReadiness,
    interpretationStability,
    compareRisk,
    compareEvidence,
    compareConfidence,
    projectionFreshness,
    truthAggregationQuality,
    severity,
    operationalPriority,
    ownerActionability,
    reviewReadiness,
    escalationReadiness,
    operatorSummary,
    operatorTimeline,
    operatorMessage,
    operatorGuidance,
    classification,
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareGovernanceSemanticMaintainabilityMetadata は read-only semantic maintainability visibility です。操作導線、maintainability engine、説明生成、監査開始、承認、在庫変更は実行しません。",
  };
}

function governanceSemanticEvolvabilityForSemantics({
  compareHardening,
  governanceSemanticMaintainability,
  governanceSemanticSustainability,
  governanceSemanticSurvivability,
  governanceSemanticDegradationTolerance,
  governanceSemanticObservabilityContinuity,
  governanceSemanticRecoverability,
  governanceSemanticIntegrityBoundary,
  governanceSemanticResilience,
  governanceSemanticConvergence,
  governanceSemanticDrift,
  governanceReasoningCoherence,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
}: {
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceSemanticMaintainability: InventoryCompareGovernanceSemanticMaintainability;
  readonly governanceSemanticSustainability: InventoryCompareGovernanceSemanticSustainability;
  readonly governanceSemanticSurvivability: InventoryCompareGovernanceSemanticSurvivability;
  readonly governanceSemanticDegradationTolerance: InventoryCompareGovernanceSemanticDegradationTolerance;
  readonly governanceSemanticObservabilityContinuity: InventoryCompareGovernanceSemanticObservabilityContinuity;
  readonly governanceSemanticRecoverability: InventoryCompareGovernanceSemanticRecoverability;
  readonly governanceSemanticIntegrityBoundary: InventoryCompareGovernanceSemanticIntegrityBoundary;
  readonly governanceSemanticResilience: InventoryCompareGovernanceSemanticResilience;
  readonly governanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergence;
  readonly governanceSemanticDrift: InventoryCompareGovernanceSemanticDrift;
  readonly governanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherence;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
}): InventoryCompareGovernanceSemanticEvolvability {
  if (
    governanceSemanticMaintainability === "maintainability_unavailable" ||
    governanceSemanticSustainability === "sustainability_unavailable" ||
    governanceSemanticSurvivability === "survivability_unavailable" ||
    governanceSemanticDegradationTolerance === "tolerance_unavailable" ||
    governanceSemanticObservabilityContinuity === "continuity_unavailable" ||
    governanceSemanticRecoverability === "recovery_unavailable" ||
    governanceSemanticIntegrityBoundary === "boundary_unavailable" ||
    governanceSemanticResilience === "resilience_unavailable" ||
    governanceSemanticConvergence === "convergence_unavailable" ||
    governanceSemanticDrift === "drift_unavailable" ||
    governanceReasoningCoherence === "reasoning_unavailable" ||
    governanceExplainability === "explainability_unavailable" ||
    governanceAuditTrail === "audit_unavailable" ||
    compareHardening.sourceStatus === "compare_source_unavailable" ||
    compareHardening.scopeStatus === "unavailable_scope" ||
    compareEvidence === "evidence_unavailable" ||
    compareConfidence === "confidence_blocked" ||
    projectionFreshness === "freshness_unavailable" ||
    truthAggregationQuality === "truth_quality_unavailable" ||
    interpretationStability === "stability_unavailable" ||
    classification === "unavailable_projection"
  ) {
    return "evolvability_unavailable";
  }
  if (
    governanceSemanticMaintainability === "unmaintainable_semantics" ||
    governanceSemanticSustainability === "unsustainable_semantics" ||
    governanceSemanticSurvivability === "nonsurvivable_semantics" ||
    governanceSemanticDegradationTolerance === "intolerable_degradation" ||
    governanceSemanticObservabilityContinuity === "broken_continuity" ||
    governanceSemanticRecoverability === "nonrecoverable_semantics" ||
    governanceSemanticIntegrityBoundary === "outside_integrity_boundary" ||
    governanceSemanticResilience === "collapsed_resilience" ||
    governanceSemanticConvergence === "nonconverging_semantics" ||
    governanceSemanticDrift === "severely_drifting" ||
    governanceReasoningCoherence === "contradictory_reasoning" ||
    governanceExplainability === "not_explainable" ||
    interpretationStability === "stability_unverified" ||
    interpretationStability === "stability_fragile" ||
    truthAggregationQuality === "truth_quality_unverified" ||
    compareRisk === "risk_critical" ||
    operationalImpact === "impact_critical" ||
    governancePosture === "posture_escalated" ||
    governanceDisposition === "disposition_escalated_queue" ||
    decisionReadiness === "decision_hold_unavailable" ||
    severity === "critical" ||
    operationalPriority === "priority_p0"
  ) {
    return "unevolvable_semantics";
  }
  if (
    governanceSemanticMaintainability === "fragile_maintainability" ||
    governanceSemanticSustainability === "fragile_sustainability" ||
    governanceSemanticSurvivability === "critical_survivability" ||
    governanceSemanticDegradationTolerance === "limited_tolerance" ||
    governanceSemanticObservabilityContinuity === "interrupted_continuity" ||
    governanceSemanticRecoverability === "difficult_recovery" ||
    governanceSemanticIntegrityBoundary === "crossing_integrity_boundary" ||
    governanceSemanticResilience === "fragile_resilience" ||
    governanceSemanticConvergence === "slow_convergence" ||
    governanceSemanticDrift === "drifting_semantics" ||
    governanceReasoningCoherence === "fragile_reasoning" ||
    governanceExplainability === "weakly_explainable" ||
    governanceAuditTrail === "audit_weak" ||
    compareEvidence === "evidence_weak" ||
    compareConfidence === "confidence_low" ||
    projectionFreshness === "freshness_stale" ||
    truthAggregationQuality === "truth_quality_incomplete" ||
    interpretationStability === "stability_fluctuating" ||
    governanceRetention === "retention_review" ||
    compareHardening.scopeStatus === "degraded_scope" ||
    classification === "stale_projection" ||
    classification === "degraded_projection"
  ) {
    return "fragile_evolvability";
  }
  if (
    governanceSemanticMaintainability === "conditionally_maintainable" ||
    governanceSemanticSustainability === "conditionally_sustainable" ||
    governanceSemanticSurvivability === "degraded_survivability" ||
    governanceSemanticDegradationTolerance === "moderate_tolerance" ||
    governanceSemanticObservabilityContinuity === "partially_continuous" ||
    governanceSemanticRecoverability === "partially_recoverable" ||
    governanceSemanticIntegrityBoundary === "near_integrity_boundary" ||
    governanceSemanticResilience === "partially_resilient" ||
    governanceSemanticConvergence === "converging_semantics" ||
    governanceSemanticDrift === "slightly_drifting" ||
    governanceReasoningCoherence === "partially_coherent" ||
    governanceExplainability === "partially_explainable" ||
    governanceAuditTrail === "audit_partial" ||
    compareEvidence === "evidence_moderate" ||
    compareConfidence === "confidence_medium" ||
    projectionFreshness === "freshness_recent" ||
    truthAggregationQuality === "truth_quality_warning" ||
    governanceDisposition === "disposition_observe_queue" ||
    governanceRetention === "retention_observe" ||
    governancePosture === "posture_observe" ||
    operationalAttention === "attention_observe" ||
    reviewReadiness === "review_recommended" ||
    escalationReadiness === "escalation_recommended"
  ) {
    return "conditionally_evolvable";
  }
  if (
    governanceSemanticMaintainability === "maintainable_semantics" &&
    governanceSemanticSustainability === "sustainable_semantics" &&
    governanceSemanticSurvivability === "survivable_semantics" &&
    governanceSemanticDegradationTolerance === "high_tolerance" &&
    governanceSemanticObservabilityContinuity === "continuous_observability" &&
    governanceSemanticRecoverability === "recoverable_semantics" &&
    governanceSemanticIntegrityBoundary === "inside_integrity_boundary" &&
    governanceSemanticResilience === "resilient_semantics" &&
    governanceSemanticConvergence === "stable_convergence" &&
    governanceSemanticDrift === "stable_semantics" &&
    governanceReasoningCoherence === "coherent_reasoning" &&
    governanceExplainability === "explainable" &&
    governanceAuditTrail === "audit_traceable" &&
    compareEvidence === "evidence_strong" &&
    compareConfidence === "confidence_high" &&
    projectionFreshness === "freshness_current" &&
    truthAggregationQuality === "truth_quality_stable" &&
    interpretationStability === "stability_stable" &&
    compareRisk === "risk_low" &&
    operationalImpact === "impact_minimal" &&
    operationalAttention === "attention_normal" &&
    governancePosture === "posture_normal" &&
    governanceDisposition === "disposition_normal" &&
    governanceRetention === "retention_transient" &&
    severity === "info" &&
    operationalPriority === "priority_p3" &&
    ownerActionability === "monitor_only" &&
    reviewReadiness === "review_optional" &&
    escalationReadiness === "escalation_optional" &&
    operatorSummary === "summary_all_clear" &&
    operatorTimeline === "timeline_monitor_difference" &&
    operatorMessage === "message_monitor_minor_difference" &&
    operatorGuidance === "guidance_monitor"
  ) {
    return "evolvable_semantics";
  }
  return "fragile_evolvability";
}

function semanticEvolvabilityText(
  evolvability: InventoryCompareGovernanceSemanticEvolvability,
): string {
  if (evolvability === "evolvable_semantics") {
    return "semantic evolvability は維持されています";
  }
  if (evolvability === "conditionally_evolvable") {
    return "semantic evolvability は条件付きです";
  }
  if (evolvability === "fragile_evolvability") {
    return "semantic evolvability が脆弱な可能性があります";
  }
  if (evolvability === "unevolvable_semantics") {
    return "semantic evolvability が困難な可能性があります";
  }
  return "source / evidence unavailable のため evolvability 保留です";
}

function semanticEvolvabilityReason(
  evolvability: InventoryCompareGovernanceSemanticEvolvability,
): string {
  if (evolvability === "evolvable_semantics") {
    return "maintainable semantics、sustainable semantics、survivable semantics、high tolerance、continuous observability、recoverable semantics、inside integrity boundary、resilient semantics、stable convergence、coherent reasoning、traceable audit、strong evidence が揃い、将来的な semantic governance の拡張・変更が安全に読めるため、evolvable semantics として整理します";
  }
  if (evolvability === "conditionally_evolvable") {
    return "conditionally maintainable、conditionally sustainable、degraded survivability、moderate tolerance、partially continuous、near integrity boundary、converging semantics、moderate evidence、observe retention など caveat を含みつつ条件付きで進化可能に見えるため、conditionally evolvable として整理します";
  }
  if (evolvability === "fragile_evolvability") {
    return "fragile maintainability、fragile sustainability、critical survivability、limited tolerance、interrupted continuity、difficult recovery、fragile resilience、weak evidence、low confidence など semantic governance の将来変更が脆弱になる可能性がある signal があるため、fragile evolvability として整理します";
  }
  if (evolvability === "unevolvable_semantics") {
    return "unmaintainable semantics、unsustainable semantics、nonsurvivable semantics、intolerable degradation、broken continuity、nonrecoverable semantics、outside integrity boundary、collapsed resilience、contradictory reasoning、severe drift、高い risk など semantic governance の安全な進化が困難に見えるため、unevolvable semantics として整理します";
  }
  return "source、scope、evidence、semantic maintainability、semantic sustainability、semantic survivability、semantic degradation tolerance、semantic observability continuity、semantic recoverability、semantic integrity boundary、semantic resilience、semantic convergence、semantic drift、reasoning coherence、explainability、audit trail のいずれかが利用できないため、semantic evolvability unavailable として整理します";
}

function createCompareGovernanceSemanticEvolvabilityMetadata({
  governanceSemanticEvolvability,
  compareHardening,
  governanceSemanticMaintainability,
  governanceSemanticSustainability,
  governanceSemanticSurvivability,
  governanceSemanticDegradationTolerance,
  governanceSemanticObservabilityContinuity,
  governanceSemanticRecoverability,
  governanceSemanticIntegrityBoundary,
  governanceSemanticResilience,
  governanceSemanticConvergence,
  governanceSemanticDrift,
  governanceReasoningCoherence,
  governanceExplainability,
  governanceAuditTrail,
  governanceRetention,
  governanceDisposition,
  governancePosture,
  operationalAttention,
  operationalImpact,
  decisionReadiness,
  interpretationStability,
  compareRisk,
  compareEvidence,
  compareConfidence,
  projectionFreshness,
  truthAggregationQuality,
  severity,
  operationalPriority,
  ownerActionability,
  reviewReadiness,
  escalationReadiness,
  operatorSummary,
  operatorTimeline,
  operatorMessage,
  operatorGuidance,
  classification,
  semanticEvolvabilitySource,
  semanticEvolvabilitySignals,
}: {
  readonly governanceSemanticEvolvability: InventoryCompareGovernanceSemanticEvolvability;
  readonly compareHardening: InventoryCompareHardeningMetadata;
  readonly governanceSemanticMaintainability: InventoryCompareGovernanceSemanticMaintainability;
  readonly governanceSemanticSustainability: InventoryCompareGovernanceSemanticSustainability;
  readonly governanceSemanticSurvivability: InventoryCompareGovernanceSemanticSurvivability;
  readonly governanceSemanticDegradationTolerance: InventoryCompareGovernanceSemanticDegradationTolerance;
  readonly governanceSemanticObservabilityContinuity: InventoryCompareGovernanceSemanticObservabilityContinuity;
  readonly governanceSemanticRecoverability: InventoryCompareGovernanceSemanticRecoverability;
  readonly governanceSemanticIntegrityBoundary: InventoryCompareGovernanceSemanticIntegrityBoundary;
  readonly governanceSemanticResilience: InventoryCompareGovernanceSemanticResilience;
  readonly governanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergence;
  readonly governanceSemanticDrift: InventoryCompareGovernanceSemanticDrift;
  readonly governanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherence;
  readonly governanceExplainability: InventoryCompareGovernanceExplainability;
  readonly governanceAuditTrail: InventoryCompareGovernanceAuditTrail;
  readonly governanceRetention: InventoryCompareGovernanceRetention;
  readonly governanceDisposition: InventoryCompareGovernanceDisposition;
  readonly governancePosture: InventoryCompareGovernancePosture;
  readonly operationalAttention: InventoryCompareOperationalAttention;
  readonly operationalImpact: InventoryCompareOperationalImpact;
  readonly decisionReadiness: InventoryCompareDecisionReadiness;
  readonly interpretationStability: InventoryCompareInterpretationStability;
  readonly compareRisk: InventoryCompareRisk;
  readonly compareEvidence: InventoryCompareEvidenceStrength;
  readonly compareConfidence: InventoryCompareConfidence;
  readonly projectionFreshness: InventoryCompareProjectionFreshness;
  readonly truthAggregationQuality: InventoryCompareTruthAggregationQuality;
  readonly severity: InventoryCompareSeverity;
  readonly operationalPriority: InventoryCompareOperationalPriority;
  readonly ownerActionability?: InventoryCompareOwnerActionability;
  readonly reviewReadiness: InventoryCompareReviewReadiness;
  readonly escalationReadiness: InventoryCompareEscalationReadiness;
  readonly operatorSummary?: InventoryCompareOperatorSummary;
  readonly operatorTimeline?: InventoryCompareOperatorTimeline;
  readonly operatorMessage?: InventoryCompareOperatorMessage;
  readonly operatorGuidance?: InventoryCompareOperatorGuidance;
  readonly classification: InventoryCompareMismatchClassification;
  readonly semanticEvolvabilitySource: string;
  readonly semanticEvolvabilitySignals: readonly string[];
}): InventoryCompareGovernanceSemanticEvolvabilityMetadata {
  return {
    semanticEvolvabilityId: `inventory-integrity-compare-readonly-${classification}-${governanceSemanticEvolvability}`,
    governanceSemanticEvolvability,
    semanticEvolvabilityText: semanticEvolvabilityText(
      governanceSemanticEvolvability,
    ),
    semanticEvolvabilityReason: semanticEvolvabilityReason(
      governanceSemanticEvolvability,
    ),
    semanticEvolvabilitySource,
    semanticEvolvabilitySignals,
    label: "read-only compare governance semantic evolvability semantics",
    interpretation:
      "compare governance semantic evolvability は将来的に semantic governance を安全に拡張・変更・進化可能かを示す observability metadata です。",
    noExecutionMeaning:
      "compare governance semantic evolvability は evolvability engine、説明生成、監査開始、承認、現場作業、在庫変更を開始しません。",
    governanceSemanticMaintainability,
    governanceSemanticSustainability,
    governanceSemanticSurvivability,
    governanceSemanticDegradationTolerance,
    governanceSemanticObservabilityContinuity,
    governanceSemanticRecoverability,
    governanceSemanticIntegrityBoundary,
    governanceSemanticResilience,
    governanceSemanticConvergence,
    governanceSemanticDrift,
    governanceReasoningCoherence,
    governanceExplainability,
    governanceAuditTrail,
    governanceRetention,
    governanceDisposition,
    governancePosture,
    operationalAttention,
    operationalImpact,
    decisionReadiness,
    interpretationStability,
    compareRisk,
    compareEvidence,
    compareConfidence,
    projectionFreshness,
    truthAggregationQuality,
    severity,
    operationalPriority,
    ownerActionability,
    reviewReadiness,
    escalationReadiness,
    operatorSummary,
    operatorTimeline,
    operatorMessage,
    operatorGuidance,
    classification,
    sourceStatus: compareHardening.sourceStatus,
    resultStatus: compareHardening.resultStatus,
    scopeStatus: compareHardening.scopeStatus,
    truthSource: "inventory_transactions",
    cacheCompareTarget: "inventory_current",
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "InventoryCompareGovernanceSemanticEvolvabilityMetadata は read-only semantic evolvability visibility です。操作導線、evolvability engine、説明生成、監査開始、承認、在庫変更は実行しません。",
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
  const compareOperatorGuidance = createCompareOperatorGuidanceMetadata({
    operatorGuidance: "guidance_wait_for_source",
    ownerActionability: compareOwnerActionability.ownerActionability,
    ownership: compareOwnerActionability.ownership,
    operationalPriority: compareOwnerActionability.operationalPriority,
    escalationReadiness: compareOwnerActionability.escalationReadiness,
    reviewReadiness: compareOwnerActionability.reviewReadiness,
    severity: compareOwnerActionability.severity,
    classification: compareOwnerActionability.classification,
    guidanceSource: "compare_source_unavailable",
    guidanceSignals: [
      compareOwnerActionability.ownerActionability,
      compareOwnership.ownership,
      compareClassification.classification,
      compareOperationalPriority.priority,
      compareHardening.sourceStatus,
    ],
  });
  const compareOperatorMessage = createCompareOperatorMessageMetadata({
    operatorMessage: "message_wait_for_compare_source",
    operatorGuidance: compareOperatorGuidance.operatorGuidance,
    ownerActionability: compareOperatorGuidance.ownerActionability,
    ownership: compareOperatorGuidance.ownership,
    operationalPriority: compareOperatorGuidance.operationalPriority,
    escalationReadiness: compareOperatorGuidance.escalationReadiness,
    reviewReadiness: compareOperatorGuidance.reviewReadiness,
    severity: compareOperatorGuidance.severity,
    classification: compareOperatorGuidance.classification,
    messageSource: "compare_source_unavailable",
    messageSignals: [
      compareOperatorGuidance.operatorGuidance,
      compareOwnerActionability.ownerActionability,
      compareOwnership.ownership,
      compareClassification.classification,
      compareHardening.sourceStatus,
    ],
  });
  const compareOperatorSummary = createCompareOperatorSummaryMetadata({
    operatorSummary: "summary_source_unverified",
    itemCount: 0,
    summarySource: "compare_source_unavailable",
    summarySignals: [
      compareOperatorMessage.operatorMessage,
      compareOperatorGuidance.operatorGuidance,
      compareOwnerActionability.ownerActionability,
      compareOwnership.ownership,
      compareClassification.classification,
      compareHardening.sourceStatus,
    ],
  });
  const compareOperatorTimeline = createCompareOperatorTimelineMetadata({
    operatorTimeline: "timeline_wait_for_confirmation",
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorMessage: compareOperatorMessage.operatorMessage,
    operatorGuidance: compareOperatorGuidance.operatorGuidance,
    ownerActionability: compareOwnerActionability.ownerActionability,
    ownership: compareOwnership.ownership,
    operationalPriority: compareOperationalPriority.priority,
    escalationReadiness: compareEscalationReadiness.readiness,
    reviewReadiness: compareReviewReadiness.readiness,
    severity: compareSeverity.severity,
    classification: compareClassification.classification,
    timelineSource: "compare_source_unavailable",
    timelineSignals: [
      compareOperatorSummary.operatorSummary,
      compareOperatorMessage.operatorMessage,
      compareOperatorGuidance.operatorGuidance,
      compareOwnerActionability.ownerActionability,
      compareOwnership.ownership,
      compareClassification.classification,
      compareHardening.sourceStatus,
    ],
  });
  const compareConfidence = createCompareConfidenceMetadata({
    compareConfidence: "confidence_blocked",
    compareHardening,
    classification: compareClassification.classification,
    severity: compareSeverity.severity,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    confidenceSource: "compare_source_unavailable",
    confidenceSignals: [
      compareOperatorTimeline.operatorTimeline,
      compareOperatorSummary.operatorSummary,
      compareOperatorMessage.operatorMessage,
      compareOperatorGuidance.operatorGuidance,
      compareOwnerActionability.ownerActionability,
      compareOwnership.ownership,
      compareClassification.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
  const compareProjectionFreshness = createCompareProjectionFreshnessMetadata({
    projectionFreshness: "freshness_unavailable",
    compareHardening,
    compareConfidence: compareConfidence.compareConfidence,
    classification: compareClassification.classification,
    severity: compareSeverity.severity,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    freshnessSource: "compare_source_unavailable",
    freshnessSignals: [
      compareConfidence.compareConfidence,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorSummary.operatorSummary,
      compareOperatorMessage.operatorMessage,
      compareOperatorGuidance.operatorGuidance,
      compareClassification.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
  const compareTruthAggregationQuality = createCompareTruthAggregationQualityMetadata({
    truthAggregationQuality: "truth_quality_unavailable",
    compareHardening,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    classification: compareClassification.classification,
    severity: compareSeverity.severity,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    truthQualitySource: "compare_source_unavailable",
    truthQualitySignals: [
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorSummary.operatorSummary,
      compareOperatorMessage.operatorMessage,
      compareOperatorGuidance.operatorGuidance,
      compareClassification.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
  const compareEvidence = createCompareEvidenceMetadata({
    compareEvidence: "evidence_unavailable",
    compareHardening,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    classification: compareClassification.classification,
    severity: compareSeverity.severity,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    evidenceSource: "compare_source_unavailable",
    evidenceSignals: [
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorSummary.operatorSummary,
      compareOperatorMessage.operatorMessage,
      compareOperatorGuidance.operatorGuidance,
      compareClassification.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
  const compareRisk = createCompareRiskMetadata({
    compareRisk: "risk_unassessable",
    compareHardening,
    severity: compareSeverity.severity,
    operationalPriority: compareOperationalPriority.priority,
    ownerActionability: compareOwnerActionability.ownerActionability,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    compareEvidence: compareEvidence.compareEvidence,
    classification: compareClassification.classification,
    riskSource: "compare_source_unavailable",
    riskSignals: [
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorSummary.operatorSummary,
      compareOwnerActionability.ownerActionability,
      compareOperationalPriority.priority,
      compareSeverity.severity,
      compareClassification.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
  const compareInterpretationStability =
    createCompareInterpretationStabilityMetadata({
      interpretationStability: "stability_unavailable",
      compareHardening,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      compareEvidence: compareEvidence.compareEvidence,
      compareRisk: compareRisk.compareRisk,
      classification: compareClassification.classification,
      severity: compareSeverity.severity,
      operatorSummary: compareOperatorTimeline.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      stabilitySource: "compare_source_unavailable",
      stabilitySignals: [
        compareRisk.compareRisk,
        compareEvidence.compareEvidence,
        compareTruthAggregationQuality.truthAggregationQuality,
        compareProjectionFreshness.projectionFreshness,
        compareConfidence.compareConfidence,
        compareOperatorTimeline.operatorTimeline,
        compareOperatorSummary.operatorSummary,
        compareSeverity.severity,
        compareClassification.classification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
      ],
    });
  const compareDecisionReadiness = createCompareDecisionReadinessMetadata({
    decisionReadiness: "decision_hold_unavailable",
    compareHardening,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    compareEvidence: compareEvidence.compareEvidence,
    compareRisk: compareRisk.compareRisk,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    operatorSummary: compareOperatorTimeline.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    operatorMessage: compareOperatorMessage.operatorMessage,
    ownerActionability: compareOwnerActionability.ownerActionability,
    reviewReadiness: compareReviewReadiness.readiness,
    escalationReadiness: compareEscalationReadiness.readiness,
    operationalPriority: compareOperationalPriority.priority,
    classification: compareClassification.classification,
    severity: compareSeverity.severity,
    decisionSource: "compare_source_unavailable",
    decisionSignals: [
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorMessage.operatorMessage,
      compareOperatorSummary.operatorSummary,
      compareOwnerActionability.ownerActionability,
      compareOperationalPriority.priority,
      compareEscalationReadiness.readiness,
      compareReviewReadiness.readiness,
      compareSeverity.severity,
      compareClassification.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
  const compareOperationalImpact = createCompareOperationalImpactMetadata({
    operationalImpact: "impact_unassessable",
    compareHardening,
    compareRisk: compareRisk.compareRisk,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareSeverity.severity,
    operationalPriority: compareOperationalPriority.priority,
    ownerActionability: compareOwnerActionability.ownerActionability,
    reviewReadiness: compareReviewReadiness.readiness,
    escalationReadiness: compareEscalationReadiness.readiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    classification: compareClassification.classification,
    impactSource: "compare_source_unavailable",
    impactSignals: [
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorSummary.operatorSummary,
      compareOwnerActionability.ownerActionability,
      compareOperationalPriority.priority,
      compareEscalationReadiness.readiness,
      compareReviewReadiness.readiness,
      compareSeverity.severity,
      compareClassification.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
  const compareOperationalAttention = createCompareOperationalAttentionMetadata({
    operationalAttention: "attention_unassessable",
    compareHardening,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareSeverity.severity,
    operationalPriority: compareOperationalPriority.priority,
    ownerActionability: compareOwnerActionability.ownerActionability,
    reviewReadiness: compareReviewReadiness.readiness,
    escalationReadiness: compareEscalationReadiness.readiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    classification: compareClassification.classification,
    attentionSource: "compare_source_unavailable",
    attentionSignals: [
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorSummary.operatorSummary,
      compareOwnerActionability.ownerActionability,
      compareOperationalPriority.priority,
      compareEscalationReadiness.readiness,
      compareReviewReadiness.readiness,
      compareSeverity.severity,
      compareClassification.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
  const compareGovernancePosture = createCompareGovernancePostureMetadata({
    governancePosture: "posture_unassessable",
    compareHardening,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareSeverity.severity,
    operationalPriority: compareOperationalPriority.priority,
    ownerActionability: compareOwnerActionability.ownerActionability,
    reviewReadiness: compareReviewReadiness.readiness,
    escalationReadiness: compareEscalationReadiness.readiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    classification: compareClassification.classification,
    postureSource: "compare_source_unavailable",
    postureSignals: [
      compareOperationalAttention.operationalAttention,
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorSummary.operatorSummary,
      compareOwnerActionability.ownerActionability,
      compareOperationalPriority.priority,
      compareEscalationReadiness.readiness,
      compareReviewReadiness.readiness,
      compareSeverity.severity,
      compareClassification.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
  const compareGovernanceDisposition = createCompareGovernanceDispositionMetadata({
    governanceDisposition: "disposition_hold",
    compareHardening,
    governancePosture: compareGovernancePosture.governancePosture,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareSeverity.severity,
    operationalPriority: compareOperationalPriority.priority,
    ownerActionability: compareOwnerActionability.ownerActionability,
    reviewReadiness: compareReviewReadiness.readiness,
    escalationReadiness: compareEscalationReadiness.readiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    classification: compareClassification.classification,
    dispositionSource: "compare_source_unavailable",
    dispositionSignals: [
      compareGovernancePosture.governancePosture,
      compareOperationalAttention.operationalAttention,
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorSummary.operatorSummary,
      compareOwnerActionability.ownerActionability,
      compareOperationalPriority.priority,
      compareEscalationReadiness.readiness,
      compareReviewReadiness.readiness,
      compareSeverity.severity,
      compareClassification.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
  const compareGovernanceRetention = createCompareGovernanceRetentionMetadata({
    governanceRetention: "retention_hold",
    compareHardening,
    governanceDisposition: compareGovernanceDisposition.governanceDisposition,
    governancePosture: compareGovernancePosture.governancePosture,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareSeverity.severity,
    operationalPriority: compareOperationalPriority.priority,
    ownerActionability: compareOwnerActionability.ownerActionability,
    reviewReadiness: compareReviewReadiness.readiness,
    escalationReadiness: compareEscalationReadiness.readiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    classification: compareClassification.classification,
    retentionSource: "compare_source_unavailable",
    retentionSignals: [
      compareGovernanceDisposition.governanceDisposition,
      compareGovernancePosture.governancePosture,
      compareOperationalAttention.operationalAttention,
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorSummary.operatorSummary,
      compareOwnerActionability.ownerActionability,
      compareOperationalPriority.priority,
      compareEscalationReadiness.readiness,
      compareReviewReadiness.readiness,
      compareSeverity.severity,
      compareClassification.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
  const compareGovernanceAuditTrail = createCompareGovernanceAuditTrailMetadata({
    governanceAuditTrail: "audit_unavailable",
    compareHardening,
    governanceRetention: compareGovernanceRetention.governanceRetention,
    governanceDisposition: compareGovernanceDisposition.governanceDisposition,
    governancePosture: compareGovernancePosture.governancePosture,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareSeverity.severity,
    operationalPriority: compareOperationalPriority.priority,
    ownerActionability: compareOwnerActionability.ownerActionability,
    reviewReadiness: compareReviewReadiness.readiness,
    escalationReadiness: compareEscalationReadiness.readiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    classification: compareClassification.classification,
    auditTrailSource: "compare_source_unavailable",
    auditTrailSignals: [
      compareGovernanceRetention.governanceRetention,
      compareGovernanceDisposition.governanceDisposition,
      compareGovernancePosture.governancePosture,
      compareOperationalAttention.operationalAttention,
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorSummary.operatorSummary,
      compareOwnerActionability.ownerActionability,
      compareOperationalPriority.priority,
      compareEscalationReadiness.readiness,
      compareReviewReadiness.readiness,
      compareSeverity.severity,
      compareClassification.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      "truth_source_inventory_transactions",
      "cache_compare_target_inventory_current",
      "read_only_boundary",
    ],
  });
  const compareGovernanceExplainability =
    createCompareGovernanceExplainabilityMetadata({
      governanceExplainability: "explainability_unavailable",
      compareHardening,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: compareClassification.classification,
      explainabilitySource: "compare_source_unavailable",
      explainabilitySignals: [
        compareGovernanceAuditTrail.governanceAuditTrail,
        compareGovernanceRetention.governanceRetention,
        compareGovernanceDisposition.governanceDisposition,
        compareGovernancePosture.governancePosture,
        compareOperationalAttention.operationalAttention,
        compareOperationalImpact.operationalImpact,
        compareDecisionReadiness.decisionReadiness,
        compareInterpretationStability.interpretationStability,
        compareRisk.compareRisk,
        compareEvidence.compareEvidence,
        compareTruthAggregationQuality.truthAggregationQuality,
        compareProjectionFreshness.projectionFreshness,
        compareConfidence.compareConfidence,
        compareOperatorTimeline.operatorTimeline,
        compareOperatorMessage.operatorMessage,
        compareOperatorGuidance.operatorGuidance,
        compareOperatorSummary.operatorSummary,
        compareOwnerActionability.ownerActionability,
        compareOperationalPriority.priority,
        compareEscalationReadiness.readiness,
        compareReviewReadiness.readiness,
        compareSeverity.severity,
        compareClassification.classification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
        "truth_source_inventory_transactions",
        "cache_compare_target_inventory_current",
        "read_only_boundary",
      ],
    });
  const compareGovernanceReasoningCoherence =
    createCompareGovernanceReasoningCoherenceMetadata({
      governanceReasoningCoherence: "reasoning_unavailable",
      compareHardening,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: compareClassification.classification,
      reasoningCoherenceSource: "compare_source_unavailable",
      reasoningCoherenceSignals: [
        compareGovernanceExplainability.governanceExplainability,
        compareGovernanceAuditTrail.governanceAuditTrail,
        compareGovernanceRetention.governanceRetention,
        compareGovernanceDisposition.governanceDisposition,
        compareGovernancePosture.governancePosture,
        compareOperationalAttention.operationalAttention,
        compareOperationalImpact.operationalImpact,
        compareDecisionReadiness.decisionReadiness,
        compareInterpretationStability.interpretationStability,
        compareRisk.compareRisk,
        compareEvidence.compareEvidence,
        compareTruthAggregationQuality.truthAggregationQuality,
        compareProjectionFreshness.projectionFreshness,
        compareConfidence.compareConfidence,
        compareOperatorTimeline.operatorTimeline,
        compareOperatorMessage.operatorMessage,
        compareOperatorGuidance.operatorGuidance,
        compareOperatorSummary.operatorSummary,
        compareOwnerActionability.ownerActionability,
        compareOperationalPriority.priority,
        compareEscalationReadiness.readiness,
        compareReviewReadiness.readiness,
        compareSeverity.severity,
        compareClassification.classification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
        "truth_source_inventory_transactions",
        "cache_compare_target_inventory_current",
        "read_only_boundary",
      ],
    });
  const compareGovernanceSemanticDrift =
    createCompareGovernanceSemanticDriftMetadata({
      governanceSemanticDrift: "drift_unavailable",
      compareHardening,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: compareClassification.classification,
      semanticDriftSource: "compare_source_unavailable",
      semanticDriftSignals: [
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        compareGovernanceExplainability.governanceExplainability,
        compareGovernanceAuditTrail.governanceAuditTrail,
        compareGovernanceRetention.governanceRetention,
        compareGovernanceDisposition.governanceDisposition,
        compareGovernancePosture.governancePosture,
        compareOperationalAttention.operationalAttention,
        compareOperationalImpact.operationalImpact,
        compareDecisionReadiness.decisionReadiness,
        compareInterpretationStability.interpretationStability,
        compareRisk.compareRisk,
        compareEvidence.compareEvidence,
        compareTruthAggregationQuality.truthAggregationQuality,
        compareProjectionFreshness.projectionFreshness,
        compareConfidence.compareConfidence,
        compareOperatorTimeline.operatorTimeline,
        compareOperatorMessage.operatorMessage,
        compareOperatorGuidance.operatorGuidance,
        compareOperatorSummary.operatorSummary,
        compareOwnerActionability.ownerActionability,
        compareOperationalPriority.priority,
        compareEscalationReadiness.readiness,
        compareReviewReadiness.readiness,
        compareSeverity.severity,
        compareClassification.classification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
        "truth_source_inventory_transactions",
        "cache_compare_target_inventory_current",
        "read_only_boundary",
      ],
    });
  const compareGovernanceSemanticConvergence =
    createCompareGovernanceSemanticConvergenceMetadata({
      governanceSemanticConvergence: "convergence_unavailable",
      compareHardening,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: compareClassification.classification,
      semanticConvergenceSource: "compare_source_unavailable",
      semanticConvergenceSignals: [
        compareGovernanceSemanticDrift.governanceSemanticDrift,
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        compareGovernanceExplainability.governanceExplainability,
        compareGovernanceAuditTrail.governanceAuditTrail,
        compareGovernanceRetention.governanceRetention,
        compareGovernanceDisposition.governanceDisposition,
        compareGovernancePosture.governancePosture,
        compareOperationalAttention.operationalAttention,
        compareOperationalImpact.operationalImpact,
        compareDecisionReadiness.decisionReadiness,
        compareInterpretationStability.interpretationStability,
        compareRisk.compareRisk,
        compareEvidence.compareEvidence,
        compareTruthAggregationQuality.truthAggregationQuality,
        compareProjectionFreshness.projectionFreshness,
        compareConfidence.compareConfidence,
        compareOperatorTimeline.operatorTimeline,
        compareOperatorMessage.operatorMessage,
        compareOperatorGuidance.operatorGuidance,
        compareOperatorSummary.operatorSummary,
        compareOwnerActionability.ownerActionability,
        compareOperationalPriority.priority,
        compareEscalationReadiness.readiness,
        compareReviewReadiness.readiness,
        compareSeverity.severity,
        compareClassification.classification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
        "truth_source_inventory_transactions",
        "cache_compare_target_inventory_current",
        "read_only_boundary",
      ],
    });
  const compareGovernanceSemanticResilience =
    createCompareGovernanceSemanticResilienceMetadata({
      governanceSemanticResilience: "resilience_unavailable",
      compareHardening,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: compareClassification.classification,
      semanticResilienceSource: "compare_source_unavailable",
      semanticResilienceSignals: [
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
        compareGovernanceSemanticDrift.governanceSemanticDrift,
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        compareGovernanceExplainability.governanceExplainability,
        compareGovernanceAuditTrail.governanceAuditTrail,
        compareGovernanceRetention.governanceRetention,
        compareGovernanceDisposition.governanceDisposition,
        compareGovernancePosture.governancePosture,
        compareOperationalAttention.operationalAttention,
        compareOperationalImpact.operationalImpact,
        compareDecisionReadiness.decisionReadiness,
        compareInterpretationStability.interpretationStability,
        compareRisk.compareRisk,
        compareEvidence.compareEvidence,
        compareTruthAggregationQuality.truthAggregationQuality,
        compareProjectionFreshness.projectionFreshness,
        compareConfidence.compareConfidence,
        compareOperatorTimeline.operatorTimeline,
        compareOperatorMessage.operatorMessage,
        compareOperatorGuidance.operatorGuidance,
        compareOperatorSummary.operatorSummary,
        compareOwnerActionability.ownerActionability,
        compareOperationalPriority.priority,
        compareEscalationReadiness.readiness,
        compareReviewReadiness.readiness,
        compareSeverity.severity,
        compareClassification.classification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
        "truth_source_inventory_transactions",
        "cache_compare_target_inventory_current",
        "read_only_boundary",
      ],
    });
  const compareGovernanceSemanticIntegrityBoundary =
    createCompareGovernanceSemanticIntegrityBoundaryMetadata({
      governanceSemanticIntegrityBoundary: "boundary_unavailable",
      compareHardening,
      governanceSemanticResilience:
        compareGovernanceSemanticResilience.governanceSemanticResilience,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: compareClassification.classification,
      semanticIntegrityBoundarySource: "compare_source_unavailable",
      semanticIntegrityBoundarySignals: [
        compareGovernanceSemanticResilience.governanceSemanticResilience,
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
        compareGovernanceSemanticDrift.governanceSemanticDrift,
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        compareGovernanceExplainability.governanceExplainability,
        compareGovernanceAuditTrail.governanceAuditTrail,
        compareGovernanceRetention.governanceRetention,
        compareGovernanceDisposition.governanceDisposition,
        compareGovernancePosture.governancePosture,
        compareOperationalAttention.operationalAttention,
        compareOperationalImpact.operationalImpact,
        compareDecisionReadiness.decisionReadiness,
        compareInterpretationStability.interpretationStability,
        compareRisk.compareRisk,
        compareEvidence.compareEvidence,
        compareTruthAggregationQuality.truthAggregationQuality,
        compareProjectionFreshness.projectionFreshness,
        compareConfidence.compareConfidence,
        compareOperatorTimeline.operatorTimeline,
        compareOperatorMessage.operatorMessage,
        compareOperatorGuidance.operatorGuidance,
        compareOperatorSummary.operatorSummary,
        compareOwnerActionability.ownerActionability,
        compareOperationalPriority.priority,
        compareEscalationReadiness.readiness,
        compareReviewReadiness.readiness,
        compareSeverity.severity,
        compareClassification.classification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
        "truth_source_inventory_transactions",
        "cache_compare_target_inventory_current",
        "read_only_boundary",
      ],
    });
  const compareGovernanceSemanticRecoverability =
    createCompareGovernanceSemanticRecoverabilityMetadata({
      governanceSemanticRecoverability: "recovery_unavailable",
      compareHardening,
      governanceSemanticIntegrityBoundary:
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
      governanceSemanticResilience:
        compareGovernanceSemanticResilience.governanceSemanticResilience,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: compareClassification.classification,
      semanticRecoverabilitySource: "compare_source_unavailable",
      semanticRecoverabilitySignals: [
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
        compareGovernanceSemanticResilience.governanceSemanticResilience,
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
        compareGovernanceSemanticDrift.governanceSemanticDrift,
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        compareGovernanceExplainability.governanceExplainability,
        compareGovernanceAuditTrail.governanceAuditTrail,
        compareGovernanceRetention.governanceRetention,
        compareGovernanceDisposition.governanceDisposition,
        compareGovernancePosture.governancePosture,
        compareOperationalAttention.operationalAttention,
        compareOperationalImpact.operationalImpact,
        compareDecisionReadiness.decisionReadiness,
        compareInterpretationStability.interpretationStability,
        compareRisk.compareRisk,
        compareEvidence.compareEvidence,
        compareTruthAggregationQuality.truthAggregationQuality,
        compareProjectionFreshness.projectionFreshness,
        compareConfidence.compareConfidence,
        compareOperatorTimeline.operatorTimeline,
        compareOperatorMessage.operatorMessage,
        compareOperatorGuidance.operatorGuidance,
        compareOperatorSummary.operatorSummary,
        compareOwnerActionability.ownerActionability,
        compareOperationalPriority.priority,
        compareEscalationReadiness.readiness,
        compareReviewReadiness.readiness,
        compareSeverity.severity,
        compareClassification.classification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
        "truth_source_inventory_transactions",
        "cache_compare_target_inventory_current",
        "read_only_boundary",
      ],
    });
  const compareGovernanceSemanticObservabilityContinuity =
    createCompareGovernanceSemanticObservabilityContinuityMetadata({
      governanceSemanticObservabilityContinuity: "continuity_unavailable",
      compareHardening,
      governanceSemanticRecoverability:
        compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
      governanceSemanticIntegrityBoundary:
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
      governanceSemanticResilience:
        compareGovernanceSemanticResilience.governanceSemanticResilience,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: compareClassification.classification,
      semanticObservabilityContinuitySource: "compare_source_unavailable",
      semanticObservabilityContinuitySignals: [
        compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
        compareGovernanceSemanticResilience.governanceSemanticResilience,
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
        compareGovernanceSemanticDrift.governanceSemanticDrift,
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        compareGovernanceExplainability.governanceExplainability,
        compareGovernanceAuditTrail.governanceAuditTrail,
        compareGovernanceRetention.governanceRetention,
        compareGovernanceDisposition.governanceDisposition,
        compareGovernancePosture.governancePosture,
        compareOperationalAttention.operationalAttention,
        compareOperationalImpact.operationalImpact,
        compareDecisionReadiness.decisionReadiness,
        compareInterpretationStability.interpretationStability,
        compareRisk.compareRisk,
        compareEvidence.compareEvidence,
        compareTruthAggregationQuality.truthAggregationQuality,
        compareProjectionFreshness.projectionFreshness,
        compareConfidence.compareConfidence,
        compareOperatorTimeline.operatorTimeline,
        compareOperatorMessage.operatorMessage,
        compareOperatorGuidance.operatorGuidance,
        compareOperatorSummary.operatorSummary,
        compareOwnerActionability.ownerActionability,
        compareOperationalPriority.priority,
        compareEscalationReadiness.readiness,
        compareReviewReadiness.readiness,
        compareSeverity.severity,
        compareClassification.classification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
        "truth_source_inventory_transactions",
        "cache_compare_target_inventory_current",
        "read_only_boundary",
      ],
    });
  const compareGovernanceSemanticDegradationTolerance =
    createCompareGovernanceSemanticDegradationToleranceMetadata({
      governanceSemanticDegradationTolerance: "tolerance_unavailable",
      compareHardening,
      governanceSemanticObservabilityContinuity:
        compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
      governanceSemanticRecoverability:
        compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
      governanceSemanticIntegrityBoundary:
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
      governanceSemanticResilience:
        compareGovernanceSemanticResilience.governanceSemanticResilience,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: compareClassification.classification,
      semanticDegradationToleranceSource: "compare_source_unavailable",
      semanticDegradationToleranceSignals: [
        compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
        compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
        compareGovernanceSemanticResilience.governanceSemanticResilience,
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
        compareGovernanceSemanticDrift.governanceSemanticDrift,
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        compareGovernanceExplainability.governanceExplainability,
        compareGovernanceAuditTrail.governanceAuditTrail,
        compareGovernanceRetention.governanceRetention,
        compareGovernanceDisposition.governanceDisposition,
        compareGovernancePosture.governancePosture,
        compareOperationalAttention.operationalAttention,
        compareOperationalImpact.operationalImpact,
        compareDecisionReadiness.decisionReadiness,
        compareInterpretationStability.interpretationStability,
        compareRisk.compareRisk,
        compareEvidence.compareEvidence,
        compareTruthAggregationQuality.truthAggregationQuality,
        compareProjectionFreshness.projectionFreshness,
        compareConfidence.compareConfidence,
        compareOperatorTimeline.operatorTimeline,
        compareOperatorMessage.operatorMessage,
        compareOperatorGuidance.operatorGuidance,
        compareOperatorSummary.operatorSummary,
        compareOwnerActionability.ownerActionability,
        compareOperationalPriority.priority,
        compareEscalationReadiness.readiness,
        compareReviewReadiness.readiness,
        compareSeverity.severity,
        compareClassification.classification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
        "truth_source_inventory_transactions",
        "cache_compare_target_inventory_current",
        "read_only_boundary",
      ],
    });
  const compareGovernanceSemanticSurvivability =
    createCompareGovernanceSemanticSurvivabilityMetadata({
      governanceSemanticSurvivability: "survivability_unavailable",
      compareHardening,
      governanceSemanticDegradationTolerance:
        compareGovernanceSemanticDegradationTolerance.governanceSemanticDegradationTolerance,
      governanceSemanticObservabilityContinuity:
        compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
      governanceSemanticRecoverability:
        compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
      governanceSemanticIntegrityBoundary:
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
      governanceSemanticResilience:
        compareGovernanceSemanticResilience.governanceSemanticResilience,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: compareClassification.classification,
      semanticSurvivabilitySource: "compare_source_unavailable",
      semanticSurvivabilitySignals: [
        compareGovernanceSemanticDegradationTolerance.governanceSemanticDegradationTolerance,
        compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
        compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
        compareGovernanceSemanticResilience.governanceSemanticResilience,
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
        compareGovernanceSemanticDrift.governanceSemanticDrift,
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        compareGovernanceExplainability.governanceExplainability,
        compareGovernanceAuditTrail.governanceAuditTrail,
        compareGovernanceRetention.governanceRetention,
        compareGovernanceDisposition.governanceDisposition,
        compareGovernancePosture.governancePosture,
        compareOperationalAttention.operationalAttention,
        compareOperationalImpact.operationalImpact,
        compareDecisionReadiness.decisionReadiness,
        compareInterpretationStability.interpretationStability,
        compareRisk.compareRisk,
        compareEvidence.compareEvidence,
        compareTruthAggregationQuality.truthAggregationQuality,
        compareProjectionFreshness.projectionFreshness,
        compareConfidence.compareConfidence,
        compareOperatorTimeline.operatorTimeline,
        compareOperatorMessage.operatorMessage,
        compareOperatorGuidance.operatorGuidance,
        compareOperatorSummary.operatorSummary,
        compareOwnerActionability.ownerActionability,
        compareOperationalPriority.priority,
        compareEscalationReadiness.readiness,
        compareReviewReadiness.readiness,
        compareSeverity.severity,
        compareClassification.classification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
        "truth_source_inventory_transactions",
        "cache_compare_target_inventory_current",
        "read_only_boundary",
      ],
    });
  const compareGovernanceSemanticSustainability =
    createCompareGovernanceSemanticSustainabilityMetadata({
      governanceSemanticSustainability: "sustainability_unavailable",
      compareHardening,
      governanceSemanticSurvivability:
        compareGovernanceSemanticSurvivability.governanceSemanticSurvivability,
      governanceSemanticDegradationTolerance:
        compareGovernanceSemanticDegradationTolerance.governanceSemanticDegradationTolerance,
      governanceSemanticObservabilityContinuity:
        compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
      governanceSemanticRecoverability:
        compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
      governanceSemanticIntegrityBoundary:
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
      governanceSemanticResilience:
        compareGovernanceSemanticResilience.governanceSemanticResilience,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: compareClassification.classification,
      semanticSustainabilitySource: "compare_source_unavailable",
      semanticSustainabilitySignals: [
        compareGovernanceSemanticSurvivability.governanceSemanticSurvivability,
        ...compareGovernanceSemanticSurvivability.semanticSurvivabilitySignals,
        "semantic_survivability_metadata",
      ],
    });
  const compareGovernanceSemanticMaintainability =
    createCompareGovernanceSemanticMaintainabilityMetadata({
      governanceSemanticMaintainability: "maintainability_unavailable",
      compareHardening,
      governanceSemanticSustainability:
        compareGovernanceSemanticSustainability.governanceSemanticSustainability,
      governanceSemanticSurvivability:
        compareGovernanceSemanticSurvivability.governanceSemanticSurvivability,
      governanceSemanticDegradationTolerance:
        compareGovernanceSemanticDegradationTolerance.governanceSemanticDegradationTolerance,
      governanceSemanticObservabilityContinuity:
        compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
      governanceSemanticRecoverability:
        compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
      governanceSemanticIntegrityBoundary:
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
      governanceSemanticResilience:
        compareGovernanceSemanticResilience.governanceSemanticResilience,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: compareClassification.classification,
      semanticMaintainabilitySource: "compare_source_unavailable",
      semanticMaintainabilitySignals: [
        compareGovernanceSemanticSustainability.governanceSemanticSustainability,
        ...compareGovernanceSemanticSustainability.semanticSustainabilitySignals,
        "semantic_sustainability_metadata",
      ],
    });
  const compareGovernanceSemanticEvolvability =
    createCompareGovernanceSemanticEvolvabilityMetadata({
      governanceSemanticEvolvability: "evolvability_unavailable",
      compareHardening,
      governanceSemanticMaintainability:
        compareGovernanceSemanticMaintainability.governanceSemanticMaintainability,
      governanceSemanticSustainability:
        compareGovernanceSemanticSustainability.governanceSemanticSustainability,
      governanceSemanticSurvivability:
        compareGovernanceSemanticSurvivability.governanceSemanticSurvivability,
      governanceSemanticDegradationTolerance:
        compareGovernanceSemanticDegradationTolerance.governanceSemanticDegradationTolerance,
      governanceSemanticObservabilityContinuity:
        compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
      governanceSemanticRecoverability:
        compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
      governanceSemanticIntegrityBoundary:
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
      governanceSemanticResilience:
        compareGovernanceSemanticResilience.governanceSemanticResilience,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: compareClassification.classification,
      semanticEvolvabilitySource: "compare_source_unavailable",
      semanticEvolvabilitySignals: [
        compareGovernanceSemanticMaintainability.governanceSemanticMaintainability,
        ...compareGovernanceSemanticMaintainability.semanticMaintainabilitySignals,
        "semantic_maintainability_metadata",
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
      compareOperatorGuidance,
      compareOperatorMessage,
      compareOperatorSummary,
      compareOperatorTimeline,
      compareConfidence,
      compareProjectionFreshness,
      compareTruthAggregationQuality,
      compareEvidence,
      compareRisk,
      compareInterpretationStability,
      compareDecisionReadiness,
      compareOperationalImpact,
      compareOperationalAttention,
      compareGovernancePosture,
      compareGovernanceDisposition,
      compareGovernanceRetention,
      compareGovernanceAuditTrail,
      compareGovernanceExplainability,
      compareGovernanceReasoningCoherence,
      compareGovernanceSemanticDrift,
      compareGovernanceSemanticConvergence,
      compareGovernanceSemanticResilience,
      compareGovernanceSemanticIntegrityBoundary,
      compareGovernanceSemanticRecoverability,
      compareGovernanceSemanticObservabilityContinuity,
      compareGovernanceSemanticDegradationTolerance,
      compareGovernanceSemanticSurvivability,
      compareGovernanceSemanticSustainability,
      compareGovernanceSemanticMaintainability,
      compareGovernanceSemanticEvolvability,
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
  const compareOperatorGuidance = createCompareOperatorGuidanceMetadata({
    operatorGuidance: guidanceForActionability({
      compareHardening,
      ownerActionability: compareOwnerActionability.ownerActionability,
      ownership: compareOwnerActionability.ownership,
      operationalPriority: compareOwnerActionability.operationalPriority,
      escalationReadiness: compareOwnerActionability.escalationReadiness,
      severity: compareOwnerActionability.severity,
      classification: compareOwnerActionability.classification,
    }),
    ownerActionability: compareOwnerActionability.ownerActionability,
    ownership: compareOwnerActionability.ownership,
    operationalPriority: compareOwnerActionability.operationalPriority,
    escalationReadiness: compareOwnerActionability.escalationReadiness,
    reviewReadiness: compareOwnerActionability.reviewReadiness,
    severity: compareOwnerActionability.severity,
    classification: compareOwnerActionability.classification,
    guidanceSource: "compare_owner_actionability_semantics_chain",
    guidanceSignals: [
      compareOwnerActionability.ownerActionability,
      compareOwnership.ownership,
      compareOperationalPriority.priority,
      compareEscalationReadiness.readiness,
      compareReviewReadiness.readiness,
      compareSeverity.severity,
      mismatchClassification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
  const compareOperatorMessage = createCompareOperatorMessageMetadata({
    operatorMessage: messageForGuidance({
      compareHardening,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      ownerActionability: compareOperatorGuidance.ownerActionability,
      ownership: compareOperatorGuidance.ownership,
      operationalPriority: compareOperatorGuidance.operationalPriority,
      severity: compareOperatorGuidance.severity,
      classification: compareOperatorGuidance.classification,
    }),
    operatorGuidance: compareOperatorGuidance.operatorGuidance,
    ownerActionability: compareOperatorGuidance.ownerActionability,
    ownership: compareOperatorGuidance.ownership,
    operationalPriority: compareOperatorGuidance.operationalPriority,
    escalationReadiness: compareOperatorGuidance.escalationReadiness,
    reviewReadiness: compareOperatorGuidance.reviewReadiness,
    severity: compareOperatorGuidance.severity,
    classification: compareOperatorGuidance.classification,
    messageSource: "compare_operator_guidance_semantics_chain",
    messageSignals: [
      compareOperatorGuidance.operatorGuidance,
      compareOwnerActionability.ownerActionability,
      compareOwnership.ownership,
      compareOperationalPriority.priority,
      compareEscalationReadiness.readiness,
      compareReviewReadiness.readiness,
      compareSeverity.severity,
      mismatchClassification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
  const compareOperatorTimeline = createCompareOperatorTimelineMetadata({
    operatorTimeline: timelineForSemantics({
      compareHardening,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      ownerActionability: compareOwnerActionability.ownerActionability,
      ownership: compareOwnership.ownership,
      operationalPriority: compareOperationalPriority.priority,
      severity: compareSeverity.severity,
      classification: mismatchClassification,
    }),
    operatorMessage: compareOperatorMessage.operatorMessage,
    operatorGuidance: compareOperatorGuidance.operatorGuidance,
    ownerActionability: compareOwnerActionability.ownerActionability,
    ownership: compareOwnership.ownership,
    operationalPriority: compareOperationalPriority.priority,
    escalationReadiness: compareEscalationReadiness.readiness,
    reviewReadiness: compareReviewReadiness.readiness,
    severity: compareSeverity.severity,
    classification: mismatchClassification,
    timelineSource: "compare_operator_message_semantics_chain",
    timelineSignals: [
      compareOperatorMessage.operatorMessage,
      compareOperatorGuidance.operatorGuidance,
      compareOwnerActionability.ownerActionability,
      compareOwnership.ownership,
      compareOperationalPriority.priority,
      compareEscalationReadiness.readiness,
      compareReviewReadiness.readiness,
      compareSeverity.severity,
      mismatchClassification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
  const compareConfidence = createCompareConfidenceMetadata({
    compareConfidence: confidenceForSemantics({
      compareHardening,
      classification: mismatchClassification,
      severity: compareSeverity.severity,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      compareStatus,
    }),
    compareHardening,
    classification: mismatchClassification,
    severity: compareSeverity.severity,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    confidenceSource: "compare_operator_timeline_semantics_chain",
    confidenceSignals: [
      compareOperatorTimeline.operatorTimeline,
      compareOperatorMessage.operatorMessage,
      compareOperatorGuidance.operatorGuidance,
      compareOwnerActionability.ownerActionability,
      compareOwnership.ownership,
      compareOperationalPriority.priority,
      compareEscalationReadiness.readiness,
      compareReviewReadiness.readiness,
      compareSeverity.severity,
      mismatchClassification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      compareStatus,
    ],
  });
  const compareProjectionFreshness = createCompareProjectionFreshnessMetadata({
    projectionFreshness: projectionFreshnessForSemantics({
      compareHardening,
      compareConfidence: compareConfidence.compareConfidence,
      classification: mismatchClassification,
      severity: compareSeverity.severity,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      compareStatus,
    }),
    compareHardening,
    compareConfidence: compareConfidence.compareConfidence,
    classification: mismatchClassification,
    severity: compareSeverity.severity,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    freshnessSource: "compare_confidence_semantics_chain",
    freshnessSignals: [
      compareConfidence.compareConfidence,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorMessage.operatorMessage,
      compareOperatorGuidance.operatorGuidance,
      compareOwnerActionability.ownerActionability,
      compareOwnership.ownership,
      compareOperationalPriority.priority,
      compareEscalationReadiness.readiness,
      compareReviewReadiness.readiness,
      compareSeverity.severity,
      mismatchClassification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      compareStatus,
    ],
  });
  const compareTruthAggregationQuality = createCompareTruthAggregationQualityMetadata({
    truthAggregationQuality: truthAggregationQualityForSemantics({
      compareHardening,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      classification: mismatchClassification,
      severity: compareSeverity.severity,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      compareStatus,
    }),
    compareHardening,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    classification: mismatchClassification,
    severity: compareSeverity.severity,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    truthQualitySource: "compare_truth_source_semantics_chain",
    truthQualitySignals: [
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorMessage.operatorMessage,
      compareOperatorGuidance.operatorGuidance,
      compareOwnerActionability.ownerActionability,
      compareOwnership.ownership,
      compareOperationalPriority.priority,
      compareEscalationReadiness.readiness,
      compareReviewReadiness.readiness,
      compareSeverity.severity,
      mismatchClassification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      compareStatus,
    ],
  });
  const compareEvidence = createCompareEvidenceMetadata({
    compareEvidence: compareEvidenceForSemantics({
      compareHardening,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      classification: mismatchClassification,
      severity: compareSeverity.severity,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      compareStatus,
    }),
    compareHardening,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    classification: mismatchClassification,
    severity: compareSeverity.severity,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    evidenceSource: "compare_evidence_semantics_chain",
    evidenceSignals: [
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorMessage.operatorMessage,
      compareOperatorGuidance.operatorGuidance,
      compareOwnerActionability.ownerActionability,
      compareOwnership.ownership,
      compareOperationalPriority.priority,
      compareEscalationReadiness.readiness,
      compareReviewReadiness.readiness,
      compareSeverity.severity,
      mismatchClassification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      compareStatus,
    ],
  });
  const compareRisk = createCompareRiskMetadata({
    compareRisk: compareRiskForSemantics({
      compareHardening,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      compareEvidence: compareEvidence.compareEvidence,
      classification: mismatchClassification,
      compareStatus,
    }),
    compareHardening,
    severity: compareSeverity.severity,
    operationalPriority: compareOperationalPriority.priority,
    ownerActionability: compareOwnerActionability.ownerActionability,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    compareEvidence: compareEvidence.compareEvidence,
    classification: mismatchClassification,
    riskSource: "compare_risk_semantics_chain",
    riskSignals: [
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorMessage.operatorMessage,
      compareOperatorGuidance.operatorGuidance,
      compareOwnerActionability.ownerActionability,
      compareOwnership.ownership,
      compareOperationalPriority.priority,
      compareEscalationReadiness.readiness,
      compareReviewReadiness.readiness,
      compareSeverity.severity,
      mismatchClassification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      compareStatus,
    ],
  });
  const compareInterpretationStability =
    createCompareInterpretationStabilityMetadata({
      interpretationStability: interpretationStabilityForSemantics({
        compareHardening,
        compareConfidence: compareConfidence.compareConfidence,
        projectionFreshness: compareProjectionFreshness.projectionFreshness,
        truthAggregationQuality:
          compareTruthAggregationQuality.truthAggregationQuality,
        compareEvidence: compareEvidence.compareEvidence,
        compareRisk: compareRisk.compareRisk,
        classification: mismatchClassification,
        severity: compareSeverity.severity,
        operatorTimeline: compareOperatorTimeline.operatorTimeline,
        compareStatus,
      }),
      compareHardening,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      compareEvidence: compareEvidence.compareEvidence,
      compareRisk: compareRisk.compareRisk,
      classification: mismatchClassification,
      severity: compareSeverity.severity,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      stabilitySource: "compare_interpretation_stability_semantics_chain",
      stabilitySignals: [
        compareRisk.compareRisk,
        compareEvidence.compareEvidence,
        compareTruthAggregationQuality.truthAggregationQuality,
        compareProjectionFreshness.projectionFreshness,
        compareConfidence.compareConfidence,
        compareOperatorTimeline.operatorTimeline,
        compareOperatorMessage.operatorMessage,
        compareOperatorGuidance.operatorGuidance,
        compareOwnerActionability.ownerActionability,
        compareOwnership.ownership,
        compareOperationalPriority.priority,
        compareEscalationReadiness.readiness,
        compareReviewReadiness.readiness,
        compareSeverity.severity,
        mismatchClassification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
        compareStatus,
      ],
    });
  const compareDecisionReadiness = createCompareDecisionReadinessMetadata({
    decisionReadiness: decisionReadinessForSemantics({
      compareHardening,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      compareEvidence: compareEvidence.compareEvidence,
      compareRisk: compareRisk.compareRisk,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      operatorSummary: compareOperatorTimeline.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operationalPriority: compareOperationalPriority.priority,
      classification: mismatchClassification,
      severity: compareSeverity.severity,
      compareStatus,
    }),
    compareHardening,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    compareEvidence: compareEvidence.compareEvidence,
    compareRisk: compareRisk.compareRisk,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    operatorSummary: compareOperatorTimeline.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    operatorMessage: compareOperatorMessage.operatorMessage,
    ownerActionability: compareOwnerActionability.ownerActionability,
    reviewReadiness: compareReviewReadiness.readiness,
    escalationReadiness: compareEscalationReadiness.readiness,
    operationalPriority: compareOperationalPriority.priority,
    classification: mismatchClassification,
    severity: compareSeverity.severity,
    decisionSource: "compare_decision_readiness_semantics_chain",
    decisionSignals: [
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorMessage.operatorMessage,
      compareOperatorGuidance.operatorGuidance,
      compareOwnerActionability.ownerActionability,
      compareOwnership.ownership,
      compareOperationalPriority.priority,
      compareEscalationReadiness.readiness,
      compareReviewReadiness.readiness,
      compareSeverity.severity,
      mismatchClassification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      compareStatus,
    ],
  });
  const compareOperationalImpact = createCompareOperationalImpactMetadata({
    operationalImpact: operationalImpactForSemantics({
      compareHardening,
      compareRisk: compareRisk.compareRisk,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorTimeline.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      classification: mismatchClassification,
      compareStatus,
    }),
    compareHardening,
    compareRisk: compareRisk.compareRisk,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareSeverity.severity,
    operationalPriority: compareOperationalPriority.priority,
    ownerActionability: compareOwnerActionability.ownerActionability,
    reviewReadiness: compareReviewReadiness.readiness,
    escalationReadiness: compareEscalationReadiness.readiness,
    operatorSummary: compareOperatorTimeline.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    classification: mismatchClassification,
    impactSource: "compare_operational_impact_semantics_chain",
    impactSignals: [
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorMessage.operatorMessage,
      compareOperatorGuidance.operatorGuidance,
      compareOwnerActionability.ownerActionability,
      compareOperationalPriority.priority,
      compareEscalationReadiness.readiness,
      compareReviewReadiness.readiness,
      compareSeverity.severity,
      mismatchClassification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      compareStatus,
    ],
  });
  const compareOperationalAttention = createCompareOperationalAttentionMetadata({
    operationalAttention: operationalAttentionForSemantics({
      compareHardening,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorTimeline.operatorSummary,
      classification: mismatchClassification,
      compareStatus,
    }),
    compareHardening,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareSeverity.severity,
    operationalPriority: compareOperationalPriority.priority,
    ownerActionability: compareOwnerActionability.ownerActionability,
    reviewReadiness: compareReviewReadiness.readiness,
    escalationReadiness: compareEscalationReadiness.readiness,
    operatorSummary: compareOperatorTimeline.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    classification: mismatchClassification,
    attentionSource: "compare_operational_attention_semantics_chain",
    attentionSignals: [
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorMessage.operatorMessage,
      compareOperatorGuidance.operatorGuidance,
      compareOwnerActionability.ownerActionability,
      compareOperationalPriority.priority,
      compareEscalationReadiness.readiness,
      compareReviewReadiness.readiness,
      compareSeverity.severity,
      mismatchClassification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      compareStatus,
    ],
  });
  const compareGovernancePosture = createCompareGovernancePostureMetadata({
    governancePosture: governancePostureForSemantics({
      compareHardening,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorTimeline.operatorSummary,
      classification: mismatchClassification,
      compareStatus,
    }),
    compareHardening,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareSeverity.severity,
    operationalPriority: compareOperationalPriority.priority,
    ownerActionability: compareOwnerActionability.ownerActionability,
    reviewReadiness: compareReviewReadiness.readiness,
    escalationReadiness: compareEscalationReadiness.readiness,
    operatorSummary: compareOperatorTimeline.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    classification: mismatchClassification,
    postureSource: "compare_governance_posture_semantics_chain",
    postureSignals: [
      compareOperationalAttention.operationalAttention,
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorMessage.operatorMessage,
      compareOperatorGuidance.operatorGuidance,
      compareOwnerActionability.ownerActionability,
      compareOperationalPriority.priority,
      compareEscalationReadiness.readiness,
      compareReviewReadiness.readiness,
      compareSeverity.severity,
      mismatchClassification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      compareStatus,
    ],
  });
  const compareGovernanceDisposition = createCompareGovernanceDispositionMetadata({
    governanceDisposition: governanceDispositionForSemantics({
      compareHardening,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      classification: mismatchClassification,
      compareStatus,
    }),
    compareHardening,
    governancePosture: compareGovernancePosture.governancePosture,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareSeverity.severity,
    operationalPriority: compareOperationalPriority.priority,
    ownerActionability: compareOwnerActionability.ownerActionability,
    reviewReadiness: compareReviewReadiness.readiness,
    escalationReadiness: compareEscalationReadiness.readiness,
    operatorSummary: compareOperatorTimeline.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    classification: mismatchClassification,
    dispositionSource: "compare_governance_disposition_semantics_chain",
    dispositionSignals: [
      compareGovernancePosture.governancePosture,
      compareOperationalAttention.operationalAttention,
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorMessage.operatorMessage,
      compareOperatorGuidance.operatorGuidance,
      compareOwnerActionability.ownerActionability,
      compareOperationalPriority.priority,
      compareEscalationReadiness.readiness,
      compareReviewReadiness.readiness,
      compareSeverity.severity,
      mismatchClassification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      compareStatus,
    ],
  });
  const compareGovernanceRetention = createCompareGovernanceRetentionMetadata({
    governanceRetention: governanceRetentionForSemantics({
      compareHardening,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      classification: mismatchClassification,
      compareStatus,
    }),
    compareHardening,
    governanceDisposition: compareGovernanceDisposition.governanceDisposition,
    governancePosture: compareGovernancePosture.governancePosture,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareSeverity.severity,
    operationalPriority: compareOperationalPriority.priority,
    ownerActionability: compareOwnerActionability.ownerActionability,
    reviewReadiness: compareReviewReadiness.readiness,
    escalationReadiness: compareEscalationReadiness.readiness,
    operatorSummary: compareOperatorTimeline.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    classification: mismatchClassification,
    retentionSource: "compare_governance_retention_semantics_chain",
    retentionSignals: [
      compareGovernanceDisposition.governanceDisposition,
      compareGovernancePosture.governancePosture,
      compareOperationalAttention.operationalAttention,
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorMessage.operatorMessage,
      compareOperatorGuidance.operatorGuidance,
      compareOwnerActionability.ownerActionability,
      compareOperationalPriority.priority,
      compareEscalationReadiness.readiness,
      compareReviewReadiness.readiness,
      compareSeverity.severity,
      mismatchClassification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      compareStatus,
    ],
  });
  const compareGovernanceAuditTrail = createCompareGovernanceAuditTrailMetadata({
    governanceAuditTrail: governanceAuditTrailForSemantics({
      compareHardening,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      classification: mismatchClassification,
      compareStatus,
    }),
    compareHardening,
    governanceRetention: compareGovernanceRetention.governanceRetention,
    governanceDisposition: compareGovernanceDisposition.governanceDisposition,
    governancePosture: compareGovernancePosture.governancePosture,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareSeverity.severity,
    operationalPriority: compareOperationalPriority.priority,
    ownerActionability: compareOwnerActionability.ownerActionability,
    reviewReadiness: compareReviewReadiness.readiness,
    escalationReadiness: compareEscalationReadiness.readiness,
    operatorSummary: compareOperatorTimeline.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    classification: mismatchClassification,
    auditTrailSource: "compare_governance_audit_trail_semantics_chain",
    auditTrailSignals: [
      compareGovernanceRetention.governanceRetention,
      compareGovernanceDisposition.governanceDisposition,
      compareGovernancePosture.governancePosture,
      compareOperationalAttention.operationalAttention,
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorMessage.operatorMessage,
      compareOperatorGuidance.operatorGuidance,
      compareOwnerActionability.ownerActionability,
      compareOperationalPriority.priority,
      compareEscalationReadiness.readiness,
      compareReviewReadiness.readiness,
      compareSeverity.severity,
      mismatchClassification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      compareStatus,
      "truth_source_inventory_transactions",
      "cache_compare_target_inventory_current",
      "read_only_boundary",
      "projection_traceability_metadata",
    ],
  });
  const compareGovernanceExplainability =
    createCompareGovernanceExplainabilityMetadata({
      governanceExplainability: governanceExplainabilityForSemantics({
        compareHardening,
        governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
        governanceRetention: compareGovernanceRetention.governanceRetention,
        governanceDisposition: compareGovernanceDisposition.governanceDisposition,
        governancePosture: compareGovernancePosture.governancePosture,
        operationalAttention: compareOperationalAttention.operationalAttention,
        operationalImpact: compareOperationalImpact.operationalImpact,
        decisionReadiness: compareDecisionReadiness.decisionReadiness,
        interpretationStability:
          compareInterpretationStability.interpretationStability,
        compareRisk: compareRisk.compareRisk,
        compareEvidence: compareEvidence.compareEvidence,
        compareConfidence: compareConfidence.compareConfidence,
        projectionFreshness: compareProjectionFreshness.projectionFreshness,
        truthAggregationQuality:
          compareTruthAggregationQuality.truthAggregationQuality,
        severity: compareSeverity.severity,
        operationalPriority: compareOperationalPriority.priority,
        ownerActionability: compareOwnerActionability.ownerActionability,
        reviewReadiness: compareReviewReadiness.readiness,
        escalationReadiness: compareEscalationReadiness.readiness,
        operatorSummary: compareOperatorTimeline.operatorSummary,
        operatorTimeline: compareOperatorTimeline.operatorTimeline,
        operatorMessage: compareOperatorMessage.operatorMessage,
        operatorGuidance: compareOperatorGuidance.operatorGuidance,
        classification: mismatchClassification,
        compareStatus,
      }),
      compareHardening,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorTimeline.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: mismatchClassification,
      explainabilitySource: "compare_governance_explainability_semantics_chain",
      explainabilitySignals: [
        compareGovernanceAuditTrail.governanceAuditTrail,
        compareGovernanceRetention.governanceRetention,
        compareGovernanceDisposition.governanceDisposition,
        compareGovernancePosture.governancePosture,
        compareOperationalAttention.operationalAttention,
        compareOperationalImpact.operationalImpact,
        compareDecisionReadiness.decisionReadiness,
        compareInterpretationStability.interpretationStability,
        compareRisk.compareRisk,
        compareEvidence.compareEvidence,
        compareTruthAggregationQuality.truthAggregationQuality,
        compareProjectionFreshness.projectionFreshness,
        compareConfidence.compareConfidence,
        compareOperatorTimeline.operatorTimeline,
        compareOperatorMessage.operatorMessage,
        compareOperatorGuidance.operatorGuidance,
        compareOperatorTimeline.operatorSummary ?? "summary_source_unverified",
        compareOwnerActionability.ownerActionability,
        compareOperationalPriority.priority,
        compareEscalationReadiness.readiness,
        compareReviewReadiness.readiness,
        compareSeverity.severity,
        mismatchClassification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
        compareStatus,
        "truth_source_inventory_transactions",
        "cache_compare_target_inventory_current",
        "read_only_boundary",
        "reasoning_readability_metadata",
      ],
    });
  const compareGovernanceReasoningCoherence =
    createCompareGovernanceReasoningCoherenceMetadata({
      governanceReasoningCoherence: governanceReasoningCoherenceForSemantics({
        compareHardening,
        governanceExplainability:
          compareGovernanceExplainability.governanceExplainability,
        governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
        governanceRetention: compareGovernanceRetention.governanceRetention,
        governanceDisposition:
          compareGovernanceDisposition.governanceDisposition,
        governancePosture: compareGovernancePosture.governancePosture,
        operationalAttention: compareOperationalAttention.operationalAttention,
        operationalImpact: compareOperationalImpact.operationalImpact,
        decisionReadiness: compareDecisionReadiness.decisionReadiness,
        interpretationStability:
          compareInterpretationStability.interpretationStability,
        compareRisk: compareRisk.compareRisk,
        compareEvidence: compareEvidence.compareEvidence,
        compareConfidence: compareConfidence.compareConfidence,
        projectionFreshness: compareProjectionFreshness.projectionFreshness,
        truthAggregationQuality:
          compareTruthAggregationQuality.truthAggregationQuality,
        severity: compareSeverity.severity,
        operationalPriority: compareOperationalPriority.priority,
        ownerActionability: compareOwnerActionability.ownerActionability,
        reviewReadiness: compareReviewReadiness.readiness,
        escalationReadiness: compareEscalationReadiness.readiness,
        operatorSummary: compareOperatorTimeline.operatorSummary,
        operatorTimeline: compareOperatorTimeline.operatorTimeline,
        operatorMessage: compareOperatorMessage.operatorMessage,
        operatorGuidance: compareOperatorGuidance.operatorGuidance,
        classification: mismatchClassification,
        compareStatus,
      }),
      compareHardening,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorTimeline.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: mismatchClassification,
      reasoningCoherenceSource:
        "compare_governance_reasoning_coherence_semantics_chain",
      reasoningCoherenceSignals: [
        compareGovernanceExplainability.governanceExplainability,
        compareGovernanceAuditTrail.governanceAuditTrail,
        compareGovernanceRetention.governanceRetention,
        compareGovernanceDisposition.governanceDisposition,
        compareGovernancePosture.governancePosture,
        compareOperationalAttention.operationalAttention,
        compareOperationalImpact.operationalImpact,
        compareDecisionReadiness.decisionReadiness,
        compareInterpretationStability.interpretationStability,
        compareRisk.compareRisk,
        compareEvidence.compareEvidence,
        compareTruthAggregationQuality.truthAggregationQuality,
        compareProjectionFreshness.projectionFreshness,
        compareConfidence.compareConfidence,
        compareOperatorTimeline.operatorTimeline,
        compareOperatorMessage.operatorMessage,
        compareOperatorGuidance.operatorGuidance,
        compareOperatorTimeline.operatorSummary ?? "summary_source_unverified",
        compareOwnerActionability.ownerActionability,
        compareOperationalPriority.priority,
        compareEscalationReadiness.readiness,
        compareReviewReadiness.readiness,
        compareSeverity.severity,
        mismatchClassification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
        compareStatus,
        "truth_source_inventory_transactions",
        "cache_compare_target_inventory_current",
        "read_only_boundary",
        "traceability_metadata",
        "reasoning_integrity_metadata",
      ],
    });
  const compareGovernanceSemanticDrift =
    createCompareGovernanceSemanticDriftMetadata({
      governanceSemanticDrift: governanceSemanticDriftForSemantics({
        compareHardening,
        governanceReasoningCoherence:
          compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        governanceExplainability:
          compareGovernanceExplainability.governanceExplainability,
        governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
        governanceRetention: compareGovernanceRetention.governanceRetention,
        governanceDisposition:
          compareGovernanceDisposition.governanceDisposition,
        governancePosture: compareGovernancePosture.governancePosture,
        operationalAttention: compareOperationalAttention.operationalAttention,
        operationalImpact: compareOperationalImpact.operationalImpact,
        decisionReadiness: compareDecisionReadiness.decisionReadiness,
        interpretationStability:
          compareInterpretationStability.interpretationStability,
        compareRisk: compareRisk.compareRisk,
        compareEvidence: compareEvidence.compareEvidence,
        compareConfidence: compareConfidence.compareConfidence,
        projectionFreshness: compareProjectionFreshness.projectionFreshness,
        truthAggregationQuality:
          compareTruthAggregationQuality.truthAggregationQuality,
        severity: compareSeverity.severity,
        operationalPriority: compareOperationalPriority.priority,
        ownerActionability: compareOwnerActionability.ownerActionability,
        reviewReadiness: compareReviewReadiness.readiness,
        escalationReadiness: compareEscalationReadiness.readiness,
        operatorSummary: compareOperatorTimeline.operatorSummary,
        operatorTimeline: compareOperatorTimeline.operatorTimeline,
        operatorMessage: compareOperatorMessage.operatorMessage,
        operatorGuidance: compareOperatorGuidance.operatorGuidance,
        classification: mismatchClassification,
      }),
      compareHardening,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorTimeline.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: mismatchClassification,
      semanticDriftSource: "compare_governance_semantic_drift_semantics_chain",
      semanticDriftSignals: [
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        compareGovernanceExplainability.governanceExplainability,
        compareGovernanceAuditTrail.governanceAuditTrail,
        compareGovernanceRetention.governanceRetention,
        compareGovernanceDisposition.governanceDisposition,
        compareGovernancePosture.governancePosture,
        compareOperationalAttention.operationalAttention,
        compareOperationalImpact.operationalImpact,
        compareDecisionReadiness.decisionReadiness,
        compareInterpretationStability.interpretationStability,
        compareRisk.compareRisk,
        compareEvidence.compareEvidence,
        compareTruthAggregationQuality.truthAggregationQuality,
        compareProjectionFreshness.projectionFreshness,
        compareConfidence.compareConfidence,
        compareOperatorTimeline.operatorTimeline,
        compareOperatorMessage.operatorMessage,
        compareOperatorGuidance.operatorGuidance,
        compareOperatorTimeline.operatorSummary ?? "summary_source_unverified",
        compareOwnerActionability.ownerActionability,
        compareOperationalPriority.priority,
        compareEscalationReadiness.readiness,
        compareReviewReadiness.readiness,
        compareSeverity.severity,
        mismatchClassification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
        compareStatus,
        "truth_source_inventory_transactions",
        "cache_compare_target_inventory_current",
        "read_only_boundary",
        "freshness_semantics_metadata",
        "semantic_stability_metadata",
      ],
    });
  const compareGovernanceSemanticConvergence =
    createCompareGovernanceSemanticConvergenceMetadata({
      governanceSemanticConvergence: governanceSemanticConvergenceForSemantics({
        compareHardening,
        governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
        governanceReasoningCoherence:
          compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        governanceExplainability:
          compareGovernanceExplainability.governanceExplainability,
        governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
        governanceRetention: compareGovernanceRetention.governanceRetention,
        governanceDisposition:
          compareGovernanceDisposition.governanceDisposition,
        governancePosture: compareGovernancePosture.governancePosture,
        operationalAttention: compareOperationalAttention.operationalAttention,
        operationalImpact: compareOperationalImpact.operationalImpact,
        decisionReadiness: compareDecisionReadiness.decisionReadiness,
        interpretationStability:
          compareInterpretationStability.interpretationStability,
        compareRisk: compareRisk.compareRisk,
        compareEvidence: compareEvidence.compareEvidence,
        compareConfidence: compareConfidence.compareConfidence,
        projectionFreshness: compareProjectionFreshness.projectionFreshness,
        truthAggregationQuality:
          compareTruthAggregationQuality.truthAggregationQuality,
        severity: compareSeverity.severity,
        operationalPriority: compareOperationalPriority.priority,
        ownerActionability: compareOwnerActionability.ownerActionability,
        reviewReadiness: compareReviewReadiness.readiness,
        escalationReadiness: compareEscalationReadiness.readiness,
        operatorSummary: compareOperatorTimeline.operatorSummary,
        operatorTimeline: compareOperatorTimeline.operatorTimeline,
        operatorMessage: compareOperatorMessage.operatorMessage,
        operatorGuidance: compareOperatorGuidance.operatorGuidance,
        classification: mismatchClassification,
      }),
      compareHardening,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorTimeline.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: mismatchClassification,
      semanticConvergenceSource:
        "compare_governance_semantic_convergence_semantics_chain",
      semanticConvergenceSignals: [
        compareGovernanceSemanticDrift.governanceSemanticDrift,
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        compareGovernanceExplainability.governanceExplainability,
        compareGovernanceAuditTrail.governanceAuditTrail,
        compareGovernanceRetention.governanceRetention,
        compareGovernanceDisposition.governanceDisposition,
        compareGovernancePosture.governancePosture,
        compareOperationalAttention.operationalAttention,
        compareOperationalImpact.operationalImpact,
        compareDecisionReadiness.decisionReadiness,
        compareInterpretationStability.interpretationStability,
        compareRisk.compareRisk,
        compareEvidence.compareEvidence,
        compareTruthAggregationQuality.truthAggregationQuality,
        compareProjectionFreshness.projectionFreshness,
        compareConfidence.compareConfidence,
        compareOperatorTimeline.operatorTimeline,
        compareOperatorMessage.operatorMessage,
        compareOperatorGuidance.operatorGuidance,
        compareOperatorTimeline.operatorSummary ?? "summary_source_unverified",
        compareOwnerActionability.ownerActionability,
        compareOperationalPriority.priority,
        compareEscalationReadiness.readiness,
        compareReviewReadiness.readiness,
        compareSeverity.severity,
        mismatchClassification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
        compareStatus,
        "truth_source_inventory_transactions",
        "cache_compare_target_inventory_current",
        "read_only_boundary",
        "semantic_drift_metadata",
        "semantic_stability_metadata",
      ],
    });
  const compareGovernanceSemanticResilience =
    createCompareGovernanceSemanticResilienceMetadata({
      governanceSemanticResilience: governanceSemanticResilienceForSemantics({
        compareHardening,
        governanceSemanticConvergence:
          compareGovernanceSemanticConvergence.governanceSemanticConvergence,
        governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
        governanceReasoningCoherence:
          compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        governanceExplainability:
          compareGovernanceExplainability.governanceExplainability,
        governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
        governanceRetention: compareGovernanceRetention.governanceRetention,
        governanceDisposition:
          compareGovernanceDisposition.governanceDisposition,
        governancePosture: compareGovernancePosture.governancePosture,
        operationalAttention: compareOperationalAttention.operationalAttention,
        operationalImpact: compareOperationalImpact.operationalImpact,
        decisionReadiness: compareDecisionReadiness.decisionReadiness,
        interpretationStability:
          compareInterpretationStability.interpretationStability,
        compareRisk: compareRisk.compareRisk,
        compareEvidence: compareEvidence.compareEvidence,
        compareConfidence: compareConfidence.compareConfidence,
        projectionFreshness: compareProjectionFreshness.projectionFreshness,
        truthAggregationQuality:
          compareTruthAggregationQuality.truthAggregationQuality,
        severity: compareSeverity.severity,
        operationalPriority: compareOperationalPriority.priority,
        ownerActionability: compareOwnerActionability.ownerActionability,
        reviewReadiness: compareReviewReadiness.readiness,
        escalationReadiness: compareEscalationReadiness.readiness,
        operatorSummary: compareOperatorTimeline.operatorSummary,
        operatorTimeline: compareOperatorTimeline.operatorTimeline,
        operatorMessage: compareOperatorMessage.operatorMessage,
        operatorGuidance: compareOperatorGuidance.operatorGuidance,
        classification: mismatchClassification,
      }),
      compareHardening,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorTimeline.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: mismatchClassification,
      semanticResilienceSource:
        "compare_governance_semantic_resilience_semantics_chain",
      semanticResilienceSignals: [
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
        compareGovernanceSemanticDrift.governanceSemanticDrift,
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        compareGovernanceExplainability.governanceExplainability,
        compareGovernanceAuditTrail.governanceAuditTrail,
        compareGovernanceRetention.governanceRetention,
        compareGovernanceDisposition.governanceDisposition,
        compareGovernancePosture.governancePosture,
        compareOperationalAttention.operationalAttention,
        compareOperationalImpact.operationalImpact,
        compareDecisionReadiness.decisionReadiness,
        compareInterpretationStability.interpretationStability,
        compareRisk.compareRisk,
        compareEvidence.compareEvidence,
        compareTruthAggregationQuality.truthAggregationQuality,
        compareProjectionFreshness.projectionFreshness,
        compareConfidence.compareConfidence,
        compareOperatorTimeline.operatorTimeline,
        compareOperatorMessage.operatorMessage,
        compareOperatorGuidance.operatorGuidance,
        compareOperatorTimeline.operatorSummary ?? "summary_source_unverified",
        compareOwnerActionability.ownerActionability,
        compareOperationalPriority.priority,
        compareEscalationReadiness.readiness,
        compareReviewReadiness.readiness,
        compareSeverity.severity,
        mismatchClassification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
        compareStatus,
        "truth_source_inventory_transactions",
        "cache_compare_target_inventory_current",
        "read_only_boundary",
        "semantic_convergence_metadata",
        "semantic_stability_metadata",
      ],
    });
  const compareGovernanceSemanticIntegrityBoundary =
    createCompareGovernanceSemanticIntegrityBoundaryMetadata({
      governanceSemanticIntegrityBoundary: governanceSemanticIntegrityBoundaryForSemantics({
        compareHardening,
        governanceSemanticResilience:
          compareGovernanceSemanticResilience.governanceSemanticResilience,
        governanceSemanticConvergence:
          compareGovernanceSemanticConvergence.governanceSemanticConvergence,
        governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
        governanceReasoningCoherence:
          compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        governanceExplainability:
          compareGovernanceExplainability.governanceExplainability,
        governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
        governanceRetention: compareGovernanceRetention.governanceRetention,
        governanceDisposition:
          compareGovernanceDisposition.governanceDisposition,
        governancePosture: compareGovernancePosture.governancePosture,
        operationalAttention: compareOperationalAttention.operationalAttention,
        operationalImpact: compareOperationalImpact.operationalImpact,
        decisionReadiness: compareDecisionReadiness.decisionReadiness,
        interpretationStability:
          compareInterpretationStability.interpretationStability,
        compareRisk: compareRisk.compareRisk,
        compareEvidence: compareEvidence.compareEvidence,
        compareConfidence: compareConfidence.compareConfidence,
        projectionFreshness: compareProjectionFreshness.projectionFreshness,
        truthAggregationQuality:
          compareTruthAggregationQuality.truthAggregationQuality,
        severity: compareSeverity.severity,
        operationalPriority: compareOperationalPriority.priority,
        ownerActionability: compareOwnerActionability.ownerActionability,
        reviewReadiness: compareReviewReadiness.readiness,
        escalationReadiness: compareEscalationReadiness.readiness,
        operatorSummary: compareOperatorTimeline.operatorSummary,
        operatorTimeline: compareOperatorTimeline.operatorTimeline,
        operatorMessage: compareOperatorMessage.operatorMessage,
        operatorGuidance: compareOperatorGuidance.operatorGuidance,
        classification: mismatchClassification,
      }),
      compareHardening,
      governanceSemanticResilience:
        compareGovernanceSemanticResilience.governanceSemanticResilience,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorTimeline.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: mismatchClassification,
      semanticIntegrityBoundarySource:
        "compare_governance_semantic_integrity_boundary_semantics_chain",
      semanticIntegrityBoundarySignals: [
        compareGovernanceSemanticResilience.governanceSemanticResilience,
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
        compareGovernanceSemanticDrift.governanceSemanticDrift,
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        compareGovernanceExplainability.governanceExplainability,
        compareGovernanceAuditTrail.governanceAuditTrail,
        compareGovernanceRetention.governanceRetention,
        compareGovernanceDisposition.governanceDisposition,
        compareGovernancePosture.governancePosture,
        compareOperationalAttention.operationalAttention,
        compareOperationalImpact.operationalImpact,
        compareDecisionReadiness.decisionReadiness,
        compareInterpretationStability.interpretationStability,
        compareRisk.compareRisk,
        compareEvidence.compareEvidence,
        compareTruthAggregationQuality.truthAggregationQuality,
        compareProjectionFreshness.projectionFreshness,
        compareConfidence.compareConfidence,
        compareOperatorTimeline.operatorTimeline,
        compareOperatorMessage.operatorMessage,
        compareOperatorGuidance.operatorGuidance,
        compareOperatorTimeline.operatorSummary ?? "summary_source_unverified",
        compareOwnerActionability.ownerActionability,
        compareOperationalPriority.priority,
        compareEscalationReadiness.readiness,
        compareReviewReadiness.readiness,
        compareSeverity.severity,
        mismatchClassification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
        compareStatus,
        "truth_source_inventory_transactions",
        "cache_compare_target_inventory_current",
        "read_only_boundary",
        "semantic_resilience_metadata",
        "semantic_convergence_metadata",
      ],
    });
  const compareGovernanceSemanticRecoverability =
    createCompareGovernanceSemanticRecoverabilityMetadata({
      governanceSemanticRecoverability: governanceSemanticRecoverabilityForSemantics({
        compareHardening,
        governanceSemanticIntegrityBoundary:
          compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
        governanceSemanticResilience:
          compareGovernanceSemanticResilience.governanceSemanticResilience,
        governanceSemanticConvergence:
          compareGovernanceSemanticConvergence.governanceSemanticConvergence,
        governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
        governanceReasoningCoherence:
          compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        governanceExplainability:
          compareGovernanceExplainability.governanceExplainability,
        governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
        governanceRetention: compareGovernanceRetention.governanceRetention,
        governanceDisposition:
          compareGovernanceDisposition.governanceDisposition,
        governancePosture: compareGovernancePosture.governancePosture,
        operationalAttention: compareOperationalAttention.operationalAttention,
        operationalImpact: compareOperationalImpact.operationalImpact,
        decisionReadiness: compareDecisionReadiness.decisionReadiness,
        interpretationStability:
          compareInterpretationStability.interpretationStability,
        compareRisk: compareRisk.compareRisk,
        compareEvidence: compareEvidence.compareEvidence,
        compareConfidence: compareConfidence.compareConfidence,
        projectionFreshness: compareProjectionFreshness.projectionFreshness,
        truthAggregationQuality:
          compareTruthAggregationQuality.truthAggregationQuality,
        severity: compareSeverity.severity,
        operationalPriority: compareOperationalPriority.priority,
        ownerActionability: compareOwnerActionability.ownerActionability,
        reviewReadiness: compareReviewReadiness.readiness,
        escalationReadiness: compareEscalationReadiness.readiness,
        operatorSummary: compareOperatorTimeline.operatorSummary,
        operatorTimeline: compareOperatorTimeline.operatorTimeline,
        operatorMessage: compareOperatorMessage.operatorMessage,
        operatorGuidance: compareOperatorGuidance.operatorGuidance,
        classification: mismatchClassification,
      }),
      compareHardening,
      governanceSemanticIntegrityBoundary:
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
      governanceSemanticResilience:
        compareGovernanceSemanticResilience.governanceSemanticResilience,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorTimeline.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: mismatchClassification,
      semanticRecoverabilitySource:
        "compare_governance_semantic_recoverability_semantics_chain",
      semanticRecoverabilitySignals: [
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
        compareGovernanceSemanticResilience.governanceSemanticResilience,
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
        compareGovernanceSemanticDrift.governanceSemanticDrift,
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        compareGovernanceExplainability.governanceExplainability,
        compareGovernanceAuditTrail.governanceAuditTrail,
        compareGovernanceRetention.governanceRetention,
        compareGovernanceDisposition.governanceDisposition,
        compareGovernancePosture.governancePosture,
        compareOperationalAttention.operationalAttention,
        compareOperationalImpact.operationalImpact,
        compareDecisionReadiness.decisionReadiness,
        compareInterpretationStability.interpretationStability,
        compareRisk.compareRisk,
        compareEvidence.compareEvidence,
        compareTruthAggregationQuality.truthAggregationQuality,
        compareProjectionFreshness.projectionFreshness,
        compareConfidence.compareConfidence,
        compareOperatorTimeline.operatorTimeline,
        compareOperatorMessage.operatorMessage,
        compareOperatorGuidance.operatorGuidance,
        compareOperatorTimeline.operatorSummary ?? "summary_source_unverified",
        compareOwnerActionability.ownerActionability,
        compareOperationalPriority.priority,
        compareEscalationReadiness.readiness,
        compareReviewReadiness.readiness,
        compareSeverity.severity,
        mismatchClassification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
        compareStatus,
        "truth_source_inventory_transactions",
        "cache_compare_target_inventory_current",
        "read_only_boundary",
        "semantic_integrity_boundary_metadata",
        "semantic_resilience_metadata",
      ],
    });
  const compareGovernanceSemanticObservabilityContinuity =
    createCompareGovernanceSemanticObservabilityContinuityMetadata({
      governanceSemanticObservabilityContinuity:
        governanceSemanticObservabilityContinuityForSemantics({
          compareHardening,
          governanceSemanticRecoverability:
            compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
          governanceSemanticIntegrityBoundary:
            compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
          governanceSemanticResilience:
            compareGovernanceSemanticResilience.governanceSemanticResilience,
          governanceSemanticConvergence:
            compareGovernanceSemanticConvergence.governanceSemanticConvergence,
          governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
          governanceReasoningCoherence:
            compareGovernanceReasoningCoherence.governanceReasoningCoherence,
          governanceExplainability:
            compareGovernanceExplainability.governanceExplainability,
          governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
          governanceRetention: compareGovernanceRetention.governanceRetention,
          governanceDisposition:
            compareGovernanceDisposition.governanceDisposition,
          governancePosture: compareGovernancePosture.governancePosture,
          operationalAttention: compareOperationalAttention.operationalAttention,
          operationalImpact: compareOperationalImpact.operationalImpact,
          decisionReadiness: compareDecisionReadiness.decisionReadiness,
          interpretationStability:
            compareInterpretationStability.interpretationStability,
          compareRisk: compareRisk.compareRisk,
          compareEvidence: compareEvidence.compareEvidence,
          compareConfidence: compareConfidence.compareConfidence,
          projectionFreshness: compareProjectionFreshness.projectionFreshness,
          truthAggregationQuality:
            compareTruthAggregationQuality.truthAggregationQuality,
          severity: compareSeverity.severity,
          operationalPriority: compareOperationalPriority.priority,
          ownerActionability: compareOwnerActionability.ownerActionability,
          reviewReadiness: compareReviewReadiness.readiness,
          escalationReadiness: compareEscalationReadiness.readiness,
          operatorSummary: compareOperatorTimeline.operatorSummary,
          operatorTimeline: compareOperatorTimeline.operatorTimeline,
          operatorMessage: compareOperatorMessage.operatorMessage,
          operatorGuidance: compareOperatorGuidance.operatorGuidance,
          classification: mismatchClassification,
        }),
      compareHardening,
      governanceSemanticRecoverability:
        compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
      governanceSemanticIntegrityBoundary:
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
      governanceSemanticResilience:
        compareGovernanceSemanticResilience.governanceSemanticResilience,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorTimeline.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: mismatchClassification,
      semanticObservabilityContinuitySource:
        "compare_governance_semantic_observability_continuity_semantics_chain",
      semanticObservabilityContinuitySignals: [
        compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
        compareGovernanceSemanticResilience.governanceSemanticResilience,
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
        compareGovernanceSemanticDrift.governanceSemanticDrift,
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        compareGovernanceExplainability.governanceExplainability,
        compareGovernanceAuditTrail.governanceAuditTrail,
        compareGovernanceRetention.governanceRetention,
        compareGovernanceDisposition.governanceDisposition,
        compareGovernancePosture.governancePosture,
        compareOperationalAttention.operationalAttention,
        compareOperationalImpact.operationalImpact,
        compareDecisionReadiness.decisionReadiness,
        compareInterpretationStability.interpretationStability,
        compareRisk.compareRisk,
        compareEvidence.compareEvidence,
        compareTruthAggregationQuality.truthAggregationQuality,
        compareProjectionFreshness.projectionFreshness,
        compareConfidence.compareConfidence,
        compareOperatorTimeline.operatorTimeline,
        compareOperatorMessage.operatorMessage,
        compareOperatorGuidance.operatorGuidance,
        compareOperatorTimeline.operatorSummary ?? "summary_source_unverified",
        compareOwnerActionability.ownerActionability,
        compareOperationalPriority.priority,
        compareEscalationReadiness.readiness,
        compareReviewReadiness.readiness,
        compareSeverity.severity,
        mismatchClassification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
        compareStatus,
        "truth_source_inventory_transactions",
        "cache_compare_target_inventory_current",
        "read_only_boundary",
        "semantic_recoverability_metadata",
        "semantic_integrity_boundary_metadata",
      ],
    });
  const compareGovernanceSemanticDegradationTolerance =
    createCompareGovernanceSemanticDegradationToleranceMetadata({
      governanceSemanticDegradationTolerance:
        governanceSemanticDegradationToleranceForSemantics({
          compareHardening,
          governanceSemanticObservabilityContinuity:
            compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
          governanceSemanticRecoverability:
            compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
          governanceSemanticIntegrityBoundary:
            compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
          governanceSemanticResilience:
            compareGovernanceSemanticResilience.governanceSemanticResilience,
          governanceSemanticConvergence:
            compareGovernanceSemanticConvergence.governanceSemanticConvergence,
          governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
          governanceReasoningCoherence:
            compareGovernanceReasoningCoherence.governanceReasoningCoherence,
          governanceExplainability:
            compareGovernanceExplainability.governanceExplainability,
          governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
          governanceRetention: compareGovernanceRetention.governanceRetention,
          governanceDisposition:
            compareGovernanceDisposition.governanceDisposition,
          governancePosture: compareGovernancePosture.governancePosture,
          operationalAttention: compareOperationalAttention.operationalAttention,
          operationalImpact: compareOperationalImpact.operationalImpact,
          decisionReadiness: compareDecisionReadiness.decisionReadiness,
          interpretationStability:
            compareInterpretationStability.interpretationStability,
          compareRisk: compareRisk.compareRisk,
          compareEvidence: compareEvidence.compareEvidence,
          compareConfidence: compareConfidence.compareConfidence,
          projectionFreshness: compareProjectionFreshness.projectionFreshness,
          truthAggregationQuality:
            compareTruthAggregationQuality.truthAggregationQuality,
          severity: compareSeverity.severity,
          operationalPriority: compareOperationalPriority.priority,
          ownerActionability: compareOwnerActionability.ownerActionability,
          reviewReadiness: compareReviewReadiness.readiness,
          escalationReadiness: compareEscalationReadiness.readiness,
          operatorSummary: compareOperatorTimeline.operatorSummary,
          operatorTimeline: compareOperatorTimeline.operatorTimeline,
          operatorMessage: compareOperatorMessage.operatorMessage,
          operatorGuidance: compareOperatorGuidance.operatorGuidance,
          classification: mismatchClassification,
        }),
      compareHardening,
      governanceSemanticObservabilityContinuity:
        compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
      governanceSemanticRecoverability:
        compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
      governanceSemanticIntegrityBoundary:
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
      governanceSemanticResilience:
        compareGovernanceSemanticResilience.governanceSemanticResilience,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorTimeline.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: mismatchClassification,
      semanticDegradationToleranceSource:
        "compare_governance_semantic_degradation_tolerance_semantics_chain",
      semanticDegradationToleranceSignals: [
        compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
        compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
        compareGovernanceSemanticResilience.governanceSemanticResilience,
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
        compareGovernanceSemanticDrift.governanceSemanticDrift,
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        compareGovernanceExplainability.governanceExplainability,
        compareGovernanceAuditTrail.governanceAuditTrail,
        compareGovernanceRetention.governanceRetention,
        compareGovernanceDisposition.governanceDisposition,
        compareGovernancePosture.governancePosture,
        compareOperationalAttention.operationalAttention,
        compareOperationalImpact.operationalImpact,
        compareDecisionReadiness.decisionReadiness,
        compareInterpretationStability.interpretationStability,
        compareRisk.compareRisk,
        compareEvidence.compareEvidence,
        compareTruthAggregationQuality.truthAggregationQuality,
        compareProjectionFreshness.projectionFreshness,
        compareConfidence.compareConfidence,
        compareOperatorTimeline.operatorTimeline,
        compareOperatorMessage.operatorMessage,
        compareOperatorGuidance.operatorGuidance,
        compareOperatorTimeline.operatorSummary ?? "summary_source_unverified",
        compareOwnerActionability.ownerActionability,
        compareOperationalPriority.priority,
        compareEscalationReadiness.readiness,
        compareReviewReadiness.readiness,
        compareSeverity.severity,
        mismatchClassification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
        compareStatus,
        "truth_source_inventory_transactions",
        "cache_compare_target_inventory_current",
        "read_only_boundary",
        "semantic_observability_continuity_metadata",
        "semantic_recoverability_metadata",
        "semantic_integrity_boundary_metadata",
      ],
    });
  const compareGovernanceSemanticSurvivability =
    createCompareGovernanceSemanticSurvivabilityMetadata({
      governanceSemanticSurvivability: governanceSemanticSurvivabilityForSemantics({
        compareHardening,
        governanceSemanticDegradationTolerance:
          compareGovernanceSemanticDegradationTolerance.governanceSemanticDegradationTolerance,
        governanceSemanticObservabilityContinuity:
          compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
        governanceSemanticRecoverability:
          compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
        governanceSemanticIntegrityBoundary:
          compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
        governanceSemanticResilience:
          compareGovernanceSemanticResilience.governanceSemanticResilience,
        governanceSemanticConvergence:
          compareGovernanceSemanticConvergence.governanceSemanticConvergence,
        governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
        governanceReasoningCoherence:
          compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        governanceExplainability:
          compareGovernanceExplainability.governanceExplainability,
        governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
        governanceRetention: compareGovernanceRetention.governanceRetention,
        governanceDisposition: compareGovernanceDisposition.governanceDisposition,
        governancePosture: compareGovernancePosture.governancePosture,
        operationalAttention: compareOperationalAttention.operationalAttention,
        operationalImpact: compareOperationalImpact.operationalImpact,
        decisionReadiness: compareDecisionReadiness.decisionReadiness,
        interpretationStability:
          compareInterpretationStability.interpretationStability,
        compareRisk: compareRisk.compareRisk,
        compareEvidence: compareEvidence.compareEvidence,
        compareConfidence: compareConfidence.compareConfidence,
        projectionFreshness: compareProjectionFreshness.projectionFreshness,
        truthAggregationQuality:
          compareTruthAggregationQuality.truthAggregationQuality,
        severity: compareSeverity.severity,
        operationalPriority: compareOperationalPriority.priority,
        ownerActionability: compareOwnerActionability.ownerActionability,
        reviewReadiness: compareReviewReadiness.readiness,
        escalationReadiness: compareEscalationReadiness.readiness,
        operatorSummary: compareOperatorTimeline.operatorSummary,
        operatorTimeline: compareOperatorTimeline.operatorTimeline,
        operatorMessage: compareOperatorMessage.operatorMessage,
        operatorGuidance: compareOperatorGuidance.operatorGuidance,
        classification: mismatchClassification,
      }),
      compareHardening,
      governanceSemanticDegradationTolerance:
        compareGovernanceSemanticDegradationTolerance.governanceSemanticDegradationTolerance,
      governanceSemanticObservabilityContinuity:
        compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
      governanceSemanticRecoverability:
        compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
      governanceSemanticIntegrityBoundary:
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
      governanceSemanticResilience:
        compareGovernanceSemanticResilience.governanceSemanticResilience,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorTimeline.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: mismatchClassification,
      semanticSurvivabilitySource:
        "compare_governance_semantic_survivability_semantics_chain",
      semanticSurvivabilitySignals: [
        compareGovernanceSemanticDegradationTolerance.governanceSemanticDegradationTolerance,
        compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
        compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
        compareGovernanceSemanticResilience.governanceSemanticResilience,
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
        compareGovernanceSemanticDrift.governanceSemanticDrift,
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        compareGovernanceExplainability.governanceExplainability,
        compareGovernanceAuditTrail.governanceAuditTrail,
        compareGovernanceRetention.governanceRetention,
        compareGovernanceDisposition.governanceDisposition,
        compareGovernancePosture.governancePosture,
        compareOperationalAttention.operationalAttention,
        compareOperationalImpact.operationalImpact,
        compareDecisionReadiness.decisionReadiness,
        compareInterpretationStability.interpretationStability,
        compareRisk.compareRisk,
        compareEvidence.compareEvidence,
        compareTruthAggregationQuality.truthAggregationQuality,
        compareProjectionFreshness.projectionFreshness,
        compareConfidence.compareConfidence,
        compareOperatorTimeline.operatorTimeline,
        compareOperatorMessage.operatorMessage,
        compareOperatorGuidance.operatorGuidance,
        compareOperatorTimeline.operatorSummary ?? "summary_source_unverified",
        compareOwnerActionability.ownerActionability,
        compareOperationalPriority.priority,
        compareEscalationReadiness.readiness,
        compareReviewReadiness.readiness,
        compareSeverity.severity,
        mismatchClassification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
        compareStatus,
        "truth_source_inventory_transactions",
        "cache_compare_target_inventory_current",
        "read_only_boundary",
        "semantic_degradation_tolerance_metadata",
        "semantic_observability_continuity_metadata",
        "semantic_recoverability_metadata",
        "semantic_integrity_boundary_metadata",
      ],
    });
  const compareGovernanceSemanticSustainability =
    createCompareGovernanceSemanticSustainabilityMetadata({
      governanceSemanticSustainability: governanceSemanticSustainabilityForSemantics({
        compareHardening,
        governanceSemanticSurvivability:
          compareGovernanceSemanticSurvivability.governanceSemanticSurvivability,
        governanceSemanticDegradationTolerance:
          compareGovernanceSemanticDegradationTolerance.governanceSemanticDegradationTolerance,
        governanceSemanticObservabilityContinuity:
          compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
        governanceSemanticRecoverability:
          compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
        governanceSemanticIntegrityBoundary:
          compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
        governanceSemanticResilience:
          compareGovernanceSemanticResilience.governanceSemanticResilience,
        governanceSemanticConvergence:
          compareGovernanceSemanticConvergence.governanceSemanticConvergence,
        governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
        governanceReasoningCoherence:
          compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        governanceExplainability:
          compareGovernanceExplainability.governanceExplainability,
        governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
        governanceRetention: compareGovernanceRetention.governanceRetention,
        governanceDisposition: compareGovernanceDisposition.governanceDisposition,
        governancePosture: compareGovernancePosture.governancePosture,
        operationalAttention: compareOperationalAttention.operationalAttention,
        operationalImpact: compareOperationalImpact.operationalImpact,
        decisionReadiness: compareDecisionReadiness.decisionReadiness,
        interpretationStability:
          compareInterpretationStability.interpretationStability,
        compareRisk: compareRisk.compareRisk,
        compareEvidence: compareEvidence.compareEvidence,
        compareConfidence: compareConfidence.compareConfidence,
        projectionFreshness: compareProjectionFreshness.projectionFreshness,
        truthAggregationQuality:
          compareTruthAggregationQuality.truthAggregationQuality,
        severity: compareSeverity.severity,
        operationalPriority: compareOperationalPriority.priority,
        ownerActionability: compareOwnerActionability.ownerActionability,
        reviewReadiness: compareReviewReadiness.readiness,
        escalationReadiness: compareEscalationReadiness.readiness,
        operatorSummary: compareOperatorTimeline.operatorSummary,
        operatorTimeline: compareOperatorTimeline.operatorTimeline,
        operatorMessage: compareOperatorMessage.operatorMessage,
        operatorGuidance: compareOperatorGuidance.operatorGuidance,
        classification: mismatchClassification,
      }),
      compareHardening,
      governanceSemanticSurvivability:
        compareGovernanceSemanticSurvivability.governanceSemanticSurvivability,
      governanceSemanticDegradationTolerance:
        compareGovernanceSemanticDegradationTolerance.governanceSemanticDegradationTolerance,
      governanceSemanticObservabilityContinuity:
        compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
      governanceSemanticRecoverability:
        compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
      governanceSemanticIntegrityBoundary:
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
      governanceSemanticResilience:
        compareGovernanceSemanticResilience.governanceSemanticResilience,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorTimeline.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: mismatchClassification,
      semanticSustainabilitySource:
        "compare_governance_semantic_sustainability_semantics_chain",
      semanticSustainabilitySignals: [
        compareGovernanceSemanticSurvivability.governanceSemanticSurvivability,
        ...compareGovernanceSemanticSurvivability.semanticSurvivabilitySignals,
        compareStatus,
        "semantic_survivability_metadata",
      ],
    });
  const compareGovernanceSemanticMaintainability =
    createCompareGovernanceSemanticMaintainabilityMetadata({
      governanceSemanticMaintainability: governanceSemanticMaintainabilityForSemantics({
        compareHardening,
        governanceSemanticSustainability:
          compareGovernanceSemanticSustainability.governanceSemanticSustainability,
        governanceSemanticSurvivability:
          compareGovernanceSemanticSurvivability.governanceSemanticSurvivability,
        governanceSemanticDegradationTolerance:
          compareGovernanceSemanticDegradationTolerance.governanceSemanticDegradationTolerance,
        governanceSemanticObservabilityContinuity:
          compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
        governanceSemanticRecoverability:
          compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
        governanceSemanticIntegrityBoundary:
          compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
        governanceSemanticResilience:
          compareGovernanceSemanticResilience.governanceSemanticResilience,
        governanceSemanticConvergence:
          compareGovernanceSemanticConvergence.governanceSemanticConvergence,
        governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
        governanceReasoningCoherence:
          compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        governanceExplainability:
          compareGovernanceExplainability.governanceExplainability,
        governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
        governanceRetention: compareGovernanceRetention.governanceRetention,
        governanceDisposition: compareGovernanceDisposition.governanceDisposition,
        governancePosture: compareGovernancePosture.governancePosture,
        operationalAttention: compareOperationalAttention.operationalAttention,
        operationalImpact: compareOperationalImpact.operationalImpact,
        decisionReadiness: compareDecisionReadiness.decisionReadiness,
        interpretationStability:
          compareInterpretationStability.interpretationStability,
        compareRisk: compareRisk.compareRisk,
        compareEvidence: compareEvidence.compareEvidence,
        compareConfidence: compareConfidence.compareConfidence,
        projectionFreshness: compareProjectionFreshness.projectionFreshness,
        truthAggregationQuality:
          compareTruthAggregationQuality.truthAggregationQuality,
        severity: compareSeverity.severity,
        operationalPriority: compareOperationalPriority.priority,
        ownerActionability: compareOwnerActionability.ownerActionability,
        reviewReadiness: compareReviewReadiness.readiness,
        escalationReadiness: compareEscalationReadiness.readiness,
        operatorSummary: compareOperatorTimeline.operatorSummary,
        operatorTimeline: compareOperatorTimeline.operatorTimeline,
        operatorMessage: compareOperatorMessage.operatorMessage,
        operatorGuidance: compareOperatorGuidance.operatorGuidance,
        classification: mismatchClassification,
      }),
      compareHardening,
      governanceSemanticSustainability:
        compareGovernanceSemanticSustainability.governanceSemanticSustainability,
      governanceSemanticSurvivability:
        compareGovernanceSemanticSurvivability.governanceSemanticSurvivability,
      governanceSemanticDegradationTolerance:
        compareGovernanceSemanticDegradationTolerance.governanceSemanticDegradationTolerance,
      governanceSemanticObservabilityContinuity:
        compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
      governanceSemanticRecoverability:
        compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
      governanceSemanticIntegrityBoundary:
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
      governanceSemanticResilience:
        compareGovernanceSemanticResilience.governanceSemanticResilience,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorTimeline.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: mismatchClassification,
      semanticMaintainabilitySource:
        "compare_governance_semantic_maintainability_semantics_chain",
      semanticMaintainabilitySignals: [
        compareGovernanceSemanticSustainability.governanceSemanticSustainability,
        ...compareGovernanceSemanticSustainability.semanticSustainabilitySignals,
        compareStatus,
        "semantic_sustainability_metadata",
      ],
    });
  const compareGovernanceSemanticEvolvability =
    createCompareGovernanceSemanticEvolvabilityMetadata({
      governanceSemanticEvolvability: governanceSemanticEvolvabilityForSemantics({
        compareHardening,
        governanceSemanticMaintainability:
          compareGovernanceSemanticMaintainability.governanceSemanticMaintainability,
        governanceSemanticSustainability:
          compareGovernanceSemanticSustainability.governanceSemanticSustainability,
        governanceSemanticSurvivability:
          compareGovernanceSemanticSurvivability.governanceSemanticSurvivability,
        governanceSemanticDegradationTolerance:
          compareGovernanceSemanticDegradationTolerance.governanceSemanticDegradationTolerance,
        governanceSemanticObservabilityContinuity:
          compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
        governanceSemanticRecoverability:
          compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
        governanceSemanticIntegrityBoundary:
          compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
        governanceSemanticResilience:
          compareGovernanceSemanticResilience.governanceSemanticResilience,
        governanceSemanticConvergence:
          compareGovernanceSemanticConvergence.governanceSemanticConvergence,
        governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
        governanceReasoningCoherence:
          compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        governanceExplainability:
          compareGovernanceExplainability.governanceExplainability,
        governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
        governanceRetention: compareGovernanceRetention.governanceRetention,
        governanceDisposition: compareGovernanceDisposition.governanceDisposition,
        governancePosture: compareGovernancePosture.governancePosture,
        operationalAttention: compareOperationalAttention.operationalAttention,
        operationalImpact: compareOperationalImpact.operationalImpact,
        decisionReadiness: compareDecisionReadiness.decisionReadiness,
        interpretationStability:
          compareInterpretationStability.interpretationStability,
        compareRisk: compareRisk.compareRisk,
        compareEvidence: compareEvidence.compareEvidence,
        compareConfidence: compareConfidence.compareConfidence,
        projectionFreshness: compareProjectionFreshness.projectionFreshness,
        truthAggregationQuality:
          compareTruthAggregationQuality.truthAggregationQuality,
        severity: compareSeverity.severity,
        operationalPriority: compareOperationalPriority.priority,
        ownerActionability: compareOwnerActionability.ownerActionability,
        reviewReadiness: compareReviewReadiness.readiness,
        escalationReadiness: compareEscalationReadiness.readiness,
        operatorSummary: compareOperatorTimeline.operatorSummary,
        operatorTimeline: compareOperatorTimeline.operatorTimeline,
        operatorMessage: compareOperatorMessage.operatorMessage,
        operatorGuidance: compareOperatorGuidance.operatorGuidance,
        classification: mismatchClassification,
      }),
      compareHardening,
      governanceSemanticMaintainability:
        compareGovernanceSemanticMaintainability.governanceSemanticMaintainability,
      governanceSemanticSustainability:
        compareGovernanceSemanticSustainability.governanceSemanticSustainability,
      governanceSemanticSurvivability:
        compareGovernanceSemanticSurvivability.governanceSemanticSurvivability,
      governanceSemanticDegradationTolerance:
        compareGovernanceSemanticDegradationTolerance.governanceSemanticDegradationTolerance,
      governanceSemanticObservabilityContinuity:
        compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
      governanceSemanticRecoverability:
        compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
      governanceSemanticIntegrityBoundary:
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
      governanceSemanticResilience:
        compareGovernanceSemanticResilience.governanceSemanticResilience,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareSeverity.severity,
      operationalPriority: compareOperationalPriority.priority,
      ownerActionability: compareOwnerActionability.ownerActionability,
      reviewReadiness: compareReviewReadiness.readiness,
      escalationReadiness: compareEscalationReadiness.readiness,
      operatorSummary: compareOperatorTimeline.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      classification: mismatchClassification,
      semanticEvolvabilitySource:
        "compare_governance_semantic_evolvability_semantics_chain",
      semanticEvolvabilitySignals: [
        compareGovernanceSemanticMaintainability.governanceSemanticMaintainability,
        ...compareGovernanceSemanticMaintainability.semanticMaintainabilitySignals,
        compareStatus,
        "semantic_maintainability_metadata",
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
      compareOperatorGuidance,
      compareOperatorMessage,
      compareOperatorTimeline,
      compareConfidence,
      compareProjectionFreshness,
      compareTruthAggregationQuality,
      compareEvidence,
      compareRisk,
      compareInterpretationStability,
      compareDecisionReadiness,
      compareOperationalImpact,
      compareOperationalAttention,
      compareGovernancePosture,
      compareGovernanceDisposition,
      compareGovernanceRetention,
      compareGovernanceAuditTrail,
      compareGovernanceExplainability,
      compareGovernanceReasoningCoherence,
      compareGovernanceSemanticDrift,
      compareGovernanceSemanticConvergence,
      compareGovernanceSemanticResilience,
      compareGovernanceSemanticIntegrityBoundary,
      compareGovernanceSemanticRecoverability,
      compareGovernanceSemanticObservabilityContinuity,
      compareGovernanceSemanticDegradationTolerance,
      compareGovernanceSemanticSurvivability,
      compareGovernanceSemanticSustainability,
      compareGovernanceSemanticMaintainability,
      compareGovernanceSemanticEvolvability,
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

function resolveResponseOperatorGuidance(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOwnerActionability: InventoryCompareOwnerActionabilityMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareOperatorGuidanceMetadata {
  const firstVisibleGuidance = compareProjections.find(
    (projection) => projection.metadata.compareOperatorGuidance,
  )?.metadata.compareOperatorGuidance;

  return (
    firstVisibleGuidance ??
    createCompareOperatorGuidanceMetadata({
      operatorGuidance: guidanceForActionability({
        compareHardening,
        ownerActionability: compareOwnerActionability.ownerActionability,
        ownership: compareOwnerActionability.ownership,
        operationalPriority: compareOwnerActionability.operationalPriority,
        escalationReadiness: compareOwnerActionability.escalationReadiness,
        severity: compareOwnerActionability.severity,
        classification: compareOwnerActionability.classification,
      }),
      ownerActionability: compareOwnerActionability.ownerActionability,
      ownership: compareOwnerActionability.ownership,
      operationalPriority: compareOwnerActionability.operationalPriority,
      escalationReadiness: compareOwnerActionability.escalationReadiness,
      reviewReadiness: compareOwnerActionability.reviewReadiness,
      severity: compareOwnerActionability.severity,
      classification: compareOwnerActionability.classification,
      guidanceSource: "response_level_compare_actionability_chain",
      guidanceSignals: [
        compareOwnerActionability.ownerActionability,
        compareOwnerActionability.ownership,
        compareOwnerActionability.operationalPriority,
        compareOwnerActionability.escalationReadiness,
        compareOwnerActionability.severity,
        compareOwnerActionability.classification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
      ],
    })
  );
}

function resolveResponseOperatorMessage(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorGuidance: InventoryCompareOperatorGuidanceMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareOperatorMessageMetadata {
  const firstVisibleMessage = compareProjections.find(
    (projection) => projection.metadata.compareOperatorMessage,
  )?.metadata.compareOperatorMessage;

  return (
    firstVisibleMessage ??
    createCompareOperatorMessageMetadata({
      operatorMessage: messageForGuidance({
        compareHardening,
        operatorGuidance: compareOperatorGuidance.operatorGuidance,
        ownerActionability: compareOperatorGuidance.ownerActionability,
        ownership: compareOperatorGuidance.ownership,
        operationalPriority: compareOperatorGuidance.operationalPriority,
        severity: compareOperatorGuidance.severity,
        classification: compareOperatorGuidance.classification,
      }),
      operatorGuidance: compareOperatorGuidance.operatorGuidance,
      ownerActionability: compareOperatorGuidance.ownerActionability,
      ownership: compareOperatorGuidance.ownership,
      operationalPriority: compareOperatorGuidance.operationalPriority,
      escalationReadiness: compareOperatorGuidance.escalationReadiness,
      reviewReadiness: compareOperatorGuidance.reviewReadiness,
      severity: compareOperatorGuidance.severity,
      classification: compareOperatorGuidance.classification,
      messageSource: "response_level_compare_guidance_chain",
      messageSignals: [
        compareOperatorGuidance.operatorGuidance,
        compareOperatorGuidance.ownerActionability,
        compareOperatorGuidance.ownership,
        compareOperatorGuidance.operationalPriority,
        compareOperatorGuidance.escalationReadiness,
        compareOperatorGuidance.severity,
        compareOperatorGuidance.classification,
        compareHardening.sourceStatus,
        compareHardening.resultStatus,
        compareHardening.scopeStatus,
      ],
    })
  );
}

function resolveResponseOperatorSummary(
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareOperatorSummaryMetadata {
  const operatorSummary = summaryForCompareResult(compareProjections);
  return createCompareOperatorSummaryMetadata({
    operatorSummary,
    itemCount: compareProjections.length,
    summarySource: "response_level_compare_item_semantics",
    summarySignals: summarySignalsForCompareResult(compareProjections),
  });
}

function resolveResponseOperatorTimeline(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorMessage: InventoryCompareOperatorMessageMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
): InventoryCompareOperatorTimelineMetadata {
  return createCompareOperatorTimelineMetadata({
    operatorTimeline: timelineForSemantics({
      compareHardening,
      operatorGuidance: compareOperatorMessage.operatorGuidance,
      ownerActionability: compareOperatorMessage.ownerActionability,
      ownership: compareOperatorMessage.ownership,
      operationalPriority: compareOperatorMessage.operationalPriority,
      severity: compareOperatorMessage.severity,
      classification: compareOperatorMessage.classification,
      operatorSummary: compareOperatorSummary.operatorSummary,
    }),
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorMessage: compareOperatorMessage.operatorMessage,
    operatorGuidance: compareOperatorMessage.operatorGuidance,
    ownerActionability: compareOperatorMessage.ownerActionability,
    ownership: compareOperatorMessage.ownership,
    operationalPriority: compareOperatorMessage.operationalPriority,
    escalationReadiness: compareOperatorMessage.escalationReadiness,
    reviewReadiness: compareOperatorMessage.reviewReadiness,
    severity: compareOperatorMessage.severity,
    classification: compareOperatorMessage.classification,
    timelineSource: "response_level_operator_summary_chain",
    timelineSignals: [
      compareOperatorSummary.operatorSummary,
      compareOperatorMessage.operatorMessage,
      compareOperatorMessage.operatorGuidance,
      compareOperatorMessage.ownerActionability,
      compareOperatorMessage.ownership,
      compareOperatorMessage.operationalPriority,
      compareOperatorMessage.escalationReadiness,
      compareOperatorMessage.reviewReadiness,
      compareOperatorMessage.severity,
      compareOperatorMessage.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
}

function resolveResponseConfidence(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareConfidenceMetadata {
  const firstBlockedConfidence = compareProjections.find(
    (projection) => projection.metadata.compareConfidence?.compareConfidence === "confidence_blocked",
  )?.metadata.compareConfidence;
  if (firstBlockedConfidence) return firstBlockedConfidence;

  const firstUnverifiedConfidence = compareProjections.find(
    (projection) =>
      projection.metadata.compareConfidence?.compareConfidence === "confidence_unverified",
  )?.metadata.compareConfidence;
  if (firstUnverifiedConfidence) return firstUnverifiedConfidence;

  const firstLowConfidence = compareProjections.find(
    (projection) => projection.metadata.compareConfidence?.compareConfidence === "confidence_low",
  )?.metadata.compareConfidence;
  if (firstLowConfidence) return firstLowConfidence;

  const firstMediumConfidence = compareProjections.find(
    (projection) => projection.metadata.compareConfidence?.compareConfidence === "confidence_medium",
  )?.metadata.compareConfidence;
  if (firstMediumConfidence) return firstMediumConfidence;

  return createCompareConfidenceMetadata({
    compareConfidence: confidenceForSemantics({
      compareHardening,
      classification: compareOperatorTimeline.classification,
      severity: compareOperatorTimeline.severity,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
    }),
    compareHardening,
    classification: compareOperatorTimeline.classification,
    severity: compareOperatorTimeline.severity,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    confidenceSource: "response_level_operator_timeline_chain",
    confidenceSignals: [
      compareOperatorSummary.operatorSummary,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorTimeline.operatorMessage,
      compareOperatorTimeline.operatorGuidance,
      compareOperatorTimeline.ownerActionability,
      compareOperatorTimeline.ownership,
      compareOperatorTimeline.operationalPriority,
      compareOperatorTimeline.escalationReadiness,
      compareOperatorTimeline.reviewReadiness,
      compareOperatorTimeline.severity,
      compareOperatorTimeline.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
}

function resolveResponseProjectionFreshness(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareProjectionFreshnessMetadata {
  const firstUnavailableFreshness = compareProjections.find(
    (projection) =>
      projection.metadata.compareProjectionFreshness?.projectionFreshness ===
      "freshness_unavailable",
  )?.metadata.compareProjectionFreshness;
  if (firstUnavailableFreshness) return firstUnavailableFreshness;

  const firstUnknownFreshness = compareProjections.find(
    (projection) =>
      projection.metadata.compareProjectionFreshness?.projectionFreshness ===
      "freshness_unknown",
  )?.metadata.compareProjectionFreshness;
  if (firstUnknownFreshness) return firstUnknownFreshness;

  const firstStaleFreshness = compareProjections.find(
    (projection) =>
      projection.metadata.compareProjectionFreshness?.projectionFreshness ===
      "freshness_stale",
  )?.metadata.compareProjectionFreshness;
  if (firstStaleFreshness) return firstStaleFreshness;

  const firstRecentFreshness = compareProjections.find(
    (projection) =>
      projection.metadata.compareProjectionFreshness?.projectionFreshness ===
      "freshness_recent",
  )?.metadata.compareProjectionFreshness;
  if (firstRecentFreshness) return firstRecentFreshness;

  return createCompareProjectionFreshnessMetadata({
    projectionFreshness: projectionFreshnessForSemantics({
      compareHardening,
      compareConfidence: compareConfidence.compareConfidence,
      classification: compareOperatorTimeline.classification,
      severity: compareOperatorTimeline.severity,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
    }),
    compareHardening,
    compareConfidence: compareConfidence.compareConfidence,
    classification: compareOperatorTimeline.classification,
    severity: compareOperatorTimeline.severity,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    freshnessSource: "response_level_compare_confidence_chain",
    freshnessSignals: [
      compareConfidence.compareConfidence,
      compareOperatorSummary.operatorSummary,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorTimeline.operatorMessage,
      compareOperatorTimeline.operatorGuidance,
      compareOperatorTimeline.ownerActionability,
      compareOperatorTimeline.ownership,
      compareOperatorTimeline.operationalPriority,
      compareOperatorTimeline.escalationReadiness,
      compareOperatorTimeline.reviewReadiness,
      compareOperatorTimeline.severity,
      compareOperatorTimeline.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
}

function resolveResponseTruthAggregationQuality(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareTruthAggregationQualityMetadata {
  const firstUnavailableQuality = compareProjections.find(
    (projection) =>
      projection.metadata.compareTruthAggregationQuality?.truthAggregationQuality ===
      "truth_quality_unavailable",
  )?.metadata.compareTruthAggregationQuality;
  if (firstUnavailableQuality) return firstUnavailableQuality;

  const firstUnverifiedQuality = compareProjections.find(
    (projection) =>
      projection.metadata.compareTruthAggregationQuality?.truthAggregationQuality ===
      "truth_quality_unverified",
  )?.metadata.compareTruthAggregationQuality;
  if (firstUnverifiedQuality) return firstUnverifiedQuality;

  const firstIncompleteQuality = compareProjections.find(
    (projection) =>
      projection.metadata.compareTruthAggregationQuality?.truthAggregationQuality ===
      "truth_quality_incomplete",
  )?.metadata.compareTruthAggregationQuality;
  if (firstIncompleteQuality) return firstIncompleteQuality;

  const firstWarningQuality = compareProjections.find(
    (projection) =>
      projection.metadata.compareTruthAggregationQuality?.truthAggregationQuality ===
      "truth_quality_warning",
  )?.metadata.compareTruthAggregationQuality;
  if (firstWarningQuality) return firstWarningQuality;

  return createCompareTruthAggregationQualityMetadata({
    truthAggregationQuality: truthAggregationQualityForSemantics({
      compareHardening,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      classification: compareOperatorTimeline.classification,
      severity: compareOperatorTimeline.severity,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
    }),
    compareHardening,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    classification: compareOperatorTimeline.classification,
    severity: compareOperatorTimeline.severity,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    truthQualitySource: "response_level_truth_source_semantics_chain",
    truthQualitySignals: [
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorSummary.operatorSummary,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorTimeline.operatorMessage,
      compareOperatorTimeline.operatorGuidance,
      compareOperatorTimeline.ownerActionability,
      compareOperatorTimeline.ownership,
      compareOperatorTimeline.operationalPriority,
      compareOperatorTimeline.escalationReadiness,
      compareOperatorTimeline.reviewReadiness,
      compareOperatorTimeline.severity,
      compareOperatorTimeline.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
}

function resolveResponseCompareEvidence(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareTruthAggregationQuality: InventoryCompareTruthAggregationQualityMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareEvidenceMetadata {
  const firstUnavailableEvidence = compareProjections.find(
    (projection) =>
      projection.metadata.compareEvidence?.compareEvidence ===
      "evidence_unavailable",
  )?.metadata.compareEvidence;
  if (firstUnavailableEvidence) return firstUnavailableEvidence;

  const firstMissingEvidence = compareProjections.find(
    (projection) =>
      projection.metadata.compareEvidence?.compareEvidence === "evidence_missing",
  )?.metadata.compareEvidence;
  if (firstMissingEvidence) return firstMissingEvidence;

  const firstWeakEvidence = compareProjections.find(
    (projection) =>
      projection.metadata.compareEvidence?.compareEvidence === "evidence_weak",
  )?.metadata.compareEvidence;
  if (firstWeakEvidence) return firstWeakEvidence;

  const firstModerateEvidence = compareProjections.find(
    (projection) =>
      projection.metadata.compareEvidence?.compareEvidence ===
      "evidence_moderate",
  )?.metadata.compareEvidence;
  if (firstModerateEvidence) return firstModerateEvidence;

  return createCompareEvidenceMetadata({
    compareEvidence: compareEvidenceForSemantics({
      compareHardening,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      classification: compareOperatorTimeline.classification,
      severity: compareOperatorTimeline.severity,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
    }),
    compareHardening,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    classification: compareOperatorTimeline.classification,
    severity: compareOperatorTimeline.severity,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    evidenceSource: "response_level_compare_evidence_semantics_chain",
    evidenceSignals: [
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorSummary.operatorSummary,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorTimeline.operatorMessage,
      compareOperatorTimeline.operatorGuidance,
      compareOperatorTimeline.ownerActionability,
      compareOperatorTimeline.ownership,
      compareOperatorTimeline.operationalPriority,
      compareOperatorTimeline.escalationReadiness,
      compareOperatorTimeline.reviewReadiness,
      compareOperatorTimeline.severity,
      compareOperatorTimeline.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
}

function resolveResponseCompareRisk(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareTruthAggregationQuality: InventoryCompareTruthAggregationQualityMetadata,
  compareEvidence: InventoryCompareEvidenceMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareRiskMetadata {
  const firstUnassessableRisk = compareProjections.find(
    (projection) =>
      projection.metadata.compareRisk?.compareRisk === "risk_unassessable",
  )?.metadata.compareRisk;
  if (firstUnassessableRisk) return firstUnassessableRisk;

  const firstCriticalRisk = compareProjections.find(
    (projection) => projection.metadata.compareRisk?.compareRisk === "risk_critical",
  )?.metadata.compareRisk;
  if (firstCriticalRisk) return firstCriticalRisk;

  const firstHighRisk = compareProjections.find(
    (projection) => projection.metadata.compareRisk?.compareRisk === "risk_high",
  )?.metadata.compareRisk;
  if (firstHighRisk) return firstHighRisk;

  const firstMediumRisk = compareProjections.find(
    (projection) => projection.metadata.compareRisk?.compareRisk === "risk_medium",
  )?.metadata.compareRisk;
  if (firstMediumRisk) return firstMediumRisk;

  return createCompareRiskMetadata({
    compareRisk: compareRiskForSemantics({
      compareHardening,
      severity: compareOperatorTimeline.severity,
      operationalPriority: compareOperatorTimeline.operationalPriority,
      ownerActionability: compareOperatorTimeline.ownerActionability,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      compareEvidence: compareEvidence.compareEvidence,
      classification: compareOperatorTimeline.classification,
    }),
    compareHardening,
    severity: compareOperatorTimeline.severity,
    operationalPriority: compareOperatorTimeline.operationalPriority,
    ownerActionability: compareOperatorTimeline.ownerActionability,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    compareEvidence: compareEvidence.compareEvidence,
    classification: compareOperatorTimeline.classification,
    riskSource: "response_level_compare_risk_semantics_chain",
    riskSignals: [
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorSummary.operatorSummary,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorTimeline.operatorMessage,
      compareOperatorTimeline.operatorGuidance,
      compareOperatorTimeline.ownerActionability,
      compareOperatorTimeline.ownership,
      compareOperatorTimeline.operationalPriority,
      compareOperatorTimeline.escalationReadiness,
      compareOperatorTimeline.reviewReadiness,
      compareOperatorTimeline.severity,
      compareOperatorTimeline.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
}

function resolveResponseInterpretationStability(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareTruthAggregationQuality: InventoryCompareTruthAggregationQualityMetadata,
  compareEvidence: InventoryCompareEvidenceMetadata,
  compareRisk: InventoryCompareRiskMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareInterpretationStabilityMetadata {
  const firstUnavailableStability = compareProjections.find(
    (projection) =>
      projection.metadata.compareInterpretationStability
        ?.interpretationStability === "stability_unavailable",
  )?.metadata.compareInterpretationStability;
  if (firstUnavailableStability) return firstUnavailableStability;

  const firstUnverifiedStability = compareProjections.find(
    (projection) =>
      projection.metadata.compareInterpretationStability
        ?.interpretationStability === "stability_unverified",
  )?.metadata.compareInterpretationStability;
  if (firstUnverifiedStability) return firstUnverifiedStability;

  const firstFragileStability = compareProjections.find(
    (projection) =>
      projection.metadata.compareInterpretationStability
        ?.interpretationStability === "stability_fragile",
  )?.metadata.compareInterpretationStability;
  if (firstFragileStability) return firstFragileStability;

  const firstFluctuatingStability = compareProjections.find(
    (projection) =>
      projection.metadata.compareInterpretationStability
        ?.interpretationStability === "stability_fluctuating",
  )?.metadata.compareInterpretationStability;
  if (firstFluctuatingStability) return firstFluctuatingStability;

  return createCompareInterpretationStabilityMetadata({
    interpretationStability: interpretationStabilityForSemantics({
      compareHardening,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      compareEvidence: compareEvidence.compareEvidence,
      compareRisk: compareRisk.compareRisk,
      classification: compareOperatorTimeline.classification,
      severity: compareOperatorTimeline.severity,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
    }),
    compareHardening,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    compareEvidence: compareEvidence.compareEvidence,
    compareRisk: compareRisk.compareRisk,
    classification: compareOperatorTimeline.classification,
    severity: compareOperatorTimeline.severity,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    stabilitySource: "response_level_interpretation_stability_semantics_chain",
    stabilitySignals: [
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorSummary.operatorSummary,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorTimeline.operatorMessage,
      compareOperatorTimeline.operatorGuidance,
      compareOperatorTimeline.ownerActionability,
      compareOperatorTimeline.ownership,
      compareOperatorTimeline.operationalPriority,
      compareOperatorTimeline.escalationReadiness,
      compareOperatorTimeline.reviewReadiness,
      compareOperatorTimeline.severity,
      compareOperatorTimeline.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
}

function resolveResponseDecisionReadiness(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorMessage: InventoryCompareOperatorMessageMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareTruthAggregationQuality: InventoryCompareTruthAggregationQualityMetadata,
  compareEvidence: InventoryCompareEvidenceMetadata,
  compareRisk: InventoryCompareRiskMetadata,
  compareInterpretationStability: InventoryCompareInterpretationStabilityMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareDecisionReadinessMetadata {
  const firstUnavailableDecision = compareProjections.find(
    (projection) =>
      projection.metadata.compareDecisionReadiness?.decisionReadiness ===
      "decision_hold_unavailable",
  )?.metadata.compareDecisionReadiness;
  if (firstUnavailableDecision) return firstUnavailableDecision;

  const firstUnverifiedDecision = compareProjections.find(
    (projection) =>
      projection.metadata.compareDecisionReadiness?.decisionReadiness ===
      "decision_hold_unverified",
  )?.metadata.compareDecisionReadiness;
  if (firstUnverifiedDecision) return firstUnverifiedDecision;

  const firstReviewNeededDecision = compareProjections.find(
    (projection) =>
      projection.metadata.compareDecisionReadiness?.decisionReadiness ===
      "decision_review_needed",
  )?.metadata.compareDecisionReadiness;
  if (firstReviewNeededDecision) return firstReviewNeededDecision;

  const firstReadyDecision = compareProjections.find(
    (projection) =>
      projection.metadata.compareDecisionReadiness?.decisionReadiness ===
      "decision_ready",
  )?.metadata.compareDecisionReadiness;
  if (firstReadyDecision) return firstReadyDecision;

  return createCompareDecisionReadinessMetadata({
    decisionReadiness: decisionReadinessForSemantics({
      compareHardening,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      compareEvidence: compareEvidence.compareEvidence,
      compareRisk: compareRisk.compareRisk,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorMessage.operatorMessage,
      ownerActionability: compareOperatorTimeline.ownerActionability,
      reviewReadiness: compareOperatorTimeline.reviewReadiness,
      escalationReadiness: compareOperatorTimeline.escalationReadiness,
      operationalPriority: compareOperatorTimeline.operationalPriority,
      classification: compareOperatorTimeline.classification,
      severity: compareOperatorTimeline.severity,
    }),
    compareHardening,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    compareEvidence: compareEvidence.compareEvidence,
    compareRisk: compareRisk.compareRisk,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    operatorMessage: compareOperatorMessage.operatorMessage,
    ownerActionability: compareOperatorTimeline.ownerActionability,
    reviewReadiness: compareOperatorTimeline.reviewReadiness,
    escalationReadiness: compareOperatorTimeline.escalationReadiness,
    operationalPriority: compareOperatorTimeline.operationalPriority,
    classification: compareOperatorTimeline.classification,
    severity: compareOperatorTimeline.severity,
    decisionSource: "response_level_decision_readiness_semantics_chain",
    decisionSignals: [
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorSummary.operatorSummary,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorMessage.operatorMessage,
      compareOperatorTimeline.operatorGuidance,
      compareOperatorTimeline.ownerActionability,
      compareOperatorTimeline.ownership,
      compareOperatorTimeline.operationalPriority,
      compareOperatorTimeline.escalationReadiness,
      compareOperatorTimeline.reviewReadiness,
      compareOperatorTimeline.severity,
      compareOperatorTimeline.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
}

function resolveResponseOperationalImpact(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareTruthAggregationQuality: InventoryCompareTruthAggregationQualityMetadata,
  compareEvidence: InventoryCompareEvidenceMetadata,
  compareRisk: InventoryCompareRiskMetadata,
  compareInterpretationStability: InventoryCompareInterpretationStabilityMetadata,
  compareDecisionReadiness: InventoryCompareDecisionReadinessMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareOperationalImpactMetadata {
  const firstUnassessableImpact = compareProjections.find(
    (projection) =>
      projection.metadata.compareOperationalImpact?.operationalImpact ===
      "impact_unassessable",
  )?.metadata.compareOperationalImpact;
  if (firstUnassessableImpact) return firstUnassessableImpact;

  const firstCriticalImpact = compareProjections.find(
    (projection) =>
      projection.metadata.compareOperationalImpact?.operationalImpact ===
      "impact_critical",
  )?.metadata.compareOperationalImpact;
  if (firstCriticalImpact) return firstCriticalImpact;

  const firstOperationalImpact = compareProjections.find(
    (projection) =>
      projection.metadata.compareOperationalImpact?.operationalImpact ===
      "impact_operational",
  )?.metadata.compareOperationalImpact;
  if (firstOperationalImpact) return firstOperationalImpact;

  const firstObservableImpact = compareProjections.find(
    (projection) =>
      projection.metadata.compareOperationalImpact?.operationalImpact ===
      "impact_observable",
  )?.metadata.compareOperationalImpact;
  if (firstObservableImpact) return firstObservableImpact;

  return createCompareOperationalImpactMetadata({
    operationalImpact: operationalImpactForSemantics({
      compareHardening,
      compareRisk: compareRisk.compareRisk,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareOperatorTimeline.severity,
      operationalPriority: compareOperatorTimeline.operationalPriority,
      ownerActionability: compareOperatorTimeline.ownerActionability,
      reviewReadiness: compareOperatorTimeline.reviewReadiness,
      escalationReadiness: compareOperatorTimeline.escalationReadiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      classification: compareOperatorTimeline.classification,
    }),
    compareHardening,
    compareRisk: compareRisk.compareRisk,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareOperatorTimeline.severity,
    operationalPriority: compareOperatorTimeline.operationalPriority,
    ownerActionability: compareOperatorTimeline.ownerActionability,
    reviewReadiness: compareOperatorTimeline.reviewReadiness,
    escalationReadiness: compareOperatorTimeline.escalationReadiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    classification: compareOperatorTimeline.classification,
    impactSource: "response_level_operational_impact_semantics_chain",
    impactSignals: [
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorSummary.operatorSummary,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorTimeline.operatorMessage,
      compareOperatorTimeline.ownerActionability,
      compareOperatorTimeline.operationalPriority,
      compareOperatorTimeline.escalationReadiness,
      compareOperatorTimeline.reviewReadiness,
      compareOperatorTimeline.severity,
      compareOperatorTimeline.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
}

function resolveResponseOperationalAttention(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareTruthAggregationQuality: InventoryCompareTruthAggregationQualityMetadata,
  compareEvidence: InventoryCompareEvidenceMetadata,
  compareRisk: InventoryCompareRiskMetadata,
  compareInterpretationStability: InventoryCompareInterpretationStabilityMetadata,
  compareDecisionReadiness: InventoryCompareDecisionReadinessMetadata,
  compareOperationalImpact: InventoryCompareOperationalImpactMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareOperationalAttentionMetadata {
  const firstUnassessableAttention = compareProjections.find(
    (projection) =>
      projection.metadata.compareOperationalAttention?.operationalAttention ===
      "attention_unassessable",
  )?.metadata.compareOperationalAttention;
  if (firstUnassessableAttention) return firstUnassessableAttention;

  const firstImmediateAttention = compareProjections.find(
    (projection) =>
      projection.metadata.compareOperationalAttention?.operationalAttention ===
      "attention_immediate",
  )?.metadata.compareOperationalAttention;
  if (firstImmediateAttention) return firstImmediateAttention;

  const firstRequiredAttention = compareProjections.find(
    (projection) =>
      projection.metadata.compareOperationalAttention?.operationalAttention ===
      "attention_required",
  )?.metadata.compareOperationalAttention;
  if (firstRequiredAttention) return firstRequiredAttention;

  const firstObserveAttention = compareProjections.find(
    (projection) =>
      projection.metadata.compareOperationalAttention?.operationalAttention ===
      "attention_observe",
  )?.metadata.compareOperationalAttention;
  if (firstObserveAttention) return firstObserveAttention;

  return createCompareOperationalAttentionMetadata({
    operationalAttention: operationalAttentionForSemantics({
      compareHardening,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareOperatorTimeline.severity,
      operationalPriority: compareOperatorTimeline.operationalPriority,
      ownerActionability: compareOperatorTimeline.ownerActionability,
      reviewReadiness: compareOperatorTimeline.reviewReadiness,
      escalationReadiness: compareOperatorTimeline.escalationReadiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      classification: compareOperatorTimeline.classification,
    }),
    compareHardening,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareOperatorTimeline.severity,
    operationalPriority: compareOperatorTimeline.operationalPriority,
    ownerActionability: compareOperatorTimeline.ownerActionability,
    reviewReadiness: compareOperatorTimeline.reviewReadiness,
    escalationReadiness: compareOperatorTimeline.escalationReadiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    classification: compareOperatorTimeline.classification,
    attentionSource: "response_level_operational_attention_semantics_chain",
    attentionSignals: [
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorSummary.operatorSummary,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorTimeline.operatorMessage,
      compareOperatorTimeline.ownerActionability,
      compareOperatorTimeline.operationalPriority,
      compareOperatorTimeline.escalationReadiness,
      compareOperatorTimeline.reviewReadiness,
      compareOperatorTimeline.severity,
      compareOperatorTimeline.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
}

function resolveResponseGovernancePosture(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareTruthAggregationQuality: InventoryCompareTruthAggregationQualityMetadata,
  compareEvidence: InventoryCompareEvidenceMetadata,
  compareRisk: InventoryCompareRiskMetadata,
  compareInterpretationStability: InventoryCompareInterpretationStabilityMetadata,
  compareDecisionReadiness: InventoryCompareDecisionReadinessMetadata,
  compareOperationalImpact: InventoryCompareOperationalImpactMetadata,
  compareOperationalAttention: InventoryCompareOperationalAttentionMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareGovernancePostureMetadata {
  const firstUnassessablePosture = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernancePosture?.governancePosture ===
      "posture_unassessable",
  )?.metadata.compareGovernancePosture;
  if (firstUnassessablePosture) return firstUnassessablePosture;

  const firstEscalatedPosture = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernancePosture?.governancePosture ===
      "posture_escalated",
  )?.metadata.compareGovernancePosture;
  if (firstEscalatedPosture) return firstEscalatedPosture;

  const firstReviewPosture = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernancePosture?.governancePosture ===
      "posture_review",
  )?.metadata.compareGovernancePosture;
  if (firstReviewPosture) return firstReviewPosture;

  const firstObservePosture = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernancePosture?.governancePosture ===
      "posture_observe",
  )?.metadata.compareGovernancePosture;
  if (firstObservePosture) return firstObservePosture;

  return createCompareGovernancePostureMetadata({
    governancePosture: governancePostureForSemantics({
      compareHardening,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareOperatorTimeline.severity,
      operationalPriority: compareOperatorTimeline.operationalPriority,
      ownerActionability: compareOperatorTimeline.ownerActionability,
      reviewReadiness: compareOperatorTimeline.reviewReadiness,
      escalationReadiness: compareOperatorTimeline.escalationReadiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      classification: compareOperatorTimeline.classification,
    }),
    compareHardening,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareOperatorTimeline.severity,
    operationalPriority: compareOperatorTimeline.operationalPriority,
    ownerActionability: compareOperatorTimeline.ownerActionability,
    reviewReadiness: compareOperatorTimeline.reviewReadiness,
    escalationReadiness: compareOperatorTimeline.escalationReadiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    classification: compareOperatorTimeline.classification,
    postureSource: "response_level_governance_posture_semantics_chain",
    postureSignals: [
      compareOperationalAttention.operationalAttention,
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorSummary.operatorSummary,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorTimeline.operatorMessage,
      compareOperatorTimeline.ownerActionability,
      compareOperatorTimeline.operationalPriority,
      compareOperatorTimeline.escalationReadiness,
      compareOperatorTimeline.reviewReadiness,
      compareOperatorTimeline.severity,
      compareOperatorTimeline.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
}

function resolveResponseGovernanceDisposition(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareTruthAggregationQuality: InventoryCompareTruthAggregationQualityMetadata,
  compareEvidence: InventoryCompareEvidenceMetadata,
  compareRisk: InventoryCompareRiskMetadata,
  compareInterpretationStability: InventoryCompareInterpretationStabilityMetadata,
  compareDecisionReadiness: InventoryCompareDecisionReadinessMetadata,
  compareOperationalImpact: InventoryCompareOperationalImpactMetadata,
  compareOperationalAttention: InventoryCompareOperationalAttentionMetadata,
  compareGovernancePosture: InventoryCompareGovernancePostureMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareGovernanceDispositionMetadata {
  const firstHoldDisposition = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceDisposition?.governanceDisposition ===
      "disposition_hold",
  )?.metadata.compareGovernanceDisposition;
  if (firstHoldDisposition) return firstHoldDisposition;

  const firstEscalatedDisposition = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceDisposition?.governanceDisposition ===
      "disposition_escalated_queue",
  )?.metadata.compareGovernanceDisposition;
  if (firstEscalatedDisposition) return firstEscalatedDisposition;

  const firstReviewDisposition = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceDisposition?.governanceDisposition ===
      "disposition_review_queue",
  )?.metadata.compareGovernanceDisposition;
  if (firstReviewDisposition) return firstReviewDisposition;

  const firstObserveDisposition = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceDisposition?.governanceDisposition ===
      "disposition_observe_queue",
  )?.metadata.compareGovernanceDisposition;
  if (firstObserveDisposition) return firstObserveDisposition;

  return createCompareGovernanceDispositionMetadata({
    governanceDisposition: governanceDispositionForSemantics({
      compareHardening,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareOperatorTimeline.severity,
      operationalPriority: compareOperatorTimeline.operationalPriority,
      ownerActionability: compareOperatorTimeline.ownerActionability,
      reviewReadiness: compareOperatorTimeline.reviewReadiness,
      escalationReadiness: compareOperatorTimeline.escalationReadiness,
      classification: compareOperatorTimeline.classification,
    }),
    compareHardening,
    governancePosture: compareGovernancePosture.governancePosture,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareOperatorTimeline.severity,
    operationalPriority: compareOperatorTimeline.operationalPriority,
    ownerActionability: compareOperatorTimeline.ownerActionability,
    reviewReadiness: compareOperatorTimeline.reviewReadiness,
    escalationReadiness: compareOperatorTimeline.escalationReadiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    classification: compareOperatorTimeline.classification,
    dispositionSource: "response_level_governance_disposition_semantics_chain",
    dispositionSignals: [
      compareGovernancePosture.governancePosture,
      compareOperationalAttention.operationalAttention,
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorSummary.operatorSummary,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorTimeline.operatorMessage,
      compareOperatorTimeline.ownerActionability,
      compareOperatorTimeline.operationalPriority,
      compareOperatorTimeline.escalationReadiness,
      compareOperatorTimeline.reviewReadiness,
      compareOperatorTimeline.severity,
      compareOperatorTimeline.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
}

function resolveResponseGovernanceRetention(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareTruthAggregationQuality: InventoryCompareTruthAggregationQualityMetadata,
  compareEvidence: InventoryCompareEvidenceMetadata,
  compareRisk: InventoryCompareRiskMetadata,
  compareInterpretationStability: InventoryCompareInterpretationStabilityMetadata,
  compareDecisionReadiness: InventoryCompareDecisionReadinessMetadata,
  compareOperationalImpact: InventoryCompareOperationalImpactMetadata,
  compareOperationalAttention: InventoryCompareOperationalAttentionMetadata,
  compareGovernancePosture: InventoryCompareGovernancePostureMetadata,
  compareGovernanceDisposition: InventoryCompareGovernanceDispositionMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareGovernanceRetentionMetadata {
  const firstHoldRetention = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceRetention?.governanceRetention ===
      "retention_hold",
  )?.metadata.compareGovernanceRetention;
  if (firstHoldRetention) return firstHoldRetention;

  const firstPersistentRetention = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceRetention?.governanceRetention ===
      "retention_persistent",
  )?.metadata.compareGovernanceRetention;
  if (firstPersistentRetention) return firstPersistentRetention;

  const firstReviewRetention = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceRetention?.governanceRetention ===
      "retention_review",
  )?.metadata.compareGovernanceRetention;
  if (firstReviewRetention) return firstReviewRetention;

  const firstObserveRetention = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceRetention?.governanceRetention ===
      "retention_observe",
  )?.metadata.compareGovernanceRetention;
  if (firstObserveRetention) return firstObserveRetention;

  return createCompareGovernanceRetentionMetadata({
    governanceRetention: governanceRetentionForSemantics({
      compareHardening,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareOperatorTimeline.severity,
      operationalPriority: compareOperatorTimeline.operationalPriority,
      ownerActionability: compareOperatorTimeline.ownerActionability,
      reviewReadiness: compareOperatorTimeline.reviewReadiness,
      escalationReadiness: compareOperatorTimeline.escalationReadiness,
      classification: compareOperatorTimeline.classification,
    }),
    compareHardening,
    governanceDisposition: compareGovernanceDisposition.governanceDisposition,
    governancePosture: compareGovernancePosture.governancePosture,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareOperatorTimeline.severity,
    operationalPriority: compareOperatorTimeline.operationalPriority,
    ownerActionability: compareOperatorTimeline.ownerActionability,
    reviewReadiness: compareOperatorTimeline.reviewReadiness,
    escalationReadiness: compareOperatorTimeline.escalationReadiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    classification: compareOperatorTimeline.classification,
    retentionSource: "response_level_governance_retention_semantics_chain",
    retentionSignals: [
      compareGovernanceDisposition.governanceDisposition,
      compareGovernancePosture.governancePosture,
      compareOperationalAttention.operationalAttention,
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorSummary.operatorSummary,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorTimeline.operatorMessage,
      compareOperatorTimeline.ownerActionability,
      compareOperatorTimeline.operationalPriority,
      compareOperatorTimeline.escalationReadiness,
      compareOperatorTimeline.reviewReadiness,
      compareOperatorTimeline.severity,
      compareOperatorTimeline.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
    ],
  });
}

function resolveResponseGovernanceAuditTrail(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareTruthAggregationQuality: InventoryCompareTruthAggregationQualityMetadata,
  compareEvidence: InventoryCompareEvidenceMetadata,
  compareRisk: InventoryCompareRiskMetadata,
  compareInterpretationStability: InventoryCompareInterpretationStabilityMetadata,
  compareDecisionReadiness: InventoryCompareDecisionReadinessMetadata,
  compareOperationalImpact: InventoryCompareOperationalImpactMetadata,
  compareOperationalAttention: InventoryCompareOperationalAttentionMetadata,
  compareGovernancePosture: InventoryCompareGovernancePostureMetadata,
  compareGovernanceDisposition: InventoryCompareGovernanceDispositionMetadata,
  compareGovernanceRetention: InventoryCompareGovernanceRetentionMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareGovernanceAuditTrailMetadata {
  const firstUnavailableAuditTrail = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceAuditTrail?.governanceAuditTrail ===
      "audit_unavailable",
  )?.metadata.compareGovernanceAuditTrail;
  if (firstUnavailableAuditTrail) return firstUnavailableAuditTrail;

  const firstMissingAuditTrail = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceAuditTrail?.governanceAuditTrail ===
      "audit_missing",
  )?.metadata.compareGovernanceAuditTrail;
  if (firstMissingAuditTrail) return firstMissingAuditTrail;

  const firstWeakAuditTrail = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceAuditTrail?.governanceAuditTrail ===
      "audit_weak",
  )?.metadata.compareGovernanceAuditTrail;
  if (firstWeakAuditTrail) return firstWeakAuditTrail;

  const firstPartialAuditTrail = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceAuditTrail?.governanceAuditTrail ===
      "audit_partial",
  )?.metadata.compareGovernanceAuditTrail;
  if (firstPartialAuditTrail) return firstPartialAuditTrail;

  return createCompareGovernanceAuditTrailMetadata({
    governanceAuditTrail: governanceAuditTrailForSemantics({
      compareHardening,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareOperatorTimeline.severity,
      operationalPriority: compareOperatorTimeline.operationalPriority,
      ownerActionability: compareOperatorTimeline.ownerActionability,
      reviewReadiness: compareOperatorTimeline.reviewReadiness,
      escalationReadiness: compareOperatorTimeline.escalationReadiness,
      classification: compareOperatorTimeline.classification,
    }),
    compareHardening,
    governanceRetention: compareGovernanceRetention.governanceRetention,
    governanceDisposition: compareGovernanceDisposition.governanceDisposition,
    governancePosture: compareGovernancePosture.governancePosture,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareOperatorTimeline.severity,
    operationalPriority: compareOperatorTimeline.operationalPriority,
    ownerActionability: compareOperatorTimeline.ownerActionability,
    reviewReadiness: compareOperatorTimeline.reviewReadiness,
    escalationReadiness: compareOperatorTimeline.escalationReadiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    classification: compareOperatorTimeline.classification,
    auditTrailSource: "response_level_governance_audit_trail_semantics_chain",
    auditTrailSignals: [
      compareGovernanceRetention.governanceRetention,
      compareGovernanceDisposition.governanceDisposition,
      compareGovernancePosture.governancePosture,
      compareOperationalAttention.operationalAttention,
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorSummary.operatorSummary,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorTimeline.operatorMessage,
      compareOperatorTimeline.ownerActionability,
      compareOperatorTimeline.operationalPriority,
      compareOperatorTimeline.escalationReadiness,
      compareOperatorTimeline.reviewReadiness,
      compareOperatorTimeline.severity,
      compareOperatorTimeline.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      "truth_source_inventory_transactions",
      "cache_compare_target_inventory_current",
      "read_only_boundary",
    ],
  });
}

function resolveResponseGovernanceExplainability(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareTruthAggregationQuality: InventoryCompareTruthAggregationQualityMetadata,
  compareEvidence: InventoryCompareEvidenceMetadata,
  compareRisk: InventoryCompareRiskMetadata,
  compareInterpretationStability: InventoryCompareInterpretationStabilityMetadata,
  compareDecisionReadiness: InventoryCompareDecisionReadinessMetadata,
  compareOperationalImpact: InventoryCompareOperationalImpactMetadata,
  compareOperationalAttention: InventoryCompareOperationalAttentionMetadata,
  compareGovernancePosture: InventoryCompareGovernancePostureMetadata,
  compareGovernanceDisposition: InventoryCompareGovernanceDispositionMetadata,
  compareGovernanceRetention: InventoryCompareGovernanceRetentionMetadata,
  compareGovernanceAuditTrail: InventoryCompareGovernanceAuditTrailMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareGovernanceExplainabilityMetadata {
  const firstUnavailableExplainability = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceExplainability
        ?.governanceExplainability === "explainability_unavailable",
  )?.metadata.compareGovernanceExplainability;
  if (firstUnavailableExplainability) return firstUnavailableExplainability;

  const firstNotExplainable = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceExplainability
        ?.governanceExplainability === "not_explainable",
  )?.metadata.compareGovernanceExplainability;
  if (firstNotExplainable) return firstNotExplainable;

  const firstWeakExplainability = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceExplainability
        ?.governanceExplainability === "weakly_explainable",
  )?.metadata.compareGovernanceExplainability;
  if (firstWeakExplainability) return firstWeakExplainability;

  const firstPartialExplainability = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceExplainability
        ?.governanceExplainability === "partially_explainable",
  )?.metadata.compareGovernanceExplainability;
  if (firstPartialExplainability) return firstPartialExplainability;

  return createCompareGovernanceExplainabilityMetadata({
    governanceExplainability: governanceExplainabilityForSemantics({
      compareHardening,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareOperatorTimeline.severity,
      operationalPriority: compareOperatorTimeline.operationalPriority,
      ownerActionability: compareOperatorTimeline.ownerActionability,
      reviewReadiness: compareOperatorTimeline.reviewReadiness,
      escalationReadiness: compareOperatorTimeline.escalationReadiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorTimeline.operatorMessage,
      operatorGuidance: compareOperatorTimeline.operatorGuidance,
      classification: compareOperatorTimeline.classification,
    }),
    compareHardening,
    governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
    governanceRetention: compareGovernanceRetention.governanceRetention,
    governanceDisposition: compareGovernanceDisposition.governanceDisposition,
    governancePosture: compareGovernancePosture.governancePosture,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareOperatorTimeline.severity,
    operationalPriority: compareOperatorTimeline.operationalPriority,
    ownerActionability: compareOperatorTimeline.ownerActionability,
    reviewReadiness: compareOperatorTimeline.reviewReadiness,
    escalationReadiness: compareOperatorTimeline.escalationReadiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    operatorMessage: compareOperatorTimeline.operatorMessage,
    operatorGuidance: compareOperatorTimeline.operatorGuidance,
    classification: compareOperatorTimeline.classification,
    explainabilitySource: "response_level_governance_explainability_semantics_chain",
    explainabilitySignals: [
      compareGovernanceAuditTrail.governanceAuditTrail,
      compareGovernanceRetention.governanceRetention,
      compareGovernanceDisposition.governanceDisposition,
      compareGovernancePosture.governancePosture,
      compareOperationalAttention.operationalAttention,
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorSummary.operatorSummary,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorTimeline.operatorMessage,
      compareOperatorTimeline.operatorGuidance,
      compareOperatorTimeline.ownerActionability,
      compareOperatorTimeline.operationalPriority,
      compareOperatorTimeline.escalationReadiness,
      compareOperatorTimeline.reviewReadiness,
      compareOperatorTimeline.severity,
      compareOperatorTimeline.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      "truth_source_inventory_transactions",
      "cache_compare_target_inventory_current",
      "read_only_boundary",
    ],
  });
}

function resolveResponseGovernanceReasoningCoherence(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareTruthAggregationQuality: InventoryCompareTruthAggregationQualityMetadata,
  compareEvidence: InventoryCompareEvidenceMetadata,
  compareRisk: InventoryCompareRiskMetadata,
  compareInterpretationStability: InventoryCompareInterpretationStabilityMetadata,
  compareDecisionReadiness: InventoryCompareDecisionReadinessMetadata,
  compareOperationalImpact: InventoryCompareOperationalImpactMetadata,
  compareOperationalAttention: InventoryCompareOperationalAttentionMetadata,
  compareGovernancePosture: InventoryCompareGovernancePostureMetadata,
  compareGovernanceDisposition: InventoryCompareGovernanceDispositionMetadata,
  compareGovernanceRetention: InventoryCompareGovernanceRetentionMetadata,
  compareGovernanceAuditTrail: InventoryCompareGovernanceAuditTrailMetadata,
  compareGovernanceExplainability: InventoryCompareGovernanceExplainabilityMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareGovernanceReasoningCoherenceMetadata {
  const firstUnavailableCoherence = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceReasoningCoherence
        ?.governanceReasoningCoherence === "reasoning_unavailable",
  )?.metadata.compareGovernanceReasoningCoherence;
  if (firstUnavailableCoherence) return firstUnavailableCoherence;

  const firstContradictoryCoherence = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceReasoningCoherence
        ?.governanceReasoningCoherence === "contradictory_reasoning",
  )?.metadata.compareGovernanceReasoningCoherence;
  if (firstContradictoryCoherence) return firstContradictoryCoherence;

  const firstFragileCoherence = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceReasoningCoherence
        ?.governanceReasoningCoherence === "fragile_reasoning",
  )?.metadata.compareGovernanceReasoningCoherence;
  if (firstFragileCoherence) return firstFragileCoherence;

  const firstPartialCoherence = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceReasoningCoherence
        ?.governanceReasoningCoherence === "partially_coherent",
  )?.metadata.compareGovernanceReasoningCoherence;
  if (firstPartialCoherence) return firstPartialCoherence;

  return createCompareGovernanceReasoningCoherenceMetadata({
    governanceReasoningCoherence: governanceReasoningCoherenceForSemantics({
      compareHardening,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareOperatorTimeline.severity,
      operationalPriority: compareOperatorTimeline.operationalPriority,
      ownerActionability: compareOperatorTimeline.ownerActionability,
      reviewReadiness: compareOperatorTimeline.reviewReadiness,
      escalationReadiness: compareOperatorTimeline.escalationReadiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorTimeline.operatorMessage,
      operatorGuidance: compareOperatorTimeline.operatorGuidance,
      classification: compareOperatorTimeline.classification,
    }),
    compareHardening,
    governanceExplainability:
      compareGovernanceExplainability.governanceExplainability,
    governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
    governanceRetention: compareGovernanceRetention.governanceRetention,
    governanceDisposition: compareGovernanceDisposition.governanceDisposition,
    governancePosture: compareGovernancePosture.governancePosture,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareOperatorTimeline.severity,
    operationalPriority: compareOperatorTimeline.operationalPriority,
    ownerActionability: compareOperatorTimeline.ownerActionability,
    reviewReadiness: compareOperatorTimeline.reviewReadiness,
    escalationReadiness: compareOperatorTimeline.escalationReadiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    operatorMessage: compareOperatorTimeline.operatorMessage,
    operatorGuidance: compareOperatorTimeline.operatorGuidance,
    classification: compareOperatorTimeline.classification,
    reasoningCoherenceSource:
      "response_level_governance_reasoning_coherence_semantics_chain",
    reasoningCoherenceSignals: [
      compareGovernanceExplainability.governanceExplainability,
      compareGovernanceAuditTrail.governanceAuditTrail,
      compareGovernanceRetention.governanceRetention,
      compareGovernanceDisposition.governanceDisposition,
      compareGovernancePosture.governancePosture,
      compareOperationalAttention.operationalAttention,
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorSummary.operatorSummary,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorTimeline.operatorMessage,
      compareOperatorTimeline.operatorGuidance,
      compareOperatorTimeline.ownerActionability,
      compareOperatorTimeline.operationalPriority,
      compareOperatorTimeline.escalationReadiness,
      compareOperatorTimeline.reviewReadiness,
      compareOperatorTimeline.severity,
      compareOperatorTimeline.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      "truth_source_inventory_transactions",
      "cache_compare_target_inventory_current",
      "read_only_boundary",
      "traceability_metadata",
    ],
  });
}

function resolveResponseGovernanceSemanticDrift(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareTruthAggregationQuality: InventoryCompareTruthAggregationQualityMetadata,
  compareEvidence: InventoryCompareEvidenceMetadata,
  compareRisk: InventoryCompareRiskMetadata,
  compareInterpretationStability: InventoryCompareInterpretationStabilityMetadata,
  compareDecisionReadiness: InventoryCompareDecisionReadinessMetadata,
  compareOperationalImpact: InventoryCompareOperationalImpactMetadata,
  compareOperationalAttention: InventoryCompareOperationalAttentionMetadata,
  compareGovernancePosture: InventoryCompareGovernancePostureMetadata,
  compareGovernanceDisposition: InventoryCompareGovernanceDispositionMetadata,
  compareGovernanceRetention: InventoryCompareGovernanceRetentionMetadata,
  compareGovernanceAuditTrail: InventoryCompareGovernanceAuditTrailMetadata,
  compareGovernanceExplainability: InventoryCompareGovernanceExplainabilityMetadata,
  compareGovernanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherenceMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareGovernanceSemanticDriftMetadata {
  const firstUnavailableDrift = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticDrift?.governanceSemanticDrift ===
      "drift_unavailable",
  )?.metadata.compareGovernanceSemanticDrift;
  if (firstUnavailableDrift) return firstUnavailableDrift;

  const firstSevereDrift = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticDrift?.governanceSemanticDrift ===
      "severely_drifting",
  )?.metadata.compareGovernanceSemanticDrift;
  if (firstSevereDrift) return firstSevereDrift;

  const firstDrifting = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticDrift?.governanceSemanticDrift ===
      "drifting_semantics",
  )?.metadata.compareGovernanceSemanticDrift;
  if (firstDrifting) return firstDrifting;

  const firstSlightDrift = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticDrift?.governanceSemanticDrift ===
      "slightly_drifting",
  )?.metadata.compareGovernanceSemanticDrift;
  if (firstSlightDrift) return firstSlightDrift;

  return createCompareGovernanceSemanticDriftMetadata({
    governanceSemanticDrift: governanceSemanticDriftForSemantics({
      compareHardening,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareOperatorTimeline.severity,
      operationalPriority: compareOperatorTimeline.operationalPriority,
      ownerActionability: compareOperatorTimeline.ownerActionability,
      reviewReadiness: compareOperatorTimeline.reviewReadiness,
      escalationReadiness: compareOperatorTimeline.escalationReadiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorTimeline.operatorMessage,
      operatorGuidance: compareOperatorTimeline.operatorGuidance,
      classification: compareOperatorTimeline.classification,
    }),
    compareHardening,
    governanceReasoningCoherence:
      compareGovernanceReasoningCoherence.governanceReasoningCoherence,
    governanceExplainability:
      compareGovernanceExplainability.governanceExplainability,
    governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
    governanceRetention: compareGovernanceRetention.governanceRetention,
    governanceDisposition: compareGovernanceDisposition.governanceDisposition,
    governancePosture: compareGovernancePosture.governancePosture,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareOperatorTimeline.severity,
    operationalPriority: compareOperatorTimeline.operationalPriority,
    ownerActionability: compareOperatorTimeline.ownerActionability,
    reviewReadiness: compareOperatorTimeline.reviewReadiness,
    escalationReadiness: compareOperatorTimeline.escalationReadiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    operatorMessage: compareOperatorTimeline.operatorMessage,
    operatorGuidance: compareOperatorTimeline.operatorGuidance,
    classification: compareOperatorTimeline.classification,
    semanticDriftSource: "response_level_governance_semantic_drift_semantics_chain",
    semanticDriftSignals: [
      compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      compareGovernanceExplainability.governanceExplainability,
      compareGovernanceAuditTrail.governanceAuditTrail,
      compareGovernanceRetention.governanceRetention,
      compareGovernanceDisposition.governanceDisposition,
      compareGovernancePosture.governancePosture,
      compareOperationalAttention.operationalAttention,
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorSummary.operatorSummary,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorTimeline.operatorMessage,
      compareOperatorTimeline.operatorGuidance,
      compareOperatorTimeline.ownerActionability,
      compareOperatorTimeline.operationalPriority,
      compareOperatorTimeline.escalationReadiness,
      compareOperatorTimeline.reviewReadiness,
      compareOperatorTimeline.severity,
      compareOperatorTimeline.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      "truth_source_inventory_transactions",
      "cache_compare_target_inventory_current",
      "read_only_boundary",
      "freshness_semantics_metadata",
    ],
  });
}

function resolveResponseGovernanceSemanticConvergence(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareTruthAggregationQuality: InventoryCompareTruthAggregationQualityMetadata,
  compareEvidence: InventoryCompareEvidenceMetadata,
  compareRisk: InventoryCompareRiskMetadata,
  compareInterpretationStability: InventoryCompareInterpretationStabilityMetadata,
  compareDecisionReadiness: InventoryCompareDecisionReadinessMetadata,
  compareOperationalImpact: InventoryCompareOperationalImpactMetadata,
  compareOperationalAttention: InventoryCompareOperationalAttentionMetadata,
  compareGovernancePosture: InventoryCompareGovernancePostureMetadata,
  compareGovernanceDisposition: InventoryCompareGovernanceDispositionMetadata,
  compareGovernanceRetention: InventoryCompareGovernanceRetentionMetadata,
  compareGovernanceAuditTrail: InventoryCompareGovernanceAuditTrailMetadata,
  compareGovernanceExplainability: InventoryCompareGovernanceExplainabilityMetadata,
  compareGovernanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherenceMetadata,
  compareGovernanceSemanticDrift: InventoryCompareGovernanceSemanticDriftMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareGovernanceSemanticConvergenceMetadata {
  const firstUnavailableConvergence = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticConvergence
        ?.governanceSemanticConvergence === "convergence_unavailable",
  )?.metadata.compareGovernanceSemanticConvergence;
  if (firstUnavailableConvergence) return firstUnavailableConvergence;

  const firstNonconverging = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticConvergence
        ?.governanceSemanticConvergence === "nonconverging_semantics",
  )?.metadata.compareGovernanceSemanticConvergence;
  if (firstNonconverging) return firstNonconverging;

  const firstSlowConvergence = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticConvergence
        ?.governanceSemanticConvergence === "slow_convergence",
  )?.metadata.compareGovernanceSemanticConvergence;
  if (firstSlowConvergence) return firstSlowConvergence;

  const firstConverging = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticConvergence
        ?.governanceSemanticConvergence === "converging_semantics",
  )?.metadata.compareGovernanceSemanticConvergence;
  if (firstConverging) return firstConverging;

  return createCompareGovernanceSemanticConvergenceMetadata({
    governanceSemanticConvergence: governanceSemanticConvergenceForSemantics({
      compareHardening,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareOperatorTimeline.severity,
      operationalPriority: compareOperatorTimeline.operationalPriority,
      ownerActionability: compareOperatorTimeline.ownerActionability,
      reviewReadiness: compareOperatorTimeline.reviewReadiness,
      escalationReadiness: compareOperatorTimeline.escalationReadiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorTimeline.operatorMessage,
      operatorGuidance: compareOperatorTimeline.operatorGuidance,
      classification: compareOperatorTimeline.classification,
    }),
    compareHardening,
    governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
    governanceReasoningCoherence:
      compareGovernanceReasoningCoherence.governanceReasoningCoherence,
    governanceExplainability:
      compareGovernanceExplainability.governanceExplainability,
    governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
    governanceRetention: compareGovernanceRetention.governanceRetention,
    governanceDisposition: compareGovernanceDisposition.governanceDisposition,
    governancePosture: compareGovernancePosture.governancePosture,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareOperatorTimeline.severity,
    operationalPriority: compareOperatorTimeline.operationalPriority,
    ownerActionability: compareOperatorTimeline.ownerActionability,
    reviewReadiness: compareOperatorTimeline.reviewReadiness,
    escalationReadiness: compareOperatorTimeline.escalationReadiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    operatorMessage: compareOperatorTimeline.operatorMessage,
    operatorGuidance: compareOperatorTimeline.operatorGuidance,
    classification: compareOperatorTimeline.classification,
    semanticConvergenceSource:
      "response_level_governance_semantic_convergence_semantics_chain",
    semanticConvergenceSignals: [
      compareGovernanceSemanticDrift.governanceSemanticDrift,
      compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      compareGovernanceExplainability.governanceExplainability,
      compareGovernanceAuditTrail.governanceAuditTrail,
      compareGovernanceRetention.governanceRetention,
      compareGovernanceDisposition.governanceDisposition,
      compareGovernancePosture.governancePosture,
      compareOperationalAttention.operationalAttention,
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorSummary.operatorSummary,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorTimeline.operatorMessage,
      compareOperatorTimeline.operatorGuidance,
      compareOperatorTimeline.ownerActionability,
      compareOperatorTimeline.operationalPriority,
      compareOperatorTimeline.escalationReadiness,
      compareOperatorTimeline.reviewReadiness,
      compareOperatorTimeline.severity,
      compareOperatorTimeline.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      "truth_source_inventory_transactions",
      "cache_compare_target_inventory_current",
      "read_only_boundary",
      "semantic_drift_metadata",
    ],
  });
}

function resolveResponseGovernanceSemanticResilience(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareTruthAggregationQuality: InventoryCompareTruthAggregationQualityMetadata,
  compareEvidence: InventoryCompareEvidenceMetadata,
  compareRisk: InventoryCompareRiskMetadata,
  compareInterpretationStability: InventoryCompareInterpretationStabilityMetadata,
  compareDecisionReadiness: InventoryCompareDecisionReadinessMetadata,
  compareOperationalImpact: InventoryCompareOperationalImpactMetadata,
  compareOperationalAttention: InventoryCompareOperationalAttentionMetadata,
  compareGovernancePosture: InventoryCompareGovernancePostureMetadata,
  compareGovernanceDisposition: InventoryCompareGovernanceDispositionMetadata,
  compareGovernanceRetention: InventoryCompareGovernanceRetentionMetadata,
  compareGovernanceAuditTrail: InventoryCompareGovernanceAuditTrailMetadata,
  compareGovernanceExplainability: InventoryCompareGovernanceExplainabilityMetadata,
  compareGovernanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherenceMetadata,
  compareGovernanceSemanticDrift: InventoryCompareGovernanceSemanticDriftMetadata,
  compareGovernanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergenceMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareGovernanceSemanticResilienceMetadata {
  const firstUnavailableResilience = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticResilience
        ?.governanceSemanticResilience === "resilience_unavailable",
  )?.metadata.compareGovernanceSemanticResilience;
  if (firstUnavailableResilience) return firstUnavailableResilience;

  const firstCollapsedResilience = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticResilience
        ?.governanceSemanticResilience === "collapsed_resilience",
  )?.metadata.compareGovernanceSemanticResilience;
  if (firstCollapsedResilience) return firstCollapsedResilience;

  const firstFragileResilience = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticResilience
        ?.governanceSemanticResilience === "fragile_resilience",
  )?.metadata.compareGovernanceSemanticResilience;
  if (firstFragileResilience) return firstFragileResilience;

  const firstPartiallyResilient = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticResilience
        ?.governanceSemanticResilience === "partially_resilient",
  )?.metadata.compareGovernanceSemanticResilience;
  if (firstPartiallyResilient) return firstPartiallyResilient;

  return createCompareGovernanceSemanticResilienceMetadata({
    governanceSemanticResilience: governanceSemanticResilienceForSemantics({
      compareHardening,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareOperatorTimeline.severity,
      operationalPriority: compareOperatorTimeline.operationalPriority,
      ownerActionability: compareOperatorTimeline.ownerActionability,
      reviewReadiness: compareOperatorTimeline.reviewReadiness,
      escalationReadiness: compareOperatorTimeline.escalationReadiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorTimeline.operatorMessage,
      operatorGuidance: compareOperatorTimeline.operatorGuidance,
      classification: compareOperatorTimeline.classification,
    }),
    compareHardening,
    governanceSemanticConvergence:
      compareGovernanceSemanticConvergence.governanceSemanticConvergence,
    governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
    governanceReasoningCoherence:
      compareGovernanceReasoningCoherence.governanceReasoningCoherence,
    governanceExplainability:
      compareGovernanceExplainability.governanceExplainability,
    governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
    governanceRetention: compareGovernanceRetention.governanceRetention,
    governanceDisposition: compareGovernanceDisposition.governanceDisposition,
    governancePosture: compareGovernancePosture.governancePosture,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareOperatorTimeline.severity,
    operationalPriority: compareOperatorTimeline.operationalPriority,
    ownerActionability: compareOperatorTimeline.ownerActionability,
    reviewReadiness: compareOperatorTimeline.reviewReadiness,
    escalationReadiness: compareOperatorTimeline.escalationReadiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    operatorMessage: compareOperatorTimeline.operatorMessage,
    operatorGuidance: compareOperatorTimeline.operatorGuidance,
    classification: compareOperatorTimeline.classification,
    semanticResilienceSource:
      "response_level_governance_semantic_resilience_semantics_chain",
    semanticResilienceSignals: [
      compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      compareGovernanceSemanticDrift.governanceSemanticDrift,
      compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      compareGovernanceExplainability.governanceExplainability,
      compareGovernanceAuditTrail.governanceAuditTrail,
      compareGovernanceRetention.governanceRetention,
      compareGovernanceDisposition.governanceDisposition,
      compareGovernancePosture.governancePosture,
      compareOperationalAttention.operationalAttention,
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorSummary.operatorSummary,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorTimeline.operatorMessage,
      compareOperatorTimeline.operatorGuidance,
      compareOperatorTimeline.ownerActionability,
      compareOperatorTimeline.operationalPriority,
      compareOperatorTimeline.escalationReadiness,
      compareOperatorTimeline.reviewReadiness,
      compareOperatorTimeline.severity,
      compareOperatorTimeline.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      "truth_source_inventory_transactions",
      "cache_compare_target_inventory_current",
      "read_only_boundary",
      "semantic_convergence_metadata",
      "semantic_drift_metadata",
    ],
  });
}

function resolveResponseGovernanceSemanticIntegrityBoundary(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareTruthAggregationQuality: InventoryCompareTruthAggregationQualityMetadata,
  compareEvidence: InventoryCompareEvidenceMetadata,
  compareRisk: InventoryCompareRiskMetadata,
  compareInterpretationStability: InventoryCompareInterpretationStabilityMetadata,
  compareDecisionReadiness: InventoryCompareDecisionReadinessMetadata,
  compareOperationalImpact: InventoryCompareOperationalImpactMetadata,
  compareOperationalAttention: InventoryCompareOperationalAttentionMetadata,
  compareGovernancePosture: InventoryCompareGovernancePostureMetadata,
  compareGovernanceDisposition: InventoryCompareGovernanceDispositionMetadata,
  compareGovernanceRetention: InventoryCompareGovernanceRetentionMetadata,
  compareGovernanceAuditTrail: InventoryCompareGovernanceAuditTrailMetadata,
  compareGovernanceExplainability: InventoryCompareGovernanceExplainabilityMetadata,
  compareGovernanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherenceMetadata,
  compareGovernanceSemanticDrift: InventoryCompareGovernanceSemanticDriftMetadata,
  compareGovernanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergenceMetadata,
  compareGovernanceSemanticResilience: InventoryCompareGovernanceSemanticResilienceMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareGovernanceSemanticIntegrityBoundaryMetadata {
  const firstUnavailableBoundary = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticIntegrityBoundary
        ?.governanceSemanticIntegrityBoundary === "boundary_unavailable",
  )?.metadata.compareGovernanceSemanticIntegrityBoundary;
  if (firstUnavailableBoundary) return firstUnavailableBoundary;

  const firstOutsideBoundary = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticIntegrityBoundary
        ?.governanceSemanticIntegrityBoundary === "outside_integrity_boundary",
  )?.metadata.compareGovernanceSemanticIntegrityBoundary;
  if (firstOutsideBoundary) return firstOutsideBoundary;

  const firstCrossingBoundary = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticIntegrityBoundary
        ?.governanceSemanticIntegrityBoundary === "crossing_integrity_boundary",
  )?.metadata.compareGovernanceSemanticIntegrityBoundary;
  if (firstCrossingBoundary) return firstCrossingBoundary;

  const firstNearBoundary = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticIntegrityBoundary
        ?.governanceSemanticIntegrityBoundary === "near_integrity_boundary",
  )?.metadata.compareGovernanceSemanticIntegrityBoundary;
  if (firstNearBoundary) return firstNearBoundary;

  return createCompareGovernanceSemanticIntegrityBoundaryMetadata({
    governanceSemanticIntegrityBoundary: governanceSemanticIntegrityBoundaryForSemantics({
      compareHardening,
      governanceSemanticResilience:
        compareGovernanceSemanticResilience.governanceSemanticResilience,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareOperatorTimeline.severity,
      operationalPriority: compareOperatorTimeline.operationalPriority,
      ownerActionability: compareOperatorTimeline.ownerActionability,
      reviewReadiness: compareOperatorTimeline.reviewReadiness,
      escalationReadiness: compareOperatorTimeline.escalationReadiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorTimeline.operatorMessage,
      operatorGuidance: compareOperatorTimeline.operatorGuidance,
      classification: compareOperatorTimeline.classification,
    }),
    compareHardening,
    governanceSemanticResilience:
      compareGovernanceSemanticResilience.governanceSemanticResilience,
    governanceSemanticConvergence:
      compareGovernanceSemanticConvergence.governanceSemanticConvergence,
    governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
    governanceReasoningCoherence:
      compareGovernanceReasoningCoherence.governanceReasoningCoherence,
    governanceExplainability:
      compareGovernanceExplainability.governanceExplainability,
    governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
    governanceRetention: compareGovernanceRetention.governanceRetention,
    governanceDisposition: compareGovernanceDisposition.governanceDisposition,
    governancePosture: compareGovernancePosture.governancePosture,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareOperatorTimeline.severity,
    operationalPriority: compareOperatorTimeline.operationalPriority,
    ownerActionability: compareOperatorTimeline.ownerActionability,
    reviewReadiness: compareOperatorTimeline.reviewReadiness,
    escalationReadiness: compareOperatorTimeline.escalationReadiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    operatorMessage: compareOperatorTimeline.operatorMessage,
    operatorGuidance: compareOperatorTimeline.operatorGuidance,
    classification: compareOperatorTimeline.classification,
    semanticIntegrityBoundarySource:
      "response_level_governance_semantic_integrity_boundary_semantics_chain",
    semanticIntegrityBoundarySignals: [
      compareGovernanceSemanticResilience.governanceSemanticResilience,
      compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      compareGovernanceSemanticDrift.governanceSemanticDrift,
      compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      compareGovernanceExplainability.governanceExplainability,
      compareGovernanceAuditTrail.governanceAuditTrail,
      compareGovernanceRetention.governanceRetention,
      compareGovernanceDisposition.governanceDisposition,
      compareGovernancePosture.governancePosture,
      compareOperationalAttention.operationalAttention,
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorSummary.operatorSummary,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorTimeline.operatorMessage,
      compareOperatorTimeline.operatorGuidance,
      compareOperatorTimeline.ownerActionability,
      compareOperatorTimeline.operationalPriority,
      compareOperatorTimeline.escalationReadiness,
      compareOperatorTimeline.reviewReadiness,
      compareOperatorTimeline.severity,
      compareOperatorTimeline.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      "truth_source_inventory_transactions",
      "cache_compare_target_inventory_current",
      "read_only_boundary",
      "semantic_resilience_metadata",
      "semantic_convergence_metadata",
    ],
  });
}

function resolveResponseGovernanceSemanticRecoverability(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareTruthAggregationQuality: InventoryCompareTruthAggregationQualityMetadata,
  compareEvidence: InventoryCompareEvidenceMetadata,
  compareRisk: InventoryCompareRiskMetadata,
  compareInterpretationStability: InventoryCompareInterpretationStabilityMetadata,
  compareDecisionReadiness: InventoryCompareDecisionReadinessMetadata,
  compareOperationalImpact: InventoryCompareOperationalImpactMetadata,
  compareOperationalAttention: InventoryCompareOperationalAttentionMetadata,
  compareGovernancePosture: InventoryCompareGovernancePostureMetadata,
  compareGovernanceDisposition: InventoryCompareGovernanceDispositionMetadata,
  compareGovernanceRetention: InventoryCompareGovernanceRetentionMetadata,
  compareGovernanceAuditTrail: InventoryCompareGovernanceAuditTrailMetadata,
  compareGovernanceExplainability: InventoryCompareGovernanceExplainabilityMetadata,
  compareGovernanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherenceMetadata,
  compareGovernanceSemanticDrift: InventoryCompareGovernanceSemanticDriftMetadata,
  compareGovernanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergenceMetadata,
  compareGovernanceSemanticResilience: InventoryCompareGovernanceSemanticResilienceMetadata,
  compareGovernanceSemanticIntegrityBoundary: InventoryCompareGovernanceSemanticIntegrityBoundaryMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareGovernanceSemanticRecoverabilityMetadata {
  const firstUnavailableRecoverability = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticRecoverability
        ?.governanceSemanticRecoverability === "recovery_unavailable",
  )?.metadata.compareGovernanceSemanticRecoverability;
  if (firstUnavailableRecoverability) return firstUnavailableRecoverability;

  const firstNonrecoverable = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticRecoverability
        ?.governanceSemanticRecoverability === "nonrecoverable_semantics",
  )?.metadata.compareGovernanceSemanticRecoverability;
  if (firstNonrecoverable) return firstNonrecoverable;

  const firstDifficultRecovery = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticRecoverability
        ?.governanceSemanticRecoverability === "difficult_recovery",
  )?.metadata.compareGovernanceSemanticRecoverability;
  if (firstDifficultRecovery) return firstDifficultRecovery;

  const firstPartiallyRecoverable = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticRecoverability
        ?.governanceSemanticRecoverability === "partially_recoverable",
  )?.metadata.compareGovernanceSemanticRecoverability;
  if (firstPartiallyRecoverable) return firstPartiallyRecoverable;

  return createCompareGovernanceSemanticRecoverabilityMetadata({
    governanceSemanticRecoverability: governanceSemanticRecoverabilityForSemantics({
      compareHardening,
      governanceSemanticIntegrityBoundary:
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
      governanceSemanticResilience:
        compareGovernanceSemanticResilience.governanceSemanticResilience,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareOperatorTimeline.severity,
      operationalPriority: compareOperatorTimeline.operationalPriority,
      ownerActionability: compareOperatorTimeline.ownerActionability,
      reviewReadiness: compareOperatorTimeline.reviewReadiness,
      escalationReadiness: compareOperatorTimeline.escalationReadiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorTimeline.operatorMessage,
      operatorGuidance: compareOperatorTimeline.operatorGuidance,
      classification: compareOperatorTimeline.classification,
    }),
    compareHardening,
    governanceSemanticIntegrityBoundary:
      compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
    governanceSemanticResilience:
      compareGovernanceSemanticResilience.governanceSemanticResilience,
    governanceSemanticConvergence:
      compareGovernanceSemanticConvergence.governanceSemanticConvergence,
    governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
    governanceReasoningCoherence:
      compareGovernanceReasoningCoherence.governanceReasoningCoherence,
    governanceExplainability:
      compareGovernanceExplainability.governanceExplainability,
    governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
    governanceRetention: compareGovernanceRetention.governanceRetention,
    governanceDisposition: compareGovernanceDisposition.governanceDisposition,
    governancePosture: compareGovernancePosture.governancePosture,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareOperatorTimeline.severity,
    operationalPriority: compareOperatorTimeline.operationalPriority,
    ownerActionability: compareOperatorTimeline.ownerActionability,
    reviewReadiness: compareOperatorTimeline.reviewReadiness,
    escalationReadiness: compareOperatorTimeline.escalationReadiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    operatorMessage: compareOperatorTimeline.operatorMessage,
    operatorGuidance: compareOperatorTimeline.operatorGuidance,
    classification: compareOperatorTimeline.classification,
    semanticRecoverabilitySource:
      "response_level_governance_semantic_recoverability_semantics_chain",
    semanticRecoverabilitySignals: [
      compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
      compareGovernanceSemanticResilience.governanceSemanticResilience,
      compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      compareGovernanceSemanticDrift.governanceSemanticDrift,
      compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      compareGovernanceExplainability.governanceExplainability,
      compareGovernanceAuditTrail.governanceAuditTrail,
      compareGovernanceRetention.governanceRetention,
      compareGovernanceDisposition.governanceDisposition,
      compareGovernancePosture.governancePosture,
      compareOperationalAttention.operationalAttention,
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorSummary.operatorSummary,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorTimeline.operatorMessage,
      compareOperatorTimeline.operatorGuidance,
      compareOperatorTimeline.ownerActionability,
      compareOperatorTimeline.operationalPriority,
      compareOperatorTimeline.escalationReadiness,
      compareOperatorTimeline.reviewReadiness,
      compareOperatorTimeline.severity,
      compareOperatorTimeline.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      "truth_source_inventory_transactions",
      "cache_compare_target_inventory_current",
      "read_only_boundary",
      "semantic_integrity_boundary_metadata",
      "semantic_resilience_metadata",
    ],
  });
}

function resolveResponseGovernanceSemanticObservabilityContinuity(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareTruthAggregationQuality: InventoryCompareTruthAggregationQualityMetadata,
  compareEvidence: InventoryCompareEvidenceMetadata,
  compareRisk: InventoryCompareRiskMetadata,
  compareInterpretationStability: InventoryCompareInterpretationStabilityMetadata,
  compareDecisionReadiness: InventoryCompareDecisionReadinessMetadata,
  compareOperationalImpact: InventoryCompareOperationalImpactMetadata,
  compareOperationalAttention: InventoryCompareOperationalAttentionMetadata,
  compareGovernancePosture: InventoryCompareGovernancePostureMetadata,
  compareGovernanceDisposition: InventoryCompareGovernanceDispositionMetadata,
  compareGovernanceRetention: InventoryCompareGovernanceRetentionMetadata,
  compareGovernanceAuditTrail: InventoryCompareGovernanceAuditTrailMetadata,
  compareGovernanceExplainability: InventoryCompareGovernanceExplainabilityMetadata,
  compareGovernanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherenceMetadata,
  compareGovernanceSemanticDrift: InventoryCompareGovernanceSemanticDriftMetadata,
  compareGovernanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergenceMetadata,
  compareGovernanceSemanticResilience: InventoryCompareGovernanceSemanticResilienceMetadata,
  compareGovernanceSemanticIntegrityBoundary: InventoryCompareGovernanceSemanticIntegrityBoundaryMetadata,
  compareGovernanceSemanticRecoverability: InventoryCompareGovernanceSemanticRecoverabilityMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareGovernanceSemanticObservabilityContinuityMetadata {
  const firstUnavailableContinuity = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticObservabilityContinuity
        ?.governanceSemanticObservabilityContinuity === "continuity_unavailable",
  )?.metadata.compareGovernanceSemanticObservabilityContinuity;
  if (firstUnavailableContinuity) return firstUnavailableContinuity;

  const firstBrokenContinuity = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticObservabilityContinuity
        ?.governanceSemanticObservabilityContinuity === "broken_continuity",
  )?.metadata.compareGovernanceSemanticObservabilityContinuity;
  if (firstBrokenContinuity) return firstBrokenContinuity;

  const firstInterruptedContinuity = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticObservabilityContinuity
        ?.governanceSemanticObservabilityContinuity === "interrupted_continuity",
  )?.metadata.compareGovernanceSemanticObservabilityContinuity;
  if (firstInterruptedContinuity) return firstInterruptedContinuity;

  const firstPartiallyContinuous = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticObservabilityContinuity
        ?.governanceSemanticObservabilityContinuity === "partially_continuous",
  )?.metadata.compareGovernanceSemanticObservabilityContinuity;
  if (firstPartiallyContinuous) return firstPartiallyContinuous;

  return createCompareGovernanceSemanticObservabilityContinuityMetadata({
    governanceSemanticObservabilityContinuity:
      governanceSemanticObservabilityContinuityForSemantics({
        compareHardening,
        governanceSemanticRecoverability:
          compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
        governanceSemanticIntegrityBoundary:
          compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
        governanceSemanticResilience:
          compareGovernanceSemanticResilience.governanceSemanticResilience,
        governanceSemanticConvergence:
          compareGovernanceSemanticConvergence.governanceSemanticConvergence,
        governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
        governanceReasoningCoherence:
          compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        governanceExplainability:
          compareGovernanceExplainability.governanceExplainability,
        governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
        governanceRetention: compareGovernanceRetention.governanceRetention,
        governanceDisposition: compareGovernanceDisposition.governanceDisposition,
        governancePosture: compareGovernancePosture.governancePosture,
        operationalAttention: compareOperationalAttention.operationalAttention,
        operationalImpact: compareOperationalImpact.operationalImpact,
        decisionReadiness: compareDecisionReadiness.decisionReadiness,
        interpretationStability:
          compareInterpretationStability.interpretationStability,
        compareRisk: compareRisk.compareRisk,
        compareEvidence: compareEvidence.compareEvidence,
        compareConfidence: compareConfidence.compareConfidence,
        projectionFreshness: compareProjectionFreshness.projectionFreshness,
        truthAggregationQuality:
          compareTruthAggregationQuality.truthAggregationQuality,
        severity: compareOperatorTimeline.severity,
        operationalPriority: compareOperatorTimeline.operationalPriority,
        ownerActionability: compareOperatorTimeline.ownerActionability,
        reviewReadiness: compareOperatorTimeline.reviewReadiness,
        escalationReadiness: compareOperatorTimeline.escalationReadiness,
        operatorSummary: compareOperatorSummary.operatorSummary,
        operatorTimeline: compareOperatorTimeline.operatorTimeline,
        operatorMessage: compareOperatorTimeline.operatorMessage,
        operatorGuidance: compareOperatorTimeline.operatorGuidance,
        classification: compareOperatorTimeline.classification,
      }),
    compareHardening,
    governanceSemanticRecoverability:
      compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
    governanceSemanticIntegrityBoundary:
      compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
    governanceSemanticResilience:
      compareGovernanceSemanticResilience.governanceSemanticResilience,
    governanceSemanticConvergence:
      compareGovernanceSemanticConvergence.governanceSemanticConvergence,
    governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
    governanceReasoningCoherence:
      compareGovernanceReasoningCoherence.governanceReasoningCoherence,
    governanceExplainability:
      compareGovernanceExplainability.governanceExplainability,
    governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
    governanceRetention: compareGovernanceRetention.governanceRetention,
    governanceDisposition: compareGovernanceDisposition.governanceDisposition,
    governancePosture: compareGovernancePosture.governancePosture,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareOperatorTimeline.severity,
    operationalPriority: compareOperatorTimeline.operationalPriority,
    ownerActionability: compareOperatorTimeline.ownerActionability,
    reviewReadiness: compareOperatorTimeline.reviewReadiness,
    escalationReadiness: compareOperatorTimeline.escalationReadiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    operatorMessage: compareOperatorTimeline.operatorMessage,
    operatorGuidance: compareOperatorTimeline.operatorGuidance,
    classification: compareOperatorTimeline.classification,
    semanticObservabilityContinuitySource:
      "response_level_governance_semantic_observability_continuity_semantics_chain",
    semanticObservabilityContinuitySignals: [
      compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
      compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
      compareGovernanceSemanticResilience.governanceSemanticResilience,
      compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      compareGovernanceSemanticDrift.governanceSemanticDrift,
      compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      compareGovernanceExplainability.governanceExplainability,
      compareGovernanceAuditTrail.governanceAuditTrail,
      compareGovernanceRetention.governanceRetention,
      compareGovernanceDisposition.governanceDisposition,
      compareGovernancePosture.governancePosture,
      compareOperationalAttention.operationalAttention,
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorSummary.operatorSummary,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorTimeline.operatorMessage,
      compareOperatorTimeline.operatorGuidance,
      compareOperatorTimeline.ownerActionability,
      compareOperatorTimeline.operationalPriority,
      compareOperatorTimeline.escalationReadiness,
      compareOperatorTimeline.reviewReadiness,
      compareOperatorTimeline.severity,
      compareOperatorTimeline.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      "truth_source_inventory_transactions",
      "cache_compare_target_inventory_current",
      "read_only_boundary",
      "semantic_recoverability_metadata",
      "semantic_integrity_boundary_metadata",
    ],
  });
}

function resolveResponseGovernanceSemanticDegradationTolerance(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareTruthAggregationQuality: InventoryCompareTruthAggregationQualityMetadata,
  compareEvidence: InventoryCompareEvidenceMetadata,
  compareRisk: InventoryCompareRiskMetadata,
  compareInterpretationStability: InventoryCompareInterpretationStabilityMetadata,
  compareDecisionReadiness: InventoryCompareDecisionReadinessMetadata,
  compareOperationalImpact: InventoryCompareOperationalImpactMetadata,
  compareOperationalAttention: InventoryCompareOperationalAttentionMetadata,
  compareGovernancePosture: InventoryCompareGovernancePostureMetadata,
  compareGovernanceDisposition: InventoryCompareGovernanceDispositionMetadata,
  compareGovernanceRetention: InventoryCompareGovernanceRetentionMetadata,
  compareGovernanceAuditTrail: InventoryCompareGovernanceAuditTrailMetadata,
  compareGovernanceExplainability: InventoryCompareGovernanceExplainabilityMetadata,
  compareGovernanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherenceMetadata,
  compareGovernanceSemanticDrift: InventoryCompareGovernanceSemanticDriftMetadata,
  compareGovernanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergenceMetadata,
  compareGovernanceSemanticResilience: InventoryCompareGovernanceSemanticResilienceMetadata,
  compareGovernanceSemanticIntegrityBoundary: InventoryCompareGovernanceSemanticIntegrityBoundaryMetadata,
  compareGovernanceSemanticRecoverability: InventoryCompareGovernanceSemanticRecoverabilityMetadata,
  compareGovernanceSemanticObservabilityContinuity: InventoryCompareGovernanceSemanticObservabilityContinuityMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareGovernanceSemanticDegradationToleranceMetadata {
  const firstUnavailableTolerance = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticDegradationTolerance
        ?.governanceSemanticDegradationTolerance === "tolerance_unavailable",
  )?.metadata.compareGovernanceSemanticDegradationTolerance;
  if (firstUnavailableTolerance) return firstUnavailableTolerance;

  const firstIntolerableDegradation = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticDegradationTolerance
        ?.governanceSemanticDegradationTolerance === "intolerable_degradation",
  )?.metadata.compareGovernanceSemanticDegradationTolerance;
  if (firstIntolerableDegradation) return firstIntolerableDegradation;

  const firstLimitedTolerance = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticDegradationTolerance
        ?.governanceSemanticDegradationTolerance === "limited_tolerance",
  )?.metadata.compareGovernanceSemanticDegradationTolerance;
  if (firstLimitedTolerance) return firstLimitedTolerance;

  const firstModerateTolerance = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticDegradationTolerance
        ?.governanceSemanticDegradationTolerance === "moderate_tolerance",
  )?.metadata.compareGovernanceSemanticDegradationTolerance;
  if (firstModerateTolerance) return firstModerateTolerance;

  return createCompareGovernanceSemanticDegradationToleranceMetadata({
    governanceSemanticDegradationTolerance:
      governanceSemanticDegradationToleranceForSemantics({
        compareHardening,
        governanceSemanticObservabilityContinuity:
          compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
        governanceSemanticRecoverability:
          compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
        governanceSemanticIntegrityBoundary:
          compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
        governanceSemanticResilience:
          compareGovernanceSemanticResilience.governanceSemanticResilience,
        governanceSemanticConvergence:
          compareGovernanceSemanticConvergence.governanceSemanticConvergence,
        governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
        governanceReasoningCoherence:
          compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        governanceExplainability:
          compareGovernanceExplainability.governanceExplainability,
        governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
        governanceRetention: compareGovernanceRetention.governanceRetention,
        governanceDisposition: compareGovernanceDisposition.governanceDisposition,
        governancePosture: compareGovernancePosture.governancePosture,
        operationalAttention: compareOperationalAttention.operationalAttention,
        operationalImpact: compareOperationalImpact.operationalImpact,
        decisionReadiness: compareDecisionReadiness.decisionReadiness,
        interpretationStability:
          compareInterpretationStability.interpretationStability,
        compareRisk: compareRisk.compareRisk,
        compareEvidence: compareEvidence.compareEvidence,
        compareConfidence: compareConfidence.compareConfidence,
        projectionFreshness: compareProjectionFreshness.projectionFreshness,
        truthAggregationQuality:
          compareTruthAggregationQuality.truthAggregationQuality,
        severity: compareOperatorTimeline.severity,
        operationalPriority: compareOperatorTimeline.operationalPriority,
        ownerActionability: compareOperatorTimeline.ownerActionability,
        reviewReadiness: compareOperatorTimeline.reviewReadiness,
        escalationReadiness: compareOperatorTimeline.escalationReadiness,
        operatorSummary: compareOperatorSummary.operatorSummary,
        operatorTimeline: compareOperatorTimeline.operatorTimeline,
        operatorMessage: compareOperatorTimeline.operatorMessage,
        operatorGuidance: compareOperatorTimeline.operatorGuidance,
        classification: compareOperatorTimeline.classification,
      }),
    compareHardening,
    governanceSemanticObservabilityContinuity:
      compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
    governanceSemanticRecoverability:
      compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
    governanceSemanticIntegrityBoundary:
      compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
    governanceSemanticResilience:
      compareGovernanceSemanticResilience.governanceSemanticResilience,
    governanceSemanticConvergence:
      compareGovernanceSemanticConvergence.governanceSemanticConvergence,
    governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
    governanceReasoningCoherence:
      compareGovernanceReasoningCoherence.governanceReasoningCoherence,
    governanceExplainability:
      compareGovernanceExplainability.governanceExplainability,
    governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
    governanceRetention: compareGovernanceRetention.governanceRetention,
    governanceDisposition: compareGovernanceDisposition.governanceDisposition,
    governancePosture: compareGovernancePosture.governancePosture,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareOperatorTimeline.severity,
    operationalPriority: compareOperatorTimeline.operationalPriority,
    ownerActionability: compareOperatorTimeline.ownerActionability,
    reviewReadiness: compareOperatorTimeline.reviewReadiness,
    escalationReadiness: compareOperatorTimeline.escalationReadiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    operatorMessage: compareOperatorTimeline.operatorMessage,
    operatorGuidance: compareOperatorTimeline.operatorGuidance,
    classification: compareOperatorTimeline.classification,
    semanticDegradationToleranceSource:
      "response_level_governance_semantic_degradation_tolerance_semantics_chain",
    semanticDegradationToleranceSignals: [
      compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
      compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
      compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
      compareGovernanceSemanticResilience.governanceSemanticResilience,
      compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      compareGovernanceSemanticDrift.governanceSemanticDrift,
      compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      compareGovernanceExplainability.governanceExplainability,
      compareGovernanceAuditTrail.governanceAuditTrail,
      compareGovernanceRetention.governanceRetention,
      compareGovernanceDisposition.governanceDisposition,
      compareGovernancePosture.governancePosture,
      compareOperationalAttention.operationalAttention,
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorSummary.operatorSummary,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorTimeline.operatorMessage,
      compareOperatorTimeline.operatorGuidance,
      compareOperatorTimeline.ownerActionability,
      compareOperatorTimeline.operationalPriority,
      compareOperatorTimeline.escalationReadiness,
      compareOperatorTimeline.reviewReadiness,
      compareOperatorTimeline.severity,
      compareOperatorTimeline.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      "truth_source_inventory_transactions",
      "cache_compare_target_inventory_current",
      "read_only_boundary",
      "semantic_observability_continuity_metadata",
      "semantic_recoverability_metadata",
      "semantic_integrity_boundary_metadata",
    ],
  });
}

function resolveResponseGovernanceSemanticSurvivability(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareTruthAggregationQuality: InventoryCompareTruthAggregationQualityMetadata,
  compareEvidence: InventoryCompareEvidenceMetadata,
  compareRisk: InventoryCompareRiskMetadata,
  compareInterpretationStability: InventoryCompareInterpretationStabilityMetadata,
  compareDecisionReadiness: InventoryCompareDecisionReadinessMetadata,
  compareOperationalImpact: InventoryCompareOperationalImpactMetadata,
  compareOperationalAttention: InventoryCompareOperationalAttentionMetadata,
  compareGovernancePosture: InventoryCompareGovernancePostureMetadata,
  compareGovernanceDisposition: InventoryCompareGovernanceDispositionMetadata,
  compareGovernanceRetention: InventoryCompareGovernanceRetentionMetadata,
  compareGovernanceAuditTrail: InventoryCompareGovernanceAuditTrailMetadata,
  compareGovernanceExplainability: InventoryCompareGovernanceExplainabilityMetadata,
  compareGovernanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherenceMetadata,
  compareGovernanceSemanticDrift: InventoryCompareGovernanceSemanticDriftMetadata,
  compareGovernanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergenceMetadata,
  compareGovernanceSemanticResilience: InventoryCompareGovernanceSemanticResilienceMetadata,
  compareGovernanceSemanticIntegrityBoundary: InventoryCompareGovernanceSemanticIntegrityBoundaryMetadata,
  compareGovernanceSemanticRecoverability: InventoryCompareGovernanceSemanticRecoverabilityMetadata,
  compareGovernanceSemanticObservabilityContinuity: InventoryCompareGovernanceSemanticObservabilityContinuityMetadata,
  compareGovernanceSemanticDegradationTolerance: InventoryCompareGovernanceSemanticDegradationToleranceMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareGovernanceSemanticSurvivabilityMetadata {
  const firstUnavailableSurvivability = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticSurvivability
        ?.governanceSemanticSurvivability === "survivability_unavailable",
  )?.metadata.compareGovernanceSemanticSurvivability;
  if (firstUnavailableSurvivability) return firstUnavailableSurvivability;

  const firstNonsurvivableSemantics = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticSurvivability
        ?.governanceSemanticSurvivability === "nonsurvivable_semantics",
  )?.metadata.compareGovernanceSemanticSurvivability;
  if (firstNonsurvivableSemantics) return firstNonsurvivableSemantics;

  const firstCriticalSurvivability = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticSurvivability
        ?.governanceSemanticSurvivability === "critical_survivability",
  )?.metadata.compareGovernanceSemanticSurvivability;
  if (firstCriticalSurvivability) return firstCriticalSurvivability;

  const firstDegradedSurvivability = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticSurvivability
        ?.governanceSemanticSurvivability === "degraded_survivability",
  )?.metadata.compareGovernanceSemanticSurvivability;
  if (firstDegradedSurvivability) return firstDegradedSurvivability;

  return createCompareGovernanceSemanticSurvivabilityMetadata({
    governanceSemanticSurvivability: governanceSemanticSurvivabilityForSemantics({
      compareHardening,
      governanceSemanticDegradationTolerance:
        compareGovernanceSemanticDegradationTolerance.governanceSemanticDegradationTolerance,
      governanceSemanticObservabilityContinuity:
        compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
      governanceSemanticRecoverability:
        compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
      governanceSemanticIntegrityBoundary:
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
      governanceSemanticResilience:
        compareGovernanceSemanticResilience.governanceSemanticResilience,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareOperatorTimeline.severity,
      operationalPriority: compareOperatorTimeline.operationalPriority,
      ownerActionability: compareOperatorTimeline.ownerActionability,
      reviewReadiness: compareOperatorTimeline.reviewReadiness,
      escalationReadiness: compareOperatorTimeline.escalationReadiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorTimeline.operatorMessage,
      operatorGuidance: compareOperatorTimeline.operatorGuidance,
      classification: compareOperatorTimeline.classification,
    }),
    compareHardening,
    governanceSemanticDegradationTolerance:
      compareGovernanceSemanticDegradationTolerance.governanceSemanticDegradationTolerance,
    governanceSemanticObservabilityContinuity:
      compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
    governanceSemanticRecoverability:
      compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
    governanceSemanticIntegrityBoundary:
      compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
    governanceSemanticResilience:
      compareGovernanceSemanticResilience.governanceSemanticResilience,
    governanceSemanticConvergence:
      compareGovernanceSemanticConvergence.governanceSemanticConvergence,
    governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
    governanceReasoningCoherence:
      compareGovernanceReasoningCoherence.governanceReasoningCoherence,
    governanceExplainability:
      compareGovernanceExplainability.governanceExplainability,
    governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
    governanceRetention: compareGovernanceRetention.governanceRetention,
    governanceDisposition: compareGovernanceDisposition.governanceDisposition,
    governancePosture: compareGovernancePosture.governancePosture,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareOperatorTimeline.severity,
    operationalPriority: compareOperatorTimeline.operationalPriority,
    ownerActionability: compareOperatorTimeline.ownerActionability,
    reviewReadiness: compareOperatorTimeline.reviewReadiness,
    escalationReadiness: compareOperatorTimeline.escalationReadiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    operatorMessage: compareOperatorTimeline.operatorMessage,
    operatorGuidance: compareOperatorTimeline.operatorGuidance,
    classification: compareOperatorTimeline.classification,
    semanticSurvivabilitySource:
      "response_level_governance_semantic_survivability_semantics_chain",
    semanticSurvivabilitySignals: [
      compareGovernanceSemanticDegradationTolerance.governanceSemanticDegradationTolerance,
      compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
      compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
      compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
      compareGovernanceSemanticResilience.governanceSemanticResilience,
      compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      compareGovernanceSemanticDrift.governanceSemanticDrift,
      compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      compareGovernanceExplainability.governanceExplainability,
      compareGovernanceAuditTrail.governanceAuditTrail,
      compareGovernanceRetention.governanceRetention,
      compareGovernanceDisposition.governanceDisposition,
      compareGovernancePosture.governancePosture,
      compareOperationalAttention.operationalAttention,
      compareOperationalImpact.operationalImpact,
      compareDecisionReadiness.decisionReadiness,
      compareInterpretationStability.interpretationStability,
      compareRisk.compareRisk,
      compareEvidence.compareEvidence,
      compareTruthAggregationQuality.truthAggregationQuality,
      compareProjectionFreshness.projectionFreshness,
      compareConfidence.compareConfidence,
      compareOperatorSummary.operatorSummary,
      compareOperatorTimeline.operatorTimeline,
      compareOperatorTimeline.operatorMessage,
      compareOperatorTimeline.operatorGuidance,
      compareOperatorTimeline.ownerActionability,
      compareOperatorTimeline.operationalPriority,
      compareOperatorTimeline.escalationReadiness,
      compareOperatorTimeline.reviewReadiness,
      compareOperatorTimeline.severity,
      compareOperatorTimeline.classification,
      compareHardening.sourceStatus,
      compareHardening.resultStatus,
      compareHardening.scopeStatus,
      "truth_source_inventory_transactions",
      "cache_compare_target_inventory_current",
      "read_only_boundary",
      "semantic_degradation_tolerance_metadata",
      "semantic_observability_continuity_metadata",
      "semantic_recoverability_metadata",
      "semantic_integrity_boundary_metadata",
    ],
  });
}

function resolveResponseGovernanceSemanticSustainability(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareTruthAggregationQuality: InventoryCompareTruthAggregationQualityMetadata,
  compareEvidence: InventoryCompareEvidenceMetadata,
  compareRisk: InventoryCompareRiskMetadata,
  compareInterpretationStability: InventoryCompareInterpretationStabilityMetadata,
  compareDecisionReadiness: InventoryCompareDecisionReadinessMetadata,
  compareOperationalImpact: InventoryCompareOperationalImpactMetadata,
  compareOperationalAttention: InventoryCompareOperationalAttentionMetadata,
  compareGovernancePosture: InventoryCompareGovernancePostureMetadata,
  compareGovernanceDisposition: InventoryCompareGovernanceDispositionMetadata,
  compareGovernanceRetention: InventoryCompareGovernanceRetentionMetadata,
  compareGovernanceAuditTrail: InventoryCompareGovernanceAuditTrailMetadata,
  compareGovernanceExplainability: InventoryCompareGovernanceExplainabilityMetadata,
  compareGovernanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherenceMetadata,
  compareGovernanceSemanticDrift: InventoryCompareGovernanceSemanticDriftMetadata,
  compareGovernanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergenceMetadata,
  compareGovernanceSemanticResilience: InventoryCompareGovernanceSemanticResilienceMetadata,
  compareGovernanceSemanticIntegrityBoundary: InventoryCompareGovernanceSemanticIntegrityBoundaryMetadata,
  compareGovernanceSemanticRecoverability: InventoryCompareGovernanceSemanticRecoverabilityMetadata,
  compareGovernanceSemanticObservabilityContinuity: InventoryCompareGovernanceSemanticObservabilityContinuityMetadata,
  compareGovernanceSemanticDegradationTolerance: InventoryCompareGovernanceSemanticDegradationToleranceMetadata,
  compareGovernanceSemanticSurvivability: InventoryCompareGovernanceSemanticSurvivabilityMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareGovernanceSemanticSustainabilityMetadata {
  const firstUnavailableSustainability = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticSustainability
        ?.governanceSemanticSustainability === "sustainability_unavailable",
  )?.metadata.compareGovernanceSemanticSustainability;
  if (firstUnavailableSustainability) return firstUnavailableSustainability;

  const firstUnsustainableSemantics = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticSustainability
        ?.governanceSemanticSustainability === "unsustainable_semantics",
  )?.metadata.compareGovernanceSemanticSustainability;
  if (firstUnsustainableSemantics) return firstUnsustainableSemantics;

  const firstFragileSustainability = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticSustainability
        ?.governanceSemanticSustainability === "fragile_sustainability",
  )?.metadata.compareGovernanceSemanticSustainability;
  if (firstFragileSustainability) return firstFragileSustainability;

  const firstConditionallySustainable = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticSustainability
        ?.governanceSemanticSustainability === "conditionally_sustainable",
  )?.metadata.compareGovernanceSemanticSustainability;
  if (firstConditionallySustainable) return firstConditionallySustainable;

  return createCompareGovernanceSemanticSustainabilityMetadata({
    governanceSemanticSustainability: governanceSemanticSustainabilityForSemantics({
      compareHardening,
      governanceSemanticSurvivability:
        compareGovernanceSemanticSurvivability.governanceSemanticSurvivability,
      governanceSemanticDegradationTolerance:
        compareGovernanceSemanticDegradationTolerance.governanceSemanticDegradationTolerance,
      governanceSemanticObservabilityContinuity:
        compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
      governanceSemanticRecoverability:
        compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
      governanceSemanticIntegrityBoundary:
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
      governanceSemanticResilience:
        compareGovernanceSemanticResilience.governanceSemanticResilience,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareOperatorTimeline.severity,
      operationalPriority: compareOperatorTimeline.operationalPriority,
      ownerActionability: compareOperatorTimeline.ownerActionability,
      reviewReadiness: compareOperatorTimeline.reviewReadiness,
      escalationReadiness: compareOperatorTimeline.escalationReadiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorTimeline.operatorMessage,
      operatorGuidance: compareOperatorTimeline.operatorGuidance,
      classification: compareOperatorTimeline.classification,
    }),
    compareHardening,
    governanceSemanticSurvivability:
      compareGovernanceSemanticSurvivability.governanceSemanticSurvivability,
    governanceSemanticDegradationTolerance:
      compareGovernanceSemanticDegradationTolerance.governanceSemanticDegradationTolerance,
    governanceSemanticObservabilityContinuity:
      compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
    governanceSemanticRecoverability:
      compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
    governanceSemanticIntegrityBoundary:
      compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
    governanceSemanticResilience:
      compareGovernanceSemanticResilience.governanceSemanticResilience,
    governanceSemanticConvergence:
      compareGovernanceSemanticConvergence.governanceSemanticConvergence,
    governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
    governanceReasoningCoherence:
      compareGovernanceReasoningCoherence.governanceReasoningCoherence,
    governanceExplainability:
      compareGovernanceExplainability.governanceExplainability,
    governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
    governanceRetention: compareGovernanceRetention.governanceRetention,
    governanceDisposition: compareGovernanceDisposition.governanceDisposition,
    governancePosture: compareGovernancePosture.governancePosture,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareOperatorTimeline.severity,
    operationalPriority: compareOperatorTimeline.operationalPriority,
    ownerActionability: compareOperatorTimeline.ownerActionability,
    reviewReadiness: compareOperatorTimeline.reviewReadiness,
    escalationReadiness: compareOperatorTimeline.escalationReadiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    operatorMessage: compareOperatorTimeline.operatorMessage,
    operatorGuidance: compareOperatorTimeline.operatorGuidance,
    classification: compareOperatorTimeline.classification,
    semanticSustainabilitySource:
      "response_level_governance_semantic_sustainability_semantics_chain",
    semanticSustainabilitySignals: [
      compareGovernanceSemanticSurvivability.governanceSemanticSurvivability,
      ...compareGovernanceSemanticSurvivability.semanticSurvivabilitySignals,
      "semantic_survivability_metadata",
      "read_only_boundary",
    ],
  });
}

function resolveResponseGovernanceSemanticMaintainability(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareTruthAggregationQuality: InventoryCompareTruthAggregationQualityMetadata,
  compareEvidence: InventoryCompareEvidenceMetadata,
  compareRisk: InventoryCompareRiskMetadata,
  compareInterpretationStability: InventoryCompareInterpretationStabilityMetadata,
  compareDecisionReadiness: InventoryCompareDecisionReadinessMetadata,
  compareOperationalImpact: InventoryCompareOperationalImpactMetadata,
  compareOperationalAttention: InventoryCompareOperationalAttentionMetadata,
  compareGovernancePosture: InventoryCompareGovernancePostureMetadata,
  compareGovernanceDisposition: InventoryCompareGovernanceDispositionMetadata,
  compareGovernanceRetention: InventoryCompareGovernanceRetentionMetadata,
  compareGovernanceAuditTrail: InventoryCompareGovernanceAuditTrailMetadata,
  compareGovernanceExplainability: InventoryCompareGovernanceExplainabilityMetadata,
  compareGovernanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherenceMetadata,
  compareGovernanceSemanticDrift: InventoryCompareGovernanceSemanticDriftMetadata,
  compareGovernanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergenceMetadata,
  compareGovernanceSemanticResilience: InventoryCompareGovernanceSemanticResilienceMetadata,
  compareGovernanceSemanticIntegrityBoundary: InventoryCompareGovernanceSemanticIntegrityBoundaryMetadata,
  compareGovernanceSemanticRecoverability: InventoryCompareGovernanceSemanticRecoverabilityMetadata,
  compareGovernanceSemanticObservabilityContinuity: InventoryCompareGovernanceSemanticObservabilityContinuityMetadata,
  compareGovernanceSemanticDegradationTolerance: InventoryCompareGovernanceSemanticDegradationToleranceMetadata,
  compareGovernanceSemanticSurvivability: InventoryCompareGovernanceSemanticSurvivabilityMetadata,
  compareGovernanceSemanticSustainability: InventoryCompareGovernanceSemanticSustainabilityMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareGovernanceSemanticMaintainabilityMetadata {
  const firstUnavailableMaintainability = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticMaintainability
        ?.governanceSemanticMaintainability === "maintainability_unavailable",
  )?.metadata.compareGovernanceSemanticMaintainability;
  if (firstUnavailableMaintainability) return firstUnavailableMaintainability;

  const firstUnmaintainableSemantics = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticMaintainability
        ?.governanceSemanticMaintainability === "unmaintainable_semantics",
  )?.metadata.compareGovernanceSemanticMaintainability;
  if (firstUnmaintainableSemantics) return firstUnmaintainableSemantics;

  const firstFragileMaintainability = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticMaintainability
        ?.governanceSemanticMaintainability === "fragile_maintainability",
  )?.metadata.compareGovernanceSemanticMaintainability;
  if (firstFragileMaintainability) return firstFragileMaintainability;

  const firstConditionallyMaintainable = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticMaintainability
        ?.governanceSemanticMaintainability === "conditionally_maintainable",
  )?.metadata.compareGovernanceSemanticMaintainability;
  if (firstConditionallyMaintainable) return firstConditionallyMaintainable;

  return createCompareGovernanceSemanticMaintainabilityMetadata({
    governanceSemanticMaintainability:
      governanceSemanticMaintainabilityForSemantics({
        compareHardening,
        governanceSemanticSustainability:
          compareGovernanceSemanticSustainability.governanceSemanticSustainability,
        governanceSemanticSurvivability:
          compareGovernanceSemanticSurvivability.governanceSemanticSurvivability,
        governanceSemanticDegradationTolerance:
          compareGovernanceSemanticDegradationTolerance.governanceSemanticDegradationTolerance,
        governanceSemanticObservabilityContinuity:
          compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
        governanceSemanticRecoverability:
          compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
        governanceSemanticIntegrityBoundary:
          compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
        governanceSemanticResilience:
          compareGovernanceSemanticResilience.governanceSemanticResilience,
        governanceSemanticConvergence:
          compareGovernanceSemanticConvergence.governanceSemanticConvergence,
        governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
        governanceReasoningCoherence:
          compareGovernanceReasoningCoherence.governanceReasoningCoherence,
        governanceExplainability:
          compareGovernanceExplainability.governanceExplainability,
        governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
        governanceRetention: compareGovernanceRetention.governanceRetention,
        governanceDisposition: compareGovernanceDisposition.governanceDisposition,
        governancePosture: compareGovernancePosture.governancePosture,
        operationalAttention: compareOperationalAttention.operationalAttention,
        operationalImpact: compareOperationalImpact.operationalImpact,
        decisionReadiness: compareDecisionReadiness.decisionReadiness,
        interpretationStability:
          compareInterpretationStability.interpretationStability,
        compareRisk: compareRisk.compareRisk,
        compareEvidence: compareEvidence.compareEvidence,
        compareConfidence: compareConfidence.compareConfidence,
        projectionFreshness: compareProjectionFreshness.projectionFreshness,
        truthAggregationQuality:
          compareTruthAggregationQuality.truthAggregationQuality,
        severity: compareOperatorTimeline.severity,
        operationalPriority: compareOperatorTimeline.operationalPriority,
        ownerActionability: compareOperatorTimeline.ownerActionability,
        reviewReadiness: compareOperatorTimeline.reviewReadiness,
        escalationReadiness: compareOperatorTimeline.escalationReadiness,
        operatorSummary: compareOperatorSummary.operatorSummary,
        operatorTimeline: compareOperatorTimeline.operatorTimeline,
        operatorMessage: compareOperatorTimeline.operatorMessage,
        operatorGuidance: compareOperatorTimeline.operatorGuidance,
        classification: compareOperatorTimeline.classification,
      }),
    compareHardening,
    governanceSemanticSustainability:
      compareGovernanceSemanticSustainability.governanceSemanticSustainability,
    governanceSemanticSurvivability:
      compareGovernanceSemanticSurvivability.governanceSemanticSurvivability,
    governanceSemanticDegradationTolerance:
      compareGovernanceSemanticDegradationTolerance.governanceSemanticDegradationTolerance,
    governanceSemanticObservabilityContinuity:
      compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
    governanceSemanticRecoverability:
      compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
    governanceSemanticIntegrityBoundary:
      compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
    governanceSemanticResilience:
      compareGovernanceSemanticResilience.governanceSemanticResilience,
    governanceSemanticConvergence:
      compareGovernanceSemanticConvergence.governanceSemanticConvergence,
    governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
    governanceReasoningCoherence:
      compareGovernanceReasoningCoherence.governanceReasoningCoherence,
    governanceExplainability:
      compareGovernanceExplainability.governanceExplainability,
    governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
    governanceRetention: compareGovernanceRetention.governanceRetention,
    governanceDisposition: compareGovernanceDisposition.governanceDisposition,
    governancePosture: compareGovernancePosture.governancePosture,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareOperatorTimeline.severity,
    operationalPriority: compareOperatorTimeline.operationalPriority,
    ownerActionability: compareOperatorTimeline.ownerActionability,
    reviewReadiness: compareOperatorTimeline.reviewReadiness,
    escalationReadiness: compareOperatorTimeline.escalationReadiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    operatorMessage: compareOperatorTimeline.operatorMessage,
    operatorGuidance: compareOperatorTimeline.operatorGuidance,
    classification: compareOperatorTimeline.classification,
    semanticMaintainabilitySource:
      "response_level_governance_semantic_maintainability_semantics_chain",
    semanticMaintainabilitySignals: [
      compareGovernanceSemanticSustainability.governanceSemanticSustainability,
      ...compareGovernanceSemanticSustainability.semanticSustainabilitySignals,
      "semantic_sustainability_metadata",
      "read_only_boundary",
    ],
  });
}

function resolveResponseGovernanceSemanticEvolvability(
  compareHardening: InventoryCompareHardeningMetadata,
  compareOperatorSummary: InventoryCompareOperatorSummaryMetadata,
  compareOperatorTimeline: InventoryCompareOperatorTimelineMetadata,
  compareConfidence: InventoryCompareConfidenceMetadata,
  compareProjectionFreshness: InventoryCompareProjectionFreshnessMetadata,
  compareTruthAggregationQuality: InventoryCompareTruthAggregationQualityMetadata,
  compareEvidence: InventoryCompareEvidenceMetadata,
  compareRisk: InventoryCompareRiskMetadata,
  compareInterpretationStability: InventoryCompareInterpretationStabilityMetadata,
  compareDecisionReadiness: InventoryCompareDecisionReadinessMetadata,
  compareOperationalImpact: InventoryCompareOperationalImpactMetadata,
  compareOperationalAttention: InventoryCompareOperationalAttentionMetadata,
  compareGovernancePosture: InventoryCompareGovernancePostureMetadata,
  compareGovernanceDisposition: InventoryCompareGovernanceDispositionMetadata,
  compareGovernanceRetention: InventoryCompareGovernanceRetentionMetadata,
  compareGovernanceAuditTrail: InventoryCompareGovernanceAuditTrailMetadata,
  compareGovernanceExplainability: InventoryCompareGovernanceExplainabilityMetadata,
  compareGovernanceReasoningCoherence: InventoryCompareGovernanceReasoningCoherenceMetadata,
  compareGovernanceSemanticDrift: InventoryCompareGovernanceSemanticDriftMetadata,
  compareGovernanceSemanticConvergence: InventoryCompareGovernanceSemanticConvergenceMetadata,
  compareGovernanceSemanticResilience: InventoryCompareGovernanceSemanticResilienceMetadata,
  compareGovernanceSemanticIntegrityBoundary: InventoryCompareGovernanceSemanticIntegrityBoundaryMetadata,
  compareGovernanceSemanticRecoverability: InventoryCompareGovernanceSemanticRecoverabilityMetadata,
  compareGovernanceSemanticObservabilityContinuity: InventoryCompareGovernanceSemanticObservabilityContinuityMetadata,
  compareGovernanceSemanticDegradationTolerance: InventoryCompareGovernanceSemanticDegradationToleranceMetadata,
  compareGovernanceSemanticSurvivability: InventoryCompareGovernanceSemanticSurvivabilityMetadata,
  compareGovernanceSemanticSustainability: InventoryCompareGovernanceSemanticSustainabilityMetadata,
  compareGovernanceSemanticMaintainability: InventoryCompareGovernanceSemanticMaintainabilityMetadata,
  compareProjections: readonly InventoryCompareProjection[],
): InventoryCompareGovernanceSemanticEvolvabilityMetadata {
  const firstUnavailableEvolvability = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticEvolvability
        ?.governanceSemanticEvolvability === "evolvability_unavailable",
  )?.metadata.compareGovernanceSemanticEvolvability;
  if (firstUnavailableEvolvability) return firstUnavailableEvolvability;

  const firstUnevolvableSemantics = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticEvolvability
        ?.governanceSemanticEvolvability === "unevolvable_semantics",
  )?.metadata.compareGovernanceSemanticEvolvability;
  if (firstUnevolvableSemantics) return firstUnevolvableSemantics;

  const firstFragileEvolvability = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticEvolvability
        ?.governanceSemanticEvolvability === "fragile_evolvability",
  )?.metadata.compareGovernanceSemanticEvolvability;
  if (firstFragileEvolvability) return firstFragileEvolvability;

  const firstConditionallyEvolvable = compareProjections.find(
    (projection) =>
      projection.metadata.compareGovernanceSemanticEvolvability
        ?.governanceSemanticEvolvability === "conditionally_evolvable",
  )?.metadata.compareGovernanceSemanticEvolvability;
  if (firstConditionallyEvolvable) return firstConditionallyEvolvable;

  return createCompareGovernanceSemanticEvolvabilityMetadata({
    governanceSemanticEvolvability: governanceSemanticEvolvabilityForSemantics({
      compareHardening,
      governanceSemanticMaintainability:
        compareGovernanceSemanticMaintainability.governanceSemanticMaintainability,
      governanceSemanticSustainability:
        compareGovernanceSemanticSustainability.governanceSemanticSustainability,
      governanceSemanticSurvivability:
        compareGovernanceSemanticSurvivability.governanceSemanticSurvivability,
      governanceSemanticDegradationTolerance:
        compareGovernanceSemanticDegradationTolerance.governanceSemanticDegradationTolerance,
      governanceSemanticObservabilityContinuity:
        compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
      governanceSemanticRecoverability:
        compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
      governanceSemanticIntegrityBoundary:
        compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
      governanceSemanticResilience:
        compareGovernanceSemanticResilience.governanceSemanticResilience,
      governanceSemanticConvergence:
        compareGovernanceSemanticConvergence.governanceSemanticConvergence,
      governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
      governanceReasoningCoherence:
        compareGovernanceReasoningCoherence.governanceReasoningCoherence,
      governanceExplainability:
        compareGovernanceExplainability.governanceExplainability,
      governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
      governanceRetention: compareGovernanceRetention.governanceRetention,
      governanceDisposition: compareGovernanceDisposition.governanceDisposition,
      governancePosture: compareGovernancePosture.governancePosture,
      operationalAttention: compareOperationalAttention.operationalAttention,
      operationalImpact: compareOperationalImpact.operationalImpact,
      decisionReadiness: compareDecisionReadiness.decisionReadiness,
      interpretationStability:
        compareInterpretationStability.interpretationStability,
      compareRisk: compareRisk.compareRisk,
      compareEvidence: compareEvidence.compareEvidence,
      compareConfidence: compareConfidence.compareConfidence,
      projectionFreshness: compareProjectionFreshness.projectionFreshness,
      truthAggregationQuality:
        compareTruthAggregationQuality.truthAggregationQuality,
      severity: compareOperatorTimeline.severity,
      operationalPriority: compareOperatorTimeline.operationalPriority,
      ownerActionability: compareOperatorTimeline.ownerActionability,
      reviewReadiness: compareOperatorTimeline.reviewReadiness,
      escalationReadiness: compareOperatorTimeline.escalationReadiness,
      operatorSummary: compareOperatorSummary.operatorSummary,
      operatorTimeline: compareOperatorTimeline.operatorTimeline,
      operatorMessage: compareOperatorTimeline.operatorMessage,
      operatorGuidance: compareOperatorTimeline.operatorGuidance,
      classification: compareOperatorTimeline.classification,
    }),
    compareHardening,
    governanceSemanticMaintainability:
      compareGovernanceSemanticMaintainability.governanceSemanticMaintainability,
    governanceSemanticSustainability:
      compareGovernanceSemanticSustainability.governanceSemanticSustainability,
    governanceSemanticSurvivability:
      compareGovernanceSemanticSurvivability.governanceSemanticSurvivability,
    governanceSemanticDegradationTolerance:
      compareGovernanceSemanticDegradationTolerance.governanceSemanticDegradationTolerance,
    governanceSemanticObservabilityContinuity:
      compareGovernanceSemanticObservabilityContinuity.governanceSemanticObservabilityContinuity,
    governanceSemanticRecoverability:
      compareGovernanceSemanticRecoverability.governanceSemanticRecoverability,
    governanceSemanticIntegrityBoundary:
      compareGovernanceSemanticIntegrityBoundary.governanceSemanticIntegrityBoundary,
    governanceSemanticResilience:
      compareGovernanceSemanticResilience.governanceSemanticResilience,
    governanceSemanticConvergence:
      compareGovernanceSemanticConvergence.governanceSemanticConvergence,
    governanceSemanticDrift: compareGovernanceSemanticDrift.governanceSemanticDrift,
    governanceReasoningCoherence:
      compareGovernanceReasoningCoherence.governanceReasoningCoherence,
    governanceExplainability:
      compareGovernanceExplainability.governanceExplainability,
    governanceAuditTrail: compareGovernanceAuditTrail.governanceAuditTrail,
    governanceRetention: compareGovernanceRetention.governanceRetention,
    governanceDisposition: compareGovernanceDisposition.governanceDisposition,
    governancePosture: compareGovernancePosture.governancePosture,
    operationalAttention: compareOperationalAttention.operationalAttention,
    operationalImpact: compareOperationalImpact.operationalImpact,
    decisionReadiness: compareDecisionReadiness.decisionReadiness,
    interpretationStability:
      compareInterpretationStability.interpretationStability,
    compareRisk: compareRisk.compareRisk,
    compareEvidence: compareEvidence.compareEvidence,
    compareConfidence: compareConfidence.compareConfidence,
    projectionFreshness: compareProjectionFreshness.projectionFreshness,
    truthAggregationQuality:
      compareTruthAggregationQuality.truthAggregationQuality,
    severity: compareOperatorTimeline.severity,
    operationalPriority: compareOperatorTimeline.operationalPriority,
    ownerActionability: compareOperatorTimeline.ownerActionability,
    reviewReadiness: compareOperatorTimeline.reviewReadiness,
    escalationReadiness: compareOperatorTimeline.escalationReadiness,
    operatorSummary: compareOperatorSummary.operatorSummary,
    operatorTimeline: compareOperatorTimeline.operatorTimeline,
    operatorMessage: compareOperatorTimeline.operatorMessage,
    operatorGuidance: compareOperatorTimeline.operatorGuidance,
    classification: compareOperatorTimeline.classification,
    semanticEvolvabilitySource:
      "response_level_governance_semantic_evolvability_semantics_chain",
    semanticEvolvabilitySignals: [
      compareGovernanceSemanticMaintainability.governanceSemanticMaintainability,
      ...compareGovernanceSemanticMaintainability.semanticMaintainabilitySignals,
      "semantic_maintainability_metadata",
      "read_only_boundary",
    ],
  });
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
  const compareOperatorGuidance = resolveResponseOperatorGuidance(
    compareHardening,
    compareOwnerActionability,
    readOnlyData.compareProjections,
  );
  const compareOperatorMessage = resolveResponseOperatorMessage(
    compareHardening,
    compareOperatorGuidance,
    readOnlyData.compareProjections,
  );
  const compareOperatorSummary = resolveResponseOperatorSummary(
    readOnlyData.compareProjections,
  );
  const compareOperatorTimeline = resolveResponseOperatorTimeline(
    compareHardening,
    compareOperatorMessage,
    compareOperatorSummary,
  );
  const compareConfidence = resolveResponseConfidence(
    compareHardening,
    compareOperatorSummary,
    compareOperatorTimeline,
    readOnlyData.compareProjections,
  );
  const compareProjectionFreshness = resolveResponseProjectionFreshness(
    compareHardening,
    compareOperatorSummary,
    compareOperatorTimeline,
    compareConfidence,
    readOnlyData.compareProjections,
  );
  const compareTruthAggregationQuality = resolveResponseTruthAggregationQuality(
    compareHardening,
    compareOperatorSummary,
    compareOperatorTimeline,
    compareConfidence,
    compareProjectionFreshness,
    readOnlyData.compareProjections,
  );
  const compareEvidence = resolveResponseCompareEvidence(
    compareHardening,
    compareOperatorSummary,
    compareOperatorTimeline,
    compareConfidence,
    compareProjectionFreshness,
    compareTruthAggregationQuality,
    readOnlyData.compareProjections,
  );
  const compareRisk = resolveResponseCompareRisk(
    compareHardening,
    compareOperatorSummary,
    compareOperatorTimeline,
    compareConfidence,
    compareProjectionFreshness,
    compareTruthAggregationQuality,
    compareEvidence,
    readOnlyData.compareProjections,
  );
  const compareInterpretationStability =
    resolveResponseInterpretationStability(
      compareHardening,
      compareOperatorSummary,
      compareOperatorTimeline,
      compareConfidence,
      compareProjectionFreshness,
      compareTruthAggregationQuality,
      compareEvidence,
      compareRisk,
      readOnlyData.compareProjections,
    );
  const compareDecisionReadiness = resolveResponseDecisionReadiness(
    compareHardening,
    compareOperatorMessage,
    compareOperatorSummary,
    compareOperatorTimeline,
    compareConfidence,
    compareProjectionFreshness,
    compareTruthAggregationQuality,
    compareEvidence,
    compareRisk,
    compareInterpretationStability,
    readOnlyData.compareProjections,
  );
  const compareOperationalImpact = resolveResponseOperationalImpact(
    compareHardening,
    compareOperatorSummary,
    compareOperatorTimeline,
    compareConfidence,
    compareProjectionFreshness,
    compareTruthAggregationQuality,
    compareEvidence,
    compareRisk,
    compareInterpretationStability,
    compareDecisionReadiness,
    readOnlyData.compareProjections,
  );
  const compareOperationalAttention = resolveResponseOperationalAttention(
    compareHardening,
    compareOperatorSummary,
    compareOperatorTimeline,
    compareConfidence,
    compareProjectionFreshness,
    compareTruthAggregationQuality,
    compareEvidence,
    compareRisk,
    compareInterpretationStability,
    compareDecisionReadiness,
    compareOperationalImpact,
    readOnlyData.compareProjections,
  );
  const compareGovernancePosture = resolveResponseGovernancePosture(
    compareHardening,
    compareOperatorSummary,
    compareOperatorTimeline,
    compareConfidence,
    compareProjectionFreshness,
    compareTruthAggregationQuality,
    compareEvidence,
    compareRisk,
    compareInterpretationStability,
    compareDecisionReadiness,
    compareOperationalImpact,
    compareOperationalAttention,
    readOnlyData.compareProjections,
  );
  const compareGovernanceDisposition = resolveResponseGovernanceDisposition(
    compareHardening,
    compareOperatorSummary,
    compareOperatorTimeline,
    compareConfidence,
    compareProjectionFreshness,
    compareTruthAggregationQuality,
    compareEvidence,
    compareRisk,
    compareInterpretationStability,
    compareDecisionReadiness,
    compareOperationalImpact,
    compareOperationalAttention,
    compareGovernancePosture,
    readOnlyData.compareProjections,
  );
  const compareGovernanceRetention = resolveResponseGovernanceRetention(
    compareHardening,
    compareOperatorSummary,
    compareOperatorTimeline,
    compareConfidence,
    compareProjectionFreshness,
    compareTruthAggregationQuality,
    compareEvidence,
    compareRisk,
    compareInterpretationStability,
    compareDecisionReadiness,
    compareOperationalImpact,
    compareOperationalAttention,
    compareGovernancePosture,
    compareGovernanceDisposition,
    readOnlyData.compareProjections,
  );
  const compareGovernanceAuditTrail = resolveResponseGovernanceAuditTrail(
    compareHardening,
    compareOperatorSummary,
    compareOperatorTimeline,
    compareConfidence,
    compareProjectionFreshness,
    compareTruthAggregationQuality,
    compareEvidence,
    compareRisk,
    compareInterpretationStability,
    compareDecisionReadiness,
    compareOperationalImpact,
    compareOperationalAttention,
    compareGovernancePosture,
    compareGovernanceDisposition,
    compareGovernanceRetention,
    readOnlyData.compareProjections,
  );
  const compareGovernanceExplainability = resolveResponseGovernanceExplainability(
    compareHardening,
    compareOperatorSummary,
    compareOperatorTimeline,
    compareConfidence,
    compareProjectionFreshness,
    compareTruthAggregationQuality,
    compareEvidence,
    compareRisk,
    compareInterpretationStability,
    compareDecisionReadiness,
    compareOperationalImpact,
    compareOperationalAttention,
    compareGovernancePosture,
    compareGovernanceDisposition,
    compareGovernanceRetention,
    compareGovernanceAuditTrail,
    readOnlyData.compareProjections,
  );
  const compareGovernanceReasoningCoherence =
    resolveResponseGovernanceReasoningCoherence(
      compareHardening,
      compareOperatorSummary,
      compareOperatorTimeline,
      compareConfidence,
      compareProjectionFreshness,
      compareTruthAggregationQuality,
      compareEvidence,
      compareRisk,
      compareInterpretationStability,
      compareDecisionReadiness,
      compareOperationalImpact,
      compareOperationalAttention,
      compareGovernancePosture,
      compareGovernanceDisposition,
      compareGovernanceRetention,
      compareGovernanceAuditTrail,
      compareGovernanceExplainability,
      readOnlyData.compareProjections,
    );
  const compareGovernanceSemanticDrift = resolveResponseGovernanceSemanticDrift(
    compareHardening,
    compareOperatorSummary,
    compareOperatorTimeline,
    compareConfidence,
    compareProjectionFreshness,
    compareTruthAggregationQuality,
    compareEvidence,
    compareRisk,
    compareInterpretationStability,
    compareDecisionReadiness,
    compareOperationalImpact,
    compareOperationalAttention,
    compareGovernancePosture,
    compareGovernanceDisposition,
    compareGovernanceRetention,
    compareGovernanceAuditTrail,
    compareGovernanceExplainability,
    compareGovernanceReasoningCoherence,
    readOnlyData.compareProjections,
  );
  const compareGovernanceSemanticConvergence =
    resolveResponseGovernanceSemanticConvergence(
      compareHardening,
      compareOperatorSummary,
      compareOperatorTimeline,
      compareConfidence,
      compareProjectionFreshness,
      compareTruthAggregationQuality,
      compareEvidence,
      compareRisk,
      compareInterpretationStability,
      compareDecisionReadiness,
      compareOperationalImpact,
      compareOperationalAttention,
      compareGovernancePosture,
      compareGovernanceDisposition,
      compareGovernanceRetention,
      compareGovernanceAuditTrail,
      compareGovernanceExplainability,
      compareGovernanceReasoningCoherence,
      compareGovernanceSemanticDrift,
      readOnlyData.compareProjections,
    );
  const compareGovernanceSemanticResilience =
    resolveResponseGovernanceSemanticResilience(
      compareHardening,
      compareOperatorSummary,
      compareOperatorTimeline,
      compareConfidence,
      compareProjectionFreshness,
      compareTruthAggregationQuality,
      compareEvidence,
      compareRisk,
      compareInterpretationStability,
      compareDecisionReadiness,
      compareOperationalImpact,
      compareOperationalAttention,
      compareGovernancePosture,
      compareGovernanceDisposition,
      compareGovernanceRetention,
      compareGovernanceAuditTrail,
      compareGovernanceExplainability,
      compareGovernanceReasoningCoherence,
      compareGovernanceSemanticDrift,
      compareGovernanceSemanticConvergence,
      readOnlyData.compareProjections,
    );
  const compareGovernanceSemanticIntegrityBoundary =
    resolveResponseGovernanceSemanticIntegrityBoundary(
      compareHardening,
      compareOperatorSummary,
      compareOperatorTimeline,
      compareConfidence,
      compareProjectionFreshness,
      compareTruthAggregationQuality,
      compareEvidence,
      compareRisk,
      compareInterpretationStability,
      compareDecisionReadiness,
      compareOperationalImpact,
      compareOperationalAttention,
      compareGovernancePosture,
      compareGovernanceDisposition,
      compareGovernanceRetention,
      compareGovernanceAuditTrail,
      compareGovernanceExplainability,
      compareGovernanceReasoningCoherence,
      compareGovernanceSemanticDrift,
      compareGovernanceSemanticConvergence,
      compareGovernanceSemanticResilience,
      readOnlyData.compareProjections,
    );
  const compareGovernanceSemanticRecoverability =
    resolveResponseGovernanceSemanticRecoverability(
      compareHardening,
      compareOperatorSummary,
      compareOperatorTimeline,
      compareConfidence,
      compareProjectionFreshness,
      compareTruthAggregationQuality,
      compareEvidence,
      compareRisk,
      compareInterpretationStability,
      compareDecisionReadiness,
      compareOperationalImpact,
      compareOperationalAttention,
      compareGovernancePosture,
      compareGovernanceDisposition,
      compareGovernanceRetention,
      compareGovernanceAuditTrail,
      compareGovernanceExplainability,
      compareGovernanceReasoningCoherence,
      compareGovernanceSemanticDrift,
      compareGovernanceSemanticConvergence,
      compareGovernanceSemanticResilience,
      compareGovernanceSemanticIntegrityBoundary,
      readOnlyData.compareProjections,
    );
  const compareGovernanceSemanticObservabilityContinuity =
    resolveResponseGovernanceSemanticObservabilityContinuity(
      compareHardening,
      compareOperatorSummary,
      compareOperatorTimeline,
      compareConfidence,
      compareProjectionFreshness,
      compareTruthAggregationQuality,
      compareEvidence,
      compareRisk,
      compareInterpretationStability,
      compareDecisionReadiness,
      compareOperationalImpact,
      compareOperationalAttention,
      compareGovernancePosture,
      compareGovernanceDisposition,
      compareGovernanceRetention,
      compareGovernanceAuditTrail,
      compareGovernanceExplainability,
      compareGovernanceReasoningCoherence,
      compareGovernanceSemanticDrift,
      compareGovernanceSemanticConvergence,
      compareGovernanceSemanticResilience,
      compareGovernanceSemanticIntegrityBoundary,
      compareGovernanceSemanticRecoverability,
      readOnlyData.compareProjections,
    );
  const compareGovernanceSemanticDegradationTolerance =
    resolveResponseGovernanceSemanticDegradationTolerance(
      compareHardening,
      compareOperatorSummary,
      compareOperatorTimeline,
      compareConfidence,
      compareProjectionFreshness,
      compareTruthAggregationQuality,
      compareEvidence,
      compareRisk,
      compareInterpretationStability,
      compareDecisionReadiness,
      compareOperationalImpact,
      compareOperationalAttention,
      compareGovernancePosture,
      compareGovernanceDisposition,
      compareGovernanceRetention,
      compareGovernanceAuditTrail,
      compareGovernanceExplainability,
      compareGovernanceReasoningCoherence,
      compareGovernanceSemanticDrift,
      compareGovernanceSemanticConvergence,
      compareGovernanceSemanticResilience,
      compareGovernanceSemanticIntegrityBoundary,
      compareGovernanceSemanticRecoverability,
      compareGovernanceSemanticObservabilityContinuity,
      readOnlyData.compareProjections,
    );
  const compareGovernanceSemanticSurvivability =
    resolveResponseGovernanceSemanticSurvivability(
      compareHardening,
      compareOperatorSummary,
      compareOperatorTimeline,
      compareConfidence,
      compareProjectionFreshness,
      compareTruthAggregationQuality,
      compareEvidence,
      compareRisk,
      compareInterpretationStability,
      compareDecisionReadiness,
      compareOperationalImpact,
      compareOperationalAttention,
      compareGovernancePosture,
      compareGovernanceDisposition,
      compareGovernanceRetention,
      compareGovernanceAuditTrail,
      compareGovernanceExplainability,
      compareGovernanceReasoningCoherence,
      compareGovernanceSemanticDrift,
      compareGovernanceSemanticConvergence,
      compareGovernanceSemanticResilience,
      compareGovernanceSemanticIntegrityBoundary,
      compareGovernanceSemanticRecoverability,
      compareGovernanceSemanticObservabilityContinuity,
      compareGovernanceSemanticDegradationTolerance,
      readOnlyData.compareProjections,
    );
  const compareGovernanceSemanticSustainability =
    resolveResponseGovernanceSemanticSustainability(
      compareHardening,
      compareOperatorSummary,
      compareOperatorTimeline,
      compareConfidence,
      compareProjectionFreshness,
      compareTruthAggregationQuality,
      compareEvidence,
      compareRisk,
      compareInterpretationStability,
      compareDecisionReadiness,
      compareOperationalImpact,
      compareOperationalAttention,
      compareGovernancePosture,
      compareGovernanceDisposition,
      compareGovernanceRetention,
      compareGovernanceAuditTrail,
      compareGovernanceExplainability,
      compareGovernanceReasoningCoherence,
      compareGovernanceSemanticDrift,
      compareGovernanceSemanticConvergence,
      compareGovernanceSemanticResilience,
      compareGovernanceSemanticIntegrityBoundary,
      compareGovernanceSemanticRecoverability,
      compareGovernanceSemanticObservabilityContinuity,
      compareGovernanceSemanticDegradationTolerance,
      compareGovernanceSemanticSurvivability,
      readOnlyData.compareProjections,
    );
  const compareGovernanceSemanticMaintainability =
    resolveResponseGovernanceSemanticMaintainability(
      compareHardening,
      compareOperatorSummary,
      compareOperatorTimeline,
      compareConfidence,
      compareProjectionFreshness,
      compareTruthAggregationQuality,
      compareEvidence,
      compareRisk,
      compareInterpretationStability,
      compareDecisionReadiness,
      compareOperationalImpact,
      compareOperationalAttention,
      compareGovernancePosture,
      compareGovernanceDisposition,
      compareGovernanceRetention,
      compareGovernanceAuditTrail,
      compareGovernanceExplainability,
      compareGovernanceReasoningCoherence,
      compareGovernanceSemanticDrift,
      compareGovernanceSemanticConvergence,
      compareGovernanceSemanticResilience,
      compareGovernanceSemanticIntegrityBoundary,
      compareGovernanceSemanticRecoverability,
      compareGovernanceSemanticObservabilityContinuity,
      compareGovernanceSemanticDegradationTolerance,
      compareGovernanceSemanticSurvivability,
      compareGovernanceSemanticSustainability,
      readOnlyData.compareProjections,
    );
  const compareGovernanceSemanticEvolvability =
    resolveResponseGovernanceSemanticEvolvability(
      compareHardening,
      compareOperatorSummary,
      compareOperatorTimeline,
      compareConfidence,
      compareProjectionFreshness,
      compareTruthAggregationQuality,
      compareEvidence,
      compareRisk,
      compareInterpretationStability,
      compareDecisionReadiness,
      compareOperationalImpact,
      compareOperationalAttention,
      compareGovernancePosture,
      compareGovernanceDisposition,
      compareGovernanceRetention,
      compareGovernanceAuditTrail,
      compareGovernanceExplainability,
      compareGovernanceReasoningCoherence,
      compareGovernanceSemanticDrift,
      compareGovernanceSemanticConvergence,
      compareGovernanceSemanticResilience,
      compareGovernanceSemanticIntegrityBoundary,
      compareGovernanceSemanticRecoverability,
      compareGovernanceSemanticObservabilityContinuity,
      compareGovernanceSemanticDegradationTolerance,
      compareGovernanceSemanticSurvivability,
      compareGovernanceSemanticSustainability,
      compareGovernanceSemanticMaintainability,
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
    compareOperatorGuidance,
    compareOperatorMessage,
    compareOperatorSummary,
    compareOperatorTimeline,
    compareConfidence,
    compareProjectionFreshness,
    compareTruthAggregationQuality,
    compareEvidence,
    compareRisk,
    compareInterpretationStability,
    compareDecisionReadiness,
    compareOperationalImpact,
    compareOperationalAttention,
    compareGovernancePosture,
    compareGovernanceDisposition,
    compareGovernanceRetention,
    compareGovernanceAuditTrail,
    compareGovernanceExplainability,
    compareGovernanceReasoningCoherence,
    compareGovernanceSemanticDrift,
    compareGovernanceSemanticConvergence,
    compareGovernanceSemanticResilience,
    compareGovernanceSemanticIntegrityBoundary,
    compareGovernanceSemanticRecoverability,
    compareGovernanceSemanticObservabilityContinuity,
    compareGovernanceSemanticDegradationTolerance,
    compareGovernanceSemanticSurvivability,
    compareGovernanceSemanticSustainability,
    compareGovernanceSemanticMaintainability,
    compareGovernanceSemanticEvolvability,
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
    compareOperatorGuidance,
    compareOperatorMessage,
    compareOperatorSummary,
    compareOperatorTimeline,
    compareConfidence,
    compareProjectionFreshness,
    compareTruthAggregationQuality,
    compareEvidence,
    compareRisk,
    compareInterpretationStability,
    compareDecisionReadiness,
    compareOperationalImpact,
    compareOperationalAttention,
    compareGovernancePosture,
    compareGovernanceDisposition,
    compareGovernanceRetention,
    compareGovernanceAuditTrail,
    compareGovernanceExplainability,
    compareGovernanceReasoningCoherence,
    compareGovernanceSemanticDrift,
    compareGovernanceSemanticConvergence,
    compareGovernanceSemanticResilience,
    compareGovernanceSemanticIntegrityBoundary,
    compareGovernanceSemanticRecoverability,
    compareGovernanceSemanticObservabilityContinuity,
    compareGovernanceSemanticDegradationTolerance,
    compareGovernanceSemanticSurvivability,
    compareGovernanceSemanticSustainability,
    compareGovernanceSemanticMaintainability,
    compareGovernanceSemanticEvolvability,
    normalizedData: mappedResponse.normalizedData,
    metadata: mappedResponse.metadata,
    statusSemantics: mappedResponse.statusSemantics,
    semanticBoundary: mappedResponse.semanticBoundary,
    executionBoundary: mappedResponse.executionBoundary,
  });
}
