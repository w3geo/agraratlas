import { Feature, Map, View } from 'ol';
import { getSource } from 'ol-mapbox-style';
import { getCenter, getHeight, getWidth } from 'ol/extent';
import WebGLTileLayer from 'ol/layer/WebGLTile';
import { Style, Fill } from 'ol/style';
import { reactive, watch } from 'vue';
import { transformExtent } from 'ol/proj';
import { GeoTIFF } from 'ol/source';
import VectorLayer from 'ol/layer/Vector';
import { toGeometry } from 'ol/render/Feature';
import VectorSource from 'ol/source/Vector';
import { MVT } from 'ol/format';
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

const gradientClassesByRGB = {
  '255,255,154': '0 - <10%',
  '12,156,205': '10 - <18%',
  '255,190,255': '18 - <25%',
  '0,51,255': '25 - <35%',
  '255,0,0': '35 - <50%',
  '164,164,164': '>=50%',
};

export const calculationCanvas = document.createElement('canvas');
calculationCanvas.width = 1;
calculationCanvas.height = 1;
export const calculationContext = calculationCanvas.getContext('2d');

/** @type {Map} */
let calculationMap;
/** @type {import("ol/Tile").UrlFunction} */
let getSchlagTileUrl;
/** @type {import("ol/tilegrid/TileGrid").default} */
let schlagTileGrid;
/** @type {VectorLayer} */
let schlagLayer;

/** @type {Array<Topic>} */
export const gradients = reactive([]);
mapReady.then(() => {
  const { layers } = map.get('mapbox-style');
  gradients.push(...Object.values(layers
    .filter((l) => l.metadata?.group === 'one' && l.type === 'raster')
    .map((l) => l.metadata?.label).reduce((acc, cur) => {
      if (!(cur in acc)) {
        acc[cur] = ({
          label: cur,
          color: `rgb(${Object.keys(gradientClassesByRGB)[Object.values(gradientClassesByRGB).indexOf(cur)]})`,
          fraction: 0,
          inSchlag: false,
          visible: false,
        });
      }
      return acc;
    }, {})));

  const source = getSource(map, 'agrargis');
  getSchlagTileUrl = source.getTileUrlFunction();
  schlagTileGrid = source.getTileGrid();
  schlagLayer = new VectorLayer({
    style: new Style({
      fill: new Fill({ color: 'black' }),
    }),
  });
  const gradientLayer = new WebGLTileLayer({
    source: new GeoTIFF({
      sources: [{
        url: './map/raster/ALS_DNM_AT_COG_reclassified_220820.tif',
      }],
      normalize: false,
      interpolate: false,
    }),
    style: {
      color: [
        'case',
        ['==', ['band', 1], 1], [255, 255, 154],
        ['==', ['band', 1], 2], [12, 156, 205],
        ['==', ['band', 1], 3], [255, 190, 255],
        ['==', ['band', 1], 4], [0, 51, 255],
        ['==', ['band', 1], 5], [255, 0, 0],
        ['==', ['band', 1], 6], [164, 164, 164],
        [0, 0, 0, 0],
      ],
    },
  });

  calculationMap = new Map({
    target: document.createElement('div'),
    layers: [
      schlagLayer,
      gradientLayer,
    ],
    controls: [],
    interactions: [],
    pixelRatio: 1,
    view: new View({
      projection: 'EPSG:31287',
      minResolution: 5,
      maxResolution: 5,
      resolution: 5,
    }),
  });
});

const format = new MVT({ layers: [SCHLAEGE_LAYER] });
const filter = (feature) => feature.getId() === schlagInfo.value?.id;

/** @type {() => void} */
let onRenderComplete;

function calculateGradientClasses() {
  if (!schlagInfo.value || schlagInfo.value.loading) {
    return;
  }
  if (onRenderComplete) {
    calculationMap.un('rendercomplete', onRenderComplete);
  }

  const schlag = schlagInfo.value;

  onRenderComplete = () => {
    const canvas = calculationMap.getTargetElement().querySelectorAll('canvas');
    if (!canvas || canvas.length < 2) {
      return;
    }
    calculationCanvas.width = canvas[1].width;
    calculationCanvas.height = canvas[1].height;
    calculationContext.globalCompositeOperation = 'source-over';
    calculationContext.drawImage(canvas[0], 0, 0);
    calculationContext.globalCompositeOperation = 'source-atop';
    calculationContext.drawImage(canvas[1], 0, 0);
    const imageData = calculationContext.getImageData(
      0,
      0,
      calculationCanvas.width,
      calculationCanvas.height,
    );
    /*
    const debugCanvas = document.createElement('canvas');
    debugCanvas.width = calculationCanvas.width;
    debugCanvas.height = calculationCanvas.height;
    const debugContext = debugCanvas.getContext('2d');
    debugContext.putImageData(imageData, 0, 0);
    document.body.appendChild(debugCanvas);
    */
    const buckets = {};
    for (let i = 0, ii = imageData.data.length; i < ii; i += 4) {
      const key = imageData.data.slice(i, i + 3).join(',');
      if (key in gradientClassesByRGB) {
        buckets[key] = (buckets[key] || 0) + 1;
      }
    }
    const total = Object.values(buckets).reduce((a, b) => a + b, 0);
    const gradientClasses = Object.keys(gradientClassesByRGB).reduce((acc, cur) => {
      if (buckets[cur]) {
        const fraction = total ? (buckets[cur] / total) : 0;
        acc[gradientClassesByRGB[cur]] = fraction;
      }
      return acc;
    }, {});
    gradients.forEach((a) => {
      const fraction = gradientClasses[a.label];
      a.inSchlag = fraction !== undefined;
      a.fraction = fraction === undefined ? 0 : fraction;
    });
    onRenderComplete = undefined;
  };

  const resolution = 5;
  const extent31287 = transformExtent(schlag.extent, 'EPSG:4326', 'EPSG:31287');
  const extent3857 = transformExtent(schlag.extent, 'EPSG:4326', 'EPSG:3857');
  const tileZoom = schlagTileGrid.getZForResolution(resolution);
  const tileFetchPromises = [];
  const tileExtents = [];
  schlagTileGrid.forEachTileCoord(extent3857, tileZoom, (tileCoord) => {
    const url = getSchlagTileUrl(tileCoord);
    tileFetchPromises.push(fetch(url).then((response) => response.arrayBuffer()));
    tileExtents.push(schlagTileGrid.getTileCoordExtent(tileCoord));
  });
  Promise.all(tileFetchPromises).then((tileBuffers) => {
    const features = [];
    tileBuffers.forEach((tileBuffer, i) => {
      const tileFeatures = format.readFeatures(tileBuffer, { extent: tileExtents[i] })
        .filter(filter)
        .map((f) => new Feature(toGeometry(f).transform('EPSG:3857', 'EPSG:4326')));
      features.push(...tileFeatures);
    });
    schlagLayer.setSource(new VectorSource({ features }));

    const width = Math.ceil(getWidth(extent31287) / resolution);
    const height = Math.ceil(getHeight(extent31287) / resolution);
    calculationMap.setSize([width, height]);
    calculationMap.getView().setCenter(getCenter(schlag.extent));
    calculationMap.once('rendercomplete', onRenderComplete);
  }).catch((e) => console.error(e)); // eslint-disable-line no-console
}

watch(schlagInfo, calculateGradientClasses);

export function useGradient() {
  return { gradients };
}
