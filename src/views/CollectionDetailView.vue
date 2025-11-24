<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import * as collectionsApi from '../api/collections';
import * as flashcardsApi from '../api/flashcards';
import * as renderApi from '../api/render';
import { downloadPdfBlob, generatePdfFilename } from '../utils/pdfExport';
import { useSettingsStore } from '../stores/settings';
import CardPreview from '../components/CardPreview.vue';
import type { Collection, Flashcard } from '../types';

const props = defineProps<{
  id: string;
}>();

const router = useRouter();
const settingsStore = useSettingsStore();

const collection = ref<Collection | null>(null);
const cards = ref<Flashcard[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const exportingPdf = ref(false);
const previewModalRef = ref<HTMLDialogElement | null>(null);
const previewCard = ref<Flashcard | null>(null);
const previewSide = ref<'front' | 'back'>('front');

const previewHtml = computed(() => {
  if (!previewCard.value) {
    return '';
  }
  return previewSide.value === 'front' ? previewCard.value.front : previewCard.value.back;
});

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

async function exportPdf() {
  if (!collection.value || cards.value.length === 0) {
    return;
  }

  exportingPdf.value = true;

  try {
    const blob = await renderApi.exportCollectionToPdf(
      collection.value,
      cards.value,
      settingsStore.cardWidthMm,
      settingsStore.cardHeightMm
    );
    const filename = generatePdfFilename(collection.value.title);
    downloadPdfBlob(blob, filename);
  } catch (err) {
    window.alert(err instanceof Error ? err.message : 'Failed to export PDF');
  } finally {
    exportingPdf.value = false;
  }
}

function getSnippet(html: string, maxLength = 120): string {
  if (!html) {
    return '—';
  }
  const stripped = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!stripped) {
    return '—';
  }
  return stripped.length > maxLength ? `${stripped.slice(0, maxLength)}…` : stripped;
}

function formatTimestamp(value?: string | number | Date | null): string {
  if (!value) {
    return '—';
  }
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function openPreview(card: Flashcard) {
  previewCard.value = card;
  previewSide.value = 'front';
  previewModalRef.value?.showModal();
}

function closePreview() {
  previewModalRef.value?.close();
  previewCard.value = null;
}

function setPreviewSide(side: 'front' | 'back') {
  previewSide.value = side;
}
</script>

<template>
  <div class="space-y-6">
    <button class="btn btn-ghost w-fit" type="button" @click="$router.back()">Back</button>

    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-3xl font-semibold">{{ collection?.title || 'Collection' }}</h1>
        <p class="text-base-content/70" v-if="collection?.description">{{ collection.description }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="btn btn-primary" type="button" @click="createCard">
          New Flashcard
        </button>
        <button
          class="btn btn-outline"
          type="button"
          @click="exportPdf"
          :disabled="cards.length === 0 || exportingPdf"
        >
          <span
            v-if="exportingPdf"
            class="loading loading-spinner loading-xs mr-2"
          ></span>
          Export PDF
        </button>
      </div>
    </div>

    <div v-if="error" class="alert alert-error">
      <span>{{ error }}</span>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <span class="loading loading-dots text-primary"></span>
    </div>

    <div v-else-if="!cards.length" class="card bg-base-100 shadow">
      <div class="card-body text-center text-base-content/70">
        No flashcards yet. Create one to get started.
      </div>
    </div>

    <div v-else class="card bg-base-100 shadow">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Front</th>
                <th>Back</th>
                <th>Updated</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="card in cards" :key="card.id">
                <td class="align-top text-sm">
                  {{ getSnippet(card.front) }}
                </td>
                <td class="align-top text-sm">
                  {{ getSnippet(card.back) }}
                </td>
                <td class="align-top text-sm text-base-content/70">
                  {{ formatTimestamp(card.updated_at) }}
                </td>
                <td class="align-top">
                  <div class="flex flex-wrap justify-end gap-2">
                    <button class="btn btn-sm btn-ghost" type="button" @click="openPreview(card)">
                      Preview
                    </button>
                    <button class="btn btn-sm" type="button" @click="openCard(card.id)">
                      Edit
                    </button>
                    <button class="btn btn-sm btn-error btn-outline" type="button" @click="deleteCard(card.id)">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <dialog ref="previewModalRef" class="modal" @close="closePreview">
      <div class="modal-box max-w-4xl space-y-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-xl font-semibold">Card Preview</h3>
            <p class="text-sm text-base-content/70" v-if="previewCard">
              {{ collection?.title }} · Card #{{ previewCard.id }}
            </p>
          </div>
          <form method="dialog">
            <button class="btn btn-sm btn-ghost" type="submit" @click="closePreview">Close</button>
          </form>
        </div>

        <div class="btn-group">
          <button
            class="btn btn-sm"
            :class="{ 'btn-active': previewSide === 'front' }"
            type="button"
            @click="setPreviewSide('front')"
          >
            Front
          </button>
          <button
            class="btn btn-sm"
            :class="{ 'btn-active': previewSide === 'back' }"
            type="button"
            @click="setPreviewSide('back')"
          >
            Back
          </button>
        </div>

        <div v-if="previewCard" class="space-y-4">
          <CardPreview
            :html="previewHtml"
            :side="previewSide"
            :collection="collection ?? undefined"
            :flashcard="previewCard"
          />
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closePreview">Close</button>
      </form>
    </dialog>
  </div>
</template>
