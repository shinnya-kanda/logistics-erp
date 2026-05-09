# ADR-0003: Rollback より Correction / Recovery を優先する

作成日: 2026-05-09
Status: accepted

---

## ■ Context

logistics-erp では、入庫、出庫、移動、パレット作成、棚番移動、OCR / EDI 取込、将来の shipment / billing など、実物流や請求根拠に関わる操作を扱う。

commit 前の処理失敗は database transaction rollback で扱える。一方で、commit 済みの業務履歴を後から物理削除・上書きして「なかったこと」にすると、実物流、現場説明、監査、請求根拠、traceability が壊れる。

ERP設計憲法では、履歴データを原則物理削除せず、誤登録は取消・修正・調整トランザクションで履歴を残す方針である。この判断を architecture decision として明確に記録する。

---

## ■ Decision

commit 済みの業務履歴に対しては、rollback より correction / compensation / recovery を優先する。

- commit 前の失敗は transaction rollback で扱う。
- commit 済みの誤りは correction / compensation transaction で説明する。
- projection drift は rollback ではなく refresh / rebuild / recovery で扱う。
- replay は過去状態への巻き戻しではなく、新しい trace / event として扱う。
- correction / recovery は、元 trace / source row / operator / reason / approver と関係づけることを検討する。

この ADR は、database transaction rollback を禁止するものではない。禁止するのは、commit 済みの業務履歴を安易な削除・上書きで消すことである。

---

## ■ Consequences

- 誤りがあっても、何が起きて、どう補正したかを後から説明できる。
- 在庫差異、パレット移動差異、棚番差異、請求候補差異を audit 可能に扱える。
- correction / recovery の UI・権限・承認・metadata は慎重に設計する必要がある。
- projection だけを直す運用ではなく、source of truth と read model のどちらが誤っているかを分けて調査する必要がある。
- 一時的には履歴が増え、調査時に元操作と補正操作の両方を見る必要がある。
- replay / recovery / correction の automation は、manual review の実績ができてから検討する。

---

## ■ Alternatives Considered

### commit 済み履歴を削除して戻す

Rejected.

履歴を削除すると、実物流との差分、operator の操作、補正理由、請求・監査根拠を追えなくなる。source of truth を壊すため採用しない。

### commit 済み履歴を上書きして正しい値にする

Rejected.

単純な上書きは、誤りが存在した事実と補正過程を消してしまう。特に在庫・パレット・請求に関わる domain では説明責任を失う。

### projection だけを修正して業務上正しい表示にする

Rejected.

表示上は正しく見えても、source of truth との差異が隠れる。rebuild / audit / trace-search で再び矛盾が現れるため採用しない。

### correction / recovery engine をすぐ作る

Deferred.

将来的には有効だが、最初から汎用 engine を作ると業務判断・承認・例外処理を過剰に抽象化するリスクがある。まずは manual review / checklist / scoped recovery から始める。

---

## ■ Review Conditions

この ADR は以下の条件で見直す。

- correction / recovery の件数が増え、手動判断では追えなくなった場合
- operator / office / chief / admin の承認責務を実装として固定する場合
- recovery engine / replay engine / approval workflow を導入する場合
- billing 確定後 correction の正式ルールを決める場合
- 法務・監査上、履歴保持や訂正方法に新しい要件が出た場合

---

## ■ Related Documents

- `ERP設計憲法.md`
- `開発ルール.md`
- `docs/adr-template.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-projection-read-model.md`
- `docs/architecture-decision-records-strategy.md`
- `docs/minimum-viable-event-driven-architecture.md`
- `docs/event-driven-erp-principles.md`
- `docs/operational-rollout-strategy.md`

---

## ■ Notes

rollback は不要という意味ではない。

commit 前の technical failure は rollback で扱い、commit 済みの business history は correction / recovery で説明する、という境界を守る。
