import { randomUUID } from "node:crypto";
import { rebuildShipmentProgressAndIssuesWithSql } from "@logistics-erp/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createFixtureSql, type Sql } from "./fixtures/scanContractFixtures.js";

const REBUILD_PREFIX = "rebuild-contract-test";

type FixtureIds = {
  sourceId: string
  shipmentId: string
  itemId: string
};

const dbEnabled = Boolean(process.env.SCAN_CONTRACT_TEST_DATABASE_URL?.trim());

async function cleanupRebuildFixtures(sql: Sql): Promise<void> {
  const shipments = await sql<{ id: string }[]>`
    SELECT id::text
    FROM public.shipments
    WHERE shipment_no LIKE ${REBUILD_PREFIX + "%"}
  `;
  const shipmentIds = shipments.map((row) => row.id);

  if (shipmentIds.length > 0) {
    const items = await sql<{ id: string }[]>`
      SELECT id::text
      FROM public.shipment_items
      WHERE shipment_id IN ${sql(shipmentIds)}
    `;
    const itemIds = items.map((row) => row.id);

    if (itemIds.length > 0) {
      await sql`
        DELETE FROM public.scan_events
        WHERE shipment_item_id IN ${sql(itemIds)}
      `;
      await sql`
        DELETE FROM public.shipment_item_issues
        WHERE shipment_item_id IN ${sql(itemIds)}
      `;
      await sql`
        DELETE FROM public.shipment_item_progress
        WHERE shipment_item_id IN ${sql(itemIds)}
      `;
      await sql`
        DELETE FROM public.shipment_items
        WHERE id IN ${sql(itemIds)}
      `;
    }
  }

  await sql`
    DELETE FROM public.shipments
    WHERE shipment_no LIKE ${REBUILD_PREFIX + "%"}
  `;
  await sql`
    DELETE FROM public.source_files
    WHERE source_system = ${REBUILD_PREFIX}
  `;
}

async function seedSingleItemShipment(
  sql: Sql,
  quantityExpected: number,
  scanQuantities: Array<number | null>
): Promise<FixtureIds> {
  const ids: FixtureIds = {
    sourceId: randomUUID(),
    shipmentId: randomUUID(),
    itemId: randomUUID(),
  };
  const traceId = `tr-${ids.itemId}`;

  await sql`
    INSERT INTO public.source_files (
      id,
      file_type,
      file_name,
      checksum,
      source_system
    )
    VALUES (
      ${ids.sourceId}::uuid,
      'test',
      ${`${REBUILD_PREFIX}.csv`},
      ${`${REBUILD_PREFIX}-${ids.sourceId}`},
      ${REBUILD_PREFIX}
    )
  `;

  await sql`
    INSERT INTO public.shipments (
      id,
      source_file_id,
      shipment_no,
      shipper_name,
      status,
      supplier
    )
    VALUES (
      ${ids.shipmentId}::uuid,
      ${ids.sourceId}::uuid,
      ${`${REBUILD_PREFIX}-${ids.shipmentId}`},
      'Rebuild Contract Test',
      'imported',
      'rebuild-contract'
    )
  `;

  await sql`
    INSERT INTO public.shipment_items (
      id,
      shipment_id,
      line_no,
      trace_id,
      part_no,
      part_name,
      quantity_expected,
      quantity_unit,
      unload_location,
      external_barcode,
      match_key,
      status,
      source_row_no
    )
    VALUES (
      ${ids.itemId}::uuid,
      ${ids.shipmentId}::uuid,
      1,
      ${traceId},
      'REBUILD-PART',
      'rebuild part',
      ${quantityExpected},
      'ea',
      null,
      null,
      null,
      'planned',
      1
    )
  `;

  for (let i = 0; i < scanQuantities.length; i += 1) {
    const quantity = scanQuantities[i];
    await sql`
      INSERT INTO public.scan_events (
        trace_id,
        shipment_item_id,
        scan_type,
        scanned_code,
        quantity_scanned,
        result_status,
        scanned_at,
        raw_payload
      )
      VALUES (
        ${traceId},
        ${ids.itemId}::uuid,
        'unload',
        'REBUILD-PART',
        ${quantity === null ? null : String(quantity)}::numeric,
        'matched',
        ${`2026-04-25T00:00:0${i}.000Z`}::timestamptz,
        ${sql.json({ fixture: REBUILD_PREFIX, index: i })}
      )
    `;
  }

  return ids;
}

async function getProgress(sql: Sql, itemId: string) {
  const rows = await sql<
    {
      quantity_scanned_total: string
      progress_status: string
      first_scanned_at: string | null
      last_scanned_at: string | null
    }[]
  >`
    SELECT
      quantity_scanned_total::text,
      progress_status,
      first_scanned_at::text,
      last_scanned_at::text
    FROM public.shipment_item_progress
    WHERE shipment_item_id = ${itemId}::uuid
  `;
  return rows[0] ?? null;
}

async function getOpenIssues(sql: Sql, itemId: string) {
  return await sql<
    { issue_type: string; expected_value: string | null; actual_value: string | null }[]
  >`
    SELECT issue_type, expected_value, actual_value
    FROM public.shipment_item_issues
    WHERE shipment_item_id = ${itemId}::uuid
      AND resolved_at IS NULL
    ORDER BY created_at ASC, id ASC
  `;
}

describe.skipIf(!dbEnabled)("rebuildShipmentProgressAndIssues", () => {
  let sql: Sql;

  beforeAll(async () => {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) throw new Error("DATABASE_URL missing after vitest.setup");
    sql = createFixtureSql(url);
  });

  beforeEach(async () => {
    await cleanupRebuildFixtures(sql);
  });

  afterAll(async () => {
    await cleanupRebuildFixtures(sql);
    await sql.end({ timeout: 5 });
  });

  it("restores progress from scan_events after progress rows are deleted", async () => {
    const ids = await seedSingleItemShipment(sql, 2, [1, 1]);
    await sql`
      DELETE FROM public.shipment_item_progress
      WHERE shipment_item_id = ${ids.itemId}::uuid
    `;

    const result = await rebuildShipmentProgressAndIssuesWithSql(
      sql,
      ids.shipmentId
    );

    expect(result.progress_rebuilt_count).toBe(1);
    expect(result.statuses.matched).toBe(1);
    const progress = await getProgress(sql, ids.itemId);
    expect(progress?.quantity_scanned_total).toBe("2");
    expect(progress?.progress_status).toBe("matched");
    expect(progress?.first_scanned_at).toBeTruthy();
    expect(progress?.last_scanned_at).toBeTruthy();
  });

  it("regenerates excess issues with expected and actual values", async () => {
    const ids = await seedSingleItemShipment(sql, 2, [1, 1, 1]);
    await sql`
      DELETE FROM public.shipment_item_issues
      WHERE shipment_item_id = ${ids.itemId}::uuid
    `;

    const result = await rebuildShipmentProgressAndIssuesWithSql(
      sql,
      ids.shipmentId
    );

    expect(result.issues_rebuilt_count).toBe(1);
    expect(result.statuses.excess).toBe(1);
    const issues = await getOpenIssues(sql, ids.itemId);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      issue_type: "excess",
      expected_value: "2",
      actual_value: "3",
    });
  });

  it("does not create issues for matched items", async () => {
    const ids = await seedSingleItemShipment(sql, 2, [1, 1]);

    const result = await rebuildShipmentProgressAndIssuesWithSql(
      sql,
      ids.shipmentId
    );

    expect(result.issues_rebuilt_count).toBe(0);
    expect(result.statuses.matched).toBe(1);
    const progress = await getProgress(sql, ids.itemId);
    expect(progress?.progress_status).toBe("matched");
    await expect(getOpenIssues(sql, ids.itemId)).resolves.toHaveLength(0);
  });
});
