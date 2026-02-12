---
title: Python Tips
slug: python-tips
created: 2025-01-10T12:00:00+00:00
tags:
  - python
  - programming
---

A collection of useful Python tips.

## List Comprehensions

Use list comprehensions for concise transformations:

```python
squares = [x**2 for x in range(10)]
```

## F-strings

Format strings with embedded expressions:

```python
name = "world"
print(f"Hello, {name}!")
```

## Pathlib

Prefer `pathlib.Path` over `os.path` for file operations:

```python
from pathlib import Path
config = Path.home() / ".config" / "myapp"
config.mkdir(parents=True, exist_ok=True)
```
