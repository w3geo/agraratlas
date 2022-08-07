<template>
  <v-expansion-panel>
    <v-expansion-panel-title>
      Karte und Werkzeuge
    </v-expansion-panel-title>
    <v-expansion-panel-text>
      Grundkarte
      <v-switch
        v-for="(layer, index) in baseLayers"
        :key="index"
        v-model="baseLayer"
        :label="layer"
        :value="layer"
        hide-details
        density="compact"
      />
      Transparenz
      <v-slider
        v-model="opacity"
        :max="1"
        :min="0"
        :step="0.1"
        thumb-color="white"
        color="gray"
        hide-details
        density="compact"
      />
    </v-expansion-panel-text>
  </v-expansion-panel>
</template>

<script setup>
import { useLayers } from '../composables/useLayers';

const { baseLayers, baseLayer, opacity } = useLayers();
</script>
