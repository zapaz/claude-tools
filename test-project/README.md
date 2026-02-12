# notable

A small, self-contained Markdown note collection manager. Designed as a test project for exercising Claude Code features like code editing, debugging, refactoring, adding tests, and code review.

## Quick start

```bash
cd test-project

# Run tests
python -m pytest

# Use the CLI
python -m notable --help
python -m notable --dir /tmp/notes add --title "Hello" --content "World"
python -m notable --dir /tmp/notes list
python -m notable --dir /tmp/notes search "Hello"
python -m notable --dir /tmp/notes export
```

## Features

- Markdown notes with YAML frontmatter metadata
- Tag-based organization and filtering
- Full-text search across titles and content
- HTML export with styling
- Zero external runtime dependencies (Python stdlib only)
