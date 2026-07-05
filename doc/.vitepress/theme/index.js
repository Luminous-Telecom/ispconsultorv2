import DefaultTheme from 'vitepress/theme'
import DocHub from './components/DocHub.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('DocHub', DocHub)
  }
}
