<script setup lang="ts">
import { computed } from 'vue';
import { ChevronDown, ChevronUp, Pencil, Star, Trash2 } from 'lucide-vue-next';
import CardPreview from './CardPreview.vue';
import type { Collection, Flashcard } from '../types';

const props = defineProps<{
  collection: Collection | null;
  flashcards: Flashcard[];
  loading?: boolean;
  includedCardIds?: Set<number>;
}>();

const hasCards = computed(() => props.flashcards.length > 0);

const emit = defineEmits<{
  (e: 'preview', card: Flashcard, side: 'front' | 'back'): void;
  (e: 'edit', cardId: number): void;
  (e: 'delete', cardId: number): void;
  (e: 'create'): void;
  (e: 'toggleInclude', cardId: number): void;
  (e: 'moveUp', cardId: number): void;
  (e: 'moveDown', cardId: number): void;
  (e: 'toggleFavorite', cardId: number): void;
}>();

function isIncluded(cardId: number): boolean {
  return props.includedCardIds?.has(cardId) ?? true;
}

function toggleInclude(cardId: number): void {
  emit('toggleInclude', cardId);
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
              <th class="w-16">
                <span class="text-xs">Print</span>
              </th>
              <th>Front</th>
              <th>Back</th>
              <th class="text-right w-full">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="card in flashcards"
              :key="card.id"
              :class="{ 'opacity-40': !isIncluded(card.id) }"
            >
              <td class="align-top">
                <input
                  type="checkbox"
                  class="checkbox checkbox-sm"
                  :checked="isIncluded(card.id)"
                  @change="toggleInclude(card.id)"
                  aria-label="Include in print"
                />
              </td>
              <td class="align-top">
                <button
                  type="button"
                  class="transition hover:scale-[1.02] cursor-pointer"
                  @click="emit('preview', card, 'front')"
                >
                  <CardPreview
                    :markdown="card.front"
                    side="front"
                    :front-only="true"
                    :collection="collection ?? undefined"
                    :flashcard="card"
                    :scale="0.35"
                  />
                </button>
              </td>
              <td class="align-top">
                <button
                  type="button"
                  class="transition hover:scale-[1.02] cursor-pointer"
                  @click="emit('preview', card, 'back')"
                >
                  <CardPreview
                    :markdown="card.back"
                    side="back"
                    :collection="collection ?? undefined"
                    :flashcard="card"
                    :scale="0.35"
                  />
                </button>
              </td>
              <td class="align-top">
                <div class="flex justify-end gap-2">
                  <div class="flex flex-col gap-1">
                    <button
                      class="btn btn-square btn-xs btn-ghost"
                      type="button"
                      aria-label="Move card up"
                      :disabled="flashcards.indexOf(card) === 0"
                      @click="emit('moveUp', card.id)"
                    >
                      <ChevronUp :size="14" />
                    </button>
                    <button
                      class="btn btn-square btn-xs btn-ghost"
                      type="button"
                      aria-label="Move card down"
                      :disabled="flashcards.indexOf(card) === flashcards.length - 1"
                      @click="emit('moveDown', card.id)"
                    >
                      <ChevronDown :size="14" />
                    </button>
                  </div>
                  <button
                    class="btn btn-square btn-sm"
                    :class="card.is_favorite ? 'btn-warning' : 'btn-ghost'"
                    type="button"
                    aria-label="Toggle favorite"
                    @click="emit('toggleFavorite', card.id)"
                  >
                    <Star :size="16" :fill="card.is_favorite ? 'currentColor' : 'none'" />
                  </button>
                  <button class="btn btn-square btn-sm" type="button" aria-label="Edit card"
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
