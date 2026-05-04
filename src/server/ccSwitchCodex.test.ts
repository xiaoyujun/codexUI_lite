import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { encodeCcSwitchCodexModelSelection } from '../ccSwitchCodexModel'
import {
  parseTomlSubsetForCcSwitch,
  resolveCcSwitchCodexModelOnlyParams,
  resolveCcSwitchCodexProviderFromSettings,
} from './ccSwitchCodex'

const originalCcSwitchDbPath = process.env.CC_SWITCH_DB_PATH
const tempCcSwitchDirs: string[] = []

afterEach(() => {
  if (originalCcSwitchDbPath === undefined) {
    delete process.env.CC_SWITCH_DB_PATH
  } else {
    process.env.CC_SWITCH_DB_PATH = originalCcSwitchDbPath
  }
  while (tempCcSwitchDirs.length > 0) {
    const dir = tempCcSwitchDirs.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

async function createCcSwitchDb(providerId: string, providerName: string): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), 'codexui-cc-switch-'))
  tempCcSwitchDirs.push(dir)
  const dbPath = join(dir, 'cc-switch.db')
  const sqlite = await import('node:sqlite')
  const db = new sqlite.DatabaseSync(dbPath)
  try {
    db.exec(`
CREATE TABLE providers (
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  app_type TEXT NOT NULL,
  settings_config TEXT NOT NULL,
  is_current INTEGER,
  sort_index INTEGER
);
CREATE TABLE settings (
  key TEXT NOT NULL,
  value TEXT
);
`)
    const settingsConfig = JSON.stringify({
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
    })
    db.prepare('INSERT INTO providers (id, name, app_type, settings_config, is_current, sort_index) VALUES (?, ?, ?, ?, ?, ?)')
      .run(providerId, providerName, 'codex', settingsConfig, 1, 1)
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
      .run('common_config_codex', 'model_reasoning_effort = "medium"')
  } finally {
    db.close()
  }
  process.env.CC_SWITCH_DB_PATH = dbPath
  return dir
}

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

describe('resolveCcSwitchCodexModelOnlyParams', () => {
  it('resolves cc-switch virtual ids in follow-up turn model settings', async () => {
    await createCcSwitchDb('provider-1', 'Provider One')
    const virtualModelId = encodeCcSwitchCodexModelSelection({
      providerId: 'provider-1',
      providerName: 'Provider One',
      model: 'gpt-5.5',
    })

    const resolved = await resolveCcSwitchCodexModelOnlyParams({
      threadId: 'thread-1',
      model: virtualModelId,
      collaborationMode: {
        mode: 'default',
        settings: {
          model: virtualModelId,
          reasoning_effort: 'medium',
          developer_instructions: null,
        },
      },
    })

    expect(resolved).toMatchObject({
      threadId: 'thread-1',
      model: 'gpt-5.5',
      collaborationMode: {
        mode: 'default',
        settings: {
          model: 'gpt-5.5',
          reasoning_effort: 'medium',
          developer_instructions: null,
        },
      },
    })
  })
})
