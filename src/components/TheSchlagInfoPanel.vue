<template>
  <v-expansion-panel
    value="schlag"
  >
    <v-expansion-panel-title>
      Schlag Informationen
    </v-expansion-panel-title>
    <v-expansion-panel-text v-if="schlagInfo && !schlagInfo.loading">
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
import { useRoute, useRouter } from 'vue-router';
import { useSchlag } from '../composables/useSchlag';
import { useAspect } from '../composables/useAspect';

const { schlagInfo, layersOfInterest, layerOfInterest } = useSchlag();
const { aspectClasses } = useAspect();
const route = useRoute();
const router = useRouter();
const emit = defineEmits(['schlag']);

function setSchlagId(id) {
  if (Number(id) !== schlagInfo.value?.id) {
    schlagInfo.value = id ? {
      loading: true,
      id: Number(id),
    } : null;
  }
}

watch(schlagInfo, (value) => {
  if (value?.id !== Number(route.params.schlagId)) {
    router.push({ params: { schlagId: value?.id } });
  }
  if (value && !value.loading) {
    emit('schlag');
  }
});

watch(() => route.params.schlagId, setSchlagId);
setSchlagId(route.params.schlagId);

</script>
