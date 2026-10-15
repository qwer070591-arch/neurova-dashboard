import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useSettingsStore } from './stores/settings'
import { useUiStore } from './stores/ui'

const pinia = createPinia()
useUiStore(pinia).initialize()
useSettingsStore(pinia).initialize()
createApp(App).use(pinia).use(router).mount('#app')
