<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import * as collectionsApi from '../api/collections';
import * as flashcardsApi from '../api/flashcards';
import * as renderApi from '../api/render';
import { downloadPdfBlob, generatePdfFilename } from '../utils/pdfExport';
import { useSettingsStore } from '../stores/settings';
import CollectionEdit from '../components/CollectionEdit.vue';
import type { Collection } from '../types';

const router = useRouter();
const settingsStore = useSettingsStore();

const collections = ref<Collection[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const exportingCollectionId = ref<number | null>(null);

const modalState = reactive({
  open: false,
  mode: 'create' as 'create' | 'edit',
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
  editingId: null as number | null,
});

const hasCollections = computed(() => collections.value.length > 0);

async function loadCollections() {
  loading.value = true;
  error.value = null;

  try {
    collections.value = await collectionsApi.getCollections();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to load collections';
  } finally {
    loading.value = false;
  }
}

function openCollection(id: number) {
  router.push({ name: 'collectionDetail', params: { id } });
}

function openCreateModal() {
  modalState.mode = 'create';
  modalState.editingId = null;
  modalState.initial.title = '';
  modalState.initial.description = '';
  modalState.initial.header_color = '#100e75';
  modalState.initial.background_color = '#f0f0f0';
  modalState.initial.font_color = '#171717';
  modalState.initial.header_font_color = '#ffffff';
  modalState.initial.header_text_left = '';
  modalState.open = true;
}

function openEditModal(collection: Collection) {
  modalState.mode = 'edit';
  modalState.editingId = collection.id;
  modalState.initial.title = collection.title;
  modalState.initial.description = collection.description ?? '';
  modalState.initial.header_color = collection.header_color ?? '#100e75';
  modalState.initial.background_color = collection.background_color ?? '#f0f0f0';
  modalState.initial.font_color = collection.font_color ?? '#171717';
  modalState.initial.header_font_color = collection.header_font_color ?? '#ffffff';
  modalState.initial.header_text_left = collection.header_text_left ?? '';
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
  if (!payload.title.trim()) {
    return;
  }

  modalState.loading = true;

  try {
    if (modalState.mode === 'create') {
      await collectionsApi.createCollection({
        title: payload.title,
        description: payload.description || undefined,
        header_color: payload.header_color,
        background_color: payload.background_color,
        font_color: payload.font_color,
        header_font_color: payload.header_font_color,
        header_text_left: payload.header_text_left || undefined,
      });
    } else if (modalState.editingId != null) {
      await collectionsApi.updateCollection(modalState.editingId, {
        title: payload.title,
        description: payload.description || undefined,
        header_color: payload.header_color,
        background_color: payload.background_color,
        font_color: payload.font_color,
        header_font_color: payload.header_font_color,
        header_text_left: payload.header_text_left || undefined,
      });
    }
    await loadCollections();
    closeModal();
  } catch (err) {
    console.error('Failed to save collection', err);
    window.alert(err instanceof Error ? err.message : 'Unable to save collection');
  } finally {
    modalState.loading = false;
  }
}

async function removeCollection(id: number) {
  if (!window.confirm('Delete collection and all flashcards?')) {
    return;
  }

  try {
    await collectionsApi.deleteCollection(id);
    await loadCollections();
  } catch (err) {
    console.error('Failed to delete collection', err);
    window.alert(err instanceof Error ? err.message : 'Unable to delete collection');
  }
}

function formatTimestamp(value?: string | number | Date | null) {
  if (!value) {
    return '—';
  }
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

async function exportCollectionPdf(collection: Collection) {
  exportingCollectionId.value = collection.id;

  try {
    const flashcards = await flashcardsApi.getFlashcards(collection.id);

    if (flashcards.length === 0) {
      window.alert('This collection has no flashcards to export');
      return;
    }

    const blob = await renderApi.exportCollectionToPdf(
      collection,
      flashcards,
      settingsStore.cardWidthMm,
      settingsStore.cardHeightMm
    );
    const filename = generatePdfFilename(collection.title);
    downloadPdfBlob(blob, filename);
  } catch (err) {
    window.alert(err instanceof Error ? err.message : 'Failed to export PDF');
  } finally {
    exportingCollectionId.value = null;
  }
}

onMounted(() => {
  void loadCollections();
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-3xl font-semibold">Collections</h1>
        <p class="text-base-content/70 mt-1 text-sm">Create, edit, and export your study decks.</p>
      </div>
      <button class="btn btn-primary" type="button" @click="openCreateModal">
        New Collection
      </button>
    </div>

    <div v-if="error" class="alert alert-error">
      <span>{{ error }}</span>
    </div>

    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-dots text-primary"></span>
        </div>

        <div v-else-if="!hasCollections" class="py-10 text-center text-base-content/70">
          No collections yet. Click "New Collection" to get started.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Title</th>
                <th>Description</th>
                <th>Updated</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="collection in collections" :key="collection.id">
                <td class="align-top font-semibold">
                  {{ collection.title }}
                </td>
                <td class="align-top text-sm text-base-content/80">
                  {{ collection.description || '—' }}
                </td>
                <td class="align-top text-sm text-base-content/70">
                  {{ formatTimestamp(collection.updated_at) }}
                </td>
                <td class="align-top text-right">
                  <div class="flex flex-wrap gap-2 justify-end">
                    <button class="btn btn-sm btn-outline" type="button" @click="openCollection(collection.id)">
                      Manage
                    </button>
                    <button
                      class="btn btn-sm btn-ghost"
                      type="button"
                      @click="exportCollectionPdf(collection)"
                      :disabled="exportingCollectionId === collection.id"
                    >
                      <span
                        v-if="exportingCollectionId === collection.id"
                        class="loading loading-spinner loading-xs mr-2"
                      ></span>
                      Export
                    </button>
                    <button class="btn btn-sm btn-ghost" type="button" @click="openEditModal(collection)">
                      Edit
                    </button>
                    <button class="btn btn-sm btn-error btn-ghost" type="button" @click="removeCollection(collection.id)">
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

    <CollectionEdit
      :open="modalState.open"
      :mode="modalState.mode"
      :initial-values="modalState.initial"
      :loading="modalState.loading"
      @close="closeModal"
      @submit="handleCollectionSubmit"
    />
  </div>
</template>
