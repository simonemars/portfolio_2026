"""Mic stream -> buffered chunks, delivered via a thread-safe queue.

The PortAudio callback runs on a real-time audio thread, so it does the
bare minimum (copy the chunk, timestamp it, enqueue it) and never runs
detection logic itself — that happens in the consumer thread via get().
"""

import queue
import time

import numpy as np
import sounddevice as sd


class AudioCapture:
    def __init__(self, sample_rate, channels, block_size_ms, queue_size=50):
        self.sample_rate = sample_rate
        self.channels = channels
        self.block_size = int(sample_rate * block_size_ms / 1000)
        self.dropped_count = 0
        self._queue = queue.Queue(maxsize=queue_size)
        self._stream = None

    def _callback(self, indata, frames, time_info, status):
        if status:
            print(f"audio status: {status}")
        try:
            self._queue.put_nowait((time.monotonic(), indata[:, 0].copy()))
        except queue.Full:
            self.dropped_count += 1

    def get(self, timeout=None):
        """Returns (monotonic_timestamp, chunk). Raises queue.Empty on timeout."""
        return self._queue.get(timeout=timeout)

    def __enter__(self):
        self._stream = sd.InputStream(
            samplerate=self.sample_rate,
            channels=self.channels,
            blocksize=self.block_size,
            callback=self._callback,
        )
        self._stream.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._stream is not None:
            self._stream.stop()
            self._stream.close()


def rms(chunk):
    return float(np.sqrt(np.mean(np.square(chunk))))
