# CQRS Architecture（Phase B7-83）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における CQRS（Command Query Responsibility Segregation）の考え方を整理する。

logistics-erp では、在庫・パレット・出荷・OCR / EDI・請求・trace のように、書き込み時の業務制約が強い領域と、検索・集計・監視のために高速参照したい領域が混在する。

本ドキュメントでは以下を整理する。

- CQRS の目的
- CRUD と CQRS の違い
- command と query の違い
- write model / read model
- projection / event store との関係
- `inventory_current` / `pallet_units` cache の位置づけ
- admin dashboard / billing / trace / monitoring read model
- rebuild / replay との関係
- eventual consistency との関係
- distributed workflow と CQRS の関係
- audit / forensic / observability との関係
- CQRS を過剰導入しない方針

今回は Markdown の設計整理のみを行い、migration・実装・Edge Function・RPC・README は変更しない。

---

## ■ CQRS の目的

CQRS は、書き込み責務（Command）と読み取り責務（Query）を分離する考え方である。

目的:

- 書き込み側で業務ルール・整合性・権限を厳密に扱う
- 読み取り側で検索・集計・画面表示を最適化する
- event store / ledger を source of truth として保つ
- projection / read model を用途別に作れるようにする
- rebuild / replay / audit / monitoring の責務を整理する

CQRS は、すべてのテーブルやAPIを複雑に分割するためのものではない。

書き込みと読み取りの要件が明確に違う箇所で、責務を分離して説明可能性と拡張性を高めるための設計である。

---

## ■ CRUD と CQRS の違い

CRUD は、同じ model に対して Create / Read / Update / Delete を行う考え方である。

CQRS は、書き込み用 model と読み取り用 model を分ける考え方である。

| 項目 | CRUD | CQRS |
| --- | --- | --- |
| 主な考え方 | 同じ model を読み書きする | command と query を分離する |
| 書き込み | create / update / delete | business command |
| 読み取り | 同じ table / model を読む | read model / projection を読む |
| 監査性 | update / delete で履歴が薄くなりやすい | event store / ledger を残しやすい |
| 例 | `pallet_units` を直接更新して読む | `pallet_transactions` に書き、`pallet_units` を projection として読む |

方針:

- 単純なマスタ管理は CRUD で十分な場合がある
- 在庫・パレット・trace・billing のような監査性が重要な領域は CQRS 的に扱う
- CRUD から CQRS へ一気に全面移行しない

---

## ■ command と query の違い

command は、業務状態を変更する要求である。

query は、業務状態を参照する要求である。

| 項目 | command | query |
| --- | --- | --- |
| 目的 | 状態を変える | 状態を読む |
| 副作用 | ある | ない |
| 例 | 在庫入庫、出庫、パレット移動 | 在庫検索、trace検索、dashboard表示 |
| 主な責務 | validation / authorization / transaction / idempotency | filtering / sorting / aggregation / presentation |
| 観測軸 | request_id / trace_id / idempotency_key | trace_id / query condition / read model version |

方針:

- command は必ずサーバー側で権限・warehouse_code・業務制約を確定する
- query は副作用を持たない
- query のために真実ログを変更しない
- command の結果として read model が更新されることはある

---

## ■ write model の考え方

write model は、業務状態を変更するための model である。

主な責務:

- 業務 validation
- role / warehouse_code 制御
- idempotency
- DB transaction
- event / transaction / history の作成
- trace_id / request_id / metadata の付与
- correction / compensation の記録

write model の例:

- `inventory_transactions`
- `pallet_transactions`
- `warehouse_location_history`
- 将来の shipment event / billing event
- 将来の OCR / EDI external input event

方針:

- write model は source of truth を作る
- write model は UI 表示都合に引きずられない
- update / delete ではなく append-only / correction event を基本にする
- 即時整合が必要な範囲は RPC などの local transaction で守る

---

## ■ read model の考え方

read model は、検索・表示・集計のために最適化された model である。

主な責務:

- 画面表示
- 検索
- 集計
- monitoring
- timeline 表示
- report / billing summary
- dashboard KPI

read model の例:

- `inventory_current`
- `pallet_units`
- trace-search の統合結果
- admin dashboard 用の一覧データ
- 将来の billing summary
- 将来の monitoring aggregate

方針:

- read model は source of truth ではない
- read model は rebuild 可能であることを目指す
- read model がずれた場合は event store / write model を根拠に検証する
- read model を直接直すだけでは audit / integrity は回復しない

---

## ■ projection との関係

projection は、event store / write model から read model を作る処理または結果である。

例:

```text
inventory_transactions
  -> projection
  -> inventory_current
```

```text
pallet_transactions
  -> projection
  -> pallet_units
```

```text
inventory_transactions / pallet_transactions / warehouse_location_history
  -> projection
  -> trace timeline
```

方針:

- projection は用途ごとに分かれてよい
- projection の不整合は rebuild / validation で検出する
- projection の更新方式は同期・非同期どちらも候補になり得る
- projection の失敗は monitoring 対象にする

---

## ■ event store との関係

event store は、業務上の事実を保存する source of truth である。

CQRS では、command が event store / ledger に事実を書き込み、query はそこから作られた read model を読む。

関係:

```text
Command
  -> write model / event store
  -> projection
  -> read model
  -> Query
```

方針:

- event store は query 都合で直接変更しない
- read model は event store から再生成できることを目指す
- replay / correction も event store に新しい event として追加する
- event store と read model の差分は integrity / observability の対象になる

---

## ■ inventory_current の位置づけ

`inventory_current` は、在庫現在数量を高速参照するための read model / projection である。

source of truth は `inventory_transactions` である。

関係:

```text
Command: inventory in / out / move / adjust
  -> inventory_transactions
  -> inventory_current
Query: inventory search / dashboard / field app display
```

方針:

- 数量変動の根拠は `inventory_transactions` に置く
- `inventory_current` は在庫検索や画面表示のために読む
- `inventory_current` の値だけを監査根拠にしない
- `inventory_transactions` から rebuild できることを目指す
- 差分が出た場合は ledger を優先して調査する

---

## ■ pallet_units cache の位置づけ

`pallet_units` は、パレット現在状態を参照するための read model / cache として扱う。

source of truth は `pallet_transactions` である。

関係:

```text
Command: pallet create / move / out / item link
  -> pallet_transactions
  -> pallet_units
Query: pallet search / location display / admin dashboard
```

方針:

- パレット操作の履歴根拠は `pallet_transactions` に置く
- `pallet_units.current_location_code` は現在位置表示のための cache として扱う
- cache の直接修正だけで履歴の不整合を解決しない
- 誤移動や補正は correction event / 追加 transaction として説明する

---

## ■ admin dashboard 向け read model

admin dashboard は、管理者・事務担当者が業務状態を確認するための query 側である。

主な read model 候補:

- 在庫一覧
- パレット一覧
- trace timeline
- warehouse location history
- shipment 状態一覧
- billing candidate summary
- OCR / EDI 取込状況
- integrity warning

方針:

- admin dashboard は原則として read model を読む
- 表示都合のために write model を歪めない
- trace_id / parent_trace_id / request_id を調査軸として表示できるようにする
- read model の鮮度や最終更新時刻を将来検討する

---

## ■ billing / trace / monitoring read model

### billing read model

billing read model は、請求候補・請求根拠・確定状態を確認するための読み取りモデルである。

候補:

- shipment 別請求候補
- warehouse_code 別請求集計
- inventory / pallet / shipment の根拠リンク
- correction / cancel 状態

注意:

- billing は audit / retention / replay 禁止ケースに強く関係する
- billing summary は source of truth ではなく、billing event / shipment event からの projection として扱う

### trace read model

trace read model は、複数 source の event を timeline として確認するための読み取りモデルである。

候補:

- `trace_id` timeline
- `parent_trace_id` workflow timeline
- request_id 検索
- replay / correction 関連表示

### monitoring read model

monitoring read model は、運用上の異常・遅延・不整合を検知するための読み取りモデルである。

候補:

- workflow stuck count
- missing event count
- duplicate trace count
- projection rebuild diff
- retry / timeout count
- domain 別 failure count

方針:

- billing / trace / monitoring は write model とは別の read concern を持つ
- 集計・監視のために source of truth を変更しない
- alert や dashboard は read model から作るが、調査時は event store へ戻れるようにする

---

## ■ rebuild / replay との関係

### rebuild

rebuild は、write model / event store から read model / projection を再作成する考え方である。

例:

- `inventory_transactions` から `inventory_current` を再構築する
- `pallet_transactions` から `pallet_units` を検証する
- trace timeline を複数 event store から再作成する
- billing summary を shipment / inventory / billing event から再計算する

方針:

- read model は rebuild 可能性を意識して設計する
- rebuild 結果と現行 read model の差分を検出する
- rebuild の根拠は source of truth に置く

### replay

replay は、過去の入力・event・trace を参照して新しい操作として再実行する考え方である。

方針:

- replay は command 側の処理である
- replay 結果は write model / event store に新しい event として追加する
- replay 後に必要な read model を更新または rebuild する
- replay と query の再実行を混同しない

---

## ■ eventual consistency との関係

CQRS では、write model 更新と read model 反映の間に時間差が発生する可能性がある。

この時間差を扱う考え方が eventual consistency である。

例:

- 在庫出庫 command は成功したが、dashboard 集計反映が少し遅れる
- shipment workflow の後続 read model が非同期で更新される
- monitoring aggregate が一定間隔で更新される

方針:

- 即時整合が必要な field operation では local transaction と同期 projection を検討する
- dashboard / monitoring / billing summary では eventual consistency を許容できる場合がある
- eventual consistency は不整合放置ではなく、遅延・失敗・stuck の監視を含む
- read model の鮮度を UI / metadata で説明できるようにすることを検討する

---

## ■ distributed workflow と CQRS の関係

distributed workflow は、複数 domain / 複数 command / 複数 event にまたがる長い業務フローである。

CQRS では、workflow の各 step が command として write model を更新し、read model が workflow の進行状態を表示・監視する。

例:

```text
Command: shipment.pick.confirmed
  -> shipment event store
  -> integration event
Command: inventory.out.distributed
  -> inventory_transactions
  -> inventory_current projection
Command: billing.candidate_created
  -> billing event store
  -> billing summary read model
```

方針:

- workflow の進行管理と read model 表示を分けて考える
- workflow の source of truth は event / transaction / history に置く
- workflow status read model は再構築可能にすることを目指す
- stuck workflow や missing event は monitoring read model で検知する

---

## ■ audit / forensic / observability との関係

### audit

audit では、write model / event store を根拠に「誰が・いつ・何を・なぜ行ったか」を説明する。

read model は説明の入口として便利だが、最終根拠ではない。

### forensic

forensic では、障害・不正・不整合の原因を追う。

確認観点:

- command が成功したか
- event store に event があるか
- projection が失敗していないか
- read model が古くないか
- replay / correction が元 event と対応しているか

### observability

observability では、command / projection / query の流れを追えることが重要である。

観測候補:

- command count / failure
- projection latency / failure
- read model freshness
- query latency
- rebuild diff
- retry / timeout
- trace_id / parent_trace_id / request_id

方針:

- read model の見た目だけで業務事実を判断しない
- 調査時は read model から source of truth へ戻れるようにする
- command / projection / query のどこで問題が起きたかを分離して観測する

---

## ■ CQRS を過剰導入しない方針

CQRS は強力だが、すべてに導入すると複雑さが増える。

過剰導入のリスク:

- model が増えすぎて保守しにくい
- projection の失敗・遅延を監視する必要が増える
- eventual consistency を業務担当者に説明しにくい
- 小さなCRUDまで複雑になる
- read model の鮮度・再構築・権限設計が増える

導入判断の目安:

- 書き込みルールが複雑か
- 監査性が必要か
- 読み取り負荷や集計要件が強いか
- rebuild / replay が必要か
- workflow / trace / monitoring と接続するか

方針:

- master data や単純設定は CRUD を維持してよい
- inventory / pallet / trace / workflow / billing など、履歴と監査が重要な領域を優先する
- CQRS は段階的に導入する
- read model を増やす場合は、source of truth と rebuild 方針をセットで整理する

---

## ■ 導入段階案

### Step 1: 既存 write model / read model の棚卸し

`inventory_transactions`、`pallet_transactions`、`warehouse_location_history`、`inventory_current`、`pallet_units` の責務を整理する。

### Step 2: projection 対応表を作成

どの write model からどの read model が作られるか整理する。

### Step 3: read model の鮮度・再構築方針を整理

dashboard、trace、monitoring、billing summary について、rebuild 可能性と更新タイミングを検討する。

### Step 4: distributed workflow との接続を整理

workflow step と command、workflow status read model、monitoring read model の関係を整理する。

### Step 5: CQRS 導入対象を限定する

監査性・検索性能・rebuild / replay の必要性が高い領域から段階的に適用する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- CQRS をどの API / domain から導入するか
- command handler の実装単位
- query API の分離単位
- projection 更新を同期にするか非同期にするか
- projection failure の保存先
- read model freshness の表現方法
- `inventory_current` rebuild の正式手順
- `pallet_units` rebuild / validation の正式手順
- admin dashboard 専用 read model を作るか
- billing summary read model を作るか
- trace timeline read model を永続化するか
- monitoring aggregate を保存するか
- read model の権限・warehouse_code 制御
- CQRS と OpenTelemetry の対応

---

## ■ 原則

command は業務状態を変更する。

query は業務状態を参照する。

write model / event store は source of truth を作る。

read model / projection / cache は source of truth から導出される。

CQRS は必要な領域に段階的に導入し、単純なCRUDまで過剰に複雑化しない。
