<script setup lang="ts">
import { Download } from 'lucide-vue-next';
import { withDefaults } from 'vue';

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    loading?: boolean;
  }>(),
  {
    disabled: false,
    loading: false,
  }
);

const emit = defineEmits<{
  (e: 'download'): void;
}>();

function handleDownload() {
  if (!props.disabled) {
    emit('download');
  }
}
</script>

<template>
  <div class="collapse collapse-arrow bg-base-100 shadow">
    <input type="checkbox" checked />
    <div class="collapse-title text-lg font-semibold">Tools</div>
    <div class="collapse-content">
      <button class="btn btn-outline gap-2" type="button" :disabled="disabled" @click="handleDownload">
        <Download :size="18" />
        <span class="flex items-center gap-2">
          <span>Download for Print</span>
          <span v-if="loading" class="loading loading-spinner loading-xs"></span>
        </span>
      </button>
    </div>
  </div>
</template>
