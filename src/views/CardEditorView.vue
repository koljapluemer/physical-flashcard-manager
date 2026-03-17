<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { hexToRgba, normalizeHexColor } from '../utils/color';
import { getFontCSSValue, loadGoogleFont } from '../utils/fonts';
import { parseCardSide, serializeCardSide, emptyCardSide, LAYOUT_LABELS, LAYOUT_SECTIONS } from '../utils/cardSide';
import CardPreview from '../components/CardPreview.vue';
import CardChatPane from '../components/CardChatPane.vue';
import * as collectionsApi from '../api/collections';
import * as flashcardsApi from '../api/flashcards';
import type { Collection, Flashcard, CardSideData, CardLayout } from '../types';

const props = defineProps<{
  id: string;
  cardId: string;
}>();

const router = useRouter();

const collection = ref<Collection | null>(null);
const card = ref<Flashcard | null>(null);
const saveLoading = ref(false);
const frontSide = ref<CardSideData>(emptyCardSide('default'));
const backSide = ref<CardSideData>(emptyCardSide('default'));
const headerRight = ref('');
const isInfoCard = ref(false);
const activeTab = ref<'front' | 'back'>('front');

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

const frontLayout = computed({
  get: () => frontSide.value.layout,
  set: (v: CardLayout) => {
    const newSections: Record<string, string> = {};
    for (const key of LAYOUT_SECTIONS[v]) {
      newSections[key] = frontSide.value.sections[key] ?? '';
    }
    frontSide.value = { layout: v, sections: newSections };
  },
});

const backLayout = computed({
  get: () => backSide.value.layout,
  set: (v: CardLayout) => {
    const newSections: Record<string, string> = {};
    for (const key of LAYOUT_SECTIONS[v]) {
      newSections[key] = backSide.value.sections[key] ?? '';
    }
    backSide.value = { layout: v, sections: newSections };
  },
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

      frontSide.value = parseCardSide(card.value.front || '');
      backSide.value = parseCardSide(card.value.back || '');
      headerRight.value = card.value.header_right || '';
      isInfoCard.value = card.value.is_info_card ?? false;
    } else {
      card.value = null;
      frontSide.value = emptyCardSide('default');
      backSide.value = emptyCardSide('default');
      headerRight.value = '';
      isInfoCard.value = false;
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
        front: serializeCardSide(frontSide.value),
        back: serializeCardSide(backSide.value),
        header_right: headerRight.value.trim() || undefined,
        is_info_card: isInfoCard.value,
      });
    } else {
      const cardIdNum = parseInt(props.cardId, 10);
      await flashcardsApi.updateFlashcard(cardIdNum, {
        front: serializeCardSide(frontSide.value),
        back: serializeCardSide(backSide.value),
        header_right: headerRight.value.trim() || undefined,
        is_info_card: isInfoCard.value,
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

function applyAiSuggestion(payload: { front: CardSideData; back: CardSideData; header_right?: string }) {
  frontSide.value = payload.front;
  backSide.value = payload.back;
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

::: box
Content here
:::               Colored box</pre>
      </div>
    </details>

    <!-- Always-visible previews -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
      <div>
        <p class="text-sm font-semibold mb-2 text-base-content/70">Front Preview</p>
        <CardPreview
          :sideData="frontSide"
          side="front"
          :collection="collection ?? undefined"
          :flashcard="{ header_right: headerRight } as any"
          :scale="1"
        />
      </div>
      <div>
        <p class="text-sm font-semibold mb-2 text-base-content/70">Back Preview</p>
        <CardPreview
          :sideData="backSide"
          side="back"
          :collection="collection ?? undefined"
          :scale="1"
        />
      </div>
    </div>

    <!-- Tabbed editor -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <div role="tablist" class="tabs tabs-bordered mb-4">
          <button
            role="tab"
            class="tab"
            :class="{ 'tab-active': activeTab === 'front' }"
            type="button"
            @click="activeTab = 'front'"
          >Front</button>
          <button
            role="tab"
            class="tab"
            :class="{ 'tab-active': activeTab === 'back' }"
            type="button"
            @click="activeTab = 'back'"
          >Back</button>
        </div>

        <!-- Front tab -->
        <div v-show="activeTab === 'front'" class="space-y-4">
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Layout</legend>
            <select v-model="frontLayout" class="select select-bordered">
              <option v-for="(label, key) in LAYOUT_LABELS" :key="key" :value="key">{{ label }}</option>
            </select>
          </fieldset>

          <template v-if="frontSide.layout === 'default'">
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Content</legend>
              <textarea
                v-model="frontSide.sections.main"
                class="textarea textarea-bordered w-full h-48 font-mono"
                placeholder="Enter markdown..."
              />
            </fieldset>
          </template>

          <template v-else-if="frontSide.layout === '2-columns'">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Left column</legend>
                <textarea v-model="frontSide.sections.left" class="textarea textarea-bordered w-full h-40 font-mono" placeholder="Left column..." />
              </fieldset>
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Right column</legend>
                <textarea v-model="frontSide.sections.right" class="textarea textarea-bordered w-full h-40 font-mono" placeholder="Right column..." />
              </fieldset>
            </div>
          </template>

          <template v-else-if="frontSide.layout === 'top-row-2-columns'">
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Top row</legend>
              <textarea v-model="frontSide.sections.top" class="textarea textarea-bordered w-full h-24 font-mono" placeholder="Top row..." />
            </fieldset>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Bottom left</legend>
                <textarea v-model="frontSide.sections.left" class="textarea textarea-bordered w-full h-32 font-mono" placeholder="Bottom left..." />
              </fieldset>
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Bottom right</legend>
                <textarea v-model="frontSide.sections.right" class="textarea textarea-bordered w-full h-32 font-mono" placeholder="Bottom right..." />
              </fieldset>
            </div>
          </template>

          <template v-else-if="frontSide.layout === 'bottom-row-2-columns'">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Top left</legend>
                <textarea v-model="frontSide.sections.left" class="textarea textarea-bordered w-full h-32 font-mono" placeholder="Top left..." />
              </fieldset>
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Top right</legend>
                <textarea v-model="frontSide.sections.right" class="textarea textarea-bordered w-full h-32 font-mono" placeholder="Top right..." />
              </fieldset>
            </div>
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Bottom row</legend>
              <textarea v-model="frontSide.sections.bottom" class="textarea textarea-bordered w-full h-24 font-mono" placeholder="Bottom row..." />
            </fieldset>
          </template>
        </div>

        <!-- Back tab -->
        <div v-show="activeTab === 'back'" class="space-y-4">
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Layout</legend>
            <select v-model="backLayout" class="select select-bordered">
              <option v-for="(label, key) in LAYOUT_LABELS" :key="key" :value="key">{{ label }}</option>
            </select>
          </fieldset>

          <template v-if="backSide.layout === 'default'">
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Content</legend>
              <textarea
                v-model="backSide.sections.main"
                class="textarea textarea-bordered w-full h-48 font-mono"
                placeholder="Enter markdown..."
              />
            </fieldset>
          </template>

          <template v-else-if="backSide.layout === '2-columns'">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Left column</legend>
                <textarea v-model="backSide.sections.left" class="textarea textarea-bordered w-full h-40 font-mono" placeholder="Left column..." />
              </fieldset>
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Right column</legend>
                <textarea v-model="backSide.sections.right" class="textarea textarea-bordered w-full h-40 font-mono" placeholder="Right column..." />
              </fieldset>
            </div>
          </template>

          <template v-else-if="backSide.layout === 'top-row-2-columns'">
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Top row</legend>
              <textarea v-model="backSide.sections.top" class="textarea textarea-bordered w-full h-24 font-mono" placeholder="Top row..." />
            </fieldset>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Bottom left</legend>
                <textarea v-model="backSide.sections.left" class="textarea textarea-bordered w-full h-32 font-mono" placeholder="Bottom left..." />
              </fieldset>
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Bottom right</legend>
                <textarea v-model="backSide.sections.right" class="textarea textarea-bordered w-full h-32 font-mono" placeholder="Bottom right..." />
              </fieldset>
            </div>
          </template>

          <template v-else-if="backSide.layout === 'bottom-row-2-columns'">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Top left</legend>
                <textarea v-model="backSide.sections.left" class="textarea textarea-bordered w-full h-32 font-mono" placeholder="Top left..." />
              </fieldset>
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Top right</legend>
                <textarea v-model="backSide.sections.right" class="textarea textarea-bordered w-full h-32 font-mono" placeholder="Top right..." />
              </fieldset>
            </div>
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Bottom row</legend>
              <textarea v-model="backSide.sections.bottom" class="textarea textarea-bordered w-full h-24 font-mono" placeholder="Bottom row..." />
            </fieldset>
          </template>
        </div>
      </div>
    </div>

    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <h2 class="card-title text-xl mb-2">Card Settings</h2>
        <div class="flex flex-wrap gap-6">
          <fieldset class="fieldset flex-1 min-w-48">
            <legend class="fieldset-legend">Header (Right)</legend>
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

          <fieldset class="fieldset">
            <legend class="fieldset-legend">Card Type</legend>
            <label class="flex items-center gap-3 cursor-pointer py-2">
              <span class="label-text">Learn</span>
              <input v-model="isInfoCard" type="checkbox" class="toggle" />
              <span class="label-text">Info</span>
            </label>
          </fieldset>
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
      :front-side="frontSide"
      :back-side="backSide"
      :header-right="headerRight"
      @apply-suggestion="applyAiSuggestion"
    />
  </div>
</template>
