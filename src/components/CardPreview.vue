<script setup lang="ts">
import { computed } from 'vue';
import { useSettingsStore } from '../stores/settings';
import '../styles/cardPreview.css';

defineProps<{
  html: string;
  side: 'front' | 'back';
}>();

const settingsStore = useSettingsStore();

const cardStyle = computed(() => ({
  '--card-width': `${settingsStore.cardWidthMm}mm`,
  '--card-height': `${settingsStore.cardHeightMm}mm`,
}));
</script>

<template>
  <div class="flashcard-preview-container" :style="cardStyle">
    <div class="flashcard-preview-content" v-html="html"></div>
  </div>
</template>
