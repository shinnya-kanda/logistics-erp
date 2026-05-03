# API Responsibility Map

## 目的

このドキュメントは、logistics-erp における API / サーバー処理の責務を整理し、今後の Supabase Edge Functions 移行とローカルPCサーバー運用の判断基準を明文化する。

logistics-erp は、すべての処理をクラウドに集約しない。認証・権限・軽量DB処理はクラウドへ寄せ、PDF・OCR・帳票・NAS連携のような重い処理や現場ファイル依存処理はローカル処理層に残す。

---

## 1. Supabase Edge Functionsへ移すAPI

Edge Functions へ移す対象は、認証・ロール制御・warehouse_code 制御が必要で、かつ軽量な DB 参照・登録に収まる API とする。

対象の条件：

- Supabase Auth の JWT 検証が必須
- `user_profiles.role` による role 制御が必要
- `user_profiles.warehouse_code` によるデータ境界が必要
- 短時間で完了する軽量な DB 参照・登録
- admin-dashboard / scan-app から直接利用される業務 API
- サーバーレス実行に適した処理

想定対象：

- admin-dashboard 用の検索 API
- admin-dashboard 用の軽量更新 API
- scan-app 用の scan API
- 入庫・移動・出庫などの現場系 API のうち、Edge Functions で安全に扱えるもの
- パレット検索・棚番検索・品番検索・空パレット検索
- user_profiles を前提にした認証済み API

設計ルール：

- default deny を前提にする
- JWT 不正・未ログイン・profile 未取得・inactive・role 不明は拒否する
- warehouse_code が必要な API では、profile の warehouse_code を信頼境界として扱う
- フロント側の画面制御だけに依存しない
- API 側で必ず role / warehouse_code を検証する

---

## 2. Local Processing対象

ローカルPCサーバー、社内PC、NAS、ミニPCで扱う対象は、クラウドに集約すると運用・性能・ファイルアクセス面で不利になる処理とする。

対象の条件：

- ファイルシステムや NAS への直接アクセスが必要
- PDF / Excel / CSV などのローカルファイル処理が中心
- OCR など CPU 負荷や実行時間が大きい
- 現場のオフライン運用や手動確認と相性がよい
- 帳票・印刷・バッチなどクラウドサーバーレスに適さない

想定対象：

- PDF解析
- OCR処理
- CSV生成
- Excel生成
- 帳票出力
- NASファイル連携
- 長時間バッチ
- 人間確認前のデータ整形

設計ルール：

- OCR結果を確定データとして扱わない
- 人間確認を挟んでから admin-dashboard へアップロードする
- ローカル処理はクラウドDBの真実を直接壊さない
- 在庫トランザクションを直接改変する処理をローカルに閉じ込めない
- 生成物は CSV / JSON / Excel など、確認可能な中間成果物として扱う

---

## 3. 当面Node APIに残す対象

既存の Node API は、Edge Functions へ移行する前の暫定実行基盤として扱う。すぐに移行しない処理、移行可否が未確定の処理、複雑な在庫トランザクションを含む処理は当面 Node API に残す。

対象の条件：

- 既存 scan API として稼働している
- Edge Functions 移行前の検証期間が必要
- DB関数・在庫トランザクション・整合性制御が複雑
- 仕様がまだ固まりきっていない
- ローカル処理か Edge Functions か判断が未確定

想定対象：

- Edge Functions 移行前の既存 scan API
- 複雑な在庫トランザクション
- パレット作成・移動・出庫など、DB整合性確認が必要な API
- 棚番マスタ操作のうち、運用仕様が変わりやすいもの
- 移行対象か未確定の API

設計ルール：

- Node API に残す場合でも、認証・role・warehouse_code の責務を曖昧にしない
- Edge Functions 移行時に分離しやすい単位を保つ
- 既存成功レスポンス形式を壊さない
- 在庫トランザクションの整合性を最優先する

---

## B7-31〜B7-33との関係

B7-31 では、admin-dashboard の画面表示に role 制御を追加した。これは UI 側の保護であり、API 保護の代替ではない。

B7-32 では、admin-dashboard の `/api/scan/*` proxy で JWT を検証し、`user_profiles.role` による API 側の role 制御を追加した。これにより、worker や未ログインユーザーが画面を迂回して API を直接叩いても拒否できる。

B7-33 では、同じ proxy で `user_profiles.warehouse_code` を取得し、下流 API へ `x-warehouse-code` として渡す基礎を作った。これは将来の会社・営業所・倉庫単位のデータ境界の土台である。

今後の Edge Functions 化では、B7-31〜B7-33 で作った以下の責務を Edge Functions 側へ移していく。

- JWT 検証
- user_profiles 取得
- role 制御
- warehouse_code 制御
- default deny

---

## 今後の移行順序

1. admin-dashboard の軽量参照 API を Edge Functions 化する
2. admin-dashboard の軽量更新 API を Edge Functions 化する
3. scan-app の参照系 API を Edge Functions 化する
4. scan-app の登録系 API を、在庫整合性を確認しながら段階的に Edge Functions 化する
5. 複雑な在庫トランザクション API は、DB関数・テスト・運用仕様が安定してから移行判断する
6. PDF / OCR / CSV / Excel / NAS / 帳票 / 長時間バッチは Local Processing Layer に残す

移行時の確認事項：

- 既存レスポンス形式を壊していないか
- role 制御が API 側で効いているか
- warehouse_code 境界が API 側で強制されているか
- worker が拒否されるか
- admin / chief / office が必要な API を利用できるか
- 未ログイン・JWT不正・profile 未取得・inactive が拒否されるか

---

## 禁止事項

- 画面制御だけで API 権限制御を済ませること
- warehouse_code をフロント入力値だけで信用すること
- OCR結果を確認なしで確定データとして登録すること
- 重い PDF / OCR / Excel / 帳票処理を無理に Edge Functions に載せること
- 在庫トランザクションの整合性を崩す移行を行うこと
- 既存APIの成功レスポンス形式を移行都合で変更すること
- DBスキーマを責務整理だけの目的で変更すること
- driver-app / admin-dashboard の既存業務ロジックを移行準備だけで変更すること
- 関係ないリファクタリングを同時に行うこと

---

## 結論

logistics-erp の API は、以下の3分類で扱う。

- 認証・role・warehouse_code が必要な軽量 API は Supabase Edge Functions へ移す
- PDF / OCR / CSV / Excel / NAS / 帳票 / 長時間バッチは Local Processing Layer に残す
- 既存 scan API と複雑な在庫トランザクションは、当面 Node API に残して段階的に移行判断する

この分類により、クラウドERPとして無理に一元化せず、ローカル処理と連携する物流OSとして段階的に育てる。
