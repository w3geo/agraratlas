import { getSource, setFeatureState } from 'ol-mapbox-style';
import { buffer, extend } from 'ol/extent';
import { toFeature } from 'ol/render/Feature';
import { ref, watch } from 'vue';
import useMap from './useMap';

/**
 * @typedef SchlagInfo
 * @property {number} id
 * @property {number} fart_id
 * @property {number} fs_kennung
 * @property {number} sl_flaeche_brutto_ha
 * @property {string} snar_bezeichnung
 * @property {string} snar_code
 * @property {import("ol/extent").Extent} extent
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
    .getFeaturesInExtent(buffer(extent, 10))
    .filter((renderFeature) => renderFeature.getId() === id && renderFeature.get('layer') === 'invekos_schlaege_2022_polygon')
    .forEach((renderFeature) => extend(extent, renderFeature.getGeometry().getExtent()));
  return extent;
}

function registerMapListeners() {
  map.on('click', (event) => {
    const selectedRenderFeature = getSchlagAtPixel(event.pixel);
    const lastId = schlagInfo.value?.id;
    const id = selectedRenderFeature?.getId();
    if (id !== lastId) {
      if (selectedRenderFeature) {
        const schlagExtent = getSchlagExtent(selectedRenderFeature);
        const bufferedExtent = buffer(schlagExtent, 10); // small buffer (~10m)
        const features = getSource(map, 'agrargis')
          .getFeaturesInExtent(bufferedExtent)
          .map((renderFeature) => toFeature(renderFeature))
          .filter((feature) => feature.getGeometry().intersectsExtent(bufferedExtent));
        const layers = Object.keys(features.reduce((previous, current) => {
          const layer = current.get('layer');
          if (layer !== selectedRenderFeature.get('layer')) {
            previous[current.get('layer')] = true;
          }
          return previous;
        }, {}));
        schlagInfo.value = {
          ...selectedRenderFeature.getProperties(),
          id,
          extent: schlagExtent,
        };
        layersOfInterest.value = layers;
      } else {
        schlagInfo.value = null;
        layersOfInterest.value = [];
      }
    }
  });
  map.on('pointermove', (event) => {
    map.getTargetElement().style.cursor = getSchlagAtPixel(event.pixel) ? 'pointer' : '';
  });
  listenersRegistered = true;
}

watch(schlagInfo, (value, oldValue) => {
  if (oldValue) {
    setFeatureState(map, { source: 'agrargis', id: oldValue.id }, null);
  }
  if (value) {
    setFeatureState(map, { source: 'agrargis', id: value.id }, { selected: true });
  }
  layerOfInterest.value = null;
});

watch(layerOfInterest, (value) => {
  const { sources, layers } = map.get('mapbox-style');
  const mapLayers = map.getLayers().getArray();
  const any = layers.filter((l) => l.metadata?.group === 'any');
  any.forEach((l) => { l.layout = { ...l.layout, visibility: value ? 'none' : 'visible' }; });
  const one = layers.filter((layer) => layer.metadata?.group === 'one');
  one.forEach((layer) => {
    layer.layout = { ...layer.layout, visibility: layer.metadata?.layer === value ? 'visible' : 'none' };
    const mapLayer = mapLayers.find((l) => l.get('mapbox-source') === layer.source);
    if (sources[layer.source].type === 'raster') {
      mapLayer.setVisible(layer.metadata?.layer === value);
    } else {
      mapLayer.changed();
    }
  });
});

export default function useLayers() {
  if (!listenersRegistered) {
    registerMapListeners();
  }
  return { schlagInfo, layersOfInterest, layerOfInterest };
}
