"""Reports detector performance across tests/sample_audio/ as plain numbers,
so a threshold change in config.yaml is a before/after comparison, not a
guess. Reuses the exact same TapDetector the real pipeline runs.

Usage: python scripts/evaluate_detector.py
"""

import glob
import sys
from pathlib import Path

import numpy as np
import yaml
from scipy.io import wavfile

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from tap_detector import TapDetector, load_template  # noqa: E402

SAMPLE_DIR = ROOT / "tests" / "sample_audio"
CATEGORIES = {"tap": True, "typing": False, "talking": False, "other": False}


def detected(path, config, template):
    sr, data = wavfile.read(path)
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
    return any(detector.process_chunk(data[i * block_size : (i + 1) * block_size]) for i in range(n_blocks))


def evaluate(config, template):
    """Returns a dict: {category: {"total": n, "misses": [names]}}."""
    results = {}
    for prefix, is_tap_category in CATEGORIES.items():
        files = sorted(glob.glob(str(SAMPLE_DIR / f"{prefix}_*.wav")))
        if not files:
            continue
        misses = [Path(p).name for p in files if detected(p, config, template) != is_tap_category]
        results[prefix] = {"total": len(files), "misses": misses, "is_tap_category": is_tap_category}
    return results


def print_report(config, results):
    det_cfg = config["detection"]
    print(
        f"energy_threshold={det_cfg['energy_threshold']}  "
        f"max_event_ms={det_cfg['max_event_ms']}  "
        f"min_template_similarity={det_cfg['min_template_similarity']}\n"
    )
    total_tp = total_fn = total_fp = total_tn = 0
    for prefix, r in results.items():
        n, misses, is_tap_category = r["total"], r["misses"], r["is_tap_category"]
        correct = n - len(misses)
        if is_tap_category:
            total_tp += correct
            total_fn += len(misses)
        else:
            total_tn += correct
            total_fp += len(misses)
        label = "recall" if is_tap_category else "specificity"
        print(f"{prefix:8s} {correct}/{n} correct ({label})", end="")
        print(f"  -- missed: {', '.join(misses)}" if misses else "")

    print(f"\nOverall: {total_tp} true positives, {total_fn} false negatives (missed taps), "
          f"{total_fp} false positives, {total_tn} true negatives")


def main():
    with open(ROOT / "config.yaml") as f:
        config = yaml.safe_load(f)
    template = load_template()
    print_report(config, evaluate(config, template))


if __name__ == "__main__":
    main()
