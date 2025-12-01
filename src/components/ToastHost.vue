<script setup lang="ts">
import type { Component } from 'vue';
import { storeToRefs } from 'pinia';
import { AlertCircle, CheckCircle2, Info, Triangle, X } from 'lucide-vue-next';
import { useToastStore, type ToastVariant } from '../stores/toast';

const toastStore = useToastStore();
const { toasts } = storeToRefs(toastStore);

const variantClasses: Record<ToastVariant, string> = {
  info: 'alert-info',
  success: 'alert-success',
  warning: 'alert-warning',
  error: 'alert-error',
};

const variantIcons: Record<ToastVariant, Component> = {
  info: Info,
  success: CheckCircle2,
  warning: Triangle,
  error: AlertCircle,
};
</script>

<template>
  <div v-if="toasts.length" class="toast toast-top toast-end z-50">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="alert gap-3 shadow-lg"
      :class="variantClasses[toast.variant]"
    >
      <component :is="variantIcons[toast.variant]" class="h-5 w-5" />
      <span class="font-medium">{{ toast.message }}</span>
      <button class="btn btn-ghost btn-xs" type="button" @click="toastStore.dismiss(toast.id)">
        <X class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
