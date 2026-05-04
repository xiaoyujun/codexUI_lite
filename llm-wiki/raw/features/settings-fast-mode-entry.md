# Fast Mode Entry Placement

Date: 2026-05-04

## Source Notes

- Fast mode state already existed in the web UI as `selectedSpeedMode` / `updateSelectedSpeedMode`.
- Persisting Fast mode uses `/codex-api/rpc` method `config/batchWrite` through `setCodexSpeedMode`.
- The persisted config writes `features.fast_mode = true` and sets `service_tier = "fast"` when enabled.
- Disabling Fast mode clears `service_tier` back to standard behavior.
- The Fast mode switch belongs in the composer attachment menu with the mode controls, not in sidebar Settings.
- In the composer attachment menu, the regular/plan mode control appears before `Fast mode`.
