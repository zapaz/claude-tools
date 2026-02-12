"""Note data model."""

from dataclasses import dataclass, field
from datetime import datetime

from .frontmatter import parse, serialize
from .utils import format_date, now, slugify


@dataclass
class Note:
    """A single Markdown note with metadata."""

    title: str
    content: str
    tags: list[str] = field(default_factory=list)
    created: datetime = field(default_factory=now)
    slug: str = ""

    def __post_init__(self):
        if not self.slug:
            self.slug = slugify(self.title)

    # BUG: Only compares slug, ignoring content and tags.
    # Two notes with the same title but different content will be considered equal.
    def __eq__(self, other):
        if not isinstance(other, Note):
            return NotImplemented
        return self.slug == other.slug

    def __hash__(self):
        return hash(self.slug)

    @classmethod
    def from_raw(cls, raw: str) -> "Note":
        """Parse a raw Markdown string (with frontmatter) into a Note."""
        metadata, content = parse(raw)
        created = metadata.get("created", now())
        if isinstance(created, str):
            created = datetime.fromisoformat(created)
        return cls(
            title=metadata.get("title", "Untitled"),
            content=content.strip(),
            tags=metadata.get("tags", []),
            created=created,
            slug=metadata.get("slug", ""),
        )

    def to_raw(self) -> str:
        """Serialize the note back to a Markdown string with frontmatter."""
        metadata = {
            "title": self.title,
            "slug": self.slug,
            "created": self.created.isoformat(),
            "tags": self.tags,
        }
        return serialize(metadata, self.content)
