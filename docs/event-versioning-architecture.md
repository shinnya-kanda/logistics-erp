# Event Versioning Architecture（Phase B7-84）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における event schema の進化、互換性、versioning、replay / rebuild への影響を整理する。

event store / CQRS / domain event / workflow を前提にすると、過去の event は source of truth として長期間保持される。一方で、業務要件、外部仕様、metadata、projection は変化し続ける。

本ドキュメントでは以下を整理する。

- event versioning の目的
- immutable event と versioning の関係
- backward compatibility / forward compatibility
- event schema evolution
- metadata schema evolution
- replay / rebuild 時の version handling
- domain event / integration event versioning
- projection / CQRS read model versioning
- event migration
- deprecated event
- event naming と versioning
- schema registry 的考え方

今回は Markdown の設計整理のみを行い、migration・実装・Edge Function・RPC・README は変更しない。

---

## ■ event versioning の目的

event versioning は、event の意味や payload / metadata 構造が変わっても、過去 event を壊さずに扱うための考え方である。

目的:

- 過去 event を replay / rebuild / audit で読み続けられる
- 新しい業務要件を既存 event と共存させられる
- 外部仕様変更に対応できる
- projection / read model を安全に再構築できる
- domain 間の integration event contract を安定させる
- event の意味変更とフィールド追加を区別できる

versioning は、event を自由に壊してよいという意味ではない。

event は immutable であり、versioning はその immutable event を長期的に解釈するための互換性設計である。

---

## ■ immutable event と versioning の関係

immutable event は、発生後に意味や内容を変更しない event である。

versioning は、immutable event を更新せずに、異なる schema の event を読み分けるために使う。

方針:

- 過去 event の payload / metadata を直接書き換えない
- event の schema が変わる場合は version を進める
- reader / projection / replay は event version を見て解釈する
- 誤った event は correction event で補正する
- versioning は correction の代替ではない

例:

```json
{
  "event_name": "inventory.out.distributed",
  "event_version": 1,
  "metadata_version": 1,
  "metadata": {
    "part_no": "ABC-001",
    "quantity": 10
  }
}
```

---

## ■ backward compatibility

backward compatibility は、新しい reader / projection / replay 処理が、古い version の event を読める状態を指す。

目的:

- 過去 event から read model を rebuild できる
- 古い trace を audit / forensic で説明できる
- replay engine が過去入力を解釈できる
- archive から戻した event を処理できる

方針:

- 新しい処理は古い event_version を想定する
- optional field の欠落を許容する
- 古い意味を勝手に新しい意味へ読み替えない
- 変換が必要な場合は明示的な adapter / mapper を検討する

注意:

- backward compatibility のために業務意味を曖昧にしてはいけない
- `project_no` と `issue_no` のような意味の違うIDを互換目的で混在させない

---

## ■ forward compatibility

forward compatibility は、古い reader が新しい event を完全には理解できなくても、壊れずに扱える状態を指す。

目的:

- 新しい optional metadata が追加されても既存 query が壊れない
- read model が未知フィールドを無視できる
- 段階的な rollout がしやすい
- domain 間の integration event 変更時に影響を抑えられる

方針:

- 追加 field は optional から始める
- unknown field を許容する
- 必須 field の追加は慎重に行う
- enum / event name の追加は reader 側の fallback を検討する
- 新しい event の意味を古い event name に押し込まない

forward compatibility は、古い処理が新機能を正しく理解することを保証しない。

壊れずに無視・保留・調査対象にできることを目指す。

---

## ■ event schema evolution

event schema evolution は、event payload や event metadata の構造を時間とともに変化させる考え方である。

変更の種類:

| 変更 | 互換性の目安 |
| --- | --- |
| optional field 追加 | 比較的安全 |
| field の説明追加 | 安全 |
| field 名変更 | 破壊的になりやすい |
| field 型変更 | 破壊的 |
| 必須 field 追加 | 破壊的になりやすい |
| event の業務意味変更 | 新 event name または major version を検討 |
| enum 値追加 | reader 側対応が必要 |

方針:

- field 名変更より新 field 追加を優先する
- 型変更は避ける
- 業務意味が変わる場合は event name を分けることを検討する
- 外部仕様変更がある OCR / EDI / shipment は versioning を特に意識する

---

## ■ metadata schema evolution

metadata schema evolution は、event に付随する metadata の構造や意味を変化させる考え方である。

候補 field:

- `metadata_version`
- `event_schema_version`
- `source_schema_version`
- `projection_schema_version`

方針:

- metadata は「何でも入れる自由欄」にしない
- metadata の field 意味を後から変えない
- optional metadata の追加は許容しやすい
- 既存 metadata の意味変更は避ける
- 大きな payload は metadata に直接入れず参照IDやhashを持つ

例:

```json
{
  "event_name": "edi.message.accepted",
  "event_version": 2,
  "metadata_version": 2,
  "metadata": {
    "edi_file_hash": "sha256:...",
    "external_message_id": "MSG-001",
    "source_schema_version": "partner-a-2026-05"
  }
}
```

---

## ■ replay 時の version handling

replay では、過去 event / external input / trace を参照して、新しい操作として再実行する。

version handling の観点:

- 元 event の version
- replay 実行時の current schema version
- replay 結果として作成する event version
- 元 trace と replay trace の関係
- dry-run / 本実行の区別

方針:

- replay は元 event を上書きしない
- replay 対象 event の version を記録する
- 古い version を current schema に変換する場合は明示する
- replay 結果は新しい `trace_id` と event version を持つことを基本にする
- replay による差分は audit できるようにする

例:

```text
original event_version: 1
replay input adapter: v1 -> current
replay result event_version: 2
replay_of_trace_id: original trace
```

注意:

- replay は idempotency retry ではない
- 古い event を現在のロジックで再実行すると結果が変わる可能性がある
- 請求・実物流・外部送信済み event は replay 禁止または要承認になり得る

---

## ■ rebuild 時の version handling

rebuild は、event store から projection / read model を再作成する処理である。

version handling の観点:

- 複数 version の event を同じ projection に集約できるか
- projection logic が古い event を読めるか
- event ordering と version の関係
- deprecated event をどう扱うか
- rebuild 結果が現行 read model と差分を持つか

方針:

- projection は過去 event version を読み続けることを目指す
- version ごとに mapper / adapter を分けることを検討する
- 古い event を無視しない
- 読めない event は silent skip せず、rebuild error / warning として扱う
- rebuild 差分は integrity / observability の対象にする

例:

```text
inventory_transactions v1
inventory_transactions v2
  -> inventory_current projection v2
```

---

## ■ domain event versioning

domain event versioning は、domain event の payload / metadata / business rule が変化した場合に、domain owner が互換性を管理する考え方である。

方針:

- event name の意味は owner domain が管理する
- field 追加は minor change として扱う候補になる
- 業務意味が変わる場合は新 event name を検討する
- replay / correction ルールも version と合わせて整理する
- domain ごとの event catalog を将来検討する

例:

| event | owner domain | versioning 観点 |
| --- | --- | --- |
| `inventory.out.distributed` | inventory | 分散出庫 allocation metadata |
| `pallet.move.completed` | pallet | location / status metadata |
| `shipment.pick.confirmed` | shipment | shipment line / pick batch metadata |
| `edi.message.accepted` | EDI | partner schema / message type |
| `billing.confirmed` | billing | 金額・締め・税区分 |

---

## ■ integration event versioning

integration event versioning は、domain 間で受け渡す event contract の互換性を管理する考え方である。

目的:

- 送信元 domain と受信先 domain の変更を分離する
- choreography / workflow の破壊的変更を防ぐ
- external system 連携の仕様変更を追える
- retry / replay / compensation の判断材料にする

方針:

- integration event は domain 間の契約として扱う
- 送信元は event name / version / schema を安定させる
- 受信先は未知 field を許容する
- 必須 field の削除・意味変更は破壊的変更として扱う
- 受信できない version は dead-letter / manual recovery の将来検討対象にする

例:

```text
edi.message.accepted v1
  -> shipment.created

edi.message.accepted v2
  -> shipment.created
  -> billing.candidate_created metadata enriched
```

---

## ■ projection versioning

projection versioning は、event store から read model を作る logic や結果 schema の version を管理する考え方である。

versioning 対象:

- projection logic
- projection schema
- read model schema
- aggregation rule
- filtering rule
- snapshot schema

方針:

- projection の logic 変更は rebuild 結果に影響する可能性がある
- projection version を metadata として残すことを将来検討する
- old projection と new projection の差分検証を検討する
- billing / monitoring の集計 rule は version 管理が重要になる
- snapshot を使う場合は snapshot schema version を持つことを検討する

---

## ■ CQRS read model versioning

CQRS read model versioning は、query 側の read model の schema や表示用集計が変化した場合に互換性を保つ考え方である。

対象:

- admin dashboard 用 read model
- trace timeline read model
- billing summary read model
- monitoring aggregate
- workflow status read model

方針:

- read model は source of truth ではない
- read model version が変わっても event store は保持する
- read model は rebuild 可能であることを目指す
- query API の response schema 変更は frontend / external consumer への影響を考慮する
- read model の古さや version を観測できるようにすることを検討する

注意:

- read model の versioning は event versioning と同じではない
- event は業務事実、read model は表示・検索・集計のための派生状態である

---

## ■ event migration の考え方

event migration は、過去 event を新しい schema で扱うための変換方針である。

選択肢:

1. 読み取り時に変換する
2. projection rebuild 時に変換する
3. 新しい correction / migration event を追加する
4. 過去 event はそのまま保持し、adapter で吸収する

方針:

- 過去 immutable event を直接書き換えない
- 変換は明示的に行う
- 変換結果と元 event の関係を説明できるようにする
- 大量の event migration は audit / forensic 影響を検討する
- backfill と event migration を混同しない

今回、migration や backfill は行わない。

---

## ■ deprecated event の扱い

deprecated event は、新規作成を停止または縮小するが、過去 event として読み続ける必要がある event である。

方針:

- deprecated event を削除しない
- 新規 command では新 event name / version を使う
- projection / replay / audit は deprecated event を読めるようにする
- deprecated 理由と代替 event を文書化する
- 外部連携 event の deprecated は受信先 domain と調整する

例:

```text
old: shipment.billing.candidate_created
new: billing.candidate_created
```

このような変更では、event name の owner domain と業務意味を整理する必要がある。

---

## ■ event naming と versioning の関係

event name は、業務上「何が起きたか」を表す安定した名前である。

event version は、その event の schema / metadata / payload 形式を表す。

整理:

| 変更内容 | 対応候補 |
| --- | --- |
| field 追加 | 同じ event name + version up |
| optional metadata 追加 | 同じ event name + metadata version up |
| payload 型変更 | version up または新 event name |
| 業務意味の変更 | 新 event name を検討 |
| owner domain 変更 | 新 event name / deprecated を検討 |
| 表示名変更 | event name は変えない |

方針:

- UI表示名変更だけで event name を変えない
- 業務意味が変わるなら version だけで吸収しない
- event name を transaction_type の代替にしない
- version は互換性管理のために使い、意味の曖昧化に使わない

---

## ■ schema registry 的考え方

schema registry は、event name / version / schema / owner /互換性ルールを管理するための考え方である。

将来的に管理する情報候補:

- event_name
- event_version
- metadata_version
- owner_domain
- schema definition
- required fields
- optional fields
- compatibility policy
- deprecated flag
- replacement event
- replay support
- rebuild support
- projection support

用途:

- event producer / consumer の契約確認
- integration event の互換性確認
- projection rebuild 時の schema 解決
- replay planner の version 判定
- audit / forensic 時の意味確認

初期段階では、外部製品やDB実装としての schema registry を急いで導入しない。

まずは設計文書と event catalog 的な整理から始めることを検討する。

---

## ■ 導入段階案

### Step 1: event name と owner domain の棚卸し

既存 `transaction_type` と domain event name の対応、owner domain を整理する。

### Step 2: version field 候補の整理

`event_version`、`metadata_version`、`event_schema_version`、`projection_schema_version` の使い分けを整理する。

### Step 3: backward compatibility 方針整理

rebuild / replay / trace-search で、古い event をどこまで読める必要があるか整理する。

### Step 4: projection / read model versioning 整理

`inventory_current`、`pallet_units`、trace timeline、billing summary、monitoring aggregate の rebuild 影響を整理する。

### Step 5: schema registry 的管理の検討

event catalog として、event name / version / owner / schema / deprecated 情報を管理する方法を検討する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- `event_version` をDBへ保存するか
- `metadata_version` をDBへ保存するか
- `event_schema_version` と `metadata_version` を分けるか
- schema registry を作るか
- event catalog をコード管理するか文書管理するか
- compatibility check をCIで行うか
- 古い event の adapter / mapper 実装方式
- event migration を行うか
- deprecated event の正式運用ルール
- projection version の保存先
- read model version の表示方法
- replay engine での version handling
- rebuild job での version handling
- integration event の version negotiation
- external partner schema version の管理方法

---

## ■ 原則

event は immutable である。

versioning は、過去 event を壊さずに将来の変更へ対応するための仕組みである。

業務意味が変わる場合は、version だけで曖昧にせず event name / owner domain を見直す。

replay / rebuild / projection は、event version を考慮して設計する。

schema の進化は、audit / forensic / recovery で過去を説明できることを壊してはいけない。
