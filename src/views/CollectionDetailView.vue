<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import * as collectionsApi from '../api/collections';
import * as flashcardsApi from '../api/flashcards';
import * as renderApi from '../api/render';
import { downloadPdfBlob, generatePdfFilename } from '../utils/pdfExport';
import { useSettingsStore } from '../stores/settings';
import CardPreview from '../components/CardPreview.vue';
import CollectionEdit from '../components/CollectionEdit.vue';
import CollectionMetaData from '../components/CollectionMetaData.vue';
import CollectionCollapsibleMaterials from '../components/CollectionCollapsibleMaterials.vue';
import CollectionCollapsibleTools from '../components/CollectionCollapsibleTools.vue';
import CollectionCollapsibleFlashcards from '../components/CollectionCollapsibleFlashcards.vue';
import CollectionCollapsibleDangerZone from '../components/CollectionCollapsibleDangerZone.vue';
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
const deletingCollection = ref(false);
const previewModalRef = ref<HTMLDialogElement | null>(null);
const previewCard = ref<Flashcard | null>(null);
const previewSide = ref<'front' | 'back'>('front');

const modalState = reactive({
  open: false,
  loading: false,
  initial: {
    title: '',
    description: '',
    header_color: '#100e75',
    background_color: '#f0f0f0',
    font_color: '#171717',
    header_font_color: '#ffffff',
    header_text_left: '',
  },
});

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

function openEditModal() {
  if (!collection.value) {
    return;
  }
  modalState.initial.title = collection.value.title;
  modalState.initial.description = collection.value.description ?? '';
  modalState.initial.header_color = collection.value.header_color ?? '#100e75';
  modalState.initial.background_color = collection.value.background_color ?? '#f0f0f0';
  modalState.initial.font_color = collection.value.font_color ?? '#171717';
  modalState.initial.header_font_color = collection.value.header_font_color ?? '#ffffff';
  modalState.initial.header_text_left = collection.value.header_text_left ?? '';
  modalState.open = true;
}

function closeModal() {
  modalState.open = false;
}

async function handleCollectionSubmit(payload: {
  title: string;
  description: string;
  header_color: string;
  background_color: string;
  font_color: string;
  header_font_color: string;
  header_text_left: string;
}) {
  if (!collection.value) {
    return;
  }
  modalState.loading = true;
  try {
    const updated = await collectionsApi.updateCollection(collection.value.id, {
      title: payload.title,
      description: payload.description || undefined,
      header_color: payload.header_color,
      background_color: payload.background_color,
      font_color: payload.font_color,
      header_font_color: payload.header_font_color,
      header_text_left: payload.header_text_left || undefined,
    });
    collection.value = updated;
    closeModal();
  } catch (err) {
    window.alert(err instanceof Error ? err.message : 'Unable to update collection');
  } finally {
    modalState.loading = false;
  }
}

async function removeCollection() {
  if (!collection.value) {
    return;
  }
  if (!window.confirm('Delete collection and all flashcards?')) {
    return;
  }
  deletingCollection.value = true;
  try {
    await collectionsApi.deleteCollection(collection.value.id);
    router.push({ name: 'collections' });
  } catch (err) {
    window.alert(err instanceof Error ? err.message : 'Unable to delete collection');
  } finally {
    deletingCollection.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <div v-if="error" class="alert alert-error">
      <span>{{ error }}</span>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <span class="loading loading-dots text-primary"></span>
    </div>

    <div v-else-if="!error" class="space-y-4">
      <CollectionMetaData :collection="collection" @edit="openEditModal" />

      <CollectionCollapsibleMaterials :collection="collection" />

      <CollectionCollapsibleTools
        :collection="collection"
        :flashcards="cards"
        :disabled="!collection || !cards.length || exportingPdf"
        :loading="exportingPdf"
        @download="exportPdf"
        @created="loadData"
      />

      <CollectionCollapsibleFlashcards
        :collection="collection"
        :flashcards="cards"
        :loading="loading"
        @preview="openPreview"
        @edit="openCard"
        @delete="deleteCard"
        @create="createCard"
      />

      <CollectionCollapsibleDangerZone :loading="deletingCollection" @remove="removeCollection" />
    </div>

    <CollectionEdit
      :open="modalState.open"
      mode="edit"
      :initial-values="modalState.initial"
      :loading="modalState.loading"
      @close="closeModal"
      @submit="handleCollectionSubmit"
    />

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
            <button class="btn btn-sm " type="submit" @click="closePreview">Close</button>
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
