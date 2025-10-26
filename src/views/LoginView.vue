<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const errorMessage = ref('');

async function handleLogin() {
  errorMessage.value = '';

  if (!email.value || !password.value) {
    errorMessage.value = 'Please enter both email and password';
    return;
  }

  try {
    await authStore.login(email.value, password.value);
    router.push('/collections');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Login failed';
  }
}
</script>

<template>
  <div class="min-h-[70vh] flex items-center justify-center px-4">
    <div class="card w-full max-w-md bg-base-100 shadow-lg">
      <div class="card-body space-y-6">
        <div>
          <h1 class="card-title text-2xl">Login</h1>
          <p class="text-sm text-base-content/70">Enter your credentials to continue.</p>
        </div>

        <div v-if="errorMessage" class="alert alert-error">
          <span>{{ errorMessage }}</span>
        </div>

        <form class="space-y-4" @submit.prevent="handleLogin">
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Email</legend>
            <input
              id="email"
              v-model="email"
              class="input input-bordered"
              type="email"
              placeholder="user@example.com"
              required
            />
          </fieldset>

          <fieldset class="fieldset">
            <legend class="fieldset-legend">Password</legend>
            <input
              id="password"
              v-model="password"
              class="input input-bordered"
              type="password"
              placeholder="••••••••"
              required
            />
          </fieldset>

          <button
            class="btn btn-primary w-full"
            type="submit"
            :disabled="authStore.loading"
          >
            <span
              v-if="authStore.loading"
              class="loading loading-spinner loading-xs mr-2"
            ></span>
            Login
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
