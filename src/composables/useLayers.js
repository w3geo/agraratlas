import { getLayer, updateMapboxLayer } from 'ol-mapbox-style';
import { computed, ref, watch } from 'vue';
import { gradients } from './useGradient';
import { map, mapReady, mapView } from './useMap';
import { topics } from './useTopics';

/** @type {import('vue').Ref<Array<string>>} */
const baseLayers = ref([]);

/** @type {import('vue').Ref<string>} */
const baseLayer = ref();

/** @type {import('vue').Ref<number>} */
const opacity = ref(0.7);

/** @type {import('vue').ComputedRef<0|1>} */
const autoBaseLayerIndex = computed(() => (mapView.value.zoom > 14 ? 1 : 0));

function setLayerOpacity(mapboxLayer) {
  if (mapboxLayer.metadata?.group !== 'base') {
    if (mapboxLayer.type === 'raster') {
      mapboxLayer.paint = { ...mapboxLayer.paint, 'raster-opacity': opacity.value };
      updateMapboxLayer(map, mapboxLayer);
    }
    getLayer(map, mapboxLayer.id).setOpacity(opacity.value);
  }
}

mapReady.then(() => {
  const { layers } = map.get('mapbox-style');
  baseLayers.value = [...layers.filter((l) => l.metadata?.group === 'base').map((l) => l.id), 'Kataster'];
  baseLayer.value = baseLayers.value[autoBaseLayerIndex.value];
  layers.forEach(setLayerOpacity);
});

let userModified = false;
watch(baseLayer, (value) => {
  map.getLayers().item(0).setVisible(value === 'Kataster');
  const { layers } = map.get('mapbox-style');
  layers.forEach((layer) => {
    if (layer.metadata?.group === 'base') {
      getLayer(map, layer.id).setVisible(layer.id === value);
    }
  });
  userModified = baseLayers.value.indexOf(value) !== autoBaseLayerIndex.value;
});

watch(() => mapView.value.zoom, (zoom) => {
  if (zoom <= 14 && baseLayer.value === 'Kataster') {
    baseLayer.value = baseLayers.value[autoBaseLayerIndex.value];
  }
});

watch(opacity, () => {
  const { layers } = map.get('mapbox-style');
  layers.forEach(setLayerOpacity);
});

watch(autoBaseLayerIndex, () => {
  if (!userModified) {
    baseLayer.value = baseLayers.value[autoBaseLayerIndex.value];
  }
});

watch(topics, (value) => {
  const { layers } = map.get('mapbox-style');
  const one = layers.filter((layer) => layer.metadata?.group === 'one' && layer.type !== 'raster');
  one.forEach((layer) => {
    const { visible } = value.find((v) => v.label === layer.metadata?.label);
    layer.layout = { ...layer.layout, visibility: visible ? 'visible' : 'none' };
    updateMapboxLayer(map, layer);
  });
});

watch(gradients, (value) => {
  const mapboxLayer = map.get('mapbox-style').layers.find((l) => l.id === 'neigungsklassen');
  const style = {
    color: mapboxLayer.metadata.classes.reduce((acc, cur, i) => {
      acc.splice(acc.length - 1, 0, ['==', ['band', 1], i + 1], value[i].visible ? cur.color : [0, 0, 0, 0]);
      return acc;
    }, ['case', [0, 0, 0, 0]]),
  };
  const layer = getLayer(map, mapboxLayer.id);
  layer.setStyle(style);
  layer.setVisible(value.some((v) => v.visible));
});

export function useLayers() {
  return {
    baseLayers, baseLayer, opacity,
  };
}
