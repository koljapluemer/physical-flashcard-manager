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
  <div class="min-h-screen bg-base-200 text-base-content">
    <nav class="navbar bg-base-100 border-b border-base-300">
      <div class="flex-1">
        <RouterLink class="btn btn-ghost text-xl normal-case" to="/collections">
          Flashcard Manager
        </RouterLink>
      </div>
      <div class="flex-none flex gap-2">
        <RouterLink
          class="btn"
          to="/collections"
          :class="{ 'btn-active': route.path.startsWith('/collections') }"
        >
          Collections
        </RouterLink>
        <RouterLink
          v-if="authStore.isAuthenticated"
          class="btn"
          to="/settings"
          :class="{ 'btn-active': route.path === '/settings' }"
        >
          Settings
        </RouterLink>
        <button
          v-if="authStore.isAuthenticated"
          type="button"
          class="btn"
          @click="handleLogout"
        >
          Logout
        </button>
      </div>
    </nav>

    <main class="py-6 px-4 sm:px-8">
      <div class="mx-auto w-full max-w-6xl">
        <RouterView />
      </div>
    </main>
  </div>
</template>
