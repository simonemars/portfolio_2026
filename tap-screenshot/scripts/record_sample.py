"""Records a short mic clip at the project's configured sample rate and saves
it as a WAV file, for building the tests/sample_audio/ set used in M2.

Usage: python scripts/record_sample.py <output_path.wav> [duration_seconds]
"""

import sys
import time
from pathlib import Path

import numpy as np
import sounddevice as sd
import yaml
from scipy.io import wavfile

CONFIG_PATH = Path(__file__).resolve().parent.parent / "config.yaml"


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/record_sample.py <output_path.wav> [duration_seconds]")
        sys.exit(1)

    output_path = Path(sys.argv[1])
    duration_s = float(sys.argv[2]) if len(sys.argv) > 2 else 2.5

    with open(CONFIG_PATH) as f:
        audio_cfg = yaml.safe_load(f)["audio"]
    sample_rate = audio_cfg["sample_rate"]

    output_path.parent.mkdir(parents=True, exist_ok=True)

    for n in (3, 2, 1):
        print(n, flush=True)
        time.sleep(1)
    print("RECORDING...", flush=True)

    recording = sd.rec(
        int(duration_s * sample_rate), samplerate=sample_rate, channels=1, dtype="float32"
    )
    sd.wait()

    print("done.", flush=True)
    wavfile.write(output_path, sample_rate, recording)
    print(f"Saved {duration_s:.1f}s to {output_path}")


if __name__ == "__main__":
    main()
