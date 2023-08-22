<template>
  <v-autocomplete
    v-model="model"
    v-model:search="search"
    :loading="abortController"
    :items="items"
    return-object
    hide-details
    single-line
    clearable
    density="compact"
    prepend-inner-icon="mdi-magnify"
    item-title="properties.name"
    hide-no-data
    hide-selected
    filter-mode="contains"
    placeholder="Adresse, Ort, Riedname, ..."
    class="roundedStyle"
    :class="{mobile : mobile}"
  />
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useDisplay } from 'vuetify';

const model = ref(null);
const items = ref();
/** @type {import("vue").Ref<AbortController>} */
const abortController = ref(null);
const search = ref('');
const emit = defineEmits(['search']);

const { width, height } = useDisplay();
const mobile = computed(() => (width.value < 800 || height.value < 520));

const getPlaces = async (value) => {
  if (value.length > 3) {
    if (abortController.value) {
      abortController.value.abort();
    }
    abortController.value = new AbortController();
    const { signal } = abortController.value;
    try {
      const response = await fetch(`https://kataster.bev.gv.at/api/all/?term=${encodeURIComponent(value)}`, { signal });
      const { data } = await response.json();
      data?.features.forEach((feature) => {
        const { properties } = feature;
        if (!properties.name && properties.objectType === '11') {
          properties.name = `${properties.plz} ${properties.ort} ${properties.strasse} ${properties.hnr}`;
        }
        if (properties.objectType === '7701') {
          properties.name = `${properties.name} ${properties.kg}`;
        }
      });
      items.value = data?.features
        .filter((feature) => ![4, 21].includes(feature.properties.objectType));
      abortController.value = null;
    } catch (error) {
      // empty catch block
    }
  }
};

watch(search, (value) => {
  getPlaces(value);
});

watch(model, (value) => {
  emit('search', value);
});
</script>

<style>
/*
 * Workaround for v-autocomplete list getting too high
 * Cannot be scoped, so this might affect other components
 * TODO Report Vuetify bug
 */
.v-list {
  max-width: 340px;
  max-height: 80vh;
}

.roundedStyle {
  border-radius: 4px;
}

.v-field__outline::before {
  border-radius: 4px;
  border: 1px solid #999!important;
}
</style>
