import { getSource, setFeatureState } from 'ol-mapbox-style';
import { buffer } from 'ol/extent';
import { toFeature } from 'ol/render/Feature';
import { ref } from 'vue';
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
let schlagInfo;

/** @type {import('vue').Ref<Array<string>>} */
let layersOfInterest;

const { map } = useMap();

function getSchlagAtPixel(pixel) {
  return map.forEachFeatureAtPixel(
    pixel,
    (feature) => (feature.get('layer') === 'invekos_schlaege_2022_polygon' ? feature : undefined),
  );
}

function registerMapListeners() {
  let lastId;
  map.on('click', (event) => {
    const selectedRenderFeature = getSchlagAtPixel(event.pixel);
    schlagInfo.value = selectedRenderFeature?.getProperties();
    const id = selectedRenderFeature?.getId();
    if (id !== lastId) {
      if (lastId) {
        setFeatureState(map, { source: 'agrargis', id: lastId }, null);
      }
      setFeatureState(map, { source: 'agrargis', id }, { selected: true });
      lastId = id;
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
      }
    }
  });
  map.on('pointermove', (event) => {
    map.getTargetElement().style.cursor = getSchlagAtPixel(event.pixel) ? 'pointer' : '';
  });
}

export default function useSchlag() {
  if (!schlagInfo) {
    schlagInfo = ref();
    layersOfInterest = ref([]);
    registerMapListeners();
  }
  return { schlagInfo, layersOfInterest };
}
