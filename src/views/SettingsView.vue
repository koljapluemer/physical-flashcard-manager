<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';

const settingsStore = useSettingsStore();
const authStore = useAuthStore();
const router = useRouter();

const sizePresets = [
  {
    label: 'Business / "credit-card" (ID-1 / CR-80)',
    widthMm: 85.6,
    heightMm: 53.98,
    mmDisplay: '85.60 × 53.98 mm',
    inchesDisplay: '3.375 × 2.125 in',
  },
  {
    label: 'Playing / poker card (standard)',
    widthMm: 63.5,
    heightMm: 89,
    mmDisplay: '63.5 × 89 mm',
    inchesDisplay: '2.5 × 3.5 in',
  },
  {
    label: 'Bridge / slim playing card',
    widthMm: 57,
    heightMm: 89,
    mmDisplay: '57 × 89 mm',
    inchesDisplay: '2.25 × 3.5 in',
  },
  {
    label: 'Tarot / large card',
    widthMm: 70,
    heightMm: 120,
    mmDisplay: '70 × 120 mm',
    inchesDisplay: '2.75 × 4.75 in',
  },
  {
    label: 'Flashcard / index-card (smaller size)',
    widthMm: 76.2,
    heightMm: 127,
    mmDisplay: '76.2 × 127 mm',
    inchesDisplay: '≈ 3 × 5 in',
  },
  {
    label: 'Flashcard / index-card (medium / larger size)',
    widthMm: 148.5,
    heightMm: 105,
    mmDisplay: '148.5 × 105 mm (A6)',
    inchesDisplay: '≈ 4.1 × 5.8 in',
  },
  {
    label: 'Large / jumbo card',
    widthMm: 89,
    heightMm: 127,
    mmDisplay: '89 × 127 mm',
    inchesDisplay: '≈ 3.5 × 5 in',
  },
];

const applyPreset = (preset: (typeof sizePresets)[number]) => {
  settingsStore.cardWidthMm = preset.widthMm;
  settingsStore.cardHeightMm = preset.heightMm;
};

const handleLogout = () => {
  authStore.logout();
  router.push({ name: 'login' });
};
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-semibold">Settings</h1>

    <div class="card bg-base-100 shadow">
      <div class="card-body space-y-4">
        <h2 class="card-title text-xl">AI Generation</h2>
        <div class="grid gap-4 md:grid-cols-[1.5fr_auto] md:items-end">
          <fieldset class="fieldset">
            <label for="openai-api-key" class="label">OpenAI API Key</label>
            <input
              id="openai-api-key"
              v-model="settingsStore.openaiApiKey"
              type="password"
              class="input"
              placeholder="sk-..."
              autocomplete="off"
            />
          </fieldset>
          <p class="text-base-content/70">
            Stored locally. Required when generating cards with AI.
          </p>
        </div>
      </div>
    </div>

    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="card-title text-xl">Account</h2>
            <p class="text-sm text-base-content/70">Log out of your current session.</p>
          </div>
          <button class="btn" type="button" @click="handleLogout">Log out</button>
        </div>
      </div>
    </div>

    <div class="card bg-base-100 shadow">
      <div class="card-body space-y-6">
        <h2 class="card-title text-xl">Card Dimensions</h2>
        <div class="space-y-3">
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Width (mm)</legend>
            <input v-model.number="settingsStore.cardWidthMm" class="input input-bordered" type="number" step="1"
              min="1" />
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Height (mm)</legend>
            <input v-model.number="settingsStore.cardHeightMm" class="input input-bordered" type="number" step="1"
              min="1" />
          </fieldset>
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
                  <th class="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="preset in sizePresets" :key="preset.label">
                  <td>
                    <div class="flex flex-col">
                      <span class="font-medium">{{ preset.label }}</span>
                    </div>
                  </td>
                  <td>{{ preset.mmDisplay }}</td>
                  <td>{{ preset.inchesDisplay }}</td>
                  <td class="text-right">
                    <button class="btn" type="button" @click="applyPreset(preset)">
                      Use Size
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
