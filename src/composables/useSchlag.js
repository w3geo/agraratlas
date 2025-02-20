import { getLayer, getSource, setFeatureState } from 'ol-mapbox-style';
import { createEmpty, extend } from 'ol/extent';
import { transformExtent } from 'ol/proj';
import { toGeometry } from 'ol/render/Feature';
import { shallowRef, watch } from 'vue';
import { GeoJSON } from 'ol/format';
import { SCHLAEGE_LAYER, SCHLAEGE_SOURCE } from '../constants';
import { map, mapReady } from './useMap';
import { draw, measure } from './useTools';

/** @typedef {Array<{x: number, y: number}>>} Vectors */

/**
 * @typedef SchlagInfo
 * @property {number} id
 * @property {string} localID
 * @property {boolean} loading
 * @property {number} [sl_flaeche_brutto_ha]
 * @property {string} [snar_bezeichnung]
 * @property {string} [fnar_code]
 * @property {string} [kz_bio_oepul_jn]
 * @property {import("ol/extent").Extent} [extent]
 * @property {Array<import('ol/format/GeoJSON').GeoJSONGeometry>} [parts]
 */

const geojson = new GeoJSON();

/** @type {import('vue').Ref<SchlagInfo>} */
export const schlagInfo = shallowRef();

/**
 * @param {import("ol/pixel").Pixel} pixel
 * @returns
 */
function getSchlagAtPixel(pixel) {
  return map.forEachFeatureAtPixel(
    pixel,
    (feature) => (feature.get('layer') === SCHLAEGE_SOURCE ? feature : undefined),
  );
}

/**
 * Get all parts of a schlag feature, from all involved tiles.
 * @param {import("ol/render/Feature").default} feature
 * @returns {Promise<Array<import("ol/render/Feature").default>>}
 */
async function getSchlagParts(feature) {
  const id = feature.getId();
  const extent = feature.getGeometry().getExtent();
  const source = /** @type {import("ol/source.js").VectorTile} */ (getSource(map, 'agrargis'));
  const tilePromises = [];
  source.getTileGrid().forEachTileCoord(extent, 12, (tileCoord) => {
    tilePromises.push(new Promise((resolve, reject) => {
      const tile = source.getTile(...tileCoord, 1, source.getProjection());
      if (tile.getState() < 2) {
        const onchange = () => {
          if (tile.getState() === 2 || tile.getState() === 4) {
            tile.removeEventListener('change', onchange);
            resolve(tile);
          } else if (tile.getState() === 3) {
            tile.removeEventListener('change', onchange);
            reject();
          }
        };
        tile.addEventListener('change', onchange);
        tile.load();
      } else {
        resolve(tile);
      }
    }));
  });
  const tiles = await Promise.all(tilePromises);
  return tiles.reduce((acc, tile) => {
    tile.getSourceTiles().forEach((sourceTile) => {
      acc.push(...sourceTile.getFeatures().filter((renderFeature) => renderFeature.getId() === id && renderFeature.get('layer') === SCHLAEGE_SOURCE));
    });
    return acc;
  }, []);
}

function findSchlag(schlagId) {
  return new Promise((resolve) => {
    mapReady.then(() => {
      map.once('rendercomplete', async () => {
        const extent = transformExtent(map.getView().calculateExtent(), 'EPSG:4326', 'EPSG:3857');
        const features = getLayer(map, SCHLAEGE_LAYER)
          .getFeaturesInExtent(extent)
          .filter((feature) => feature.get('layer') === SCHLAEGE_SOURCE);
        const feature = features.find((f) => f.get('localID') === schlagId);
        if (!feature) {
          const response = await fetch(map.get('mapbox-style').metadata.sources[SCHLAEGE_SOURCE].featureUrlTemplate.replace('{localID}', schlagId));
          const [geojsonFeature] = geojson.readFeatures(await response.json());
          map.getView().fit(geojsonFeature.getGeometry().getExtent(), {
            padding: [50, 50, 50, 50],
            duration: 500,
            callback: () => findSchlag(schlagId).then(resolve),
          });
          return;
        }
        resolve(feature);
      });
      map.render();
    });
  });
}

async function setSchlagInfo(feature) {
  if (!feature) {
    schlagInfo.value = null;
    return;
  }
  const features = await getSchlagParts(feature);
  const extent = createEmpty();
  features.forEach((polygon) => extend(extent, polygon.getExtent()));
  schlagInfo.value = {
    ...feature.getProperties(),
    loading: false,
    id: feature.getId(),
    localID: feature.get('localID'),
    extent: transformExtent(extent, 'EPSG:3857', 'EPSG:4326'),
    parts: features.map((f) => geojson.writeGeometryObject(toGeometry(f), { featureProjection: 'EPSG:3857' })),
  };
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
      findSchlag(value.localID).then((feature) => {
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
