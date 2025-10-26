<script setup lang="ts">
import { computed, reactive, watch } from 'vue';

const props = defineProps<{
  open: boolean;
  mode: 'create' | 'edit';
  initialValues: {
    title: string;
    description?: string;
  };
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: { title: string; description: string }): void;
}>();

const form = reactive({
  title: '',
  description: '',
});

watch(
  () => [props.open, props.initialValues.title, props.initialValues.description],
  () => {
    if (props.open) {
      form.title = props.initialValues.title ?? '';
      form.description = props.initialValues.description ?? '';
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
