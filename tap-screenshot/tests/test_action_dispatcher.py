import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from action_dispatcher import dispatch  # noqa: E402


class ActionDispatcherTest(unittest.TestCase):
    def test_dispatches_configured_shortcut(self):
        config = {"actions": {1: "Screenshot To Photos"}}
        with patch("action_dispatcher.subprocess.Popen") as mock_popen:
            result = dispatch(1, config)
        self.assertTrue(result)
        mock_popen.assert_called_once_with(["shortcuts", "run", "Screenshot To Photos"])

    def test_unmapped_count_does_not_dispatch(self):
        config = {"actions": {1: "Screenshot To Photos"}}
        with patch("action_dispatcher.subprocess.Popen") as mock_popen:
            result = dispatch(99, config)
        self.assertFalse(result)
        mock_popen.assert_not_called()

    def test_missing_actions_block_does_not_dispatch(self):
        with patch("action_dispatcher.subprocess.Popen") as mock_popen:
            result = dispatch(1, {})
        self.assertFalse(result)
        mock_popen.assert_not_called()


if __name__ == "__main__":
    unittest.main()
