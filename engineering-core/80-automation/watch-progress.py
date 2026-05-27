#!/usr/bin/env python3
"""Poll the repo and keep dashboard data fresh."""

from __future__ import annotations

import subprocess
import time
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
GENERATOR = SCRIPT_DIR / "generate-progress.py"


def main() -> int:
    print("Watching repo activity. Press Ctrl+C to stop.")
    while True:
        subprocess.run(["python3", str(GENERATOR)], check=False)
        time.sleep(5)


if __name__ == "__main__":
    raise SystemExit(main())
