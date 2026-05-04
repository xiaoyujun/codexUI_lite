# Command Tested Tags Source Notes

Date: 2026-05-04

## Implementation Facts
- Completed command rows in `ThreadConversation.vue` support a custom right-click menu.
- The command context menu contains a checkbox-style `Tested` action.
- Toggling the action stores the tested state in browser local storage under `codex-web-local.command-tested-tags.v1`.
- Stored keys are scoped by active thread id and command message id.
- In-progress commands do not expose the tested context menu.
- A small inline tag is rendered on tested command rows.
- File-link context menu labels and command tested menu/tag labels use `useUiLanguage()` so they switch between English and Simplified Chinese.
- Dark-theme overrides cover the command tested tag, context menu, and checkbox states.

## Verification
- Full build passed: `npm run build`.
- Manual test instructions were added to `tests.md`.
