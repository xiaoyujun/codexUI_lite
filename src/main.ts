import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css'
import { t } from './composables/useUiLanguage'
import { initializeCompletionNotifications } from './native/completionNotifications'
import { renderNativeServerConnector, shouldShowNativeServerConnector } from './native/serverConnection'

console.log('Welcome to codexui. github: https://github.com/friuns2/codexUI')

if (shouldShowNativeServerConnector()) {
  renderNativeServerConnector()
} else {
  createApp(App).use(router).mount('#app')
  void initializeCompletionNotifications()
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error(t('Service worker registration failed.'), error)
    })
  })
}
