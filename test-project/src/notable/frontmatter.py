"""Hand-rolled YAML frontmatter parser and serializer.

Supports a minimal subset of YAML: simple key-value pairs and lists.
"""

import re


def parse(raw: str) -> tuple[dict, str]:
    """Parse a Markdown string with YAML frontmatter.

    Returns a tuple of (metadata dict, body content string).
    If no frontmatter is found, returns an empty dict and the full content.
    """
    if not raw.startswith("---"):
        return {}, raw

    parts = raw.split("---", 2)
    if len(parts) < 3:
        return {}, raw

    yaml_block = parts[1].strip()
    body = parts[2].strip()
    metadata = _parse_yaml(yaml_block)
    return metadata, body


def serialize(metadata: dict, body: str) -> str:
    """Serialize metadata and body into a Markdown string with frontmatter."""
    lines = ["---"]
    for key, value in metadata.items():
        if isinstance(value, list):
            lines.append(f"{key}:")
            for item in value:
                lines.append(f"  - {item}")
        else:
            lines.append(f"{key}: {value}")
    lines.append("---")
    lines.append("")
    lines.append(body)
    lines.append("")
    return "\n".join(lines)


def _parse_yaml(block: str) -> dict:
    """Parse a minimal YAML block into a dict.

    Handles:
    - Simple key: value pairs
    - List values (indented - items)

    LIMITATION: Does not handle quoted strings properly in lists.
    A tag like "machine learning" will be stored with the quotes included.
    """
    result = {}
    current_key = None
    current_list = None

    for line in block.splitlines():
        line_stripped = line.strip()
        if not line_stripped:
            continue

        # Check for list item
        list_match = re.match(r"^\s+-\s+(.+)$", line)
        if list_match and current_key:
            value = list_match.group(1).strip()
            # BUG: Does not strip quotes from list items.
            # "machine learning" stays as '"machine learning"' including the quotes.
            if current_list is None:
                current_list = []
            current_list.append(value)
            result[current_key] = current_list
            continue

        # Check for key: value pair
        kv_match = re.match(r"^(\w[\w-]*)\s*:\s*(.*)$", line_stripped)
        if kv_match:
            # Save any previous list
            current_key = kv_match.group(1)
            value = kv_match.group(2).strip()
            current_list = None

            if value:
                result[current_key] = value
            else:
                # Value might be a list on the next lines
                result[current_key] = []
                current_list = result[current_key]

    return result
