"""Allow running notable as: python -m notable"""

import sys

from .cli import main

sys.exit(main())
