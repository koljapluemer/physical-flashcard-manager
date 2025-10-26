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
  <div class="login-view">
    <div class="columns is-centered">
      <div class="column is-5-tablet is-4-desktop">
        <div class="box">
          <h1 class="title">Login</h1>

          <article class="message is-danger" v-if="errorMessage">
            <div class="message-body">
              {{ errorMessage }}
            </div>
          </article>

          <form @submit.prevent="handleLogin">
            <div class="field">
              <label class="label" for="email">Email</label>
              <div class="control">
                <input
                  id="email"
                  v-model="email"
                  class="input"
                  type="email"
                  placeholder="user@example.com"
                  required
                />
              </div>
            </div>

            <div class="field">
              <label class="label" for="password">Password</label>
              <div class="control">
                <input
                  id="password"
                  v-model="password"
                  class="input"
                  type="password"
                  placeholder="Password"
                  required
                />
              </div>
            </div>

            <div class="field">
              <div class="control">
                <button
                  class="button is-primary is-fullwidth"
                  type="submit"
                  :disabled="authStore.loading"
                  :class="{ 'is-loading': authStore.loading }"
                >
                  Login
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
