import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as authApi from '../api/auth';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => Boolean(token.value));

  function init() {
    token.value = authApi.getCurrentToken();
  }

  async function login(email: string, password: string) {
    loading.value = true;
    error.value = null;

    try {
      const newToken = await authApi.login(email, password);
      token.value = newToken;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Login failed';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    authApi.logout();
    token.value = null;
  }

  return {
    token,
    loading,
    error,
    isAuthenticated,
    init,
    login,
    logout,
  };
});
