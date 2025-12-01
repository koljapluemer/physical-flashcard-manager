<script setup lang="ts">
import { useSettingsStore } from '../stores/settings';

const settingsStore = useSettingsStore();

const sizePresets = [
  {
    label: 'Business / "credit-card" (ID-1 / CR-80)',
    widthMm: 85.6,
    heightMm: 53.98,
    mmDisplay: '85.60 × 53.98 mm',
    inchesDisplay: '3.375 × 2.125 in',
    source: 'PaperSizesWiki.com',
    note: 'Common for payment/ID cards — sometimes used for cards for portability.',
  },
  {
    label: 'Playing / poker card (standard)',
    widthMm: 63.5,
    heightMm: 89,
    mmDisplay: '63.5 × 89 mm',
    inchesDisplay: '2.5 × 3.5 in',
    source: 'Spingold',
    note: 'Standard for many playing-card decks.',
  },
  {
    label: 'Bridge / slim playing card',
    widthMm: 57,
    heightMm: 89,
    mmDisplay: '57 × 89 mm',
    inchesDisplay: '2.25 × 3.5 in',
    source: 'Aura Print / PaperSizesWiki.com',
    note: 'Narrower variant, often easier to hold many cards.',
  },
  {
    label: 'Tarot / large card',
    widthMm: 70,
    heightMm: 120,
    mmDisplay: '70 × 120 mm',
    inchesDisplay: '2.75 × 4.75 in',
    source: 'Aura Print / PaperSizesWiki.com',
    note: 'Good for designs needing more surface (illustrations, big text).',
  },
  {
    label: 'Flashcard / index-card (smaller size)',
    widthMm: 76.2,
    heightMm: 127,
    mmDisplay: '76.2 × 127 mm',
    inchesDisplay: '≈ 3 × 5 in',
    source: 'NoteDex',
    note: 'Common for study flashcards / note-taking.',
  },
  {
    label: 'Flashcard / index-card (medium / larger size)',
    widthMm: 148.5,
    heightMm: 105,
    mmDisplay: '148.5 × 105 mm (A6)',
    inchesDisplay: '≈ 4.1 × 5.8 in',
    source: 'Spingold',
    note: 'Offers more space for detailed flashcards or illustrations.',
  },
  {
    label: 'Large / jumbo card',
    widthMm: 89,
    heightMm: 127,
    mmDisplay: '89 × 127 mm',
    inchesDisplay: '≈ 3.5 × 5 in',
    source: '—',
    note: 'Useful for oversized cards or educational cards.',
  },
];

const applyPreset = (preset: (typeof sizePresets)[number]) => {
  settingsStore.cardWidthMm = preset.widthMm;
  settingsStore.cardHeightMm = preset.heightMm;
};
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-semibold">Settings</h1>
      <p class="text-sm text-base-content/70">Adjust preview and export defaults.</p>
    </div>

    <div class="card bg-base-100 shadow">
      <div class="card-body space-y-6">
        <div>
          <h2 class="card-title text-xl">Card Dimensions (millimeters)</h2>
          <p class="text-sm text-base-content/70">
            Set the size for both the in-app preview and PDF exports.
          </p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Width (mm)</legend>
            <input
              v-model.number="settingsStore.cardWidthMm"
              class="input input-bordered"
              type="number"
              step="1"
              min="1"
            />
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Height (mm)</legend>
            <input
              v-model.number="settingsStore.cardHeightMm"
              class="input input-bordered"
              type="number"
              step="1"
              min="1"
            />
          </fieldset>
        </div>
        <div class="alert alert-info">
          <div>
            <p>Changes apply immediately to previews and PDF output.</p>
            <p class="mt-1 text-sm">Use a preset below to fill common sizes instantly.</p>
          </div>
        </div>
        <div class="space-y-3">
          <h3 class="text-lg font-semibold">Standard card sizes</h3>
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr class="text-sm text-base-content/70">
                  <th>Preset</th>
                  <th>Millimeters</th>
                  <th>Inches</th>
                  <th>Notes</th>
                  <th class="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="preset in sizePresets" :key="preset.label">
                  <td>
                    <div class="flex flex-col">
                      <span class="font-medium">{{ preset.label }}</span>
                      <span class="text-sm text-base-content/70">{{ preset.source }}</span>
                    </div>
                  </td>
                  <td>{{ preset.mmDisplay }}</td>
                  <td>{{ preset.inchesDisplay }}</td>
                  <td class="text-sm text-base-content/70">
                    {{ preset.note }}
                  </td>
                  <td class="text-right">
                    <button class="btn btn-sm" type="button" @click="applyPreset(preset)">
                      Fill
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
