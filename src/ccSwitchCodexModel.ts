export const CC_SWITCH_CODEX_MODEL_PREFIX = 'cc-switch-codex:'

export type CcSwitchCodexModelSelection = {
  providerId: string
  providerName: string
  model: string
}

function safeEncode(value: string): string {
  return encodeURIComponent(value)
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return ''
  }
}

export function encodeCcSwitchCodexModelSelection(selection: CcSwitchCodexModelSelection): string {
  const providerId = selection.providerId.trim()
  const model = selection.model.trim()
  const providerName = selection.providerName.trim()
  if (!providerId || !model) return ''
  return `${CC_SWITCH_CODEX_MODEL_PREFIX}${safeEncode(providerId)}:${safeEncode(model)}:${safeEncode(providerName)}`
}

export function decodeCcSwitchCodexModelSelection(value: string): CcSwitchCodexModelSelection | null {
  if (!value.startsWith(CC_SWITCH_CODEX_MODEL_PREFIX)) return null
  const payload = value.slice(CC_SWITCH_CODEX_MODEL_PREFIX.length)
  const [providerIdPart = '', modelPart = '', providerNamePart = ''] = payload.split(':')
  const providerId = safeDecode(providerIdPart).trim()
  const model = safeDecode(modelPart).trim()
  const providerName = safeDecode(providerNamePart).trim()
  if (!providerId || !model) return null
  return { providerId, model, providerName }
}

export function isCcSwitchCodexModelSelection(value: string): boolean {
  return decodeCcSwitchCodexModelSelection(value) !== null
}
