# Identifier Design Strategy（PJ NO / 発行NOの扱い）

作成日: 2026-05-05  
作成者: 神田

---

# ■ 背景

logistics-erp は以下の異なる業務を統合対象としている。

- コマツ金沢（パレット・棚・製番管理）
- ブリヂストン（Expected / Actual 突合型）

それぞれ識別子の意味が異なる。

---

# ■ 問題

コマツ金沢では

- project_no（製番 / PJ NO）

を使用する。

一方、ブリヂストンでは

- 発行NO（指示・伝票単位）

が存在する。

これを

```text
project_no に発行NOを入れて運用する
```

という案が検討された。

---

# ■ 結論

❌ 発行NOを project_no に流用してはいけない

理由：

- 意味が異なる（製番 vs 伝票）
- 将来の請求・在庫集計が崩れる
- traceの一貫性が壊れる
- AI / 開発者が誤解する
- ERP設計憲法の「IDは最重要」に違反

---

# ■ 正しい設計

識別子は分離する。

```text
project_no = コマツ金沢の製番
issue_no   = ブリヂストンの発行NO
```

## ■ 推奨カラム構成

### パターンA（シンプル）

```text
project_no text
issue_no   text
```

### パターンB（拡張型）

```text
external_ref_type text  -- project / issue / order
external_ref_no   text
```

※初期はパターンA推奨

---

# ■ 共通キー

業務をまたぐ識別は以下で統一する。

- trace_id
- warehouse_code
- transaction_id

---

# ■ business_mode の導入

業務差分はDBで吸収する。

```text
business_mode
```

- komatsu_kanazawa
- bridgestone

---

# ■ scan API の位置付け

## コマツ金沢

- 主体：パレット / 在庫トランザクション
- scan API：必須ではない

## ブリヂストン

- 主体：Expected / Actual 突合
- scan API：中核機能

---

# ■ DB進化方針

- 既存テーブルは壊さない
- migrationで段階的に拡張
- 業務ごとの違いは吸収する

---

# ■ 今後の拡張

- issue_no を正式サポート
- scan → inventory_transactions 連携
- billing との接続

---

# ■ 最重要原則

IDは意味を持つ  
流用してはいけない

---

# ■ 一言まとめ

コマツとブリヂストンは

```text
同じDBに乗せるが、同じ意味で扱わない
```

これが logistics-erp の基本戦略である。

---

# ■ 追加でおすすめ

このドキュメントは重要度が高いため、今後の整理タイミングで README.md からリンクを貼る。
