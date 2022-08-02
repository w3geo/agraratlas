<template>
  <div
    ref="mapContainer"
    class="map"
  />
  <v-col
    class="expansion-panel"
    cols="12"
    sm="12"
    md="6"
    lg="6"
    xl="4"
  >
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
            v-model="visibleLayer"
            :label="layer"
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
  </v-col>
</template>

<script setup>
import {
  ref, onMounted, onBeforeUnmount, watch,
} from 'vue';
import { bind } from 'size-sensor';
import { getSource } from 'ol-mapbox-style';
import useMap from '../composables/useMap';
import useSchlag from '../composables/useSchlag';

const mapContainer = ref();
const panel = ref();
const visibleLayer = ref();
const { map } = useMap();
const { schlagInfo, layersOfInterest } = useSchlag();
let unbind;

onMounted(() => {
  unbind = bind(mapContainer.value, () => map.updateSize());
  map.setTarget(mapContainer.value);
});

onBeforeUnmount(() => unbind());

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
watch(visibleLayer, (value) => {
  const { layers } = map.get('mapbox-style');
  const any = layers.filter((layer) => layer.metadata?.group === 'any');
  any.forEach((layer) => { layer.layout = { ...layer.layout, visibility: value ? 'none' : 'visible' }; });
  const one = layers.filter((layer) => layer.id.endsWith('_detail'));
  one.forEach((layer) => { layer.layout = { ...layer.layout, visibility: layer.id === `${value}_detail` ? 'visible' : 'none' }; });
  getSource(map, 'agrargis').changed();
});
</script>

<style scoped>
  .map {
    height: 100%;
  }
  .expansion-panel {
    position: absolute;
    top: 0em;
    left: 0em;
    width: calc(100% - 3em);
  }
</style>
<style>
  div.ol-zoom {
    left: inherit;
    right: 0.5em;
  }
  div.ol-rotate {
    top: 5.5em;
    left: inherit;
    right: 0.5em;
  }
</style>
