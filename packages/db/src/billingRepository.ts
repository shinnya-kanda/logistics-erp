import type {
  BillingMonthly,
  BillingMonthlyInsertInput,
  BillingSegment,
  BillingSegmentInsertInput,
} from "@logistics-erp/schema";
import { supabase } from "./client.js";

export async function insertBillingSegment(
  input: BillingSegmentInsertInput
): Promise<BillingSegment> {
  const row = {
    billing_type: input.billing_type,
    inventory_type: input.inventory_type ?? null,
    unit_type: input.unit_type,
    reference_type: input.reference_type ?? null,
    reference_id: input.reference_id ?? null,
    segment_start_at: input.segment_start_at ?? null,
    segment_end_at: input.segment_end_at ?? null,
    quantity: input.quantity ?? null,
    rate_type: input.rate_type ?? null,
    rate_value: input.rate_value ?? null,
    amount: input.amount ?? null,
    billing_month: input.billing_month ?? null,
    status: input.status ?? "draft",
    remarks: input.remarks ?? null,
  };

  const { data, error } = await supabase
    .from("billing_segments")
    .insert(row)
    .select()
    .single();

  if (error) {
    throw new Error(
      `[@logistics-erp/db] insertBillingSegment failed: ${error.message}`,
      { cause: error }
    );
  }

  return data as BillingSegment;
}

export async function insertBillingMonthly(
  input: BillingMonthlyInsertInput
): Promise<BillingMonthly> {
  const row = {
    billing_month: input.billing_month,
    customer_code: input.customer_code ?? null,
    customer_name: input.customer_name ?? null,
    inventory_type: input.inventory_type ?? null,
    total_amount: input.total_amount ?? 0,
    status: input.status ?? "draft",
    calculated_at: input.calculated_at ?? null,
    confirmed_at: input.confirmed_at ?? null,
    remarks: input.remarks ?? null,
  };

  const { data, error } = await supabase
    .from("billing_monthly")
    .insert(row)
    .select()
    .single();

  if (error) {
    throw new Error(
      `[@logistics-erp/db] insertBillingMonthly failed: ${error.message}`,
      { cause: error }
    );
  }

  return data as BillingMonthly;
}

export async function listBillingMonthlyByMonth(
  billingMonth: string
): Promise<BillingMonthly[]> {
  const { data, error } = await supabase
    .from("billing_monthly")
    .select("*")
    .eq("billing_month", billingMonth)
    .order("customer_code", { ascending: true });

  if (error) {
    throw new Error(
      `[@logistics-erp/db] listBillingMonthlyByMonth failed: ${error.message}`,
      { cause: error }
    );
  }

  return (data ?? []) as BillingMonthly[];
}
