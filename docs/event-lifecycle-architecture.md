# Event Lifecycle Architecture（Phase B7-99）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における event の生成、利用、deprecated、archive、replay / rebuild、retention、logical deletion までの lifecycle を整理する。

event governance、event versioning、event contract、retention / archival、event recovery、event impact analysis、event catalog を前提にすると、event は生成された瞬間だけでなく、consumer に利用され、projection / workflow / audit / replay / rebuild の根拠になり、やがて deprecated / archived / replay-only として扱われる。lifecycle が曖昧だと、過去 event を読めなくなる、projection rebuild が失敗する、deprecated event が突然消える、archive 後に audit / forensic ができない、logical deletion で trace chain が切れる、といった問題が起きる。

本ドキュメントでは以下を整理する。

- event lifecycle の目的
- active / deprecated / archived / replay-only event
- event retirement の考え方
- retention と lifecycle の関係
- replay / rebuild lifecycle
- projection lifecycle
- workflow lifecycle
- external integration lifecycle
- schema / metadata lifecycle
- audit / forensic lifecycle
- lifecycle observability
- lifecycle governance / approval
- breaking lifecycle change
- lightweight start 方針

今回は Markdown の設計整理のみを行い、migration・実装・Edge Function・RPC・README は変更しない。

---

## ■ event lifecycle の目的

event lifecycle は、event が提案され、生成され、利用され、deprecated / archived となり、必要に応じて replay / rebuild / audit / forensic に利用され続けるまでの状態と扱いを整理する考え方である。

目的:

- event の現在状態を説明できるようにする
- active event と deprecated event の扱いを分ける
- archived event を削除済みと混同しない
- replay / rebuild に必要な event を保持する
- logical deletion と物理削除を区別する
- projection / workflow / validation への影響を把握する
- schema / metadata の互換性を維持する
- lifecycle change を governance / approval へ接続する

lifecycle は、event をいつ消すかだけを決めるものではない。

event を将来どのように読み、説明し、再利用し、保護するかを決める設計である。

---

## ■ lifecycle 全体像

event lifecycle の基本候補:

```text
proposed
  -> approved
  -> active
  -> deprecated
  -> archived
  -> replay-only / audit-only
```

状態の意味:

| lifecycle | 意味 |
| --- | --- |
| proposed | event name / schema / owner domain を提案している |
| approved | event の意味・owner・用途が整理されている |
| active | 新規 event として生成される |
| deprecated | 新規生成を停止または縮小するが、読み取りは継続する |
| archived | active data から分離されるが、参照可能性を維持する |
| replay-only | 通常業務では生成しないが replay / rebuild / forensic で解釈する |
| audit-only | 業務処理には使わないが監査・証跡として保持する |

方針:

- lifecycle は event catalog で確認できることを目指す
- deprecated / archived / replay-only event を削除済み扱いしない
- lifecycle 変更は impact analysis と governance review の対象にする
- lifecycle は event name、schema、metadata、projection、workflow と分けて管理する

---

## ■ active / deprecated / archived / replay-only event

### active event

active event は、新規業務操作により生成される event である。

方針:

- owner domain が event の意味を管理する
- producer は event contract に従って生成する
- consumer / projection / workflow は active event を処理対象にする
- validation rule は active event の生成時・処理時の整合性を確認する

### deprecated event

deprecated event は、新規生成を停止または縮小するが、過去 event として読み続ける event である。

方針:

- deprecated event を削除しない
- replacement event を明示する
- projection / replay / rebuild / audit は必要な期間 deprecated event を読めるようにする
- external integration event の deprecated は consumer domain と調整する

### archived event

archived event は、active data から archive / cold storage へ移されるが、audit / forensic / replay / rebuild のために参照可能性を維持する event である。

方針:

- archived は deleted ではない
- archive 後も trace_id / parent_trace_id / warehouse_code / event_name で追跡可能にすることを検討する
- archived event の検索・復元・閲覧には権限と監査を検討する
- archive 後も schema / metadata version を解釈できるようにする

### replay-only event

replay-only event は、通常業務では新規生成しないが、replay / rebuild / forensic の解釈に必要な event である。

方針:

- replay-only event は通常 command の入力として扱わない
- replay planner / rebuild logic / audit view が読めることを目指す
- replay-only の扱いは event catalog に明記することを検討する
- replay-only event を silent skip しない

---

## ■ event retirement の考え方

event retirement は、event の新規生成を停止し、replacement event や read-only / replay-only / audit-only 扱いへ移行する考え方である。

retirement の候補:

- event name の業務意味が古くなった
- owner domain が変わった
- schema / metadata が新しい event に置き換わった
- external partner 仕様が変わった
- workflow の step が廃止された
- projection / monitoring で利用しなくなった

retirement 時の確認観点:

- replacement event はあるか
- deprecated 期間は必要か
- consumer / projection / workflow がまだ読んでいないか
- replay / rebuild / audit に必要ではないか
- archive / cold storage へ移す条件は何か
- external integration 先に通知が必要か

方針:

- event retirement は物理削除ではない
- source of truth として必要な event は保持する
- retirement 後も過去 event の意味を event catalog / schema version で説明できるようにする
- retirement は breaking lifecycle change になり得るため review 対象にする

---

## ■ retention と lifecycle の関係

retention は、event / metadata / external input をどの期間保持するかの方針である。

lifecycle は、保持されている event をどの状態として扱うかの方針である。

関係:

| lifecycle | retention 観点 |
| --- | --- |
| active | 通常業務・検索・projection 更新に必要 |
| deprecated | 新規生成は減るが read / rebuild / audit のため保持 |
| archived | 低頻度参照だが監査・復旧・法務対応のため保持 |
| replay-only | replay / rebuild / forensic に必要な期間保持 |
| audit-only | 業務処理では使わないが証跡として保持 |

方針:

- retention は「永久保持」ではなく、業務・監査・復旧・法務に必要な期間を区別する
- active から archive へ移しても trace chain を切らない
- logical deletion / mask / anonymize は retention policy と合わせて判断する
- rebuild に必要な source of truth は current / cache より優先して保持する
- external input は replay / forensic の起点になるため、hash / source_system / received_at と接続する

---

## ■ logical deletion の考え方

logical deletion は、event や関連 metadata を物理削除せず、通常処理・通常表示から除外する状態として扱う考え方である。

対象候補:

- 誤登録された補助 metadata
- 重複 external input
- 通常検索から除外したい archive reference
- privacy / legal の理由で mask された metadata
- deprecated 後に通常業務では使わない event

方針:

- source of truth event の物理削除は慎重に扱う
- logical deletion は削除理由、実行者、実行時刻、承認者を残すことを検討する
- logical deletion しても audit / forensic で必要な説明ができるようにする
- trace chain を切断する logical deletion は避ける
- sensitive metadata は logical deletion ではなく mask / anonymize が適切な場合がある

注意:

- logical deletion は誤った業務事実の correction ではない
- source of truth 自体が誤っている場合は correction event / compensation transaction を検討する
- legal deletion と audit retention が衝突する場合の正式判断は今回決定しない

---

## ■ replay / rebuild lifecycle

### replay lifecycle

replay は、過去 event / trace / external input を参照し、新しい操作として再実行する。

replay lifecycle 候補:

```text
replay candidate
  -> replay planned
  -> replay approved
  -> replay executed
  -> replay verified
  -> replay archived / audit-only
```

方針:

- replay は元 event を上書きしない
- replay 結果は新しい event / trace として扱う
- replay 対象 event の lifecycle と replay 結果 event の lifecycle を分ける
- replay-only / archived event を読む場合は schema / metadata version を解釈できるようにする
- 請求・実物流・外部送信済み event の replay は承認または禁止を検討する

### rebuild lifecycle

rebuild は、source of truth から projection / read model を再構築する。

rebuild lifecycle 候補:

```text
rebuild requested
  -> rebuild planned
  -> rebuild running
  -> rebuild verified
  -> rebuild completed
  -> rebuild archived / audit-only
```

方針:

- rebuild は source of truth を根拠にする
- rebuild で source of truth を変更しない
- archived / deprecated event も rebuild 対象になる可能性がある
- rebuild diff は observability / recovery / audit の対象にする
- rebuild failure は recovery lifecycle に接続する

---

## ■ projection lifecycle

projection lifecycle は、event から派生する read model / summary / cache の生成、更新、rebuild、廃止を整理する。

対象候補:

- `inventory_current`
- `pallet_units`
- trace timeline
- billing summary
- workflow status
- monitoring aggregate

lifecycle 候補:

```text
projection proposed
  -> active
  -> stale
  -> rebuild required
  -> rebuilt
  -> deprecated
  -> retired
```

方針:

- projection は source of truth ではない
- projection が deprecated / retired になっても source of truth は保持する
- projection schema / logic の lifecycle は event lifecycle と分ける
- projection rebuild には deprecated / archived event を読めることが必要になり得る
- projection drift / stale state は recovery / observability の対象にする

---

## ■ workflow lifecycle

workflow lifecycle は、workflow / saga が開始され、進行し、完了・失敗・補正・archive されるまでの状態を整理する。

lifecycle 候補:

```text
workflow proposed
  -> active
  -> running
  -> completed
  -> failed / stuck
  -> recovered / compensated
  -> archived
```

方針:

- workflow の各 step は domain event として説明できるようにする
- completed workflow も audit / replay / forensic のために trace chain を保持する
- stuck / failed workflow は削除せず recovery 対象にする
- workflow deprecated 時は step event / consumer / projection / monitoring への影響を確認する
- compensation は元 event を消さず、新しい event として lifecycle に残す

---

## ■ external integration lifecycle

external integration lifecycle は、OCR / EDI / webhook / external API / file など外部入力・外部送信の状態を整理する。

対象候補:

- external file
- external message
- parsed result
- external response
- partner schema version
- source_system
- external_file_hash

lifecycle 候補:

```text
received
  -> parsed
  -> accepted / rejected
  -> processed
  -> replay candidate
  -> archived / cold storage
  -> audit-only
```

方針:

- external input は replay / forensic の起点になり得る
- file 本文を event metadata に直接詰め込まない
- active DB には file id / hash / source_system / received_at などの参照 metadata を残す
- 外部送信済み event は replay / deletion に制約を持つ
- partner schema version の lifecycle は event schema / metadata lifecycle と接続する

---

## ■ schema / metadata lifecycle

schema / metadata lifecycle は、event schema、metadata schema、projection schema が時間とともに進化する状態を整理する。

対象:

- event_version
- metadata_version
- event_schema_version
- projection_schema_version
- source_schema_version
- deprecated field
- replacement field

lifecycle 候補:

```text
proposed
  -> active
  -> deprecated
  -> read-only
  -> archived
```

方針:

- event は immutable であり、schema lifecycle は過去 event を書き換える理由にならない
- 新しい reader / projection / replay は古い event version を読めることを目指す
- deprecated schema / metadata は必要な期間 adapter / mapper で解釈できるようにする
- metadata の意味を後から変えない
- required field の削除・意味変更は breaking lifecycle change 候補とする

---

## ■ audit / forensic lifecycle

audit / forensic lifecycle は、event が業務監査・障害調査・不正調査の証跡としてどの状態で保持・参照されるかを整理する。

lifecycle 候補:

```text
created
  -> searchable
  -> archived searchable
  -> legal hold / forensic hold
  -> audit-only
  -> retention expired
```

必要な情報:

- event name
- owner domain
- source of truth
- trace_id / parent_trace_id / request_id
- warehouse_code
- event_version / metadata_version
- operator / approver
- external file hash
- correction / replay / recovery relationship

方針:

- audit / forensic 用 event は通常業務処理と分離して扱うことを検討する
- archived 後も必要な期間は検索可能性を維持する
- legal hold / forensic hold 中の物理削除は避ける
- sensitive metadata は通常閲覧と forensic 閲覧で表示範囲を分けることを検討する
- audit-only event を通常 workflow trigger として扱わない

---

## ■ lifecycle observability

lifecycle observability は、event / projection / workflow / external input がどの lifecycle 状態にあり、どこで滞留・失敗しているかを観測できる状態である。

観測候補:

- active event count
- deprecated event produced count
- deprecated event consumed count
- archived event search count
- replay-only event consumed count
- lifecycle transition count
- lifecycle transition failure count
- projection stale count
- workflow archived / stuck count
- external input archived count
- schema deprecated usage count
- retention expiration candidate count

必要なID / metadata:

- event_name
- lifecycle
- owner_domain
- trace_id
- parent_trace_id
- warehouse_code
- event_version
- metadata_version
- producer
- consumer
- projection_name
- workflow_name

方針:

- lifecycle transition は observability / audit の対象にする
- deprecated event の新規生成は warning / governance review 候補にする
- archive 後の検索不能は audit / recovery リスクとして扱う
- lifecycle monitoring は event catalog / retention policy / impact analysis と接続する

---

## ■ lifecycle governance / approval

lifecycle governance は、event lifecycle の状態変更を誰が判断し、どの影響を確認するかを整理する。

review が必要な lifecycle change 候補:

- active への昇格
- deprecated 設定
- archived への移行
- replay-only / audit-only への変更
- event retirement
- logical deletion / mask / anonymize
- retention expiration
- schema / metadata deprecated
- projection / workflow retirement

確認観点:

- owner domain は明確か
- affected consumer / projection / workflow は確認済みか
- replay / rebuild / audit への影響はあるか
- warehouse_code / security boundary を守るか
- external integration 先との調整が必要か
- legal / privacy / accounting 要件に反しないか

方針:

- owner domain が primary reviewer になる
- affected consumer / projection / workflow owner も確認する
- security / privacy / legal 影響がある場合は強い review 候補にする
- lifecycle change は event catalog / impact analysis / retention policy の更新対象にする
- 初期段階では重い承認プロセスより、変更理由と影響範囲の明文化を優先する

---

## ■ breaking lifecycle change

breaking lifecycle change は、lifecycle 状態変更により既存 consumer、projection、workflow、replay / rebuild、audit / forensic が安全に動かなくなる変更である。

breaking 候補:

- active event を突然生成停止する
- deprecated event を consumer が読めなくする
- archived event を rebuild 対象から外す
- replay-only event を silent skip する
- schema / metadata version を読めなくする
- source of truth を物理削除する
- trace chain を切断する logical deletion を行う
- external input を replay / forensic 不能な形で削除する
- audit-only event を通常業務処理からも参照不能にする

方針:

- breaking lifecycle change は impact analysis の対象にする
- replacement event / deprecated period / adapter / mapper / manual recovery を検討する
- rebuild / replay 影響がある場合は high review 候補にする
- billing / external sent / legal hold / warehouse boundary に関わる lifecycle change は強い approval 候補にする

---

## ■ lightweight start 方針

event lifecycle は重要だが、最初から専用DBや複雑な lifecycle engine を作ると運用負荷が高くなる。

lightweight start の候補:

- Markdown の lifecycle 表から始める
- event catalog に lifecycle 欄を追加する前提で整理する
- 主要 event の active / deprecated / archived / replay-only 候補を棚卸しする
- `inventory_transactions` / `pallet_transactions` / `warehouse_location_history` を source of truth として保持優先度を整理する
- OCR / EDI / external file の archive / cold storage 方針を整理する
- deprecated event と replacement event の対応表を作る
- lifecycle change の impact checklist を文書化する

方針:

- まず active / deprecated / archived の3分類から始める
- 次に replay-only / audit-only / logical deletion を整理する
- high risk domain である inventory / pallet / shipment / billing / external integration から優先する
- 具体的な table / job / API / UI / CI は今回決定しない

---

## ■ 導入段階案

### Step 1: lifecycle 状態の定義

active、deprecated、archived、replay-only、audit-only、logical deletion の意味を整理する。

### Step 2: event catalog への接続

主要 event について lifecycle、owner domain、replacement event、replay / rebuild support を整理する。

### Step 3: retention / archive 方針との接続

source of truth、metadata、external input、projection ごとに active / archive / cold storage の候補を整理する。

### Step 4: replay / rebuild / projection 影響整理

deprecated / archived / replay-only event が projection rebuild や workflow recovery で読めるか確認する。

### Step 5: governance / approval へ接続

lifecycle change を impact analysis、owner review、security / privacy review、recovery 方針へ接続する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- event lifecycle をDBで管理するか
- event catalog に lifecycle field を正式追加するか
- lifecycle transition を誰が実行するか
- lifecycle transition の audit trail 保存先
- deprecated event の正式運用期間
- archive table / cold storage の具体方式
- replay-only / audit-only event の正式定義
- logical deletion / mask / anonymize の正式 schema
- retention expiration の判定方法
- legal hold / forensic hold の扱い
- lifecycle observability の保存先
- lifecycle change をCIで確認するか
- admin-dashboard で lifecycle / deprecated warning を表示するか
- lifecycle governance の承認フロー

---

## ■ 原則

event lifecycle は、event を生成後も長期的に読める、説明できる、再構築できる状態に保つための設計である。

deprecated / archived / replay-only event は削除済みではない。

source of truth の物理削除は慎重に扱い、logical deletion / mask / archive / correction を区別する。

lifecycle change は projection、workflow、replay / rebuild、validation、audit / forensic への影響を確認する。

event lifecycle は governance / catalog / retention / impact analysis の共通基盤になる。
