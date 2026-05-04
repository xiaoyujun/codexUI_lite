import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  decodeCcSwitchCodexModelSelection,
  encodeCcSwitchCodexModelSelection,
  type CcSwitchCodexModelSelection,
} from '../ccSwitchCodexModel.js'

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }
type JsonObject = { [key: string]: JsonValue }

type CcSwitchProviderRow = {
  id: string
  name: string
  settings_config: string
  is_current?: number | boolean | null
}

type CcSwitchSettingsRow = {
  key: string
  value: string
}

type ParsedCcSwitchProviderSettings = {
  auth: Record<string, string>
  config: string
}

type ResolvedCcSwitchCodexProvider = {
  selection: CcSwitchCodexModelSelection
  modelProvider: string
  config: JsonObject
}

const CC_SWITCH_CODEX_APP_TYPE = 'codex'
const CC_SWITCH_COMMON_CONFIG_KEY = 'common_config_codex'
const SQLITE_QUERY_TIMEOUT_MS = 5000

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asJsonObject(value: JsonValue | undefined): JsonObject | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as JsonObject
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function getCcSwitchHomeDir(): string {
  return process.env.CC_SWITCH_HOME?.trim() || join(homedir(), '.cc-switch')
}

function getCcSwitchDbPath(): string {
  return process.env.CC_SWITCH_DB_PATH?.trim() || join(getCcSwitchHomeDir(), 'cc-switch.db')
}

function parseProviderSettings(value: string): ParsedCcSwitchProviderSettings | null {
  try {
    const payload = asRecord(JSON.parse(value))
    if (!payload) return null

    const authPayload = asRecord(payload.auth)
    const auth: Record<string, string> = {}
    if (authPayload) {
      for (const [key, rawValue] of Object.entries(authPayload)) {
        const normalizedKey = key.trim()
        const normalizedValue = readString(rawValue)
        if (normalizedKey && normalizedValue) {
          auth[normalizedKey] = normalizedValue
        }
      }
    }

    const config = readString(payload.config)
    if (!config) return null
    return { auth, config }
  } catch {
    return null
  }
}

function stripTomlComment(line: string): string {
  let quote: '"' | "'" | '' = ''
  let escaped = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (quote === '"' && escaped) {
      escaped = false
      continue
    }
    if (quote === '"' && char === '\\') {
      escaped = true
      continue
    }
    if ((char === '"' || char === "'") && !quote) {
      quote = char
      continue
    }
    if (char === quote) {
      quote = ''
      continue
    }
    if (char === '#' && !quote) {
      return line.slice(0, index)
    }
  }
  return line
}

function splitTomlTopLevel(value: string, delimiter: string): string[] {
  const parts: string[] = []
  let quote: '"' | "'" | '' = ''
  let escaped = false
  let depth = 0
  let start = 0

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    if (quote === '"' && escaped) {
      escaped = false
      continue
    }
    if (quote === '"' && char === '\\') {
      escaped = true
      continue
    }
    if ((char === '"' || char === "'") && !quote) {
      quote = char
      continue
    }
    if (char === quote) {
      quote = ''
      continue
    }
    if (quote) continue
    if (char === '[' || char === '{') depth += 1
    if (char === ']' || char === '}') depth = Math.max(0, depth - 1)
    if (char === delimiter && depth === 0) {
      parts.push(value.slice(start, index).trim())
      start = index + 1
    }
  }

  const tail = value.slice(start).trim()
  if (tail) parts.push(tail)
  return parts
}

function splitTomlDottedKey(value: string): string[] {
  return splitTomlTopLevel(value, '.')
    .map((part) => parseTomlKeyPart(part))
    .filter((part) => part.length > 0)
}

function parseTomlKeyPart(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    const parsed = parseTomlValue(trimmed)
    return typeof parsed === 'string' ? parsed.trim() : ''
  }
  return trimmed
}

function splitTomlAssignment(value: string): [string, string] | null {
  let quote: '"' | "'" | '' = ''
  let escaped = false
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    if (quote === '"' && escaped) {
      escaped = false
      continue
    }
    if (quote === '"' && char === '\\') {
      escaped = true
      continue
    }
    if ((char === '"' || char === "'") && !quote) {
      quote = char
      continue
    }
    if (char === quote) {
      quote = ''
      continue
    }
    if (char === '=' && !quote) {
      return [value.slice(0, index).trim(), value.slice(index + 1).trim()]
    }
  }
  return null
}

function parseTomlValue(value: string): JsonValue {
  const trimmed = value.trim()
  if (!trimmed) return ''

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed) as string
    } catch {
      return trimmed.slice(1, -1)
    }
  }

  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1)
  }

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const object: JsonObject = {}
    const inner = trimmed.slice(1, -1).trim()
    if (!inner) return object
    for (const part of splitTomlTopLevel(inner, ',')) {
      const assignment = splitTomlAssignment(part)
      if (!assignment) continue
      const keyPath = splitTomlDottedKey(assignment[0])
      if (keyPath.length === 0) continue
      setNestedTomlValue(object, keyPath, parseTomlValue(assignment[1]))
    }
    return object
  }

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim()
    if (!inner) return []
    return splitTomlTopLevel(inner, ',').map((part) => parseTomlValue(part))
  }

  if (trimmed === 'true') return true
  if (trimmed === 'false') return false

  const numeric = Number(trimmed.replace(/_/g, ''))
  if (Number.isFinite(numeric) && /^[-+]?\d+(?:\.\d+)?$/.test(trimmed.replace(/_/g, ''))) {
    return numeric
  }

  return trimmed
}

function ensureNestedObject(target: JsonObject, key: string): JsonObject {
  const existing = asJsonObject(target[key])
  if (existing) return existing
  const next: JsonObject = {}
  target[key] = next
  return next
}

function setNestedTomlValue(target: JsonObject, path: string[], value: JsonValue): void {
  if (path.length === 0) return
  let cursor = target
  for (const key of path.slice(0, -1)) {
    cursor = ensureNestedObject(cursor, key)
  }
  cursor[path[path.length - 1]!] = value
}

export function parseTomlSubsetForCcSwitch(value: string): JsonObject {
  const root: JsonObject = {}
  let currentPath: string[] = []

  for (const rawLine of value.split(/\r?\n/)) {
    const line = stripTomlComment(rawLine).trim()
    if (!line) continue

    if (line.startsWith('[') && line.endsWith(']')) {
      const tableName = line.replace(/^\[+|\]+$/g, '').trim()
      currentPath = splitTomlDottedKey(tableName)
      if (currentPath.length > 0) {
        setNestedTomlValue(root, currentPath, ensureObjectAtPath(root, currentPath))
      }
      continue
    }

    const assignment = splitTomlAssignment(line)
    if (!assignment) continue
    const keyPath = [...currentPath, ...splitTomlDottedKey(assignment[0])]
    setNestedTomlValue(root, keyPath, parseTomlValue(assignment[1]))
  }

  return root
}

function ensureObjectAtPath(target: JsonObject, path: string[]): JsonObject {
  let cursor = target
  for (const key of path) {
    cursor = ensureNestedObject(cursor, key)
  }
  return cursor
}

function cloneJsonObject(value: JsonObject): JsonObject {
  return JSON.parse(JSON.stringify(value)) as JsonObject
}

function mergeJsonObjects(base: JsonObject, overlay: JsonObject): JsonObject {
  const next = cloneJsonObject(base)
  for (const [key, overlayValue] of Object.entries(overlay)) {
    const existingObject = asJsonObject(next[key])
    const overlayObject = asJsonObject(overlayValue)
    if (existingObject && overlayObject) {
      next[key] = mergeJsonObjects(existingObject, overlayObject)
      continue
    }
    next[key] = overlayValue
  }
  return next
}

function expandAuthIntoProviderConfig(config: JsonObject, auth: Record<string, string>): JsonObject {
  const next = cloneJsonObject(config)
  const modelProvider = readString(next.model_provider)
  if (!modelProvider) return next

  const providers = asJsonObject(next.model_providers)
  const provider = providers ? asJsonObject(providers[modelProvider]) : null
  if (!provider) return next

  const envKey = readString(provider.env_key)
  const bearerToken = envKey ? auth[envKey] : auth.OPENAI_API_KEY
  if (bearerToken && !readString(provider.experimental_bearer_token)) {
    provider.experimental_bearer_token = bearerToken
    delete provider.env_key
  }

  const envHttpHeaders = asJsonObject(provider.env_http_headers)
  if (envHttpHeaders) {
    const httpHeaders = asJsonObject(provider.http_headers) ?? {}
    for (const [headerName, rawEnvName] of Object.entries(envHttpHeaders)) {
      const envName = readString(rawEnvName)
      const headerValue = envName ? auth[envName] : ''
      if (headerName.trim() && headerValue) {
        httpHeaders[headerName.trim()] = headerValue
      }
    }
    if (Object.keys(httpHeaders).length > 0) {
      provider.http_headers = httpHeaders
      delete provider.env_http_headers
    }
  }

  return next
}

export function resolveCcSwitchCodexProviderFromSettings(
  row: Pick<CcSwitchProviderRow, 'id' | 'name' | 'settings_config'>,
  commonConfigText: string,
  modelOverride?: string,
): ResolvedCcSwitchCodexProvider | null {
  const settings = parseProviderSettings(row.settings_config)
  if (!settings) return null

  const commonConfig = parseTomlSubsetForCcSwitch(commonConfigText)
  const providerConfig = parseTomlSubsetForCcSwitch(settings.config)
  const mergedConfig = mergeJsonObjects(commonConfig, providerConfig)
  const config = expandAuthIntoProviderConfig(mergedConfig, settings.auth)
  const model = readString(modelOverride) || readString(config.model)
  const modelProvider = readString(config.model_provider)
  if (!model || !modelProvider) return null

  config.model = model
  config.model_provider = modelProvider

  return {
    selection: {
      providerId: row.id,
      providerName: row.name,
      model,
    },
    modelProvider,
    config,
  }
}

async function queryRowsWithNodeSqlite(dbPath: string, sql: string): Promise<Array<Record<string, unknown>>> {
  const sqlite = await import('node:sqlite')
  const db = new sqlite.DatabaseSync(dbPath, { readOnly: true })
  try {
    return db.prepare(sql).all() as Array<Record<string, unknown>>
  } finally {
    db.close()
  }
}

async function queryRowsWithSqliteCli(dbPath: string, sql: string): Promise<Array<Record<string, unknown>>> {
  return await new Promise((resolve, reject) => {
    const child = spawn('sqlite3', ['-json', dbPath, sql], { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error(`sqlite3 query timed out after ${SQLITE_QUERY_TIMEOUT_MS}ms`))
    }, SQLITE_QUERY_TIMEOUT_MS)

    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk
    })
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk
    })
    child.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timeout)
      if (code !== 0) {
        reject(new Error(stderr.trim() || `sqlite3 exited with ${code ?? 'unknown status'}`))
        return
      }
      try {
        const parsed = stdout.trim() ? JSON.parse(stdout) as unknown : []
        resolve(Array.isArray(parsed) ? parsed as Array<Record<string, unknown>> : [])
      } catch (error) {
        reject(error)
      }
    })
  })
}

async function queryCcSwitchRows(sql: string): Promise<Array<Record<string, unknown>>> {
  const dbPath = getCcSwitchDbPath()
  if (!existsSync(dbPath)) return []

  try {
    return await queryRowsWithSqliteCli(dbPath, sql)
  } catch {
    try {
      return await queryRowsWithNodeSqlite(dbPath, sql)
    } catch {
      return []
    }
  }
}

function normalizeProviderRow(row: Record<string, unknown>): CcSwitchProviderRow | null {
  const id = readString(row.id)
  const name = readString(row.name)
  const settingsConfig = readString(row.settings_config)
  if (!id || !name || !settingsConfig) return null
  return {
    id,
    name,
    settings_config: settingsConfig,
    is_current: typeof row.is_current === 'number' || typeof row.is_current === 'boolean' ? row.is_current : null,
  }
}

function normalizeSettingsRow(row: Record<string, unknown>): CcSwitchSettingsRow | null {
  const key = readString(row.key)
  const value = readString(row.value)
  if (!key) return null
  return { key, value }
}

async function readCcSwitchCodexRows(): Promise<{ providers: CcSwitchProviderRow[]; commonConfig: string }> {
  const providersSql = [
    'SELECT id, name, settings_config, is_current',
    'FROM providers',
    `WHERE app_type = '${CC_SWITCH_CODEX_APP_TYPE}'`,
    'ORDER BY is_current DESC, COALESCE(sort_index, 999999), name',
  ].join(' ')
  const settingsSql = [
    'SELECT key, value',
    'FROM settings',
    `WHERE key = '${CC_SWITCH_COMMON_CONFIG_KEY}'`,
  ].join(' ')

  const [providerRows, settingsRows] = await Promise.all([
    queryCcSwitchRows(providersSql),
    queryCcSwitchRows(settingsSql),
  ])

  const providers = providerRows.flatMap((row) => {
    const provider = normalizeProviderRow(row)
    return provider ? [provider] : []
  })
  const commonConfig = settingsRows
    .flatMap((row) => {
      const setting = normalizeSettingsRow(row)
      return setting ? [setting] : []
    })
    .find((row) => row.key === CC_SWITCH_COMMON_CONFIG_KEY)
    ?.value ?? ''

  return { providers, commonConfig }
}

export async function listCcSwitchCodexModelOptions(): Promise<string[]> {
  const { providers, commonConfig } = await readCcSwitchCodexRows()
  const options: string[] = []
  for (const provider of providers) {
    const resolved = resolveCcSwitchCodexProviderFromSettings(provider, commonConfig)
    if (!resolved) continue
    const value = encodeCcSwitchCodexModelSelection(resolved.selection)
    if (value && !options.includes(value)) {
      options.push(value)
    }
  }
  return options
}

async function resolveCcSwitchSelection(selection: CcSwitchCodexModelSelection): Promise<ResolvedCcSwitchCodexProvider | null> {
  const { providers, commonConfig } = await readCcSwitchCodexRows()
  const provider = providers.find((candidate) => candidate.id === selection.providerId)
  if (!provider) return null
  return resolveCcSwitchCodexProviderFromSettings(provider, commonConfig, selection.model)
}

export async function resolveCcSwitchCodexThreadConfigParams(params: unknown): Promise<unknown> {
  const record = asRecord(params)
  if (!record) return params

  const model = readString(record.model)
  const selection = decodeCcSwitchCodexModelSelection(model)
  if (!selection) return params

  const resolved = await resolveCcSwitchSelection(selection)
  if (!resolved) {
    throw new Error('Selected cc-switch Codex provider is no longer available')
  }

  return {
    ...record,
    model: resolved.selection.model,
    modelProvider: resolved.modelProvider,
    config: resolved.config,
  }
}

export async function resolveCcSwitchCodexModelOnlyParams(params: unknown): Promise<unknown> {
  const record = asRecord(params)
  if (!record) return params

  const model = readString(record.model)
  const selection = decodeCcSwitchCodexModelSelection(model)
  if (!selection) return params

  const resolved = await resolveCcSwitchSelection(selection)
  if (!resolved) {
    throw new Error('Selected cc-switch Codex provider is no longer available')
  }

  const collaborationMode = asRecord(record.collaborationMode)
  const collaborationModeSettings = asRecord(collaborationMode?.settings)
  const resolvedCollaborationMode = collaborationMode && collaborationModeSettings
    ? {
        ...collaborationMode,
        settings: {
          ...collaborationModeSettings,
          model: resolved.selection.model,
        },
      }
    : record.collaborationMode

  const nextRecord: Record<string, unknown> = {
    ...record,
    model: resolved.selection.model,
  }
  if (resolvedCollaborationMode !== undefined) {
    nextRecord.collaborationMode = resolvedCollaborationMode
  }
  return nextRecord
}
