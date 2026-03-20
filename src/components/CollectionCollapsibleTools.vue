<script setup lang="ts">
import { computed, ref, watch, withDefaults } from 'vue';
import { Download, Sparkles, FileDown, FileUp } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { OpenAI } from 'openai';
import CardPreview from './CardPreview.vue';
import * as materialsApi from '../api/materials';
import * as flashcardsApi from '../api/flashcards';
import type { Collection, Flashcard, Material } from '../types';
import type { CardLayout, CardSideData } from '../types';
import { parseCardSide, serializeCardSide, LAYOUT_SECTIONS, LAYOUT_LABELS } from '../utils/cardSide';
import { useSettingsStore } from '../stores/settings';
import { useToastStore } from '../stores/toast';
import { exportCardsToZip, importCardsFromZip } from '../utils/cardExport';
import { downloadPdfBlob } from '../utils/pdfExport';

const DEFAULT_PROMPT =
  'Generate concise Q&A flashcards that fit on small physical cards. Keep answers short and scannable. Prefer one concept per card. Use the attached material as a guideline, but do not copy verbatim from it. If math is included, render it as inline latex syntax. Set the header text to either "Level 1", "Level 2", or "Level 3", depending on the difficulty of the card.';

// Structured output schema — all section keys required (unused ones stay "").
// sanitizeSide() filters to only the keys relevant to the chosen layout.
const RESPONSE_FORMAT = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'flashcards_response',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        flashcards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              front: { $ref: '#/$defs/card_side' },
              back: { $ref: '#/$defs/card_side' },
              header_right: { type: 'string' },
            },
            required: ['front', 'back', 'header_right'],
            additionalProperties: false,
          },
        },
      },
      required: ['flashcards'],
      additionalProperties: false,
      $defs: {
        card_side: {
          type: 'object',
          properties: {
            layout: {
              type: 'string',
              enum: ['default', '2-columns', '3-columns', 'top-row-2-columns', 'bottom-row-2-columns'],
            },
            sections: {
              type: 'object',
              properties: {
                main:   { type: 'string' },
                left:   { type: 'string' },
                right:  { type: 'string' },
                center: { type: 'string' },
                top:    { type: 'string' },
                bottom: { type: 'string' },
              },
              required: ['main', 'left', 'right', 'center', 'top', 'bottom'],
              additionalProperties: false,
            },
          },
          required: ['layout', 'sections'],
          additionalProperties: false,
        },
      },
    },
  },
};

type Draft = {
  id: string;
  front: CardSideData;
  back: CardSideData;
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
  (e: 'refreshed'): void;
}>();

const settingsStore = useSettingsStore();
const toastStore = useToastStore();
const router = useRouter();

const aiModalOpen = ref(false);
const model = ref('gpt-4o-mini');
const prompt = ref(DEFAULT_PROMPT);
const generating = ref(false);
const saving = ref(false);
const aiError = ref<string | null>(null);

const materials = ref<Material[]>([]);
const selectedMaterialIds = ref<Set<string>>(new Set());
const materialsLoading = ref(false);
const materialsError = ref<string | null>(null);

const drafts = ref<Draft[]>([]);

const hasSelection = computed(() =>
  drafts.value.some(
    (draft) =>
      draft.selected &&
      Object.values(draft.front.sections).some((s) => s.trim()) &&
      Object.values(draft.back.sections).some((s) => s.trim())
  )
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

const zipExporting = ref(false);
const zipImporting = ref(false);
const zipImportInput = ref<HTMLInputElement | null>(null);

function handleDownload() {
  if (!props.disabled) {
    emit('download');
  }
}

async function handleZipExport() {
  if (!props.collection || props.flashcards.length === 0) return;
  zipExporting.value = true;
  try {
    const blob = await exportCardsToZip(props.flashcards);
    const sanitized = props.collection.title
      .replace(/[^a-z0-9]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    downloadPdfBlob(blob, `${sanitized}-cards.zip`);
  } catch (err) {
    toastStore.push(err instanceof Error ? err.message : 'Export failed', 'error');
  } finally {
    zipExporting.value = false;
  }
}

async function handleZipImport(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !props.collection) return;

  zipImporting.value = true;
  try {
    const cards = await importCardsFromZip(file);
    const existingIds = new Set(props.flashcards.map((c) => c.id));
    let updated = 0;
    let created = 0;

    for (const card of cards) {
      const front = JSON.stringify(card.front);
      const back = JSON.stringify(card.back);
      if (card.id && existingIds.has(card.id)) {
        await flashcardsApi.updateFlashcard(card.id, {
          front,
          back,
          header_right: card.header_right,
          is_info_card: card.is_info_card,
          is_favorite: card.is_favorite,
          sort_order: card.sort_order,
        });
        updated++;
      } else {
        await flashcardsApi.createFlashcard({
          collection: props.collection.id,
          front,
          back,
          header_right: card.header_right,
          is_info_card: card.is_info_card,
        });
        created++;
      }
    }

    toastStore.push(`Imported ${cards.length} cards (${updated} updated, ${created} created)`, 'success');
    emit('refreshed');
  } catch (err) {
    toastStore.push(err instanceof Error ? err.message : 'Import failed', 'error');
  } finally {
    zipImporting.value = false;
    if (zipImportInput.value) zipImportInput.value.value = '';
  }
}

function openAiModal() {
  if (!settingsStore.openaiApiKey.trim()) {
    toastStore.push('to use AI generation, set OpenAI API key', 'warning');
    router.push({ name: 'settings' });
    return;
  }
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
    // Select all by default
    selectedMaterialIds.value = new Set(materials.value.map((m) => m.id));
  } catch (err) {
    materialsError.value = err instanceof Error ? err.message : 'Unable to load materials';
  } finally {
    materialsLoading.value = false;
  }
}

function toggleMaterial(id: string) {
  const next = new Set(selectedMaterialIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedMaterialIds.value = next;
}

function resetModal() {
  model.value = 'gpt-4o-mini';
  prompt.value = DEFAULT_PROMPT;
  generating.value = false;
  saving.value = false;
  aiError.value = null;
  drafts.value = [];
  selectedMaterialIds.value = new Set();
}

function cardSideToText(raw: string): string {
  try {
    const side = parseCardSide(raw);
    return Object.values(side.sections).filter(Boolean).join(' | ');
  } catch {
    return raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
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

  const chosen = materials.value.filter((m) => selectedMaterialIds.value.has(m.id));
  if (chosen.length) {
    const list = chosen
      .map((m) => `- ${m.internalName || m.originalFilename}`)
      .join('\n');
    parts.push(`Reference materials:\n${list}`);
  }

  const favorites = props.flashcards.filter((c) => c.is_favorite);
  if (favorites.length) {
    const list = favorites
      .slice(0, 10)
      .map((c) => `- Front: "${cardSideToText(c.front)}" / Back: "${cardSideToText(c.back)}"`)
      .join('\n');
    parts.push(`Example cards from this collection (match their style):\n${list}`);
  }

  return parts.join('\n\n');
}

function buildMessages() {
  const userPrompt = prompt.value.trim() || DEFAULT_PROMPT;
  const contextBlock = buildContextBlock();

  const systemContent = [
    'You draft flashcards for a physical flashcard app.',
    'Layout types and their relevant section keys:',
    '  "default": fill "main"',
    '  "2-columns": fill "left" and "right"',
    '  "3-columns": fill "left", "center", and "right"',
    '  "top-row-2-columns": fill "top", "left", and "right"',
    '  "bottom-row-2-columns": fill "left", "right", and "bottom"',
    'Leave all unused section keys as empty strings "".',
    'Markdown format rules:',
    '- Use **bold**, *italic*, # headings, - bullets, 1. numbered lists.',
    '- Math: use $E = mc^2$ for inline math (single dollar signs only).',
    '- Do NOT use HTML tags — use pure Markdown only.',
    '- Do NOT use \\( \\), \\[ \\], or other LaTeX delimiters — only $...$.',
    '- Colored boxes: use :::box\\nContent\\n::: container directives.',
    '- For most cards, prefer layout "default" on both sides unless columns genuinely help.',
    '- Keep content concise and readable on a small physical card.',
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

function sanitizeSide(side: CardSideData): CardSideData {
  const validKeys = LAYOUT_SECTIONS[side.layout] ?? LAYOUT_SECTIONS['default'];
  const sections: Record<string, string> = {};
  for (const key of validKeys) {
    sections[key] = typeof side.sections[key] === 'string' ? side.sections[key] : '';
  }
  return { layout: side.layout, sections };
}

async function generateDrafts() {
  if (!props.collection) {
    aiError.value = 'Select a collection first.';
    return;
  }
  const openaiKey = settingsStore.openaiApiKey.trim();
  if (!openaiKey) {
    aiError.value = 'Add your OpenAI API key in Settings.';
    closeAiModal();
    toastStore.push('to use AI generation, set OpenAI API key', 'warning');
    router.push({ name: 'settings' });
    return;
  }

  generating.value = true;
  aiError.value = null;

  try {
    const client = new OpenAI({ apiKey: openaiKey, dangerouslyAllowBrowser: true });

    const response = await client.chat.completions.create({
      model: model.value.trim() || 'gpt-4o-mini',
      messages: buildMessages(),
      temperature: 0.4,
      response_format: RESPONSE_FORMAT,
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error('No response from AI.');

    const parsed = JSON.parse(content) as {
      flashcards: Array<{ front: CardSideData; back: CardSideData; header_right: string }>;
    };

    if (!Array.isArray(parsed.flashcards)) throw new Error('Response did not include flashcards.');

    const cleanDrafts = parsed.flashcards
      .map((card, index) => ({
        id: `${Date.now()}-${index}`,
        front: sanitizeSide(card.front),
        back: sanitizeSide(card.back),
        header_right: card.header_right.trim(),
        selected: true,
      }))
      .filter(
        (card) =>
          Object.values(card.front.sections).some((s) => s.trim()) &&
          Object.values(card.back.sections).some((s) => s.trim())
      );

    if (!cleanDrafts.length) throw new Error('No usable flashcards returned.');

    drafts.value = cleanDrafts;
  } catch (err) {
    aiError.value =
      err instanceof Error ? err.message : 'Failed to generate flashcards. Please try again.';
    drafts.value = [];
  } finally {
    generating.value = false;
  }
}

function setDraftLayout(draft: Draft, side: 'front' | 'back', layout: CardLayout) {
  const newSections: Record<string, string> = {};
  for (const key of LAYOUT_SECTIONS[layout]) {
    newSections[key] = draft[side].sections[key] ?? '';
  }
  draft[side] = { layout, sections: newSections };
}

function toggleAll(selected: boolean) {
  drafts.value = drafts.value.map((draft) => ({ ...draft, selected }));
}

async function saveSelected() {
  if (!props.collection) {
    aiError.value = 'Select a collection first.';
    return;
  }
  const selectedDrafts = drafts.value.filter(
    (draft) =>
      draft.selected &&
      Object.values(draft.front.sections).some((s) => s.trim()) &&
      Object.values(draft.back.sections).some((s) => s.trim())
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
        front: serializeCardSide(draft.front),
        back: serializeCardSide(draft.back),
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
        <button
          class="btn btn-outline gap-2"
          type="button"
          :disabled="!collection || flashcards.length === 0 || zipExporting"
          @click="handleZipExport"
        >
          <FileDown :size="18" />
          <span class="flex items-center gap-2">
            <span>Export ZIP</span>
            <span v-if="zipExporting" class="loading loading-spinner loading-xs"></span>
          </span>
        </button>
        <label
          class="btn btn-outline gap-2"
          :class="{ 'btn-disabled': !collection || zipImporting }"
        >
          <FileUp :size="18" />
          <span class="flex items-center gap-2">
            <span>Import ZIP</span>
            <span v-if="zipImporting" class="loading loading-spinner loading-xs"></span>
          </span>
          <input
            ref="zipImportInput"
            type="file"
            accept=".zip"
            class="hidden"
            :disabled="!collection || zipImporting"
            @change="handleZipImport"
          />
        </label>
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
            Uses the OpenAI API key saved in Settings. Adjust the prompt and pick which generated cards to keep.
          </p>
        </div>
        <button class="btn btn-sm" type="button" @click="closeAiModal" :disabled="generating || saving">
          Close
        </button>
      </div>

      <div class="grid gap-4 md:grid-cols-[1.2fr_auto] md:items-end">
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
        <p class="text-base-content/70 md:text-right">
          Update the API key anytime in Settings.
        </p>
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

      <!-- Per-material selection -->
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <p class="font-medium">Materials</p>
          <span v-if="materialsLoading" class="loading loading-spinner loading-xs"></span>
        </div>
        <div v-if="materialsError" class="alert alert-error">
          <span>{{ materialsError }}</span>
        </div>
        <div v-else-if="materials.length === 0" class="text-base-content/70 text-sm">
          No materials added to this collection.
        </div>
        <div v-else class="space-y-1">
          <label
            v-for="material in materials"
            :key="material.id"
            class="flex items-center gap-2 cursor-pointer"
          >
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              :checked="selectedMaterialIds.has(material.id)"
              @change="toggleMaterial(material.id)"
            />
            <span class="text-sm">{{ material.internalName || material.originalFilename }}</span>
          </label>
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <button class="btn" type="button" :disabled="generating || saving" @click="closeAiModal">
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

        <div class="space-y-3 max-h-[36rem] overflow-y-auto pr-1">
          <div
            v-for="draft in drafts"
            :key="draft.id"
            class="rounded-lg border border-base-200 p-3 space-y-3"
          >
            <!-- Checkbox + header_right -->
            <div class="flex items-center gap-3">
              <input v-model="draft.selected" type="checkbox" class="checkbox checkbox-sm flex-none" />
              <fieldset class="fieldset flex-1">
                <label class="label text-xs">Header Right (optional)</label>
                <input
                  v-model="draft.header_right"
                  type="text"
                  class="input input-sm w-full"
                  placeholder="e.g., pp. 12-14 or Level 2"
                />
              </fieldset>
            </div>

            <!-- Editors: front | back -->
            <div class="grid gap-3 md:grid-cols-2">
              <div v-for="side in (['front', 'back'] as const)" :key="side" class="space-y-2">
                <p class="text-sm font-semibold capitalize">{{ side }}</p>
                <fieldset class="fieldset">
                  <label class="label text-xs">Layout</label>
                  <select
                    class="select select-sm select-bordered w-full"
                    :value="draft[side].layout"
                    @change="setDraftLayout(draft, side, ($event.target as HTMLSelectElement).value as CardLayout)"
                  >
                    <option v-for="(label, key) in LAYOUT_LABELS" :key="key" :value="key">{{ label }}</option>
                  </select>
                </fieldset>
                <fieldset
                  v-for="sectionKey in LAYOUT_SECTIONS[draft[side].layout]"
                  :key="side + '-' + sectionKey"
                  class="fieldset"
                >
                  <label class="label text-xs capitalize">{{ sectionKey }}</label>
                  <textarea
                    v-model="draft[side].sections[sectionKey]"
                    class="textarea textarea-bordered w-full font-mono"
                    rows="3"
                    :placeholder="`${sectionKey} content (markdown)...`"
                  />
                </fieldset>
              </div>
            </div>

            <!-- Previews: front | back -->
            <div class="grid gap-3 md:grid-cols-2">
              <div v-for="side in (['front', 'back'] as const)" :key="'preview-' + side" class="space-y-1">
                <p class="text-xs text-base-content/70 capitalize">{{ side }} Preview</p>
                <CardPreview
                  :sideData="draft[side]"
                  :side="side"
                  :collection="collection ?? undefined"
                  :scale="0.45"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop" @click="closeAiModal"></div>
  </dialog>
</template>
