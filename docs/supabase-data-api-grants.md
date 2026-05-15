# Supabase Data API grants baseline

## 目的

この文書は、2026 年の Supabase Data API 仕様変更に備えて、`logistics-erp` で新規 `public` table を作成するときの GRANT / RLS / policy の標準方針を整理する。

今回の方針整理では DB 変更、migration 追加、既存 table の GRANT 変更、RLS policy 実装は行わない。既存 table は一括変更せず、今後作成する新規 `public` table からこの baseline を適用する。

## 前提

`logistics-erp` は Supabase Postgres を使うが、在庫・scan・trace の設計では「履歴を残す」「直接上書きしない」「Expected と Actual を混ぜない」ことを優先する。Data API から table が見えるかどうかも、業務データの安全性と監査性に関わるため、暗黙のデフォルト権限に依存しない。

Supabase の Data API は、PostgREST / supabase-js / GraphQL などから `public` schema の table にアクセスする入口になる。2026 年以降の仕様変更で、新規 table の API 公開や role grant の扱いがより明示的になる可能性があるため、migration では table 作成、GRANT、RLS、policy を同じ意図で管理する。

## 影響整理

影響を受ける可能性がある領域:

- `public` schema に新規 table を作成する migration
- `supabase-js` から table を読む処理
- PostgREST 経由の Data API
- Supabase GraphQL 経由の公開
- Edge Functions が service role または user JWT で DB にアクセスする処理
- Security Advisor で GRANT / RLS / policy の状態を確認する運用

今回の文書は既存 table を直ちに変更するものではない。既存 table は個別に影響・運用・policy を確認したうえで、必要な phase で別途 migration を作成する。

## GRANT と RLS の役割

- GRANT は API から table が見えるか、どの操作権限を持つかを決める。
- RLS は table が見えた後に、どの行へアクセスできるかを制御する。
- GRANT だけでは安全ではない。
- RLS だけでも GRANT が無ければ Data API から見えない。
- policy は RLS が有効な table で、role ごとの row access 条件を定義する。

## Role 方針

### anon

`anon` は未ログイン・公開クライアントから使われる role として扱う。原則として write 権限を付けない。

`anon` に `select` を付ける場合でも、公開してよい read model か、RLS policy で行単位の公開条件が明確かを確認する。

### authenticated

`authenticated` はログイン済み user の role として扱う。`select` は table ごとの業務要件に応じて判断する。

`insert` / `update` / `delete` は table ごとに慎重に判断する。write 権限を付ける場合は、RLS policy で user / warehouse / role / ownership などの条件を明確にする。

### service_role

`service_role` は強い権限を持つため、クライアントに出してはならない。Edge Function やサーバー側処理で使う場合でも、JWT guard、入力検証、監査ログ、必要最小限の DB 操作を前提にする。

`service_role` は RLS を bypass できるため、RLS があるから安全と考えない。

## 標準 SQL 例

新規 `public` table を Data API 対象にする場合は、migration 内で以下の意図を明示する。

```sql
grant usage on schema public to anon, authenticated, service_role;

grant select
  on public.your_table
  to anon;

grant select, insert, update, delete
  on public.your_table
  to authenticated;

grant select, insert, update, delete
  on public.your_table
  to service_role;

alter table public.your_table
  enable row level security;
```

この SQL は baseline の例であり、そのまま全 table に適用するものではない。特に `anon select` と `authenticated write` は業務要件と policy が揃った場合のみ採用する。

## RLS enable の標準方針

新規 `public` table は原則として RLS を有効にする。

RLS を有効にしただけではアクセスできないため、必要な role ごとに policy を作成する。policy が未定義の場合は、Data API から見えていても row access は拒否される前提で設計する。

policy を書くときの注意点:

- role ごとに read / write の条件を分ける。
- `anon` に write policy を作らない。
- `authenticated` の write policy は table ごとに慎重に判断する。
- warehouse / tenant / ownership / role の境界を曖昧にしない。
- `using` と `with check` の違いを明確にする。
- policy 名は目的がわかる名前にする。
- service role 前提の処理を client policy と混同しない。

## Edge Functions との関係

Edge Functions は以下を明確に分ける。

- user JWT を検証し、user context で DB を読む処理
- service role を使うサーバー側処理
- RLS に委ねる処理
- service role で RLS を bypass する処理

service role を使う場合でも、Edge Function 側で JWT guard、role check、warehouse boundary、入力検証を行う。service role key はクライアントへ渡さない。

Edge Function が Data API ではなく database client / RPC / SQL 経由でアクセスする場合でも、GRANT / RLS / policy の意図は migration と documentation に残す。

## supabase-js / PostgREST / GraphQL との関係

`supabase-js` は Data API の権限と RLS の影響を受ける。クライアントから table を読めない場合、まず GRANT と RLS policy の両方を確認する。

PostgREST は GRANT で見える操作と RLS policy の行条件に従う。

GraphQL も `public` schema table の公開状態や RLS policy の影響を受けるため、GraphQL で使う table でも同じ baseline を確認する。

## Migration checklist

新規 `public` table を作る migration では、以下を同じ意図で管理する。

- table の目的が read model / source of truth / audit log / projection のどれかを明記した。
- `grant usage on schema public` が必要か確認した。
- `anon` に必要な権限を明示した。
- `anon` に write 権限を付けていない。
- `authenticated` の `select` / `insert` / `update` / `delete` を table ごとに判断した。
- `service_role` の権限を明示した。
- `alter table ... enable row level security` を入れた。
- read policy を作る場合、公開条件が明確である。
- write policy を作る場合、`using` / `with check` が適切である。
- Edge Function から使う場合、JWT guard / service role / RLS の関係を説明できる。
- Security Advisor で警告を確認する。
- 既存 table を巻き込む一括変更になっていない。

## Security Advisor 確認手順

1. Supabase Dashboard を開く。
2. 対象 project の Security Advisor を確認する。
3. 新規 table の RLS enabled / policy / exposed table / grants に関する警告を確認する。
4. `anon` / `authenticated` / `service_role` の GRANT が意図通りか確認する。
5. 警告を migration または policy 設計で解消する。
6. 解消しない警告がある場合は、理由を docs または migration comment に残す。

## 適用方針

この baseline は今後の新規 `public` table から適用する。既存 table は今回一括変更しない。

既存 table の GRANT / RLS / policy は、業務影響、既存 API、scan 契約テスト、Edge Function、Supabase client 利用箇所を確認したうえで、別 phase の migration として扱う。
