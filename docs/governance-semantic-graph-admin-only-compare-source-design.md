# Governance Semantic Graph Admin-only Compare Source Design

Phase B77-48 documentation.

このドキュメントは、B77-47 hidden flag integration により `real_compare_readonly` が typed / guarded / hidden source mode になったことを前提に、将来この source を admin-only visibility として扱うための設計境界を整理する documentation-only phase である。

今回は設計のみである。fetch implementation、route change、UI change、auth implementation、role implementation、Supabase integration、DB query、mutation、POST、workflow execution は行わない。

## 1. Design Purpose

B77-48 の目的は、`real_compare_readonly` を将来表示する場合に、hidden flag の次段階として admin-only guard をどの責務で重ねるかを固定することである。

Design purpose:

- `real_compare_readonly` を admin-only source として扱う設計を明確にする。
- hidden flag の次段階として admin guard を定義する。
- accidental visibility / accidental enablement を防止する。
- read-only boundary を維持する。
- production rollout 前に visibility、role、validation gate、fallback の責務境界を整理する。

この design は implementation permission ではない。`real_compare_readonly` を active source として有効化する許可、fetch を実装する許可、route を変更する許可、UI を変更する許可、認証・権限を実装する許可、本番解放する許可を含まない。

## 2. Current State Review

Current source modes:

```text
mock
adapter_fixture
compare_fixture
fallback_unavailable
real_compare_readonly
```

Current state:

- `mock`
  - Static mock graph data を表示する mode。
  - UI layout、readability、accessibility、demo 表示の確認用であり、real compare data ではない。
- `adapter_fixture`
  - static compare response fixture を graph adapter に渡す adapter verification mode。
  - API、route、DB、Supabase、mutation は接続しない。
- `compare_fixture`
  - contract validation fixtures を Graph UI で確認する shape verification mode。
  - live compare data ではなく、broken / missing / drifted / unsupported shape の表示確認用である。
- `fallback_unavailable`
  - `createUnavailableGraphData()` による safety fallback mode。
  - graph unavailable / not live compare data / no execution action を明示する。
- `real_compare_readonly`
  - B77-46 で typed / guarded / disabled source mode として追加済み。
  - B77-47 で `ENABLE_REAL_COMPARE_READONLY_GRAPH_SOURCE = false` の hidden flag により Graph Source UI から非表示。
  - hidden flag が true になっても `isGuarded: true` / `isEnabled: false` のため disabled / guarded のままである。
  - 万一 local state に入っても unavailable graph に fallback する。

Current architecture conclusion:

- `real_compare_readonly` は option 定義として存在するが、現在は表示対象ではない。
- hidden flag は visibility candidate に入れるかどうかだけを制御し、fetch、auth、authorization、validation、live data enablement は制御しない。
- 次段階では hidden flag の後ろに admin-only guard を重ね、admin 以外に source option を見せない設計が必要である。

## 3. Admin-only Source Concept

`real_compare_readonly` は将来、次の条件をすべて満たす場合のみ visible candidate になる。

```text
hidden flag enabled
AND
admin-only guard passed
AND
validation gate passed
```

ただし visible candidate になっても、source は read-only observability に限定する。

Admin-only source definition:

- admin-only は source visibility の制御である。
- admin-only は mutation permission ではない。
- admin-only は workflow approval ではない。
- admin-only は execution permission ではない。
- admin-only は `compare-readonly` GET response を観測表示する候補に過ぎない。

Recommended future source state:

```text
real_compare_readonly
↓
visible only when hidden flag, admin guard, and validation gate pass
↓
read-only compare projection
↓
Graph UI display
```

この flow は execution flow ではない。admin user に見える場合でも、correction、approval、repair、rebuild、sync、retry、workflow execution を開始しない。

## 4. Guard Layers

`real_compare_readonly` は単一条件で表示しない。次の guard layers を順に満たすことを前提にする。

| Guard | Responsibility | Pass behavior | Fail behavior |
| --- | --- | --- | --- |
| Hidden flag | `real_compare_readonly` を visible candidate に入れるかを code-level constant で制御する | 次 guard に進む | source option 非表示 |
| Admin-only guard | admin / debug eligible user だけに visible candidate を限定する | 次 guard に進む | source option 非表示 |
| Validation gate | contract fixtures、adapter fallback、warning visibility、read-only boundary の検証完了を確認する | guarded read-only candidate として表示候補 | disabled / guarded / unavailable に留める |
| Read-only contract guard | `GET` only、No Mutation、No Execution Workflow を維持する | read-only projection として扱う | source を有効化しない |
| Fallback guard | unsafe / unavailable / drifted response を `fallback_unavailable` に倒す | unavailable graph と warning を表示 | mock へ silent fallback しない |

Recommended guard composition:

```text
ENABLE_REAL_COMPARE_READONLY_GRAPH_SOURCE
↓
admin-only guard
↓
validation gate
↓
read-only contract guard
↓
fallback guard
↓
real_compare_readonly visible candidate
```

Guard principles:

- hidden flag true だけでは表示しない。
- admin guard passed だけでは有効化しない。
- validation gate passed までは disabled / guarded を維持する。
- read-only contract guard は admin-only より優先される。
- fallback guard は real source failure を mock data で隠さない。

## 5. Admin Guard Responsibility

Admin guard の責務は source visibility の安全制御に限定する。

Admin guard is responsible for:

- UI visibility control
- accidental exposure prevention
- production-like review scope limitation
- debug / admin candidate separation
- non-admin user confusion prevention

Admin guard is not responsible for:

- authorization mutation
- workflow approval
- execution permission
- correction permission
- repair / rebuild / sync permission
- route invocation permission by itself
- validation gate completion
- production rollout approval

Admin guard は「管理者だから実行できる」という意味ではない。管理者に限定しても Graph UI は display-only source selection であり、`InventoryIntegrityGraphData` は visualization input のままである。

## 6. Admin Eligibility Source

Future implementation で admin eligibility をどこから取得するかは別 phase で決める。B77-48 では候補と trade-off だけを整理する。

| Eligibility source | Pros | Cons | Recommendation |
| --- | --- | --- | --- |
| Existing dashboard admin role | 既存 dashboard の権限概念と揃えやすい | role definition が画面用か業務用か曖昧な場合がある | 第一候補。ただし role naming と read-only boundary を明文化する |
| Server-side session role | client-side leakage を抑えやすく production guard と相性がよい | 実装範囲が広がり、auth boundary の設計が必要 | production 候補。implementation phase で設計する |
| Static debug role | local / review 環境で検証しやすい | production 混入リスクが高い | local-only に限定し、production build へ入れない前提が必要 |
| Future auth provider role | 将来の認証基盤と統合しやすい | 現時点では依存が未確定で設計が先行しすぎる | auth provider が確定してから採用判断する |
| Local development override | 開発確認が速い | accidental exposure、support confusion、本番混入のリスクが高い | production 禁止。documented local-only override としてのみ検討 |

Eligibility source policy:

- admin eligibility は source visibility の入力であり、business workflow state ではない。
- role 名は `admin` だけでなく read-only source visibility 用の意味を明確にする。
- local override を使う場合は production build / production runtime に混入しない設計を必須にする。
- server-side role を使う場合も mutation authority と混同しない。

## 7. UI Disclosure Strategy

将来 admin-only source が表示される場合は、admin-only と read-only を同時に明示する。

Required wording:

- `Admin Only / 管理者限定`
- `Guarded Source / ガード中ソース`
- `Read-only Compare Data / 読み取り専用比較データ`
- `GET Only / GET のみ`
- `Read Only / 読み取り専用`
- `Observability Only / 観測専用`
- `No Execution Controls / 実行操作なし`
- `Validation Gate Required / 検証ゲート必須`
- `No Execution Route / 実行経路ではありません`

Recommended placement:

- Graph Source panel
  - source option label、trust level、admin-only badge、guarded status、validation status。
- Graph Header
  - `Read Only / 読み取り専用`、`Observability Only / 観測専用`、`No Execution Controls / 実行操作なし`。
- Projection Path
  - `compare-readonly GET -> read-only adapter boundary -> graph adapter -> Graph UI`。
- Inspector
  - source provenance、admin-only visibility、guard status、fallback reason、no execution meaning。
- Unavailable panel
  - validation failure / source unavailable / guard fallback の場合に `Graph Unavailable` を表示する。

Wording rules:

- `Admin Only` は visibility scope として表現する。
- `Live` を使う場合は `Live Read-only Source` のように read-only とセットにする。
- `Run`、`Execute`、`Approve`、`Repair`、`Rebuild`、`Sync`、`Retry` を action label として使わない。
- warning は action prompt ではなく read-only caveat として表示する。

## 8. Failure / Denied Strategy

Admin guard が通らない場合は fail closed とする。

Denied behavior:

- source option を非表示にする。
- `fallback_unavailable` には切り替えない。
- warning も不要。
- no action button。
- no retry / repair / rebuild / sync / approve control。
- hidden flag true でも admin guard false なら非表示。

理由:

- 非 admin user にとって `real_compare_readonly` は存在しない source として扱う方が混乱が少ない。
- denied を fallback graph として表示すると、権限 denied と graph unavailable が混同される。
- denied warning を表示すると、未公開 source の存在を漏らす可能性がある。

Failure behavior after admin guard passed:

- validation gate が通らない場合は disabled / guarded のままにする。
- unsafe response、unsupported shape、metadata ambiguity、source outage は `fallback_unavailable` に倒す。
- real source failure は mock に silent fallback しない。
- warnings は read-only caveat として表示する。

Failure distinction:

| Condition | User-visible behavior |
| --- | --- |
| Hidden flag false | source option 非表示 |
| Hidden flag true + admin guard false | source option 非表示 |
| Admin guard true + validation gate false | guarded / disabled 表示候補 |
| Validation gate true + read-only contract failed | source を有効化しない |
| Real source unavailable in future phase | `fallback_unavailable` with visible caveat |

## 9. Read-only Boundary

Admin-only source でも read-only boundary は変わらない。

Mandatory boundary:

- `GET` only
- `Read Only / 読み取り専用`
- `Observability Only / 観測専用`
- `No Mutation / データ変更なし`
- `No Execution Workflow / 実行ワークフローなし`
- `No Execution Controls / 実行操作なし`
- `No Execution Route / 実行経路ではありません`

Boundary interpretation:

- `compare-readonly` は GET endpoint として維持する。
- admin-only guard は source visibility の guard であり route mutation を許可しない。
- Graph UI は rendering boundary であり、inventory data を変更しない。
- Graph source selection は local view state または read-only configuration であり、business state ではない。
- edge direction は semantic relation direction であり operation route ではない。
- inspector detail は explanation であり action recommendation ではない。

Prohibited in future admin-only implementation unless a separate approved phase changes scope:

- POST
- DB write
- Supabase mutation
- workflow execution
- retry / repair / rebuild / sync / approve controls
- route change
- package install

## 10. Risks

Risks:

- Admin source is misread as execution permission.
  - 管理者限定の表示が correction / approval / repair authority と誤読される。
- Hidden flag and admin guard responsibilities are mixed.
  - hidden flag が visibility candidate、admin guard が user eligibility、validation gate が readiness である境界が崩れる。
- Local development override leaks to production.
  - local-only shortcut が production build / runtime に混入する。
- Role naming drift.
  - `admin`、`operator`、`viewer`、`debug` の意味が画面ごとにずれ、source visibility が過大になる。
- Visibility leak.
  - non-admin user に source option、warning、denied message などから real source の存在が漏れる。
- Validation gate bypass.
  - admin guard passed を理由に adapter / contract validation を省略してしまう。
- Read-only boundary erosion.
  - future fetch implementation と同時に retry / repair / rebuild / sync controls が追加される。
- Silent fallback confusion.
  - real source failure が mock data に隠れ、source outage や contract drift が見えなくなる。

## 11. Mitigation

Mitigations:

- Explicit badges
  - `Admin Only / 管理者限定`、`Guarded Source / ガード中ソース`、`Read Only / 読み取り専用`、`No Execution Controls / 実行操作なし` を常時表示する。
- Disabled until validation gate
  - validation gate が完了するまでは visible candidate でも disabled / guarded を維持する。
- Admin-only wording
  - admin-only は visibility scope として説明し、execution authority と表現しない。
- No action wording
  - retry、repair、rebuild、sync、approve、execute の command wording を source panel に置かない。
- No mutation endpoints
  - `compare-readonly` は GET only とし、Graph UI から mutation endpoint を呼ばない。
- Production flag review
  - hidden flag、admin guard、validation gate、environment scope の組み合わせを production release 前に review する。
- Denied is invisible
  - admin guard false の場合は warning や fallback ではなく source option 非表示にする。
- Local override containment
  - local development override を採用する場合は production 禁止を明文化し、別 phase で検証する。
- Fallback visibility
  - future real source failure は `fallback_unavailable` と warning caveat を表示し、mock へ silent fallback しない。

## 12. Recommendation

Admin-only design readiness: Medium to High.

- hidden flag、guarded / disabled option、fallback behavior が前段階として揃っている。
- admin-only guard の責務を visibility control に限定すれば、次 phase の設計に進める。

Implementation readiness: Medium.

- UI option filtering と guarded source behavior は既に存在する。
- ただし admin eligibility source、server/client boundary、role naming、local override policy は未実装である。

Production readiness: Low.

- production で `real_compare_readonly` を表示するには、admin guard だけでなく validation gate、read-only contract guard、fallback visibility、contract drift handling、release review が必要である。
- hidden flag false を production default として維持する。

Overall recommendation:

- B77-49 では admin-only visibility を実装する場合も、fetch は実装しない。
- hidden flag true、admin guard passed、validation gate passed の三段条件を分離して扱う。
- admin denied は non-event とし、source option 非表示にする。
- admin visible でも `real_compare_readonly` は read-only observability source として扱う。

## 13. Future Phases

Candidate future phases:

- B77-49 admin-only compare source implementation
  - hidden flag の後ろに admin-only guard を追加する。
  - fetch、route change、real compare integration は含めない。
  - non-admin は source option 非表示、admin でも disabled / guarded を維持する。
- B77-50 real compare validation spike
  - contract validation fixture と real-like response projection の安全性を確認する。
  - no mutation、no route change、no workflow execution を維持する。
- B77-51 guarded read-only fetch design
  - fetch boundary、transport error、loading / unavailable view state、source provenance を設計する。
  - Graph UI に fetch を直接持ち込まない方針を固定する。
- B77-52 guarded read-only fetch implementation
  - approved design 後に GET-only fetch を guarded / admin-only / validation-gated に実装する候補。
  - mutation、POST、workflow execution、retry / repair controls は含めない。

## 14. Out of Scope

B77-48 is documentation only.

Out of scope:

- auth implementation
- role implementation
- admin guard implementation
- fetch implementation
- route change
- UI implementation
- real compare integration
- source option behavior change
- environment flag implementation
- query parameter implementation
- localStorage implementation
- Supabase integration
- DB query
- DB schema change
- migration
- Edge Function change
- services/api change
- package install
- mutation
- POST
- workflow execution
- approval workflow
- remediation workflow
- production enablement

変更禁止:

- `apps/admin-dashboard/src/app`
- `package.json`
- `pnpm-lock.yaml`
- `supabase`
- `migrations`
- Edge Functions
- DB schema
- `services/api`

追加禁止:

- `fetch`
- `createClient`
- mutation implementation
- `POST` implementation
- `.insert`
- `.update`
- `.upsert`
- `.delete`
- `.rpc`

This document is an admin-only source design gate. It does not implement, expose, invoke, fetch, authorize, mutate, or enable `real_compare_readonly`.
