"""Builds the reference tap spectrum from tests/sample_audio/tap_*.wav and
saves it to src/tap_template.npz for tap_detector.py to load at runtime.

Re-run this any time sample clips are added/changed, or block_size_ms in
config.yaml changes (the template is tied to that block size).
"""

import glob
from pathlib import Path

import numpy as np
import yaml
from scipy.fft import rfft
from scipy.io import wavfile

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "config.yaml"
TEMPLATE_PATH = ROOT / "src" / "tap_template.npz"


def rms(x):
    return float(np.sqrt(np.mean(np.square(x))))


def peak_chunk(path, block_size):
    sr, data = wavfile.read(path)
    data = data.astype(np.float32)
    n_blocks = len(data) // block_size
    energies = [rms(data[i * block_size : (i + 1) * block_size]) for i in range(n_blocks)]
    peak_idx = int(np.argmax(energies))
    return data[peak_idx * block_size : (peak_idx + 1) * block_size], sr


def normalized_spectrum(chunk):
    spec = np.abs(rfft(chunk))
    return spec / (np.linalg.norm(spec) + 1e-9)


def build_template(config):
    """Returns (template, n_clips_used). Raises ValueError if no tap clips exist."""
    audio_cfg = config["audio"]
    sample_rate = audio_cfg["sample_rate"]
    block_size = int(sample_rate * audio_cfg["block_size_ms"] / 1000)

    tap_files = sorted(glob.glob(str(ROOT / "tests" / "sample_audio" / "tap_*.wav")))
    if not tap_files:
        raise ValueError("No tap_*.wav files found in tests/sample_audio/")

    spectra = []
    for f in tap_files:
        chunk, sr = peak_chunk(f, block_size)
        if sr != sample_rate:
            raise ValueError(f"{f} sample rate {sr} != config sample_rate {sample_rate}")
        spectra.append(normalized_spectrum(chunk))

    template = np.mean(spectra, axis=0)
    template = template / (np.linalg.norm(template) + 1e-9)

    np.savez(TEMPLATE_PATH, template=template, sample_rate=sample_rate, block_size=block_size)
    return template, len(tap_files)


def main():
    with open(CONFIG_PATH) as f:
        config = yaml.safe_load(f)
    try:
        _, n = build_template(config)
    except ValueError as e:
        raise SystemExit(str(e))
    print(f"Built template from {n} tap clips -> {TEMPLATE_PATH}")


if __name__ == "__main__":
    main()
