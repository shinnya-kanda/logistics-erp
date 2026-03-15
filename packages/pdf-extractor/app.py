import io
import json
import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Tuple, Optional

import fitz  # PyMuPDF
import pandas as pd
import streamlit as st
from PIL import Image, ImageDraw

st.set_page_config(page_title="PDF Layout Extractor", layout="wide")

# =========================================================
# 設定
# =========================================================
CONFIG_DIR = Path("config")
CONFIG_DIR.mkdir(exist_ok=True)

SCHEMA_DIR = CONFIG_DIR / "schemas"
SCHEMA_DIR.mkdir(exist_ok=True)

DEFAULT_SCHEMA_NAME = "default"
DEFAULT_LAYOUT_PATH = SCHEMA_DIR / f"{DEFAULT_SCHEMA_NAME}.json"

SECTION_ORDER = [
    "left_genpin",
    "left_nouhin",
    "left_juryou",
    "right_genpin",
    "right_nouhin",
    "right_juryou",
]

SECTION_LABELS = {
    "left_genpin": "左上",
    "left_nouhin": "左中",
    "left_juryou": "左下",
    "right_genpin": "右上",
    "right_nouhin": "右中",
    "right_juryou": "右下",
}


# =========================================================
# データ構造
# =========================================================
@dataclass
class FieldArea:
    field_name: str
    page_index: int
    x0: float
    y0: float
    x1: float
    y1: float
    mode: str = "text"
    normalize: str = "raw"
    section_name: str = ""


# =========================================================
# 共通関数
# =========================================================
def clean_text(value: str, normalize: str) -> str:
    value = (value or "").replace("\n", " ").replace("\r", " ")
    value = re.sub(r"\s+", " ", value).strip()

    if normalize == "int":
        return re.sub(r"[^0-9-]", "", value)

    if normalize == "date":
        value = value.replace("年", "/").replace("月", "/").replace("日", "")
        value = re.sub(r"[.\-]", "/", value)
        return value

    return value


def sanitize_schema_name(name: str) -> str:
    name = (name or "").strip()
    name = re.sub(r'[\\/:*?"<>|]+', "_", name)
    name = re.sub(r"\s+", "_", name)
    return name


def schema_path(schema_name: str) -> Path:
    safe_name = sanitize_schema_name(schema_name)
    if not safe_name:
        safe_name = DEFAULT_SCHEMA_NAME
    return SCHEMA_DIR / f"{safe_name}.json"


def list_schema_names() -> List[str]:
    names = [p.stem for p in SCHEMA_DIR.glob("*.json")]
    names = sorted(set(names))
    if DEFAULT_SCHEMA_NAME not in names:
        names.insert(0, DEFAULT_SCHEMA_NAME)
    return names


def load_layout(path: Path) -> List[FieldArea]:
    if not path.exists():
        return []

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    fields = []
    for row in data.get("fields", []):
        row.setdefault("section_name", "")
        row.setdefault("mode", "text")
        row.setdefault("normalize", "raw")
        fields.append(FieldArea(**row))
    return fields


def save_layout(path: Path, fields: List[FieldArea], schema_name: str = "") -> None:
    data = {
        "schema_name": schema_name,
        "fields": [asdict(x) for x in fields],
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def open_pdf(pdf_bytes: bytes) -> fitz.Document:
    return fitz.open(stream=pdf_bytes, filetype="pdf")


def page_count(pdf_bytes: bytes) -> int:
    doc = open_pdf(pdf_bytes)
    return len(doc)


def render_page_image(
    pdf_bytes: bytes,
    page_index: int,
    scale: float = 1.2,
) -> Tuple[Image.Image, fitz.Rect]:
    doc = open_pdf(pdf_bytes)
    page = doc[page_index]
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    return img, page.rect


def get_page_rect(pdf_bytes: bytes, page_index: int = 0) -> fitz.Rect:
    doc = open_pdf(pdf_bytes)
    return doc[page_index].rect


def section_label(section_name: str) -> str:
    return SECTION_LABELS.get(section_name, section_name)


def get_fixed_sections(page_rect: fitz.Rect) -> Dict[str, fitz.Rect]:
    """
    A4横前提:
      左右2列 × 上から 現品票・納品書・受領書 の3段
    """
    width = float(page_rect.width)
    height = float(page_rect.height)

    half_w = width / 2.0
    third_h = height / 3.0

    return {
        "left_genpin": fitz.Rect(0, 0, half_w, third_h),
        "left_nouhin": fitz.Rect(0, third_h, half_w, third_h * 2),
        "left_juryou": fitz.Rect(0, third_h * 2, half_w, height),
        "right_genpin": fitz.Rect(half_w, 0, width, third_h),
        "right_nouhin": fitz.Rect(half_w, third_h, width, third_h * 2),
        "right_juryou": fitz.Rect(half_w, third_h * 2, width, height),
    }


def draw_sections_on_image(
    img: Image.Image,
    page_rect: fitz.Rect,
    scale: float,
    fields: Optional[List[FieldArea]] = None,
    highlight_rect: Optional[Tuple[float, float, float, float]] = None,
) -> Image.Image:
    out = img.copy()
    draw = ImageDraw.Draw(out)

    sections = get_fixed_sections(page_rect)

    for sec_name in SECTION_ORDER:
        rect = sections[sec_name]
        x0 = rect.x0 * scale
        y0 = rect.y0 * scale
        x1 = rect.x1 * scale
        y1 = rect.y1 * scale

        draw.rectangle([x0, y0, x1, y1], outline="blue", width=3)
        draw.text((x0 + 8, y0 + 8), section_label(sec_name), fill="blue")

    if fields:
        for f in fields:
            draw.rectangle(
                [f.x0 * scale, f.y0 * scale, f.x1 * scale, f.y1 * scale],
                outline="red",
                width=2,
            )
            draw.text((f.x0 * scale + 4, f.y0 * scale + 4), f.field_name, fill="red")

    if highlight_rect:
        x0, y0, x1, y1 = highlight_rect
        draw.rectangle(
            [x0 * scale, y0 * scale, x1 * scale, y1 * scale],
            outline="green",
            width=4,
        )

    return out


def extract_words_in_rect(
    pdf_bytes: bytes,
    page_index: int,
    rect: fitz.Rect,
) -> List[Tuple[float, float, float, float, str]]:
    doc = open_pdf(pdf_bytes)
    page = doc[page_index]
    words = page.get_text("words", clip=rect)

    items = []
    for w in words:
        items.append((float(w[0]), float(w[1]), float(w[2]), float(w[3]), str(w[4])))
    return items


def group_words_to_lines(
    words: List[Tuple[float, float, float, float, str]],
    y_tolerance: float = 4.0,
) -> List[List[Tuple[float, float, float, float, str]]]:
    if not words:
        return []

    words_sorted = sorted(words, key=lambda x: (round(x[1], 1), x[0]))
    grouped = []
    current = [words_sorted[0]]

    for w in words_sorted[1:]:
        prev_y = current[-1][1]
        if abs(w[1] - prev_y) <= y_tolerance:
            current.append(w)
        else:
            grouped.append(current)
            current = [w]
    grouped.append(current)
    return grouped


def split_line_into_chunks(
    line_words: List[Tuple[float, float, float, float, str]],
    x_gap_threshold: float = 14.0,
) -> List[List[Tuple[float, float, float, float, str]]]:
    if not line_words:
        return []

    line_words = sorted(line_words, key=lambda x: x[0])
    chunks = []
    current = [line_words[0]]

    for w in line_words[1:]:
        prev = current[-1]
        gap = float(w[0]) - float(prev[2])

        if gap > x_gap_threshold:
            chunks.append(current)
            current = [w]
        else:
            current.append(w)

    chunks.append(current)
    return chunks


def words_group_to_record(words_group: List[Tuple[float, float, float, float, str]], idx: int) -> Dict:
    words_group = sorted(words_group, key=lambda x: x[0])
    text = " ".join([w[4] for w in words_group]).strip()
    x0 = min(w[0] for w in words_group)
    y0 = min(w[1] for w in words_group)
    x1 = max(w[2] for w in words_group)
    y1 = max(w[3] for w in words_group)

    return {
        "candidate_index": idx,
        "text": text,
        "x0": round(x0, 2),
        "y0": round(y0, 2),
        "x1": round(x1, 2),
        "y1": round(y1, 2),
    }


def build_candidates(
    words: List[Tuple[float, float, float, float, str]],
    candidate_mode: str,
    y_tolerance: float,
    x_gap_threshold: float,
) -> List[Dict]:
    candidates = []

    if not words:
        return candidates

    if candidate_mode == "word":
        for idx, w in enumerate(sorted(words, key=lambda x: (x[1], x[0]))):
            candidates.append(
                {
                    "candidate_index": idx,
                    "text": w[4],
                    "x0": round(float(w[0]), 2),
                    "y0": round(float(w[1]), 2),
                    "x1": round(float(w[2]), 2),
                    "y1": round(float(w[3]), 2),
                }
            )
        return candidates

    line_groups = group_words_to_lines(words, y_tolerance=y_tolerance)

    if candidate_mode == "line":
        for idx, line_words in enumerate(line_groups):
            candidates.append(words_group_to_record(line_words, idx))
        return candidates

    if candidate_mode == "chunk":
        idx = 0
        for line_words in line_groups:
            chunks = split_line_into_chunks(line_words, x_gap_threshold=x_gap_threshold)
            for chunk_words in chunks:
                candidates.append(words_group_to_record(chunk_words, idx))
                idx += 1
        return candidates

    return candidates


def union_candidate_rect(
    candidates_df: pd.DataFrame,
    indices: List[int],
) -> Optional[Tuple[float, float, float, float]]:
    if candidates_df.empty or not indices:
        return None

    target = candidates_df[candidates_df["candidate_index"].isin(indices)]
    if target.empty:
        return None

    x0 = float(target["x0"].min())
    y0 = float(target["y0"].min())
    x1 = float(target["x1"].max())
    y1 = float(target["y1"].max())
    return (x0, y0, x1, y1)


def extract_text_from_area(pdf_bytes: bytes, area: FieldArea) -> str:
    doc = open_pdf(pdf_bytes)
    page = doc[area.page_index]
    rect = fitz.Rect(area.x0, area.y0, area.x1, area.y1)
    text = page.get_text("text", clip=rect)
    return clean_text(text, area.normalize)


def detect_side_from_field(field: FieldArea, page_rect: fitz.Rect) -> str:
    """
    section_name があればそれを優先。
    なければ x座標の中心で left/right を判定。
    """
    if field.section_name.startswith("left_"):
        return "left"
    if field.section_name.startswith("right_"):
        return "right"

    center_x = (float(field.x0) + float(field.x1)) / 2.0
    return "left" if center_x < (float(page_rect.width) / 2.0) else "right"


def has_any_value(row: Dict, field_names: List[str]) -> bool:
    for name in field_names:
        value = row.get(name, "")
        if value is not None and str(value).strip() != "":
            return True
    return False


def extract_all_fields(
    pdf_bytes: bytes,
    fields: List[FieldArea],
    same_layout_all_pages: bool = True,
) -> pd.DataFrame:
    """
    修正版:
    1ページにつき 1行 ではなく、
    1ページにつき 左1行・右1行 の最大2行を作る。
    """
    doc = open_pdf(pdf_bytes)
    rows = []

    if not fields:
        return pd.DataFrame()

    unique_field_names = []
    for f in fields:
        if f.field_name not in unique_field_names:
            unique_field_names.append(f.field_name)

    if same_layout_all_pages:
        base_fields = fields

        for pidx in range(len(doc)):
            page_rect = doc[pidx].rect

            side_rows = {
                "left": {
                    "page_index": pidx,
                    "record_no": pidx * 2 + 1,
                    "page_side": "left",
                    "page_side_label": "左",
                },
                "right": {
                    "page_index": pidx,
                    "record_no": pidx * 2 + 2,
                    "page_side": "right",
                    "page_side_label": "右",
                },
            }

            for field in base_fields:
                cloned = FieldArea(
                    field_name=field.field_name,
                    page_index=pidx,
                    x0=field.x0,
                    y0=field.y0,
                    x1=field.x1,
                    y1=field.y1,
                    mode=field.mode,
                    normalize=field.normalize,
                    section_name=field.section_name,
                )
                value = extract_text_from_area(pdf_bytes, cloned)
                side = detect_side_from_field(cloned, page_rect)
                side_rows[side][cloned.field_name] = value

            for side in ["left", "right"]:
                for fname in unique_field_names:
                    side_rows[side].setdefault(fname, "")

                if has_any_value(side_rows[side], unique_field_names):
                    rows.append(side_rows[side])

    else:
        by_page = {}
        for field in fields:
            by_page.setdefault(field.page_index, []).append(field)

        for pidx, page_fields in sorted(by_page.items()):
            if pidx >= len(doc):
                continue

            page_rect = doc[pidx].rect

            side_rows = {
                "left": {
                    "page_index": pidx,
                    "record_no": pidx * 2 + 1,
                    "page_side": "left",
                    "page_side_label": "左",
                },
                "right": {
                    "page_index": pidx,
                    "record_no": pidx * 2 + 2,
                    "page_side": "right",
                    "page_side_label": "右",
                },
            }

            for field in page_fields:
                value = extract_text_from_area(pdf_bytes, field)
                side = detect_side_from_field(field, page_rect)
                side_rows[side][field.field_name] = value

            for side in ["left", "right"]:
                for fname in unique_field_names:
                    side_rows[side].setdefault(fname, "")

                if has_any_value(side_rows[side], unique_field_names):
                    rows.append(side_rows[side])

    df = pd.DataFrame(rows)

    if df.empty:
        return df

    ordered_cols = ["record_no", "page_index", "page_side", "page_side_label"] + unique_field_names
    existing_cols = [c for c in ordered_cols if c in df.columns]
    other_cols = [c for c in df.columns if c not in existing_cols]
    df = df[existing_cols + other_cols]

    return df


def format_field_table(fields: List[FieldArea]) -> pd.DataFrame:
    rows = []
    for i, f in enumerate(fields):
        rows.append(
            {
                "index": i,
                "field_name": f.field_name,
                "section_name": section_label(f.section_name) if f.section_name else "",
                "page_index": f.page_index,
                "x0": round(f.x0, 2),
                "y0": round(f.y0, 2),
                "x1": round(f.x1, 2),
                "y1": round(f.y1, 2),
                "mode": f.mode,
                "normalize": f.normalize,
            }
        )
    return pd.DataFrame(rows)


# =========================================================
# セッション初期化
# =========================================================
def init_state() -> None:
    if "fields" not in st.session_state:
        st.session_state.fields = load_layout(DEFAULT_LAYOUT_PATH)
    if "render_scale" not in st.session_state:
        st.session_state.render_scale = 1.2
    if "selected_section" not in st.session_state:
        st.session_state.selected_section = "left_genpin"
    if "candidate_rect" not in st.session_state:
        st.session_state.candidate_rect = None
    if "current_schema_name" not in st.session_state:
        st.session_state.current_schema_name = DEFAULT_SCHEMA_NAME
    if "extract_schema_name" not in st.session_state:
        st.session_state.extract_schema_name = DEFAULT_SCHEMA_NAME


init_state()


# =========================================================
# サイドバー
# =========================================================
with st.sidebar:
    st.header("設定")

    render_scale = st.slider(
        "プレビュー倍率",
        min_value=0.8,
        max_value=3.0,
        value=float(st.session_state.render_scale),
        step=0.2,
    )
    st.session_state.render_scale = render_scale

    same_layout_all_pages = st.checkbox("全ページを同じレイアウトで抽出", value=True)

    st.divider()
    st.subheader("スキーマ保存先")
    st.code(str(SCHEMA_DIR))

    schema_names_sidebar = list_schema_names()
    current_sidebar_index = (
        schema_names_sidebar.index(st.session_state.current_schema_name)
        if st.session_state.current_schema_name in schema_names_sidebar
        else 0
    )

    selected_sidebar_schema = st.selectbox(
        "編集対象スキーマ",
        options=schema_names_sidebar,
        index=current_sidebar_index,
        key="sidebar_schema_selector",
    )

    col_sb1, col_sb2 = st.columns(2)
    with col_sb1:
        if st.button("スキーマ読込", use_container_width=True):
            st.session_state.current_schema_name = selected_sidebar_schema
            st.session_state.fields = load_layout(schema_path(selected_sidebar_schema))
            st.session_state.candidate_rect = None
            st.success(f"読込しました: {selected_sidebar_schema}")
            st.rerun()

    with col_sb2:
        if st.button("再読込", use_container_width=True):
            st.session_state.fields = load_layout(schema_path(st.session_state.current_schema_name))
            st.session_state.candidate_rect = None
            st.success(f"再読込しました: {st.session_state.current_schema_name}")
            st.rerun()


# =========================================================
# メイン
# =========================================================
st.title("PDF Layout Extractor")
st.caption("1ページ目を2列×3段で自動分割し、細かく区切った文字列候補から項目を登録できます。抽出時は使用スキーマを選択できます。")

tab1, tab2 = st.tabs(["レイアウト登録", "抽出・CSV出力"])


# =========================================================
# タブ1: レイアウト登録
# =========================================================
with tab1:
    st.subheader("1ページ目を自動分割して項目登録")

    st.markdown("### スキーマ管理")

    schema_names_tab1 = list_schema_names()
    current_tab1_index = (
        schema_names_tab1.index(st.session_state.current_schema_name)
        if st.session_state.current_schema_name in schema_names_tab1
        else 0
    )

    col_schema1, col_schema2, col_schema3 = st.columns([1.3, 1.2, 1.2])

    with col_schema1:
        selected_schema_for_edit = st.selectbox(
            "編集中のスキーマ",
            options=schema_names_tab1,
            index=current_tab1_index,
            key="tab1_schema_selector",
        )

    with col_schema2:
        if st.button("このスキーマを読込", use_container_width=True):
            st.session_state.current_schema_name = selected_schema_for_edit
            st.session_state.fields = load_layout(schema_path(selected_schema_for_edit))
            st.session_state.candidate_rect = None
            st.success(f"読込しました: {selected_schema_for_edit}")
            st.rerun()

    with col_schema3:
        if st.button("現在のスキーマを保存", use_container_width=True):
            save_layout(
                schema_path(st.session_state.current_schema_name),
                st.session_state.fields,
                schema_name=st.session_state.current_schema_name,
            )
            st.success(f"保存しました: {st.session_state.current_schema_name}")

    col_schema4, col_schema5 = st.columns([2.0, 1.0])

    with col_schema4:
        new_schema_name = st.text_input(
            "新しいスキーマ名",
            value=st.session_state.current_schema_name,
            placeholder="例: bridgestone / komatsu / supplier_a",
            key="new_schema_name_input",
        )

    with col_schema5:
        if st.button("名前を付けて保存", use_container_width=True):
            safe_name = sanitize_schema_name(new_schema_name)
            if not safe_name:
                st.error("スキーマ名を入力してください。")
            else:
                save_layout(
                    schema_path(safe_name),
                    st.session_state.fields,
                    schema_name=safe_name,
                )
                st.session_state.current_schema_name = safe_name
                st.success(f"保存しました: {safe_name}")
                st.rerun()

    st.caption(f"現在編集中: {st.session_state.current_schema_name}")

    uploaded_pdf = st.file_uploader("PDFを選択", type=["pdf"], key="pdf_layout_uploader")

    if uploaded_pdf is not None:
        pdf_bytes = uploaded_pdf.read()
        total_pages = page_count(pdf_bytes)

        if total_pages == 0:
            st.error("PDFにページがありません。")
        else:
            page_index = 0
            page_rect = get_page_rect(pdf_bytes, page_index)
            sections = get_fixed_sections(page_rect)

            c1, c2 = st.columns([1.35, 1.65])

            with c1:
                st.markdown("## 1ページ目プレビュー")
                img, _ = render_page_image(
                    pdf_bytes=pdf_bytes,
                    page_index=0,
                    scale=render_scale,
                )

                preview = draw_sections_on_image(
                    img=img,
                    page_rect=page_rect,
                    scale=render_scale,
                    fields=st.session_state.fields,
                    highlight_rect=st.session_state.candidate_rect,
                )
                st.image(preview)

                st.info(
                    "固定分割：左/右 × 上から3段\n\n"
                    f"ページサイズ: 幅={round(page_rect.width, 1)}, 高さ={round(page_rect.height, 1)}"
                )

            with c2:
                st.markdown("## 1. 読み取り対象エリアを選択")

                selected_section = st.selectbox(
                    "エリア",
                    options=SECTION_ORDER,
                    index=SECTION_ORDER.index(st.session_state.selected_section)
                    if st.session_state.selected_section in SECTION_ORDER else 0,
                    format_func=lambda sec: section_label(sec),
                    key="section_select_fixed",
                )
                st.session_state.selected_section = selected_section

                selected_rect = sections[selected_section]

                st.caption(
                    f"選択エリア座標: x0={selected_rect.x0:.2f}, y0={selected_rect.y0:.2f}, "
                    f"x1={selected_rect.x1:.2f}, y1={selected_rect.y1:.2f}"
                )

                st.markdown("## 2. 区切り方を設定")

                col_cfg1, col_cfg2, col_cfg3 = st.columns(3)

                with col_cfg1:
                    candidate_mode = st.selectbox(
                        "候補の粒度",
                        options=["chunk", "word", "line"],
                        format_func=lambda x: {
                            "chunk": "中区切り",
                            "word": "単語単位",
                            "line": "行単位",
                        }[x],
                        index=0,
                    )

                with col_cfg2:
                    y_tolerance = st.slider(
                        "縦のまとめ幅",
                        min_value=1.0,
                        max_value=10.0,
                        value=4.0,
                        step=0.5,
                    )

                with col_cfg3:
                    x_gap_threshold = st.slider(
                        "横の分割しきい値",
                        min_value=4.0,
                        max_value=40.0,
                        value=14.0,
                        step=1.0,
                    )

                st.caption(
                    "おすすめは中区切りです。"
                    " より細かくしたいときは単語単位、粗くしたいときは行単位を選んでください。"
                )

                st.markdown("## 3. エリア内の文字列候補を読み取り")

                words = extract_words_in_rect(pdf_bytes, 0, selected_rect)
                candidates = build_candidates(
                    words=words,
                    candidate_mode=candidate_mode,
                    y_tolerance=y_tolerance,
                    x_gap_threshold=x_gap_threshold,
                )
                candidates_df = pd.DataFrame(candidates)

                if candidates_df.empty:
                    st.warning("このエリアでは文字列を取得できませんでした。")
                    st.session_state.candidate_rect = None
                else:
                    st.dataframe(candidates_df, use_container_width=True, hide_index=True)

                    candidate_options = candidates_df["candidate_index"].tolist()

                    selected_candidates = st.multiselect(
                        "項目にしたい候補を選択（複数選択可）",
                        options=candidate_options,
                        format_func=lambda idx: f"{idx}: {candidates_df.loc[candidates_df['candidate_index'] == idx, 'text'].values[0]}",
                        key=f"multiselect_{selected_section}_{candidate_mode}",
                    )

                    if selected_candidates:
                        candidate_rect = union_candidate_rect(candidates_df, selected_candidates)
                        st.session_state.candidate_rect = candidate_rect

                        if candidate_rect is not None:
                            x0, y0, x1, y1 = candidate_rect
                            st.success(
                                f"候補矩形: x0={x0:.2f}, y0={y0:.2f}, x1={x1:.2f}, y1={y1:.2f}"
                            )

                            preview_text = extract_text_from_area(
                                pdf_bytes,
                                FieldArea(
                                    field_name="preview",
                                    page_index=0,
                                    x0=x0,
                                    y0=y0,
                                    x1=x1,
                                    y1=y1,
                                    mode="text",
                                    normalize="raw",
                                    section_name=selected_section,
                                ),
                            )
                            st.text_area("候補範囲の抽出プレビュー", value=preview_text, height=100)

                            st.markdown("## 4. カラムとして登録")
                            field_name = st.text_input(
                                "項目名",
                                placeholder="例: 品番 / 品名 / 納入数 / 指定納入日 / 発行No",
                                key="field_name_input_new",
                            )
                            mode = st.selectbox("mode", options=["text"], key="mode_input_new")
                            normalize = st.selectbox(
                                "normalize",
                                options=["raw", "int", "date"],
                                key="normalize_input_new",
                            )

                            if st.button("この候補矩形を項目として追加", use_container_width=True):
                                if not field_name.strip():
                                    st.error("項目名を入力してください。")
                                else:
                                    st.session_state.fields.append(
                                        FieldArea(
                                            field_name=field_name.strip(),
                                            page_index=0,
                                            x0=float(x0),
                                            y0=float(y0),
                                            x1=float(x1),
                                            y1=float(y1),
                                            mode=mode,
                                            normalize=normalize,
                                            section_name=selected_section,
                                        )
                                    )
                                    st.session_state.candidate_rect = None
                                    st.success("項目を追加しました。")
                                    st.rerun()
                    else:
                        st.session_state.candidate_rect = None
                        st.caption("複数候補をまとめて1項目にできます。")

                st.divider()
                st.markdown("## 登録済み項目")

                field_df = format_field_table(st.session_state.fields)
                if field_df.empty:
                    st.write("まだ項目はありません。")
                else:
                    st.dataframe(field_df, use_container_width=True, hide_index=True)

                    delete_index = st.number_input(
                        "削除する index",
                        min_value=0,
                        max_value=max(len(st.session_state.fields) - 1, 0),
                        value=0,
                        step=1,
                    )

                    col_del1, col_del2 = st.columns(2)
                    with col_del1:
                        if st.button("選択項目を削除", use_container_width=True):
                            if 0 <= delete_index < len(st.session_state.fields):
                                deleted = st.session_state.fields.pop(delete_index)
                                st.success(f"削除しました: {deleted.field_name}")
                                st.rerun()
                    with col_del2:
                        if st.button("全項目クリア", use_container_width=True):
                            st.session_state.fields = []
                            st.session_state.candidate_rect = None
                            st.success("全項目をクリアしました")
                            st.rerun()

                st.divider()
                download_schema_name = sanitize_schema_name(st.session_state.current_schema_name) or DEFAULT_SCHEMA_NAME
                json_text = json.dumps(
                    {
                        "schema_name": download_schema_name,
                        "fields": [asdict(f) for f in st.session_state.fields],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                st.download_button(
                    "現在スキーマをJSONダウンロード",
                    data=json_text.encode("utf-8"),
                    file_name=f"{download_schema_name}.json",
                    mime="application/json",
                    use_container_width=True,
                )


# =========================================================
# タブ2: 抽出・CSV出力
# =========================================================
with tab2:
    st.subheader("登録済みスキーマで抽出")

    schema_names_extract = list_schema_names()
    extract_index = (
        schema_names_extract.index(st.session_state.extract_schema_name)
        if st.session_state.extract_schema_name in schema_names_extract
        else 0
    )

    selected_extract_schema = st.selectbox(
        "使用するスキーマ",
        options=schema_names_extract,
        index=extract_index,
        key="extract_schema_selector",
    )
    st.session_state.extract_schema_name = selected_extract_schema

    extract_fields = load_layout(schema_path(selected_extract_schema))

    st.caption(f"選択中スキーマ: {selected_extract_schema}")

    if extract_fields:
        st.dataframe(format_field_table(extract_fields), use_container_width=True, hide_index=True)
    else:
        st.warning("このスキーマには項目が登録されていません。")

    uploaded_pdf_extract = st.file_uploader(
        "抽出対象PDFを選択",
        type=["pdf"],
        key="pdf_extract_uploader",
    )

    if uploaded_pdf_extract is not None:
        pdf_bytes_extract = uploaded_pdf_extract.read()

        if not extract_fields:
            st.warning("先にレイアウト登録で項目を追加してスキーマ保存してください。")
        else:
            if st.button("抽出実行", type="primary"):
                df = extract_all_fields(
                    pdf_bytes=pdf_bytes_extract,
                    fields=extract_fields,
                    same_layout_all_pages=same_layout_all_pages,
                )

                if df.empty:
                    st.warning("抽出結果が空です。")
                else:
                    st.success("抽出完了")
                    st.dataframe(df, use_container_width=True)

                    csv_bytes = df.to_csv(index=False).encode("utf-8-sig")
                    st.download_button(
                        "CSVダウンロード",
                        data=csv_bytes,
                        file_name=f"extracted_{selected_extract_schema}.csv",
                        mime="text/csv",
                    )

                    st.divider()
                    st.markdown("### プレビュー抽出結果")
                    st.code(df.to_csv(index=False), language="csv")
