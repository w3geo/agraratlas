import { getSource, recordStyleLayer } from 'ol-mapbox-style';
import { getCenter, buffer as bufferExtent } from 'ol/extent';
import { getPointResolution, transformExtent } from 'ol/proj';
import { toFeature } from 'ol/render/Feature';
import { reactive, watch } from 'vue';
import { SCHLAEGE_LAYER } from '../constants';
import {
  filterStyle, map, mapReady, mapView,
} from './useMap';
import { schlagInfo } from './useSchlag';

/**
 * @typedef Topic
 * @property {string} label
 * @property {string} color
 * @property {boolean} inExtent
 * @property {boolean} inSchlagExtent
 * @property {boolean} visible
 */

/** @type {Array<Topic>} */
export const topics = reactive([]);
mapReady.then(() => {
  const { layers } = map.get('mapbox-style');
  topics.push(...Object.values(layers
    .filter((l) => l.metadata?.group === 'one' && l.type !== 'raster')
    .map((l) => ({ label: l.metadata?.label, color: l.paint?.['fill-color'] })).reduce((acc, { label, color }) => {
      if (!(label in acc)) {
        acc[label] = ({
          label,
          color,
          inExtent: false,
          inSchlagExtent: false,
          visible: false,
        });
      }
      return acc;
    }, {})));
});

/**
 * @param {import("ol/extent.js").Extent} extent
 * @returns {Promise<Array<string>>}
 */
async function findRenderedTopics(extent) {
  let features = getSource(map, 'agrargis')
    .getFeaturesInExtent(extent);
  features = features.map((renderFeature) => toFeature(renderFeature))
    .filter((feature) => feature.getGeometry().intersectsExtent(extent));
  const style = await filterStyle;
  recordStyleLayer(true);
  const layers = Object.keys(features.reduce((acc, cur) => {
    cur.set('mapbox-layer', undefined);
    style(cur, map.getView().getResolution());
    const layer = cur.get('mapbox-layer')?.metadata?.label;
    if (layer && layer !== SCHLAEGE_LAYER) {
      acc[layer] = true;
    }
    return acc;
  }, {}));
  recordStyleLayer(false);
  return layers;
}

/** @returns {Promise<void>} */
async function updateTopicsInExtent() {
  const { extent, zoom } = mapView.value;
  if (zoom < 12) {
    topics.forEach((topic) => {
      topic.inExtent = true;
    });
  } else {
    const renderedTopics = await findRenderedTopics(transformExtent(extent, 'EPSG:4326', 'EPSG:3857'));
    topics.forEach((topic) => {
      topic.inExtent = renderedTopics.includes(topic.label);
    });
  }
}

/** @returns {Promise<void>|undefined} */
function updateTopicsInSchlagExtent() {
  if (schlagInfo.value?.extent) {
    const schlagExtent = transformExtent(schlagInfo.value.extent, 'EPSG:4326', 'EPSG:3857');
    const resolution = map.getView().getResolution();
    const buffer = getPointResolution(
      map.getView().getProjection(),
      resolution,
      getCenter(schlagExtent),
      'm',
    ) * (10 / resolution);
    const bufferedExtent = bufferExtent(schlagExtent, buffer); // small buffer (10m)
    findRenderedTopics(bufferedExtent).then((availableTopics) => {
      topics.forEach((topic) => {
        topic.inSchlagExtent = availableTopics.includes(topic.label);
      });
    });
  }
}

let loading = false;
map.on('loadstart', () => { loading = true; });
map.on('loadend', () => { loading = false; });
watch(mapView, () => {
  if (loading) {
    map.once('rendercomplete', updateTopicsInExtent);
  } else {
    updateTopicsInExtent();
  }
});

watch(schlagInfo, updateTopicsInSchlagExtent);

export function useTopics() {
  return { topics };
}
