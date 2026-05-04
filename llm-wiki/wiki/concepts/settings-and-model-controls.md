# Settings and Model Controls

The web UI keeps global model-adjacent controls in sidebar Settings and local composer controls near the message box.

## Fast Mode

Fast mode is persisted through `config/batchWrite`, setting `features.fast_mode = true` and using `service_tier = "fast"` while enabled. The sidebar Settings panel exposes a direct `Fast mode` switch, and the composer attachment menu keeps its existing Fast mode control.

Source: [settings-fast-mode-entry.md](../../raw/features/settings-fast-mode-entry.md)

## Related
- [cc-switch-codex-provider-models.md](./cc-switch-codex-provider-models.md)
