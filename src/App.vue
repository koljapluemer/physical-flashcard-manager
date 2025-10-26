<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

onMounted(() => {
  authStore.init();
});

function handleLogout() {
  authStore.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <div class="app-shell">
    <nav class="navbar is-dark" role="navigation" aria-label="main navigation">
      <div class="navbar-brand">
        <RouterLink class="navbar-item" to="/collections">
          <span class="has-text-weight-semibold">Flashcard Manager</span>
        </RouterLink>
      </div>
      <div class="navbar-menu is-active">
        <div class="navbar-start">
          <RouterLink
            class="navbar-item"
            to="/collections"
            :class="{ 'is-active': route.path.startsWith('/collections') }"
          >
            Collections
          </RouterLink>
        </div>
        <div class="navbar-end" v-if="authStore.isAuthenticated">
          <div class="navbar-item">
            <button class="button is-light is-small" @click="handleLogout">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>

    <section class="section">
      <div class="container">
        <RouterView />
      </div>
    </section>
  </div>
</template>
