import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import i18nConfig from './i18n'
import './styles.css'
import PrimeVue from 'primevue/config'
import Lara from '@primeuix/themes/lara';
import './registerServiceWorker'

const i18n = createI18n(i18nConfig)

const app = createApp(App)
app.use(i18n);
app.use(PrimeVue, {
    theme: {
        preset: Lara,
        options: {
            darkModeSelector: false || 'none'
        }

    }
});
app.mount('#app');

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then((registration) => {
    console.log('Service Worker registrado:', registration)
  }).catch((error) => {
    console.log('Error al registrar el Service Worker:', error)
  })
}

export default {
  base: process.env.NODE_ENV === 'production'
    ? '/visor_ope_enfermeria_gva_2022/'
    : './',
}