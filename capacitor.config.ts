import type { CapacitorConfig } from '@capacitor/cli'

const androidServerUrl = process.env.CAPACITOR_SERVER_URL?.trim()

const config: CapacitorConfig = {
  appId: 'com.codexui.app',
  appName: 'Codex UI',
  webDir: 'dist',
  server: androidServerUrl
    ? {
        url: androidServerUrl,
        cleartext: androidServerUrl.startsWith('http://'),
      }
    : {
        androidScheme: 'https',
      },
  plugins: {
    LocalNotifications: {
      iconColor: '#2563eb',
    },
  },
}

export default config
