# Event Catalog / Governance Implementation Plan（Phase B8-09）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における event catalog / governance / contract / lifecycle / dependency / impact analysis の段階導入計画を整理する。

ERP設計憲法、開発ルール、event catalog architecture、event governance architecture、event contract architecture、event lifecycle architecture、event dependency architecture、event impact analysis architecture、validation / impact implementation plan、event-driven implementation roadmap を前提にすると、event catalog は単なる event name 一覧ではない。event の owner domain、producer / consumer、schema / metadata contract、lifecycle、dependency、validation rule、impact analysis を接続し、source of truth、projection、workflow、replay / rebuild、audit を長期的に説明できるようにするための管理台帳である。

今回は実装導入計画のみを整理し、migration・実装・Edge Function・RPC・README は変更しない。

本ドキュメントでは以下を整理する。

- event catalog governance implementation の目的
- event catalog 最小管理項目
- owner domain 方針
- producer / consumer 管理方針
- schema / metadata contract 管理方針
- lifecycle 管理方針
- dependency 管理方針
- impact analysis 接続方針
- validation rule 接続方針
- governance review 方針
- Markdown first 方針
- future registry 方針
- rollout / verification 方針
- lightweight governance 方針
- future optional architecture

---

## ■ event catalog governance implementation の目的

event catalog governance implementation は、event の意味・責務・契約・依存関係・変更影響を、実装や将来の registry 化に先立って軽量に管理できる状態へ段階導入するための計画である。

目的:

- event name の重複や意味衝突を防ぐ
- owner domain を明確にする
- producer / consumer の責務を分離する
- schema / metadata contract を管理する
- active / deprecated / archived などの lifecycle を説明できるようにする
- projection / workflow / validation / replay / rebuild への dependency を追えるようにする
- impact analysis checklist の入力にする
- validation rule と event contract を接続する
- governance review の判断材料にする
- Markdown first で始め、必要性が明確になってから registry 化を検討する

event catalog は source of truth の代替ではない。

業務上の真実は `inventory_transactions`、`pallet_transactions`、`warehouse_location_history`、将来の domain event / integration event にあり、catalog はそれらの意味・契約・依存を説明する設計情報である。

---

## ■ event catalog 最小管理項目

初期段階では、すべての詳細項目を管理しようとせず、event の意味と影響範囲を説明するために必要な最小項目から始める。

最小管理項目:

| 項目 | 意味 |
| --- | --- |
| `event_name` | event taxonomy に基づく安定名 |
| `event_type` | domain / integration / technical など |
| `owner_domain` | event の意味を所有する domain |
| `source_of_truth` | 根拠となる table / event / external input |
| `producer` | event を生成する command / API / job / workflow |
| `consumer` | event を読む projection / workflow / monitoring / external integration |
| `event_version` | event payload schema version |
| `metadata_version` | trace / identity / external metadata schema version |
| `lifecycle` | proposed / approved / active / deprecated / archived など |
| `description` | 業務上の意味 |

優先して整理する対象:

- inventory domain event
- pallet domain event
- warehouse location history event
- OCR / EDI / CSV / Excel external input event
- shipment / billing candidate workflow event
- replay / rebuild / correction / compensation event
- trace-search に表示される source / event_type

方針:

- `transaction_type` をそのまま event name として登録しない
- UI 表示名ではなく、業務意味が安定した機械名を使う
- owner domain が不明な event は active 扱いにしない
- 最初から完全な event registry を作らず、主要 event から段階的に整理する

---

## ■ owner domain 方針

owner domain は、event の意味・生成条件・schema・補正方針・deprecated 方針を所有する domain である。

owner domain 候補:

| owner_domain | 主な責務 |
| --- | --- |
| inventory | 在庫数量変動、在庫補正、在庫 projection 根拠 |
| pallet | パレット作成・移動・出庫・状態変更 |
| warehouse_location | 棚番マスタ変更履歴 |
| OCR / EDI | 外部入力、parse、accepted / rejected / corrected |
| expected / actual | 照合、mismatch、reconciliation |
| shipment | 出荷 workflow、pick、outbound |
| billing | 請求候補、請求確定、請求補正 |
| recovery | replay / rebuild / recovery / correction の管理 event |

方針:

- owner domain は event の意味を定義する
- owner domain は required / optional metadata を整理する
- owner domain は replay / correction / deprecated 方針を定義する
- consumer domain は event を利用できるが、意味を勝手に変更しない
- owner domain と producer / consumer を混同しない
- owner domain が不明な event は governance review 対象にする

注意:

- domain boundary をまたぐ event は integration event として contract を明確にする
- billing / 実物流 / external system に関わる owner 変更は強い review 候補にする

---

## ■ producer / consumer 管理方針

producer / consumer 管理は、event を誰が生成し、誰が読むかを整理する。

producer 管理候補:

- producer domain
- producer API / RPC / job / workflow
- source of truth
- event generation condition
- event generation timing
- idempotency_key 利用有無
- trace_id / parent_trace_id / request_id 付与方針
- warehouse_code source

consumer 管理候補:

- consumer name
- consumer domain
- consumer type
- projection updater
- workflow step
- monitoring aggregate
- external integration
- retry / duplicate handling
- dead-letter / manual review 方針

方針:

- producer は event の意味と schema を安定させる
- producer は consumer の内部実装に依存しない
- consumer は event contract に基づいて event を解釈する
- consumer は duplicate delivery / deprecated event / unknown optional field を考慮する
- consumer failure は source of truth 破壊ではなく processing / projection / workflow failure として扱う
- consumer 追加は event catalog / governance / impact analysis の対象にする

初期優先:

- `inventory_transactions` -> `inventory_current`
- `pallet_transactions` -> `pallet_units`
- transaction / history -> trace timeline
- OCR / EDI -> expected / shipment workflow
- shipment -> inventory / pallet / billing candidate

---

## ■ schema / metadata contract 管理方針

schema / metadata contract は、producer と consumer が event をどう解釈するかを揃える契約である。

schema contract 管理候補:

- event_name
- event_version
- required fields
- optional fields
- field type
- enum values
- deprecated fields
- replacement fields
- compatibility policy

metadata contract 管理候補:

- metadata_version
- `trace_id`
- `parent_trace_id`
- `request_id`
- `warehouse_code`
- `event_time`
- `operator_id`
- `source_system`
- `external_file_hash`
- `idempotency_key`
- `replay_of_trace_id`

方針:

- required field の削除・意味変更は breaking change 候補にする
- optional field 追加は比較的安全だが consumer 影響を確認する
- field 名変更より新 field 追加と deprecated 期間を優先する
- metadata は「何でも入れる自由欄」にしない
- `warehouse_code` は guard / server-side profile 由来など信頼できる値を基本にする
- secret / token / API key / 大きな OCR / EDI / PDF 本文を metadata に入れない
- schema / metadata contract は validation rule と接続する

注意:

- schema / metadata contract は過去 event を直接書き換える理由にはならない
- 古い event を読めない場合は warning / error / manual review の対象にする

---

## ■ lifecycle 管理方針

lifecycle 管理は、event が提案され、利用され、deprecated / archived / replay-only / audit-only として扱われる状態を整理する。

lifecycle 候補:

```text
proposed
  -> approved
  -> active
  -> deprecated
  -> archived
  -> replay-only / audit-only
```

管理候補:

- lifecycle
- deprecated reason
- replacement event
- active producer stop status
- consumer support status
- projection support status
- replay / rebuild support
- archive / audit handling
- lifecycle changed reason

方針:

- deprecated / archived event を削除済み扱いしない
- deprecated event は新規生成を停止または縮小するが、過去 event として読み続ける
- archived event も audit / forensic / replay / rebuild のために参照可能性を維持する
- replay-only / audit-only event を通常 workflow trigger として扱わない
- lifecycle 変更は impact analysis と governance review の対象にする

注意:

- lifecycle は event name、schema、metadata、projection、workflow と分けて管理する
- event retirement は物理削除ではない

---

## ■ dependency 管理方針

dependency 管理は、event が producer、consumer、projection、workflow、validation、external input、replay / rebuild にどう依存するかを整理する。

dependency 管理候補:

- producer / consumer dependency
- projection dependency
- workflow dependency
- validation dependency
- replay / rebuild dependency
- external integration dependency
- ordering dependency
- temporal dependency
- circular dependency risk

整理例:

```text
changed event / schema / metadata
  -> producer
  -> consumer
  -> projection
  -> workflow
  -> validation
  -> replay / rebuild
  -> security / audit
```

方針:

- projection は source of truth ではない
- dependency は source of truth から projection / workflow / monitoring へ流れる向きを明確にする
- workflow dependency は required predecessor / expected next event / compensation event を含める
- validation rule がどの event / metadata / state に依存するかを整理する
- replay / rebuild dependency が不足している場合は automatic recovery を避ける
- circular dependency が疑われる場合は manual review / architecture review 対象にする

初期は dependency graph のDB化や自動生成を行わず、Markdown の依存表から始める。

---

## ■ impact analysis 接続方針

event catalog は impact analysis checklist の入力になる。

impact analysis に渡す情報:

- owner domain
- producer / consumer
- schema / metadata contract
- projection dependency
- workflow dependency
- validation dependency
- replay / rebuild support
- lifecycle
- external integration dependency
- sensitive metadata / warehouse boundary

確認観点:

- event name / event meaning が変わるか
- required field / required metadata が変わるか
- producer の生成条件・生成タイミングが変わるか
- consumer / projection / workflow が影響を受けるか
- replay / rebuild で過去 event を読めるか
- validation rule / severity が変わるか
- warehouse boundary / security / audit に影響するか
- external integration schema に影響するか

方針:

- catalog 未登録の event 変更は manual review 対象にする
- dependency が不明な変更は impact analysis で不明点として扱う
- breaking change 判定は catalog / contract / dependency を根拠にする
- impact analysis は変更を止めるためではなく、影響範囲と責任を明確にするために使う

---

## ■ validation rule 接続方針

validation rule は、event catalog / contract / dependency / governance で定義したルールを実行時または検証時に確認するための仕組みである。

接続候補:

- schema validation
- metadata validation
- identity validation
- time validation
- warehouse boundary validation
- state transition validation
- projection validation
- workflow validation
- external input validation
- security validation

catalog に持つ候補:

- validation rule name
- target event
- target metadata
- severity
- owner domain
- dependency
- warning / error / manual review 方針
- observability / recovery 接続

方針:

- validation rule は owner domain / governance で意味を確認する
- validation dependency が不明な rule は導入しない
- validation failure を silent skip しない
- severity 変更は impact analysis 対象にする
- warning 期間を設けて false positive / false negative を確認することを検討する

今回、validation rule registry や validation engine は作らない。

---

## ■ governance review 方針

governance review は、event catalog / contract / lifecycle / dependency / validation の変更を、業務影響に応じて確認するための方針である。

軽微な review 候補:

- event catalog の説明追記
- optional metadata の追加
- read model の表示専用 field 追加
- observability 用の non-sensitive field 追加

通常 review 候補:

- consumer 追加
- projection dependency 追加
- validation warning 追加
- workflow monitoring 項目追加
- event version の optional 拡張

強い review 候補:

- 新しい event name の追加
- required metadata の追加
- event meaning の変更
- integration event schema の変更
- deprecated event の設定
- lifecycle 変更
- workflow step dependency の変更
- replay / rebuild support の変更
- billing / external system / audit / security に関わる変更
- breaking change 判定された変更

方針:

- owner domain が primary reviewer になる
- affected consumer / projection / workflow owner も確認する
- security 影響がある場合は security review を含める
- review では変更理由、影響範囲、compatibility、recovery 方針を確認する
- 初期段階では重い承認プロセスより、設計レビューと変更理由の明文化を優先する

---

## ■ Markdown first 方針

Markdown first は、DB / UI / CI / registry を作る前に、更新しやすい設計文書として event catalog / governance 情報を管理する方針である。

初期方針:

- event catalog は Markdown 表から始める
- owner domain / source of truth / producer / consumer を最初に整理する
- schema / metadata contract は主要 event から段階的に追加する
- lifecycle / deprecated / replay / rebuild support は必要な event から追加する
- dependency graph は Markdown の依存表で管理する
- impact analysis checklist と governance review に catalog 更新を含める

Markdown first の利点:

- 現場運用を止めずに始められる
- event 数が少ない段階では管理負荷が低い
- 設計判断を人間が確認しやすい
- 変更理由を文章で残せる

注意:

- Markdown でも古くなると価値が落ちる
- 更新対象と review owner を明確にする
- catalog を source of truth と混同しない

---

## ■ future registry 方針

future registry は、event catalog / contract / dependency / validation rule の管理量が増えた場合に検討する将来構想である。

registry 化を検討する条件:

- event 数が増えて Markdown 管理が重くなる
- producer / consumer が増え、影響範囲の確認が難しくなる
- schema version / metadata version の管理が複雑になる
- deprecated / archived event の追跡が難しくなる
- validation rule / severity / dependency の変更履歴が必要になる
- CI / lint / Admin Dashboard 表示の必要性が明確になる

registry 候補:

- event registry
- producer / consumer registry
- schema / metadata registry
- lifecycle registry
- dependency registry
- validation rule registry
- impact analysis registry

方針:

- registry 化は今回決定しない
- registry は source of truth の代替ではない
- registry 化する場合も owner domain / governance review を維持する
- Markdown から DB / YAML / JSON / code へ移すかは将来検討に分離する

---

## ■ rollout / verification 方針

rollout は、主要 event の最小 catalog から始め、contract / dependency / lifecycle / validation / impact analysis へ段階的に広げる。

推奨 rollout 順:

1. event catalog 最小項目を Markdown で整理する
2. owner domain を確定する
3. source of truth と producer を整理する
4. consumer / projection / workflow dependency を整理する
5. schema / metadata contract を主要 event から整理する
6. lifecycle / deprecated / replacement event を整理する
7. replay / rebuild support を整理する
8. validation rule / severity と接続する
9. impact analysis checklist / governance review と接続する
10. registry 化は必要性が明確になってから検討する

verification 観点:

- owner domain が不明な event を active 扱いしていない
- event name と UI 表示名 / `transaction_type` を混同していない
- producer / consumer の責務が分かれている
- projection を source of truth として扱っていない
- deprecated event を削除済み扱いしていない
- schema / metadata change の impact を確認している
- dependency が不明な変更を自動承認していない
- validation rule / severity 変更の impact を確認している
- warehouse boundary / sensitive metadata への影響を確認している

実行確認候補:

- `git diff --check`
- `git status --short`
- 将来の event catalog checklist review
- 将来の governance review checklist
- 将来の impact analysis checklist review

---

## ■ lightweight governance 方針

lightweight governance は、最初から重い承認 workflow や専用システムを導入せず、設計文書・checklist・review で event の意味と影響範囲を管理する方針である。

初期方針:

- event catalog DB を今回作らない
- schema registry を今回作らない
- dependency graph tool を今回作らない
- governance approval workflow を今回実装しない
- catalog / contract / lifecycle / dependency は Markdown で始める
- high risk domain から順に整理する
- owner domain と変更理由の明文化を優先する

lightweight governance の対象:

- event name checklist
- owner domain checklist
- producer / consumer checklist
- contract checklist
- lifecycle checklist
- dependency checklist
- impact analysis checklist
- validation rule checklist

方針:

- governance は開発速度を落とすためではなく、変更影響を明確にするために使う
- 完璧な catalog より、更新し続けられる catalog を優先する
- source of truth、warehouse boundary、rebuild 可能性、audit 可能性を最優先で守る
- 実装・DB・CI・UI は必要性が明確になった段階で検討する

---

## ■ future optional architecture 整理

以下は将来 optional architecture として扱い、今回決定しない。

候補:

- event catalog DB
- event registry schema
- producer / consumer registry
- schema registry
- metadata schema registry
- lifecycle registry
- dependency graph table
- validation rule registry
- impact analysis registry
- breaking change checker
- governance workflow
- reviewer assignment automation
- catalog lint / CI
- schema diff tool
- dependency graph visualization
- Admin Dashboard event catalog view
- Admin Dashboard governance review view
- event lineage auto generation
- trace-search と event catalog の連携

導入判断の観点:

- Markdown 管理が限界になっているか
- consumer / projection / workflow 影響を手動で追えなくなっているか
- schema / metadata version の互換性確認が必要か
- lifecycle / deprecated event の管理量が増えているか
- validation rule / severity 変更の audit が必要か
- governance review の証跡保存が必要か
- 現場運用を止めずに導入できるか

---

## ■ 今後の検討事項

以下は今回決定しない。

- event catalog を DB / Markdown / YAML / JSON / code のどこで管理するか
- event registry の正式 schema
- producer / consumer registry の正式 schema
- schema registry を導入するか
- metadata schema registry を導入するか
- lifecycle registry を作るか
- dependency graph を DB 化するか
- validation rule registry を作るか
- impact analysis registry を作るか
- catalog / governance を CI で検証するか
- breaking change checker を作るか
- owner domain / reviewer の正式割り当てルール
- deprecated event の運用期間
- replay / rebuild support の正式分類
- governance approval workflow の実装方式
- Admin Dashboard で catalog / governance を表示するか
- trace-search と event catalog を連携するか
- event lineage を自動生成するか

---

## ■ 原則

event catalog は event name 一覧ではない。

event の意味、owner domain、producer / consumer、contract、lifecycle、dependency、validation、impact analysis を接続し、将来も業務履歴を説明できるようにするための管理台帳である。

owner domain が event の意味を所有する。

producer は event の意味と schema を安定させ、consumer は event contract に基づいて処理する。

deprecated / archived event は削除済みではなく、audit / replay / rebuild / forensic のために読み続けられるようにする。

governance は重い承認手続きではなく、source of truth、warehouse boundary、rebuild 可能性、audit 可能性を守りながら変更を安全に進めるための仕組みである。
