<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import CardPreview from './CardPreview.vue';
import { GOOGLE_FONTS } from '../utils/fonts';
import type { Collection } from '../types';

const props = defineProps<{
  open: boolean;
  mode: 'create' | 'edit';
  initialValues: {
    title: string;
    description?: string;
    width_mm?: string;
    height_mm?: string;
    font_family?: string;
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
    width_mm: string;
    height_mm: string;
    font_family: string;
    header_color: string;
    background_color: string;
    font_color: string;
    header_font_color: string;
    header_text_left: string;
  }): void;
}>();

interface DimensionPreset {
  label: string;
  width_mm: string;
  height_mm: string;
}

const dimensionPresets: DimensionPreset[] = [
  { label: 'wirmachendruck Business Card', width_mm: '85', height_mm: '55' },
  { label: 'wirmachendruck DINA6 Postcard', width_mm: '148', height_mm: '105' },
];

const form = reactive({
  title: '',
  description: '',
  width_mm: '148',
  height_mm: '105',
  font_family: 'Arial',
  header_color: '#100e75',
  background_color: '#f0f0f0',
  font_color: '#171717',
  header_font_color: '#ffffff',
  header_text_left: '',
});

const selectedPresetIndex = ref<number | null>(0);
const customWidth = ref('148');
const customHeight = ref('105');

watch(
  () => [props.open, props.initialValues],
  () => {
    if (props.open) {
      form.title = props.initialValues.title ?? '';
      form.description = props.initialValues.description ?? '';
      form.width_mm = props.initialValues.width_mm ?? '148.5';
      form.height_mm = props.initialValues.height_mm ?? '105';
      form.font_family = props.initialValues.font_family ?? 'Arial';
      form.header_color = props.initialValues.header_color ?? '#100e75';
      form.background_color = props.initialValues.background_color ?? '#f0f0f0';
      form.font_color = props.initialValues.font_color ?? '#171717';
      form.header_font_color = props.initialValues.header_font_color ?? '#ffffff';
      form.header_text_left = props.initialValues.header_text_left ?? '';

      const presetIndex = dimensionPresets.findIndex(
        (preset) => preset.width_mm === form.width_mm && preset.height_mm === form.height_mm
      );
      if (presetIndex !== -1) {
        selectedPresetIndex.value = presetIndex;
      } else {
        selectedPresetIndex.value = null;
        customWidth.value = form.width_mm;
        customHeight.value = form.height_mm;
      }
    }
  },
  { immediate: true }
);

function selectPreset(index: number) {
  selectedPresetIndex.value = index;
  const preset = dimensionPresets[index];
  if (preset) {
    form.width_mm = preset.width_mm;
    form.height_mm = preset.height_mm;
  }
}

function selectCustom() {
  selectedPresetIndex.value = null;
  form.width_mm = customWidth.value;
  form.height_mm = customHeight.value;
}

watch([customWidth, customHeight], () => {
  if (selectedPresetIndex.value === null) {
    form.width_mm = customWidth.value;
    form.height_mm = customHeight.value;
  }
});

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
    width_mm: form.width_mm,
    height_mm: form.height_mm,
    font_family: form.font_family,
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

const previewCollection = computed<Collection>(() => ({
  id: 0,
  title: form.title || 'Sample Collection',
  description: form.description,
  width_mm: form.width_mm,
  height_mm: form.height_mm,
  font_family: form.font_family,
  header_color: form.header_color,
  background_color: form.background_color,
  font_color: form.font_color,
  header_font_color: form.header_font_color,
  header_text_left: form.header_text_left,
  created_at: '',
  updated_at: '',
}));
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
        <button class="btn btn-sm " type="button" @click="handleClose">Close</button>
      </div>

      <div class="space-y-2">
        <p class="text-sm text-base-content/70">Example card</p>
        <CardPreview
          :collection="previewCollection"
          side="front"
          :front-only="true"
          :use-demo-values="true"
        />
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
          <legend class="fieldset-legend">Card Dimensions</legend>
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <tbody>
                <tr v-for="(preset, index) in dimensionPresets" :key="index" class="hover">
                  <td class="w-12">
                    <input
                      type="radio"
                      :name="'dimension-preset'"
                      :checked="selectedPresetIndex === index"
                      @change="selectPreset(index)"
                      class="radio radio-sm"
                    />
                  </td>
                  <td>{{ preset.label }}</td>
                  <td class="text-right">{{ preset.width_mm }} × {{ preset.height_mm }} mm</td>
                </tr>
                <tr class="hover">
                  <td class="w-12">
                    <input
                      type="radio"
                      :name="'dimension-preset'"
                      :checked="selectedPresetIndex === null"
                      @change="selectCustom"
                      class="radio radio-sm"
                    />
                  </td>
                  <td>Custom:</td>
                  <td class="text-right">
                    <div class="flex items-center gap-2 justify-end">
                      <input
                        v-model="customWidth"
                        type="number"
                        step="0.1"
                        min="10"
                        class="input input-bordered input-sm w-20"
                        :disabled="selectedPresetIndex !== null"
                        @focus="selectCustom"
                      />
                      <span>×</span>
                      <input
                        v-model="customHeight"
                        type="number"
                        step="0.1"
                        min="10"
                        class="input input-bordered input-sm w-20"
                        :disabled="selectedPresetIndex !== null"
                        @focus="selectCustom"
                      />
                      <span>mm</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend">Font Family</legend>
          <select v-model="form.font_family" class="select select-bordered w-full">
            <option v-for="font in GOOGLE_FONTS" :key="font.name" :value="font.name">
              {{ font.displayName }}
            </option>
          </select>
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
        <button class="btn " type="button" @click="handleClose">Cancel</button>
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
