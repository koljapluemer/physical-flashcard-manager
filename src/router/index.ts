import { createRouter, createWebHistory } from 'vue-router';
import { isAuthenticated } from '../api/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/collections',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/collections',
      name: 'collections',
      component: () => import('../views/CollectionsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/collections/:id',
      name: 'collectionDetail',
      component: () => import('../views/CollectionDetailView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/collections/:id/card/:cardId',
      name: 'cardEditor',
      component: () => import('../views/CardEditorView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach((to, _from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    next({ name: 'login' });
  } else if (to.name === 'login' && isAuthenticated()) {
    next({ name: 'collections' });
  } else {
    next();
  }
});

export default router;
