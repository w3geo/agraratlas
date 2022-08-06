<template>
  <div
    ref="mapContainer"
    class="map"
  />
  <v-col
    class="expansion-panel"
    cols="12"
    sm="10"
    md="5"
    lg="4"
    xl="3"
  >
    <the-map-info-panel />
  </v-col>
</template>

<script setup>
import {
  ref, onMounted, onBeforeUnmount,
} from 'vue';
import { bind } from 'size-sensor';
import { useMap } from '../composables/useMap';
import TheMapInfoPanel from '../components/TheMapInfoPanel.vue';

const { map } = useMap();
const mapContainer = ref();
let unbind;

onMounted(() => {
  unbind = bind(mapContainer.value, () => map.updateSize());
  map.setTarget(mapContainer.value);
});

onBeforeUnmount(() => {
  unbind();
  map.setTarget(null);
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
