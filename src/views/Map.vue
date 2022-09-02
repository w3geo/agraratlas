<template>
  <div
    ref="mapContainer"
    class="map"
  />
  <the-schlag-info-panel-new @schlag="switchSchlag" />
  <the-topic-panel-new />
  <the-map-tool-panel-new />
  <the-base-layer-switcher />
</template>

<script setup>
import {
  ref, onMounted, onBeforeUnmount, watch,
} from 'vue';
import { bind } from 'size-sensor';
import { useMap } from '../composables/useMap';
import TheSchlagInfoPanelNew from '../components/TheSchlagInfoPanel.vue';
import TheMapToolPanelNew from '../components/TheMapToolPanel.vue';
import TheTopicPanelNew from '../components/TheTopicPanel.vue';
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
    bottom: 2em;
    top: inherit;
    left: inherit;
    right: 0.5em;
  }

  div.ol-gps {
    bottom: 5.5em;
    top: inherit;
    left: inherit;
    right: 0.5em;
  }

  .ol-viewport.ol-touch div.ol-gps {
    bottom: 6.5em;
    top: inherit;
  }

  div.ol-rotate {
    bottom: 7.5em;
    top: inherit;
    left: inherit;
    right: 0.5em;
  }

  .ol-viewport.ol-touch div.ol-rotate {
    bottom: 9em;
  }

</style>
