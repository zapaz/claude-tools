"""Tests for notable.frontmatter."""

from notable.frontmatter import parse, serialize


class TestParse:
    def test_basic_frontmatter(self):
        raw = "---\ntitle: Hello\nslug: hello\n---\n\nBody text."
        meta, body = parse(raw)
        assert meta["title"] == "Hello"
        assert meta["slug"] == "hello"
        assert body == "Body text."

    def test_no_frontmatter(self):
        raw = "Just plain text."
        meta, body = parse(raw)
        assert meta == {}
        assert body == "Just plain text."

    def test_list_values(self):
        raw = "---\ntitle: Test\ntags:\n  - alpha\n  - beta\n---\n\nContent."
        meta, body = parse(raw)
        assert meta["tags"] == ["alpha", "beta"]

    def test_empty_body(self):
        raw = "---\ntitle: Empty\n---\n"
        meta, body = parse(raw)
        assert meta["title"] == "Empty"
        assert body == ""

    # NOTE: No test for quoted strings in lists — a gap for testing debug skills.
    # A tag like "machine learning" in YAML would not be handled correctly.


class TestSerialize:
    def test_round_trip(self):
        meta = {"title": "Round Trip", "tags": ["a", "b"]}
        body = "Some content."
        raw = serialize(meta, body)
        meta2, body2 = parse(raw)
        assert meta2["title"] == "Round Trip"
        assert meta2["tags"] == ["a", "b"]
        assert body2 == "Some content."

    def test_scalar_values(self):
        meta = {"title": "Scalars", "created": "2025-01-01"}
        raw = serialize(meta, "Body")
        assert "title: Scalars" in raw
        assert "created: 2025-01-01" in raw
