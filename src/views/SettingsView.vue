<script setup lang="ts">
import { useSettingsStore } from '../stores/settings';

const settingsStore = useSettingsStore();
</script>

<template>
  <div class="settings-view">
    <h1 class="title">Settings</h1>

    <div class="box">
      <h2 class="title is-4">Card Dimensions (millimeters)</h2>
      <p class="mb-4">Set the size of your flashcards for both preview and printing.</p>

      <div class="field is-horizontal">
        <div class="field-label is-normal">
          <label class="label">Width (mm)</label>
        </div>
        <div class="field-body">
          <div class="field">
            <div class="control">
              <input v-model.number="settingsStore.cardWidthMm" class="input" type="number" step="1" min="1" />
            </div>
          </div>
        </div>
      </div>

      <div class="field is-horizontal">
        <div class="field-label is-normal">
          <label class="label">Height (mm)</label>
        </div>
        <div class="field-body">
          <div class="field">
            <div class="control">
              <input v-model.number="settingsStore.cardHeightMm" class="input" type="number" step="1" min="1" />
            </div>
          </div>
        </div>
      </div>

      <article class="message is-info mt-4">
        <div class="message-body">
          <p>Changes apply immediately to the card preview in the editor and PDF exports.</p>
          <p class="mt-2">Standard business card: 89mm × 51mm (3.5" × 2")</p>
        </div>
      </article>
    </div>
  </div>
</template>
