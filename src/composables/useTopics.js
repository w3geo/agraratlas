import { getSource, recordStyleLayer } from 'ol-mapbox-style';
import { getCenter, buffer as bufferExtent } from 'ol/extent';
import { getPointResolution, transformExtent } from 'ol/proj';
import { toFeature } from 'ol/render/Feature';
import { nextTick, reactive, watch } from 'vue';
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
 * @property {number} urlSort
 * @property {boolean} visible
 */

/** @type {Array<Topic>} */
export const topics = reactive([]);
mapReady.then(() => {
  const { layers } = map.get('mapbox-style');
  topics.push(...Object.values(layers
    .filter((l) => l.metadata?.group === 'one' && l.type !== 'raster')
    .map((l) => ({
      label: l.metadata?.label,
      color: l.paint?.['fill-color'],
      urlSort: l.metadata?.urlSort,
    })).reduce((acc, { label, color, urlSort }) => {
      if (!(label in acc)) {
        acc[label] = ({
          label,
          color,
          inExtent: false,
          inSchlagExtent: false,
          urlSort,
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
  const features = getSource(map, 'agrargis')
    .getFeaturesInExtent(extent)
    .filter((feature) => feature.get('layer') !== SCHLAEGE_LAYER)
    .map((renderFeature) => toFeature(renderFeature))
    .filter((feature) => feature.getGeometry().intersectsExtent(extent));
  const style = await filterStyle;
  recordStyleLayer(true);
  const layers = Object.keys(features.reduce((acc, cur) => {
    cur.set('mapbox-layer', undefined);
    style(cur, map.getView().getResolution());
    const layer = cur.get('mapbox-layer')?.metadata?.label;
    if (layer) {
      acc[layer] = true;
    }
    return acc;
  }, {}));
  recordStyleLayer(false);
  return layers;
}

/** @returns {Promise<void>} */
async function updateTopicsInExtent() {
  const { extent } = mapView.value;
  const renderedTopics = await findRenderedTopics(transformExtent(extent, 'EPSG:4326', 'EPSG:3857'));
  topics.forEach((topic) => {
    topic.inExtent = renderedTopics.includes(topic.label);
  });
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

watch(mapView, () => {
  map.once('rendercomplete', updateTopicsInExtent);
});

watch(schlagInfo, updateTopicsInSchlagExtent);

export function useTopics() {
  return { topics };
}
