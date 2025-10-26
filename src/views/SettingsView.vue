<script setup lang="ts">
import { useSettingsStore } from '../stores/settings';

const settingsStore = useSettingsStore();
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
            <p class="mt-1 text-sm">Standard business card: 89mm × 51mm (3.5" × 2").</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
