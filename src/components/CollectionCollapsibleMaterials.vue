<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { Download, FilePenLine, FileUp, Plus, Trash2 } from 'lucide-vue-next';
import * as materialsApi from '../api/materials';
import type { Collection, Material } from '../types';

const props = defineProps<{
  collection: Collection | null;
}>();

const materials = ref<Material[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const deletingId = ref<string | null>(null);

const formState = reactive({
  file: null as File | null,
  internalName: '',
  pageRangeStart: 1,
  pageRangeEnd: 1,
  submitting: false,
});

const renameState = reactive({
  open: false,
  target: null as Material | null,
  internalName: '',
  submitting: false,
  error: '' as string | null,
});

const replaceState = reactive({
  open: false,
  target: null as Material | null,
  file: null as File | null,
  pageRangeStart: 1,
  pageRangeEnd: 1,
  submitting: false,
  error: '' as string | null,
});

const fileInputRef = ref<HTMLInputElement | null>(null);
const replaceFileInputRef = ref<HTMLInputElement | null>(null);

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

function resetForm() {
  formState.file = null;
  formState.internalName = '';
  formState.pageRangeStart = 1;
  formState.pageRangeEnd = 1;
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  formState.file = input.files?.[0] ?? null;
}

function handleReplaceFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  replaceState.file = input.files?.[0] ?? null;
}

async function submitForm() {
  if (!props.collection) {
    return;
  }
  if (!formState.file) {
    error.value = 'Pick a PDF to upload.';
    return;
  }

  formState.submitting = true;
  error.value = null;

  try {
    await materialsApi.createMaterial({
      collectionId: props.collection.id,
      file: formState.file,
      internalName: formState.internalName,
      pageRangeStart: formState.pageRangeStart,
      pageRangeEnd: formState.pageRangeEnd,
    });
    resetForm();
    await loadMaterials();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to add material';
  } finally {
    formState.submitting = false;
  }
}

function openRename(material: Material) {
  renameState.target = material;
  renameState.internalName = material.internalName;
  renameState.error = '';
  renameState.open = true;
}

function closeRename() {
  renameState.open = false;
  renameState.target = null;
  renameState.internalName = '';
  renameState.error = '';
}

async function submitRename() {
  if (!renameState.target) {
    return;
  }
  renameState.submitting = true;
  renameState.error = '';
  try {
    await materialsApi.renameMaterial(renameState.target.id, renameState.internalName);
    await loadMaterials();
    closeRename();
  } catch (err) {
    renameState.error = err instanceof Error ? err.message : 'Unable to rename';
  } finally {
    renameState.submitting = false;
  }
}

function openReplace(material: Material) {
  replaceState.target = material;
  replaceState.pageRangeStart = material.pageRangeStart;
  replaceState.pageRangeEnd = material.pageRangeEnd;
  replaceState.file = null;
  replaceState.error = '';
  replaceState.open = true;
  if (replaceFileInputRef.value) {
    replaceFileInputRef.value.value = '';
  }
}

function closeReplace() {
  replaceState.open = false;
  replaceState.target = null;
  replaceState.file = null;
  replaceState.error = '';
  if (replaceFileInputRef.value) {
    replaceFileInputRef.value.value = '';
  }
}

async function submitReplace() {
  if (!replaceState.target) {
    return;
  }

  replaceState.submitting = true;
  replaceState.error = '';
  try {
    await materialsApi.replaceMaterial(replaceState.target.id, {
      file: replaceState.file ?? undefined,
      pageRangeStart: replaceState.pageRangeStart,
      pageRangeEnd: replaceState.pageRangeEnd,
    });
    await loadMaterials();
    closeReplace();
  } catch (err) {
    replaceState.error = err instanceof Error ? err.message : 'Unable to update material';
  } finally {
    replaceState.submitting = false;
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

function handleDownload(material: Material) {
  const url = URL.createObjectURL(material.file);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${material.internalName || 'material'}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="collapse collapse-arrow bg-base-100 shadow">
    <input type="checkbox" checked />
    <div class="collapse-title text-lg font-semibold">Materials</div>
    <div class="collapse-content space-y-4">
      <div v-if="collection" class="space-y-4">
        <form class="grid gap-4 md:grid-cols-2" @submit.prevent="submitForm">
          <fieldset class="fieldset">
            <label class="label" for="material-file">PDF</label>
            <input id="material-file" ref="fileInputRef" type="file" name="material-file" accept="application/pdf"
              class="file-input" @change="handleFileChange" />
          </fieldset>

          <fieldset class="fieldset">
            <label class="label" for="material-name">Internal name (optional)</label>
            <input id="material-name" type="text" name="material-name" class="input" placeholder="Chapter 3 notes"
              v-model="formState.internalName" />
          </fieldset>

          <fieldset class="fieldset">
            <label class="label" for="page-start">Page start</label>
            <input id="page-start" type="number" name="page-start" class="input" min="1"
              v-model.number="formState.pageRangeStart" />
          </fieldset>

          <fieldset class="fieldset">
            <label class="label" for="page-end">Page end</label>
            <input id="page-end" type="number" name="page-end" class="input" min="1"
              v-model.number="formState.pageRangeEnd" />
          </fieldset>

          <div class="md:col-span-2">
            <button class="btn btn-primary" type="submit" :disabled="formState.submitting || !formState.file">
              <span v-if="formState.submitting" class="loading loading-spinner loading-xs mr-2"></span>
              <Plus :size="18" />
              <span>Add PDF</span>
            </button>
          </div>
        </form>

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
                    <button class="btn btn-square btn-ghost btn-sm" type="button" aria-label="Download"
                      @click="handleDownload(material)">
                      <Download :size="16" />
                    </button>
                    <button class="btn btn-square btn-ghost btn-sm" type="button" aria-label="Rename"
                      @click="openRename(material)">
                      <FilePenLine :size="16" />
                    </button>
                    <button class="btn btn-square btn-ghost btn-sm" type="button" aria-label="Replace"
                      @click="openReplace(material)">
                      <FileUp :size="16" />
                    </button>
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
      </div>
    </div>
  </div>

  <div v-if="renameState.open" class="modal modal-open">
    <div class="modal-box space-y-4">
      <h3 class="text-xl font-semibold">Rename material</h3>
      <p class="text-base-content/70" v-if="renameState.target">
        {{ renameState.target.internalName }}
      </p>
      <div v-if="renameState.error" class="alert alert-error">
        <span>{{ renameState.error }}</span>
      </div>
      <form class="space-y-4" @submit.prevent="submitRename">
        <fieldset class="fieldset">
          <label class="label" for="rename-material">Internal name</label>
          <input id="rename-material" type="text" name="rename-material" class="input"
            v-model="renameState.internalName" required />
        </fieldset>
        <div class="flex justify-end gap-2">
          <button class="btn btn-ghost" type="button" @click="closeRename" :disabled="renameState.submitting">
            Cancel
          </button>
          <button class="btn btn-primary" type="submit" :disabled="renameState.submitting">
            <span v-if="renameState.submitting" class="loading loading-spinner loading-xs mr-2"></span>
            Save
          </button>
        </div>
      </form>
    </div>
    <div class="modal-backdrop" @click="closeRename"></div>
  </div>

  <div v-if="replaceState.open" class="modal modal-open">
    <div class="modal-box space-y-4">
      <h3 class="text-xl font-semibold">Update material</h3>
      <p class="text-base-content/70" v-if="replaceState.target">
        {{ replaceState.target.internalName }}
      </p>
      <div v-if="replaceState.error" class="alert alert-error">
        <span>{{ replaceState.error }}</span>
      </div>
      <form class="grid gap-4" @submit.prevent="submitReplace">
        <fieldset class="fieldset">
          <label class="label" for="replace-file">Replace PDF (optional)</label>
          <input id="replace-file" ref="replaceFileInputRef" type="file" name="replace-file" accept="application/pdf"
            class="file-input" @change="handleReplaceFileChange" />
        </fieldset>
        <fieldset class="fieldset">
          <label class="label" for="replace-start">Page start</label>
          <input id="replace-start" type="number" name="replace-start" class="input" min="1"
            v-model.number="replaceState.pageRangeStart" />
        </fieldset>
        <fieldset class="fieldset">
          <label class="label" for="replace-end">Page end</label>
          <input id="replace-end" type="number" name="replace-end" class="input" min="1"
            v-model.number="replaceState.pageRangeEnd" />
        </fieldset>
        <div class="flex justify-end gap-2 md:col-span-2">
          <button class="btn btn-ghost" type="button" @click="closeReplace" :disabled="replaceState.submitting">
            Cancel
          </button>
          <button class="btn btn-primary" type="submit" :disabled="replaceState.submitting">
            <span v-if="replaceState.submitting" class="loading loading-spinner loading-xs mr-2"></span>
            Save
          </button>
        </div>
      </form>
    </div>
    <div class="modal-backdrop" @click="closeReplace"></div>
  </div>
</template>
