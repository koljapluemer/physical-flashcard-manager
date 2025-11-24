<script setup lang="ts">
import { computed, reactive, watch } from 'vue';

const props = defineProps<{
  open: boolean;
  mode: 'create' | 'edit';
  initialValues: {
    title: string;
    description?: string;
    header_color?: string;
    background_color?: string;
    font_color?: string;
    header_font_color?: string;
    header_text_left?: string;
  };
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: {
    title: string;
    description: string;
    header_color: string;
    background_color: string;
    font_color: string;
    header_font_color: string;
    header_text_left: string;
  }): void;
}>();

const form = reactive({
  title: '',
  description: '',
  header_color: '#100e75',
  background_color: '#f0f0f0',
  font_color: '#171717',
  header_font_color: '#ffffff',
  header_text_left: '',
});

watch(
  () => [props.open, props.initialValues],
  () => {
    if (props.open) {
      form.title = props.initialValues.title ?? '';
      form.description = props.initialValues.description ?? '';
      form.header_color = props.initialValues.header_color ?? '#100e75';
      form.background_color = props.initialValues.background_color ?? '#f0f0f0';
      form.font_color = props.initialValues.font_color ?? '#171717';
      form.header_font_color = props.initialValues.header_font_color ?? '#ffffff';
      form.header_text_left = props.initialValues.header_text_left ?? '';
    }
  },
  { immediate: true }
);

function handleClose() {
  emit('close');
}

function handleSubmit() {
  if (!form.title.trim()) {
    return;
  }

  emit('submit', {
    title: form.title.trim(),
    description: form.description.trim(),
    header_color: form.header_color,
    background_color: form.background_color,
    font_color: form.font_color,
    header_font_color: form.header_font_color,
    header_text_left: form.header_text_left.trim(),
  });
}

const heading = computed(() =>
  props.mode === 'create' ? 'Create Collection' : 'Edit Collection'
);

const descriptionText = computed(() =>
  props.mode === 'create'
    ? 'Define a new deck with a title and optional description.'
    : 'Update the collection details below.'
);
</script>

<template>
  <dialog v-if="open" class="modal modal-open" open>
    <div class="modal-box space-y-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="text-xl font-semibold">{{ heading }}</h3>
          <p class="text-sm text-base-content/70">
            {{ descriptionText }}
          </p>
        </div>
        <button class="btn btn-sm btn-ghost" type="button" @click="handleClose">Close</button>
      </div>

      <div class="space-y-4">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">Title</legend>
          <input
            v-model="form.title"
            type="text"
            placeholder="Algebra basics"
            class="input input-bordered w-full"
          />
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend">Description</legend>
          <textarea
            v-model="form.description"
            rows="3"
            class="textarea textarea-bordered w-full"
            placeholder="Optional description"
          ></textarea>
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend">Header Text (Left)</legend>
          <input
            v-model="form.header_text_left"
            type="text"
            placeholder="e.g., Chapter 1"
            class="input input-bordered w-full"
          />
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend">Header Color</legend>
          <input
            v-model="form.header_color"
            type="color"
            class="input input-bordered w-24 h-12 cursor-pointer"
          />
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend">Header Font Color</legend>
          <input
            v-model="form.header_font_color"
            type="color"
            class="input input-bordered w-24 h-12 cursor-pointer"
          />
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend">Background Color</legend>
          <input
            v-model="form.background_color"
            type="color"
            class="input input-bordered w-24 h-12 cursor-pointer"
          />
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend">Font Color</legend>
          <input
            v-model="form.font_color"
            type="color"
            class="input input-bordered w-24 h-12 cursor-pointer"
          />
        </fieldset>
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <button class="btn btn-ghost" type="button" @click="handleClose">Cancel</button>
        <button class="btn btn-primary" type="button" :disabled="loading" @click="handleSubmit">
          <span v-if="loading" class="loading loading-spinner loading-xs mr-2"></span>
          {{ mode === 'create' ? 'Create' : 'Save Changes' }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="handleClose">close</button>
    </form>
  </dialog>
</template>
