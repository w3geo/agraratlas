import { getSource, setFeatureState } from 'ol-mapbox-style';
import { buffer as bufferExtent, extend } from 'ol/extent';
import { transformExtent } from 'ol/proj';
import { ref, watch } from 'vue';
import { SCHLAEGE_LAYER } from '../constants';
import { map, mapReady } from './useMap';
import { draw, measure } from './useTools';

/**
 * @typedef SchlagInfo
 * @property {number} id
 * @property {boolean} loading
 * @property {number} [fart_id]
 * @property {number} [fs_kennung]
 * @property {number} [sl_flaeche_brutto_ha]
 * @property {string} [snar_bezeichnung]
 * @property {string} [snar_code]
 * @property {import("ol/extent").Extent} [extent]
 */

/** @type {import('vue').Ref<SchlagInfo>} */
export const schlagInfo = ref();

/**
 * @param {import("ol/pixel").Pixel} pixel
 * @returns
 */
function getSchlagAtPixel(pixel) {
  return map.forEachFeatureAtPixel(
    pixel,
    (feature) => (feature.get('layer') === SCHLAEGE_LAYER ? feature : undefined),
  );
}

/**
 * Gets all parts of a schlag feature (if crossing tile borders) and
 * calculates the total extent of the schlag.
 * @param {import("ol/render/Feature").default} feature
 * @returns {import("ol/extent").Extent}
 */
function getSchlagExtent(feature) {
  const id = feature.getId();
  const extent = feature.getGeometry().getExtent();
  getSource(map, 'agrargis')
    .getFeaturesInExtent(bufferExtent(extent, 10))
    .filter((renderFeature) => renderFeature.getId() === id && renderFeature.get('layer') === SCHLAEGE_LAYER)
    .forEach((renderFeature) => extend(extent, renderFeature.getGeometry().getExtent()));
  return transformExtent(extent, 'EPSG:3857', 'EPSG:4326');
}

function findSchlag(schlagId) {
  return new Promise((resolve) => {
    mapReady.then(() => {
      map.once('rendercomplete', () => {
        const extent = transformExtent(map.getView().calculateExtent(), 'EPSG:4326', 'EPSG:3857');
        const features = getSource(map, 'agrargis')
          .getFeaturesInExtent(extent)
          .filter((feature) => feature.get('layer') === SCHLAEGE_LAYER);
        const feature = features.find((f) => f.getId() === Number(schlagId));
        resolve(feature);
      });
      map.render();
    });
  });
}

function setSchlagInfo(feature) {
  schlagInfo.value = feature ? {
    ...feature.getProperties(),
    loading: false,
    id: feature.getId(),
    extent: getSchlagExtent(feature),
  } : null;
}

map.on('click', (event) => {
  if (measure.value || draw.value) { return; }
  const selectedRenderFeature = getSchlagAtPixel(event.pixel);
  setSchlagInfo(schlagInfo.value?.id !== selectedRenderFeature?.getId()
    ? selectedRenderFeature
    : null);
});
map.on('pointermove', (event) => {
  if (event.dragging || measure.value || draw.value) { return; }
  map.getTargetElement().style.cursor = getSchlagAtPixel(event.pixel) ? 'pointer' : '';
});

watch(schlagInfo, (value, oldValue) => {
  if (oldValue && !oldValue.loading) {
    setFeatureState(map, { source: 'agrargis', id: oldValue.id }, null);
  }
  if (value) {
    if (value.loading) {
      findSchlag(value.id).then((feature) => {
        setSchlagInfo(feature);
      });
    } else {
      setFeatureState(map, { source: 'agrargis', id: value.id }, { selected: true });
    }
  }
});

/**
 * @returns {{
 *   schlagInfo: import('vue').Ref<SchlagInfo>,
 *   availableLayersOfInterest: import('vue').Ref<Array<string>>,
 *   layersOfInterest: import('vue').Ref<Array<string>>
 * }}
 */
export function useSchlag() {
  return { schlagInfo };
}
