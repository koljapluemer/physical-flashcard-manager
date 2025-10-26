<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import * as collectionsApi from '../api/collections';
import * as flashcardsApi from '../api/flashcards';
import type { Collection, Flashcard } from '../types';

const props = defineProps<{
  id: string;
}>();

const router = useRouter();

const collection = ref<Collection | null>(null);
const cards = ref<Flashcard[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

async function loadData() {
  loading.value = true;
  error.value = null;

  try {
    const collectionId = parseInt(props.id, 10);
    const [collectionData, flashcardsData] = await Promise.all([
      collectionsApi.getCollection(collectionId),
      flashcardsApi.getFlashcards(collectionId),
    ]);
    collection.value = collectionData;
    cards.value = flashcardsData;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to load data';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});

watch(
  () => props.id,
  () => {
    loadData();
  },
);

function openCard(cardId: number | string) {
  router.push({ name: 'cardEditor', params: { id: props.id, cardId: String(cardId) } });
}

function createCard() {
  openCard('new');
}

async function deleteCard(cardId: number) {
  if (window.confirm('Delete this flashcard?')) {
    try {
      await flashcardsApi.deleteFlashcard(cardId);
      await loadData();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete flashcard');
    }
  }
}
</script>

<template>
  <div>
    <button class="button is-light mb-4" type="button" @click="$router.back()">Back</button>
    <div class="level">
      <div class="level-left">
        <div>
          <h1 class="title mb-1">{{ collection?.title || 'Collection' }}</h1>
          <p class="subtitle" v-if="collection?.description">{{ collection.description }}</p>
        </div>
      </div>
      <div class="level-right">
        <div class="buttons">
          <button class="button is-primary" type="button" @click="createCard">
            New Flashcard
          </button>
        </div>
      </div>
    </div>

    <article class="message is-danger" v-if="error">
      <div class="message-body">
        {{ error }}
      </div>
    </article>

    <p v-if="loading">Loading flashcards…</p>
    <p v-else-if="!cards.length">No flashcards yet. Create one to get started.</p>

    <div class="card-grid" v-if="cards.length">
      <div class="flashcard-preview" v-for="card in cards" :key="card.id">
        <h3 class="title is-5">Card Preview</h3>
        <div class="card-face card-face--front">
          <p class="card-face-title">Front</p>
          <div v-html="card.front"></div>
        </div>
        <div class="card-face card-face--back">
          <p class="card-face-title">Back</p>
          <div v-html="card.back"></div>
        </div>
        <div class="buttons mt-3 is-right">
          <button class="button is-link is-light is-small" type="button" @click="openCard(card.id)">
            Edit
          </button>
          <button class="button is-danger is-light is-small" type="button" @click="deleteCard(card.id)">
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
