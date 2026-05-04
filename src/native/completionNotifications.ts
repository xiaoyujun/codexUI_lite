import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

const CHANNEL_ID = 'codex-turn-completions'
const WEB_PERMISSION_PROMPT_KEY = 'codex-web-local.completion-notifications.prompted.v1'

let nativePermissionReady: Promise<boolean> | null = null
let nativeChannelReady: Promise<void> | null = null
let nextNotificationId = Date.now() % 100000

type CompletionNotificationOptions = {
  threadTitle?: string
  durationMs?: number
  failed?: boolean
}

function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

function formatDuration(durationMs?: number): string {
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs <= 0) {
    return ''
  }

  const seconds = Math.max(1, Math.round(durationMs / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`
}

function canUseWebNotifications(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

async function ensureNativePermission(): Promise<boolean> {
  if (!nativePermissionReady) {
    nativePermissionReady = (async () => {
      const current = await LocalNotifications.checkPermissions()
      if (current.display === 'granted') return true

      const requested = await LocalNotifications.requestPermissions()
      return requested.display === 'granted'
    })().catch((error) => {
      console.warn('Failed to request local notification permission.', error)
      return false
    })
  }

  return nativePermissionReady
}

async function ensureNativeChannel(): Promise<void> {
  if (!nativeChannelReady) {
    nativeChannelReady = LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Codex task completions',
      description: 'Notifications when Codex finishes a turn.',
      importance: 4,
      visibility: 1,
      vibration: true,
    }).catch((error) => {
      console.warn('Failed to create local notification channel.', error)
    })
  }

  return nativeChannelReady
}

async function showWebNotification(title: string, body: string): Promise<void> {
  if (!canUseWebNotifications()) return

  if (Notification.permission === 'default') {
    const hasPrompted = window.localStorage.getItem(WEB_PERMISSION_PROMPT_KEY) === 'true'
    if (hasPrompted) return
    window.localStorage.setItem(WEB_PERMISSION_PROMPT_KEY, 'true')
    await Notification.requestPermission()
  }

  if (Notification.permission !== 'granted') return

  const registration = await navigator.serviceWorker?.ready.catch(() => null)
  if (registration) {
    await registration.showNotification(title, {
      body,
      tag: 'codex-turn-completed',
    })
    return
  }

  new Notification(title, { body, tag: 'codex-turn-completed' })
}

export async function initializeCompletionNotifications(): Promise<void> {
  if (isNativeApp()) {
    await ensureNativePermission()
    await ensureNativeChannel()
  }
}

export async function notifyTurnCompleted(options: CompletionNotificationOptions): Promise<void> {
  const duration = formatDuration(options.durationMs)
  const threadTitle = options.threadTitle?.trim() || 'Current thread'
  const title = options.failed ? 'Codex task failed' : 'Codex task completed'
  const body = duration ? `${threadTitle} finished in ${duration}.` : `${threadTitle} finished.`

  if (isNativeApp()) {
    const permitted = await ensureNativePermission()
    if (!permitted) return
    await ensureNativeChannel()
    nextNotificationId = (nextNotificationId % 2147483000) + 1
    await LocalNotifications.schedule({
      notifications: [
        {
          id: nextNotificationId,
          title,
          body,
          channelId: CHANNEL_ID,
        },
      ],
    })
    return
  }

  if (typeof document !== 'undefined' && document.visibilityState === 'visible') return
  await showWebNotification(title, body)
}
