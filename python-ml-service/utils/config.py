"""
config.py
---------
Application-wide configuration loaded from environment variables (or a
``.env`` file in the service root via *python-dotenv*).
"""

import os

from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Load .env from the directory that contains this file's *parent*
# (i.e. the python-ml-service/ root).  ``find_dotenv`` is avoided on purpose
# so the lookup is explicit and predictable.
# ---------------------------------------------------------------------------
_SERVICE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(dotenv_path=os.path.join(_SERVICE_ROOT, ".env"))

# ---------------------------------------------------------------------------
# Exported settings
# ---------------------------------------------------------------------------
BOARD_MODEL_PATH: str = os.getenv(
    "BOARD_MODEL_PATH",
    os.path.join(_SERVICE_ROOT, "models", "boards.pt"),
)

PIECE_MODEL_PATH: str = os.getenv(
    "PIECE_MODEL_PATH",
    os.path.join(_SERVICE_ROOT, "models", "pieces.pt"),
)
