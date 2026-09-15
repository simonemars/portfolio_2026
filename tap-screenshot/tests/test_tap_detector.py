"""Regression test: replays every clip in sample_audio/ through TapDetector,
block by block (as the real pipeline would), and checks it classifies each
one as expected. Sample clips are personal (recorded via
scripts/setup_wizard.py) and not shipped in the repo — see README.md. These
tests skip (not fail) when no clips exist yet for a category, since a fresh
clone has none until the wizard is run.

Tap recall is allowed a small miss margin (MIN_TAP_RECALL) rather than
requiring 100%: raising min_template_similarity to cut real-world false
positives is a deliberate precision/recall trade-off, and it can validly
cost the odd borderline tap. Non-tap categories require zero misses —
a false-triggered screenshot is the failure mode users actually notice.
"""

import glob
import sys
import unittest
from pathlib import Path

import numpy as np
import yaml
from scipy.io import wavfile

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from tap_detector import TapDetector, load_template  # noqa: E402

SAMPLE_DIR = ROOT / "tests" / "sample_audio"
MIN_TAP_RECALL = 0.85


def run_detector(path, config, template):
    sr, data = wavfile.read(path)
    assert sr == config["audio"]["sample_rate"], f"{path} sample rate mismatch"
    data = data.astype(np.float32)

    block_size = int(sr * config["audio"]["block_size_ms"] / 1000)
    max_event_blocks = max(1, round(config["detection"]["max_event_ms"] / config["audio"]["block_size_ms"]))
    detector = TapDetector(
        energy_threshold=config["detection"]["energy_threshold"],
        max_event_blocks=max_event_blocks,
        min_similarity=config["detection"]["min_template_similarity"],
        template=template,
    )

    n_blocks = len(data) // block_size
    detected_any = False
    for i in range(n_blocks):
        chunk = data[i * block_size : (i + 1) * block_size]
        if detector.process_chunk(chunk):
            detected_any = True
    return detected_any


class TapDetectorRegressionTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(ROOT / "config.yaml") as f:
            cls.config = yaml.safe_load(f)
        try:
            cls.template = load_template()
        except FileNotFoundError:
            cls.template = None

    def _check_category(self, prefix, expect_detected, min_pass_rate=1.0):
        if self.template is None:
            self.skipTest("No tap template built yet — run scripts/setup_wizard.py first")
        files = sorted(glob.glob(str(SAMPLE_DIR / f"{prefix}_*.wav")))
        if not files:
            self.skipTest(f"No sample clips recorded yet for '{prefix}' — run scripts/setup_wizard.py first")
        misses = []
        for path in files:
            name = Path(path).name
            detected = run_detector(path, self.config, self.template)
            if detected != expect_detected:
                misses.append(name)
        pass_rate = 1 - (len(misses) / len(files))
        self.assertGreaterEqual(
            pass_rate,
            min_pass_rate,
            f"{prefix}: {len(misses)}/{len(files)} misclassified ({', '.join(misses)}), "
            f"pass rate {pass_rate:.0%} < required {min_pass_rate:.0%}",
        )

    def test_taps_are_detected(self):
        self._check_category("tap", expect_detected=True, min_pass_rate=MIN_TAP_RECALL)

    def test_typing_is_not_detected(self):
        self._check_category("typing", expect_detected=False)

    def test_talking_is_not_detected(self):
        self._check_category("talking", expect_detected=False)

    def test_other_noises_are_not_detected(self):
        self._check_category("other", expect_detected=False)


if __name__ == "__main__":
    unittest.main()
