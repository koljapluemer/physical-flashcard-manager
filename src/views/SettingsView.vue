<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';

const settingsStore = useSettingsStore();
const authStore = useAuthStore();
const router = useRouter();

const handleLogout = () => {
  authStore.logout();
  router.push({ name: 'login' });
};
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-semibold">Settings</h1>

    <div class="card bg-base-100 shadow">
      <div class="card-body space-y-4">
        <h2 class="card-title text-xl">AI Generation</h2>
        <div class="grid gap-4 md:grid-cols-[1.5fr_auto] md:items-end">
          <fieldset class="fieldset">
            <label for="openai-api-key" class="label">OpenAI API Key</label>
            <input
              id="openai-api-key"
              v-model="settingsStore.openaiApiKey"
              type="password"
              class="input"
              placeholder="sk-..."
              autocomplete="off"
            />
          </fieldset>
          <p class="text-base-content/70">
            Stored locally. Required when generating cards with AI.
          </p>
        </div>
      </div>
    </div>

    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="card-title text-xl">Account</h2>
            <p class="text-sm text-base-content/70">Log out of your current session.</p>
          </div>
          <button class="btn" type="button" @click="handleLogout">Log out</button>
        </div>
      </div>
    </div>
  </div>
</template>
