#!/bin/bash
# Stops and removes the tap-screenshot launchd user agent.
set -euo pipefail

LABEL="com.tapscreenshot.agent"
PLIST_DEST="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"

launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
rm -f "$PLIST_DEST"

echo "Uninstalled $LABEL."
