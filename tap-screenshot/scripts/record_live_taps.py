"""Captures tap samples through the SAME continuous streaming pipeline the
real listener uses (AudioCapture / sd.InputStream), instead of the one-off
sd.rec() calls in record_sample.py. This matters: a one-off short recording
and a long-running open stream can produce measurably different spectral
content for the same physical tap (seen in practice — recorded-clip taps
scored 0.90-0.98 similarity to each other, but taps captured live after the
stream had been open for a while scored only 0.65-0.77).

Runs for a fixed duration; whenever a block's energy crosses a generous
threshold (well below the final detection threshold, so it also catches
attenuated live taps), it saves a short window around that event as its own
WAV file, continuing the tap_NN.wav numbering already in tests/sample_audio/.

Usage: python scripts/record_live_taps.py [duration_seconds]
Tap the chassis several times, spread across the whole window (some early,
some later) so the captured set reflects steady-state streaming conditions,
not just the first few seconds.
"""

import sys
import time
from pathlib import Path

import numpy as np
import yaml
from scipy.io import wavfile

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
from audio_capture import AudioCapture, rms  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "config.yaml"
SAMPLE_DIR = ROOT / "tests" / "sample_audio"

CAPTURE_THRESHOLD_RATIO = 0.5  # fraction of the real energy_threshold; catch quieter/attenuated taps too
WINDOW_S = 1.0  # length of saved clip, centered on the event


def next_tap_number():
    existing = sorted(SAMPLE_DIR.glob("tap_*.wav"))
    numbers = []
    for p in existing:
        try:
            numbers.append(int(p.stem.split("_")[1]))
        except (IndexError, ValueError):
            continue
    return (max(numbers) + 1) if numbers else 1


def main():
    duration_s = float(sys.argv[1]) if len(sys.argv) > 1 else 60

    with open(CONFIG_PATH) as f:
        config = yaml.safe_load(f)
    audio_cfg = config["audio"]
    energy_threshold = config["detection"]["energy_threshold"] * CAPTURE_THRESHOLD_RATIO
    sample_rate = audio_cfg["sample_rate"]
    block_size = int(sample_rate * audio_cfg["block_size_ms"] / 1000)
    window_blocks = int(WINDOW_S * sample_rate / block_size)

    print(f"Capture threshold: {energy_threshold:.4f} (half the real detection threshold)")
    print(f"Recording for {duration_s:.0f}s via the live streaming pipeline.")
    print("Tap the chassis ~10-15 times, spread across the whole window (don't cluster them all at the start).")

    all_chunks = []
    event_center_indices = []
    in_event = False
    event_start = 0
    peak_r = 0.0
    peak_idx = 0

    with AudioCapture(
        sample_rate=sample_rate,
        channels=audio_cfg["channels"],
        block_size_ms=audio_cfg["block_size_ms"],
    ) as cap:
        start_time = time.monotonic()
        i = 0
        while time.monotonic() - start_time < duration_s:
            try:
                _, chunk = cap.get(timeout=0.5)
            except Exception:
                continue
            all_chunks.append(chunk)
            level = rms(chunk)

            if level > energy_threshold:
                if not in_event:
                    in_event = True
                    event_start = i
                    peak_r = level
                    peak_idx = i
                elif level > peak_r:
                    peak_r = level
                    peak_idx = i
            elif in_event:
                event_center_indices.append(peak_idx)
                print(f"  captured event at block {peak_idx} (peak_rms={peak_r:.4f})")
                in_event = False
            i += 1

    print(f"\n{len(event_center_indices)} event(s) captured. Saving clips...")

    full_audio = np.concatenate(all_chunks)
    next_n = next_tap_number()
    for center_idx in event_center_indices:
        center_sample = center_idx * block_size
        half_window = int(window_blocks * block_size / 2)
        start = max(0, center_sample - half_window)
        end = min(len(full_audio), center_sample + half_window)
        clip = full_audio[start:end]

        out_path = SAMPLE_DIR / f"tap_{next_n:02d}.wav"
        wavfile.write(out_path, sample_rate, clip)
        print(f"  saved {out_path}")
        next_n += 1


if __name__ == "__main__":
    main()
