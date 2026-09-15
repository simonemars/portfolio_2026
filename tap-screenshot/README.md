# tap-screenshot

A background macOS process that listens for knuckle-taps on your laptop's chassis
and turns a tap pattern (one/two/three taps) into an action — by default, taking a
screenshot and saving it straight to Photos, hands-free.

No extra hardware, no ML model, no wake word. Just the built-in mic, a small
signal-processing pipeline, and a couple of clever heuristics tuned against your
own tapping.

## How it works

```
mic -> energy threshold -> transient-duration check -> spectral-shape match
     -> tap counter (refractory + grouping window) -> macOS Shortcut -> Photos
```

Detection is **calibrated to your own hardware and habits**, not shipped as a
one-size-fits-all model — a knuckle tap sounds different on every laptop, mic, and
room. The setup wizard below records a short sample of your own taps, typing, and
talking, and tunes against that.

## Requirements

- macOS (uses `sounddevice`/CoreAudio, `screencapture`, AppleScript, and the
  `shortcuts` CLI — all macOS-specific)
- Python 3.9+
- The `shortcuts` CLI (ships with modern macOS; check with `shortcuts list`)

## Setup

```bash
cd tap-screenshot
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Grant microphone permission to your terminal app in System Settings → Privacy &
Security → Microphone the first time you run anything below.

### Run the setup wizard

```bash
python scripts/setup_wizard.py
```

This walks you through:
1. Recording ~15-20 of your own taps (through the same live audio pipeline the
   real listener uses — recording through a different pipeline measurably changes
   how a tap sounds to the detector, so this matters more than it might seem).
2. Recording a few clips each of your own typing, talking, and other ambient
   noises, so the detector learns what *isn't* a tap.
3. Building the tap template and running an evaluation, so you see actual
   recall/false-positive numbers before relying on it.
4. The one manual step that has to happen outside of code: building a
   "Screenshot To Photos" Shortcut in the Shortcuts app (by design — so what a
   tap *does* can be changed later without touching Python).
5. Optionally installing the background `launchd` agent.

If detection doesn't feel right after the wizard (misses taps, or false-triggers
on typing/talk), re-run it — it adds new samples rather than replacing old ones —
or jump straight to [Tuning detection thresholds](#tuning-detection-thresholds).

## Run

```bash
python src/main.py
```

A confirmed tap pattern prints `### PATTERN: N tap(s) ###` and runs the Shortcut
configured for that count in `config.yaml`.

## Run as a background service (launchd)

```bash
scripts/install_launchd.sh
```

Installs a `launchd` user agent that starts the listener at login and restarts it
if it crashes. Logs go to `logs/stdout.log` and `logs/stderr.log` (no terminal to
print to when running headless). To remove it: `scripts/uninstall_launchd.sh`.

If screenshots come back showing only the desktop instead of real screen content,
check System Settings → Privacy & Security → Screen Recording — the permission can
be attributed differently for a process launched by `launchd` vs. an interactive
terminal.

## Tuning detection thresholds

`config.yaml`'s `detection:` block can be re-tuned without live tapping:

```bash
python src/main.py --replay tests/sample_audio/tap_01.wav   # check one clip
python scripts/evaluate_detector.py                          # full before/after summary
```

`evaluate_detector.py` reports recall (taps correctly detected) and specificity
(non-taps correctly rejected) across the whole `tests/sample_audio/` set, so a
threshold change is a number to compare, not a guess. After adding or re-recording
tap clips, re-run `scripts/build_tap_template.py` first.

## Remapping what a tap does

`config.yaml`'s `actions:` block maps tap count -> Shortcut name. Build a
different Shortcut in the Shortcuts app and point a tap count at it — no code
changes needed.

## Project structure

```
tap-screenshot/
├── src/
│   ├── audio_capture.py       # mic stream -> buffered chunks via a thread-safe queue
│   ├── tap_detector.py        # energy threshold -> duration check -> spectral-shape match
│   ├── tap_counter.py         # refractory window + grouping -> single/double/triple pattern
│   ├── action_dispatcher.py   # tap-count -> named macOS Shortcut
│   ├── screenshot_handler.py  # screencapture -> AppleScript import into Photos -> cleanup
│   └── main.py                # wires the pipeline together; --replay for offline testing
├── scripts/
│   ├── setup_wizard.py            # guided first-run sample recording + tuning
│   ├── build_tap_template.py      # builds the reference tap spectrum from recorded clips
│   ├── evaluate_detector.py       # recall/false-positive report across all sample clips
│   ├── install_launchd.sh         # registers main.py as a background LaunchAgent
│   └── com.tapscreenshot.agent.plist.template
├── tests/
│   ├── sample_audio/          # your own recorded clips (not committed — see Setup)
│   └── test_*.py               # unit + regression tests
└── config.yaml                # all tunable thresholds and the tap-count -> action mapping
```

## Limitations

- Lateral (left/right) tap detection isn't possible on hardware where the mic
  array is pre-summed to mono at the driver level before any app can see raw
  channels (confirmed true for at least one MacBook Air model — check
  `sounddevice.query_devices()`'s `max_input_channels` for yours).
- Detection quality is per-machine; there's no universal threshold set.
- The Shortcut and `launchd` steps are macOS-only and can't be scripted away
  entirely (Shortcuts has no clean way to be authored from the CLI).

## License

MIT — see [LICENSE](LICENSE).
