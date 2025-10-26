<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { EditorContent, useEditor, type Editor } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import type { Level } from '@tiptap/extension-heading';
import katex from 'katex';
import { createMathExtension, sharedKatexOptions } from '../editor/extensions/math';
import type { MathNodeClickHandler } from '../editor/extensions/math';
import { resizeImageToDataUrl } from '../utils/image';
import CardPreview from '../components/CardPreview.vue';
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
const headingLevel: Level = 3;

type EditorSide = 'front' | 'back';
type MathMode = 'inline' | 'block';

interface MathModalState {
  open: boolean;
  mode: MathMode;
  latex: string;
  side: EditorSide;
  pos: number | null;
  isEditing: boolean;
}

const mathModal = reactive<MathModalState>({
  open: false,
  mode: 'inline',
  latex: '',
  side: 'front',
  pos: null,
  isEditing: false,
});

const mathTextareaRef = ref<HTMLTextAreaElement | null>(null);
const mathModalError = ref<string | null>(null);

const mathPreview = computed<{ html: string; error: string | null }>(() => {
  const expression = mathModal.latex.trim();

  if (!expression) {
    return { html: '', error: null };
  }

  try {
    const html = katex.renderToString(expression, {
      ...sharedKatexOptions,
      displayMode: mathModal.mode === 'block',
    });
    return { html, error: null };
  } catch (error) {
    return {
      html: '',
      error: error instanceof Error ? error.message : 'Unable to render expression',
    };
  }
});

interface OpenMathModalOptions {
  side: EditorSide;
  mode: MathMode;
  latex: string;
  pos?: number | null;
  isEditing: boolean;
}

function resetMathModal() {
  mathModal.latex = '';
  mathModal.pos = null;
  mathModal.isEditing = false;
  mathModalError.value = null;
}

function closeMathModal() {
  mathModal.open = false;
  resetMathModal();
}

function openMathModal(options: OpenMathModalOptions) {
  mathModal.side = options.side;
  mathModal.mode = options.mode;
  mathModal.latex = options.latex;
  mathModal.pos = options.pos ?? null;
  mathModal.isEditing = options.isEditing;
  mathModal.open = true;
  mathModalError.value = null;

  nextTick(() => {
    mathTextareaRef.value?.focus();
    mathTextareaRef.value?.setSelectionRange(mathModal.latex.length, mathModal.latex.length);
  });
}

function startMathInsertion(side: EditorSide, mode: MathMode) {
  openMathModal({
    side,
    mode,
    latex: '',
    pos: null,
    isEditing: false,
  });
}

function getEditorBySide(side: EditorSide) {
  return side === 'front' ? frontEditor.value : backEditor.value;
}

function saveMathModal() {
  const editor = getEditorBySide(mathModal.side);
  if (!editor) {
    return;
  }

  const latex = mathModal.latex.trim();
  if (!latex) {
    mathModalError.value = 'Enter a LaTeX expression to continue.';
    return;
  }

  mathModalError.value = null;

  const pos = mathModal.pos ?? undefined;
  let chain = editor.chain().focus();

  if (mathModal.mode === 'inline') {
    if (mathModal.isEditing && pos !== undefined) {
      chain = chain.updateInlineMath({ latex, pos });
    } else {
      chain = chain.insertInlineMath({ latex });
    }
  } else if (mathModal.isEditing && pos !== undefined) {
    chain = chain.updateBlockMath({ latex, pos });
  } else {
    chain = chain.insertBlockMath({ latex });
  }

  if (chain.run()) {
    closeMathModal();
  }
}

function handleMathModalKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    saveMathModal();
  }
}

const isNew = computed(() => props.cardId === 'new');

function buildExtensions(side: EditorSide) {
  const handleInlineClick: MathNodeClickHandler = (node, pos) => {
    openMathModal({
      side,
      mode: 'inline',
      latex: (node.attrs.latex as string) || '',
      pos,
      isEditing: true,
    });
  };

  const handleBlockClick: MathNodeClickHandler = (node, pos) => {
    openMathModal({
      side,
      mode: 'block',
      latex: (node.attrs.latex as string) || '',
      pos,
      isEditing: true,
    });
  };

  return [
    StarterKit.configure({
      heading: {
        levels: [2, 3, 4],
      },
      codeBlock: false,
    }),
    Image.configure({
      inline: false,
    }),
    createMathExtension({
      onInlineClick: handleInlineClick,
      onBlockClick: handleBlockClick,
    }),
  ];
}

const frontExtensions = buildExtensions('front');
const backExtensions = buildExtensions('back');

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
  extensions: frontExtensions,
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
  extensions: backExtensions,
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
    } else {
      card.value = null;
      const emptyContent = '<p></p>';

      frontEditor.value?.commands.setContent(emptyContent, { emitUpdate: false });
      backEditor.value?.commands.setContent(emptyContent, { emitUpdate: false });

      frontHtml.value = emptyContent;
      backHtml.value = emptyContent;
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
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <button class="btn btn-ghost" type="button" @click="$router.back()">Back</button>
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
                <button type="button" class="btn btn-xs" @click="startMathInsertion('front', 'inline')">
                  Inline Math
                </button>
                <button type="button" class="btn btn-xs" @click="startMathInsertion('front', 'block')">
                  Block Math
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
            <CardPreview :html="frontHtml" side="front" />
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
                <button type="button" class="btn btn-xs" @click="startMathInsertion('back', 'inline')">
                  Inline Math
                </button>
                <button type="button" class="btn btn-xs" @click="startMathInsertion('back', 'block')">
                  Block Math
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
            <CardPreview :html="backHtml" side="back" />
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

    <dialog v-if="mathModal.open" class="modal modal-open" open>
      <div class="modal-box math-modal space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-xl font-semibold">
              {{ mathModal.isEditing ? 'Edit' : 'Insert' }} {{ mathModal.mode === 'inline' ? 'Inline' : 'Block' }} Math
            </h3>
            <p class="text-sm text-base-content/70">
              Enter LaTeX to render with KaTeX.
            </p>
          </div>
          <button class="btn btn-sm btn-ghost" type="button" @click="closeMathModal">Close</button>
        </div>
        <fieldset class="fieldset">
          <legend class="fieldset-legend">LaTeX Expression</legend>
          <textarea
            id="math-expression"
            ref="mathTextareaRef"
            class="textarea textarea-bordered"
            :rows="mathModal.mode === 'block' ? 5 : 3"
            placeholder="Enter LaTeX, e.g. \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"
            v-model="mathModal.latex"
            @keydown="handleMathModalKeydown"
          ></textarea>
        </fieldset>
        <p v-if="mathModalError" class="text-sm text-error">
          {{ mathModalError }}
        </p>
        <div v-if="mathModal.latex.trim().length" class="math-modal-preview">
          <p class="text-xs text-base-content/60 mb-2">Live preview (KaTeX)</p>
          <div v-if="mathPreview.html" v-html="mathPreview.html"></div>
          <p v-else class="text-error text-sm">{{ mathPreview.error }}</p>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button class="btn btn-primary" type="button" @click="saveMathModal">
            {{ mathModal.isEditing ? 'Update Math' : 'Insert Math' }}
          </button>
          <button class="btn" type="button" @click="closeMathModal">Cancel</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeMathModal">close</button>
      </form>
    </dialog>
  </div>
</template>
