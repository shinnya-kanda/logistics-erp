# ADR-0004: warehouse_code を主要 Security / Operational Boundary とする

作成日: 2026-05-09
Status: accepted

---

## ■ Context

logistics-erp は、warehouse_code ごとに現場、在庫、パレット、棚番、operator、事務確認、管理画面の閲覧範囲が分かれる。

在庫数量やパレット状態は倉庫境界を越えて混ざると、実物流、棚卸、請求、監査、現場指示に直接影響する。trace_id や external ID が一致していても、warehouse_code boundary を越えて自由に閲覧・操作できる設計にすると、data isolation と operational responsibility が曖昧になる。

Supabase Auth / JWT、`public.user_profiles`、guard、Edge Functions / RPC の移行方針では、role と warehouse_code を server-side に扱うことが重要である。この判断を正式 ADR として記録する。

---

## ■ Decision

`warehouse_code` を logistics-erp の主要 security / operational boundary とする。

- write command の `warehouse_code` は guard / server-side profile 由来を基本にする。
- client payload の `warehouse_code` を無条件に信頼しない。
- trace-search / Admin Dashboard / audit view は warehouse_code で絞り込む。
- trace_id が一致しても warehouse boundary を越えて表示・操作しない。
- replay / rebuild / recovery / correction の対象 warehouse_code を明示する。
- cross-warehouse operation は例外として扱い、必要な場合は別途 ADR / review 対象にする。

role-based access control と warehouse boundary は別概念として扱う。admin / chief / office / worker の role があっても、warehouse_code の閲覧・操作範囲を明示する。

---

## ■ Consequences

- 倉庫ごとの data isolation と operational responsibility を明確にできる。
- external input、OCR / EDI / CSV / Excel の warehouse mapping を慎重に検証する必要がある。
- trace-search や Admin Dashboard の横断調査では、warehouse_code の扱いを常に確認する必要がある。
- admin 権限でも warehouse 横断閲覧を無制限に許すかは別途判断が必要になる。
- replay / rebuild / recovery の automation を作る場合も、warehouse_code scope を必須にする必要がある。
- warehouse_code source を変更する判断は breaking change 候補になる。

---

## ■ Alternatives Considered

### client payload の warehouse_code を信頼する

Rejected.

client payload は改ざん・誤送信・古い UI / API 経由の入力があり得る。warehouse boundary は security / operational boundary であるため、server-side profile / guard / RPC 側の検証を基本にする。

### trace_id が一致すれば warehouse を越えて表示する

Rejected.

trace_id は業務操作の追跡軸であり、権限境界ではない。trace_id が一致しても、warehouse_code boundary を越える表示・操作は別途権限と監査理由が必要である。

### role だけで access control を決める

Rejected.

role は操作種別の制御に必要だが、倉庫ごとの data isolation を表すものではない。role と warehouse_code は組み合わせて扱う。

### cross-warehouse operation を標準機能にする

Deferred.

将来的に必要になる可能性はあるが、現時点では業務責任、監査、承認、trace、recovery の設計が必要である。標準機能として先に開けない。

---

## ■ Review Conditions

この ADR は以下の条件で見直す。

- 複数 warehouse_code をまたぐ正式業務が必要になった場合
- admin / chief の横断閲覧ルールを正式化する場合
- external input の warehouse mapping が複雑化した場合
- warehouse_code source を user profile 以外へ変更する場合
- replay / rebuild / recovery の warehouse scope を自動化する場合
- security audit で warehouse boundary の要件が変わった場合

---

## ■ Related Documents

- `ERP設計憲法.md`
- `開発ルール.md`
- `docs/adr-template.md`
- `docs/adr-source-of-truth.md`
- `docs/architecture-decision-records-strategy.md`
- `docs/minimum-viable-event-driven-architecture.md`
- `docs/event-driven-erp-principles.md`
- `docs/operational-rollout-strategy.md`

---

## ■ Notes

warehouse_code boundary は、単なる filter 条件ではない。

security、data isolation、現場責任、recovery scope、audit scope を決める主要な architecture boundary として扱う。
