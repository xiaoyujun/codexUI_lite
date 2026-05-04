# cc-switch Codex Provider Models Source Notes

Date: 2026-05-04

## External Source
- `farion1231/cc-switch` stores provider data in `~/.cc-switch/cc-switch.db`.
- The `providers` table has composite key `(id, app_type)` and includes `name`, `settings_config`, `is_current`, and ordering metadata.
- Codex providers use `app_type = "codex"`.
- Provider `settings_config` is JSON with:
  - `auth`: key-value auth material, for example `OPENAI_API_KEY`.
  - `config`: Codex `config.toml` text, including `model`, `model_provider`, and `[model_providers.<id>]` tables.
- Shared Codex config is stored in the `settings` table under key `common_config_codex`.

## Implementation Facts
- The web model list uses encoded virtual model ids prefixed with `cc-switch-codex:`.
- The browser receives only encoded provider id/name/model metadata, not provider auth.
- On `thread/start` and `thread/fork`, the bridge resolves a virtual model id server-side by rereading `cc-switch.db`, parsing provider TOML, merging `common_config_codex`, and passing app-server `model`, `modelProvider`, and `config`.
- The bridge injects provider auth into the resolved provider config as `experimental_bearer_token` when the provider references an `env_key`.
- Existing `turn/start` requests cannot change model provider, so the composer hides `cc-switch` virtual options outside the new-thread composer. The bridge also strips accidental virtual ids down to the real model id before forwarding `turn/start`.
- `cc-switch` options are appended to `/codex-api/provider-models` in normal Codex mode. Existing free/custom-provider exclusive model lists remain exclusive.

## Verification
- Added unit coverage for virtual model id encoding/decoding.
- Added unit coverage for the small TOML subset parser and server-side provider resolution/auth injection.
- Full unit suite passed: `npm run test:unit`.
- Full build passed: `npm run build`.
