"""Minimal Markdown-to-HTML renderer using regex."""

import re
from html import escape

from .models import Note


def render(markdown: str) -> str:
    """Convert a Markdown string to HTML."""
    lines = markdown.split("\n")
    html_parts = []
    in_code_block = False
    code_lines = []
    paragraph_lines = []

    def flush_paragraph():
        if paragraph_lines:
            text = " ".join(paragraph_lines)
            html_parts.append(f"<p>{_inline(text)}</p>")
            paragraph_lines.clear()

    for line in lines:
        # Code blocks
        if line.startswith("```"):
            if in_code_block:
                html_parts.append(f"<pre><code>{escape(chr(10).join(code_lines))}</code></pre>")
                code_lines.clear()
                in_code_block = False
            else:
                flush_paragraph()
                in_code_block = True
            continue

        if in_code_block:
            code_lines.append(line)
            continue

        stripped = line.strip()

        # Empty line ends a paragraph
        if not stripped:
            flush_paragraph()
            continue

        # Headings
        heading_match = re.match(r"^(#{1,6})\s+(.+)$", stripped)
        if heading_match:
            flush_paragraph()
            level = len(heading_match.group(1))
            text = heading_match.group(2)
            html_parts.append(f"<h{level}>{_inline(text)}</h{level}>")
            continue

        # Unordered list items
        list_match = re.match(r"^[-*]\s+(.+)$", stripped)
        if list_match:
            flush_paragraph()
            text = list_match.group(1)
            html_parts.append(f"<li>{_inline(text)}</li>")
            continue

        # Regular text — accumulate into paragraph
        paragraph_lines.append(stripped)

    flush_paragraph()

    # Close any unclosed code block
    if in_code_block and code_lines:
        html_parts.append(f"<pre><code>{escape(chr(10).join(code_lines))}</code></pre>")

    return "\n".join(html_parts)


def _inline(text: str) -> str:
    """Process inline Markdown formatting."""
    # Bold
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    # Italic
    text = re.sub(r"\*(.+?)\*", r"<em>\1</em>", text)
    # Inline code
    text = re.sub(r"`(.+?)`", r"<code>\1</code>", text)
    # Links
    text = re.sub(r"\[(.+?)\]\((.+?)\)", r'<a href="\2">\1</a>', text)
    return text


def render_note(note: Note) -> str:
    """Render a single note as a complete HTML section."""
    tag_html = ""
    if note.tags:
        tags = " ".join(f'<span class="tag">{escape(t)}</span>' for t in note.tags)
        tag_html = f'\n<div class="tags">{tags}</div>'
    return f"""<article>
<h1>{escape(note.title)}</h1>
<time>{note.created.strftime("%Y-%m-%d")}</time>{tag_html}
{render(note.content)}
</article>"""


def render_collection(notes: list[Note]) -> str:
    """Render a list of notes as a full HTML page."""
    body = "\n<hr>\n".join(render_note(n) for n in notes)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Notable</title>
<style>
body {{ font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; }}
article {{ margin: 2rem 0; }}
.tag {{ background: #e0e7ff; padding: 2px 8px; border-radius: 4px; font-size: 0.85em; margin-right: 4px; }}
pre {{ background: #f5f5f5; padding: 1rem; overflow-x: auto; border-radius: 4px; }}
code {{ font-size: 0.9em; }}
hr {{ border: none; border-top: 1px solid #ddd; margin: 2rem 0; }}
</style>
</head>
<body>
{body}
</body>
</html>"""
