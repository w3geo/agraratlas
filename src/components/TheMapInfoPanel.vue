<template>
  <v-expansion-panels v-model="panel">
    <v-expansion-panel
      value="schlag"
    >
      <v-expansion-panel-title>
        Schlag Informationen
      </v-expansion-panel-title>
      <v-expansion-panel-text v-if="schlagInfo">
        <div>Fläche: {{ schlagInfo.sl_flaeche_brutto_ha.toFixed(2) }} ha</div>
        <div>{{ schlagInfo.snar_bezeichnung }}</div>
        <v-switch
          v-for="(layer, index) in layersOfInterest"
          :key="index"
          v-model="layerOfInterest"
          :label="layer"
          :value="layer"
          hide-details
          density="compact"
        />
        <v-switch
          v-for="(value, layer, index) in aspectClasses"
          :key="index"
          v-model="layerOfInterest"
          :label="layer + ' (' + value.toFixed(2) + ' ha)'"
          :value="layer"
          hide-details
          density="compact"
        />
      </v-expansion-panel-text>
      <v-expansion-panel-text v-else>
        Klicken Sie auf einen Schlag, um Informationen zu erhalten.
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useMap } from '../composables/useMap';
import { useLayers } from '../composables/useLayers';
import { useAspect } from '../composables/useAspect';

const { map } = useMap();
const { schlagInfo, layersOfInterest, layerOfInterest } = useLayers();
const { aspectClasses } = useAspect();
const panel = ref();

watch(panel, (value) => {
  if (value === 'schlag') {
    if (map.getView().getZoom() < 12) {
      map.getView().animate({ zoom: 12, duration: 500 });
    }
  }
});

watch(schlagInfo, (value) => {
  if (value) {
    panel.value = 'schlag';
  }
});
</script>
