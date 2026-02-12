# notable

Markdown note collection manager. Stdlib-only Python library + CLI.

## Dev commands

```bash
# Run tests
python -m pytest

# Run tests with verbose output
python -m pytest -v

# Run a single test file
python -m pytest tests/test_models.py

# CLI help
python -m notable --help

# Add a note
python -m notable --dir /tmp/notes add --title "Test" --content "Hello"

# List notes
python -m notable --dir /tmp/notes list

# Lint (requires ruff in dev dependencies)
ruff check src/ tests/
```

## Architecture

```
src/notable/
├── __init__.py       # Package exports + version
├── models.py         # Note dataclass
├── frontmatter.py    # YAML frontmatter parser/serializer
├── collection.py     # File-system CRUD, search, tag filtering
├── renderer.py       # Markdown-to-HTML conversion
├── cli.py            # argparse CLI entry point
└── utils.py          # Slug generation, date helpers
```

**Data flow:** CLI (`cli.py`) -> Collection (`collection.py`) -> Note (`models.py`) + Frontmatter (`frontmatter.py`) -> Filesystem (`.md` files).

**Rendering:** Note -> `renderer.py` -> HTML string.

## Conventions

- Zero external runtime dependencies (stdlib only)
- `src/` layout with `pyproject.toml`
- Tests in `tests/` using pytest
- Type hints on all function signatures
- Notes stored as Markdown files with YAML frontmatter
