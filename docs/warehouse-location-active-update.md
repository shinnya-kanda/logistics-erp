# warehouse-location-active-update 仕様

作成日: 2026-05-06

---

## ■ APIの目的

`warehouse-location-active-update` は、棚番マスタ `warehouse_locations` の有効 / 無効状態を更新するための admin-dashboard 用 Edge Function である。

このAPIは棚番そのものを削除・変更するものではなく、`is_active` の切替のみを行う。

---

## ■ ロール制御

許可:

- admin
- chief

拒否:

- office: 403
- worker: 403

JWTなし、またはJWT不正の場合は 401 とする。

---

## ■ warehouse_code の扱い

`warehouse_code` はクライアントから受け取らない。

Edge Function の guard が JWT と `user_profiles` から取得した `guard.warehouseCode` を唯一の倉庫境界として使用する。

---

## ■ 更新対象の特定

更新対象は以下の組み合わせで特定する。

```text
warehouse_code = guard.warehouseCode
location_code  = request body の location_code
```

`location_code` は棚番マスタ上の識別子であり、変更対象ではない。

---

## ■ 使用RPC

Edge Function は直接 `warehouse_locations` を更新せず、以下のRPCを呼び出す。

```text
public.update_warehouse_location_active_with_history
```

RPC引数:

- `p_warehouse_code`
- `p_location_code`
- `p_is_active`
- `p_operator_id`
- `p_operator_role`

---

## ■ RPC内で行う処理

RPC内では以下を1操作として実行する。

1. `warehouse_code + location_code` で更新前 row を取得
2. 対象がなければ `location_not_found` を返す
3. `warehouse_locations.is_active` と `updated_at` を更新
4. 更新後 row を取得
5. `warehouse_location_history` へ履歴を追加

これにより、状態更新と監査ログ追加を同じDB関数内で扱う。

---

## ■ レスポンス挙動

### 200

更新成功時。

```json
{
  "ok": true,
  "location": {
    "warehouse_code": "KOMATSU",
    "location_code": "A-01",
    "is_active": true,
    "updated_at": "..."
  }
}
```

### 403

`office` / `worker` など、更新権限のないロールの場合。

### 404

`guard.warehouseCode + location_code` に一致する棚番が存在しない場合。

```json
{
  "ok": false,
  "error": "location_not_found"
}
```

---

## ■ historyに残す内容

`warehouse_location_history` には以下を残す。

- `warehouse_code`: guard由来の倉庫コード
- `location_code`: 対象棚番
- `action_type`: `UPDATE_ACTIVE`
- `before_data`: 更新前の `warehouse_locations` row
- `after_data`: 更新後の `warehouse_locations` row
- `operator_id`: 操作者のユーザーID
- `operator_role`: 操作者ロール
- `created_at`: 履歴作成日時

---

## ■ 今後の拡張予定

- 棚番作成時の `warehouse_location_history` 追加
-  remarks など、棚番マスタ属性変更時の履歴追加
- admin-dashboard での履歴閲覧画面
- 監査ログのCSV出力
- 操作者名やメールアドレスの表示補助

---

## ■ 原則

棚番マスタの状態変更は、誰が・いつ・何を変更したかを追跡できる形で残す。

`warehouse_code` は常にJWT / guard由来とし、クライアント入力で上書きしてはいけない。
