# trace_events 設計

## 役割

**trace_events** は「現場で何が起きたか」を残す**イベント台帳**。QR 読取・荷主出荷・ドライバー集荷・営業所受領・棚入れ・出庫・納品まで、一連の流れを時系列で記録する。

## shipments / stock_movements / inventory との違い

| テーブル | 役割 |
|----------|------|
| **shipments** | 取込元データ（CSV/PDF など）。「何を・いつ届けるか」の指示。 |
| **stock_movements** | 在庫の増減履歴（IN/OUT/ADJUST 等）。数量の変動を記録。 |
| **inventory** | 現在庫の集約（on_hand / allocated / available）。 |
| **trace_events** | **誰が・どこで・何をしたか**のイベントログ。在庫移動とは独立した「事実」の列。 |

在庫テーブルは「何個あるか」、trace_events は「何が起きたか（スキャン・確認・例外など）」を扱う。

## なぜ trace_events が QR 物流の中心になるか

- 各拠点・ドライバー・倉庫で **QR スキャン**や**操作確認**が発生するたびに 1 件ずつイベントを積み上げる。
- **trace_id** で一連の荷物・ラベルを紐づけ、**event_at** 順に並べれば「荷物の通った経路」がそのまま見える。
- 在庫移動（stock_movements）や請求（billing）は、必要に応じて trace_events を参照して集計・紐づけする。

## trace_id の考え方

- 一つの荷物・ラベル・出荷単位を識別する ID。同じ trace_id のイベントを並べると、その荷物のライフサイクルが分かる。
- 暫定では **issue_no + ":" + part_no** を使用。将来的には QR コード値やラベル ID をそのまま trace_id にしてもよい。

## 今後の拡張

- **driver app**: 集荷スキャン → PICKUP_SCANNED / PICKUP_CONFIRMED を登録。
- **shipper app**: 出荷確認 → SHIPPER_PACKED / SHIPPER_CONFIRMED。
- **warehouse app**: 受領・棚入れ・出庫 → BRANCH_RECEIVED, WAREHOUSE_PUTAWAY, OUTBOUND_SCANNED 等。

各アプリは `insertTraceEvent` を呼び、event_type / actor_type / location などを設定して trace_events に書き込む想定。
