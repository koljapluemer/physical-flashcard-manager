<script setup lang="ts">
import { computed } from 'vue';
import { useSettingsStore } from '../stores/settings';
import { renderMathHtml } from '../utils/math';
import type { Collection, Flashcard } from '../types';
import '../styles/cardPreview.css';

const props = defineProps<{
  html: string;
  side: 'front' | 'back';
  collection?: Collection;
  flashcard?: Flashcard;
}>();

const settingsStore = useSettingsStore();

const cardStyle = computed(() => ({
  '--card-width': `${settingsStore.cardWidthMm}mm`,
  '--card-height': `${settingsStore.cardHeightMm}mm`,
  '--header-color': props.collection?.header_color ?? '#100e75',
  '--background-color': props.collection?.background_color ?? '#f0f0f0',
  '--font-color': props.collection?.font_color ?? '#171717',
  '--header-font-color': props.collection?.header_font_color ?? '#ffffff',
}));

const renderedHtml = computed(() => renderMathHtml(props.html));
const headerTextLeft = computed(() => props.collection?.header_text_left ?? '');
const headerTextRight = computed(() =>
  props.side === 'front' ? (props.flashcard?.header_right ?? '') : ''
);
const showHeader = computed(() => headerTextLeft.value || headerTextRight.value);
</script>

<template>
  <div class="flashcard-preview-container" :style="cardStyle">
    <div v-if="showHeader" class="flashcard-header">
      <span v-if="headerTextLeft" class="flashcard-header-left">{{ headerTextLeft }}</span>
      <span v-if="headerTextRight" class="flashcard-header-right">{{ headerTextRight }}</span>
    </div>
    <div class="flashcard-preview-content" v-html="renderedHtml"></div>
  </div>
</template>
