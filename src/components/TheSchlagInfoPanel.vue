<template>
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
</template>

<script setup>
import { watch } from 'vue';
import { useSchlag } from '../composables/useSchlag';
import { useAspect } from '../composables/useAspect';

const { schlagInfo, layersOfInterest, layerOfInterest } = useSchlag();
const { aspectClasses } = useAspect();
const emit = defineEmits(['schlag']);

watch(schlagInfo, (value) => {
  emit('schlag', value);
});

</script>
