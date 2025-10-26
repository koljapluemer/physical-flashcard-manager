<script setup lang="ts">
import { computed } from 'vue';
import { useSettingsStore } from '../stores/settings';
import { renderMathHtml } from '../utils/math';
import '../styles/cardPreview.css';

const props = defineProps<{
  html: string;
  side: 'front' | 'back';
}>();

const settingsStore = useSettingsStore();

const cardStyle = computed(() => ({
  '--card-width': `${settingsStore.cardWidthMm}mm`,
  '--card-height': `${settingsStore.cardHeightMm}mm`,
}));

const renderedHtml = computed(() => renderMathHtml(props.html));
</script>

<template>
  <div class="flashcard-preview-container" :style="cardStyle">
    <div class="flashcard-preview-content" v-html="renderedHtml"></div>
  </div>
</template>
