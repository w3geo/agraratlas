import { getLayer } from 'ol-mapbox-style';
import { ref, watch } from 'vue';
import { map, mapReady } from './useMap';

/** @type {import('vue').Ref<Array<string>>} */
const baseLayers = ref([]);

/** @type {import('vue').Ref<string>} */
const baseLayer = ref();

function getAutoBaseLayerIndex() {
  return map.getView().getZoom() > 14 ? 1 : 0;
}

mapReady.then(() => {
  const { layers } = map.get('mapbox-style');
  baseLayers.value = layers.filter((l) => l.metadata?.group === 'base').map((l) => l.id);
  const autoBaseLayerIndex = getAutoBaseLayerIndex();
  baseLayer.value = baseLayers.value[autoBaseLayerIndex];
});

let userModified = false;

watch(baseLayer, (value) => {
  const { layers } = map.get('mapbox-style');
  layers.forEach((layer) => {
    if (layer.metadata?.group === 'base') {
      getLayer(map, layer.id).setVisible(layer.id === value);
    }
  });
  userModified = baseLayers.value.indexOf(value) !== getAutoBaseLayerIndex();
});

map.on('moveend', () => {
  if (!userModified) {
    baseLayer.value = baseLayers.value[getAutoBaseLayerIndex()];
  }
});

export function useLayers() {
  return { baseLayers, baseLayer };
}
