# Event Recovery Architecture（Phase B7-90）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における projection failure、workflow stuck、event delivery failure、replay / rebuild error などに対する recovery 方針を整理する。

event store、workflow / saga、projection consistency、trace replay、trace integrity、event bus、event catalog を前提にすると、失敗を完全に避けることよりも、失敗を検知し、業務影響を分類し、説明可能な方法で回復できることが重要になる。

本ドキュメントでは以下を整理する。

- recovery の目的
- recovery と correction / replay / rebuild の違い
- projection recovery
- workflow recovery
- dead-letter recovery
- replay failure recovery
- rebuild failure recovery
- manual recovery / operator intervention
- recovery audit trail
- recovery observability
- recovery authorization
- recovery severity classification
- lightweight start 方針

今回は Markdown の設計整理のみを行い、migration・実装・Edge Function・RPC・README は変更しない。

---

## ■ recovery の目的

recovery は、失敗・欠落・遅延・不整合が発生した後に、業務状態を説明可能で信頼できる状態へ戻すための考え方である。

目的:

- projection failure を検知し、source of truth から回復する
- workflow stuck を検知し、retry / compensation / manual recovery へつなげる
- event delivery failure を調査し、必要な consumer 処理を再開する
- replay / rebuild error の原因を切り分ける
- manual recovery を監査可能にする
- recovery 自体を audit / forensic の対象にする
- recovery 権限と severity を整理する

recovery は、失敗を隠すための処理ではない。

何が失敗し、どの根拠をもとに、誰が、どの方法で回復したかを残すことが重要である。

---

## ■ recovery と correction の違い

correction は、過去に発生した業務上の誤りや不整合を、新しい補正 event / transaction として説明する考え方である。

recovery は、失敗状態から業務処理や派生状態を回復するための一連の対応である。

| 項目 | recovery | correction |
| --- | --- | --- |
| 主目的 | 失敗状態から回復する | 誤った業務事実を補正する |
| 対象 | projection / workflow / delivery / replay / rebuild | source of truth 上の業務事実 |
| 方法 | retry / rebuild / resume / manual intervention | correction event / compensation transaction |
| 履歴 | recovery audit trail を残す | 元 event と補正 event を残す |
| 例 | `inventory_current` を rebuild する | 誤入庫を ADJUST で補正する |

方針:

- projection の遅延回復は correction ではない
- source of truth 自体が誤っている場合は correction を検討する
- recovery の結果として correction が必要になる場合がある
- correction を recovery の名目で隠さない

---

## ■ recovery と replay の違い

replay は、過去の入力・trace・event を参照し、新しい操作として再実行する考え方である。

recovery は、失敗状態を回復する目的で replay を使う場合があるが、常に replay するわけではない。

| 項目 | recovery | replay |
| --- | --- | --- |
| 主目的 | 失敗や不整合から回復する | 過去入力・操作を再実行する |
| 対象 | system / workflow / projection の失敗状態 | trace / external input / event |
| 実行単位 | failure case / severity / domain | trace / workflow step |
| 監査 | 回復理由・実行者・結果 | 元 trace と replay trace の関係 |

方針:

- retry で十分な失敗を replay にしない
- replay は元履歴を上書きしない
- replay は recovery 手段の1つとして位置づける
- replay による二重処理や二重 projection を避ける設計を検討する

---

## ■ recovery と rebuild の違い

rebuild は、source of truth から projection / read model / summary / cache を再構築する処理である。

recovery は、rebuild を使って projection drift や delivery failure から回復する場合がある。

| 項目 | recovery | rebuild |
| --- | --- | --- |
| 主目的 | 失敗状態を解消する | 派生状態を再作成する |
| 対象 | failure / incident / stuck 状態 | projection / read model |
| 根拠 | trace chain / source of truth / catalog | source of truth |
| 結果 | retry / resume / rebuild / correction | projection 更新 / diff |

方針:

- rebuild は source of truth を根拠にする
- rebuild で source of truth を変更しない
- rebuild failure は recovery 対象になる
- rebuild の前後差分は audit / observability 対象にする

---

## ■ projection recovery

projection recovery は、projection / read model / summary / cache の更新失敗や drift を回復する考え方である。

対象候補:

- `inventory_current`
- `pallet_units`
- trace timeline
- billing summary
- workflow status
- monitoring aggregate

失敗例:

- event は作成済みだが projection updater が失敗した
- duplicate delivery により二重集計された
- projection logic 変更後に rebuild されていない
- replay / correction event が projection に反映されていない
- projection updated_at が長時間止まっている

recovery 候補:

- failed consumer の retry
- 対象範囲を限定した projection refresh
- source of truth からの rebuild
- rebuild diff の確認
- source of truth 誤りがある場合の correction event

方針:

- projection は source of truth ではない
- projection だけを手動修正して source of truth の不整合を隠さない
- `inventory_current` や `pallet_units` は履歴から検証できる状態を目指す
- projection recovery は freshness / lag monitoring と接続する

---

## ■ workflow recovery

workflow recovery は、workflow / saga が途中で停止・失敗・重複した場合に、業務上正しい状態へ戻す考え方である。

対象候補:

- shipment workflow
- OCR / EDI workflow
- expected / actual reconciliation workflow
- billing workflow
- replay / recovery workflow

失敗例:

- `shipment.pick.confirmed` 後に `inventory.out.distributed` がない
- `edi.message.accepted` 後に `shipment.created` がない
- `actual.mismatch_detected` 後に reconciliation が止まっている
- compensation action が未完了
- workflow status は完了だが必要 event が欠落している

recovery 候補:

- stuck step の retry
- 後続 step の resume
- step 単位の replay
- compensation action
- manual review / operator intervention
- workflow status projection rebuild

方針:

- workflow recovery は trace chain と event catalog を根拠にする
- stuck workflow を自動削除しない
- retry / replay / compensation / manual recovery を区別する
- 請求・実物流に影響する workflow recovery は強い承認を検討する

---

## ■ dead-letter recovery

dead-letter recovery は、通常の event processing 経路で処理できなかった event を調査し、再処理・補正・保留へつなげる考え方である。

dead-letter 候補:

- schema version を解釈できない event
- required metadata が欠落している event
- consumer が一定回数 retry しても失敗する event
- warehouse_code boundary と矛盾する event
- external file が見つからない event
- duplicate / ordering 問題が解決できない event

recovery 候補:

- metadata / schema 解釈ルールの確認
- consumer retry
- consumer adapter / mapper の追加検討
- manual correction
- replay 禁止または保留
- owner domain へのエスカレーション

方針:

- dead-letter は event を捨てる場所ではない
- source of truth を削除せず、処理不能状態を説明する
- dead-letter recovery では再処理可否、承認要否、業務影響を分ける
- sensitive metadata を含む dead-letter は閲覧権限を強くする

---

## ■ replay failure recovery

replay failure recovery は、replay の planning / dry-run / execution / post-check が失敗した場合の回復方針である。

失敗例:

- 元 trace が解決できない
- external input が archive / cold storage から取得できない
- replay 禁止 event が含まれている
- dry-run diff が想定外になる
- replay execution が partial failure した
- replay 後の projection 更新が失敗した

recovery 候補:

- replay plan の再確認
- replay 対象範囲の縮小
- dry-run 結果の manual review
- replay の中止と保留
- replay 結果 event の correction
- replay 後 projection rebuild

方針:

- replay failure は元 trace を変更しない
- replay trace と failure reason を監査可能にする
- replay を再実行する場合も idempotency retry と混同しない
- replay failure が実物流・請求に影響する場合は manual recovery を優先する

---

## ■ rebuild failure recovery

rebuild failure recovery は、projection / read model の rebuild が失敗した場合の回復方針である。

失敗例:

- source of truth に読めない event version がある
- deprecated event の mapping が不足している
- rebuild 中に projection schema と logic が不一致になる
- rebuild diff が大きすぎる
- archive data が不足している
- rebuild job が途中で停止した

recovery 候補:

- rebuild 対象範囲の縮小
- event version adapter の確認
- deprecated event handling の追加検討
- snapshot からの再開
- rebuild diff の manual review
- projection を旧状態に保留

方針:

- rebuild failure で source of truth を変更しない
- 読めない event を silent skip しない
- rebuild error は integrity / observability の対象にする
- rebuild の成功・失敗・差分を recovery audit trail に残すことを検討する

---

## ■ manual recovery / operator intervention

manual recovery は、自動 recovery では業務判断ができない場合に、operator / approver が介入して回復方針を決める考え方である。

manual recovery が必要になりやすいケース:

- 請求確定済み event
- 外部送信済み EDI / API / CSV
- 実物流がすでに動いた在庫・パレット処理
- warehouse_code boundary の疑義
- duplicate external input
- recovery 結果が金額・在庫数量・顧客出荷に影響する場合

必要な情報:

- recovery reason
- affected trace_id / parent_trace_id
- source of truth
- affected projection / workflow
- suggested action
- operator
- approver
- executed_at
- before / after diff

方針:

- manual recovery は例外ではなく、監査可能な正式経路として扱う
- operator が source of truth を直接書き換える運用は避ける
- manual recovery の結果も trace / event / audit に残すことを検討する
- admin / chief / office / worker の権限境界を将来整理する

---

## ■ recovery audit trail

recovery audit trail は、recovery の判断・実行・結果を後から説明するための履歴である。

記録候補:

- recovery_id
- recovery_type
- severity
- affected event / trace
- affected warehouse_code
- source of truth
- failure reason
- selected recovery action
- operator / approver
- requested_at / executed_at / completed_at
- before / after diff
- related correction event
- related replay trace
- related rebuild job

方針:

- recovery は実行結果だけでなく判断理由を残す
- recovery audit trail は audit / forensic の入口になる
- recovery に失敗した場合も失敗履歴を残す
- sensitive metadata は必要最小限にする

---

## ■ recovery observability

recovery observability は、recovery 対象・進行・失敗・完了を観測できる状態である。

観測候補:

- open recovery count
- recovery by severity
- projection recovery count
- workflow recovery count
- dead-letter count
- replay failure count
- rebuild failure count
- average recovery duration
- stuck recovery count
- manual intervention count
- repeated failure count

必要なID:

- trace_id
- parent_trace_id
- request_id
- recovery_id
- event_name
- consumer name
- projection name
- warehouse_code

方針:

- recovery は technical incident だけでなく業務リスクとして観測する
- alert は severity と対応手順に結びつける
- unresolved recovery は workflow stuck と同様に扱う
- recovery monitoring は trace integrity / projection consistency / event bus monitoring と接続する

---

## ■ recovery authorization

recovery authorization は、recovery 操作の実行権限と承認範囲を整理する考え方である。

権限が必要な操作候補:

- projection refresh
- projection rebuild
- workflow resume
- dead-letter retry
- replay execution
- correction event creation
- billing related recovery
- external integration recovery
- manual override

方針:

- recovery は通常の参照権限より強い権限を必要とする場合がある
- warehouse_code boundary を越えた recovery を許可しない
- replay / correction / billing recovery は承認を検討する
- worker に recovery 管理権限を与えるかは慎重に検討する
- authorization の詳細実装は今回決定しない

---

## ■ recovery severity classification

recovery severity classification は、failure の業務影響に応じて対応優先度を分ける考え方である。

分類候補:

| severity | 例 | 対応方針 |
| --- | --- | --- |
| low | monitoring aggregate の遅延 | 通常確認 |
| medium | projection lag / non-critical workflow delay | 調査・retry 候補 |
| high | 在庫・パレット current drift | 早期確認・rebuild / correction 検討 |
| critical | 請求・外部送信・実物流への影響 | 承認付き manual recovery |

分類観点:

- source of truth への影響
- projection の業務重要度
- workflow の停滞時間
- warehouse_code 範囲
- billing / external integration 影響
- manual operation 必要性
- replay / correction の必要性

方針:

- severity は技術エラー種別だけで決めない
- 同じ failure でも業務影響により severity は変わる
- severity は alert / authorization / audit trail と接続する

---

## ■ lightweight start 方針

event recovery は重要だが、最初から大きな recovery engine を作ると複雑になる。

lightweight start の候補:

- recovery 対象パターンを文書化する
- projection drift / workflow stuck / dead-letter の代表例を整理する
- trace-search と event catalog を調査入口として使う
- 手動 recovery の判断項目を整理する
- severity と承認要否を設計表で管理する
- `inventory_current` / `pallet_units` など重要 projection から recovery 方針を整理する

方針:

- まず検知・可視化・手動判断を優先する
- 自動 recovery は source of truth と業務影響が明確な範囲から検討する
- recovery は削除・上書きではなく、rebuild / retry / correction / replay を選び分ける
- 具体的な table / job / API / UI は今回決定しない

---

## ■ 導入段階案

### Step 1: failure pattern の棚卸し

projection failure、workflow stuck、event delivery failure、replay / rebuild error の代表パターンを整理する。

### Step 2: severity と owner domain の整理

各 failure pattern について、severity、owner domain、consumer domain、承認要否を整理する。

### Step 3: manual recovery checklist の作成

trace_id、source of truth、projection diff、workflow step、operator / approver などの確認項目を整理する。

### Step 4: observability 項目の整理

recovery count、duration、stuck recovery、dead-letter、rebuild failure などの観測候補を整理する。

### Step 5: 自動 recovery 候補の検討

安全に自動化できる projection refresh / consumer retry などから段階的に検討する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- recovery job を作るか
- recovery engine を作るか
- recovery audit trail の保存先
- recovery_id を導入するか
- dead-letter table / queue を作るか
- projection refresh / rebuild の正式手順
- workflow resume の実装方式
- replay failure の保存形式
- rebuild failure の保存形式
- recovery severity の正式定義
- recovery authorization のロール設計
- manual recovery UI を作るか
- recovery alert の通知先
- event catalog と recovery policy をどう接続するか
- recovery event / correction event の正式 event name

---

## ■ 原則

recovery は、失敗をなかったことにする仕組みではない。

source of truth と trace chain を根拠に、retry、replay、rebuild、correction、manual intervention を選び分ける。

projection は source of truth ではなく、recovery ではまず根拠履歴を確認する。

workflow stuck や dead-letter は削除せず、調査・承認・再処理・補正の対象にする。

recovery 自体も audit / forensic / observability の対象として扱う。
