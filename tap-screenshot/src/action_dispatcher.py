"""Maps a tap-count pattern to a named macOS Shortcut and runs it.

Fire-and-forget (Popen, not run/wait): a Shortcut can take several seconds
(a cold Photos launch measured ~11s), and the tap listener must keep
processing audio while that happens rather than blocking on it.
"""

import subprocess


def dispatch(tap_count, config):
    shortcut_name = config.get("actions", {}).get(tap_count)
    if shortcut_name is None:
        return False
    subprocess.Popen(["shortcuts", "run", shortcut_name])
    return True
