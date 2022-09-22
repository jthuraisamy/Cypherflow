import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/0-0-0-0-0-0-0-0-0',
    },
    {
      path: '/:board([012]-[012]-[012]-[012]-[012]-[012]-[012]-[012]-[012])',
      name: 'home',
      component: HomeView,
    },
  ],
});

export default router;
