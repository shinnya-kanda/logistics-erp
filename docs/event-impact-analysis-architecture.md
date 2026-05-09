# Event Impact Analysis Architecture（Phase B7-98）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における event / schema / metadata / projection / workflow / validation / consumer 変更時の影響分析方針を整理する。

event dependency、event contract、event catalog、event governance、projection consistency、workflow / saga、event validation を前提にすると、event 変更は単一ファイルや単一 API の変更ではなく、producer、consumer、projection、workflow、replay / rebuild、validation、security、audit へ波及する可能性がある。影響分析が不足すると、schema change による consumer failure、projection drift、workflow stuck、rebuild failure、validation false positive、security boundary violation が発生しやすくなる。

本ドキュメントでは以下を整理する。

- impact analysis の目的
- event change impact
- schema change impact
- metadata change impact
- producer change impact
- consumer change impact
- projection impact
- workflow impact
- validation impact
- replay / rebuild impact
- security / governance impact
- dependency graph を使った影響範囲整理
- breaking change 判定
- approval / review 方針
- lightweight start 方針

今回は Markdown の設計整理のみを行い、migration・実装・Edge Function・RPC・README は変更しない。

---

## ■ impact analysis の目的

impact analysis は、event 関連の変更がどの domain、consumer、projection、workflow、validation、replay / rebuild、security、audit に影響するかを事前に整理するための考え方である。

目的:

- 変更影響範囲を明確にする
- breaking change を早期に検出する
- consumer / projection / workflow failure を防ぐ
- replay / rebuild 不能を防ぐ
- validation rule の誤判定を防ぐ
- security / warehouse boundary への影響を確認する
- owner domain と reviewer を明確にする
- 変更理由と判断を audit 可能にする

impact analysis は、変更を止めるための手続きではない。

event を長期的に読み続け、業務フローと audit を壊さずに進化させるための変更設計である。

---

## ■ event change impact

event change impact は、event name、event meaning、event lifecycle、event generation timing の変更が与える影響である。

変更候補:

- 新しい event name の追加
- event name の変更
- event meaning の変更
- event lifecycle の変更
- deprecated event の設定
- event generation timing の変更
- correction / compensation event の追加

確認観点:

- owner domain は明確か
- 既存 event と意味が重複しないか
- consumer が event name に依存していないか
- projection / workflow / monitoring が影響を受けないか
- replay / rebuild が過去 event を読めるか
- event catalog / dependency catalog の更新が必要か

方針:

- event meaning が変わる場合は event version だけで吸収せず、新 event name を検討する
- event name 変更は原則 breaking change 候補とする
- deprecated event は削除せず、必要な consumer / projection が読める期間を設ける
- event generation timing の変更は workflow / ordering / temporal dependency への影響を確認する

---

## ■ schema change impact

schema change impact は、event payload / field / type / enum / version の変更が producer / consumer / projection / replay / rebuild に与える影響である。

変更候補:

| 変更 | impact |
| --- | --- |
| optional field 追加 | 低から中。unknown field を許容できるか確認する |
| required field 追加 | 中から高。producer / consumer / replay 影響を確認する |
| field 削除 | 高。deprecated 期間と代替 field が必要 |
| field 名変更 | 高。breaking change 候補 |
| field 型変更 | 高。projection / validation / rebuild 影響が大きい |
| enum 値追加 | 中。unknown enum handling を確認する |
| enum 値削除 | 高。過去 event 解釈に影響する |

確認観点:

- backward compatibility は保てるか
- forward compatibility は保てるか
- old consumer が unknown field を許容できるか
- new consumer が old event を読めるか
- schema validation / event version handling が影響を受けないか
- archive data / deprecated event を rebuild で読めるか

方針:

- required field の削除・意味変更は breaking change として扱う
- field 名変更より新 field 追加と移行期間を優先する
- 過去 immutable event を schema change のために直接書き換えない
- schema change は event contract / event catalog / validation rule と合わせて確認する

---

## ■ metadata change impact

metadata change impact は、trace / identity / time / operator / external / replay metadata の追加・変更・削除が与える影響である。

対象候補:

- `trace_id`
- `parent_trace_id`
- `request_id`
- `warehouse_code`
- `event_id`
- `aggregate_id`
- `idempotency_key`
- `event_time`
- `operator_id`
- `source_system`
- `external_file_hash`
- `replay_of_trace_id`
- `metadata_version`

確認観点:

- required metadata になるか optional metadata か
- consumer / projection / workflow がその metadata に依存するか
- validation rule が変更されるか
- trace-search / audit / forensic の表示範囲に影響するか
- sensitive metadata や secret が含まれないか
- warehouse boundary を壊さないか

方針:

- metadata は「何でも入れる自由欄」にしない
- `warehouse_code` は guard / server-side profile 由来など信頼できる値を使う前提を維持する
- required metadata の追加は consumer 影響を確認する
- secret / token / API key / 大きな OCR / EDI 本文を metadata に入れない
- metadata の意味変更は breaking change 候補とする

---

## ■ producer change impact

producer change impact は、event を生成する API / RPC / job / domain logic の変更が downstream に与える影響である。

変更候補:

- event generation condition の変更
- event generation timing の変更
- event payload 生成元の変更
- idempotency behavior の変更
- trace_id / request_id 付与の変更
- source of truth write timing の変更
- producer domain の変更

確認観点:

- 同じ業務事実に対して event が二重生成されないか
- 既存 consumer が event 欠落として扱わないか
- idempotency replay 時の event / trace が変わらないか
- warehouse_code の source が信頼できるままか
- producer が consumer の内部実装へ依存していないか

方針:

- producer は event の意味と schema を安定させる
- producer 変更は source of truth / event contract / dependency graph で影響を確認する
- producer の内部 refactor で event contract を変えない
- idempotency と replay を混同しない

---

## ■ consumer change impact

consumer change impact は、event を読む projection updater、workflow step、monitoring、external integration、replay / rebuild tool の変更が与える影響である。

変更候補:

- 新しい consumer の追加
- consumer の削除
- consumer processing logic の変更
- retry / duplicate handling の変更
- dead-letter handling の変更
- consumer checkpoint の変更
- consumer が読む event version の変更

確認観点:

- idempotent に処理できるか
- duplicate delivery を二重反映しないか
- unknown optional field を許容できるか
- deprecated event を必要な期間読めるか
- consumer failure が source of truth を壊さないか
- dead-letter / recovery へ接続されているか

方針:

- consumer 追加は event catalog / dependency catalog の更新対象にする
- consumer は producer DB schema に直接依存しすぎない
- consumer failure は source of truth 破壊ではなく processing / projection / workflow failure として扱う
- billing / external system / 実物流に関わる consumer は強い review 候補にする

---

## ■ projection impact

projection impact は、projection / read model / summary / cache の schema、logic、更新タイミング、依存 event の変更が与える影響である。

対象候補:

- `inventory_current`
- `pallet_units`
- trace timeline
- billing summary
- workflow status
- monitoring aggregate

確認観点:

- source of truth から rebuild できるか
- projection dependency が変わるか
- projection freshness / lag が変わるか
- replay / correction event を反映できるか
- deprecated event を読めるか
- diff detection / validation rule が変わるか

方針:

- projection は source of truth ではない
- projection logic 変更時は rebuild / diff detection / validation 影響を確認する
- projection schema 変更は read consumer / dashboard / monitoring 影響を確認する
- projection drift を隠すために source of truth を変更しない

---

## ■ workflow impact

workflow impact は、workflow / saga の step、event chain、timeout、retry、compensation、owner の変更が与える影響である。

変更候補:

- required predecessor event の変更
- expected next event の変更
- step order の変更
- workflow owner の変更
- compensation event の変更
- timeout / stuck detection rule の変更
- orchestration / choreography の責務変更

確認観点:

- missing event / stuck workflow が増えないか
- downstream consumer / projection が step 順序に依存していないか
- compensation / recovery の道筋が残るか
- workflow status projection が影響を受けるか
- replay を workflow 全体 / step 単位のどちらで扱うか

方針:

- workflow event chain の変更は consumer / projection / monitoring / recovery 影響を確認する
- workflow step は domain event として説明できるようにする
- commit 済みの step は rollback ではなく compensation で扱う
- 請求・実物流に関わる workflow 変更は強い approval 候補にする

---

## ■ validation impact

validation impact は、schema、metadata、identity、time、warehouse boundary、state transition、projection、security validation の変更が与える影響である。

変更候補:

- validation rule の追加
- validation severity の変更
- warning から error への変更
- synchronous reject / asynchronous warning の変更
- validation dependency の変更
- dead-letter / manual review 条件の変更

確認観点:

- 既存 event を突然処理不能にしないか
- replay / rebuild で古い event が読めるか
- false positive / false negative の業務影響は何か
- validation failure が recovery / observability に接続されているか
- warehouse boundary / security violation を見落とさないか

方針:

- validation rule は owner domain / governance で意味を確認する
- validation failure を silent skip しない
- validation severity 変更は operation / recovery / alert 影響を確認する
- high risk validation は段階導入と warning 期間を検討する

---

## ■ replay / rebuild impact

replay / rebuild impact は、event change が過去 event の再実行・projection 再構築・audit / forensic に与える影響である。

### replay impact

確認観点:

- replay_supported の扱いが変わるか
- replay 禁止 event が増えるか
- original trace / external input / metadata が参照できるか
- replay 結果が consumer / projection / workflow に二重反映されないか
- approval / operator metadata が必要になるか

方針:

- replay は元 event を上書きしない
- replay と retry / idempotency replay を混同しない
- replay 影響がある変更は high review 候補にする

### rebuild impact

確認観点:

- source of truth を引き続き読めるか
- event version adapter が必要か
- deprecated event handling が必要か
- projection logic / schema が変わるか
- archive data / snapshot が必要か

方針:

- rebuild は source of truth を根拠にする
- rebuild で読めない event を silent skip しない
- rebuild 影響がある変更は projection / validation / recovery と合わせて確認する

---

## ■ security / governance impact

security / governance impact は、event change が access control、warehouse boundary、sensitive metadata、approval、audit に与える影響である。

確認観点:

- `warehouse_code` boundary を越えないか
- role / permission 前提が変わらないか
- sensitive metadata が追加されないか
- trace-search / audit / forensic で見えてよい情報か
- replay / rebuild / recovery 権限が変わるか
- owner domain / reviewer が明確か
- event catalog / governance rule の更新が必要か

方針:

- warehouse boundary violation は critical impact 候補にする
- sensitive metadata の追加は security review 対象にする
- billing / external integration / archive / forensic に影響する変更は強い approval 候補にする
- governance は変更を止めるためではなく、影響範囲と責任を明確にするために使う

---

## ■ dependency graph を使った影響範囲整理

dependency graph は、event 変更の影響範囲を producer、consumer、projection、workflow、validation、replay / rebuild、external integration へたどるための設計情報である。

基本の見方:

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

整理観点:

- upstream dependency: その event が何から生成されるか
- downstream dependency: その event を誰が消費するか
- projection dependency: どの read model が影響を受けるか
- workflow dependency: どの step が影響を受けるか
- validation dependency: どの rule が影響を受けるか
- temporal / ordering dependency: 順序や期限の前提が変わるか
- external dependency: 外部 system / file / message に影響するか

方針:

- impact analysis は dependency graph の存在を前提にする
- dependency graph が不明な変更は manual review 対象にする
- graph のDB化や自動生成は今回決定しない
- 初期は Markdown の依存表で十分な可能性がある

---

## ■ breaking change 判定

breaking change は、既存 producer / consumer / projection / workflow / replay / rebuild / validation / audit が安全に動かなくなる変更である。

breaking change 候補:

- event name の変更
- event meaning の変更
- required field の削除
- required field の意味変更
- field type の変更
- enum 値の削除
- required metadata の削除
- `warehouse_code` source の変更
- deprecated event を読めなくする変更
- projection rebuild 不能になる変更
- workflow required predecessor を破壊する変更
- validation severity を error / critical へ変更して既存 event を止める変更
- replay / rebuild 禁止範囲を変える変更

非 breaking になりやすい変更候補:

- optional field の追加
- optional metadata の追加
- event catalog の説明追記
- unknown field を許容する consumer 向けの schema 拡張
- read model の表示専用 field 追加

注意:

- optional field 追加でも、consumer が unknown field を拒否する場合は breaking になり得る
- enum 値追加でも、consumer が exhaustive handling を前提にしている場合は breaking になり得る
- metadata 追加でも sensitive metadata の場合は security impact が高い

方針:

- breaking change 判定は技術的互換性だけでなく業務影響で判断する
- breaking change は owner domain / affected consumer / governance review の対象にする
- breaking change が必要な場合は migration path / deprecated period / adapter / manual recovery を検討する

---

## ■ approval / review 方針

approval / review は、変更種別と影響範囲に応じて強さを分ける。

軽微な review 候補:

- optional metadata の追加
- event catalog の説明追記
- projection 表示項目の追加
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
- workflow step dependency の変更
- replay / rebuild support の変更
- billing / external system / audit / security に関わる変更
- breaking change 判定された変更

方針:

- owner domain が primary reviewer になる
- affected consumer / projection / workflow owner も確認する
- security 影響がある場合は security review を含める
- approval は変更理由、影響範囲、rollback / compensation / recovery 方針を確認する
- 初期段階では重い承認プロセスより、設計レビューと変更理由の明文化を優先する

---

## ■ lightweight start 方針

impact analysis は重要だが、最初から専用ツールや厳密なCIを導入すると運用負荷が高くなる。

lightweight start の候補:

- Markdown の impact analysis checklist から始める
- 主要 event の owner / producer / consumer / projection / workflow を整理する
- breaking change 判定表を設計文書に持つ
- `inventory_current` / `pallet_units` / trace timeline など重要 projection から影響範囲を整理する
- shipment / OCR / EDI / billing など cross-domain workflow から review 観点を整理する
- validation rule 変更時の影響確認項目を明文化する
- dependency graph はまず Markdown 表で管理する

方針:

- まず high risk domain から impact analysis を適用する
- source of truth / warehouse boundary / replay / rebuild 影響を優先確認する
- exactly complete な graph より、更新し続けられる軽量な管理を優先する
- 具体的な table / tool / UI / CI は今回決定しない

---

## ■ 導入段階案

### Step 1: impact checklist の作成

event、schema、metadata、producer、consumer、projection、workflow、validation、replay / rebuild、security の確認項目を一覧化する。

### Step 2: high risk event の棚卸し

inventory、pallet、shipment、billing、OCR / EDI、warehouse boundary に関わる event から優先して整理する。

### Step 3: dependency graph との接続

event catalog / dependency architecture の producer、consumer、projection、workflow、validation 関係を impact analysis の入力にする。

### Step 4: breaking change 判定の運用

required field、metadata、event meaning、workflow dependency、replay / rebuild 影響を breaking change 判定表で確認する。

### Step 5: governance / approval へ接続

impact analysis 結果を owner domain review、affected consumer review、security review、recovery plan へ接続する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- impact analysis をDBで管理するか
- impact analysis checklist をMarkdown / YAML / JSON / code のどこで管理するか
- impact analysis をCIで必須化するか
- dependency graph から影響範囲を自動算出するか
- event catalog と impact analysis registry を統合するか
- breaking change 判定の正式基準
- approval workflow の正式化
- reviewer assignment の自動化
- schema diff tool を導入するか
- validation rule diff を自動検出するか
- projection rebuild impact を自動見積もりするか
- admin-dashboard で impact analysis を表示するか
- impact analysis result の audit trail 保存先

---

## ■ 原則

impact analysis は、event 変更がどこへ波及するかを事前に説明するための設計活動である。

event / schema / metadata / producer / consumer の変更は、projection、workflow、validation、replay / rebuild、security、audit への影響を確認する。

breaking change は技術的互換性だけでなく、業務影響、warehouse boundary、rebuild 可能性、audit 可能性で判断する。

dependency graph は impact analysis の入力であり、governance / approval / recovery の判断材料になる。
