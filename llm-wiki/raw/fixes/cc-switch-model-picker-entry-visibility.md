# cc-switch Model Picker Entry Visibility Fix

Date: 2026-05-04

## Source Notes

- `/codex-api/provider-models` returned `cc-switch-codex:` virtual model ids from `~/.cc-switch/cc-switch.db`.
- The new-thread composer did not show those options after a fresh page load because `refreshAll(...)` scheduled ancillary state refreshes with `includeProviderModels: false`.
- The fix adds an explicit `includeProviderModels` option to `refreshAll(...)`.
- App initialization passes `includeProviderModels: true`, so the initial background model refresh merges provider-backed and cc-switch model ids into `availableModelIds`.
- Existing thread composers still filter `cc-switch-codex:` ids out because `turn/start` cannot switch provider config.
