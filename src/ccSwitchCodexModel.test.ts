import { describe, expect, it } from 'vitest'
import {
  decodeCcSwitchCodexModelSelection,
  encodeCcSwitchCodexModelSelection,
  isCcSwitchCodexModelSelection,
} from './ccSwitchCodexModel'

describe('cc-switch Codex model selection encoding', () => {
  it('round-trips provider ids, model ids, and non-ascii provider names', () => {
    const value = encodeCcSwitchCodexModelSelection({
      providerId: 'provider:one',
      providerName: '自定义 Provider',
      model: 'gpt-5.5',
    })

    expect(isCcSwitchCodexModelSelection(value)).toBe(true)
    expect(decodeCcSwitchCodexModelSelection(value)).toEqual({
      providerId: 'provider:one',
      providerName: '自定义 Provider',
      model: 'gpt-5.5',
    })
  })

  it('rejects normal model ids', () => {
    expect(decodeCcSwitchCodexModelSelection('gpt-5.5')).toBeNull()
    expect(isCcSwitchCodexModelSelection('gpt-5.5')).toBe(false)
  })
})
