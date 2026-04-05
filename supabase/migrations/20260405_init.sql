


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."phase_b1_prevent_negative_inventory_transactions"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_available numeric;
BEGIN
  IF NEW.transaction_type NOT IN ('OUT','MOVE') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(quantity_on_hand,0)
  INTO v_available
  FROM public.inventory_current
  WHERE part_no = NEW.part_no
    AND warehouse_code = NEW.warehouse_code
    AND location_code = NEW.location_code
    AND inventory_type = NEW.inventory_type;

  IF v_available < NEW.quantity THEN
    RAISE EXCEPTION 'negative inventory blocked';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."phase_b1_prevent_negative_inventory_transactions"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."inventory_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_type" "text" NOT NULL,
    "part_no" "text" NOT NULL,
    "part_name" "text",
    "quantity" numeric NOT NULL,
    "quantity_unit" "text" NOT NULL,
    "warehouse_code" "text" NOT NULL,
    "location_code" "text" NOT NULL,
    "inventory_type" "text" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_type" "text",
    "source_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "to_warehouse_code" "text",
    "to_location_code" "text",
    CONSTRAINT "chk_inventory_transactions_quantity" CHECK (("quantity" >= (0)::numeric)),
    CONSTRAINT "chk_inventory_transactions_type" CHECK (("transaction_type" = ANY (ARRAY['IN'::"text", 'OUT'::"text", 'MOVE'::"text", 'ADJUST'::"text"])))
);


ALTER TABLE "public"."inventory_transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."inventory_transactions" IS '部品在庫の事実ログ（simple_managed 等）。真実はここ。';



CREATE OR REPLACE FUNCTION "public"."phase_b1_sync_apply_row_to_inventory_current"("r" "public"."inventory_transactions") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF r.transaction_type = 'IN' THEN
    INSERT INTO public.inventory_current (part_no, warehouse_code, location_code, inventory_type, quantity_on_hand, updated_at)
    VALUES (r.part_no, r.warehouse_code, r.location_code, r.inventory_type, r.quantity, now())
    ON CONFLICT ON CONSTRAINT uq_inventory_current_natural_key DO UPDATE SET
      quantity_on_hand = public.inventory_current.quantity_on_hand + EXCLUDED.quantity_on_hand,
      updated_at = now();

  ELSIF r.transaction_type = 'OUT' THEN
    UPDATE public.inventory_current
    SET quantity_on_hand = GREATEST(0, quantity_on_hand - r.quantity),
        updated_at = now()
    WHERE part_no = r.part_no
      AND warehouse_code = r.warehouse_code
      AND location_code = r.location_code
      AND inventory_type = r.inventory_type;

  ELSIF r.transaction_type = 'MOVE' THEN
    -- from 減算
    UPDATE public.inventory_current
    SET quantity_on_hand = GREATEST(0, quantity_on_hand - r.quantity),
        updated_at = now()
    WHERE part_no = r.part_no
      AND warehouse_code = r.warehouse_code
      AND location_code = r.location_code
      AND inventory_type = r.inventory_type;

    -- to 加算
    INSERT INTO public.inventory_current (part_no, warehouse_code, location_code, inventory_type, quantity_on_hand, updated_at)
    VALUES (r.part_no, r.to_warehouse_code, r.to_location_code, r.inventory_type, r.quantity, now())
    ON CONFLICT ON CONSTRAINT uq_inventory_current_natural_key DO UPDATE SET
      quantity_on_hand = public.inventory_current.quantity_on_hand + EXCLUDED.quantity_on_hand,
      updated_at = now();
  END IF;
END;
$$;


ALTER FUNCTION "public"."phase_b1_sync_apply_row_to_inventory_current"("r" "public"."inventory_transactions") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."phase_b1_sync_inventory_current_from_transactions"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    PERFORM public.phase_b1_sync_undo_row_from_inventory_current(OLD);
  END IF;

  IF TG_OP IN ('INSERT','UPDATE') THEN
    PERFORM public.phase_b1_sync_apply_row_to_inventory_current(NEW);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."phase_b1_sync_inventory_current_from_transactions"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."phase_b1_sync_inventory_current_from_transactions"() IS 'Phase B-1: inventory_transactions INSERT に応じて inventory_current を更新する集約キャッシュ用。真実は inventory_transactions。';



CREATE OR REPLACE FUNCTION "public"."phase_b1_sync_undo_row_from_inventory_current"("r" "public"."inventory_transactions") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF r.transaction_type = 'IN' THEN
    UPDATE public.inventory_current
    SET quantity_on_hand = GREATEST(0, quantity_on_hand - r.quantity),
        updated_at = now()
    WHERE part_no = r.part_no
      AND warehouse_code = r.warehouse_code
      AND location_code = r.location_code
      AND inventory_type = r.inventory_type;

  ELSIF r.transaction_type = 'OUT' THEN
    UPDATE public.inventory_current
    SET quantity_on_hand = quantity_on_hand + r.quantity,
        updated_at = now()
    WHERE part_no = r.part_no
      AND warehouse_code = r.warehouse_code
      AND location_code = r.location_code
      AND inventory_type = r.inventory_type;

  ELSIF r.transaction_type = 'MOVE' THEN
    -- from 戻す
    UPDATE public.inventory_current
    SET quantity_on_hand = quantity_on_hand + r.quantity,
        updated_at = now()
    WHERE part_no = r.part_no
      AND warehouse_code = r.warehouse_code
      AND location_code = r.location_code
      AND inventory_type = r.inventory_type;

    -- to 戻す
    UPDATE public.inventory_current
    SET quantity_on_hand = GREATEST(0, quantity_on_hand - r.quantity),
        updated_at = now()
    WHERE part_no = r.part_no
      AND warehouse_code = r.to_warehouse_code
      AND location_code = r.to_location_code
      AND inventory_type = r.inventory_type;
  END IF;
END;
$$;


ALTER FUNCTION "public"."phase_b1_sync_undo_row_from_inventory_current"("r" "public"."inventory_transactions") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_phase_b1_row_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_phase_b1_row_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "supplier" "text",
    "part_no" "text" NOT NULL,
    "part_name" "text",
    "on_hand_qty" bigint DEFAULT 0 NOT NULL,
    "allocated_qty" bigint DEFAULT 0 NOT NULL,
    "available_qty" bigint DEFAULT 0 NOT NULL,
    CONSTRAINT "inventory_allocated_non_negative" CHECK (("allocated_qty" >= 0)),
    CONSTRAINT "inventory_available_consistency" CHECK (("available_qty" = ("on_hand_qty" - "allocated_qty"))),
    CONSTRAINT "inventory_available_non_negative" CHECK (("available_qty" >= 0)),
    CONSTRAINT "inventory_on_hand_non_negative" CHECK (("on_hand_qty" >= 0))
);


ALTER TABLE "public"."inventory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_current" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "part_no" "text" NOT NULL,
    "warehouse_code" "text" NOT NULL,
    "location_code" "text" NOT NULL,
    "inventory_type" "text" NOT NULL,
    "quantity_on_hand" numeric DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inventory_current" OWNER TO "postgres";


COMMENT ON TABLE "public"."inventory_current" IS '集約キャッシュ。inventory_transactions 等から算出する想定。真実ではない。';



CREATE TABLE IF NOT EXISTS "public"."pallet_item_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pallet_unit_id" "uuid" NOT NULL,
    "part_no" "text" NOT NULL,
    "part_name" "text",
    "quantity" numeric NOT NULL,
    "quantity_unit" "text" NOT NULL,
    "linked_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "unlinked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_pallet_item_links_quantity" CHECK (("quantity" > (0)::numeric))
);


ALTER TABLE "public"."pallet_item_links" OWNER TO "postgres";


COMMENT ON TABLE "public"."pallet_item_links" IS 'パレットと部品の紐付け。';



CREATE TABLE IF NOT EXISTS "public"."pallet_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pallet_unit_id" "uuid" NOT NULL,
    "transaction_type" "text" NOT NULL,
    "from_location_code" "text",
    "to_location_code" "text",
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_type" "text",
    "source_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pallet_transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."pallet_transactions" IS 'パレット在庫の事実ログ（pallet_managed）。';



CREATE TABLE IF NOT EXISTS "public"."pallet_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pallet_no" "text" NOT NULL,
    "warehouse_code" "text" NOT NULL,
    "location_code" "text" NOT NULL,
    "inventory_type" "text" NOT NULL,
    "status" "text" NOT NULL,
    "storage_area_tsubo" numeric DEFAULT 0.5 NOT NULL,
    "arrived_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "closed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_pallet_units_status" CHECK (("status" = ANY (ARRAY['IN_STOCK'::"text", 'SHIPPED'::"text", 'CLOSED'::"text"])))
);


ALTER TABLE "public"."pallet_units" OWNER TO "postgres";


COMMENT ON TABLE "public"."pallet_units" IS 'パレット現在状態。数量は持たない。イベントは pallet_transactions。';



CREATE TABLE IF NOT EXISTS "public"."shipments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "issue_no" "text",
    "supplier" "text",
    "part_name" "text",
    "quantity" bigint,
    "due_date" "date",
    "part_no" "text"
);


ALTER TABLE "public"."shipments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "movement_type" "text" NOT NULL,
    "supplier" "text",
    "part_no" "text" NOT NULL,
    "part_name" "text",
    "quantity" bigint NOT NULL,
    "movement_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "source_type" "text",
    "source_ref" "text",
    "shipment_id" "uuid",
    "note" "text",
    "idempotency_key" "text",
    CONSTRAINT "stock_movements_quantity_non_zero" CHECK (("quantity" <> 0)),
    CONSTRAINT "stock_movements_type_check" CHECK (("movement_type" = ANY (ARRAY['IN'::"text", 'OUT'::"text", 'ADJUST'::"text", 'RESERVE'::"text", 'RELEASE'::"text"])))
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trace_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "event_type" "text" NOT NULL,
    "event_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "trace_id" "text" NOT NULL,
    "qr_code" "text",
    "qr_type" "text",
    "supplier" "text",
    "part_no" "text",
    "part_name" "text",
    "issue_no" "text",
    "shipment_id" "uuid",
    "stock_movement_id" "uuid",
    "actor_type" "text",
    "actor_id" "text",
    "actor_name" "text",
    "location_type" "text",
    "location_code" "text",
    "location_name" "text",
    "device_type" "text",
    "device_id" "text",
    "status" "text",
    "quantity" bigint,
    "unit" "text",
    "payload" "jsonb",
    "note" "text",
    "idempotency_key" "text",
    CONSTRAINT "trace_events_actor_type_check" CHECK ((("actor_type" IS NULL) OR ("actor_type" = ANY (ARRAY['SHIPPER'::"text", 'DRIVER'::"text", 'WAREHOUSE'::"text", 'ADMIN'::"text", 'SYSTEM'::"text"])))),
    CONSTRAINT "trace_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['LABEL_PRINTED'::"text", 'SHIPPER_PACKED'::"text", 'SHIPPER_CONFIRMED'::"text", 'PICKUP_SCANNED'::"text", 'PICKUP_CONFIRMED'::"text", 'BRANCH_RECEIVED'::"text", 'WAREHOUSE_PUTAWAY'::"text", 'OUTBOUND_SCANNED'::"text", 'OUTBOUND_CONFIRMED'::"text", 'DELIVERED'::"text", 'EXCEPTION_RECORDED'::"text"]))),
    CONSTRAINT "trace_events_location_type_check" CHECK ((("location_type" IS NULL) OR ("location_type" = ANY (ARRAY['SHIPPER_SITE'::"text", 'BRANCH'::"text", 'WAREHOUSE'::"text", 'TRUCK'::"text", 'CUSTOMER_SITE'::"text", 'UNKNOWN'::"text"])))),
    CONSTRAINT "trace_events_status_check" CHECK ((("status" IS NULL) OR ("status" = ANY (ARRAY['OK'::"text", 'WARNING'::"text", 'ERROR'::"text", 'PARTIAL'::"text", 'CANCELLED'::"text"]))))
);


ALTER TABLE "public"."trace_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."trace_events" IS '現場イベントの事実ログ。荷主・ドライバー・倉庫・配送のトレーサビリティを記録する中心テーブル。';



COMMENT ON COLUMN "public"."trace_events"."event_type" IS 'イベント種別。LABEL_PRINTED, SHIPPER_CONFIRMED, PICKUP_SCANNED, DELIVERED など。';



COMMENT ON COLUMN "public"."trace_events"."trace_id" IS '同一物流単位を追跡する共通ID。PL、ケース、伝票などの追跡単位に対応。';



COMMENT ON COLUMN "public"."trace_events"."payload" IS 'GPS、読取結果、差異情報など、将来拡張用のJSONデータ。';



ALTER TABLE ONLY "public"."inventory_current"
    ADD CONSTRAINT "inventory_current_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_transactions"
    ADD CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_unique_supplier_part" UNIQUE ("supplier", "part_no");



ALTER TABLE ONLY "public"."pallet_item_links"
    ADD CONSTRAINT "pallet_item_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pallet_transactions"
    ADD CONSTRAINT "pallet_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pallet_units"
    ADD CONSTRAINT "pallet_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shipments"
    ADD CONSTRAINT "shipments_issue_no_part_no_key" UNIQUE ("issue_no", "part_no");



ALTER TABLE ONLY "public"."shipments"
    ADD CONSTRAINT "shipments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trace_events"
    ADD CONSTRAINT "trace_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_current"
    ADD CONSTRAINT "uq_inventory_current_natural_key" UNIQUE NULLS NOT DISTINCT ("part_no", "warehouse_code", "location_code", "inventory_type");



ALTER TABLE ONLY "public"."pallet_units"
    ADD CONSTRAINT "uq_pallet_units_pallet_no" UNIQUE ("pallet_no");



CREATE INDEX "idx_inventory_current_part_no" ON "public"."inventory_current" USING "btree" ("part_no");



CREATE INDEX "idx_inventory_part_no" ON "public"."inventory" USING "btree" ("part_no");



CREATE INDEX "idx_inventory_supplier" ON "public"."inventory" USING "btree" ("supplier");



CREATE INDEX "idx_inventory_transactions_occurred_at" ON "public"."inventory_transactions" USING "btree" ("occurred_at");



CREATE INDEX "idx_inventory_transactions_part_no" ON "public"."inventory_transactions" USING "btree" ("part_no");



CREATE INDEX "idx_inventory_transactions_warehouse_code" ON "public"."inventory_transactions" USING "btree" ("warehouse_code");



CREATE INDEX "idx_pallet_item_links_pallet_unit_id" ON "public"."pallet_item_links" USING "btree" ("pallet_unit_id");



CREATE INDEX "idx_pallet_item_links_part_no" ON "public"."pallet_item_links" USING "btree" ("part_no");



CREATE INDEX "idx_pallet_transactions_occurred_at" ON "public"."pallet_transactions" USING "btree" ("occurred_at");



CREATE INDEX "idx_pallet_transactions_pallet_unit_id" ON "public"."pallet_transactions" USING "btree" ("pallet_unit_id");



CREATE INDEX "idx_pallet_units_pallet_no" ON "public"."pallet_units" USING "btree" ("pallet_no");



CREATE INDEX "idx_pallet_units_status" ON "public"."pallet_units" USING "btree" ("status");



CREATE INDEX "idx_pallet_units_warehouse_code" ON "public"."pallet_units" USING "btree" ("warehouse_code");



CREATE INDEX "idx_stock_movements_created_at" ON "public"."stock_movements" USING "btree" ("created_at");



CREATE INDEX "idx_stock_movements_part_no" ON "public"."stock_movements" USING "btree" ("part_no");



CREATE INDEX "idx_stock_movements_shipment_id" ON "public"."stock_movements" USING "btree" ("shipment_id");



CREATE INDEX "idx_stock_movements_supplier" ON "public"."stock_movements" USING "btree" ("supplier");



CREATE INDEX "idx_stock_movements_type" ON "public"."stock_movements" USING "btree" ("movement_type");



CREATE INDEX "idx_trace_events_actor_id" ON "public"."trace_events" USING "btree" ("actor_id");



CREATE INDEX "idx_trace_events_event_at" ON "public"."trace_events" USING "btree" ("event_at");



CREATE INDEX "idx_trace_events_event_type" ON "public"."trace_events" USING "btree" ("event_type");



CREATE INDEX "idx_trace_events_issue_no" ON "public"."trace_events" USING "btree" ("issue_no");



CREATE INDEX "idx_trace_events_location_code" ON "public"."trace_events" USING "btree" ("location_code");



CREATE INDEX "idx_trace_events_part_no" ON "public"."trace_events" USING "btree" ("part_no");



CREATE INDEX "idx_trace_events_payload_gin" ON "public"."trace_events" USING "gin" ("payload");



CREATE INDEX "idx_trace_events_shipment_id" ON "public"."trace_events" USING "btree" ("shipment_id");



CREATE INDEX "idx_trace_events_stock_movement_id" ON "public"."trace_events" USING "btree" ("stock_movement_id");



CREATE INDEX "idx_trace_events_supplier" ON "public"."trace_events" USING "btree" ("supplier");



CREATE INDEX "idx_trace_events_trace_id" ON "public"."trace_events" USING "btree" ("trace_id");



CREATE UNIQUE INDEX "uniq_trace_event" ON "public"."trace_events" USING "btree" ("shipment_id", "event_type");



CREATE UNIQUE INDEX "uq_stock_movements_idempotency_key" ON "public"."stock_movements" USING "btree" ("idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE UNIQUE INDEX "uq_trace_events_idempotency_key" ON "public"."trace_events" USING "btree" ("idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE OR REPLACE TRIGGER "trg_inventory_updated_at" BEFORE UPDATE ON "public"."inventory" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_phase_b1_prevent_negative_inventory_transactions" BEFORE INSERT OR UPDATE ON "public"."inventory_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."phase_b1_prevent_negative_inventory_transactions"();



CREATE OR REPLACE TRIGGER "trigger_inventory_current_updated_at" BEFORE UPDATE ON "public"."inventory_current" FOR EACH ROW EXECUTE FUNCTION "public"."set_phase_b1_row_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_inventory_transactions_updated_at" BEFORE UPDATE ON "public"."inventory_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."set_phase_b1_row_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_pallet_item_links_updated_at" BEFORE UPDATE ON "public"."pallet_item_links" FOR EACH ROW EXECUTE FUNCTION "public"."set_phase_b1_row_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_pallet_units_updated_at" BEFORE UPDATE ON "public"."pallet_units" FOR EACH ROW EXECUTE FUNCTION "public"."set_phase_b1_row_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_phase_b1_inventory_transactions_sync_inventory_current" AFTER INSERT OR UPDATE ON "public"."inventory_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."phase_b1_sync_inventory_current_from_transactions"();



ALTER TABLE ONLY "public"."pallet_item_links"
    ADD CONSTRAINT "pallet_item_links_pallet_unit_id_fkey" FOREIGN KEY ("pallet_unit_id") REFERENCES "public"."pallet_units"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."pallet_transactions"
    ADD CONSTRAINT "pallet_transactions_pallet_unit_id_fkey" FOREIGN KEY ("pallet_unit_id") REFERENCES "public"."pallet_units"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trace_events"
    ADD CONSTRAINT "trace_events_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trace_events"
    ADD CONSTRAINT "trace_events_stock_movement_id_fkey" FOREIGN KEY ("stock_movement_id") REFERENCES "public"."stock_movements"("id") ON DELETE SET NULL;



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."phase_b1_prevent_negative_inventory_transactions"() TO "anon";
GRANT ALL ON FUNCTION "public"."phase_b1_prevent_negative_inventory_transactions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."phase_b1_prevent_negative_inventory_transactions"() TO "service_role";



GRANT ALL ON TABLE "public"."inventory_transactions" TO "anon";
GRANT ALL ON TABLE "public"."inventory_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_transactions" TO "service_role";



GRANT ALL ON FUNCTION "public"."phase_b1_sync_apply_row_to_inventory_current"("r" "public"."inventory_transactions") TO "anon";
GRANT ALL ON FUNCTION "public"."phase_b1_sync_apply_row_to_inventory_current"("r" "public"."inventory_transactions") TO "authenticated";
GRANT ALL ON FUNCTION "public"."phase_b1_sync_apply_row_to_inventory_current"("r" "public"."inventory_transactions") TO "service_role";



GRANT ALL ON FUNCTION "public"."phase_b1_sync_inventory_current_from_transactions"() TO "anon";
GRANT ALL ON FUNCTION "public"."phase_b1_sync_inventory_current_from_transactions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."phase_b1_sync_inventory_current_from_transactions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."phase_b1_sync_undo_row_from_inventory_current"("r" "public"."inventory_transactions") TO "anon";
GRANT ALL ON FUNCTION "public"."phase_b1_sync_undo_row_from_inventory_current"("r" "public"."inventory_transactions") TO "authenticated";
GRANT ALL ON FUNCTION "public"."phase_b1_sync_undo_row_from_inventory_current"("r" "public"."inventory_transactions") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_phase_b1_row_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_phase_b1_row_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_phase_b1_row_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."inventory" TO "anon";
GRANT ALL ON TABLE "public"."inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_current" TO "anon";
GRANT ALL ON TABLE "public"."inventory_current" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_current" TO "service_role";



GRANT ALL ON TABLE "public"."pallet_item_links" TO "anon";
GRANT ALL ON TABLE "public"."pallet_item_links" TO "authenticated";
GRANT ALL ON TABLE "public"."pallet_item_links" TO "service_role";



GRANT ALL ON TABLE "public"."pallet_transactions" TO "anon";
GRANT ALL ON TABLE "public"."pallet_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."pallet_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."pallet_units" TO "anon";
GRANT ALL ON TABLE "public"."pallet_units" TO "authenticated";
GRANT ALL ON TABLE "public"."pallet_units" TO "service_role";



GRANT ALL ON TABLE "public"."shipments" TO "anon";
GRANT ALL ON TABLE "public"."shipments" TO "authenticated";
GRANT ALL ON TABLE "public"."shipments" TO "service_role";



GRANT ALL ON TABLE "public"."stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_movements" TO "service_role";



GRANT ALL ON TABLE "public"."trace_events" TO "anon";
GRANT ALL ON TABLE "public"."trace_events" TO "authenticated";
GRANT ALL ON TABLE "public"."trace_events" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







