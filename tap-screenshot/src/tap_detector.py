"""Streaming tap detection: energy threshold -> transient duration check ->
spectral shape match against a reference tap template.

Feed it one audio chunk at a time (same block size the stream is running
at); it returns True on the block where a qualifying tap event just ended.
"""

from pathlib import Path

import numpy as np
from scipy.fft import rfft

DEFAULT_TEMPLATE_PATH = Path(__file__).resolve().parent / "tap_template.npz"


def rms(chunk):
    return float(np.sqrt(np.mean(np.square(chunk))))


def normalized_spectrum(chunk):
    spec = np.abs(rfft(chunk))
    return spec / (np.linalg.norm(spec) + 1e-9)


def load_template(path=DEFAULT_TEMPLATE_PATH):
    if not Path(path).exists():
        raise FileNotFoundError(
            f"{path} not found. Run `python scripts/setup_wizard.py` first "
            "(or scripts/build_tap_template.py if you've already recorded samples)."
        )
    data = np.load(path)
    return data["template"]


class TapDetector:
    def __init__(self, energy_threshold, max_event_blocks, min_similarity, template):
        self.energy_threshold = energy_threshold
        self.max_event_blocks = max_event_blocks
        self.min_similarity = min_similarity
        self.template = template

        self._in_event = False
        self._blocks_in_event = 0
        self._peak_rms = 0.0
        self._peak_chunk = None

    def process_chunk(self, chunk):
        """Returns True if this chunk closes out a qualifying tap event."""
        level = rms(chunk)
        detected = False

        if level > self.energy_threshold:
            if not self._in_event:
                self._in_event = True
                self._blocks_in_event = 0
                self._peak_rms = level
                self._peak_chunk = chunk
            self._blocks_in_event += 1
            if level > self._peak_rms:
                self._peak_rms = level
                self._peak_chunk = chunk
        elif self._in_event:
            detected = self._evaluate_event()
            self._in_event = False

        return detected

    def _evaluate_event(self):
        if self._blocks_in_event > self.max_event_blocks:
            return False
        similarity = float(np.dot(normalized_spectrum(self._peak_chunk), self.template))
        return similarity >= self.min_similarity
