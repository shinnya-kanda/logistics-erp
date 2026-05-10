# Scoped Rebuild Policy（Phase B10-02）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、inventory / pallet projection を、安全な範囲単位で rebuild / refresh するための policy を整理する。

`inventory_current`、`pallet_units`、`pallet_item_links` は、source of truth そのものではなく、業務履歴から導出された projection / read model である。これらに差異が出た場合、すぐに全件 rebuild するのではなく、source of truth を保護しながら、小さな範囲で原因・影響・差分を確認する必要がある。

Phase B10-02 では、scoped rebuild の目的、scope の切り方、blast radius、dry-run、before / after compare、traceability、correction / replay との違いを整理する。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・UI変更・rebuild・correction・replay・自動同期は実装しない。

---

## ■ 基本原則

scoped rebuild は、source of truth から projection / read model を限定範囲で再構築・再計算する recovery 手段である。

基本原則:

- rebuild は source of truth を変更しない
- rebuild 対象は projection / read model に限定する
- rebuild scope を明示する
- blast radius を小さく保つ
- full rebuild は最後の手段にする
- dry-run / compare-only で期待結果を確認してから本適用を検討する
- before / after compare を残せる設計にする
- rebuild execution は traceability を持つ
- rebuild と correction / replay を混同しない
- observability first を維持する

対象:

| Domain | Source of truth | Rebuild / refresh 対象 |
| --- | --- | --- |
| Inventory | `inventory_transactions` | `inventory_current` |
| Pallet | `pallet_transactions` | `pallet_units`, `pallet_item_links` |
| Warehouse location | `warehouse_location_history` | current location views |
| Observability | transaction / history / compare result | snapshot / monitoring aggregate |

---

## ■ Scoped Rebuild の目的

scoped rebuild の目的は、projection / read model のズレを、source of truth を根拠に安全に回復することである。

目的:

- `inventory_transactions` から `inventory_current` の期待状態を再計算する
- `pallet_transactions` から `pallet_units` / `pallet_item_links` の期待状態を再計算する
- projection update failure や stale read model を回復する
- compare dashboard で見つかった差異の原因を切り分ける
- correction / replay 後に projection が正しく反映されたか確認する
- rebuild logic 変更時の影響範囲を小さく確認する

scoped rebuild がしないこと:

- source of truth の誤りを補正する
- transaction を削除・上書きする
- 実物流の状態を自動決定する
- replay として過去操作を再実行する
- correction reason / approval を省略する

---

## ■ Full Rebuild を最後の手段にする理由

full rebuild は、全 warehouse / 全 pallet / 全 part / 全 projection を対象にするため、影響範囲が大きい。

最後の手段にする理由:

- blast radius が大きく、意図しない projection 変更が広がる
- 差異原因の切り分けが難しくなる
- rebuild logic に bug がある場合、広範囲に誤った状態を作る危険がある
- warehouse_code boundary の検証が複雑になる
- 実行時間・lock・負荷・timeout の risk が増える
- before / after compare の確認量が大きくなる
- manual review / approval が現実的でなくなる

full rebuild を検討できる条件:

- source of truth が信頼できることを確認済み
- rebuild logic が dry-run / scoped rebuild で検証済み
- affected projection が広範囲に壊れている
- warehouse boundary と rollback / compensation 方針が整理済み
- observability により実行前後を比較できる
- maintenance window や運用影響が確認済み

初期方針:

- full rebuild は設計上の選択肢として残す
- 実装や運用では scoped rebuild を優先する
- full rebuild を日常運用の通常手段にしない

---

## ■ Rebuild Scope の考え方

rebuild scope は、rebuild の対象範囲を説明するための境界である。

scope は、できるだけ業務上の意味と source of truth の抽出条件が一致する単位で切る。

### `warehouse_code`

warehouse_code は、最も重要な境界である。

方針:

- rebuild は warehouse_code を必ず意識する
- cross-warehouse rebuild は原則避ける
- warehouse boundary を越えた差異は critical risk として扱う
- full rebuild でも warehouse_code 単位の分割を検討する

### `pallet_code`

pallet_code は、pallet projection / read model の自然な scope である。

方針:

- 特定 pallet の current location / status / item links を再計算する
- pallet move / item add / out の履歴を追いやすい
- mixed pallet や partial move では inventory scope と組み合わせて確認する

### `part_no`

part_no は、inventory projection の代表的な scope である。

方針:

- 特定 part の `inventory_current` 差異を確認する
- pallet item と inventory_current の数量差異を追いやすい
- project_no / inventory_type / location_code と組み合わせて範囲を狭める

### `project_no`

project_no は、製番・案件・出荷・請求影響を確認するための scope である。

方針:

- project 単位の差異や hotspot を追う
- project_no mismatch の影響確認に使う
- part_no / warehouse_code と組み合わせる

### `inventory_type`

inventory_type は、通常在庫・保留・検査中などの分類を分ける scope である。

方針:

- inventory type mismatch を切り分ける
- 同じ part_no でも在庫区分が異なる場合は別 scope として扱う
- inventory_current rebuild で重要な grouping key として扱う

### `location_code`

location_code は、棚・保管場所の運用品質を確認する scope である。

方針:

- location mismatch や hotspot を確認する
- pallet current location と inventory_current location の差異を追う
- location history と組み合わせて current view を確認する

### `trace_id`

trace_id は、業務操作単位の scope である。

方針:

- 特定業務操作に関連する projection 反映漏れを確認する
- correction / replay / rebuild の原因調査に使う
- single trace の影響範囲が小さい場合に有効である

### `parent_trace_id`

parent_trace_id は、上位業務 chain 単位の scope である。

方針:

- OCR / EDI / shipment / pallet workflow など複数 trace を束ねて確認する
- workflow 全体の projection drift を調査する
- 初期は optional / nullable の設計余地として扱い、強制しない

---

## ■ Rebuild Blast Radius の考え方

blast radius は、rebuild により影響を受ける projection / read model / UI / 運用判断の範囲である。

小さく保つ理由:

- 誤った rebuild logic の影響を限定できる
- before / after compare を人間が確認しやすい
- manual approval の判断が現実的になる
- warehouse boundary を守りやすい
- production impact を抑えられる

blast radius の評価項目:

- 対象 warehouse 数
- 対象 pallet 数
- 対象 part 数
- 対象 project 数
- 対象 location 数
- 変更される projection row 数
- high / critical difference 数
- 実物流・出庫・請求への影響
- 実行時間・lock・timeout risk

方針:

- まず single warehouse / single pallet / single part など小さい scope から始める
- scope を広げる場合は dry-run result と approval を確認する
- blast radius が大きい場合は rebuild ではなく investigation を優先する
- critical 差異が多い場合ほど、automatic execution ではなく manual review を優先する

---

## ■ Rebuild Dry-run の考え方

rebuild dry-run は、projection を変更せずに、source of truth から期待状態を計算し、現在の projection と比較する方式である。

目的:

- rebuild した場合に何が変わるかを事前に確認する
- source of truth と projection の差分を説明する
- rebuild scope が適切か確認する
- manual review / approval の材料にする
- rebuild logic の安全性を検証する

dry-run 出力候補:

- dry_run_id
- requested_by
- warehouse_code
- rebuild target
- rebuild scope
- source of truth range
- current projection value
- expected projection value
- diff type
- severity
- affected row count
- affected keys
- related trace_id
- parent_trace_id
- suggested action
- manual_review_required

方針:

- dry-run は source of truth も projection も変更しない
- dry-run result は automatic rebuild の直接トリガーにしない
- dry-run と execution の request_id / trace_id は分ける
- dry-run result が大きすぎる場合は scope を狭める

---

## ■ Before / After Compare の考え方

before / after compare は、rebuild 実行前後の projection 状態を比較し、期待した変化だけが起きたか確認する考え方である。

before:

- current projection state
- expected state from source of truth
- diff list
- severity
- affected keys
- manual review result

after:

- rebuilt projection state
- expected state from source of truth
- remaining diff list
- resolved diff count
- newly introduced diff count
- execution result

確認したい問い:

- rebuild で解消した差異は何か
- rebuild 後も残った差異は何か
- 新しい差異を作っていないか
- scope 外の projection を変更していないか
- warehouse_code boundary を越えていないか

方針:

- before / after compare は read-only に確認できるようにする
- rebuild success は「実行完了」ではなく「期待差分だけが反映された」ことで判断する
- remaining diff は manual review / correction / further scoped rebuild の候補にする

---

## ■ Rebuild Traceability の考え方

rebuild は source of truth を変更しないが、projection 状態を変える可能性があるため traceability が必要である。

保存・表示したい情報:

- rebuild_id
- rebuild_type
- rebuild_target
- rebuild_scope
- requested_by
- approved_by
- reason_code
- reason_text
- request_id
- trace_id
- parent_trace_id
- dry_run_id
- before_summary
- after_summary
- affected_row_count
- status
- started_at
- finished_at

traceability 方針:

- rebuild trace は correction trace と分ける
- `request_id` は rebuild request / batch execution 単位として扱う
- `trace_id` は rebuild という recovery operation 単位として扱う
- `parent_trace_id` は元業務 chain や incident との関連付けに使える余地を残す
- dry-run と execution は関連付けるが、同一視しない
- rebuild の結果は audit / observability の対象にする

初期方針:

- すぐに schema は作らない
- まず policy と checklist を整える
- 将来 migration を行う場合は nullable / additive / no destructive change を守る

---

## ■ Rebuild と Correction の違い

rebuild と correction は目的が異なる。

| 種別 | 対象 | Source of truth 変更 | 主な目的 |
| --- | --- | --- | --- |
| Rebuild | projection / read model | しない | source of truth から派生状態を再作成する |
| Correction | source of truth 上の業務事実 | 新しい補正履歴を追加し得る | 誤った業務事実を履歴付きで補正する |

rebuild が適切なケース:

- `inventory_current` が `inventory_transactions` と一致しない
- `pallet_units` が最新 `pallet_transactions` と一致しない
- projection update failure が疑われる
- read model logic 修正後に派生状態を再作成する

correction が適切なケース:

- 誤った入庫数量が transaction として記録された
- 実際には移動していない pallet move が記録された
- operator が part_no / project_no / location_code を誤入力した
- source of truth 自体に補正 transaction が必要である

禁止:

- correction が必要な問題を rebuild で隠す
- source of truth の誤りを projection rebuild だけで解決したことにする
- rebuild 結果を根拠に過去 transaction を削除・上書きする

---

## ■ Rebuild と Replay の違い

rebuild と replay も目的が異なる。

| 種別 | 対象 | 実行内容 | 主な目的 |
| --- | --- | --- | --- |
| Rebuild | projection / read model | source of truth から再計算する | 派生状態を回復する |
| Replay | command / workflow / external input | 過去入力や操作を新しい実行として再処理する | workflow / input processing を再実行する |

rebuild が適切なケース:

- projection だけが stale
- source of truth は正しい
- read model の反映漏れを回復したい

replay が適切なケース:

- OCR / EDI / shipment input を再処理したい
- workflow step を新しい request / trace として再実行したい
- idempotency や external input processing を検証したい

方針:

- replay trace は元 trace と分離する
- rebuild は元 transaction を再実行しない
- rebuild を replay の代替にしない
- replay を projection rebuild の代替にしない

---

## ■ Observability First との関係

scoped rebuild は observability first の後に来る。

関係:

- compare dashboard が current diff を見える化する
- observability dashboard が backlog / critical / aging / hotspot を要約する
- historical snapshot が trend / recurrence を説明する
- scoped rebuild policy が recovery scope と安全条件を整理する

observability first が必要な理由:

- どの projection がどれくらい drift しているかを知らないと scope が切れない
- hotspot や aging を見ないと priority が決まらない
- recurring diff を見ないと rebuild logic の問題か一時的な差異か判断しにくい
- before / after compare の基準がないと rebuild success を説明できない

方針:

- observability metrics は rebuild 候補の選定に使う
- metrics は automatic rebuild の直接トリガーにしない
- rebuild 後も compare / snapshot / trend で効果を確認する

---

## ■ 導入段階案

### Step 0: Policy の明文化

本ドキュメントで scoped rebuild の原則を整理する。

この段階では実装しない。

### Step 1: Rebuild Candidate Checklist

候補:

- source of truth は正しいか
- projection / read model だけがズレているか
- scope は十分小さいか
- warehouse_code boundary は守れるか
- full rebuild ではなく scoped rebuild で足りるか
- correction / replay の方が適切ではないか

### Step 2: Scope Definition

対象:

- warehouse_code
- pallet_code
- part_no
- project_no
- inventory_type
- location_code
- trace_id
- parent_trace_id

方針:

- 最初は warehouse_code + 1 key のように小さく始める
- cross-warehouse scope は避ける
- scope widening は dry-run 結果を見て判断する

### Step 3: Dry-run / Compare-only Design

候補:

- expected projection calculation
- current projection compare
- affected rows summary
- severity summary
- manual_review_required
- suggested action

この段階では projection を変更しない。

### Step 4: Before / After Compare Design

候補:

- before diff
- after diff
- resolved count
- remaining count
- newly introduced count
- scope violation check

rebuild success の判断材料として扱う。

### Step 5: Traceability Design

候補:

- rebuild_id
- dry_run_id
- request_id
- trace_id
- parent_trace_id
- requested_by
- approved_by
- reason_code
- before / after summary

nullable / additive / no destructive change を前提に設計する。

### Step 6: Scoped Execution Candidate

実装候補:

- inventory_current scoped rebuild
- pallet_units scoped rebuild
- pallet_item_links scoped refresh
- snapshot aggregate refresh

実行する場合は、dry-run、approval、traceability、post-compare を必須候補にする。

### Step 7: Full Rebuild Candidate Review

full rebuild は最後に検討する。

確認:

- scoped rebuild では解決できないか
- dry-run で安全性を確認したか
- operation window は確保したか
- manual approval はあるか
- post-compare と rollback / compensation 方針はあるか
- warehouse boundary を守れるか

---

## ■ 今回は実装しない判断

Phase B10-02 では、policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- UI変更
- rebuild 実装
- correction 実装
- replay 実装
- 自動同期
- rebuild table
- scheduled job
- README変更

理由:

- 現在は compare-only / observability first から controlled recovery 方針を整理している段階である
- rebuild scope と blast radius の判断軸を先に固める必要がある
- dry-run / before-after compare / traceability なしに rebuild を実行すると監査性が弱い
- full rebuild を先に実装すると、影響範囲が大きく原因調査が難しくなる
- rebuild と correction / replay の責務を混ぜないため、policy を先に明文化する

---

## ■ Related Documents

- `ERP設計憲法.md`
- `開発ルール.md`
- `docs/inventory-pallet-consistency-policy.md`
- `docs/request-chain-parent-trace-design.md`
- `docs/historical-observability-snapshot-design.md`
- `docs/controlled-correction-policy.md`
- `docs/observability-monitoring-implementation-plan.md`
- `docs/projection-consistency-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-projection-read-model.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

scoped rebuild は、壊れた状態を一括で塗り替える手段ではない。source of truth を守り、projection / read model の差異を小さい範囲で説明し、dry-run と before / after compare によって安全に回復へ進むための policy である。

full rebuild は常に最後の手段として扱い、日常運用では small blast radius の scoped rebuild を優先する。
