<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import * as collectionsApi from '../api/collections';
import * as flashcardsApi from '../api/flashcards';
import * as renderApi from '../api/render';
import { downloadPdfBlob, generatePdfFilename } from '../utils/pdfExport';
import { useSettingsStore } from '../stores/settings';
import type { Collection } from '../types';

const router = useRouter();
const settingsStore = useSettingsStore();

const collections = ref<Collection[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const exportingCollectionId = ref<number | null>(null);

const newCollection = reactive({
  title: '',
  description: '',
});

const editingId = ref<number | null>(null);
const editForm = reactive({
  title: '',
  description: '',
});

function formatUpdatedAt(value: string | number | Date) {
  if (!value) {
    return '—';
  }
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

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

async function handleCreate() {
  if (!newCollection.title.trim()) {
    return;
  }
  try {
    await collectionsApi.createCollection({
      title: newCollection.title,
      description: newCollection.description || undefined,
    });
    newCollection.title = '';
    newCollection.description = '';
    await loadCollections();
  } catch (err) {
    console.error('Failed to create collection', err);
    window.alert(err instanceof Error ? err.message : 'Unable to create collection');
  }
}

function startEdit(id: number) {
  const collection = collections.value.find((c) => c.id === id);
  if (!collection) {
    return;
  }
  editingId.value = id;
  editForm.title = collection.title;
  editForm.description = collection.description || '';
}

async function saveEdit(id: number) {
  if (!editForm.title.trim()) {
    return;
  }
  try {
    await collectionsApi.updateCollection(id, {
      title: editForm.title,
      description: editForm.description || undefined,
    });
    editingId.value = null;
    await loadCollections();
  } catch (err) {
    console.error('Failed to update collection', err);
    window.alert(err instanceof Error ? err.message : 'Unable to update collection');
  }
}

function cancelEdit() {
  editingId.value = null;
}

async function remove(id: number) {
  if (window.confirm('Delete collection and all flashcards?')) {
    try {
      await collectionsApi.deleteCollection(id);
      await loadCollections();
    } catch (err) {
      console.error('Failed to delete collection', err);
      window.alert(err instanceof Error ? err.message : 'Unable to delete collection');
    }
  }
}

function openCollection(id: number) {
  router.push({ name: 'collectionDetail', params: { id } });
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

onMounted(async () => {
  await loadCollections();
});
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-semibold">Collections</h1>
      <p class="text-base-content/70 mt-1 text-sm">Create, edit, and export your study decks.</p>
    </div>

    <div v-if="error" class="alert alert-error">
      <span>{{ error }}</span>
    </div>

    <div class="card bg-base-100 shadow">
      <div class="card-body space-y-4">
        <div>
          <h2 class="card-title text-xl">Create Collection</h2>
          <p class="text-sm text-base-content/70">Start a new deck with a title and optional description.</p>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <fieldset class="fieldset w-full">
            <legend class="fieldset-legend">Title</legend>
            <input
              id="collection-name"
              v-model="newCollection.title"
              type="text"
              placeholder="Algebra basics"
              class="input input-bordered w-full"
            />
          </fieldset>
          <fieldset class="fieldset w-full md:col-span-2">
            <legend class="fieldset-legend">Description</legend>
            <textarea
              id="collection-description"
              v-model="newCollection.description"
              class="textarea textarea-bordered"
              placeholder="Optional description"
              rows="3"
            ></textarea>
          </fieldset>
        </div>
        <div class="flex justify-end">
          <button
            class="btn btn-primary"
            type="button"
            @click="handleCreate"
            :disabled="!newCollection.title"
          >
            Create
          </button>
        </div>
      </div>
    </div>

    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="card-title text-xl">Your Collections</h2>
            <p class="text-sm text-base-content/70">Manage cards, export PDFs, or edit deck details.</p>
          </div>
        </div>

        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-dots text-primary"></span>
        </div>

        <div v-else-if="!collections.length" class="py-8 text-center text-base-content/70">
          No collections yet. Create one above to get started.
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
                <td class="align-top">
                  <div v-if="editingId === collection.id" class="space-y-2">
                    <fieldset class="fieldset w-full">
                      <legend class="fieldset-legend text-xs">Title</legend>
                      <input v-model="editForm.title" class="input input-bordered input-sm w-full" type="text" />
                    </fieldset>
                  </div>
                  <div v-else class="font-semibold">
                    {{ collection.title }}
                  </div>
                </td>
                <td class="align-top">
                  <div v-if="editingId === collection.id">
                    <fieldset class="fieldset w-full">
                      <legend class="fieldset-legend text-xs">Description</legend>
                      <textarea
                        v-model="editForm.description"
                        class="textarea textarea-bordered textarea-sm w-full"
                        rows="2"
                      ></textarea>
                    </fieldset>
                  </div>
                  <div v-else class="text-sm text-base-content/80">
                    {{ collection.description || '—' }}
                  </div>
                </td>
                <td class="align-top text-sm text-base-content/70">
                  {{ formatUpdatedAt(collection.updated_at) }}
                </td>
                <td class="w-56 align-top">
                  <div v-if="editingId === collection.id" class="flex flex-wrap gap-2 justify-end">
                    <button class="btn btn-sm btn-primary" type="button" @click="saveEdit(collection.id)">
                      Save
                    </button>
                    <button class="btn btn-sm" type="button" @click="cancelEdit">
                      Cancel
                    </button>
                  </div>
                  <div v-else class="flex flex-wrap gap-2 justify-end">
                    <button class="btn btn-sm" type="button" @click="openCollection(collection.id)">
                      Manage
                    </button>
                    <button
                      class="btn btn-sm"
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
                    <button class="btn btn-sm" type="button" @click="startEdit(collection.id)">
                      Edit
                    </button>
                    <button class="btn btn-sm btn-error btn-outline" type="button" @click="remove(collection.id)">
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
  </div>
</template>
