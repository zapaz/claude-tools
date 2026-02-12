"""Notable — a Markdown note collection manager."""

__version__ = "0.1.0"

from .collection import Collection
from .models import Note

__all__ = ["Collection", "Note", "__version__"]
