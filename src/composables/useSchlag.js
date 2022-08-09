import {
  applyStyle, getSource, recordStyleLayer, setFeatureState,
} from 'ol-mapbox-style';
import { buffer as bufferExtent, extend, getCenter } from 'ol/extent';
import VectorTileLayer from 'ol/layer/VectorTile';
import { getPointResolution, transformExtent } from 'ol/proj';
import { toFeature } from 'ol/render/Feature';
import { ref, watch } from 'vue';
import { map, mapReady } from './useMap';

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

const schlaegeLayer = 'invekos_schlaege_2022_polygon';

/** @type {import('vue').Ref<SchlagInfo>} */
export const schlagInfo = ref();

/** @type {import('vue').Ref<Array<string>>} */
const layersOfInterest = ref([]);

/** @type {import('vue').Ref<string>} */
const layerOfInterest = ref();

let filterStyle;

mapReady.then(() => {
  const style = JSON.parse(JSON.stringify(map.get('mapbox-style')));
  style.layers.forEach((l) => {
    if (l.metadata?.group === 'any') {
      l.layout = { ...l.layout, visibility: 'none' };
    } else if (l.metadata?.group === 'one') {
      l.layout = { ...l.layout, visibility: 'visible' };
    } else {
      l.layout = { ...l.layout, visibility: 'none' };
    }
  });
  const filterLayer = new VectorTileLayer();
  applyStyle(filterLayer, style, 'agrargis', './map/style.json').then(() => {
    filterStyle = filterLayer.getStyle();
  });
});

/**
 * @param {import("ol/pixel").Pixel} pixel
 * @returns
 */
function getSchlagAtPixel(pixel) {
  return map.forEachFeatureAtPixel(
    pixel,
    (feature) => (feature.get('layer') === schlaegeLayer ? feature : undefined),
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
    .filter((renderFeature) => renderFeature.getId() === id && renderFeature.get('layer') === schlaegeLayer)
    .forEach((renderFeature) => extend(extent, renderFeature.getGeometry().getExtent()));
  return transformExtent(extent, 'EPSG:3857', 'EPSG:4326');
}

function setLayersOfInterest(selectedRenderFeature) {
  if (selectedRenderFeature) {
    const schlagExtent = transformExtent(schlagInfo.value.extent, 'EPSG:4326', 'EPSG:3857');
    const resolution = map.getView().getResolution();
    const buffer = getPointResolution(
      map.getView().getProjection(),
      resolution,
      getCenter(schlagExtent),
      'm',
    ) * (10 / resolution);
    const bufferedExtent = bufferExtent(schlagExtent, buffer); // small buffer (10m)
    let features = getSource(map, 'agrargis')
      .getFeaturesInExtent(bufferedExtent);
    features = features.map((renderFeature) => toFeature(renderFeature))
      .filter((feature) => feature.getGeometry().intersectsExtent(bufferedExtent));
    recordStyleLayer(true);
    const layers = Object.keys(features.reduce((previous, current) => {
      current.set('mapbox-layer', undefined);
      filterStyle(current, resolution);
      const layer = current.get('mapbox-layer')?.id;
      if (layer && layer !== schlaegeLayer) {
        previous[layer] = true;
      }
      return previous;
    }, {}));
    recordStyleLayer(false);
    const mapboxLayers = map.get('mapbox-style').layers;
    layersOfInterest.value = layers.map((layer) => mapboxLayers
      .find((mapboxLayer) => mapboxLayer.id === layer).metadata?.label);
  } else {
    layersOfInterest.value = [];
  }
}

function findSchlag(schlagId) {
  return new Promise((resolve) => {
    mapReady.then(() => {
      map.once('rendercomplete', () => {
        const extent = transformExtent(map.getView().calculateExtent(), 'EPSG:4326', 'EPSG:3857');
        const features = getSource(map, 'agrargis')
          .getFeaturesInExtent(extent)
          .filter((feature) => feature.get('layer') === 'invekos_schlaege_2022_polygon');
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
  const selectedRenderFeature = getSchlagAtPixel(event.pixel);
  setSchlagInfo(selectedRenderFeature);
  setLayersOfInterest(selectedRenderFeature);
});
map.on('pointermove', (event) => {
  map.getTargetElement().style.cursor = getSchlagAtPixel(event.pixel) ? 'pointer' : '';
});

watch(schlagInfo, (value, oldValue) => {
  if (oldValue && !oldValue.loading) {
    setFeatureState(map, { source: 'agrargis', id: oldValue.id }, null);
  }
  if (value) {
    if (value.loading) {
      layerOfInterest.value = null;
      findSchlag(value.id).then((feature) => {
        setSchlagInfo(feature);
        setLayersOfInterest(feature);
      });
    } else {
      setFeatureState(map, { source: 'agrargis', id: value.id }, { selected: true });
    }
  } else {
    layerOfInterest.value = null;
  }
});

watch(layerOfInterest, (value) => {
  mapReady.then(() => {
    const { sources, layers } = map.get('mapbox-style');
    const mapLayers = map.getLayers().getArray();
    const any = layers.filter((l) => l.metadata?.group === 'any');
    any.forEach((l) => { l.layout = { ...l.layout, visibility: value ? 'none' : 'visible' }; });
    const one = layers.filter((layer) => layer.metadata?.group === 'one');
    one.forEach((layer) => {
      layer.layout = { ...layer.layout, visibility: layer.metadata?.label === value ? 'visible' : 'none' };
      const mapLayer = mapLayers.find((l) => l.get('mapbox-source') === layer.source);
      if (sources[layer.source].type === 'raster') {
        mapLayer.setVisible(layer.metadata?.label === value);
      } else {
        mapLayer.changed();
      }
    });
  });
});

/**
 * @returns {{
 *   schlagInfo: import('vue').Ref<SchlagInfo>,
 *   layersOfInterest: import('vue').Ref<Array<string>>,
 *   layerOfInterest: import('vue').Ref<string>
 * }}
 */
export function useSchlag() {
  return { schlagInfo, layersOfInterest, layerOfInterest };
}
