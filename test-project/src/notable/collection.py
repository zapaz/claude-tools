"""Note collection manager with file-system persistence."""

from pathlib import Path

from .models import Note


class Collection:
    """Manages a directory of Markdown note files."""

    def __init__(self, directory: str | Path):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)

    def _note_path(self, slug: str) -> Path:
        return self.directory / f"{slug}.md"

    def add(self, note: Note) -> Path:
        """Save a note to disk. Overwrites if the slug already exists."""
        path = self._note_path(note.slug)
        path.write_text(note.to_raw())
        return path

    def get(self, slug: str) -> Note | None:
        """Load a single note by slug. Returns None if not found."""
        path = self._note_path(slug)
        if not path.exists():
            return None
        return Note.from_raw(path.read_text())

    def delete(self, slug: str) -> bool:
        """Delete a note by slug. Returns True if the file existed."""
        path = self._note_path(slug)
        if path.exists():
            path.unlink()
            return True
        return False

    def list_notes(self) -> list[Note]:
        """Return all notes in the collection, sorted by creation date (newest first)."""
        notes = []
        for path in sorted(self.directory.glob("*.md")):
            try:
                notes.append(Note.from_raw(path.read_text()))
            except Exception:
                continue
        return sorted(notes, key=lambda n: n.created, reverse=True)

    def search(self, query: str) -> list[Note]:
        """Search notes by title and content (case-insensitive).

        NOTE: Re-reads all files from disk on every call. No caching.
        For a collection with many notes, this is inefficient.
        """
        query_lower = query.lower()
        results = []
        for path in self.directory.glob("*.md"):
            try:
                note = Note.from_raw(path.read_text())
            except Exception:
                continue
            if query_lower in note.title.lower() or query_lower in note.content.lower():
                results.append(note)
        return results

    def find_by_tag(self, tag: str) -> list[Note]:
        """Find all notes with the given tag.

        NOTE: Also re-reads all files from disk on every call.
        """
        tag_lower = tag.lower()
        results = []
        for path in self.directory.glob("*.md"):
            try:
                note = Note.from_raw(path.read_text())
            except Exception:
                continue
            if any(t.lower() == tag_lower for t in note.tags):
                results.append(note)
        return results
