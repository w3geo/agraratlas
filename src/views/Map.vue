<template>
  <div ref="mapContainer" class="map"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import useMap from '../composables/useMap';

const mapContainer = ref(null);
const { map } = useMap();

onMounted(() => {
  map.setTarget(mapContainer.value);
});
</script>

<style scoped>
  .map {
    width: 100%;
    height: 100%;
  }
</style>
