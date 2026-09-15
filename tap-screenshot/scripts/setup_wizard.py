"""Guided first-run setup: records your own tap/typing/talking/other samples
through the same live streaming pipeline the real listener uses, builds the
tap template, evaluates it, and walks you through the two manual steps
(a macOS Shortcut, and optionally installing the launchd background agent).

Detection is tuned per-machine (mic, typing sound, room) rather than shipped
as a one-size-fits-all model — recording your own short sample set here is
the normal first-run step, not an optional extra.

Usage: python scripts/setup_wizard.py
"""

import subprocess
import sys
import time
from pathlib import Path

import numpy as np
import yaml
from scipy.io import wavfile

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from audio_capture import AudioCapture, rms  # noqa: E402
from build_tap_template import build_template  # noqa: E402
from evaluate_detector import evaluate, print_report  # noqa: E402
from tap_detector import load_template  # noqa: E402

CONFIG_PATH = ROOT / "config.yaml"
SAMPLE_DIR = ROOT / "tests" / "sample_audio"
TAP_CAPTURE_THRESHOLD_RATIO = 0.5  # fraction of the real energy_threshold, to also catch quieter taps
TAP_CLIP_WINDOW_S = 1.0

CATEGORY_PROMPTS = {
    "typing": "type normally, like you would while working",
    "talking": "talk normally (read a sentence out loud, or just chat)",
    "other": "make a distinct non-tap noise: a door closing, setting a mug down, a mouse click, a pen drop",
}
CATEGORY_DURATIONS = {"typing": 5, "talking": 5, "other": 3}
CATEGORY_COUNTS = {"typing": 5, "talking": 5, "other": 5}


def load_config():
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)


def next_number(prefix):
    existing = sorted(SAMPLE_DIR.glob(f"{prefix}_*.wav"))
    numbers = []
    for p in existing:
        try:
            numbers.append(int(p.stem.split("_")[1]))
        except (IndexError, ValueError):
            continue
    return (max(numbers) + 1) if numbers else 1


def countdown(seconds=3):
    for n in range(seconds, 0, -1):
        print(n, flush=True)
        time.sleep(1)


def record_stream(duration_s, config):
    """Records via the real streaming pipeline for duration_s and returns the
    concatenated samples plus the sample rate."""
    audio_cfg = config["audio"]
    chunks = []
    with AudioCapture(
        sample_rate=audio_cfg["sample_rate"],
        channels=audio_cfg["channels"],
        block_size_ms=audio_cfg["block_size_ms"],
    ) as cap:
        start = time.monotonic()
        while time.monotonic() - start < duration_s:
            try:
                _, chunk = cap.get(timeout=0.5)
            except Exception:
                continue
            chunks.append(chunk)
    return np.concatenate(chunks), audio_cfg["sample_rate"]


def record_category_clips(category, config):
    prompt = CATEGORY_PROMPTS[category]
    duration = CATEGORY_DURATIONS[category]
    count = CATEGORY_COUNTS[category]
    print(f"\n--- Recording {count} '{category}' clip(s), {duration}s each ---")
    print(f"When it says RECORDING, {prompt}.")
    n = next_number(category)
    for i in range(count):
        input(f"\nClip {i + 1}/{count} — press Enter when ready...")
        countdown(2)
        print("RECORDING...", flush=True)
        samples, sr = record_stream(duration, config)
        print("done.")
        out_path = SAMPLE_DIR / f"{category}_{n:02d}.wav"
        wavfile.write(out_path, sr, samples)
        print(f"  saved {out_path}")
        n += 1


def record_taps(config):
    duration_s = 60
    audio_cfg = config["audio"]
    energy_threshold = config["detection"]["energy_threshold"] * TAP_CAPTURE_THRESHOLD_RATIO
    sample_rate = audio_cfg["sample_rate"]
    block_size = int(sample_rate * audio_cfg["block_size_ms"] / 1000)
    window_blocks = int(TAP_CLIP_WINDOW_S * sample_rate / block_size)

    print("\n--- Recording taps ---")
    print(f"For the next {duration_s}s, tap the chassis ~15-20 times, spread across the")
    print("whole window (some early, some later) — vary knuckle/fingertip, soft/firm,")
    print("and different spots. Don't cluster them all at the start.")
    input("Press Enter when ready...")
    countdown(3)
    print("RECORDING — tap now.", flush=True)

    all_chunks = []
    event_center_indices = []
    in_event = False
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
                    peak_r = level
                    peak_idx = i
                elif level > peak_r:
                    peak_r = level
                    peak_idx = i
            elif in_event:
                event_center_indices.append(peak_idx)
                print(f"  captured tap at block {peak_idx} (peak_rms={peak_r:.4f})")
                in_event = False
            i += 1

    print(f"\n{len(event_center_indices)} tap(s) captured.")
    full_audio = np.concatenate(all_chunks)
    n = next_number("tap")
    for center_idx in event_center_indices:
        center_sample = center_idx * block_size
        half_window = int(window_blocks * block_size / 2)
        start = max(0, center_sample - half_window)
        end = min(len(full_audio), center_sample + half_window)
        clip = full_audio[start:end]
        out_path = SAMPLE_DIR / f"tap_{n:02d}.wav"
        wavfile.write(out_path, sample_rate, clip)
        n += 1
    return len(event_center_indices)


def setup_shortcut():
    script_path = ROOT / "src" / "screenshot_handler.py"
    print("\n--- One-time manual step: the 'Screenshot To Photos' Shortcut ---")
    print("This has to be built once in the Shortcuts app (by design — so what a tap")
    print("does can be changed later without touching code):")
    print("  1. Open the Shortcuts app.")
    print("  2. Click + for a new shortcut, name it exactly: Screenshot To Photos")
    print("  3. Add a 'Run Shell Script' action, set Shell to /bin/zsh.")
    print("  4. Paste this as the script content:")
    print(f"\n     /usr/bin/python3 {script_path}\n")
    print("  5. Close the shortcut editor (it saves automatically).")
    input("Press Enter once you've done this...")

    result = subprocess.run(["shortcuts", "list"], capture_output=True, text=True)
    if "Screenshot To Photos" in result.stdout:
        print("Confirmed: 'Screenshot To Photos' shortcut found.")
        return True
    print("Didn't find 'Screenshot To Photos' in `shortcuts list` — check the name matches exactly.")
    return False


def offer_launchd_install():
    answer = input("\nInstall the background launchd agent now? It will start the listener\n"
                    "immediately and auto-start it at every login. [y/N] ").strip().lower()
    if answer == "y":
        subprocess.run(["bash", str(ROOT / "scripts" / "install_launchd.sh")], check=True)
    else:
        print("Skipped. Run scripts/install_launchd.sh yourself whenever you're ready.")


def main():
    print("tap-screenshot setup wizard")
    print("=" * 40)
    print("This records a short sample set through your own mic, on your own")
    print("machine, so detection is calibrated for your hardware and typing/talk")
    print("sound rather than someone else's.\n")

    config = load_config()

    record_taps(config)
    for category in ("typing", "talking", "other"):
        record_category_clips(category, config)

    print("\n--- Building tap template ---")
    try:
        _, n = build_template(config)
        print(f"Built template from {n} tap clips.")
    except ValueError as e:
        print(f"Could not build template: {e}")
        return

    print("\n--- Evaluating ---")
    template = load_template()
    results = evaluate(config, template)
    print_report(config, results)

    any_miss = any(r["misses"] for r in results.values())
    if any_miss:
        print("\nSome clips aren't classified correctly yet. You can re-run this wizard")
        print("(it adds new clips rather than replacing old ones) or record more of the")
        print("failing category with scripts/record_live_taps.py, then re-run")
        print("scripts/build_tap_template.py and scripts/evaluate_detector.py.")

    shortcut_ok = setup_shortcut()
    if shortcut_ok:
        offer_launchd_install()

    print("\nSetup complete. Run `python src/main.py` to try it live.")


if __name__ == "__main__":
    main()
