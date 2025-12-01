<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { Plus } from 'lucide-vue-next';
import * as materialsApi from '../api/materials';
import type { Collection } from '../types';

const props = defineProps<{
  open: boolean;
  collection: Collection | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'created'): void;
}>();

const formState = reactive({
  file: null as File | null,
  internalName: '',
  pageRangeStart: 1,
  pageRangeEnd: 1,
  submitting: false,
});

const error = ref<string | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

watch(
  () => props.open,
  (open) => {
    if (!open) {
      resetForm();
    }
  }
);

function resetForm() {
  formState.file = null;
  formState.internalName = '';
  formState.pageRangeStart = 1;
  formState.pageRangeEnd = 1;
  error.value = null;
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  formState.file = input.files?.[0] ?? null;
}

async function submitForm() {
  if (!props.collection || !formState.file) {
    error.value = !formState.file ? 'Pick a PDF to upload.' : 'Select a collection first.';
    return;
  }

  formState.submitting = true;
  error.value = null;

  try {
    await materialsApi.createMaterial({
      collectionId: props.collection.id,
      file: formState.file,
      internalName: formState.internalName,
      pageRangeStart: formState.pageRangeStart,
      pageRangeEnd: formState.pageRangeEnd,
    });
    emit('created');
    emit('close');
    resetForm();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to add material';
  } finally {
    formState.submitting = false;
  }
}

function close() {
  emit('close');
}
</script>

<template>
  <div v-if="open" class="modal modal-open">
    <div class="modal-box space-y-4">
      <div class="flex items-start justify-between">
        <div>
          <h3 class="text-xl font-semibold">Add material</h3>
          <p class="text-base-content/70">Upload a PDF and choose the page range to keep.</p>
        </div>
        <button class="btn  btn-sm" type="button" @click="close">Close</button>
      </div>

      <form class="grid gap-4 md:grid-cols-2" @submit.prevent="submitForm">
        <fieldset class="fieldset md:col-span-2">
          <label class="label" for="material-file">PDF</label>
          <input
            id="material-file"
            ref="fileInputRef"
            type="file"
            name="material-file"
            accept="application/pdf"
            class="file-input"
            @change="handleFileChange"
            required
          />
        </fieldset>

        <fieldset class="fieldset md:col-span-2">
          <label class="label" for="material-name">Internal name (optional)</label>
          <input
            id="material-name"
            type="text"
            name="material-name"
            class="input"
            placeholder="Chapter 3 notes"
            v-model="formState.internalName"
          />
        </fieldset>

        <fieldset class="fieldset">
          <label class="label" for="page-start">Page start</label>
          <input
            id="page-start"
            type="number"
            name="page-start"
            class="input"
            min="1"
            v-model.number="formState.pageRangeStart"
            required
          />
        </fieldset>

        <fieldset class="fieldset">
          <label class="label" for="page-end">Page end</label>
          <input
            id="page-end"
            type="number"
            name="page-end"
            class="input"
            min="1"
            v-model.number="formState.pageRangeEnd"
            required
          />
        </fieldset>

        <div class="md:col-span-2 flex justify-end gap-2">
          <button class="btn " type="button" @click="close" :disabled="formState.submitting">
            Cancel
          </button>
          <button class="btn btn-primary" type="submit" :disabled="formState.submitting || !formState.file">
            <span v-if="formState.submitting" class="loading loading-spinner loading-xs mr-2"></span>
            <Plus :size="18" />
            <span>Add PDF</span>
          </button>
        </div>
      </form>

      <div v-if="error" class="alert alert-error">
        <span>{{ error }}</span>
      </div>
    </div>
    <div class="modal-backdrop" @click="close"></div>
  </div>
</template>
