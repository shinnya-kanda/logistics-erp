# Historical Observability Snapshot Design（Phase B9-23）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、inventory / pallet consistency の運用品質を、時間経過で継続観測するための snapshot / history 設計を整理する。

現時点の Admin Dashboard では、`inventory_current` と `pallet_units` / `pallet_item_links` の差異を compare-only で可視化し、severity、aging、review status、hotspot、observability、trend を一時的に表示できる。一方で、これらは現在表示時点の状態であり、過去から改善しているのか、悪化しているのか、どの棚・project・part で継続的に問題が起きているのかは永続的には残らない。

historical observability snapshot は、これらの運用品質 metrics を日次・週次などの単位で記録し、継続的な改善・悪化・再発傾向を説明できるようにするための設計である。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・UI変更・correction・replay・rebuild・自動同期は実装しない。

---

## ■ 基本方針

historical observability は、source of truth を変更する仕組みではない。

方針:

- snapshot / history は compare-only 結果の観測記録として扱う
- `inventory_transactions` / `pallet_transactions` は引き続き source of truth とする
- `inventory_current` は部品現在庫 projection / read model として扱う
- `pallet_units` / `pallet_item_links` は現在保管状態 read model として扱う
- snapshot は correction / rebuild / replay の自動実行トリガーにしない
- snapshot 自体も read model / monitoring aggregate として扱う
- warehouse_code boundary を維持する

historical observability の目的は、「何を直すか」を自動決定することではない。

目的は、現場・管理者・開発者が以下を説明できるようにすることである。

- 差異が増えているのか減っているのか
- review backlog が滞留しているか
- critical 差異が継続しているか
- hotspot が特定の棚・project・part に偏っているか
- correction / recovery を検討すべき運用リスクがあるか

---

## ■ Daily Snapshot の考え方

daily snapshot は、ある時点の compare dashboard / observability dashboard metrics を日次で固定する考え方である。

想定 snapshot 単位:

- `warehouse_code`
- snapshot date
- compare target
- source version / query version
- generated_at

想定 metrics:

- total compared rows
- difference count
- review_required count
- severity count
  - info
  - warning
  - high
  - critical
- aging bucket count
  - today
  - 1-3 days
  - 4-7 days
  - over 7 days
- review status count
  - pending
  - reviewing
  - on_hold
  - reviewed
- consistency health

方針:

- 初期は daily など粗い粒度でよい
- 同じ日の再生成を許可するかは実装時に検討する
- snapshot は比較・説明用であり、source of truth を変更しない
- snapshot の欠落を業務停止扱いにしない
- snapshot の計算条件を後から説明できるようにする

---

## ■ Backlog History の考え方

backlog history は、確認が必要な差異がどれだけ残っているかを時間経過で見るための履歴である。

観測対象:

- review_required count
- unresolved count
- pending count
- reviewing count
- on_hold count
- reviewed count
- unresolved aging count

見たい問い:

- review backlog は増えているか
- pending が残り続けていないか
- on_hold が積み上がっていないか
- reviewed が増えて backlog が減っているか
- 古い差異が放置されていないか

注意:

現時点の review status は temporary UI state であり、DB保存していない。将来 backlog history を実装する場合は、review status をどこに永続化するかを別途設計する必要がある。

候補:

- compare snapshot に status counts だけ保存する
- review status history table を別途作る
- correction / recovery workflow と切り離した manual review record として保存する

初期方針:

- まずは status counts の snapshot から始める
- row-level review history は、運用要件が固まってから検討する
- reviewed は correction 完了を意味しないことを明記する

---

## ■ Hotspot History の考え方

hotspot history は、差異が集中しやすい棚・project・part を時間経過で見るための履歴である。

観測軸:

- location_code
- project_no
- part_no
- inventory_type
- warehouse_code

観測 metrics:

- total difference count
- review_required count
- critical count
- high count
- repeated days count
- first_seen_date
- last_seen_date

見たい問い:

- 特定の棚で差異が繰り返し起きているか
- 特定 project で運用ミスが集中しているか
- 特定 part がパレット運用と現在庫 projection の間でズレやすいか
- critical が同じ hotspot に継続しているか

方針:

- 初期は top N ranking の snapshot で十分とする
- hotspot は blame のためではなく、運用品質改善の入口として扱う
- location / project / part を混同せず、別軸として保存する
- hotspot の検出結果だけで自動補正しない

---

## ■ Consistency Health History の考え方

consistency health history は、inventory / pallet consistency の全体状態を、日次などで観測する考え方である。

health の候補:

- stable
- watch
- critical

判定例:

| health | 例 |
| --- | --- |
| stable | critical なし、unresolved aging なし、backlog なし |
| watch | backlog はあるが critical / aging はない |
| critical | critical あり、または古い unresolved aging あり |

保存候補:

- snapshot date
- warehouse_code
- health
- reason summary
- critical_count
- review_backlog
- unresolved_aging
- top hotspot summary

方針:

- health は自動 correction の判断ではなく、運用品質の signal として扱う
- threshold は実運用で調整できるようにする
- health が悪化しても source of truth を直接変更しない
- health 判定ロジックの version を将来保存できる余地を残す

---

## ■ Trend Persistence の考え方

trend persistence は、現在の temporary calculated trend を、過去 snapshot と比較できるようにする考え方である。

現時点の trend:

- backlog trend
- critical trend
- unresolved aging trend
- hotspot trend
- consistency health trend

将来の persistence:

- today vs yesterday
- this week vs last week
- current 7 days vs previous 7 days
- warehouse_code 別 trend
- hotspot 別 repeated trend

trend direction:

- improving
- stable
- worsening

判定候補:

| trend | improving | stable | worsening |
| --- | --- | --- | --- |
| backlog | backlog 減少 | 変化なし | backlog 増加 |
| critical | critical 減少または 0 | 変化なし | critical 増加 |
| aging | old unresolved 減少 | 変化なし | old unresolved 増加 |
| hotspot | hotspot 分散または減少 | 変化なし | 同一 hotspot 集中 |
| health | critical → watch → stable | 同一 | stable/watch → critical |

方針:

- 初期は daily snapshot の単純比較でよい
- trend は説明用 signal であり、automatic action ではない
- trend 判定は threshold と version を持てるようにする

---

## ■ Compare Dashboard / Observability Dashboard との関係

現在の compare dashboard / observability dashboard は、今見えている差異を運用者に提示する UI である。

役割:

- compare dashboard
  - severity 別件数
  - review_required 件数
  - aging visibility
  - review workflow visibility
  - hotspot analytics
- observability dashboard
  - review backlog
  - critical differences
  - unresolved aging
  - hotspot top summary
  - consistency health
- trend observability
  - backlog trend
  - critical trend
  - unresolved aging trend
  - hotspot trend
  - health trend

historical snapshot は、これらの UI metrics を時間軸で保存・比較する将来構想である。

関係:

- UI は current state を表示する
- snapshot は point-in-time metrics を保存する
- history は snapshot の推移を比較する
- source of truth は引き続き transaction / history table である

---

## ■ Compare-only / Visibility First 方針

historical observability は visibility first で導入する。

やること:

- 差異の発生状況を記録する
- backlog と aging を観測する
- hotspot を継続確認する
- trend を説明できるようにする
- operational quality の改善・悪化を見える化する

やらないこと:

- snapshot 作成と同時に projection を更新する
- critical が出たら自動 correction する
- backlog が増えたら自動 rebuild する
- trend が worsening なら自動 replay する
- snapshot を source of truth として扱う

理由:

- 差異の原因は source of truth / projection / read model / 実物流のどこにあるか分からない
- 自動補正は、誤った仮定で履歴にない変更を作る危険がある
- manual review と運用ルールが固まる前に automation を入れると監査性が落ちる

---

## ■ Correction / Rebuild / Replay を急がない理由

historical observability は、correction / rebuild / replay の前段階である。

急がない理由:

- 差異件数だけでは source of truth と projection のどちらが誤っているか判断できない
- hotspot は原因候補であり、補正対象そのものではない
- trend は signal であり、業務判断ではない
- correction は元履歴・理由・operator・approver・related trace が必要になる
- rebuild は source of truth を根拠に scoped に行う必要がある
- replay は元 trace と replay trace を分離する必要がある

初期対応:

- snapshot / history で発生傾向を観測する
- manual review checklist を整える
- recurring hotspot の原因を調査する
- correction / recovery が必要な場合は別 phase / ADR / policy として設計する

---

## ■ Historical Observability の将来像

将来像:

- warehouse_code 別の consistency health history
- daily / weekly trend dashboard
- repeated hotspot detection
- unresolved aging alert candidate
- review SLA candidate
- correction / recovery の効果測定
- trace chain / parent_trace_id と snapshot の関連付け
- external input / OCR / EDI / shipment との品質相関

拡張候補:

- snapshot table
- snapshot generation Edge Function / scheduled job
- read-only snapshot search UI
- CSV export
- warehouse boundary aware dashboard
- alert candidate list

ただし、これらは future optional architecture であり、現時点で一括導入しない。

---

## ■ 導入段階案

### Step 0: 現在状態の visibility

実施済みまたは近い状態:

- compare dashboard
- severity count
- aging visibility
- review workflow visibility
- hotspot analytics
- operational observability
- temporary trend observability

この段階では DB 保存しない。

### Step 1: Snapshot 項目の確定

対象:

- daily snapshot の項目
- warehouse_code boundary
- metric version
- calculation query version
- severity / aging / review / hotspot / health の定義

この段階では migration しない。

### Step 2: Markdown / checklist による運用確認

対象:

- どの metrics が実際に現場判断に役立つか
- critical threshold は妥当か
- aging bucket は現場運用に合っているか
- review status は十分か
- hotspot top N は何件が適切か

### Step 3: Minimal Snapshot Store の検討

候補:

- daily aggregate snapshot table
- warehouse_code + snapshot_date unique candidate
- metrics JSON / structured columns の比較
- row-level detail を保存するか aggregate のみにするか

実装する場合も nullable / additive / no destructive migration を守る。

### Step 4: Read-only History UI

候補:

- date range search
- daily trend table
- health history
- hotspot repeated days
- unresolved aging history

UI は read-only とし、correction / rebuild / replay 実行ボタンを置かない。

### Step 5: Alert Candidate / Review Workflow 連携

候補:

- unresolved aging over 7 days
- critical repeated 2 days
- same hotspot repeated N days
- backlog threshold exceeded

この段階でも、alert は candidate として扱い、自動 correction / rebuild / replay に直結しない。

---

## ■ 今回は実装しない判断

Phase B9-23 では、設計ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- UI変更
- snapshot table
- scheduled job
- correction
- replay
- rebuild
- 自動同期
- README変更

理由:

- 現在は compare dashboard / observability dashboard の temporary visibility を育てている段階である
- snapshot 項目・threshold・review status・hotspot 定義を運用で確認する必要がある
- historical metrics を保存する前に、何を継続観測すべきかを明文化する必要がある
- observability first を守り、automation は manual review と運用ルールが固まってから検討する

---

## ■ Related Documents

- `ERP設計憲法.md`
- `開発ルール.md`
- `docs/inventory-pallet-consistency-policy.md`
- `docs/request-chain-parent-trace-design.md`
- `docs/observability-monitoring-implementation-plan.md`
- `docs/projection-consistency-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-projection-read-model.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

historical observability snapshot は、運用品質を改善するための観測基盤である。

snapshot / history を残すことは、差異を自動修正することではない。まずは compare-only / visibility first で、現場が何を確認すべきか、どこで問題が繰り返されるか、改善傾向か悪化傾向かを説明できる状態を目指す。
