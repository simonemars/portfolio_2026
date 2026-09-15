"""Takes a screenshot and imports it into Photos, leaving no temp file behind.

Standalone: has no dependency on this project's audio pipeline, so it runs
fine under plain system python3 from a Shortcuts "Run Shell Script" action
(see README for the one-time Shortcut setup).
"""

import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

_IMPORT_SCRIPT = """
on run argv
    set thePath to item 1 of argv
    set theFile to POSIX file thePath
    tell application "Photos"
        import theFile
    end tell
end run
"""


def capture_and_import():
    tmp_path = Path(tempfile.gettempdir()) / f"tap-screenshot-{uuid.uuid4().hex}.png"
    try:
        subprocess.run(["screencapture", "-x", str(tmp_path)], check=True)
        subprocess.run(["osascript", "-e", _IMPORT_SCRIPT, str(tmp_path)], check=True)
    finally:
        tmp_path.unlink(missing_ok=True)


if __name__ == "__main__":
    try:
        capture_and_import()
    except subprocess.CalledProcessError as e:
        print(f"screenshot_handler failed: {e}", file=sys.stderr)
        sys.exit(1)
