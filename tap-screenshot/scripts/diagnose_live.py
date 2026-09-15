"""Captures live audio for a fixed window and reports every energy event it
saw — pass or fail — with its duration and template similarity, so we can
see exactly why a live tap did or didn't register instead of guessing from
a fast-scrolling RMS display.

Usage: python scripts/diagnose_live.py [seconds]
"""

import sys
import time
from pathlib import Path

import numpy as np
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
from audio_capture import AudioCapture, rms  # noqa: E402
from tap_detector import load_template, normalized_spectrum  # noqa: E402

CONFIG_PATH = Path(__file__).resolve().parent.parent / "config.yaml"


def main():
    duration_s = float(sys.argv[1]) if len(sys.argv) > 1 else 15

    with open(CONFIG_PATH) as f:
        config = yaml.safe_load(f)
    audio_cfg = config["audio"]
    det_cfg = config["detection"]
    energy_threshold = det_cfg["energy_threshold"]
    max_event_blocks = max(1, round(det_cfg["max_event_ms"] / audio_cfg["block_size_ms"]))
    min_similarity = det_cfg["min_template_similarity"]
    template = load_template()

    print(f"Active thresholds: energy>{energy_threshold}, max_event_blocks={max_event_blocks}, min_similarity>={min_similarity}")
    print(f"Recording for {duration_s:.0f}s — tap the chassis a few times now...")

    all_rms = []
    events = []
    in_event = False
    start_i = 0
    peak_r = 0.0
    peak_chunk = None
    i = 0

    with AudioCapture(
        sample_rate=audio_cfg["sample_rate"],
        channels=audio_cfg["channels"],
        block_size_ms=audio_cfg["block_size_ms"],
    ) as cap:
        start_time = time.monotonic()
        while time.monotonic() - start_time < duration_s:
            try:
                _, chunk = cap.get(timeout=0.5)
            except Exception:
                continue
            level = rms(chunk)
            all_rms.append(level)

            if level > energy_threshold:
                if not in_event:
                    in_event = True
                    start_i = i
                    peak_r = level
                    peak_chunk = chunk
                elif level > peak_r:
                    peak_r = level
                    peak_chunk = chunk
            elif in_event:
                events.append((start_i, i - start_i, peak_r, peak_chunk))
                in_event = False
            i += 1

    print(f"\nCaptured {len(all_rms)} blocks. Max RMS seen: {max(all_rms):.4f}")
    print(f"Blocks above energy threshold ({energy_threshold}): {sum(1 for r in all_rms if r > energy_threshold)}")

    if not events:
        print("\nNo events ever crossed the energy threshold at all.")
        print("Top 5 loudest blocks:", sorted(all_rms, reverse=True)[:5])
        return

    print(f"\n{len(events)} energy event(s) detected (may include non-taps):")
    for start_i, dur_blocks, peak_r, peak_chunk in events:
        sim = float(np.dot(normalized_spectrum(peak_chunk), template))
        dur_ok = dur_blocks <= max_event_blocks
        sim_ok = sim >= min_similarity
        verdict = "PASS (would trigger a tap)" if (dur_ok and sim_ok) else "REJECTED"
        print(
            f"  block {start_i}: peak_rms={peak_r:.4f}, duration={dur_blocks} blocks "
            f"({'OK' if dur_ok else 'TOO LONG'}), similarity={sim:.3f} "
            f"({'OK' if sim_ok else 'TOO LOW'}) -> {verdict}"
        )


if __name__ == "__main__":
    main()
