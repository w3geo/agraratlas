<template>
  <div ref="mapContainer" class="map"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { bind } from 'size-sensor';
import useMap from '../composables/useMap';

const mapContainer = ref();
const { map } = useMap();
let unbind;

onMounted(() => {
  unbind = bind(mapContainer.value, () => map.updateSize());
  map.setTarget(mapContainer.value);
});

onBeforeUnmount(() => unbind());
</script>

<style scoped>
  .map {
    position: absolute;
    top: 0px;
    right: 0px;
    left: 0px;
    bottom: 0px;
  }
</style>
