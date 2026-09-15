import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from tap_counter import TapCounter  # noqa: E402

REFRACTORY_S = 0.2
GROUP_WINDOW_S = 0.5


def make_counter():
    return TapCounter(refractory_s=REFRACTORY_S, group_window_s=GROUP_WINDOW_S)


class TapCounterTest(unittest.TestCase):
    def test_single_tap(self):
        c = make_counter()
        self.assertTrue(c.on_tap(0.0))
        self.assertIsNone(c.poll(0.4))
        self.assertEqual(c.poll(0.5), 1)

    def test_double_tap(self):
        c = make_counter()
        c.on_tap(0.0)
        c.on_tap(0.3)
        self.assertIsNone(c.poll(0.7))
        self.assertEqual(c.poll(0.8), 2)

    def test_triple_tap(self):
        c = make_counter()
        c.on_tap(0.0)
        c.on_tap(0.3)
        c.on_tap(0.6)
        self.assertIsNone(c.poll(1.0))
        self.assertEqual(c.poll(1.1), 3)

    def test_refractory_suppresses_immediate_second_event(self):
        c = make_counter()
        c.on_tap(0.0)
        self.assertFalse(c.on_tap(0.1))  # within 0.2s refractory - same physical tap
        self.assertEqual(c.poll(0.5), 1)

    def test_tap_just_outside_refractory_counts(self):
        c = make_counter()
        c.on_tap(0.0)
        self.assertTrue(c.on_tap(0.21))
        self.assertEqual(c.poll(0.71), 2)

    def test_two_separate_patterns(self):
        c = make_counter()
        c.on_tap(0.0)
        self.assertEqual(c.poll(0.5), 1)
        c.on_tap(2.0)
        c.on_tap(2.3)
        self.assertEqual(c.poll(2.8), 2)

    def test_poll_returns_none_when_idle(self):
        c = make_counter()
        self.assertIsNone(c.poll(100.0))

    def test_pending_count_resets_after_finalizing(self):
        c = make_counter()
        c.on_tap(0.0)
        c.poll(0.5)
        c.on_tap(1.0)
        self.assertEqual(c.poll(1.5), 1)


if __name__ == "__main__":
    unittest.main()
