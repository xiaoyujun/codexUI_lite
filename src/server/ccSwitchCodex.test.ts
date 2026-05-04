import { describe, expect, it } from 'vitest'
import {
  parseTomlSubsetForCcSwitch,
  resolveCcSwitchCodexProviderFromSettings,
} from './ccSwitchCodex'

describe('parseTomlSubsetForCcSwitch', () => {
  it('parses Codex provider config tables and inline headers', () => {
    expect(parseTomlSubsetForCcSwitch(`
model_provider = "custom"
model = "gpt-5.5"

[model_providers.custom]
name = "Custom"
wire_api = "responses"
base_url = "https://example.test/v1"
env_key = "OPENAI_API_KEY"
http_headers = { "X-Provider" = "cc-switch" }
`)).toEqual({
      model_provider: 'custom',
      model: 'gpt-5.5',
      model_providers: {
        custom: {
          name: 'Custom',
          wire_api: 'responses',
          base_url: 'https://example.test/v1',
          env_key: 'OPENAI_API_KEY',
          http_headers: {
            'X-Provider': 'cc-switch',
          },
        },
      },
    })
  })
})

describe('resolveCcSwitchCodexProviderFromSettings', () => {
  it('merges common Codex config and injects auth into provider config without returning raw auth fields', () => {
    const resolved = resolveCcSwitchCodexProviderFromSettings({
      id: 'provider-1',
      name: 'Provider One',
      settings_config: JSON.stringify({
        auth: {
          OPENAI_API_KEY: 'test-token',
        },
        config: `
model_provider = "custom"
model = "gpt-5.5"

[model_providers.custom]
name = "Custom"
base_url = "https://example.test/v1"
wire_api = "responses"
env_key = "OPENAI_API_KEY"
`,
      }),
    }, `
model_reasoning_effort = "medium"

[windows]
sandbox = "elevated"
`)

    expect(resolved?.selection).toEqual({
      providerId: 'provider-1',
      providerName: 'Provider One',
      model: 'gpt-5.5',
    })
    expect(resolved?.modelProvider).toBe('custom')
    expect(resolved?.config).toMatchObject({
      model: 'gpt-5.5',
      model_provider: 'custom',
      model_reasoning_effort: 'medium',
      windows: {
        sandbox: 'elevated',
      },
      model_providers: {
        custom: {
          experimental_bearer_token: 'test-token',
        },
      },
    })
    expect(JSON.stringify(resolved?.config)).not.toContain('OPENAI_API_KEY')
  })
})
