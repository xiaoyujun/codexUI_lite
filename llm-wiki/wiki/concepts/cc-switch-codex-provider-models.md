# cc-switch Codex Provider Models

Codex Web can expose saved `cc-switch` Codex providers as model-picker choices for starting a new chat.

## Data Source

The integration reads `~/.cc-switch/cc-switch.db`, specifically:
- `providers` rows where `app_type = "codex"`.
- `providers.settings_config`, a JSON object containing provider `auth` and Codex TOML `config`.
- `settings.common_config_codex`, shared Codex TOML merged into each provider config.

Source: [cc-switch-codex-provider-models.md](../../raw/features/cc-switch-codex-provider-models.md)

## Model Picker Contract

The frontend receives encoded virtual model ids prefixed with `cc-switch-codex:`. Labels show the `cc-switch` provider name plus its configured model. Auth is not sent to the browser.

These options are shown only in the new-thread composer because app-server `thread/start` supports `modelProvider` and `config` overrides. Existing `turn/start` calls can change the model, but not the provider config.

## Server Resolution

When a virtual model id reaches `thread/start` or `thread/fork`, the bridge rereads `cc-switch.db`, resolves the selected provider, parses its Codex TOML, merges `common_config_codex`, and forwards:
- `model`
- `modelProvider`
- `config`

If the selected provider uses an `env_key` and `settings_config.auth` contains that key, the bridge injects the token into the provider config as `experimental_bearer_token` and removes the `env_key` before forwarding.

## Related
- [opencode-zen-big-pickle.md](./opencode-zen-big-pickle.md)
- [realtime-chat-rendering.md](./realtime-chat-rendering.md)
