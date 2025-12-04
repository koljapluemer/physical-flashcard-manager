<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { EditorContent, useEditor, type Editor } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import type { Level } from '@tiptap/extension-heading';
import { Box } from '../editor/extensions/box';
import { MathExtensionConfigured, MathSelectionCommands } from '../editor/extensions/math';
import { hexToRgba, normalizeHexColor } from '../utils/color';
import { resizeImageToDataUrl } from '../utils/image';
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
const frontHtml = ref('');
const backHtml = ref('');
const headerRight = ref('');
const headingLevel: Level = 3;

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

const editorExtensions = [
  StarterKit.configure({
    heading: {
      levels: [2, 3, 4],
    },
    codeBlock: false,
  }),
  Box,
  Image.configure({
    inline: false,
  }),
  MathExtensionConfigured,
  MathSelectionCommands,
];

function handleImageEvent(event: ClipboardEvent | DragEvent, editor: Editor | undefined) {
  const transfer = 'clipboardData' in event ? event.clipboardData : event.dataTransfer;
  if (!transfer) {
    return false;
  }

  const files = Array.from(transfer.files ?? []);
  const images = files.filter((file) => file.type.startsWith('image/'));
  if (!images.length || !editor) {
    return false;
  }

  event.preventDefault();
  void insertResizedImages(images, editor);
  return true;
}

async function insertResizedImages(files: File[], editor: Editor) {
  for (const file of files) {
    try {
      const dataUrl = await resizeImageToDataUrl(file, 700);
      editor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();
    } catch (error) {
      console.error('Failed to resize image', error);
    }
  }
}

const frontEditor = useEditor({
  content: '',
  extensions: editorExtensions,
  editorProps: {
    handlePaste: (_view, event) => handleImageEvent(event, frontEditor.value),
    handleDrop: (_view, event) => handleImageEvent(event, frontEditor.value),
  },
  onUpdate: ({ editor }) => {
    frontHtml.value = editor.getHTML();
  },
});

const backEditor = useEditor({
  content: '',
  extensions: editorExtensions,
  editorProps: {
    handlePaste: (_view, event) => handleImageEvent(event, backEditor.value),
    handleDrop: (_view, event) => handleImageEvent(event, backEditor.value),
  },
  onUpdate: ({ editor }) => {
    backHtml.value = editor.getHTML();
  },
});

async function loadData() {
  const collectionId = parseInt(props.id, 10);

  try {
    collection.value = await collectionsApi.getCollection(collectionId);

    if (!isNew.value) {
      const cardIdNum = parseInt(props.cardId, 10);
      card.value = await flashcardsApi.getFlashcard(cardIdNum);

      const frontContent = card.value.front || '<p></p>';
      const backContent = card.value.back || '<p></p>';

      frontEditor.value?.commands.setContent(frontContent, { emitUpdate: false });
      backEditor.value?.commands.setContent(backContent, { emitUpdate: false });

      frontHtml.value = frontContent;
      backHtml.value = backContent;
      headerRight.value = card.value.header_right || '';
    } else {
      card.value = null;
      const emptyContent = '<p></p>';

      frontEditor.value?.commands.setContent(emptyContent, { emitUpdate: false });
      backEditor.value?.commands.setContent(emptyContent, { emitUpdate: false });

      frontHtml.value = emptyContent;
      backHtml.value = emptyContent;
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

function toggleBold(editor: Editor | undefined) {
  editor?.chain().focus().toggleBold().run();
}

function toggleItalic(editor: Editor | undefined) {
  editor?.chain().focus().toggleItalic().run();
}

function toggleBulletList(editor: Editor | undefined) {
  editor?.chain().focus().toggleBulletList().run();
}

function toggleOrderedList(editor: Editor | undefined) {
  editor?.chain().focus().toggleOrderedList().run();
}

function setHeading(editor: Editor | undefined, level: Level) {
  editor?.chain().focus().toggleHeading({ level }).run();
}

async function handleSave() {
  if (!frontEditor.value || !backEditor.value) {
    return;
  }

  saveLoading.value = true;

  try {
    const collectionId = parseInt(props.id, 10);

    if (isNew.value) {
      await flashcardsApi.createFlashcard({
        collection: collectionId,
        front: frontEditor.value.getHTML(),
        back: backEditor.value.getHTML(),
        header_right: headerRight.value.trim() || undefined,
      });
    } else {
      const cardIdNum = parseInt(props.cardId, 10);
      await flashcardsApi.updateFlashcard(cardIdNum, {
        front: frontEditor.value.getHTML(),
        back: backEditor.value.getHTML(),
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

function insertImageFromPicker(editor: Editor | undefined, event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files ? Array.from(target.files) : [];
  if (!files.length || !editor) {
    return;
  }
  void insertResizedImages(files, editor);
  target.value = '';
}

function fillHeaderRight(text: string) {
  headerRight.value = text;
}

function applyAiSuggestion(payload: { front: string; back: string; header_right?: string }) {
  if (frontEditor.value) {
    frontEditor.value.commands.setContent(payload.front, { emitUpdate: false });
    frontHtml.value = payload.front;
  }
  if (backEditor.value) {
    backEditor.value.commands.setContent(payload.back, { emitUpdate: false });
    backHtml.value = payload.back;
  }
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
            <div class="editor-container">
              <div class="editor-toolbar">
                <button
                  type="button"
                  class="btn btn-xs"
                  :class="{ 'btn-active': frontEditor?.isActive('bold') }"
                  @click="toggleBold(frontEditor)"
                >
                  Bold
                </button>
                <button
                  type="button"
                  class="btn btn-xs"
                  :class="{ 'btn-active': frontEditor?.isActive('italic') }"
                  @click="toggleItalic(frontEditor)"
                >
                  Italic
                </button>
                <button type="button" class="btn btn-xs" @click="toggleBulletList(frontEditor)">Bullets</button>
                <button type="button" class="btn btn-xs" @click="toggleOrderedList(frontEditor)">Numbered</button>
                <button type="button" class="btn btn-xs" @click="setHeading(frontEditor, headingLevel)">
                  Heading
                </button>
                <button
                  type="button"
                  class="btn btn-xs"
                  :class="{ 'btn-active': frontEditor?.isActive('box') }"
                  @click="frontEditor?.chain().focus().toggleBox().run()"
                >
                  Box
                </button>
                <button
                  type="button"
                  class="btn btn-xs"
                  :disabled="frontEditor?.state.selection.empty"
                  @click="frontEditor?.commands.selectionToInlineMath()"
                  title="Convert selected text to math (Ctrl+Shift+M). Or just type $...$"
                >
                  Selection → Math
                </button>
                <label class="btn btn-xs">
                  Image
                  <input
                    type="file"
                    class="hidden"
                    accept="image/*"
                    @change="insertImageFromPicker(frontEditor, $event)"
                  />
                </label>
              </div>
              <EditorContent v-if="frontEditor" :editor="frontEditor" />
            </div>
          </div>
        </div>

        <div class="card bg-base-100 shadow">
          <div class="card-body space-y-3">
            <h3 class="card-title text-lg">Front Preview</h3>
            <CardPreview
              :html="frontHtml"
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
            <div class="editor-container">
              <div class="editor-toolbar">
                <button
                  type="button"
                  class="btn btn-xs"
                  :class="{ 'btn-active': backEditor?.isActive('bold') }"
                  @click="toggleBold(backEditor)"
                >
                  Bold
                </button>
                <button
                  type="button"
                  class="btn btn-xs"
                  :class="{ 'btn-active': backEditor?.isActive('italic') }"
                  @click="toggleItalic(backEditor)"
                >
                  Italic
                </button>
                <button type="button" class="btn btn-xs" @click="toggleBulletList(backEditor)">Bullets</button>
                <button type="button" class="btn btn-xs" @click="toggleOrderedList(backEditor)">Numbered</button>
                <button type="button" class="btn btn-xs" @click="setHeading(backEditor, headingLevel)">
                  Heading
                </button>
                <button
                  type="button"
                  class="btn btn-xs"
                  :class="{ 'btn-active': backEditor?.isActive('box') }"
                  @click="backEditor?.chain().focus().toggleBox().run()"
                >
                  Box
                </button>
                <button
                  type="button"
                  class="btn btn-xs"
                  :disabled="backEditor?.state.selection.empty"
                  @click="backEditor?.commands.selectionToInlineMath()"
                  title="Convert selected text to math (Ctrl+Shift+M). Or just type $...$"
                >
                  Selection → Math
                </button>
                <label class="btn btn-xs">
                  Image
                  <input
                    type="file"
                    class="hidden"
                    accept="image/*"
                    @change="insertImageFromPicker(backEditor, $event)"
                  />
                </label>
              </div>
              <EditorContent v-if="backEditor" :editor="backEditor" />
            </div>
          </div>
        </div>

        <div class="card bg-base-100 shadow">
          <div class="card-body space-y-3">
            <h3 class="card-title text-lg">Back Preview</h3>
            <CardPreview
              :html="backHtml"
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
      :front-html="frontHtml"
      :back-html="backHtml"
      :header-right="headerRight"
      @apply-suggestion="applyAiSuggestion"
    />
  </div>
</template>
