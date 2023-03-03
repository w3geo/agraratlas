import { getSource } from 'ol-mapbox-style';
import {
  getBottomLeft, getHeight, getTopRight, getWidth,
} from 'ol/extent';
import { Style, Fill } from 'ol/style';
import { reactive, watch } from 'vue';
import { transformExtent } from 'ol/proj';
import { toGeometry } from 'ol/render/Feature';
import { MVT } from 'ol/format';
import { fromUrl } from 'geotiff';
import { compose, create } from 'ol/transform';
import CanvasImmediateRenderer from 'ol/render/canvas/Immediate';
import {
  map, mapReady,
} from './useMap';
import { schlagInfo } from './useSchlag';
import { SCHLAEGE_LAYER } from '../constants';

/**
 * @typedef Gradient
 * @property {string} label
 * @property {string} color
 * @property {boolean} inSchlag
 * @property {number} fraction
 * @property {boolean} visible
 */

let gradientClassesByValue;
/** @type {import("ol/Tile").UrlFunction} */
let getSchlagTileUrl;
/** @type {import("ol/tilegrid/TileGrid").default} */
let schlagTileGrid;
const schlagStyle = new Style({
  fill: new Fill({ color: 'black' }),
});

/** @type {Array<Topic>} */
export const gradients = reactive([]);
mapReady.then(() => {
  const mapboxLayer = map.get('mapbox-style').layers.find((l) => l.id === 'neigungsklassen');
  gradientClassesByValue = mapboxLayer.metadata.classes.reduce((acc, cur) => {
    acc[cur.value] = cur.label;
    return acc;
  }, {});
  gradients.push(...mapboxLayer.metadata.classes.map((c) => ({
    label: c.label,
    color: `rgb(${c.color.join(',')})`,
    fraction: 0,
    inSchlag: false,
    visible: false,
  })));

  const source = getSource(map, 'agrargis');
  getSchlagTileUrl = source.getTileUrlFunction();
  schlagTileGrid = source.getTileGrid();
});

const format = new MVT({ layers: [SCHLAEGE_LAYER] });
const filter = (feature) => feature.getId() === schlagInfo.value?.id;
const schlagCanvas = document.createElement('canvas');
// document.body.appendChild(schlagCanvas); // for debugging
const schlagContext = schlagCanvas.getContext('2d');
/** @type {import("geotiff").GeoTIFF} */
let geotiff;

async function calculateGradientClasses() {
  if (!schlagInfo.value || schlagInfo.value.loading) {
    return;
  }
  if (!geotiff) {
    geotiff = await fromUrl('./map/raster/ALS_DNM_AT_COG_reclassified_220820.tif');
  }

  const schlag = schlagInfo.value;
  const resolution = 5;
  let extent31287 = transformExtent(schlag.extent, 'EPSG:4326', 'EPSG:31287');
  extent31287 = [
    ...getBottomLeft(extent31287).map((x) => Math.floor(x / resolution) * resolution),
    ...getTopRight(extent31287).map((y) => Math.ceil(y / resolution) * resolution),
  ];
  const width = getWidth(extent31287) / resolution;
  const height = getHeight(extent31287) / resolution;

  const gradientData = (await geotiff.readRasters({
    width,
    height,
    bbox: extent31287,
  }))[0];

  const extent3857 = transformExtent(schlag.extent, 'EPSG:4326', 'EPSG:3857');
  const tileZoom = schlagTileGrid.getZForResolution(resolution);
  const tileFetchPromises = [];
  const tileExtents = [];
  schlagTileGrid.forEachTileCoord(extent3857, tileZoom, (tileCoord) => {
    const url = getSchlagTileUrl(tileCoord);
    tileFetchPromises.push(fetch(url).then((response) => response.arrayBuffer()));
    tileExtents.push(schlagTileGrid.getTileCoordExtent(tileCoord));
  });

  const tileBuffers = await Promise.all(tileFetchPromises);
  schlagCanvas.width = width;
  schlagCanvas.height = height;
  const vectorContext = new CanvasImmediateRenderer(schlagContext, 1, extent31287, compose(
    create(),
    0,
    height,
    1 / resolution,
    -1 / resolution,
    0,
    -extent31287[0],
    -extent31287[1],
  ), 0);
  vectorContext.setStyle(schlagStyle);
  tileBuffers.forEach((tileBuffer, i) => {
    format.readFeatures(tileBuffer, { extent: tileExtents[i] })
      .filter(filter).forEach((g) => {
        const geometry = toGeometry(g);
        geometry.transform('EPSG:3857', 'EPSG:31287');
        vectorContext.drawGeometry(geometry);
      });
  });
  const schlagData = schlagContext.getImageData(0, 0, width, height).data;

  const buckets = {};
  for (let i = 0, ii = schlagData.length; i < ii; i += 4) {
    const schlagAlpha = schlagData[i + 3];
    if (schlagAlpha > 0) {
      const key = gradientData[i / 4];
      buckets[key] = (buckets[key] || 0) + resolution * resolution * (schlagAlpha / 255);
    }
  }
  const total = Object.values(buckets).reduce((a, b) => a + b, 0);
  const gradientClasses = Object.keys(gradientClassesByValue).reduce((acc, cur) => {
    if (buckets[cur]) {
      const fraction = total ? (buckets[cur] / total) : 0;
      acc[gradientClassesByValue[cur]] = fraction;
    }
    return acc;
  }, {});
  gradients.forEach((a) => {
    const fraction = gradientClasses[a.label];
    a.inSchlag = fraction !== undefined;
    a.fraction = fraction === undefined ? 0 : fraction;
  });
}

watch(schlagInfo, calculateGradientClasses);

export function useGradient() {
  return { gradients };
}
