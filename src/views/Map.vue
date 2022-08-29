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
    <v-expansion-panels
      ref="panels"
      v-model="panel"
    >
      <the-schlag-info-panel @schlag="switchSchlag" />
      <the-topic-panel />
    </v-expansion-panels>
  </v-col>
  <the-map-tool-panel-new />
  <the-base-layer-switcher />
</template>

<script setup>
import {
  ref, onMounted, onBeforeUnmount, watch,
} from 'vue';
import { bind } from 'size-sensor';
import { useMap } from '../composables/useMap';
import TheSchlagInfoPanel from '../components/TheSchlagInfoPanel.vue';
import TheMapToolPanelNew from '../components/TheMapToolPanelNew.vue';
import TheTopicPanel from '../components/TheTopicPanel.vue';
import TheBaseLayerSwitcher from '../components/TheBaseLayerSwitcher.vue';

const { map } = useMap();
const mapContainer = ref();
const panel = ref('schlag');
let unbind;

function switchSchlag(expaneded) {
  if (expaneded) {
    panel.value = 'schlag';
  } else {
    panel.value = null;
  }
}
onMounted(() => {
  unbind = bind(mapContainer.value, () => map.updateSize());
  map.setTarget(mapContainer.value);
});

onBeforeUnmount(() => {
  unbind();
  map.setTarget(null);
});

watch(panel, (value) => {
  if (value === 'schlag') {
    if (map.getView().getZoom() < 12) {
      map.getView().animate({ zoom: 12, duration: 500 });
    }
  }
});
</script>

<style scoped>
  .map {
    height: 100%;
  }
  .expansion-panel {
    position: absolute;
    top: 60px;
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
    top: 6em;
    left: inherit;
    right: 0.5em;
  }
  div.ol-gps {
    top: 4em;
    left: inherit;
    right: 0.5em;
  }
</style>
