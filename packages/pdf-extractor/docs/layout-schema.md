# レイアウトスキーマ

PDF Layout Extractor では、PDF 内の抽出位置を
**JSON形式のレイアウト定義**として保存します。

## 基本構造

``` json
{
  "fields": [
    {
      "field_name": "item_code",
      "page_index": 0,
      "x0": 100,
      "y0": 200,
      "x1": 300,
      "y1": 240,
      "mode": "text",
      "normalize": "raw"
    }
  ]
}
```

## 各項目の説明

  項目         説明
  ------------ -------------------------
  field_name   抽出する項目名
  page_index   対象ページ番号（0開始）
  x0,y0        左上座標
  x1,y1        右下座標
  mode         抽出方法（text など）
  normalize    データ整形方法

## normalize の例

  値     意味
  ------ --------------
  raw    そのまま取得
  int    数値のみ抽出
  date   日付整形

## 例（物流帳票）

``` json
{
  "fields":[
    {"field_name":"品番","page_index":0,"x0":100,"y0":150,"x1":300,"y1":200},
    {"field_name":"数量","page_index":0,"x0":400,"y0":150,"x1":480,"y1":200},
    {"field_name":"納期","page_index":0,"x0":100,"y0":250,"x1":300,"y1":300}
  ]
}
```
