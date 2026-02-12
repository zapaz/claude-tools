"""Utility functions for notable."""

import re
from datetime import datetime, timezone


def slugify(text: str) -> str:
    """Convert text to a URL-friendly slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def now() -> datetime:
    """Return the current UTC datetime."""
    return datetime.now(timezone.utc)


def format_date(dt: datetime) -> str:
    """Format a datetime as YYYY-MM-DD."""
    return dt.strftime("%Y-%m-%d")


def truncate(text: str, length: int = 80) -> str:
    """Truncate text to the given length, adding ellipsis if needed."""
    if len(text) <= length:
        return text
    return text[: length - 3] + "..."
