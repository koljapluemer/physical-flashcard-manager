<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { EditorContent, useEditor, type Editor } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import type { Level } from '@tiptap/extension-heading';
import { NodeSelection } from 'prosemirror-state';
import { MathBlock, MathInline } from '../editor/extensions/math';
import { resizeImageToDataUrl } from '../utils/image';
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
const showFrontPreview = ref(false);
const showBackPreview = ref(false);
const headingLevel: Level = 3;

const isNew = computed(() => props.cardId === 'new');

const extensions = [
  StarterKit.configure({
    heading: {
      levels: [2, 3, 4],
    },
    codeBlock: false,
  }),
  Image.configure({
    inline: false,
  }),
  MathInline,
  MathBlock,
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
  extensions,
  editorProps: {
    handlePaste: (_view, event) => handleImageEvent(event, frontEditor.value),
    handleDrop: (_view, event) => handleImageEvent(event, frontEditor.value),
  },
});

const backEditor = useEditor({
  content: '',
  extensions,
  editorProps: {
    handlePaste: (_view, event) => handleImageEvent(event, backEditor.value),
    handleDrop: (_view, event) => handleImageEvent(event, backEditor.value),
  },
});

async function loadData() {
  const collectionId = parseInt(props.id, 10);

  try {
    collection.value = await collectionsApi.getCollection(collectionId);

    if (!isNew.value) {
      const cardIdNum = parseInt(props.cardId, 10);
      card.value = await flashcardsApi.getFlashcard(cardIdNum);

      frontEditor.value?.commands.setContent(card.value.front || '', { emitUpdate: false });
      backEditor.value?.commands.setContent(card.value.back || '', { emitUpdate: false });
    } else {
      card.value = null;
      frontEditor.value?.commands.setContent('<p></p>', { emitUpdate: false });
      backEditor.value?.commands.setContent('<p></p>', { emitUpdate: false });
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

function promptMath(editor: Editor | undefined, mode: 'inline' | 'block') {
  if (!editor) {
    return;
  }

  const selection = editor.state.selection;
  const node =
    (selection instanceof NodeSelection && selection.node) ||
    selection.$from.nodeAfter ||
    selection.$from.nodeBefore;

  const isInline = node?.type.name === 'mathInline';
  const isBlock = node?.type.name === 'mathBlock';

  const currentExpression =
    (isInline || isBlock) && node?.attrs.expression
      ? (node.attrs.expression as string)
      : '';

  const expression = window.prompt(
    mode === 'inline' ? 'Enter LaTeX expression for inline math' : 'Enter LaTeX expression for block math',
    currentExpression,
  );

  if (!expression) {
    return;
  }

  if (mode === 'inline') {
    editor.chain().focus().setMathInline(expression).run();
  } else {
    editor.chain().focus().setMathBlock(expression).run();
  }
}

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
      });
    } else {
      const cardIdNum = parseInt(props.cardId, 10);
      await flashcardsApi.updateFlashcard(cardIdNum, {
        front: frontEditor.value.getHTML(),
        back: backEditor.value.getHTML(),
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
</script>

<template>
  <div>
    <button class="button is-light mb-4" type="button" @click="$router.back()">Back</button>

    <div class="mb-5">
      <h1 class="title">Flashcard Editor</h1>
      <p class="subtitle">
        {{ collection?.title || 'Collection' }}
        <span v-if="!isNew">· Editing card</span>
        <span v-else>· New card</span>
      </p>
    </div>

    <div class="columns">
      <div class="column is-half">
        <h2 class="title is-5">Front</h2>
        <div class="editor-container mb-4">
          <div class="editor-toolbar">
            <button
              type="button"
              @click="toggleBold(frontEditor)"
              :class="{ 'is-active': frontEditor?.isActive('bold') }"
            >
              Bold
            </button>
            <button
              type="button"
              @click="toggleItalic(frontEditor)"
              :class="{ 'is-active': frontEditor?.isActive('italic') }"
            >
              Italic
            </button>
            <button type="button" @click="toggleBulletList(frontEditor)">
              Bullets
            </button>
            <button type="button" @click="toggleOrderedList(frontEditor)">
              Numbered
            </button>
            <button type="button" @click="setHeading(frontEditor, headingLevel)">
              Heading
            </button>
            <button type="button" @click="promptMath(frontEditor, 'inline')">
              Inline Math
            </button>
            <button type="button" @click="promptMath(frontEditor, 'block')">
              Block Math
            </button>
            <label class="button">
              Image
              <input type="file" class="is-hidden" accept="image/*" @change="insertImageFromPicker(frontEditor, $event)" />
            </label>
            <button type="button" @click="showFrontPreview = !showFrontPreview">
              {{ showFrontPreview ? 'Hide' : 'Preview' }}
            </button>
          </div>
          <EditorContent v-if="frontEditor" :editor="frontEditor" />
        </div>
        <div v-if="showFrontPreview" class="box">
          <h3 class="title is-6">Front Preview</h3>
          <div v-html="frontEditor?.getHTML()"></div>
        </div>
      </div>

      <div class="column is-half">
        <h2 class="title is-5">Back</h2>
        <div class="editor-container mb-4">
          <div class="editor-toolbar">
            <button
              type="button"
              @click="toggleBold(backEditor)"
              :class="{ 'is-active': backEditor?.isActive('bold') }"
            >
              Bold
            </button>
            <button
              type="button"
              @click="toggleItalic(backEditor)"
              :class="{ 'is-active': backEditor?.isActive('italic') }"
            >
              Italic
            </button>
            <button type="button" @click="toggleBulletList(backEditor)">
              Bullets
            </button>
            <button type="button" @click="toggleOrderedList(backEditor)">
              Numbered
            </button>
            <button type="button" @click="setHeading(backEditor, headingLevel)">
              Heading
            </button>
            <button type="button" @click="promptMath(backEditor, 'inline')">
              Inline Math
            </button>
            <button type="button" @click="promptMath(backEditor, 'block')">
              Block Math
            </button>
            <label class="button">
              Image
              <input type="file" class="is-hidden" accept="image/*" @change="insertImageFromPicker(backEditor, $event)" />
            </label>
            <button type="button" @click="showBackPreview = !showBackPreview">
              {{ showBackPreview ? 'Hide' : 'Preview' }}
            </button>
          </div>
          <EditorContent v-if="backEditor" :editor="backEditor" />
        </div>
        <div v-if="showBackPreview" class="box">
          <h3 class="title is-6">Back Preview</h3>
          <div v-html="backEditor?.getHTML()"></div>
        </div>
      </div>
    </div>

    <div class="buttons mt-4">
      <button class="button is-primary" type="button" @click="handleSave" :disabled="saveLoading">
        {{ saveLoading ? 'Saving…' : 'Save Card' }}
      </button>
      <button class="button is-light" type="button" @click="$router.back()">Cancel</button>
    </div>
  </div>
</template>
