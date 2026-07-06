import DefaultTheme from 'vitepress/theme'
import DocHub from './components/DocHub.vue'
import './custom.css'

function syncDocRouteClass(path) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle(
    'isp-doc-route',
    path === '/doc' || path.startsWith('/doc/')
  )
}

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router }) {
    app.component('DocHub', DocHub)

    if (typeof window !== 'undefined') {
      syncDocRouteClass(window.location.pathname)

      const prevOnBeforeRouteChange = router.onBeforeRouteChange
      router.onBeforeRouteChange = (href) => {
        try {
          syncDocRouteClass(new URL(href, window.location.origin).pathname)
        } catch {
          /* ignore */
        }
        return prevOnBeforeRouteChange?.(href)
      }
    }
  }
}
