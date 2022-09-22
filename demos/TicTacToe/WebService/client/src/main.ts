import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';

import 'semantic-ui-css/semantic.min.css';
import './assets/main.css';

// Create Vue application.
const app = createApp(App);

// Use Pinia.
app.use(createPinia());

// Use Vue Router.
app.use(router);

// Add focus directive.
app.directive('focus', {
  mounted(el) {
    el.focus();
  },
});

// Mount application.
app.mount('#app');
