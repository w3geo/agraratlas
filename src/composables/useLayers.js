import { getSource, setFeatureState } from 'ol-mapbox-style';
import { buffer } from 'ol/extent';
import { toFeature } from 'ol/render/Feature';
import { ref, watch } from 'vue';
import useMap from './useMap';

/**
 * @typedef SchlagInfo
 * @property {number} fart_id
 * @property {number} fs_kennung
 * @property {number} sl_flaeche_brutto_ha
 * @property {string} snar_bezeichnung
 * @property {string} snar_code
 */

/** @type {import('vue').Ref<SchlagInfo>} */
const schlagInfo = ref();

/** @type {import('vue').Ref<Array<string>>} */
const layersOfInterest = ref([]);

/** @type {import('vue').Ref<string>} */
const layerOfInterest = ref();

const { map } = useMap();

function getSchlagAtPixel(pixel) {
  return map.forEachFeatureAtPixel(
    pixel,
    (feature) => (feature.get('layer') === 'invekos_schlaege_2022_polygon' ? feature : undefined),
  );
}

let listenersRegistered = false;

let lastId;
function registerMapListeners() {
  map.on('click', (event) => {
    const selectedRenderFeature = getSchlagAtPixel(event.pixel);
    const id = selectedRenderFeature?.getId();
    schlagInfo.value = id ? { ...selectedRenderFeature.getProperties(), id } : undefined;
    if (id !== lastId) {
      if (selectedRenderFeature) {
        const extent = buffer(selectedRenderFeature.getGeometry().getExtent(), 0.0001);
        const features = getSource(map, 'agrargis')
          .getFeaturesInExtent(extent)
          .map((renderFeature) => toFeature(renderFeature))
          .filter((feature) => feature.getGeometry().intersectsExtent(extent));
        const layers = Object.keys(features.reduce((previous, current) => {
          const layer = current.get('layer');
          if (layer !== selectedRenderFeature.get('layer')) {
            previous[current.get('layer')] = true;
          }
          return previous;
        }, {}));
        layersOfInterest.value = layers;
      } else {
        layersOfInterest.value = [];
      }
    }
  });
  map.on('pointermove', (event) => {
    map.getTargetElement().style.cursor = getSchlagAtPixel(event.pixel) ? 'pointer' : '';
  });
  listenersRegistered = true;
}

watch(schlagInfo, (value) => {
  if (lastId) {
    setFeatureState(map, { source: 'agrargis', id: lastId }, null);
  }
  if (value) {
    setFeatureState(map, { source: 'agrargis', id: value.id }, { selected: true });
  }
  lastId = value?.id;
  layerOfInterest.value = null;
});

watch(layerOfInterest, (value) => {
  const { layers } = map.get('mapbox-style');
  const any = layers.filter((layer) => layer.metadata?.group === 'any');
  any.forEach((layer) => { layer.layout = { ...layer.layout, visibility: value ? 'none' : 'visible' }; });
  const one = layers.filter((layer) => layer.metadata?.group === 'one');
  one.forEach((layer) => { layer.layout = { ...layer.layout, visibility: layer.metadata?.layer === value ? 'visible' : 'none' }; });
  getSource(map, 'agrargis').changed();
});

export default function useLayers() {
  if (!listenersRegistered) {
    registerMapListeners();
  }
  return { schlagInfo, layersOfInterest, layerOfInterest };
}
