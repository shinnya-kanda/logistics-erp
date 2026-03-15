# 冪等性と trace_id

## なぜ stock_movements は厳密な重複防止が必要か

在庫移動は「何個入ったか・出たか」の履歴なので、同じ取込や同じ操作が二重に insert されると在庫数が狂う。そのため **idempotency_key** で「同じキーなら insert せず既存を返す」ようにし、importer の再実行や API のリトライに耐える。

## なぜ trace_events にも idempotency_key が必要か

trace_events は「いつ・どこで・何が起きたか」のイベント台帳。同じイベント（例: importer による SHIPPER_CONFIRMED）が複数回登録されると、追跡結果が重複して見える。QR / driver app / shipper app からも登録する想定なので、クライアントごとの冪等キー（例: client_event_id）を idempotency_key に載せて重複を防ぐ。

## importer 再実行時の考え方

- **shipments**: upsert（issue_no + part_no）なので再実行しても行は増えず更新される。
- **stock_movements**: `idempotency_key = RECEIPT:{shipment_id}:IN` を付与。同一 shipment に対する IN は 1 回だけ insert され、2 回目は unique 制約で既存行が返る。
- **trace_events**: `idempotency_key = IMPORTER_INIT:{shipment_id}:SHIPPER_CONFIRMED` を付与。同様に再実行時は既存イベントを返す。
- **inventory**: 同じ shipment で再実行すると on_hand_qty が二重に加算される可能性はある。在庫は「movement を集計する」か「idempotency の後にだけ更新する」など、別途設計が必要。

## trace_id は物流単位を追う共通キー

**trace_id** は「この荷物・この単位を一意に追いかけるキー」として使う。QR スキャン、ドライバー集荷、倉庫入出庫、納品まで、同じ trace_id のイベントを並べると経路が分かる。

## 現在の trace_id ルール

- **形式**: `TRC:{issue_no}:{part_no}`
- issue_no / part_no は **normalizeTraceToken** で正規化（trim、大文字、`:` `/` `\` 空白は `-`、英数字・ハイフン・アンダースコア以外は `-`）。空なら `UNKNOWN`。
- 例: `issue_no=TEST-001`, `part_no=P-100` → `TRC:TEST-001:P-100`

## 将来の拡張

- **pallet / case / item 階層**: trace_id を親子で持たせたり、`TRC:...:pallet:...` のように階層を表すセグメントを足したりする拡張が可能。
- **TODO**: trace_id を **trace_units** 親テーブルへ昇格させ、1 trace_id = 1 単位のメタデータを持つ設計にする可能性。
- **TODO**: transaction / outbox / **importer_run_id** の導入で、取込単位ごとのロールバックや再実行範囲を明確にする可能性。
