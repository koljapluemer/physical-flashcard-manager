<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { hexToRgba, normalizeHexColor } from '../utils/color';
import { getFontCSSValue, loadGoogleFont } from '../utils/fonts';
import CardPreview from '../components/CardPreview.vue';
import CardChatPane from '../components/CardChatPane.vue';
import * as collectionsApi from '../api/collections';
import * as flashcardsApi from '../api/flashcards';
import type { Collection, Flashcard } from '../types';

const props = defineProps<{
  id: string;
  cardId: string;
}>();

const router = useRouter();

const collection = ref<Collection | null>(null);
const card = ref<Flashcard | null>(null);
const saveLoading = ref(false);
const frontMarkdown = ref('');
const backMarkdown = ref('');
const headerRight = ref('');

const isNew = computed(() => props.cardId === 'new');

const editorThemeStyle = computed(() => {
  const headerColor = normalizeHexColor(collection.value?.header_color);
  return {
    '--header-color': headerColor,
    '--box-bg-color': hexToRgba(headerColor, 0.08),
    '--box-border-color': hexToRgba(headerColor, 0.16),
    '--font-family': getFontCSSValue(collection.value?.font_family ?? 'Arial'),
  };
});

watch(
  () => collection.value?.font_family,
  (fontFamily) => {
    if (fontFamily) {
      loadGoogleFont(fontFamily);
    }
  },
  { immediate: true }
);

async function loadData() {
  const collectionId = parseInt(props.id, 10);

  try {
    collection.value = await collectionsApi.getCollection(collectionId);

    if (!isNew.value) {
      const cardIdNum = parseInt(props.cardId, 10);
      card.value = await flashcardsApi.getFlashcard(cardIdNum);

      frontMarkdown.value = card.value.front || '';
      backMarkdown.value = card.value.back || '';
      headerRight.value = card.value.header_right || '';
    } else {
      card.value = null;
      frontMarkdown.value = '';
      backMarkdown.value = '';
      headerRight.value = '';
    }
  } catch (err) {
    console.error('Failed to load data', err);
    window.alert(err instanceof Error ? err.message : 'Failed to load data');
  }
}

onMounted(() => {
  loadData();
});

watch(() => props.cardId, () => {
  loadData();
});

async function handleSave() {
  saveLoading.value = true;

  try {
    const collectionId = parseInt(props.id, 10);

    if (isNew.value) {
      await flashcardsApi.createFlashcard({
        collection: collectionId,
        front: frontMarkdown.value,
        back: backMarkdown.value,
        header_right: headerRight.value.trim() || undefined,
      });
    } else {
      const cardIdNum = parseInt(props.cardId, 10);
      await flashcardsApi.updateFlashcard(cardIdNum, {
        front: frontMarkdown.value,
        back: backMarkdown.value,
        header_right: headerRight.value.trim() || undefined,
      });
    }
    router.push({ name: 'collectionDetail', params: { id: props.id } });
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Failed to save flashcard');
  } finally {
    saveLoading.value = false;
  }
}

function fillHeaderRight(text: string) {
  headerRight.value = text;
}

function applyAiSuggestion(payload: { front: string; back: string; header_right?: string }) {
  frontMarkdown.value = payload.front;
  backMarkdown.value = payload.back;
  headerRight.value = payload.header_right?.trim() || '';
}
</script>

<template>
  <div class="space-y-6" :style="editorThemeStyle">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <button class="btn " type="button" @click="$router.back()">Back</button>
      <div class="text-right">
        <h1 class="text-3xl font-semibold">Flashcard Editor</h1>
        <p class="text-sm text-base-content/70">
          {{ collection?.title || 'Collection' }}
          <span v-if="!isNew">· Editing card</span>
          <span v-else>· New card</span>
        </p>
      </div>
    </div>

    <details class="collapse collapse-arrow bg-base-200">
      <summary class="collapse-title font-medium">Markdown Tips</summary>
      <div class="collapse-content font-mono text-sm">
        <pre class="whitespace-pre-wrap">**bold**          Bold text
*italic*          Italic text
### Heading       Heading level 3
- item            Bullet list
1. item           Numbered list
![alt](url)       Image
$E = mc^2$        Inline math (LaTeX)

```box
Content here
```               Colored box</pre>
      </div>
    </details>

    <div class="grid gap-6 lg:grid-cols-2">
      <div class="space-y-4">
        <div class="card bg-base-100 shadow">
          <div class="card-body space-y-4">
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Card Header (Right)</legend>
              <div class="flex flex-wrap gap-2 mb-2">
                <button @click="fillHeaderRight('Overview')" type="button" class="btn btn-xs">Overview</button>
                <button @click="fillHeaderRight('Level 1')" type="button" class="btn btn-xs">Level 1</button>
                <button @click="fillHeaderRight('Level 2')" type="button" class="btn btn-xs">Level 2</button>
                <button @click="fillHeaderRight('Level 3')" type="button" class="btn btn-xs">Level 3</button>
              </div>
              <input
                v-model="headerRight"
                type="text"
                class="input input-bordered w-full"
                placeholder="Optional text shown on front of card"
              />
            </fieldset>

            <div class="flex items-center justify-between">
              <h2 class="card-title text-xl">Front</h2>
            </div>
            <textarea
              v-model="frontMarkdown"
              class="textarea textarea-bordered w-full h-48 font-mono"
              placeholder="Enter markdown..."
            />
          </div>
        </div>

        <div class="card bg-base-100 shadow">
          <div class="card-body space-y-3">
            <h3 class="card-title text-lg">Front Preview</h3>
            <CardPreview
              :markdown="frontMarkdown"
              side="front"
              :collection="collection ?? undefined"
              :flashcard="{ header_right: headerRight } as any"
            />
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div class="card bg-base-100 shadow">
          <div class="card-body space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="card-title text-xl">Back</h2>
            </div>
            <textarea
              v-model="backMarkdown"
              class="textarea textarea-bordered w-full h-48 font-mono"
              placeholder="Enter markdown..."
            />
          </div>
        </div>

        <div class="card bg-base-100 shadow">
          <div class="card-body space-y-3">
            <h3 class="card-title text-lg">Back Preview</h3>
            <CardPreview
              :markdown="backMarkdown"
              side="back"
              :collection="collection ?? undefined"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap gap-3">
      <button class="btn btn-primary" type="button" @click="handleSave" :disabled="saveLoading">
        <span v-if="saveLoading" class="loading loading-spinner loading-xs mr-2"></span>
        {{ saveLoading ? 'Saving…' : 'Save Card' }}
      </button>
      <button class="btn" type="button" @click="$router.back()">Cancel</button>
    </div>

    <CardChatPane
      :collection="collection"
      :front-markdown="frontMarkdown"
      :back-markdown="backMarkdown"
      :header-right="headerRight"
      @apply-suggestion="applyAiSuggestion"
    />
  </div>
</template>
