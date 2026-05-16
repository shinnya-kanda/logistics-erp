# Inventory Aggregation Semantics Review

Phase B32-01 inventory aggregation semantics review.

この文書は、`inventory_transactions` から `inventory_current` 相当の集計状態をどう考えるかを整理するための semantics review である。SQL、RPC、Edge Function、API、migration、React UI、rebuild、compare execution、correction、replay は扱わない。

目的は、将来の compare / rebuild / integrity visualization の前提を明確にし、`inventory_current` を正とせず、`inventory_transactions` から説明できることを最優先にすることである。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- aggregation は、履歴イベントから「現在数量に見える状態」を説明するための意味整理である。
- compare projection は、`inventory_transactions` 由来の期待現在庫と `inventory_current` の表示値を照合するための read-only reasoning visualization である。
- rebuild は、将来 `inventory_transactions` から read model を再構成できるようにする考え方であり、この文書では実装しない。
- audit / trace / evidence は、集計結果がどの transaction / pallet / trace / limitation に由来するかを説明するための参照情報であり、実行や修正の開始条件ではない。

## Source Of Truth

`inventory_transactions` は、入庫・出庫・移動・調整・取消などの在庫変化を履歴として保持する。現在庫は単独の保存値ではなく、これらの履歴イベントを集計して説明できる状態として扱う。

このため、在庫差異を判断するときは、まず `inventory_transactions` から導出できる期待現在庫を基準に考える。`inventory_current` に値が存在していても、それは表示用 cache / read model であり、truth の代替ではない。

## inventory_current の意味

`inventory_current` は、業務画面で現在数量を素早く表示するための aggregation cache / compare target である。

意味:

- `inventory_transactions` から導出された結果を保持する read model
- compare projection で差異を見る対象
- stale / partial / inconsistent になり得る表示値
- rebuild で再構成され得る cache

意味しないこと:

- 在庫の truth
- transaction 履歴の代替
- correction の根拠単体
- rebuild / replay / compare execution の開始命令

## Aggregation Unit Candidates

集計単位は、在庫の意味を分ける境界である。将来の実装では、どの単位まで同一在庫として足し合わせてよいかを明確にする必要がある。

候補:

- `warehouse_code`: 倉庫境界。倉庫をまたぐ数量は原則として同一現在庫にまとめない。
- `project_no`: project / mrp などの在庫種別・製番境界。請求や引当の意味が変わる可能性がある。
- `part_no`: 部品単位。部品番号が異なる数量は集計しない。
- `location_code`: 棚・場所単位。現場確認や棚卸の粒度に直結する。
- `pallet_code`: パレット単位。パレット保管や pallet transaction と接続する場合の重要な境界。
- `lot_no`: ロット単位。品質・入庫単位・追跡要件がある場合は分離する。

最小集計単位の候補は、`warehouse_code + project_no + part_no + location_code + pallet_code + lot_no` である。ただし、業務画面では warehouse / project / part / location などに roll-up して表示する可能性がある。

## Transaction Type Semantics

`inventory_transactions` の transaction type は、数量にどう影響するかを説明するための意味を持つ。

| Type | 集計上の意味 | 注意点 |
| --- | --- | --- |
| `IN` | 在庫を増やす入庫イベント | 入庫先の warehouse / location / pallet / lot に加算する |
| `OUT` | 在庫を減らす出庫イベント | 出庫元の warehouse / location / pallet / lot から減算する |
| `MOVE` | ある単位から別単位へ移動するイベント | source 側を減算し、destination 側を加算する意味を持つ |
| `ADJUST` | 棚卸・補正などによる調整イベント | 差分調整か絶対値調整かを semantics として明確にする必要がある |
| `CANCEL` | 既存 transaction の効果を取り消すイベント | 対象 transaction を削除せず、反対符号または取消関係として説明する |

`MOVE` は単一イベントとして保存されていても、集計意味としては「減算」と「加算」の 2 つの効果を持つ。trace / evidence では、同一移動イベントの source effect と destination effect を区別して説明できる必要がある。

## Quantity Sign Semantics

quantity sign は、transaction type と方向から導出される。

- `IN`: 正の増加として扱う。
- `OUT`: 負の減少として扱う。
- `MOVE source`: 負の減少として扱う。
- `MOVE destination`: 正の増加として扱う。
- `ADJUST`: 調整方式に応じて正または負の差分として扱う。
- `CANCEL`: 対象 transaction の集計効果を打ち消す符号として扱う。

保存されている quantity が常に正数であっても、集計時の signed quantity は transaction type / direction / cancel relation から決まる。保存値の符号と集計符号を混同しない。

## Current Quantity Calculation

current quantity は、集計単位ごとに signed quantity を合計した値として考える。

概念式:

```text
current_quantity(unit) =
  sum(signed_quantity(transaction_effects where transaction_effect.unit = unit))
```

ここでの `transaction_effects` は実装上のテーブルではなく、semantics review 上の説明単位である。特に `MOVE` は source effect と destination effect に分けて考える。

current quantity を説明するときは、以下を分ける。

- transaction history から導出した期待現在庫
- `inventory_current` に保存されている cache quantity
- compare projection が示す difference quantity
- evidence が示す confidence / limitation

## Zero Quantity Rows

zero quantity row は、数量が 0 になった集計単位を表示または保持するかの semantics である。

候補:

- 表示しない: 現在在庫がない単位として扱う。画面は簡潔になるが、過去の存在は別途 trace / audit で確認する。
- 表示する: 0 在庫を明示する。棚卸、監査、直近移動の確認に役立つが、現場では「在庫あり」と誤読されない wording が必要。
- cache には保持し、通常 UI では折りたたむ: compare / rebuild / audit では参照でき、日常画面ではノイズを減らす。

semantics としては、zero quantity は「存在しない」ではなく「対象集計単位の signed sum が 0」である。削除や correction を意味しない。

## Negative Quantity Semantics

negative quantity は、通常運用では避けるべき状態である。ただし、aggregation semantics では、負数が見えたときに何を意味するかを分けて扱う。

可能性:

- OUT / MOVE が IN を上回っている。
- transaction の順序、範囲、project / location / pallet 境界がずれている。
- source transaction が不足している。
- correction / cancel の表現が未整理である。
- `inventory_current` cache と transaction aggregation の反映タイミングがずれている。

negative quantity は、read-only integrity signal / review limitation として扱う。自動 correction、rebuild、replay、inventory_current 更新の開始条件ではない。

## Pallet 関連 Semantics

在庫集計は part 単位だけでなく、pallet 単位の状態とも関係する。

- `pallet_transactions`: パレットの入庫、移動、出庫、状態変更の履歴を説明する source。
- `pallet_units`: パレット現在状態の read model / projection。
- `pallet_item_links`: パレットと部品の関係を示す read model / link projection。

`inventory_transactions` と pallet 関連データの関係は、以下を分けて考える。

- 部品数量の truth は `inventory_transactions` から説明する。
- パレット単位の保管状態は `pallet_transactions` から説明する。
- パレットにどの部品が紐づくかは `pallet_item_links` の read model として見える。
- part quantity と pallet state が一致しない場合は、source of truth error と断定せず、cross-projection consistency / integrity limitation として扱う。

## Compare Projection との関係

compare projection は、transaction aggregation と cache / read model の差異を説明するための read-only 表示である。

比較対象:

- expected current quantity: `inventory_transactions` から導出する。
- cached current quantity: `inventory_current` に表示されている値。
- difference quantity: expected と cached の差。
- limitation: 集計単位、transaction completeness、pallet relation、trace availability など。

compare projection は差異を見せるが、compare execution を実行するものではない。差異は review / investigation / audit の入口であり、correction や rebuild の実行指示ではない。

## Rebuild との関係

rebuild は、`inventory_transactions` から `inventory_current` 相当の read model を再構成する考え方である。

この文書で整理するのは、rebuild 実装ではなく、rebuild が成立するために必要な semantics である。

必要な前提:

- transaction type の集計意味が定義されている。
- aggregation unit が明確である。
- quantity sign の扱いが明確である。
- cancel / adjust / move の関係が追跡できる。
- pallet / lot / project / location の境界が説明できる。
- zero / negative quantity の扱いが決まっている。

rebuild は実行機能ではなく、将来の設計前提として扱う。B32-01 では rebuild、replay、correction、inventory_current 更新を行わない。

## Audit / Trace / Evidence との関係

aggregation result は、数量だけでなく、なぜその数量になったかを説明できる必要がある。

確認観点:

- transaction id / trace id / request id をたどれるか。
- source transaction と cancel / adjust の関係を説明できるか。
- MOVE の source / destination effect を分けて説明できるか。
- pallet transaction / pallet item link との関係を説明できるか。
- aggregation unit の境界を説明できるか。
- evidence confidence と limitation を表示できるか。

audit / trace / evidence は reasoning visualization であり、execution ではない。証跡が存在しても correctness guarantee ではなく、証跡が不足していても自動修正の指示ではない。

## Aggregation Limitation

aggregation semantics には、次の limitation がある。

- transaction completeness が不足すると期待現在庫を確定できない。
- `ADJUST` が差分調整か絶対値調整か不明な場合、集計意味が曖昧になる。
- `CANCEL` の対象 transaction が追跡できない場合、取消効果を説明しにくい。
- `MOVE` の source / destination が不完全な場合、片側だけの数量変化に見える。
- `project_no` / `location_code` / `pallet_code` / `lot_no` が missing の場合、集計単位が粗くなる。
- pallet read model と part inventory read model の反映タイミングがずれる可能性がある。
- zero row の表示方針により、現場の読み方が変わる可能性がある。
- negative quantity は原因確定ではなく、review limitation として扱う必要がある。

limitation は dashboard / compare / integrity visualization で明示する。limitation の存在は、DB 更新、rebuild、replay、correction、API 実行の permission ではない。

## Non-Execution Boundary

B32-01 は semantics review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- correction 実装
- replay 実装

この文書は、将来実装前に meaning / limitation / evidence / trace / compare の前提をそろえるための参照資料である。
