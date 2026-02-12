"""Tests for notable.renderer."""

from notable.renderer import render, render_note
from notable.models import Note


class TestRender:
    def test_heading(self):
        assert "<h1>Hello</h1>" in render("# Hello")

    def test_heading_levels(self):
        assert "<h2>Sub</h2>" in render("## Sub")
        assert "<h3>Deep</h3>" in render("### Deep")

    def test_paragraph(self):
        html = render("A simple paragraph.")
        assert "<p>A simple paragraph.</p>" in html

    def test_bold(self):
        html = render("Some **bold** text.")
        assert "<strong>bold</strong>" in html

    def test_italic(self):
        html = render("Some *italic* text.")
        assert "<em>italic</em>" in html

    def test_inline_code(self):
        html = render("Use `print()` here.")
        assert "<code>print()</code>" in html

    def test_unordered_list(self):
        html = render("- Item one\n- Item two")
        assert "<li>Item one</li>" in html
        assert "<li>Item two</li>" in html

    def test_link(self):
        html = render("[Click](https://example.com)")
        assert '<a href="https://example.com">Click</a>' in html

    # NOTE: No test for code blocks — a gap for testing skills.


class TestRenderNote:
    def test_renders_title(self):
        note = Note(title="My Note", content="Hello **world**.")
        html = render_note(note)
        assert "<h1>My Note</h1>" in html
        assert "<strong>world</strong>" in html

    def test_renders_tags(self):
        note = Note(title="Tagged", content="Body.", tags=["python", "test"])
        html = render_note(note)
        assert "python" in html
        assert "test" in html
        assert "tag" in html

    # NOTE: No test for render_collection — a gap for testing skills.
