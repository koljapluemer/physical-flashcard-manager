import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
};

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<ToastItem[]>([]);

  const dismiss = (id: number) => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  };

  const push = (message: string, variant: ToastVariant = 'info', duration = 3600) => {
    const id = Date.now() + Math.random();
    toasts.value.push({ id, message, variant });
    window.setTimeout(() => dismiss(id), duration);
  };

  return {
    toasts,
    push,
    dismiss,
  };
});
