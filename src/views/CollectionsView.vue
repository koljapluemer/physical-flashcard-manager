<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import * as collectionsApi from '../api/collections';
import type { Collection } from '../types';

const router = useRouter();

const collections = ref<Collection[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const newCollection = reactive({
  title: '',
  description: '',
});

const editingId = ref<number | null>(null);
const editForm = reactive({
  title: '',
  description: '',
});

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

onMounted(async () => {
  await loadCollections();
});
</script>

<template>
  <div class="collections-view">
    <h1 class="title">Collections</h1>
    <article class="message is-danger" v-if="error">
      <div class="message-body">
        {{ error }}
      </div>
    </article>

    <div class="box">
      <h2 class="title is-4">Create Collection</h2>
      <div class="field">
        <label class="label" for="collection-name">Title</label>
        <div class="control">
          <input
            id="collection-name"
            v-model="newCollection.title"
            class="input"
            type="text"
            placeholder="Algebra basics"
          />
        </div>
      </div>

      <div class="field">
        <label class="label" for="collection-description">Description</label>
        <div class="control">
          <textarea
            id="collection-description"
            v-model="newCollection.description"
            class="textarea"
            placeholder="Optional description"
            rows="3"
          ></textarea>
        </div>
      </div>

      <div class="field is-grouped">
        <div class="control">
          <button class="button is-primary" type="button" @click="handleCreate" :disabled="!newCollection.title">
            Create
          </button>
        </div>
      </div>
    </div>

    <div class="mt-5">
      <h2 class="title is-4">Your Collections</h2>
      <p class="print-note mb-3">Click a collection to manage flashcards.</p>
      <p v-if="loading">Loading...</p>
      <p v-if="!loading && collections.length === 0">
        No collections yet. Create one above to get started.
      </p>

      <div class="card-grid" v-if="collections.length">
        <div
          class="flashcard-preview"
          v-for="collection in collections"
          :key="collection.id"
        >
          <template v-if="editingId === collection.id">
            <div class="field">
              <label class="label">Title</label>
              <div class="control">
                <input v-model="editForm.title" class="input" type="text" />
              </div>
            </div>
            <div class="field">
              <label class="label">Description</label>
              <div class="control">
                <textarea v-model="editForm.description" class="textarea" rows="3"></textarea>
              </div>
            </div>
            <div class="buttons">
              <button class="button is-primary is-small" type="button" @click="saveEdit(collection.id)">
                Save
              </button>
              <button class="button is-light is-small" type="button" @click="cancelEdit">Cancel</button>
            </div>
          </template>
          <template v-else>
            <h3 class="title is-5">{{ collection.title }}</h3>
            <p class="mb-3" v-if="collection.description">{{ collection.description }}</p>
            <div class="buttons">
              <button
                class="button is-link is-light is-small"
                type="button"
                @click="openCollection(collection.id)"
              >
                Manage Cards
              </button>
              <button class="button is-light is-small" type="button" @click="startEdit(collection.id)">
                Edit
              </button>
              <button class="button is-danger is-light is-small" type="button" @click="remove(collection.id)">
                Delete
              </button>
            </div>
          </template>
          <p class="has-text-grey is-size-7 mt-3">
            Updated: {{ new Date(collection.updated_at).toLocaleString() }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
