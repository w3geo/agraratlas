<template>
  <v-autocomplete
    v-model="model"
    v-model:search="search"
    hide-details
    single-line
    clearable
    density="compact"
    prepend-inner-icon="mdi-magnify"
    :items="items"
    :loading="isLoading"
    item-title="properties.name"
    hide-no-data
    hide-selected
    filter-mode="contains"
    placeholder="Adresse, Ort, Riedname, ..."
    return-object
  />
</template>

<script setup>
import { ref, watch } from 'vue';

const model = ref(null);
const items = ref();
const isLoading = ref(false);
const search = ref('');
const emit = defineEmits(['search']);

const getPlaces = async (value) => {
  if (!isLoading.value && value.length > 3) {
    isLoading.value = true;
    try {
      const response = await fetch(`https://kataster.bev.gv.at/api/all/?term=${encodeURIComponent(value)}`);
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
    } finally {
      isLoading.value = false;
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
  max-height: 80vh;
}
</style>
