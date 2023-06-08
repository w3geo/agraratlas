import { getSource, recordStyleLayer } from 'ol-mapbox-style';
import { buffer as bufferExtent } from 'ol/extent';
import { transformExtent } from 'ol/proj';
import { toFeature } from 'ol/render/Feature';
import { GeoJSON } from 'ol/format';
import { reactive, watch } from 'vue';
import booleanIntersects from '@turf/boolean-intersects';
import bufferGeometry from '@turf/buffer';
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
 * @property {number} displaySort
 * @property {boolean} visible
 */

const geojson = new GeoJSON();

let tilesLoading;

/** @type {Array<Topic>} */
export const topics = reactive([]);
mapReady.then(() => {
  const source = getSource(map, 'agrargis');
  source.on('tileloadstart', () => { tilesLoading = (tilesLoading || 0) + 1; });
  source.on(['tileloadend', 'tileloaderror'], () => { tilesLoading -= 1; });
  const { layers } = map.get('mapbox-style');
  topics.push(...Object.values(layers
    .filter((l) => l.metadata?.group === 'one' && l.type !== 'raster')
    .map((l) => ({
      label: l.metadata?.label,
      color: l.paint?.['fill-color'],
      urlSort: l.metadata?.urlSort,
      displaySort: l.metadata?.displaySort || Number.MAX_SAFE_INTEGER,
    })).reduce((acc, {
      label, color, urlSort, displaySort,
    }) => {
      if (!(label in acc)) {
        acc[label] = ({
          label,
          color,
          inExtent: false,
          inSchlagExtent: false,
          urlSort,
          displaySort,
          visible: false,
        });
      }
      return acc;
    }, {})));
});

function intersects(feature, candidates) {
  return candidates.some((candidate) => booleanIntersects(feature, candidate));
}

/**
 * @param {import("ol/extent.js").Extent} extent
 * @param {boolean} [precise] Use geometry intersection instead of extent intersection
 * @returns {Promise<Array<string>>}
 */
async function findTopics(extent, precise = false) {
  const features = getSource(map, 'agrargis')
    .getFeaturesInExtent(extent)
    .filter((feature) => feature.get('layer') !== SCHLAEGE_LAYER || feature.get('kz_bio_oepul_jn') === 'J')
    .map((renderFeature) => toFeature(renderFeature));
  const style = await filterStyle;
  const resolution = map.getView().getResolution();
  recordStyleLayer(true);
  const topicsOfInterest = Object.keys(features.reduce((acc, cur) => {
    cur.set('mapbox-layer', undefined);
    style(cur, resolution);
    const topic = cur.get('mapbox-layer')?.metadata?.label;
    if (topic) {
      let ofInterest;
      if (precise) {
        const distance = cur.get('kz_bio_oepul_jn') === 'J' ? 100 : 10;
        const buffered = bufferGeometry(geojson.writeGeometryObject(cur.getGeometry(), { featureProjection: 'EPSG:3857' }), distance, { units: 'meters' });
        ofInterest = intersects(buffered, schlagInfo.value.parts);
      } else {
        ofInterest = cur.getGeometry().intersectsExtent(extent);
      }
      if (ofInterest) {
        acc[topic] = true;
      }
    }
    return acc;
  }, {}));
  recordStyleLayer(false);
  return topicsOfInterest;
}

async function updateTopicsInExtent() {
  const { extent } = mapView.value;
  const renderedTopics = await findTopics(transformExtent(extent, 'EPSG:4326', 'EPSG:3857'));
  topics.forEach((topic) => {
    topic.inExtent = renderedTopics.includes(topic.label);
  });
  topics.sort((a, b) => a.displaySort - b.displaySort);
}

function updateTopicsInSchlagExtent() {
  if (schlagInfo.value?.extent) {
    const schlagExtent = transformExtent(schlagInfo.value.extent, 'EPSG:4326', 'EPSG:3857');
    const bufferedExtent = bufferExtent(schlagExtent, 100);
    findTopics(bufferedExtent, true).then((availableTopics) => {
      topics.forEach((topic) => {
        topic.inSchlagExtent = availableTopics.includes(topic.label);
      });
    });
  }
}

watch(mapView, () => {
  setTimeout(() => {
    if (tilesLoading === undefined || tilesLoading > 0) {
      const source = getSource(map, 'agrargis');
      source.on(['tileloadend', 'tileloaderror'], function onLoaded() {
        setTimeout(() => {
          if (!tilesLoading) {
            source.un(['tileloadend', 'tileloaderror'], onLoaded);
            updateTopicsInExtent();
          }
        }, 150);
      });
    } else {
      updateTopicsInExtent();
    }
  }, 0);
});

watch(schlagInfo, updateTopicsInSchlagExtent);

export function useTopics() {
  return { topics };
}
