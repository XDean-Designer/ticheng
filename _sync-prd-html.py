# -*- coding: utf-8 -*-
"""Sync PRD-提成设置.md → PRD-提成设置.html (keep chrome + mermaid).

用法：
  python _sync-prd-html.py                                   # 默认：PRD-提成设置.md → .html
  python _sync-prd-html.py <src.md> <dst.html> [chrome.html] # 指定源 / 目标；chrome 缺省取目标自身
"""
import re
import sys
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parent
MD = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "PRD-提成设置.md"
HTML = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "PRD-提成设置.html"
# chrome 模板：保留顶栏 / 样式 / 脚本，只替换 <article> 内容
CHROME = Path(sys.argv[3]) if len(sys.argv) > 3 else HTML

md_text = MD.read_text(encoding="utf-8")

mermaid_blocks = []

def _save_mermaid(m):
    mermaid_blocks.append(m.group(1).rstrip("\n"))
    return f"@@MERMAID:{len(mermaid_blocks) - 1}@@"

md_text = re.sub(r"```mermaid\s*\n(.*?)```", _save_mermaid, md_text, flags=re.S)

body = markdown.markdown(
    md_text,
    extensions=["tables", "fenced_code", "sane_lists"],
)

def _restore_mermaid(m):
    idx = int(m.group(1))
    return '<div class="mermaid">\n' + mermaid_blocks[idx] + "\n</div>"

body = re.sub(r"@@MERMAID:(\d+)@@", _restore_mermaid, body)

html = CHROME.read_text(encoding="utf-8")

# chrome 与源文件不同名时，先把顶栏 / 标题 / 下载链接指向本文件的 .md
if MD.name != CHROME.stem + ".md":
    html = re.sub(r"<title>.*?</title>", f"<title>{MD.stem}（阅读预览）</title>", html, count=1)
    html = re.sub(
        r'(<div class="topbar__title">).*?(<span class="topbar__hint">).*?(</span></div>)',
        rf'\g<1>{MD.stem}\g<2>阅读预览\g<3>',
        html,
        count=1,
    )
    html = html.replace('href="PRD-提成设置.md"', f'href="{MD.name}"')

# keep topbar + wrap open, replace article inner, keep foot-note + scripts
m = re.search(
    r'(<div class="wrap"><article class="article">)([\s\S]*?)(</article></div>)',
    html,
)
if not m:
    raise SystemExit("article shell not found")

foot = (
    '<p class="foot-note">给 AI / 研发请使用同目录 <code>' + MD.name + '</code>；'
    "本页仅作阅读预览。交互以本目录 <code>index.html</code> 为准。</p>\n"
)
new_article = m.group(1) + "\n" + body + "\n" + foot + m.group(3)
html = html[: m.start()] + new_article + html[m.end() :]
HTML.write_text(html, encoding="utf-8")
print("synced", MD.name, "->", HTML.name, "mermaid blocks:", len(mermaid_blocks), "body chars:", len(body))
