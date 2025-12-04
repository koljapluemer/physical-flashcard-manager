<script setup lang="ts">
import { computed, watch, withDefaults } from 'vue';
import { useSettingsStore } from '../stores/settings';
import { renderMathHtml } from '../utils/math';
import { hexToRgba, normalizeHexColor } from '../utils/color';
import { getFontCSSValue, loadGoogleFont } from '../utils/fonts';
import type { Collection, Flashcard } from '../types';
import '../styles/cardPreview.css';

const props = withDefaults(
  defineProps<{
    html?: string;
    side?: 'front' | 'back';
    collection?: Collection;
    flashcard?: Flashcard;
    frontOnly?: boolean;
    useDemoValues?: boolean;
    demoFrontHtml?: string;
    demoBackHtml?: string;
    demoHeaderRight?: string;
    scale?: number;
  }>(),
  {
    html: '',
    side: 'front',
    frontOnly: false,
    useDemoValues: false,
    demoFrontHtml: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>',
    demoBackHtml: '<p>Aliquam convallis massa et sapien faucibus, vitae placerat velit efficitur.</p>',
    demoHeaderRight: 'Page 1',
    scale: 1,
  }
);

const settingsStore = useSettingsStore();

watch(
  () => props.collection?.font_family,
  (fontFamily) => {
    if (fontFamily) {
      loadGoogleFont(fontFamily);
    }
  },
  { immediate: true }
);

const cardStyle = computed(() => {
  const headerColor = normalizeHexColor(props.collection?.header_color);
  const widthMm = parseFloat(props.collection?.width_mm ?? String(settingsStore.cardWidthMm));
  const heightMm = parseFloat(props.collection?.height_mm ?? String(settingsStore.cardHeightMm));

  return {
    '--card-width': `${widthMm * props.scale}mm`,
    '--card-height': `${heightMm * props.scale}mm`,
    '--card-scale': `${props.scale}`,
    '--header-color': headerColor,
    '--background-color': props.collection?.background_color ?? '#f0f0f0',
    '--font-color': props.collection?.font_color ?? '#171717',
    '--header-font-color': props.collection?.header_font_color ?? '#ffffff',
    '--font-family': getFontCSSValue(props.collection?.font_family ?? 'Arial'),
    '--box-bg-color': hexToRgba(headerColor, 0.08),
    '--box-border-color': hexToRgba(headerColor, 0.16),
  };
});

const resolvedSide = computed(() => (props.frontOnly ? 'front' : props.side));

const renderedHtml = computed(() => {
  const content = props.html?.trim();
  if (content) {
    return renderMathHtml(content);
  }
  if (props.useDemoValues) {
    const fallback = resolvedSide.value === 'front' ? props.demoFrontHtml : props.demoBackHtml;
    return renderMathHtml(fallback);
  }
  return '';
});

const headerTextLeft = computed(() => props.collection?.header_text_left ?? '');
const headerTextRight = computed(() =>
  resolvedSide.value === 'front'
    ? props.flashcard?.header_right ?? (props.useDemoValues ? props.demoHeaderRight : '')
    : ''
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
