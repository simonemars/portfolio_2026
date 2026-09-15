"""Entry point: wires the capture -> detection -> counting -> action pipeline.

Prints live RMS energy, a marker whenever TapDetector confirms a qualifying
tap, and once TapCounter's grouping window closes on a pattern, dispatches
the configured Shortcut for that tap count (see config.yaml's actions:).

`--replay <file.wav>` runs the same detector/counter against a recorded
clip instead of the mic, so threshold changes in config.yaml can be
checked without live tapping every time (does not dispatch any action).
"""

import argparse
import queue
import signal
import sys
import time
from datetime import datetime
from pathlib import Path

import numpy as np
import yaml
from scipy.io import wavfile

from action_dispatcher import dispatch
from audio_capture import AudioCapture, rms
from tap_counter import TapCounter
from tap_detector import TapDetector, load_template

CONFIG_PATH = Path(__file__).resolve().parent.parent / "config.yaml"


class ShutdownRequested(Exception):
    pass


def _raise_shutdown(signum, frame):
    raise ShutdownRequested()


def load_config():
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)


def _log_line(text):
    """Event log line (tap/pattern/status). Always a real newline, since this
    also has to make sense in a log file when running headless under launchd."""
    if sys.stdout.isatty():
        print(f"\r{text}{' ' * 20}", flush=True)
    else:
        print(f"[{datetime.now().isoformat(timespec='seconds')}] {text}", flush=True)


def build_pipeline(config):
    audio_cfg = config["audio"]
    det_cfg = config["detection"]
    count_cfg = config["counting"]

    max_event_blocks = max(1, round(det_cfg["max_event_ms"] / audio_cfg["block_size_ms"]))
    detector = TapDetector(
        energy_threshold=det_cfg["energy_threshold"],
        max_event_blocks=max_event_blocks,
        min_similarity=det_cfg["min_template_similarity"],
        template=load_template(),
    )
    counter = TapCounter(
        refractory_s=count_cfg["refractory_ms"] / 1000,
        group_window_s=count_cfg["group_window_ms"] / 1000,
    )
    return detector, counter


def replay_file(path, config):
    """Feeds a recorded WAV file through the detector/counter block by block,
    using file-relative time as the clock, and prints what it finds. No audio
    capture, no action dispatch — just for checking config.yaml changes."""
    audio_cfg = config["audio"]
    sr, data = wavfile.read(path)
    if sr != audio_cfg["sample_rate"]:
        print(f"Warning: file sample rate {sr} != config sample_rate {audio_cfg['sample_rate']}")
    data = data.astype(np.float32)
    block_size = int(sr * audio_cfg["block_size_ms"] / 1000)

    detector, counter = build_pipeline(config)
    tap_count = 0
    n_blocks = len(data) // block_size
    for i in range(n_blocks):
        ts = i * audio_cfg["block_size_ms"] / 1000
        chunk = data[i * block_size : (i + 1) * block_size]
        if detector.process_chunk(chunk):
            tap_count += 1
            print(f"  block {i} (t={ts:.2f}s): TAP DETECTED (#{tap_count})")
            counter.on_tap(ts)
        pattern = counter.poll(ts)
        if pattern is not None:
            print(f"  block {i} (t={ts:.2f}s): PATTERN: {pattern} tap(s)")

    # flush any pattern still pending once the file ends
    final_ts = n_blocks * audio_cfg["block_size_ms"] / 1000 + config["counting"]["group_window_ms"] / 1000
    pattern = counter.poll(final_ts)
    if pattern is not None:
        print(f"  end of file: PATTERN: {pattern} tap(s)")

    if tap_count == 0:
        print(f"{path}: no taps detected")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--replay", metavar="FILE.wav", help="Replay a recorded clip instead of listening to the mic")
    args = parser.parse_args()

    config = load_config()

    if args.replay:
        replay_file(args.replay, config)
        return

    # NOTE: with an active sounddevice InputStream, plain KeyboardInterrupt
    # does not reliably propagate out of time.sleep() on this setup — an
    # explicit handler that raises is what actually works. Also handles
    # SIGTERM so a launchd-managed process (M5) stops cleanly too.
    signal.signal(signal.SIGINT, _raise_shutdown)
    signal.signal(signal.SIGTERM, _raise_shutdown)

    audio_cfg = config["audio"]
    detector, counter = build_pipeline(config)

    tap_count = 0
    interactive = sys.stdout.isatty()
    _log_line("Listening for mic input. Tap the chassis to test. Press Ctrl+C to stop.")
    try:
        with AudioCapture(
            sample_rate=audio_cfg["sample_rate"],
            channels=audio_cfg["channels"],
            block_size_ms=audio_cfg["block_size_ms"],
        ) as cap:
            while True:
                try:
                    ts, chunk = cap.get(timeout=0.1)
                except queue.Empty:
                    ts = None

                if ts is not None:
                    level = rms(chunk)
                    if detector.process_chunk(chunk):
                        tap_count += 1
                        _log_line(f">>> TAP DETECTED (#{tap_count}) <<<")
                        counter.on_tap(ts)
                    if interactive:
                        bar = "#" * int(level * 200)
                        print(f"\rRMS: {level:.4f} {bar:<40}", end="", flush=True)

                pattern = counter.poll(time.monotonic())
                if pattern is not None:
                    _log_line(f"### PATTERN: {pattern} tap(s) ###")
                    if not dispatch(pattern, config):
                        _log_line(f"    (no action configured for {pattern} tap(s))")
    except ShutdownRequested:
        _log_line("Stopped.")


if __name__ == "__main__":
    main()
