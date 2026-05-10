# Inventory / Pallet Consistency Policy（Phase B9-11）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、`inventory_current` と `pallet_units` / `pallet_item_links` の現在状態がズレる問題について、同期・差異検出・補正の方針を整理する。

logistics-erp では、在庫数量、パレット位置、パレット上の品番構成を現場が素早く確認できる必要がある。一方で、現在状態テーブルは source of truth ではない。表示上のズレを直接 update で隠すと、後から `inventory_transactions` や `pallet_transactions` で説明できなくなる。

この policy の目的は以下である。

- `inventory_transactions` / `inventory_current` / `pallet_units` / `pallet_item_links` の責務を分ける
- `inventory_current` と `pallet_item_links` がズレるケースを明確にする
- pallet 単位移動と部品単位移動の責務を整理する
- compare-only で差異を見える化する方針を定義する
- correction / recovery に進む前の判断基準を整理する
- 自動同期を急がず、現場説明可能な段階導入を守る

今回は policy 追加のみを行い、migration・RPC・Edge Function・UI・自動同期・correction・rebuild / replay は実装しない。

---

## ■ 基本責務

### `inventory_transactions`

`inventory_transactions` は inventory domain の source of truth である。

在庫数量の増減、部品単位の入庫・出庫・移動・調整は、原則として `inventory_transactions` に記録された履歴で説明する。

方針:

- 数量の真実は `inventory_transactions` に置く
- commit 済み履歴は削除・上書きで消さない
- 誤りがある場合は correction / compensation transaction を検討する
- `inventory_current` や UI 表示を直接直して履歴不整合を隠さない

### `inventory_current`

`inventory_current` は部品現在庫 projection / read model である。

主な用途は、部品番号、棚番、在庫区分、製番単位で現在数量を高速に検索・表示することである。source of truth ではない。

方針:

- `inventory_transactions` から導出される現在庫 projection として扱う
- `warehouse_code` / `location_code` / `part_no` / `inventory_type` / `project_no` 単位の数量確認に使う
- 差異がある場合は `inventory_transactions` との照合が必要である
- projection のみが誤っている場合は refresh / rebuild / recovery を検討する

### `pallet_units` / `pallet_item_links`

`pallet_units` + `pallet_item_links` は現在保管状態 read model である。

主な用途は、どの棚に、どのパレットがあり、そのパレットにどの品番が何個載っているかを確認することである。

方針:

- `pallet_units` はパレット本体の現在位置・状態を表す read model として扱う
- `pallet_item_links` はパレット上の品番構成を表す read model として扱う
- パレット操作の根拠は `pallet_transactions` に置く
- 部品数量の根拠は `inventory_transactions` に置く
- 現在保管状態は現場確認に重要だが、source of truth そのものではない

---

## ■ ズレるケース

`inventory_current` と `pallet_item_links` は責務が異なるため、常に同じ粒度・同じタイミングで一致するとは限らない。

想定されるズレ:

- `inventory_transactions` は更新されたが、`pallet_item_links` が更新されていない
- パレット単位で棚移動したが、`inventory_current.location_code` が追従していない
- 部品単位で出庫・移動したが、パレット上の品番構成が変わっていない
- `pallet_item_links` に載っている数量と `inventory_current.quantity_on_hand` が一致しない
- `inventory_type` や `project_no` の扱いが片方にだけ反映されている
- OUT 済み pallet が現在保管状態に残っている
- パレットに品番リンクはあるが、対応する `inventory_current` 行がない
- `inventory_current` 行はあるが、対応する active pallet item がない
- idempotency replay や手動補正の影響で片方だけが再反映されている
- 旧データ移行や過去 migration により、片方の read model に不足情報がある

これらのズレは、即座にどちらか一方が正しいことを意味しない。

まず確認すべきこと:

- `inventory_transactions` 上の部品数量履歴
- `pallet_transactions` 上のパレット状態履歴
- 実物流の現場確認結果
- operator / occurred_at / trace_id / request_id
- `warehouse_code` boundary を越えた混入がないか

---

## ■ Pallet 単位移動と部品単位移動の責務

### Pallet 単位移動

pallet 単位移動は、パレットそのものの現在位置を変える操作である。

責務:

- `pallet_transactions` に MOVE / OUT などの履歴を残す
- `pallet_units.current_location_code` や status を現在状態として更新する
- パレット上の item 構成そのものは原則として変えない

検討点:

- pallet 単位移動を、パレット上の全 item の `inventory_current.location_code` 更新として扱うか
- 現時点では、これを自動同期として急いで実装しない
- 自動更新する場合は、`inventory_transactions` に部品単位の移動履歴を残す設計が必要になる

理由:

`inventory_current` の location が変わるということは、inventory domain では部品在庫の移動を意味する。パレット移動だけで `inventory_current` を直接 update すると、`inventory_transactions` に移動履歴が残らず、source of truth と projection の責務が崩れる。

### 部品単位移動

部品単位移動は、特定の `part_no` / `inventory_type` / `project_no` の数量を棚間または状態間で移す操作である。

責務:

- `inventory_transactions` に IN / OUT / MOVE / ADJUST の履歴を残す
- `inventory_current` はその履歴から更新される
- pallet 上の構成が変わる場合は、`pallet_item_links` の扱いを別途明確にする

検討点:

- 部品移動が「パレットから一部を外す」操作を伴う場合、`pallet_item_links` を更新すべきか
- 現時点では、部品単位移動と pallet item 構成変更を暗黙に同期しない
- 将来は、部品移動と pallet item link 更新を同一業務操作として扱う command / RPC を検討する

理由:

部品在庫の数量変化と、パレット上の載荷状態変化は密接に関係するが、同じものではない。どちらか一方だけを更新するとズレるため、将来同期する場合は業務 command と source of truth の記録単位を先に定義する必要がある。

---

## ■ 部品移動時に `pallet_item_links` を更新すべきか

結論として、部品移動時に常に `pallet_item_links` を自動更新するとは現時点では決めない。

更新すべき可能性があるケース:

- パレットから一部数量を取り出して別棚へ移す
- パレットから全量を出庫する
- パレット間で品番を移し替える
- パレット上の品番構成そのものを現場作業として変更する

自動更新を急がない理由:

- `inventory_transactions` と `pallet_item_links` の粒度が完全には一致しない
- 1つの部品移動がどの pallet item に対応するか、現場入力なしでは判断できない場合がある
- FIFO / lot / genpinhyo / project_no / mrp_key の選択ルールが未確定の可能性がある
- 誤った自動紐付けは、後から説明しにくい不整合を作る

当面の方針:

- 部品移動時は `inventory_transactions` を正として記録する
- pallet item 構成を変える必要がある操作は、明示的な pallet item command として扱う
- 自動同期ではなく、compare-only でズレを見える化する
- 差異がある場合は manual review を経て correction / recovery を判断する

---

## ■ Pallet 移動時に `inventory_current` を更新すべきか

結論として、pallet 移動時に `inventory_current` を直接 update する方針は採用しない。

理由:

- `inventory_current` は `inventory_transactions` から導出される projection である
- pallet 移動により部品在庫 location が変わるなら、inventory domain では MOVE transaction が必要になる
- `inventory_current` だけを更新すると、source of truth である `inventory_transactions` に移動根拠が残らない
- パレットが空、混載、一部 OUT、project_no 混在の場合、単純な一括同期は誤りになり得る

将来の選択肢:

- pallet move command が、`pallet_transactions` と必要な `inventory_transactions` を同一業務操作として作成する
- pallet move は保管状態のみを変え、inventory location は別 domain として扱う
- warehouse / customer / operation mode ごとに、pallet move と inventory move の連動有無を明示する

現時点では、どの model を採用するかを実装で固定しない。

---

## ■ Compare-only 差異検出方針

初期方針は compare-only である。

compare-only は、read model 間または source of truth と projection の差異を検出するが、DB を更新しない。差異は調査入口であり、自動補正ではない。

比較キー:

- `warehouse_code`
- `location_code`
- `part_no`
- `inventory_type`
- `project_no`

比較対象:

- `pallet_units` + `pallet_item_links` から見た現在保管状態数量
- `inventory_current.quantity_on_hand`
- 将来必要に応じて `inventory_transactions` 集計結果

差異分類:

| 分類 | 例 | 初期対応 |
| --- | --- | --- |
| quantity mismatch | pallet item 合計 8 / inventory_current 2 | manual review |
| missing inventory current | pallet item はあるが current がない | source / projection 調査 |
| missing pallet item | inventory_current はあるが active pallet item がない | 現場状態確認 |
| location mismatch | 棚番が片方だけ異なる | pallet / inventory 履歴確認 |
| project / type mismatch | `project_no` / `inventory_type` が片方だけ異なる | 入力・移行・補正履歴確認 |

severity 候補:

- `info`: 表示補助項目の欠落
- `warning`: 調査が必要な軽微差異
- `high`: 数量・棚番・project_no の差異
- `critical`: warehouse boundary 越え、実物流・請求に直結する差異

Admin Dashboard では、差異を見える化しても correction / rebuild を実行しない。差異表示は、確認・調査・承認の入口として扱う。

---

## ■ Correction / Recovery 方針

差異を検出した後は、まず「source of truth が誤っているのか」「projection / read model が誤っているのか」を分けて判断する。

### Source of truth が誤っている場合

例:

- 誤った入庫数量が `inventory_transactions` に登録された
- 実際には移動していないのに MOVE transaction がある
- operator が誤った part_no / project_no を登録した

方針:

- commit 済み履歴を削除・上書きしない
- correction / compensation transaction を検討する
- correction reason / operator / approver / related trace を残す設計を検討する
- correction 実装前は manual review で判断する

### Projection / read model のみが誤っている場合

例:

- `inventory_transactions` 集計と `inventory_current` が一致しない
- 最新 `pallet_transactions` と `pallet_units` が一致しない
- `pallet_item_links` の現在状態が過去操作を反映していない

方針:

- source of truth を根拠に refresh / rebuild / scoped recovery を検討する
- projection だけを手動 update して差異を隠さない
- recovery 結果は監査・調査可能な形で記録する方針を検討する
- 初期は compare-only と manual checklist を優先する

---

## ■ 自動同期を急がない方針

`inventory_current` と `pallet_item_links` の同期は重要だが、現時点では自動同期を急がない。

理由:

- pallet move と inventory move の業務的な同一性がまだ固定されていない
- 部品単位移動がどの pallet item に対応するかは現場判断を必要とする場合がある
- 自動同期を先に作ると、source of truth にない変更を projection に反映する危険がある
- correction / recovery / approval の責務が未整理の状態で自動補正すると、監査性が落ちる
- warehouse / customer / operation mode によって同期ルールが異なる可能性がある

当面の原則:

- 差異は隠さず見える化する
- 自動補正より manual review を優先する
- 実物流・請求影響がある差異は high severity として扱う
- 実装は小さく、read-only / compare-only から始める

---

## ■ 将来の同期モデル候補

現時点では採用を決めず、候補として整理する。

### 候補 A: Pallet move と inventory move を連動する command model

pallet move API / RPC が、`pallet_transactions` と関連する `inventory_transactions` を同一業務操作として作成する。

利点:

- パレット移動と部品現在庫 location の整合を保ちやすい
- trace_id で一連の操作を追跡しやすい

課題:

- 混載 pallet、部分移動、空 pallet、project_no 混在の扱いが難しい
- 既存 pallet flow への影響が大きい
- operation mode ごとの違いを先に定義する必要がある

### 候補 B: Inventory move を主操作とし、pallet item link を追従する model

部品移動 API / RPC が、対象 pallet item を明示して `pallet_item_links` を更新する。

利点:

- 部品数量の source of truth を `inventory_transactions` に置きやすい
- 部品単位の出庫・移動と pallet item 構成変更を結びつけやすい

課題:

- 現場入力として対象 pallet / item link の指定が必要になる
- 一括移動、分割、統合、lot / genpinhyo の扱いが複雑になる

### 候補 C: Read model は独立させ、定期 compare / scoped recovery で整合する model

`inventory_current` と `pallet_units` / `pallet_item_links` を即時同期せず、差異検出と recovery を運用として整える。

利点:

- 既存 flow を壊しにくい
- compare-only から段階導入しやすい
- operation mode ごとの差異を吸収しやすい

課題:

- 一時的な差異が残る
- manual review / recovery の運用負荷がある
- 差異が増えた場合は automation が必要になる

### 候補 D: Event-driven projection model

将来、domain event / queue / consumer により、inventory projection と pallet read model をイベントから更新する。

利点:

- producer / consumer の責務を分離できる
- traceability / replay / observability と接続しやすい

課題:

- ordering、retry、dead-letter、idempotency、consumer lag の運用設計が必要
- 現時点では過剰設計になり得る
- 既存 DB trigger / RPC flow との移行戦略が必要

---

## ■ 今回は実装しない判断

Phase B9-11 では、policy の追加のみを行う。

実装しないもの:

- migration
- RPC 変更
- Edge Function 変更
- UI 変更
- `inventory_current` 自動更新
- `pallet_units` 自動更新
- `pallet_item_links` 自動更新
- correction 実装
- rebuild / replay 実装
- queue / workflow engine / event consumer 導入
- README 変更

理由:

- B9-10 で差異表示の入口ができた段階であり、まだ correction / synchronization の業務判断を固定しない
- source of truth と read model の責務を先に文書化する必要がある
- 自動同期は、誤ると履歴に残らない不整合を作る
- 現場運用でどの差異が実害になるかを確認してから、最小実装を選ぶべきである

---

## ■ Rollout / Verification 方針

短期:

- Admin Dashboard の compare-only 表示で差異を観察する
- 差異がある場合は `inventory_transactions` と `pallet_transactions` を確認する
- 差異の種類、発生頻度、実物流への影響を記録する

中期:

- 差異分類と severity を整える
- manual review checklist を作る
- scoped recovery / correction の設計判断を ADR または policy に分離する

長期:

- operation mode ごとの同期モデルを決める
- 必要な場合のみ command model / scoped recovery / event-driven projection を検討する
- 自動化は、manual review の実績と業務ルールが固まってから導入する

---

## ■ Related Documents

- `ERP設計憲法.md`
- `開発ルール.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-projection-read-model.md`
- `docs/adr-correction-over-rollback.md`
- `docs/projection-consistency-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/minimum-viable-event-driven-architecture.md`

---

## ■ Notes

この policy は、`inventory_current` と `pallet_item_links` を必ず一致させないという意味ではない。

現時点の判断は、ズレを隠さず compare-only で検出し、source of truth を確認したうえで correction / recovery / synchronization の導入順序を決めることである。
