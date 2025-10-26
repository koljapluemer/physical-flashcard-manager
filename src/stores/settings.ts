import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

const STORAGE_KEY_WIDTH = 'flashcard_card_width_mm';
const STORAGE_KEY_HEIGHT = 'flashcard_card_height_mm';

export const useSettingsStore = defineStore('settings', () => {
  const cardWidthMm = ref(parseFloat(localStorage.getItem(STORAGE_KEY_WIDTH) || '89'));
  const cardHeightMm = ref(parseFloat(localStorage.getItem(STORAGE_KEY_HEIGHT) || '51'));

  watch(cardWidthMm, (newWidth) => {
    localStorage.setItem(STORAGE_KEY_WIDTH, String(newWidth));
  });

  watch(cardHeightMm, (newHeight) => {
    localStorage.setItem(STORAGE_KEY_HEIGHT, String(newHeight));
  });

  return {
    cardWidthMm,
    cardHeightMm,
  };
});
