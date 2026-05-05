# AI Prompt Template（Cursor / ChatGPT 用）

このテンプレートは logistics-erp 開発時の標準プロンプトである。

---

## ■ 基本テンプレ

```md
ERP設計憲法.md
開発ルール.md
docs/identifier-design.md

を前提にしてください。

既存仕様を壊さず、
以下のファイルのみ修正してください。

【対象ファイル】
- xxx

【やること】
- xxx

【禁止事項】
- 関係ないファイル変更
- リファクタリング
- 既存仕様変更
```

---

## ■ 目的

- AIによる設計破壊を防ぐ
- 識別子設計（project_no / issue_no）の誤用防止
- 小さく安全に開発を進める

---

## ■ 適用対象

- Cursor
- ChatGPT
- Claude

---

## ■ 注意

このテンプレを使用しない場合、以下のリスクがある：

- project_no と issue_no の混在
- business_mode 無視
- 在庫トランザクション破壊
- 意図しないリファクタリング

---

## ■ 確認事項

AI実装後、必ず以下を確認すること：

- project_no と issue_no が混在していないか
- business_mode が考慮されているか
- inventory_transactions を直接更新していないか
- 不要なリファクタリングが入っていないか
- 指定した対象ファイル以外が変更されていないか
