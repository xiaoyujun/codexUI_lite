import { Capacitor } from '@capacitor/core'

const SERVER_URL_STORAGE_KEY = 'codexui.native.server-url.v1'
const DEFAULT_SERVER_URL = 'http://38.76.162.141:18923'

function isConnectorPreviewEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('nativeConnector') === '1'
}

export function shouldShowNativeServerConnector(): boolean {
  return Capacitor.isNativePlatform() || isConnectorPreviewEnabled()
}

function readSavedServerUrl(): string {
  try {
    return window.localStorage.getItem(SERVER_URL_STORAGE_KEY)?.trim() || ''
  } catch {
    return ''
  }
}

function saveServerUrl(value: string): void {
  try {
    window.localStorage.setItem(SERVER_URL_STORAGE_KEY, value)
  } catch {
    // The connector can still navigate even when storage is unavailable.
  }
}

function normalizeServerUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error('Enter a server address.')

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//iu.test(trimmed)
    ? trimmed
    : `http://${trimmed}`
  const parsed = new URL(withProtocol)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Use an http:// or https:// address.')
  }

  parsed.pathname = parsed.pathname.replace(/\/+$/u, '') || '/'
  parsed.search = ''
  parsed.hash = ''
  return parsed.toString().replace(/\/$/u, '')
}

function connectToServer(input: HTMLInputElement, error: HTMLElement): void {
  try {
    const serverUrl = normalizeServerUrl(input.value)
    saveServerUrl(serverUrl)
    window.location.replace(serverUrl)
  } catch (cause) {
    error.textContent = cause instanceof Error ? cause.message : 'Invalid server address.'
    error.hidden = false
    input.focus()
  }
}

export function renderNativeServerConnector(): void {
  const savedServerUrl = readSavedServerUrl()
  const initialServerUrl = savedServerUrl || DEFAULT_SERVER_URL

  document.documentElement.classList.add('native-server-connector-root')
  document.body.innerHTML = `
    <main class="native-server-connector">
      <section class="native-server-panel" aria-labelledby="native-server-title">
        <div class="native-server-mark">Codex UI</div>
        <h1 id="native-server-title">Connect to Codex UI</h1>
        <p class="native-server-copy">Choose the codexui server this APK should open.</p>
        <label class="native-server-label" for="native-server-url">Server address</label>
        <input id="native-server-url" class="native-server-input" type="url" inputmode="url" autocomplete="url" spellcheck="false" />
        <p id="native-server-error" class="native-server-error" hidden></p>
        <div class="native-server-actions">
          <button id="native-server-connect" class="native-server-primary" type="button">Connect</button>
          <button id="native-server-default" class="native-server-secondary" type="button">Use default</button>
        </div>
        <p class="native-server-note">The app remembers the last address. Reopen the APK to switch servers.</p>
      </section>
    </main>
  `

  const input = document.getElementById('native-server-url') as HTMLInputElement | null
  const error = document.getElementById('native-server-error') as HTMLElement | null
  const connect = document.getElementById('native-server-connect')
  const defaultButton = document.getElementById('native-server-default')
  if (!input || !error || !connect || !defaultButton) return

  input.value = initialServerUrl
  input.select()
  connect.addEventListener('click', () => connectToServer(input, error))
  defaultButton.addEventListener('click', () => {
    input.value = DEFAULT_SERVER_URL
    connectToServer(input, error)
  })
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      connectToServer(input, error)
    }
  })
}
