import { getLayer, getMapboxLayer, getSource } from 'ol-mapbox-style';
import {
  getBottomLeft, getHeight, getTopRight, getWidth,
} from 'ol/extent';
import { Style, Fill } from 'ol/style';
import { reactive, watch } from 'vue';
import { transformExtent } from 'ol/proj';
import { toGeometry } from 'ol/render/Feature';
import { MVT } from 'ol/format';
import { compose, create } from 'ol/transform';
import CanvasImmediateRenderer from 'ol/render/canvas/Immediate';
import { fromUrl } from 'geotiff';
import TileGrid from 'ol/tilegrid/TileGrid';
import { TileImage as TileImageSource } from 'ol/source';
import { map, mapReady, transformRequest } from './useMap';
import { schlagInfo } from './useSchlag';
import { SCHLAEGE_SOURCE } from '../constants';

/**
 * @typedef Gradient
 * @property {string} label
 * @property {string} color
 * @property {boolean} inSchlag
 * @property {number} fraction
 * @property {boolean} visible
 */

/** @type {Promise<import("geotiff").GeoTIFF>} */
const geotiff = fromUrl('./map/raster/ALS_DNM_AT_COG_reclassified_220820.tif');

let gradientClassesByValue;
/** @type {import("ol/Tile").UrlFunction} */
let getSchlagTileUrl;
/** @type {import("ol/tilegrid/TileGrid").default} */
let schlagTileGrid;
const schlagStyle = new Style({
  fill: new Fill({ color: 'black' }),
});

const transparent = [0, 0, 0, 0];
const canvas = document.createElement('canvas');
canvas.width = 512;
canvas.height = 512;
const context = canvas.getContext('2d');
const geotiffImageData = context.createImageData(512, 512);
let gradientSource;

/** @type {Array<Gradient>} */
export const gradients = reactive([]);

mapReady.then(() => {
  gradientSource = new TileImageSource({
    interpolate: false,
    projection: 'EPSG:31287',
    tileGrid: new TileGrid({
      extent: [112020.5, 274970.5, 685945.5, 570935.5],
      origin: [112020.5, 570935.5],
      resolutions: [
        1278.229398663697,
        639.8272017837235,
        319.91360089186173,
        159.95680044593087,
        79.98954703832753,
        39.99756080563105,
        19.99947729727846,
        9.999912881361839,
        5,
      ],
      tileSize: 512,
    }),
    tileLoadFunction: async (tile, src) => {
      // Decode the gradient colors from the URL, e.g. "0,0,0,0|255,0,0,255|0,255,0,255..."
      const colors = src.split('|').map((color) => color.split(',').map(Number));
      const tileCoord = tile.getTileCoord();
      const extent = gradientSource.getTileGrid().getTileCoordExtent(tileCoord);
      const gradientData = (await (await geotiff).readRasters({
        bbox: extent,
        width: 512,
        height: 512,
      }))[0];
      const { data } = geotiffImageData;
      for (let i = 0, ii = data.length; i < ii; i += 4) {
        const color = colors[gradientData[i / 4] - 1] || transparent;
        data.set(color, i);
      }
      context.putImageData(geotiffImageData, 0, 0);
      tile.getImage().src = canvas.toDataURL('image/png');
    },
  });
  getLayer(map, 'neigungsklassen').setSource(gradientSource);

  const gradientMapboxLayer = getMapboxLayer(map, 'neigungsklassen');
  gradientClassesByValue = gradientMapboxLayer.metadata.classes.reduce((acc, cur) => {
    acc[cur.value] = cur.label;
    return acc;
  }, {});
  gradients.push(...gradientMapboxLayer.metadata.classes.map((c) => ({
    label: c.label,
    color: `rgb(${c.color.join(',')})`,
    fraction: 0,
    inSchlag: false,
    visible: false,
  })));

  const schlagSource = getSource(map, 'agrargis');
  getSchlagTileUrl = schlagSource.getTileUrlFunction();
  schlagTileGrid = schlagSource.getTileGrid();
});

const format = new MVT({ layers: [SCHLAEGE_SOURCE] });
const filter = (feature) => feature.getId() === schlagInfo.value?.id;
const schlagCanvas = document.createElement('canvas');
// document.body.appendChild(schlagCanvas); // for debugging
const schlagContext = schlagCanvas.getContext('2d');

async function calculateGradientClasses() {
  if (!schlagInfo.value || schlagInfo.value.loading) {
    return;
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

  const gradientData = (await (await geotiff).readRasters({
    width,
    height,
    bbox: extent31287,
  }))[0];

  const extent3857 = transformExtent(schlag.extent, 'EPSG:4326', 'EPSG:3857');
  const tileZoom = schlagTileGrid.getZForResolution(resolution);
  const tileFetchPromises = [];
  const tileExtents = [];
  schlagTileGrid.forEachTileCoord(extent3857, tileZoom, (tileCoord) => {
    tileFetchPromises.push((async () => {
      const url = await transformRequest(getSchlagTileUrl(tileCoord), 'Tiles');
      const response = await fetch(url);
      return response.arrayBuffer();
    })());
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

watch(gradients, (value) => {
  const gradientLayer = getLayer(map, 'neigungsklassen');
  const gradientLayerVisible = value.some((v) => v.visible);
  if (gradientSource) {
    const gradientMapboxLayer = getMapboxLayer(map, 'neigungsklassen');
    const gradientColors = gradientMapboxLayer.metadata.classes.reduce((acc, cur, i) => {
      acc[cur.value - 1] = value[i].visible ? [...cur.color, 255] : transparent;
      return acc;
    }, []);
    // Encode the gradient colors into the URL, e.g. "0,0,0,0|255,0,0,255|0,255,0,255..."
    gradientSource.setUrl(gradientColors.join('|'));
  }
  if (!gradientLayerVisible) {
    gradientSource.clear();
  }
  gradientLayer.setVisible(gradientLayerVisible);
});

export function useGradient() {
  return { gradients };
}
