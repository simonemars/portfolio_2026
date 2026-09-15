"""Runs the audio capture pipeline for a fixed duration and reports whether
chunks arrived at a stable rate with no drift. Used to validate M1's
definition of done; also handy any time block_size or queue sizing changes.

Usage: python scripts/check_audio_stability.py [seconds]
"""

import sys
import time
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
from audio_capture import AudioCapture  # noqa: E402

CONFIG_PATH = Path(__file__).resolve().parent.parent / "config.yaml"


def main():
    duration_s = float(sys.argv[1]) if len(sys.argv) > 1 else 300
    with open(CONFIG_PATH) as f:
        audio_cfg = yaml.safe_load(f)["audio"]

    block_size_s = audio_cfg["block_size_ms"] / 1000
    expected_chunks = duration_s / block_size_s

    timestamps = []
    start = time.monotonic()
    print(f"Running for {duration_s:.0f}s, expecting ~{expected_chunks:.0f} chunks...")

    with AudioCapture(
        sample_rate=audio_cfg["sample_rate"],
        channels=audio_cfg["channels"],
        block_size_ms=audio_cfg["block_size_ms"],
    ) as cap:
        while time.monotonic() - start < duration_s:
            try:
                ts, _ = cap.get(timeout=1.0)
                timestamps.append(ts)
            except Exception:
                continue
        dropped = cap.dropped_count

    actual_duration = timestamps[-1] - timestamps[0]
    actual_chunks = len(timestamps)
    gaps = [b - a for a, b in zip(timestamps, timestamps[1:])]
    max_gap_ms = max(gaps) * 1000 if gaps else 0
    mean_gap_ms = (sum(gaps) / len(gaps)) * 1000 if gaps else 0
    drift_pct = ((actual_chunks / expected_chunks) - 1) * 100

    print(f"Actual chunks:      {actual_chunks}")
    print(f"Expected chunks:    {expected_chunks:.0f}")
    print(f"Drift:              {drift_pct:+.2f}%")
    print(f"Dropped (overflow): {dropped}")
    print(f"Mean inter-chunk gap: {mean_gap_ms:.2f} ms (target {audio_cfg['block_size_ms']} ms)")
    print(f"Max inter-chunk gap:  {max_gap_ms:.2f} ms")


if __name__ == "__main__":
    main()
