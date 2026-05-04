# cc-switch Thread Model Display Preservation Fix

Date: 2026-05-04

## Source Notes

- New-thread composer selections can use encoded `cc-switch-codex:` virtual model ids so labels include the cc-switch provider name.
- `thread/start` resolves the virtual id server-side into a real Codex model and provider config before calling app-server.
- App-server returns the real model id, so saving the returned model as the thread selection caused the active conversation composer to display only the raw model name after the thread was created.
- The fix preserves the requested virtual model id as the per-thread UI selection when a cc-switch provider was used.
- Existing thread composers still hide unrelated cc-switch provider options, but keep the current thread's selected virtual option visible so the selected label can render.
- Follow-up `turn/start` requests can carry the virtual id from UI state; the bridge resolves it to the real model for both the top-level `model` field and nested `collaborationMode.settings.model`.
