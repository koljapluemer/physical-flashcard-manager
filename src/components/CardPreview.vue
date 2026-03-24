<script setup lang="ts">
import { computed, ref, watch, withDefaults } from 'vue';
import { useSettingsStore } from '../stores/settings';
import { markdownToHtml } from '../utils/markdownToHtml';
import { hexToRgba, normalizeHexColor } from '../utils/color';
import { getFontCSSValue, loadGoogleFont } from '../utils/fonts';
import { parseCardSide } from '../utils/cardSide';
import type { Collection, Flashcard, CardSideData } from '../types';
import '../styles/cardPreview.css';

const props = withDefaults(
  defineProps<{
    markdown?: string;
    sideData?: CardSideData;
    side?: 'front' | 'back';
    collection?: Collection;
    flashcard?: Flashcard;
    frontOnly?: boolean;
    useDemoValues?: boolean;
    demoFrontMarkdown?: string;
    demoBackMarkdown?: string;
    demoHeaderRight?: string;
    scale?: number;
  }>(),
  {
    markdown: '',
    side: 'front',
    frontOnly: false,
    useDemoValues: false,
    demoFrontMarkdown: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    demoBackMarkdown: 'Aliquam convallis massa et sapien faucibus, vitae placerat velit efficitur.',
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
    '--base-font-size': `${parseFloat(props.collection?.font_size ?? '14')}px`,
    '--box-bg-color': hexToRgba(headerColor, 0.08),
    '--box-border-color': hexToRgba(headerColor, 0.16),
  };
});

const resolvedSide = computed(() => (props.frontOnly ? 'front' : props.side));

const resolvedSideData = computed<CardSideData>(() => {
  if (props.sideData) return props.sideData;
  if (props.useDemoValues) {
    const fallback = resolvedSide.value === 'front' ? props.demoFrontMarkdown! : props.demoBackMarkdown!;
    return { layout: 'default', sections: { main: fallback } };
  }
  return parseCardSide(props.markdown ?? '');
});

const renderedSections = ref<Record<string, string>>({});

watch(
  resolvedSideData,
  async (data) => {
    const rendered: Record<string, string> = {};
    await Promise.all(
      Object.entries(data.sections).map(async ([key, content]) => {
        rendered[key] = content.trim() ? await markdownToHtml(content) : '';
      })
    );
    renderedSections.value = rendered;
  },
  { immediate: true, deep: true }
);

const headerTextLeft = computed(() => props.collection?.header_text_left ?? '');
const headerTextRight = computed(() =>
  resolvedSide.value === 'front'
    ? props.flashcard?.header_right ?? (props.useDemoValues ? props.demoHeaderRight : '')
    : ''
);
const showHeader = computed(
  () => headerTextLeft.value || headerTextRight.value || !!props.collection?.header_color
);
</script>

<template>
  <div class="flashcard-preview-container" :style="cardStyle">
    <div v-if="showHeader" class="flashcard-header">
      <span v-if="headerTextLeft" class="flashcard-header-left">{{ headerTextLeft }}</span>
      <span v-if="headerTextRight" class="flashcard-header-right">{{ headerTextRight }}</span>
    </div>
    <div class="flashcard-preview-content">
      <!-- default: single column -->
      <template v-if="resolvedSideData.layout === 'default'">
        <div v-html="renderedSections.main ?? ''"></div>
      </template>

      <!-- 2-columns -->
      <template v-else-if="resolvedSideData.layout === '2-columns'">
        <div class="card-layout-2col">
          <div class="card-col" v-html="renderedSections.left ?? ''"></div>
          <div class="card-col card-col-right" v-html="renderedSections.right ?? ''"></div>
        </div>
      </template>

      <!-- 3-columns -->
      <template v-else-if="resolvedSideData.layout === '3-columns'">
        <div class="card-layout-3col">
          <div class="card-col" v-html="renderedSections.left ?? ''"></div>
          <div class="card-col card-col-center" v-html="renderedSections.center ?? ''"></div>
          <div class="card-col card-col-right" v-html="renderedSections.right ?? ''"></div>
        </div>
      </template>

      <!-- top-row-2-columns -->
      <template v-else-if="resolvedSideData.layout === 'top-row-2-columns'">
        <div class="card-layout-top2col">
          <div class="card-top-row" v-html="renderedSections.top ?? ''"></div>
          <div class="card-2col-row">
            <div class="card-col" v-html="renderedSections.left ?? ''"></div>
            <div class="card-col card-col-right" v-html="renderedSections.right ?? ''"></div>
          </div>
        </div>
      </template>

      <!-- bottom-row-2-columns -->
      <template v-else-if="resolvedSideData.layout === 'bottom-row-2-columns'">
        <div class="card-layout-bottom2col">
          <div class="card-2col-row">
            <div class="card-col" v-html="renderedSections.left ?? ''"></div>
            <div class="card-col card-col-right" v-html="renderedSections.right ?? ''"></div>
          </div>
          <div class="card-bottom-row" v-html="renderedSections.bottom ?? ''"></div>
        </div>
      </template>
    </div>
    <img class="flashcard-watermark" src="/logo.png" alt="" aria-hidden="true" />
  </div>
</template>

