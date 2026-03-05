import { createRouter, createWebHistory } from 'vue-router';
import { hasSession } from '../api/auth';

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
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach(async (to) => {
  const authenticated = await hasSession();

  if (to.meta.requiresAuth && !authenticated) {
    return { name: 'login' };
  }

  if (to.name === 'login' && authenticated) {
    return { name: 'collections' };
  }

  return true;
});

export default router;
