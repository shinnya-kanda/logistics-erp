# Projection Consistency Implementation Plan（Phase B8-03）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における source of truth と projection / read model の整合性維持・差分検出・rebuild 導入計画を整理する。

event-driven implementation roadmap、projection consistency architecture、event store、CQRS、event recovery、event validation、event impact analysis を前提にすると、`inventory_current` や `pallet_units` は source of truth ではない。これらは `inventory_transactions` や `pallet_transactions` から導出される projection / read model / cache であり、ずれた場合は source of truth を根拠に差分検出・refresh・rebuild・correction を検討する必要がある。

今回は実装導入計画のみを整理し、migration・実装・Edge Function・RPC・README は変更しない。

本ドキュメントでは以下を整理する。

- projection consistency implementation の目的
- current projection / source of truth
- `inventory_current` 方針
- `pallet_units` 方針
- trace timeline projection 方針
- projection drift detection 方針
- rebuild / refresh 導入順序
- dry-run / compare-only 方針
- validation / observability との関係
- Admin Dashboard 表示責務
- warehouse boundary 方針
- rollout / verification 方針
- anti direct-update 方針
- lightweight rebuild 方針
- future optional architecture

---

## ■ projection consistency implementation の目的

projection consistency implementation は、source of truth と projection / read model / cache の関係を実装・運用・検証の順序へ落とし込むための導入計画である。

目的:

- source of truth と projection の対応関係を明確にする
- projection drift を検出できる状態にする
- drift を source of truth の削除・上書きで隠さない
- `inventory_current` / `pallet_units` を rebuild 可能な read model として扱う
- dry-run / compare-only により、業務影響を出さずに差分を確認する
- rebuild / refresh / correction / manual review の使い分けを整理する
- Admin Dashboard の表示責務を query / read model 側に限定する
- warehouse_code boundary を projection consistency でも維持する

projection consistency は、すべての read model が常に即時同期していることを意味しない。

重要なのは、ずれを検出でき、原因を説明でき、source of truth を根拠に回復できることである。

---

## ■ current projection / source of truth 整理

現時点の logistics-erp では、以下の関係を基本とする。

| domain | source of truth | projection / read model | 主な用途 |
| --- | --- | --- | --- |
| inventory | `inventory_transactions` | `inventory_current` | 在庫検索、現場表示、管理画面 |
| pallet | `pallet_transactions` | `pallet_units` | パレット現在位置・状態表示 |
| warehouse location | `warehouse_location_history` | `warehouse_locations` / location search | 棚番マスタ現在状態・検索 |
| trace | `inventory_transactions` / `pallet_transactions` / `warehouse_location_history` | trace timeline | 調査・監査・trace-search |
| workflow | 将来の workflow / domain event | workflow status | 進捗・stuck 検知 |
| billing | 将来の shipment / inventory / billing event | billing summary | 請求候補・集計 |
| monitoring | event / validation / recovery result | monitoring aggregate | 運用監視 |

現時点で優先する projection:

1. `inventory_current`
2. `pallet_units`
3. trace timeline

理由:

- 在庫数量とパレット現在状態は現場・事務・監査への影響が大きい
- trace timeline は drift 調査の入口になる
- billing / workflow / monitoring は将来候補であり、初期導入で大きく作らない

---

## ■ `inventory_current` 方針

`inventory_current` は `inventory_transactions` から導出される現在在庫 projection である。

source of truth:

- `inventory_transactions`

projection:

- `inventory_current`

整合性観点:

- `warehouse_code`
- `location_code`
- `part_no`
- `stock_type`
- quantity
- latest transaction time
- transaction count / checksum 相当の将来候補

方針:

- 数量の真実は `inventory_transactions` に置く
- `inventory_current` は高速参照・画面表示用 projection として扱う
- `inventory_current` を直接修正して在庫差異を隠さない
- drift は `inventory_transactions` の集計結果と `inventory_current` の比較で検出する
- source of truth が誤っている場合は correction transaction / correction event を検討する
- projection のみが誤っている場合は refresh / rebuild を検討する

差分候補:

- missing current row
- extra current row
- quantity mismatch
- stock_type mismatch
- location mismatch
- latest transaction 未反映
- idempotency replay による二重反映疑い

初期導入では、まず read-only の差分検出方針を整理し、自動 rebuild は急がない。

---

## ■ `pallet_units` 方針

`pallet_units` は `pallet_transactions` から導出されるパレット現在状態 cache / projection として扱う。

source of truth:

- `pallet_transactions`

projection:

- `pallet_units`

整合性観点:

- `warehouse_code`
- `pallet_code`
- `current_location_code`
- `current_status`
- `project_no`
- latest transaction
- OUT / active / empty の状態整合

方針:

- パレット操作の根拠は `pallet_transactions` に置く
- `pallet_units.current_location_code` や status は現在状態表示用 cache として扱う
- `pallet_units` の直接修正だけで履歴不整合を解決しない
- 最新 `pallet_transactions` と `pallet_units` の差分を検出する
- 実物流に関わる drift は high severity 候補として扱う
- source of truth が誤っている場合は correction / compensation event を検討する

差分候補:

- latest MOVE と current location が一致しない
- OUT 済み pallet が active に見える
- active pallet に最新 transaction がない
- `pallet_transactions` はあるが `pallet_units` がない
- `pallet_units` はあるが根拠 transaction がない
- project_no correction が反映されていない

初期導入では、inventory と同様に compare-only から始める。

---

## ■ trace timeline projection 方針

trace timeline は、複数 source of truth を trace_id / source / created_at で統合して表示する read model である。

source:

- `inventory_transactions`
- `pallet_transactions`
- `warehouse_location_history`
- 将来の shipment / OCR / EDI / billing event

projection / read model:

- trace-search の統合レスポンス
- Admin Dashboard の trace timeline 表示
- 将来の parent_trace_id workflow timeline

方針:

- trace timeline は source of truth ではない
- 各 source table の record を削除・更新せず、read-only に統合する
- `source` field により元テーブルを明確にする
- `created_at` asc を基本に時系列表示する
- `warehouse_code` guard による絞り込みを維持する
- source row id / synthetic id の扱いは source ごとに明確化する

drift 候補:

- trace-search に出るべき source record が欠落する
- source row は存在するが timeline の変換に失敗する
- created_at / event time の解釈が source 間で不揃いになる
- warehouse boundary を越えた record が混入する
- source ごとの event_type / metadata 表示が不一致になる

trace timeline は projection consistency の調査入口であり、rebuild 対象そのものというより、source of truth の横断 view として扱う。

---

## ■ projection drift detection 方針

projection drift detection は、source of truth から再計算した期待状態と、現行 projection / read model の差分を検出する考え方である。

初期検出対象:

- `inventory_transactions` 集計 vs `inventory_current`
- 最新 `pallet_transactions` vs `pallet_units`
- trace-search source count / source row 変換結果

diff 分類候補:

- missing row
- extra row
- quantity mismatch
- status mismatch
- location mismatch
- timestamp mismatch
- stale projection
- duplicate projection
- warehouse boundary mismatch

severity 候補:

| severity | 例 | 初期対応 |
| --- | --- | --- |
| info | trace timeline 表示補助 metadata 欠落 | 記録・後続検討 |
| warning | 軽微な freshness 遅延 | 監視・再確認 |
| high | `inventory_current` 数量差分 / pallet location 差分 | 早期調査・compare-only |
| critical | warehouse boundary 越え / 請求・実物流影響 | manual review / recovery 検討 |

方針:

- drift は source of truth との差分で検出する
- diff を見つけても source of truth を削除・更新しない
- diff は調査・refresh・rebuild・correction の入口にする
- high risk projection から導入する
- 初期は定期 job より on-demand check / 手動確認の設計を優先する

---

## ■ rebuild / refresh 導入順序

rebuild / refresh は、source of truth から projection を再計算または再反映するための recovery 手段である。

導入順序:

### Step 1: 対応表の確定

source of truth と projection の対応表を整理する。

対象:

- `inventory_transactions` -> `inventory_current`
- `pallet_transactions` -> `pallet_units`
- transaction / history -> trace timeline

### Step 2: diff detection の定義

source of truth から期待状態を再計算し、現行 projection と比較する観点を定義する。

この段階では DB / API / job は作らない。

### Step 3: dry-run / compare-only

現行 projection を変更せず、差分だけを出す。

目的:

- rebuild logic の妥当性確認
- 差分量の把握
- severity 分類の確認
- warehouse_code boundary の確認

### Step 4: manual review

diff を業務影響で確認する。

判断:

- projection refresh でよいか
- source of truth correction が必要か
- rebuild logic が誤っているか
- warehouse boundary / security incident か

### Step 5: scoped refresh

対象 warehouse_code、期間、pallet_code、part_no などを限定した refresh を検討する。

### Step 6: scoped rebuild

対象範囲を限定した rebuild を検討する。

### Step 7: automated rebuild の検討

十分な運用実績ができてから、自動 rebuild / scheduled rebuild を検討する。

---

## ■ dry-run / compare-only 方針

dry-run / compare-only は、projection を変更せずに source of truth から期待状態を計算し、現行 projection との差分だけを確認する方式である。

目的:

- 業務状態に影響を出さずに rebuild logic を検証する
- 既存 projection の drift を可視化する
- automatic refresh / rebuild の前に人間が判断できる材料を作る
- rebuild failure / unexpected diff を安全に検出する

出力候補:

- projection name
- warehouse_code
- source of truth range
- affected key
- current projection value
- expected value
- diff type
- severity
- related trace_id
- suggested action

方針:

- 初期は compare-only を優先する
- compare-only 結果で source of truth を変更しない
- unexpected diff は silent skip しない
- diff が大きい場合は rebuild 対象範囲を縮小する
- dry-run 結果は audit / recovery の入力候補として扱う

---

## ■ validation / observability との関係

projection consistency は validation / observability / recovery と接続する。

### validation

validation で確認すること:

- source of truth と projection が説明可能に整合しているか
- projection freshness / lag が許容範囲内か
- `warehouse_code` boundary を越えていないか
- replay / correction event が projection に反映されているか
- rebuild 対象 event を読めるか

方針:

- validation failure は projection recovery の入口にする
- drift を検出しても source of truth を自動削除しない
- high risk validation は warning 期間を検討する
- validation result は severity と業務影響で扱う

### observability

観測候補:

- projection drift count
- projection lag / freshness
- compare-only diff count
- rebuild duration
- rebuild failure count
- refresh count
- warehouse_code 別 diff count
- projection name 別 diff count

方針:

- projection inconsistency は単なる技術エラーではなく業務リスクとして扱う
- alert は対応手順とセットで導入する
- monitoring aggregate 自体も projection であることを忘れない

---

## ■ Admin Dashboard 表示責務整理

Admin Dashboard は query / read model の表示責務を持つ。

表示責務:

- 現在在庫を表示する
- パレット現在状態を表示する
- trace timeline を表示する
- integrity warning / drift summary を将来表示する
- freshness / last checked を将来表示する

持たせない責務:

- source of truth を表示都合で変更する
- `inventory_current` を直接修正して在庫差異を隠す
- `pallet_units` を直接修正してパレット履歴不整合を隠す
- warehouse boundary を越えた projection diff を表示する
- worker に recovery / rebuild 管理操作を開放する

将来表示候補:

- projection diff summary
- compare-only result
- rebuild last run
- freshness / updated_at
- source of truth row への参照
- trace_id / source / projection key
- severity 別 warning

初期導入では、Admin Dashboard は read-only の確認画面にとどめる。

---

## ■ warehouse boundary 方針

projection consistency でも `warehouse_code` boundary を維持する。

方針:

- source of truth の読み取りは許可された `warehouse_code` に限定する
- projection / read model も同じ `warehouse_code` 境界を持つ
- compare-only / rebuild / refresh 対象には `warehouse_code` を明示する
- trace timeline でも guard.warehouseCode 絞り込みを維持する
- warehouse_code を client payload 由来にしない
- warehouse boundary violation は high / critical severity 候補にする

注意:

- projection diff が warehouse 境界をまたぐ場合、単なる整合性差分ではなく security / data isolation の問題として扱う
- admin 権限で warehouse 横断 rebuild / diff を許すかは別途検討する

---

## ■ rollout / verification 方針

rollout は high risk projection から小さく進める。

推奨 rollout 順:

1. source of truth / projection 対応表を確定する
2. `inventory_current` diff detection の観点を整理する
3. `pallet_units` diff detection の観点を整理する
4. trace timeline の source / ordering / warehouse boundary を確認する
5. compare-only の出力項目を整理する
6. severity と manual review 条件を整理する
7. scoped refresh / rebuild の対象範囲を整理する
8. observability / Admin Dashboard 表示候補を整理する

verification 観点:

- source of truth を変更していない
- projection を source of truth として扱っていない
- compare-only が projection を変更しない
- `warehouse_code` boundary を維持している
- diff type / severity / affected key が説明できる
- rebuild / refresh の対象範囲が限定されている
- Admin Dashboard は read-only 表示として扱っている
- drift を source of truth の削除・上書きで解消していない

実行確認候補:

- `git diff --check`
- `git status --short`
- 将来の compare-only SQL / dry-run output review
- 将来の Admin Dashboard build
- 将来の role / warehouse_code 別表示確認

---

## ■ anti direct-update 方針

projection consistency phase では、direct update による不整合隠しを避ける。

禁止したい進め方:

- `inventory_current` を直接修正して数量差分を消す
- `pallet_units.current_location_code` だけを直して移動履歴を残さない
- trace timeline 表示都合で source of truth を更新する
- drift を検出した source transaction / history を削除する
- rebuild で読めない event を silent skip する
- projection logic 変更の影響を確認せずに既存 read model を上書きする

方針:

- source of truth が誤っている場合は correction event / transaction を検討する
- projection が誤っている場合は refresh / rebuild を検討する
- projection 直接修正が必要な例外は、理由・範囲・承認・before/after diff を残すことを検討する
- direct update 例外は通常運用にしない

---

## ■ lightweight rebuild 方針

lightweight rebuild は、大きな rebuild platform を作らず、重要 projection から小さく検証可能に進める方針である。

初期方針:

- 汎用 rebuild engine を作らない
- event bus / queue / workflow engine の導入を急がない
- `inventory_current` と `pallet_units` の compare-only から始める
- scoped rebuild を前提にする
- warehouse_code / key / period で対象範囲を限定する
- dry-run result を manual review できる形にする
- rebuild は source of truth を変更しない

軽量導入単位:

- warehouse_code 単位
- part_no / location_code 単位
- pallet_code 単位
- trace_id 単位
- created_at range 単位

将来、自動化する場合でも、まずは手動確認・業務影響確認・rollback 方針を整理してから進める。

---

## ■ future optional architecture 整理

以下は将来 optional architecture として扱い、今回の導入計画では決定しない。

候補:

- projection diff check job
- scheduled compare-only job
- projection rebuild job
- projection refresh API
- rebuild audit trail table
- projection checkpoint / last_projected_event_id
- projection freshness metadata
- projection version / logic version
- snapshot
- dead-letter / recovery queue
- monitoring aggregate
- Admin Dashboard の integrity warning 画面
- workflow status read model
- billing summary read model
- event bus / consumer checkpoint
- full event store / schema registry

判断基準:

- source of truth から rebuild できるか
- warehouse boundary を維持できるか
- manual review なしで実行してよい業務影響か
- audit / forensic に必要な情報が残るか
- projection logic 変更時に impact analysis できるか

---

## ■ 今後の検討事項

以下は今回決定しない。

- `inventory_current` rebuild の正式 SQL / RPC / Edge Function
- `pallet_units` rebuild の正式 SQL / RPC / Edge Function
- diff check job を作るか
- scheduled rebuild / scheduled compare-only を作るか
- compare-only 結果の保存先
- rebuild audit trail table を作るか
- projection checkpoint / freshness field を持つか
- Admin Dashboard で projection warning を表示するか
- rebuild / refresh の実行権限
- worker / office / chief / admin の recovery 権限分離
- severity の正式定義
- snapshot の導入有無
- archive data を含む rebuild 方法
- billing summary / workflow status / monitoring aggregate の実装時期
- projection logic versioning
- event bus / queue / consumer checkpoint の導入有無

---

## ■ 原則

projection / read model / cache は source of truth ではない。

`inventory_current` は `inventory_transactions` から、`pallet_units` は `pallet_transactions` から説明できる状態を目指す。

projection drift は削除や上書きで隠さず、diff detection、dry-run、compare-only、refresh、rebuild、correction、manual review で説明可能に扱う。

rebuild は source of truth を変更しない。

Admin Dashboard は query / read model の表示責務を持つが、表示都合で write model を歪めない。

warehouse_code boundary は diff detection、trace timeline、refresh、rebuild、future monitoring でも維持する。
