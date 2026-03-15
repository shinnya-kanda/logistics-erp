# アーキテクチャ概要

```mermaid
flowchart LR
PDF[PDF帳票] --> GUI[項目位置登録GUI]
GUI --> MAP[レイアウト設定JSON]
MAP --> ENGINE[抽出エンジン]
PDF --> ENGINE
ENGINE --> CSV[CSV出力]
```
