#!/bin/bash
# Installs tap-screenshot as a launchd user agent: starts at login, restarts
# if it crashes (throttled to no more than once per 10s), runs headless.
#
# Renders scripts/com.tapscreenshot.agent.plist.template with this clone's
# actual paths (so this works regardless of where the repo lives or which
# user runs it) and installs the result.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LABEL="com.tapscreenshot.agent"
TEMPLATE="$REPO_ROOT/scripts/com.tapscreenshot.agent.plist.template"
PLIST_DEST="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"
PYTHON_PATH="$REPO_ROOT/.venv/bin/python"
MAIN_PY_PATH="$REPO_ROOT/src/main.py"

if [ ! -x "$PYTHON_PATH" ]; then
    echo "Error: $PYTHON_PATH not found. Run the venv setup in README.md first." >&2
    exit 1
fi

mkdir -p "$REPO_ROOT/logs"

sed -e "s|__LABEL__|$LABEL|g" \
    -e "s|__PYTHON_PATH__|$PYTHON_PATH|g" \
    -e "s|__MAIN_PY_PATH__|$MAIN_PY_PATH|g" \
    -e "s|__REPO_ROOT__|$REPO_ROOT|g" \
    "$TEMPLATE" > "$PLIST_DEST"

# Unload any previous instance first so this is safe to re-run after editing
# the plist or the code. launchd needs a moment to release the label after
# bootout, so bootstrap can transiently fail (I/O error) if retried too fast
# — retry a few times rather than guessing a fixed delay.
launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
for attempt in 1 2 3 4 5; do
    if launchctl bootstrap "$DOMAIN" "$PLIST_DEST" 2>/tmp/tapscreenshot_bootstrap_err; then
        break
    fi
    if [ "$attempt" -eq 5 ]; then
        cat /tmp/tapscreenshot_bootstrap_err >&2
        exit 1
    fi
    sleep 0.5
done
rm -f /tmp/tapscreenshot_bootstrap_err

echo "Installed and started $LABEL as a LaunchAgent."
echo "Logs: $REPO_ROOT/logs/stdout.log , $REPO_ROOT/logs/stderr.log"
echo "Check status: launchctl print $DOMAIN/$LABEL"
echo "Uninstall: scripts/uninstall_launchd.sh"
