<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { Plus, Trash2 } from 'lucide-vue-next';
import MaterialAddModal from './MaterialAddModal.vue';
import * as materialsApi from '../api/materials';
import type { Collection, Material } from '../types';

const props = defineProps<{
  collection: Collection | null;
}>();

const materials = ref<Material[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const deletingId = ref<string | null>(null);
const addOpen = ref(false);

const hasMaterials = computed(() => materials.value.length > 0);

watch(
  () => props.collection?.id,
  () => {
    loadMaterials();
  }
);

onMounted(() => {
  loadMaterials();
});

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

async function loadMaterials() {
  if (!props.collection) {
    materials.value = [];
    return;
  }

  loading.value = true;
  error.value = null;
  try {
    materials.value = await materialsApi.getMaterials(props.collection.id);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to load materials';
  } finally {
    loading.value = false;
  }
}

async function handleDelete(material: Material) {
  if (deletingId.value) {
    return;
  }
  const confirmDelete = window.confirm(`Delete "${material.internalName}"?`);
  if (!confirmDelete) {
    return;
  }

  deletingId.value = material.id;
  try {
    await materialsApi.deleteMaterial(material.id);
    await loadMaterials();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to delete material';
  } finally {
    deletingId.value = null;
  }
}

function openAdd() {
  addOpen.value = true;
}

function closeAdd() {
  addOpen.value = false;
}
</script>

<template>
  <div class="collapse collapse-arrow bg-base-100 shadow">
    <input type="checkbox" checked />
    <div class="collapse-title text-lg font-semibold">Materials</div>
    <div class="collapse-content space-y-4">
      <div v-if="collection" class="space-y-4">
        <div v-if="error" class="alert alert-error">
          <span>{{ error }}</span>
        </div>

        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-dots text-primary"></span>
        </div>

        <div v-else-if="!hasMaterials" class="text-base-content/70">
          No materials added yet.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Pages</th>
                <th>Added</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="material in materials" :key="material.id">
                <td>
                  <div class="font-medium">{{ material.internalName }}</div>
                  <div class="text-base-content/70">{{ material.originalFilename }}</div>
                </td>
                <td>
                  {{ material.pageRangeStart }}-{{ material.pageRangeEnd }}
                  <span class="text-base-content/70">({{ material.pageCount }} pages)</span>
                </td>
                <td>{{ formatDate(material.createdAt) }}</td>
                <td>
                  <div class="flex justify-end gap-2">
                    <button class="btn btn-square btn-error btn-outline btn-sm" type="button" aria-label="Delete"
                      :disabled="deletingId === material.id" @click="handleDelete(material)">
                      <span v-if="deletingId === material.id" class="loading loading-spinner loading-xs"></span>
                      <span v-else>
                        <Trash2 :size="16" />
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <button class="btn" type="button" @click="openAdd">
          <Plus :size="18" />
          <span>Add material</span>
        </button>
      </div>

    </div>
  </div>

  <MaterialAddModal :open="addOpen" :collection="collection" @close="closeAdd" @created="loadMaterials" />
</template>
