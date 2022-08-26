import { Map, View } from 'ol';
import { getSource } from 'ol-mapbox-style';
import { getCenter, getHeight, getWidth } from 'ol/extent';
import TileLayer from 'ol/layer/Tile';
import XYZSource from 'ol/source/XYZ';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import MVT from 'ol/format/MVT';
import { Style, Fill } from 'ol/style';
import { reactive, watch } from 'vue';
import { transformExtent } from 'ol/proj';
import { schlagInfo } from './useSchlag';
import { map, mapReady } from './useMap';
import { SCHLAEGE_LAYER } from '../constants';

const aspectClassesByRGB = {
  '255,255,191': 'Neigung 0 - <10%',
  '254,228,160': 'Neigung 10 - <18%',
  '254,201,128': 'Neigung 18 - <25%',
  '253,174,97': 'Neigung 25 - <35%',
  '240,124,74': 'Neigung 35 - <50%',
  '228,75,51': 'Neigung >=50%',
};

/**
 * @typedef Aspect
 * @property {string} label
 * @property {boolean} inSchlag
 * @property {number} fraction
 * @property {boolean} visible
 */

/** @type {Map} */
let calculationMap;

/** @type {Array<Topic>} */
export const aspects = reactive([]);
mapReady.then(() => {
  const { layers } = map.get('mapbox-style');
  aspects.push(...Object.values(layers
    .filter((l) => l.metadata?.group === 'one' && l.type === 'raster')
    .map((l) => l.metadata?.label).reduce((acc, cur) => {
      if (!(cur in acc)) {
        acc[cur] = ({
          label: cur,
          fraction: 0,
          inSchlag: false,
          visible: false,
        });
      }
      return acc;
    }, {})));

  const style = new Style({
    fill: new Fill({ color: 'black' }),
  });
  const source = getSource(map, 'agrargis');
  const calculationLayer = new VectorTileLayer({
    renderMode: 'vector',
    source: new VectorTileSource({
      tileUrlFunction: source.getTileUrlFunction(),
      tileGrid: source.getTileGrid(),
      format: new MVT({ layers: [SCHLAEGE_LAYER] }),
    }),
    style: (feature) => (feature.getId() === schlagInfo.value?.id ? style : undefined),
  });
  const aspectSource = getSource(map, 'neigungsklassen');
  const aspectLayer = new TileLayer({
    source: new XYZSource({
      crossOrigin: 'anonymous',
      interpolate: false,
      transition: 0,
      tileUrlFunction: aspectSource.getTileUrlFunction(),
      tileGrid: aspectSource.getTileGrid(),
    }),
  });
  aspectLayer.on('prerender', (event) => {
    event.context.globalCompositeOperation = 'source-atop';
  });
  aspectLayer.on('postrender', (event) => {
    event.context.globalCompositeOperation = 'source-over';
  });
  calculationMap = new Map({
    target: document.createElement('div'),
    layers: [calculationLayer, aspectLayer],
    controls: [],
    interactions: [],
    pixelRatio: 1,
    view: new View({
      maxResolution: 78271.51696402048,
      zoom: 14,
    }),
  });
});

/** @type {() => void} */
let onRenderComplete;

function calculateAspectClasses() {
  if (!schlagInfo.value || schlagInfo.value.loading) {
    return;
  }
  if (onRenderComplete) {
    calculationMap.un('rendercomplete', onRenderComplete);
  }

  const schlag = schlagInfo.value;

  onRenderComplete = () => {
    const canvas = calculationMap.getTargetElement().querySelector('canvas');
    const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    /*
    const debugCanvas = document.createElement('canvas');
    debugCanvas.width = canvas.width;
    debugCanvas.height = canvas.height;
    const debugContext = debugCanvas.getContext('2d');
    debugContext.putImageData(imageData, 0, 0);
    document.body.appendChild(debugCanvas);
    */
    const buckets = {};
    for (let i = 0, ii = imageData.data.length; i < ii; i += 4) {
      const key = imageData.data.slice(i, i + 3).join(',');
      if (key in aspectClassesByRGB) {
        buckets[key] = (buckets[key] || 0) + 1;
      }
    }
    const total = Object.values(buckets).reduce((a, b) => a + b, 0);
    const aspectClasses = Object.keys(aspectClassesByRGB).reduce((acc, cur) => {
      if (buckets[cur]) {
        const fraction = total ? (buckets[cur] / total) : 0;
        acc[aspectClassesByRGB[cur]] = fraction;
      }
      return acc;
    }, {});
    aspects.forEach((a) => {
      const fraction = aspectClasses[a.label];
      a.inSchlag = fraction !== undefined;
      a.fraction = fraction === undefined ? 0 : fraction;
    });
    onRenderComplete = undefined;
  };

  const resolution = calculationMap.getView().getResolution();
  const extent = transformExtent(schlag.extent, 'EPSG:4326', 'EPSG:3857');
  const width = Math.ceil(getWidth(extent) / resolution);
  const height = Math.ceil(getHeight(extent) / resolution);
  calculationMap.setSize([width, height]);
  calculationMap.getView().setCenter(getCenter(schlag.extent));
  calculationMap.once('rendercomplete', onRenderComplete);
  calculationMap.getLayers().item(0).changed(); // update style
}

watch(schlagInfo, calculateAspectClasses);

export function useAspect() {
  return { aspects };
}
