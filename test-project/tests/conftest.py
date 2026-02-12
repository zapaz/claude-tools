"""Shared test fixtures for notable."""

import pytest
from pathlib import Path
from notable.models import Note
from notable.utils import now


SAMPLE_FRONTMATTER = """\
---
title: Test Note
slug: test-note
created: 2025-01-15T10:30:00+00:00
tags:
  - python
  - testing
---

This is the body of the test note.

It has **bold** and *italic* text.
"""

SAMPLE_NO_FRONTMATTER = """\
Just a plain Markdown file with no frontmatter.

## Section

Some content here.
"""


@pytest.fixture
def tmp_notes_dir(tmp_path):
    """Provide a temporary directory for notes."""
    d = tmp_path / "notes"
    d.mkdir()
    return d


@pytest.fixture
def sample_note():
    """Provide a sample Note instance."""
    return Note(
        title="Test Note",
        content="This is a test note.",
        tags=["python", "testing"],
    )


@pytest.fixture
def sample_note_raw():
    """Provide raw Markdown with frontmatter."""
    return SAMPLE_FRONTMATTER


@pytest.fixture
def populated_dir(tmp_notes_dir):
    """Provide a directory with two pre-written notes."""
    note1 = Note(title="Alpha Note", content="First note content.", tags=["alpha"])
    note2 = Note(title="Beta Note", content="Second note about Python.", tags=["beta", "python"])
    (tmp_notes_dir / f"{note1.slug}.md").write_text(note1.to_raw())
    (tmp_notes_dir / f"{note2.slug}.md").write_text(note2.to_raw())
    return tmp_notes_dir
