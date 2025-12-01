<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import * as collectionsApi from '../api/collections';
import CollectionEdit from '../components/CollectionEdit.vue';
import type { Collection } from '../types';

const router = useRouter();

const collections = ref<Collection[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

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
  modalState.initial.title = '';
  modalState.initial.description = '';
  modalState.initial.header_color = '#100e75';
  modalState.initial.background_color = '#f0f0f0';
  modalState.initial.font_color = '#171717';
  modalState.initial.header_font_color = '#ffffff';
  modalState.initial.header_text_left = '';
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
    await collectionsApi.createCollection({
      title: payload.title,
      description: payload.description || undefined,
      header_color: payload.header_color,
      background_color: payload.background_color,
      font_color: payload.font_color,
      header_font_color: payload.header_font_color,
      header_text_left: payload.header_text_left || undefined,
    });
    await loadCollections();
    closeModal();
  } catch (err) {
    console.error('Failed to save collection', err);
    window.alert(err instanceof Error ? err.message : 'Unable to save collection');
  } finally {
    modalState.loading = false;
  }
}

onMounted(() => {
  void loadCollections();
});
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-semibold">Collections</h1>

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
              </tr>
            </thead>
            <tbody>
              <tr v-for="collection in collections" :key="collection.id">
                <td class="align-top font-semibold">
                  <button class="btn btn-link px-0 normal-case" type="button" @click="openCollection(collection.id)">
                    {{ collection.title }}
                  </button>
                </td>
                <td class="align-top text-sm text-base-content/80">
                  {{ collection.description || '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="flex justify-end">
      <button class="btn btn-primary" type="button" @click="openCreateModal">
        New Collection
      </button>
    </div>

    <CollectionEdit :open="modalState.open" mode="create" :initial-values="modalState.initial"
      :loading="modalState.loading" @close="closeModal" @submit="handleCollectionSubmit" />
  </div>
</template>
