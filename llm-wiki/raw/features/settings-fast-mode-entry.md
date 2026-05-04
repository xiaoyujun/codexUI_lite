# Settings Fast Mode Entry

Date: 2026-05-04

## Source Notes

- Fast mode state already existed in the web UI as `selectedSpeedMode` / `updateSelectedSpeedMode`.
- Persisting Fast mode uses `/codex-api/rpc` method `config/batchWrite` through `setCodexSpeedMode`.
- The persisted config writes `features.fast_mode = true` and sets `service_tier = "fast"` when enabled.
- Disabling Fast mode clears `service_tier` back to standard behavior.
- The Settings panel now exposes a direct `Fast mode` switch near Appearance and UI language.
- The composer attachment menu Fast mode toggle remains in place and shares the same state.
