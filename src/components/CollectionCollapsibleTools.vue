<script setup lang="ts">
import { computed, ref, watch, withDefaults } from 'vue';
import { Download, Sparkles } from 'lucide-vue-next';
import { OpenAI } from 'openai';
import CardPreview from './CardPreview.vue';
import * as materialsApi from '../api/materials';
import * as flashcardsApi from '../api/flashcards';
import type { Collection, Flashcard, Material } from '../types';

const DEFAULT_PROMPT =
  'Generate concise Q&A flashcards that fit on small physical cards. Keep answers short and scannable. Prefer one concept per card.';

type Draft = {
  id: string;
  front: string;
  back: string;
  header_right?: string;
  selected: boolean;
};

const props = withDefaults(
  defineProps<{
    collection: Collection | null;
    flashcards: Flashcard[];
    disabled?: boolean;
    loading?: boolean;
  }>(),
  {
    disabled: false,
    loading: false,
  }
);

const emit = defineEmits<{
  (e: 'download'): void;
  (e: 'created'): void;
}>();

const aiModalOpen = ref(false);
const apiKey = ref('');
const model = ref('gpt-4o-mini');
const prompt = ref(DEFAULT_PROMPT);
const includeMaterials = ref(true);
const includeFlashcards = ref(false);
const generating = ref(false);
const saving = ref(false);
const aiError = ref<string | null>(null);

const materials = ref<Material[]>([]);
const materialsLoading = ref(false);
const materialsError = ref<string | null>(null);

const drafts = ref<Draft[]>([]);

const hasSelection = computed(() =>
  drafts.value.some((draft) => draft.selected && draft.front.trim() && draft.back.trim())
);
const allChecked = computed(() =>
  drafts.value.length > 0 && drafts.value.every((draft) => draft.selected)
);

watch(
  () => aiModalOpen.value,
  (open) => {
    if (open && props.collection) {
      loadMaterials();
    }
    if (!open) {
      resetModal();
    }
  }
);

watch(
  () => props.collection?.id,
  () => {
    if (aiModalOpen.value && props.collection) {
      loadMaterials();
    }
  }
);

function handleDownload() {
  if (!props.disabled) {
    emit('download');
  }
}

function openAiModal() {
  aiModalOpen.value = true;
}

function closeAiModal() {
  aiModalOpen.value = false;
}

async function loadMaterials() {
  if (!props.collection) {
    materials.value = [];
    return;
  }

  materialsLoading.value = true;
  materialsError.value = null;
  try {
    materials.value = await materialsApi.getMaterials(props.collection.id);
  } catch (err) {
    materialsError.value = err instanceof Error ? err.message : 'Unable to load materials';
  } finally {
    materialsLoading.value = false;
  }
}

function resetModal() {
  apiKey.value = '';
  model.value = 'gpt-4o-mini';
  prompt.value = DEFAULT_PROMPT;
  includeMaterials.value = true;
  includeFlashcards.value = false;
  generating.value = false;
  saving.value = false;
  aiError.value = null;
  drafts.value = [];
}

function stripHtml(html: string, maxLength = 140): string {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) {
    return '—';
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

function buildContextBlock() {
  const parts: string[] = [];
  if (props.collection) {
    parts.push(
      [
        `Collection title: ${props.collection.title}`,
        props.collection.description ? `Description: ${props.collection.description}` : null,
        props.collection.header_text_left ? `Header text: ${props.collection.header_text_left}` : null,
      ]
        .filter(Boolean)
        .join('\n')
    );
  }

  if (includeMaterials.value && materials.value.length) {
    const materialsList = materials.value
      .map(
        (material) =>
          `- ${material.internalName || material.originalFilename} (pages ${material.pageRangeStart}-${material.pageRangeEnd}, ${material.pageCount} pages)`
      )
      .join('\n');
    parts.push(`Materials:\n${materialsList}`);
  }

  if (includeFlashcards.value && props.flashcards.length) {
    const cardsList = props.flashcards
      .slice(0, 12)
      .map(
        (card) =>
          `- Card ${card.id}: front "${stripHtml(card.front, 80)}", back "${stripHtml(card.back, 80)}"`
      )
      .join('\n');
    parts.push(`Existing flashcards (snippets):\n${cardsList}`);
  }

  return parts.join('\n\n');
}

function buildMessages() {
  const userPrompt = prompt.value.trim() || DEFAULT_PROMPT;
  const contextBlock = buildContextBlock();

  const systemContent = [
    'You draft flashcards for a physical flashcard app.',
    'Return ONLY valid JSON. No code fences, no Markdown.',
    'Schema: {"flashcards":[{"front":"<html>","back":"<html>","header_right":"<optional string>"}]}',
    'Constraints for front/back HTML:',
    '- Use simple semantic tags only: <p>, <strong>, <em>, <ul>, <ol>, <li>, <h1>, <h2>, <h3>, <code>, <pre>, <br>, <blockquote>.',
    '- No inline styles, scripts, images, video, audio, iframes, links, or external assets.',
    '- Do not wrap in <html> or <body>.',
    '- Keep text concise. Prefer short paragraphs or lists.',
  ].join('\n');

  const userContent = [
    `User prompt:\n${userPrompt}`,
    'Task: Generate multiple useful flashcards. Each card should stand alone.',
    'If applicable, set "header_right" with a short page or section hint (e.g., "pp. 12-14").',
    'Only include cards that fit on small cards; trim long explanations.',
    contextBlock ? `Context:\n${contextBlock}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  return [
    { role: 'system' as const, content: systemContent },
    { role: 'user' as const, content: userContent },
  ];
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\\s*([\\s\\S]*?)\\s*```/i);
  if (fenced?.[1]) {
    return fenced[1];
  }
  return text.trim();
}

async function generateDrafts() {
  if (!props.collection) {
    aiError.value = 'Select a collection first.';
    return;
  }
  if (!apiKey.value.trim()) {
    aiError.value = 'Enter your OpenAI API key.';
    return;
  }

  generating.value = true;
  aiError.value = null;

  try {
    const client = new OpenAI({
      apiKey: apiKey.value.trim(),
      dangerouslyAllowBrowser: true,
    });

    const messages = buildMessages();
    const response = await client.chat.completions.create({
      model: model.value.trim() || 'gpt-4o-mini',
      messages,
      temperature: 0.4,
      max_tokens: 800,
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI.');
    }

    const parsed = JSON.parse(extractJson(content));
    const flashcards: Array<{ front?: string; back?: string; header_right?: string }> =
      parsed?.flashcards;

    if (!Array.isArray(flashcards)) {
      throw new Error('Response did not include flashcards.');
    }

    const cleanDrafts = flashcards
      .map((card, index) => ({
        id: `${Date.now()}-${index}`,
        front: (card.front ?? '').trim(),
        back: (card.back ?? '').trim(),
        header_right: (card.header_right ?? '').trim(),
        selected: true,
      }))
      .filter((card) => card.front && card.back);

    if (!cleanDrafts.length) {
      throw new Error('No usable flashcards returned.');
    }

    drafts.value = cleanDrafts;
  } catch (err) {
    aiError.value =
      err instanceof Error ? err.message : 'Failed to generate flashcards. Please try again.';
    drafts.value = [];
  } finally {
    generating.value = false;
  }
}

function toggleAll(selected: boolean) {
  drafts.value = drafts.value.map((draft) => ({
    ...draft,
    selected,
  }));
}

async function saveSelected() {
  if (!props.collection) {
    aiError.value = 'Select a collection first.';
    return;
  }
  const selectedDrafts = drafts.value.filter(
    (draft) => draft.selected && draft.front.trim() && draft.back.trim()
  );
  if (!selectedDrafts.length) {
    aiError.value = 'Pick at least one flashcard to add.';
    return;
  }

  saving.value = true;
  aiError.value = null;

  try {
    for (const draft of selectedDrafts) {
      await flashcardsApi.createFlashcard({
        collection: props.collection.id,
        front: draft.front.trim(),
        back: draft.back.trim(),
        header_right: draft.header_right?.trim() || undefined,
      });
    }
    emit('created');
    closeAiModal();
  } catch (err) {
    aiError.value =
      err instanceof Error ? err.message : 'Unable to add flashcards. Please try again.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="collapse collapse-arrow bg-base-100 shadow">
    <input type="checkbox" checked />
    <div class="collapse-title text-lg font-semibold">Tools</div>
    <div class="collapse-content space-y-3">
      <div class="flex flex-wrap gap-2">
        <button class="btn btn-outline gap-2" type="button" :disabled="disabled" @click="handleDownload">
          <Download :size="18" />
          <span class="flex items-center gap-2">
            <span>Download for Print</span>
            <span v-if="loading" class="loading loading-spinner loading-xs"></span>
          </span>
        </button>
        <button class="btn gap-2" type="button" :disabled="!collection" @click="openAiModal">
          <Sparkles :size="18" />
          <span>Generate with AI</span>
        </button>
      </div>
    </div>
  </div>

  <dialog v-if="aiModalOpen" class="modal modal-open" open>
    <div class="modal-box max-w-4xl space-y-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="text-xl font-semibold">Generate Flashcards</h3>
          <p class="text-base-content/70">
            Provide your OpenAI key, edit the prompt, and pick which generated cards to keep.
          </p>
        </div>
        <button class="btn btn-ghost btn-sm" type="button" @click="closeAiModal" :disabled="generating || saving">
          Close
        </button>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <fieldset class="fieldset">
          <label for="ai-api-key" class="label">OpenAI API Key</label>
          <input
            id="ai-api-key"
            v-model="apiKey"
            type="password"
            class="input"
            placeholder="sk-..."
            autocomplete="off"
          />
        </fieldset>

        <fieldset class="fieldset">
          <label for="ai-model" class="label">Model</label>
          <input
            id="ai-model"
            v-model="model"
            type="text"
            class="input"
            placeholder="gpt-4o-mini"
          />
        </fieldset>
      </div>

      <fieldset class="fieldset">
        <label for="ai-prompt" class="label">Prompt</label>
        <textarea
          id="ai-prompt"
          v-model="prompt"
          class="textarea"
          rows="4"
          placeholder="Describe what you want to generate"
        ></textarea>
      </fieldset>

      <div class="flex flex-wrap gap-4">
        <label class="flex items-center gap-2">
          <input v-model="includeMaterials" type="checkbox" class="checkbox checkbox-sm" />
          <span>Include materials</span>
        </label>
        <label class="flex items-center gap-2">
          <input v-model="includeFlashcards" type="checkbox" class="checkbox checkbox-sm" />
          <span>Include existing flashcards</span>
        </label>
      </div>

      <div v-if="includeMaterials" class="space-y-2">
        <div class="flex items-center gap-2">
          <p class="font-medium">Materials</p>
          <span v-if="materialsLoading" class="loading loading-spinner loading-xs"></span>
        </div>
        <div v-if="materialsError" class="alert alert-error">
          <span>{{ materialsError }}</span>
        </div>
        <div v-else-if="materials.length === 0" class="text-base-content/70">No materials added.</div>
        <div v-else class="max-h-32 overflow-y-auto space-y-2">
          <div v-for="material in materials" :key="material.id" class="text-sm">
            <span class="font-medium">{{ material.internalName || material.originalFilename }}</span>
            <span class="text-base-content/70"> · pages {{ material.pageRangeStart }}-{{ material.pageRangeEnd }}</span>
          </div>
        </div>
      </div>

      <div v-if="includeFlashcards" class="space-y-2">
        <p class="font-medium">Existing flashcards</p>
        <div v-if="flashcards.length === 0" class="text-base-content/70">No flashcards yet.</div>
        <div v-else class="max-h-32 overflow-y-auto space-y-2">
          <div v-for="card in flashcards" :key="card.id" class="text-sm">
            <span class="font-medium">#{{ card.id }}</span>
            <span class="text-base-content/70"> · {{ stripHtml(card.front, 90) }}</span>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <button class="btn btn-ghost" type="button" :disabled="generating || saving" @click="closeAiModal">
          Cancel
        </button>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="generating || saving || !collection"
          @click="generateDrafts"
        >
          <span v-if="generating" class="loading loading-spinner loading-xs mr-2"></span>
          Generate
        </button>
      </div>

      <div v-if="aiError" class="alert alert-error">
        <span>{{ aiError }}</span>
      </div>

      <div v-if="drafts.length" class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              :checked="allChecked"
              @change="toggleAll(!allChecked)"
            />
            <span class="text-sm">Select all</span>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-outline btn-sm" type="button" :disabled="generating" @click="generateDrafts">
              Regenerate
            </button>
            <button
              class="btn btn-primary btn-sm"
              type="button"
              :disabled="saving || !hasSelection"
              @click="saveSelected"
            >
              <span v-if="saving" class="loading loading-spinner loading-xs mr-2"></span>
              Add selected
            </button>
          </div>
        </div>

        <div class="space-y-3 max-h-[26rem] overflow-y-auto pr-1">
          <div
            v-for="draft in drafts"
            :key="draft.id"
            class="rounded-lg border border-base-200 p-3 space-y-3"
          >
            <div class="flex items-start gap-3">
              <input v-model="draft.selected" type="checkbox" class="checkbox checkbox-sm mt-1" />
              <div class="flex-1 space-y-3">
                <div class="grid gap-3 md:grid-cols-2">
                  <fieldset class="fieldset">
                    <label class="label text-sm">Front (HTML)</label>
                    <textarea v-model="draft.front" class="textarea" rows="4"></textarea>
                  </fieldset>
                  <fieldset class="fieldset">
                    <label class="label text-sm">Back (HTML)</label>
                    <textarea v-model="draft.back" class="textarea" rows="4"></textarea>
                  </fieldset>
                </div>

                <div class="grid gap-3 md:grid-cols-2">
                  <div class="space-y-2">
                    <p class="text-sm text-base-content/70">Preview</p>
                    <CardPreview
                      :collection="collection ?? undefined"
                      :html="draft.front"
                      side="front"
                      :front-only="true"
                      :scale="0.45"
                    />
                  </div>
                  <fieldset class="fieldset">
                    <label class="label text-sm">Header Right (optional)</label>
                    <input
                      v-model="draft.header_right"
                      type="text"
                      class="input"
                      placeholder="e.g., pp. 12-14"
                    />
                    <p class="text-xs text-base-content/70 mt-1">
                      Small hint shown on the card front.
                    </p>
                  </fieldset>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop" @click="closeAiModal"></div>
  </dialog>
</template>
