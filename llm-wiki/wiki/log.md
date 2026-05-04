# Log

## [2026-05-04] ingest | settings fast mode entry
- Added source: `raw/features/settings-fast-mode-entry.md`.
- Created wiki page: `concepts/settings-and-model-controls.md`.
- Documents: sidebar Settings now exposes a direct Fast mode switch sharing the existing `config/batchWrite` speed-mode persistence.
- Updated `index.md`.

## [2026-05-04] ingest | cc-switch thread model display preservation
- Added source: `raw/fixes/cc-switch-thread-model-display-preservation.md`.
- Updated wiki page: `concepts/cc-switch-codex-provider-models.md`.
- Documents: per-thread cc-switch virtual model ids are preserved for UI labels after `thread/start`, while follow-up turns resolve them to real app-server model values.
- Updated `index.md`.

## [2026-05-04] ingest | cc-switch model picker entry visibility
- Added source: `raw/fixes/cc-switch-model-picker-entry-visibility.md`.
- Updated wiki page: `concepts/cc-switch-codex-provider-models.md`.
- Documents: initial background model refresh must include provider-backed models so fresh new-thread composer loads can show `cc-switch-codex:` options.
- Updated `index.md`.

## [2026-05-04] ingest | command tested tags
- Added source: `raw/features/command-tested-tags.md`.
- Updated wiki page: `concepts/realtime-chat-rendering.md`.
- Documents: completed command right-click tested tags, localStorage persistence key, language-aware context menu labels, and dark-theme coverage.
- Updated `index.md`.

## [2026-05-04] ingest | cc-switch Codex provider model picker
- Added source: `raw/features/cc-switch-codex-provider-models.md`.
- Created wiki page: `concepts/cc-switch-codex-provider-models.md`.
- Documents: `cc-switch.db` provider/config source shape, virtual model id encoding, server-side provider config resolution, and new-thread-only picker behavior.
- Updated `index.md`.

## [2026-05-02] ingest | Directory Hub Composio and Skills search
- Added source: `raw/features/directory-hub-composio-skills-search.md`.
- Created wiki page: `concepts/directory-hub-composio-skills.md`.
- Documents: Skills tab default/query routing, MCP placement/reload behavior, `npx skills find/add` semantics, Composio CLI-backed connector behavior, search-ranking edge cases, and verification coverage.
- Updated `overview.md`, `entities/codex-web-local.md`, and `index.md`.

## [2026-04-26] ingest | skills route UI and first-launch plugins card
- Added source: `raw/features/skills-route-ui-and-first-launch-card.md`.
- Created wiki page: `concepts/skills-route-ui.md`.
- Documents: Skills route rename, first-launch Plugins card persistence in global state, dark-theme regression/fix details, and `npm run dev` worktree reuse behavior.
- Updated `overview.md`, `entities/codex-web-local.md`, and `index.md`.

## [2026-04-23] ingest | realtime chat rendering and inline media
- Added source: `raw/features/realtime-chat-rendering-inline-media.md`.
- Created wiki page: `concepts/realtime-chat-rendering.md`.
- Documents: chat render caching, realtime sync-churn reduction, large JSONL inline media findings, bridge-side media sanitization, and verification results.
- Updated `overview.md`, `entities/codex-web-local.md`, and `index.md`.

## [2026-04-22] ingest | integrated terminal implementation
- Added source: `raw/features/integrated-terminal.md`.
- Created wiki page: `concepts/integrated-terminal.md`.
- Documents: Codex.app terminal parity facts, web endpoint design, PTY manager edge cases, visual review fixes, and verification coverage.
- Updated `overview.md`, `entities/codex-web-local.md`, and `index.md`.

## [2026-04-13] ingest | OpenCode Zen Big Pickle + Codex CLI fix
- Added source: `raw/fixes/opencode-zen-big-pickle-codex-cli.md`.
- Created wiki page: `concepts/opencode-zen-big-pickle.md`.
- Documents: Big Pickle only supports Chat Completions API; Codex CLI v0.93.0 needed for `wire_api = "chat"`; `opencode run` needs piped stdin in non-TTY.
- Updated `index.md`.

## [2026-04-10] ingest | codex-web-local project snapshot
- Added source: `raw/projects/codex-web-local.md`.
- Created wiki pages: `overview.md`, `entities/codex-web-local.md`, `concepts/merge-to-main-workflow.md`.
- Updated `index.md` with initial catalog entries.
