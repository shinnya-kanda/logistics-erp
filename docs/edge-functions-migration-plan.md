# Edge Functions Migration Plan

## 目的

このドキュメントは、logistics-erp の admin-dashboard / scan-app API を Supabase Edge Functions へ段階移行するための設計方針を定義する。

Edge Functions 移行の目的は以下である。

- Node API依存を減らす
- Supabase Auth / JWT と統合する
- role / warehouse_code 制御をAPI側へ集約する
- admin-dashboard / scan-app の軽量APIをサーバーレス化する

移行は一括ではなく、既存仕様を壊さない小さな単位で進める。

---

## B7-35: Edge Functions 移行設計

### 移行対象

Edge Functions へ移行する対象は、認証・role・warehouse_code 制御が必要で、かつサーバーレス実行に適した軽量 API とする。

対象：

- admin-dashboard の軽量参照API
- admin-dashboard の軽量更新API
- scan-app の軽量参照API
- scan-app の登録APIのうち在庫整合性リスクが低いもの

具体例：

- パレット検索
- 棚番検索
- 未登録棚番検索
- 空パレット検索
- 品番検索
- health系API
- DB更新が単純で、在庫トランザクションを発生させない登録API

### 移行しない対象

以下は Edge Functions へ移行しない。Local Processing Layer または当面の Node API に残す。

- PDF解析
- OCR
- CSV生成
- Excel生成
- NAS連携
- 帳票出力
- 長時間バッチ
- 複雑な在庫トランザクション

これらはファイルアクセス、CPU負荷、実行時間、現場運用との相性から、Edge Functions に載せるべきではない。

---

## Edge Functions 共通ガード設計

すべての業務 Edge Function は、共通 guard を通してから既存処理を実行する。

共通 guard の責務：

- JWT検証
- `user_profiles` 取得
- role制御
- `is_active` 確認
- `warehouse_code` 取得
- default deny
- worker拒否

許可条件：

- JWT が正しい
- `user_profiles` が存在する
- `is_active = true`
- role が許可ロールに含まれる
- `warehouse_code` が存在する

拒否条件：

- 未ログイン
- JWT不正
- `user_profiles` 未取得
- inactive
- role 不明
- worker
- `warehouse_code` なし
- guard 内の取得エラー

設計ルール：

- default deny を徹底する
- UI側の画面制御を信用しない
- role / warehouse_code 判定は API 側で必ず行う
- warehouse_code はフロント入力ではなく profile 由来を信頼する
- 既存レスポンス形式を壊さない

---

## B7-36: 最初の Edge Function 実装候補

最初の実装候補は、admin-dashboard の軽量参照APIとする。

推奨候補：

- パレット検索
- 棚番検索
- 未登録棚番検索
- health系API

選定基準：

- GET中心
- DB更新しない
- 在庫トランザクションを発生させない
- 既存レスポンス形式を壊しにくい
- worker拒否と warehouse_code 境界を検証しやすい

最初の候補として最も扱いやすいのは、admin-dashboard のパレット検索または棚番検索である。どちらも参照系であり、在庫トランザクションを発生させず、role / warehouse_code の検証結果を確認しやすい。

health系APIは実装確認用として有効だが、業務データ境界の検証には弱い。そのため、最初の実運用候補は参照系検索API、最初の疎通確認候補は health系APIとする。

---

## 移行順序

Step 1: Edge Functions 共通guard設計

JWT検証、`user_profiles` 取得、role制御、`is_active` 確認、`warehouse_code` 取得、default deny を共通化する。

Step 2: health / read系APIを1本移行

まず health か軽量な read API を1本だけ Edge Functions 化し、実行環境・環境変数・JWT検証の動作を確認する。

Step 3: admin-dashboard fetch先をEdge Functionsへ切替

対象APIだけ fetch 先を切り替える。admin-dashboard 全体を一括で切り替えない。

Step 4: worker 403確認

worker ロールで API が 403 になることを確認する。画面制御ではなく API 側の拒否を確認する。

Step 5: admin / office 200確認

admin / office / chief で従来通り 200 と既存レスポンス形式が返ることを確認する。

Step 6: scan-app APIへ展開

参照系 API から scan-app へ展開する。登録系へ進む前に、JWT・role・warehouse_code 境界が安定していることを確認する。

Step 7: 登録系APIへ段階移行

在庫整合性リスクが低い登録APIから段階的に移行する。複雑な在庫トランザクションを伴う API は最後に判断する。

---

## 禁止事項

- いきなり全APIを移行しない
- 在庫トランザクション系を最初に移行しない
- Local Processing対象をEdge Functionsへ載せない
- 既存レスポンス形式を壊さない
- driver-app / admin-dashboard のUI変更を同時にしない
- DBスキーマ変更をしない
- 関係ないリファクタリングをしない
- UI側の role 制御だけで API 保護済みとみなさない
- warehouse_code をフロントから任意指定できる信頼値として扱わない

---

## 結論

B7-35 では、Edge Functions 移行の対象を軽量な認証済み API に限定し、Local Processing 対象や複雑な在庫トランザクションを分離する。

B7-36 では、最初の実装候補を admin-dashboard の軽量参照APIとする。特にパレット検索、棚番検索、未登録棚番検索、health系APIを候補にし、GET中心・DB更新なし・既存レスポンス形式を壊しにくいものから移行する。

この順序により、logistics-erp は Node API 依存を段階的に減らしつつ、Supabase Auth / role / warehouse_code を API 側へ集約できる。
