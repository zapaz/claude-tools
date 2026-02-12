"""Tests for notable.models."""

from notable.models import Note


class TestNoteConstruction:
    def test_auto_slug(self):
        note = Note(title="My First Note", content="Hello")
        assert note.slug == "my-first-note"

    def test_explicit_slug(self):
        note = Note(title="My Note", content="Hello", slug="custom-slug")
        assert note.slug == "custom-slug"

    def test_default_tags(self):
        note = Note(title="No Tags", content="Hello")
        assert note.tags == []

    def test_tags_preserved(self):
        note = Note(title="Tagged", content="Hello", tags=["a", "b"])
        assert note.tags == ["a", "b"]


class TestNoteRoundTrip:
    def test_to_raw_and_back(self, sample_note):
        raw = sample_note.to_raw()
        restored = Note.from_raw(raw)
        assert restored.title == sample_note.title
        assert restored.content == sample_note.content
        assert restored.tags == sample_note.tags

    def test_from_raw(self, sample_note_raw):
        note = Note.from_raw(sample_note_raw)
        assert note.title == "Test Note"
        assert note.slug == "test-note"
        assert "python" in note.tags
        assert "bold" in note.content

    # NOTE: No test for __eq__ behavior — a gap for testing code review skills.
