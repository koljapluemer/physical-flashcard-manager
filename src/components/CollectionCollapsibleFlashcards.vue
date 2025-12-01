<script setup lang="ts">
import { computed } from 'vue';
import { Pencil, Trash2 } from 'lucide-vue-next';
import CardPreview from './CardPreview.vue';
import type { Collection, Flashcard } from '../types';

const props = defineProps<{
  collection: Collection | null;
  flashcards: Flashcard[];
  loading?: boolean;
}>();

const hasCards = computed(() => props.flashcards.length > 0);

const emit = defineEmits<{
  (e: 'preview', card: Flashcard): void;
  (e: 'edit', cardId: number): void;
  (e: 'delete', cardId: number): void;
  (e: 'create'): void;
}>();

function getSnippet(html: string, maxLength = 90): string {
  if (!html) {
    return '—';
  }
  const stripped = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!stripped) {
    return '—';
  }
  return stripped.length > maxLength ? `${stripped.slice(0, maxLength)}…` : stripped;
}
</script>

<template>
  <div class="collapse collapse-arrow bg-base-100 shadow">
    <input type="checkbox" checked />
    <div class="collapse-title text-lg font-semibold">Flashcards</div>
    <div class="collapse-content space-y-4">
      <div class="flex justify-end">
        <button class="btn btn-primary" type="button" @click="emit('create')">New Flashcard</button>
      </div>

      <div v-if="loading" class="flex justify-center py-8">
        <span class="loading loading-dots text-primary"></span>
      </div>

      <div v-else-if="!hasCards" class="text-base-content/70">
        No flashcards yet. Create one to get started.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr>
              <th class="w-36">Preview</th>
              <th>Front</th>
              <th>Back</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="card in flashcards" :key="card.id">
              <td class="align-top">
                <button
                  type="button"
                  class="transition-hover hover:shadow-md"
                  @click="emit('preview', card)"
                >
                  <CardPreview
                    :html="card.front"
                    side="front"
                    :front-only="true"
                    :collection="collection ?? undefined"
                    :flashcard="card"
                    :scale="0.35"
                  />
                </button>
              </td>
              <td class="align-top text-sm">
                {{ getSnippet(card.front) }}
              </td>
              <td class="align-top text-sm">
                {{ getSnippet(card.back) }}
              </td>
              <td class="align-top">
                <div class="flex justify-end gap-2">
                  <button class="btn btn-square  btn-sm" type="button" aria-label="Edit card"
                    @click="emit('edit', card.id)">
                    <Pencil :size="16" />
                  </button>
                  <button class="btn btn-square btn-error btn-outline btn-sm" type="button" aria-label="Delete card"
                    @click="emit('delete', card.id)">
                    <Trash2 :size="16" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
