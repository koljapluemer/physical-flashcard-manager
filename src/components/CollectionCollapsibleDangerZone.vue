<script setup lang="ts">
const { loading = false } = defineProps<{
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'remove'): void;
}>();

function handleDelete() {
  emit('remove');
}
</script>

<template>
  <div class="collapse collapse-arrow bg-base-100 shadow">
    <input type="checkbox" />
    <div class="collapse-title text-lg font-semibold text-error">Danger Zone</div>
    <div class="collapse-content space-y-3">
      <p class="text-base-content/70">
        Deleting a collection removes all flashcards in it. This cannot be undone.
      </p>
      <button
        class="btn btn-error"
        type="button"
        :disabled="loading"
        @click="handleDelete"
      >
        <span v-if="loading" class="loading loading-spinner loading-xs mr-2"></span>
        Delete Collection
      </button>
    </div>
  </div>
</template>
