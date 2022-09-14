import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHashHistory } from 'vue-router';
import { apolloProvider } from './graphql/ApolloProvider';
import 'semantic-ui-css/semantic.min.css';
import './style.css';
import App from './App.vue';

// Create application.
const app = createApp(App);

// Use Pinia.
app.use(createPinia());

// Use Vue Router.
app.use(
  createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/', component: App },
      { path: '/:graphId', component: App },
    ],
  })
);

// Use Apollo Client.
app.use(apolloProvider);

// Add focus directive.
app.directive('focus', {
  mounted(el) {
    el.focus();
  },
});

// Mount application.
app.mount('#app');
