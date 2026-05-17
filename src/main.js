import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import router from './router' 

import pt from './locales/pt.json'
import en from './locales/en.json'

const i18n = createI18n({
  legacy: false,
  locale: 'pt',
  fallbackLocale: 'en',
  messages: {
    pt: pt,
    en: en
  }
})

const app = createApp(App)

app.use(i18n)   
app.use(router) 
app.mount('#app')