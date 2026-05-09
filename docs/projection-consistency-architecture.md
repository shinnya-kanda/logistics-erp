# Projection Consistency Architecture（Phase B7-88）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における projection / read model / summary / cache と source of truth の整合性維持方法を整理する。

event store / CQRS / event bus を前提にすると、`inventory_current`、`pallet_units`、billing summary、workflow status、monitoring aggregate などの read model は、source of truth から導出される派生状態である。これらが source of truth とずれると、業務画面・監視・請求・replay / rebuild 判断に影響する。

本ドキュメントでは以下を整理する。

- projection consistency の目的
- source of truth と projection の関係
- eventual consistency
- projection drift 問題
- rebuild / replay と projection
- projection refresh / reconciliation
- `inventory_current` / `pallet_units` / billing summary / workflow status consistency
- projection lag / freshness monitoring
- projection correction
- projection diff detection
- observability / integrity monitoring との関係
- lightweight start 方針

今回は Markdown の設計整理のみを行い、migration・実装・Edge Function・RPC・README は変更しない。

---

## ■ projection consistency の目的

projection consistency は、source of truth から導出された read model / summary / cache が、業務上説明可能な範囲で正しく保たれている状態を指す。

目的:

- 業務画面に表示される現在状態を信頼できるようにする
- source of truth と read model の差分を検出できる
- rebuild により read model を再作成できる
- replay / correction 後の projection 反映を説明できる
- monitoring / dashboard の異常検知を誤らない
- audit / forensic 時に read model の根拠へ戻れるようにする

projection consistency は、projection が常に source of truth と完全同期していることだけを意味しない。

非同期更新や eventual consistency を許容する場合でも、遅延・失敗・差分を検出し、説明・補正できることが重要である。

---

## ■ source of truth と projection の関係

source of truth は、業務上の事実を説明する根拠データである。

projection は、source of truth から表示・検索・集計・監視用に導出される派生状態である。

関係:

```text
source of truth
  -> projection logic
  -> read model / summary / cache
```

例:

| source of truth | projection / read model |
| --- | --- |
| `inventory_transactions` | `inventory_current` |
| `pallet_transactions` | `pallet_units` |
| shipment event | shipment status |
| shipment / inventory / billing event | billing summary |
| workflow event chain | workflow status |
| transaction / history | trace timeline |

方針:

- source of truth を優先する
- projection を監査上の最終根拠にしない
- projection は rebuild 可能であることを目指す
- projection の不整合は source of truth を根拠に検出する
- projection を直接修正するだけでは integrity は回復しない

---

## ■ eventual consistency の整理

eventual consistency は、source of truth への書き込みと projection への反映に時間差があっても、最終的に整合することを目指す考え方である。

例:

- inventory transaction は作成済みだが、dashboard 集計反映が少し遅れる
- shipment event は作成済みだが、billing summary が未更新
- workflow step は完了したが、workflow status read model が未反映

方針:

- eventual consistency は不整合放置ではない
- projection lag / stale read / failed update を monitoring する
- 即時整合が必要な field operation は synchronous update / local transaction を検討する
- dashboard / monitoring / billing summary は非同期更新を許容できる場合がある
- read model freshness を説明できるようにすることを検討する

---

## ■ projection drift 問題

projection drift は、projection が source of truth と継続的にずれている状態である。

原因例:

- projection update が失敗した
- event bus delivery が欠落した
- duplicate event を二重集計した
- ordering 問題で古い状態が上書きされた
- manual update で read model だけ修正された
- replay / correction 後の projection 更新が漏れた
- projection logic が変更されたが rebuild されていない

影響:

- 在庫数量が実際の ledger とずれる
- パレット現在位置が履歴とずれる
- billing summary が過大・過小になる
- workflow が完了済みに見えるが実際は stuck している
- monitoring aggregate が異常を見落とす

方針:

- drift は source of truth との差分で検出する
- drift を見つけても source of truth を削除・更新しない
- projection refresh / rebuild / correction の対象にする
- drift の原因を event bus / projection logic / manual operation で切り分ける

---

## ■ rebuild / replay と projection

### rebuild

rebuild は、source of truth から projection / read model を再作成する処理である。

projection consistency における rebuild の役割:

- drift の修復
- projection logic 変更後の再作成
- event bus delivery failure の回復
- archive / snapshot 後の整合性確認
- current table と ledger の差分検証

方針:

- rebuild の根拠は source of truth に置く
- rebuild 前後の差分を記録・確認できることを検討する
- rebuild は read model 更新であり、過去 event を上書きしない
- rebuild error は integrity / observability の対象にする

### replay

replay は、過去 event / input / trace を参照して新しい操作として再実行する。

projection consistency における replay の役割:

- replay 結果 event を projection に反映する
- replay 前後の read model 差分を確認する
- replay による二重集計を防ぐ
- replay event と通常 event を metadata で区別する

方針:

- replay は元 event を上書きしない
- replay 結果は新しい event として projection 更新対象になる
- replay 後に必要な projection refresh / rebuild を検討する
- replay と retry を混同しない

---

## ■ projection refresh / reconciliation

projection refresh は、source of truth の一部または全体から projection を再計算・再反映する考え方である。

reconciliation は、source of truth と projection の差分を比較し、説明・補正する考え方である。

対象候補:

- `inventory_current`
- `pallet_units`
- billing summary
- workflow status
- monitoring aggregate
- trace timeline

方針:

- refresh は対象範囲を明確にする
- reconciliation は差分の有無だけでなく原因を分類する
- 差分が source of truth の誤りか projection の誤りかを分ける
- projection だけを手動修正する場合も、根拠と承認を残すことを検討する
- 定期 refresh と on-demand refresh の両方を将来検討する

---

## ■ inventory_current consistency

`inventory_current` は、`inventory_transactions` から導出される現在在庫 projection である。

整合性観点:

- `warehouse_code`
- `location_code`
- `part_no`
- `stock_type`
- quantity
- latest transaction time

不整合例:

- ledger 集計と `inventory_current.quantity` が異なる
- OUT / MOVE / ADJUST が current に反映されていない
- idempotency replay と projection update が二重反映された
- transaction はあるが current row がない
- current row はあるが根拠 transaction がない

方針:

- 数量の根拠は `inventory_transactions` に置く
- `inventory_current` は高速参照用の projection として扱う
- drift は ledger からの再集計で検出する
- 修復は source of truth ではなく projection refresh / rebuild を基本にする
- ledger 自体が誤っている場合は correction transaction / event で説明する

---

## ■ pallet_units consistency

`pallet_units` は、`pallet_transactions` から導出されるパレット現在状態 cache / projection である。

整合性観点:

- `pallet_code`
- `current_location_code`
- `current_status`
- `project_no`
- latest transaction
- warehouse_code

不整合例:

- 最新 MOVE と `pallet_units.current_location_code` が一致しない
- OUT 済みの pallet が active に見える
- project_no correction が cache に反映されていない
- pallet transaction がないのに current 状態だけ存在する

方針:

- パレット操作の根拠は `pallet_transactions` に置く
- `pallet_units` は現在状態表示のための cache として扱う
- cache 直接修正だけで履歴不整合を解決しない
- 誤移動は correction / compensation event で説明する
- 実物流に関わる drift は業務影響が大きいため alert 候補にする

---

## ■ billing summary consistency

billing summary は、shipment / inventory / pallet / billing event から導出される将来候補の read model である。

現時点では設計候補であり、実装を前提にしない。

整合性観点:

- shipment confirmed
- inventory out
- pallet out
- billing candidate
- billing confirmed
- correction / cancel
- warehouse_code

不整合例:

- 出庫済みなのに billing candidate がない
- billing candidate が重複している
- shipment cancel 後も billing summary が有効に見える
- correction が summary に反映されていない

方針:

- billing summary は source of truth ではない
- billing / shipment / inventory / pallet event を根拠に rebuild できることを目指す
- 請求確定後の projection correction は強い承認を検討する
- billing summary drift は audit / financial risk として扱う

---

## ■ workflow status consistency

workflow status は、workflow / saga の進行状態を表示・監視する read model である。

現時点では設計候補であり、実装を前提にしない。

整合性観点:

- workflow id / parent_trace_id
- current step
- completed steps
- failed steps
- retry / timeout
- compensation status
- replay / recovery status

不整合例:

- workflow status は completed だが必要な child event がない
- stuck workflow が active として表示され続ける
- compensation が実行されたが status に反映されていない
- retry failure が monitoring に反映されていない

方針:

- workflow status は event chain から導出される projection として扱う
- workflow status read model は source of truth ではない
- stuck / missing / duplicate を integrity monitoring と接続する
- workflow status は audit / replay / recovery の入口になるため、freshness を説明できるようにする

---

## ■ projection lag / freshness monitoring

projection lag は、source of truth に event が作成されてから projection に反映されるまでの遅延である。

freshness は、read model がどの時点の source of truth まで反映しているかを示す考え方である。

観測候補:

- last projected event time
- last projected event id
- projection updated_at
- projection lag seconds
- failed projection count
- rebuild last run at
- stale read model count
- consumer lag

方針:

- lag が許容範囲を超えた場合は monitoring / alert 対象にする
- dashboard / monitoring / billing summary は freshness 表示を将来検討する
- field operation に影響する projection は低 lag を求める
- long-running projection failure は stuck workflow と同様に扱う

---

## ■ projection correction の考え方

projection correction は、source of truth とずれた projection を説明可能に修正する考え方である。

分類:

1. projection のみが誤っている
2. source of truth が誤っている
3. projection logic が古い
4. replay / correction event が未反映
5. event delivery が欠落・重複している

方針:

- projection のみが誤っている場合は refresh / rebuild を検討する
- source of truth が誤っている場合は correction event を検討する
- projection logic が古い場合は version / rebuild を検討する
- projection correction の理由と範囲を記録することを検討する
- projection を直接修正しても source of truth の不整合は解決しない

---

## ■ projection diff detection

projection diff detection は、source of truth から再計算した結果と現行 projection の差分を検出する考え方である。

検出候補:

- `inventory_transactions` 集計 vs `inventory_current`
- 最新 `pallet_transactions` vs `pallet_units`
- shipment / billing event 集計 vs billing summary
- workflow event chain vs workflow status
- event count vs monitoring aggregate

diff 分類候補:

- missing row
- extra row
- quantity mismatch
- status mismatch
- timestamp mismatch
- duplicated projection
- stale projection

方針:

- diff detection は定期 job / on-demand check の候補にする
- diff は自動削除せず、調査・refresh・rebuild・correction の対象にする
- severity を業務影響で分ける
- diff 結果には trace_id / warehouse_code / source / projection を含めることを検討する

---

## ■ observability / integrity monitoring との関係

projection consistency は observability / integrity monitoring と密接に関係する。

observability 観点:

- projection latency
- projection failure
- read model freshness
- rebuild duration
- rebuild diff
- consumer lag
- query latency

integrity 観点:

- source of truth と projection の差分
- missing event
- duplicate event
- stale projection
- correction event 未反映
- archive 後の rebuild diff

方針:

- projection inconsistency は単なる技術エラーではなく業務リスクとして扱う
- alert は業務影響と対応手順に結びつける
- projection diff は audit / forensic の調査起点になる
- monitoring aggregate 自体も projection であるため、source event との整合性を検討する

---

## ■ lightweight start 方針

projection consistency は重要だが、最初から大きな rebuild / monitoring 基盤を作ると複雑になる。

lightweight start の候補:

- 既存の source of truth と current / cache の関係を文書化する
- `inventory_current` と `inventory_transactions` の差分チェック案を整理する
- `pallet_units` と `pallet_transactions` の差分チェック案を整理する
- projection updated_at / freshness の表示候補を整理する
- 手動調査用 SQL / trace-search の活用方針を整理する
- 重要 domain から on-demand rebuild / diff check を検討する

方針:

- まず source of truth を安定させる
- projection は rebuild 可能性を優先する
- exact realtime consistency をすべての read model に求めない
- billing / monitoring / workflow など高リスク領域から段階的に整合性設計を深める
- 具体的な job / table / API は今回決定しない

---

## ■ 導入段階案

### Step 1: projection 対応表の整理

source of truth と projection / read model / summary / cache の対応を一覧化する。

### Step 2: drift パターンの棚卸し

inventory、pallet、billing、workflow、monitoring ごとに drift パターンを整理する。

### Step 3: diff detection 候補の整理

source of truth から再計算できる差分チェックを定義する。

### Step 4: freshness monitoring の検討

projection lag、last projected event、updated_at などの観測項目を整理する。

### Step 5: refresh / rebuild / correction 方針整理

差分検出後に refresh、rebuild、correction のどれで対応するかを domain ごとに整理する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- projection diff check job を作るか
- projection refresh job を作るか
- `inventory_current` rebuild の正式手順
- `pallet_units` rebuild / validation の正式手順
- billing summary read model を作るか
- workflow status read model を作るか
- projection lag / freshness の保存先
- projection updated_at / event checkpoint を持つか
- projection failure の保存先
- projection correction の承認フロー
- rebuild diff の severity 定義
- admin-dashboard で projection warning を表示するか
- monitoring aggregate の整合性検証方法
- archive data を含めた projection rebuild の方法

---

## ■ 原則

projection / read model / summary / cache は source of truth ではない。

source of truth から projection を rebuild できることを目指す。

projection drift は削除ではなく、diff detection、refresh、rebuild、correction で説明可能に扱う。

eventual consistency は不整合放置ではなく、lag / freshness / failure を観測する前提で扱う。

projection consistency は、audit / forensic / monitoring / daily operation の信頼性を支える。
