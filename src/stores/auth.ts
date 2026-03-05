import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Session } from '@supabase/supabase-js';
import * as authApi from '../api/auth';

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const initialized = ref(false);

  let unsubscribeAuthListener: (() => void) | null = null;

  const token = computed(() => session.value?.access_token ?? null);
  const userEmail = computed(() => session.value?.user?.email ?? null);
  const isAuthenticated = computed(() => Boolean(session.value));

  function applySession(nextSession: Session | null) {
    session.value = nextSession;
  }

  async function init() {
    if (initialized.value) {
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const currentSession = await authApi.getSession();
      applySession(currentSession);
      unsubscribeAuthListener = authApi.onAuthStateChange((nextSession) => {
        applySession(nextSession);
      });
      initialized.value = true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to initialize auth';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function login(email: string, password: string) {
    loading.value = true;
    error.value = null;

    try {
      await authApi.login(email, password);
      const currentSession = await authApi.getSession();
      applySession(currentSession);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Login failed';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function signup(email: string, password: string): Promise<authApi.SignupResult> {
    loading.value = true;
    error.value = null;

    try {
      const result = await authApi.signup(email, password);
      const currentSession = await authApi.getSession();
      applySession(currentSession);
      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Sign-up failed';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    loading.value = true;
    error.value = null;

    try {
      await authApi.logout();
      applySession(null);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Logout failed';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function dispose() {
    if (unsubscribeAuthListener) {
      unsubscribeAuthListener();
      unsubscribeAuthListener = null;
    }
  }

  return {
    session,
    token,
    userEmail,
    loading,
    error,
    initialized,
    isAuthenticated,
    init,
    login,
    signup,
    logout,
    dispose,
  };
});
