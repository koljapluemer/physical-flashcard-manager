<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useAuthStore } from './stores/auth';
import ToastHost from './components/ToastHost.vue';

const authStore = useAuthStore();
const route = useRoute();
</script>

<template>
  <div class="min-h-screen bg-base-200 text-base-content">
    <nav class="navbar">
      <RouterLink class="nav-brand" to="/collections">Flashcard Manager</RouterLink>
      <div class="flex-none flex">
        <RouterLink
          class="nav-link"
          to="/collections"
          :class="{ 'nav-link-active': route.path.startsWith('/collections') }"
        >
          Collections
        </RouterLink>
        <RouterLink
          v-if="authStore.isAuthenticated"
          class="nav-link"
          to="/settings"
          :class="{ 'nav-link-active': route.path === '/settings' }"
        >
          Settings
        </RouterLink>
      </div>
    </nav>

    <main class="py-6 px-4 sm:px-8">
      <div class="mx-auto w-full max-w-6xl">
        <RouterView />
      </div>
    </main>

    <ToastHost />
  </div>
</template>
