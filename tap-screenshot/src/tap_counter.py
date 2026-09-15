"""Groups raw tap events (from TapDetector) into single/double/triple
patterns.

Two windows, both measured from confirmed-tap timestamps (monotonic
seconds), not audio blocks:
- refractory: a tap arriving this soon after the last counted tap is
  treated as the same physical tap's decay/ringing, not a new tap.
- group_window: once a tap is counted, if no further tap arrives within
  this window, the pending count is finalized and emitted.
"""


class TapCounter:
    def __init__(self, refractory_s, group_window_s):
        self.refractory_s = refractory_s
        self.group_window_s = group_window_s
        self._pending_count = 0
        self._last_tap_time = None
        self._group_deadline = None

    def on_tap(self, timestamp):
        """Call when TapDetector confirms a tap. Returns True if it counted
        (False if suppressed by the refractory window)."""
        if self._last_tap_time is not None and (timestamp - self._last_tap_time) < self.refractory_s:
            return False
        self._last_tap_time = timestamp
        self._pending_count += 1
        self._group_deadline = timestamp + self.group_window_s
        return True

    def poll(self, now):
        """Call periodically with the current monotonic time. Returns the
        finalized tap count once the group window has elapsed since the
        last tap, else None."""
        if self._pending_count > 0 and now >= self._group_deadline:
            count = self._pending_count
            self._pending_count = 0
            self._group_deadline = None
            return count
        return None
