# Settings and Model Controls

The web UI keeps persistent app preferences in sidebar Settings and per-turn model-adjacent controls near the message box.

## Fast Mode

Fast mode is persisted through `config/batchWrite`, setting `features.fast_mode = true` and using `service_tier = "fast"` while enabled. The Fast mode switch is placed in the composer attachment menu under the regular/plan mode control, and sidebar Settings does not expose a duplicate Fast mode row.

Source: [settings-fast-mode-entry.md](../../raw/features/settings-fast-mode-entry.md)

## Related
- [cc-switch-codex-provider-models.md](./cc-switch-codex-provider-models.md)
