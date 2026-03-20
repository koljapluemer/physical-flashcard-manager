<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { Image as ImageIcon } from 'lucide-vue-next';
import { uploadImage } from '../api/images';

const props = defineProps<{
  modelValue: string | undefined;
  collectionId: string;
  heightClass: string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const textareaEl = ref<HTMLTextAreaElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const uploadError = ref<string | null>(null);

async function handleFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ''; // reset immediately so the same file can be re-selected
  if (!file) return;

  // Capture cursor position before await — user may lose focus during upload
  const current = props.modelValue ?? '';
  const start = textareaEl.value?.selectionStart ?? current.length;
  const end = textareaEl.value?.selectionEnd ?? start;

  uploading.value = true;
  uploadError.value = null;

  try {
    const url = await uploadImage(file, props.collectionId);
    const snippet = `![image](${url})`;
    const next = current.slice(0, start) + snippet + current.slice(end);
    emit('update:modelValue', next);

    await nextTick();
    if (textareaEl.value) {
      const cursorPos = start + snippet.length;
      textareaEl.value.focus();
      textareaEl.value.setSelectionRange(cursorPos, cursorPos);
    }
  } catch (err) {
    uploadError.value = err instanceof Error ? err.message : 'Upload failed';
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <div class="section-editor">
    <div class="section-editor-toolbar">
      <button
        type="button"
        class="btn btn-ghost btn-xs"
        :disabled="uploading"
        title="Upload image"
        @click="fileInput?.click()"
      >
        <span v-if="uploading" class="loading loading-spinner loading-xs" />
        <ImageIcon v-else :size="14" />
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        style="display:none"
        @change="handleFile"
      />
    </div>
    <textarea
      ref="textareaEl"
      :value="modelValue"
      :class="`textarea textarea-bordered w-full font-mono ${heightClass}`"
      :placeholder="placeholder ?? 'Enter markdown...'"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <div v-if="uploadError" class="text-xs" style="color:var(--danger);margin-top:0.25rem">
      {{ uploadError }}
    </div>
  </div>
</template>

<style scoped>
.section-editor {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.section-editor-toolbar {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  background: var(--surface-muted);
}

.section-editor :deep(.textarea) {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}
</style>
