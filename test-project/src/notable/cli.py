"""Command-line interface for notable."""

import argparse
import sys
from pathlib import Path

from .collection import Collection
from .models import Note
from .renderer import render_collection
from .utils import truncate


DEFAULT_DIR = Path.home() / ".notable"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="notable",
        description="A Markdown note collection manager.",
    )
    parser.add_argument(
        "--dir",
        type=Path,
        default=DEFAULT_DIR,
        help=f"Notes directory (default: {DEFAULT_DIR})",
    )
    subparsers = parser.add_subparsers(dest="command")

    # add
    add_parser = subparsers.add_parser("add", help="Add a new note")
    add_parser.add_argument("--title", required=True, help="Note title")
    add_parser.add_argument("--content", required=True, help="Note content (Markdown)")
    add_parser.add_argument("--tags", nargs="*", default=[], help="Tags for the note")

    # list
    subparsers.add_parser("list", help="List all notes")

    # show
    show_parser = subparsers.add_parser("show", help="Show a note")
    show_parser.add_argument("slug", help="Note slug")

    # search
    search_parser = subparsers.add_parser("search", help="Search notes")
    search_parser.add_argument("query", help="Search query")

    # delete
    delete_parser = subparsers.add_parser("delete", help="Delete a note")
    delete_parser.add_argument("slug", help="Note slug")

    # export
    export_parser = subparsers.add_parser("export", help="Export notes as HTML")
    export_parser.add_argument(
        "-o", "--output", type=Path, default=None, help="Output file (default: stdout)"
    )

    args = parser.parse_args(argv)
    collection = Collection(args.dir)

    if args.command == "add":
        note = Note(title=args.title, content=args.content, tags=args.tags)
        path = collection.add(note)
        print(f"Created: {path}")
        return 0

    if args.command == "list":
        notes = collection.list_notes()
        if not notes:
            print("No notes found.")
            return 0
        for note in notes:
            tags = f" [{', '.join(note.tags)}]" if note.tags else ""
            print(f"  {note.slug:<30} {truncate(note.title, 40)}{tags}")
        return 0

    if args.command == "show":
        note = collection.get(args.slug)
        if not note:
            print(f"Note not found: {args.slug}", file=sys.stderr)
            return 1
        print(f"# {note.title}")
        print(f"Created: {note.created.strftime('%Y-%m-%d')}")
        if note.tags:
            print(f"Tags: {', '.join(note.tags)}")
        print()
        print(note.content)
        return 0

    if args.command == "search":
        results = collection.search(args.query)
        if not results:
            print("No matching notes.")
            return 0
        for note in results:
            print(f"  {note.slug:<30} {truncate(note.title, 40)}")
        return 0

    if args.command == "delete":
        if collection.delete(args.slug):
            print(f"Deleted: {args.slug}")
            return 0
        print(f"Note not found: {args.slug}", file=sys.stderr)
        return 1

    if args.command == "export":
        notes = collection.list_notes()
        html = render_collection(notes)
        if args.output:
            args.output.write_text(html)
            print(f"Exported to: {args.output}")
        else:
            print(html)
        return 0

    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
