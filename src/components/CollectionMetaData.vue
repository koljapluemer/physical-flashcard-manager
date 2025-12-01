<script setup lang="ts">
import { Pencil } from 'lucide-vue-next';
import type { Collection } from '../types';

const props = defineProps<{
  collection: Collection | null;
}>();

const emit = defineEmits<{
  (e: 'edit'): void;
}>();

function handleEdit() {
  emit('edit');
}
</script>

<template>
    <div class="space-y-3">
      <div class="flex items-center gap-3">
        <button class="btn btn-square " type="button" aria-label="Edit collection" @click="handleEdit">
          <Pencil :size="20" />
        </button>
        <h1 class="text-3xl font-semibold">
          {{ props.collection?.title || 'Collection' }}
        </h1>
      </div>
      <p class="text-base-content/70">
        {{ props.collection?.description || 'Add a description so you remember what this set is about.' }}
      </p>
    </div>
</template>
