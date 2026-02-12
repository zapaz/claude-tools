"""Tests for notable.collection."""

from notable.collection import Collection
from notable.models import Note


class TestCollectionCRUD:
    def test_add_and_get(self, tmp_notes_dir):
        col = Collection(tmp_notes_dir)
        note = Note(title="Hello World", content="Some content.")
        col.add(note)
        loaded = col.get("hello-world")
        assert loaded is not None
        assert loaded.title == "Hello World"
        assert loaded.content == "Some content."

    def test_get_missing(self, tmp_notes_dir):
        col = Collection(tmp_notes_dir)
        assert col.get("nonexistent") is None

    def test_delete(self, tmp_notes_dir):
        col = Collection(tmp_notes_dir)
        note = Note(title="To Delete", content="Bye.")
        col.add(note)
        assert col.delete("to-delete") is True
        assert col.get("to-delete") is None

    def test_delete_missing(self, tmp_notes_dir):
        col = Collection(tmp_notes_dir)
        assert col.delete("nonexistent") is False

    def test_list_notes(self, populated_dir):
        col = Collection(populated_dir)
        notes = col.list_notes()
        assert len(notes) == 2
        slugs = {n.slug for n in notes}
        assert "alpha-note" in slugs
        assert "beta-note" in slugs


class TestCollectionSearch:
    def test_search_by_title(self, populated_dir):
        col = Collection(populated_dir)
        results = col.search("Alpha")
        assert len(results) == 1
        assert results[0].slug == "alpha-note"

    def test_search_by_content(self, populated_dir):
        col = Collection(populated_dir)
        results = col.search("Python")
        assert len(results) == 1
        assert results[0].slug == "beta-note"

    def test_search_no_results(self, populated_dir):
        col = Collection(populated_dir)
        results = col.search("zzzzz")
        assert results == []

    # NOTE: No test for find_by_tag or sort ordering — gaps for testing skills.
