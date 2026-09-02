# -*- coding: utf-8 -*-
"""Sync PRD-提成设置.md → PRD-提成设置.html (keep chrome + mermaid)."""
import re
from pathlib import Path

import markdown

ROOT = Path(r"d:\RTB打补丁工程\提成设置")
MD = ROOT / "PRD-提成设置.md"
HTML = ROOT / "PRD-提成设置.html"

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

html = HTML.read_text(encoding="utf-8")
# keep topbar + wrap open, replace article inner, keep foot-note + scripts
m = re.search(
    r'(<div class="wrap"><article class="article">)([\s\S]*?)(</article></div>)',
    html,
)
if not m:
    raise SystemExit("article shell not found")

foot = (
    '<p class="foot-note">给 AI / 研发请使用同目录 <code>PRD-提成设置.md</code>；'
    "本页仅作阅读预览。交互以本目录 <code>index.html</code> 为准。</p>\n"
)
new_article = m.group(1) + "\n" + body + "\n" + foot + m.group(3)
html = html[: m.start()] + new_article + html[m.end() :]
HTML.write_text(html, encoding="utf-8")
print("synced html, mermaid blocks:", len(mermaid_blocks), "body chars:", len(body))
