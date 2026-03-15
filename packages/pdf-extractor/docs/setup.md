# セットアップ手順

このプロジェクトは **Python + Streamlit** を使用して動作します。

## 1. Python のインストール

Python 3.10 以上をインストールしてください。

確認:

    python --version

## 2. リポジトリを取得

    git clone https://github.com/<your-account>/pdf-layout-extractor.git
    cd pdf-layout-extractor

## 3. 仮想環境の作成

    python3 -m venv .venv

### Mac / Linux

    source .venv/bin/activate

### Windows

    .venv\Scripts\activate

## 4. 必要ライブラリのインストール

    pip install -r requirements.txt

## 5. アプリの起動

    streamlit run app.py

ブラウザが自動で開きます。

通常

    http://localhost:8501

でアクセスできます。
