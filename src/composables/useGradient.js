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

const gradientClassesByRGB = {
  '255,255,191': '0 - <10%',
  '254,228,160': '10 - <18%',
  '254,201,128': '18 - <25%',
  '253,174,97': '25 - <35%',
  '240,124,74': '35 - <50%',
  '228,75,51': '>=50%',
};

/**
 * @typedef Gradient
 * @property {string} label
 * @property {string} color
 * @property {boolean} inSchlag
 * @property {number} fraction
 * @property {boolean} visible
 */

/** @type {Map} */
let calculationMap;

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
  const gradientSource = getSource(map, 'neigungsklassen');
  const gradientLayer = new TileLayer({
    source: new XYZSource({
      crossOrigin: 'anonymous',
      interpolate: false,
      transition: 0,
      tileUrlFunction: gradientSource.getTileUrlFunction(),
      tileGrid: gradientSource.getTileGrid(),
    }),
  });
  gradientLayer.on('prerender', (event) => {
    event.context.globalCompositeOperation = 'source-atop';
  });
  gradientLayer.on('postrender', (event) => {
    event.context.globalCompositeOperation = 'source-over';
  });
  calculationMap = new Map({
    target: document.createElement('div'),
    layers: [calculationLayer, gradientLayer],
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

function calculateGradientClasses() {
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

  const resolution = calculationMap.getView().getResolution();
  const extent = transformExtent(schlag.extent, 'EPSG:4326', 'EPSG:3857');
  const width = Math.ceil(getWidth(extent) / resolution);
  const height = Math.ceil(getHeight(extent) / resolution);
  calculationMap.setSize([width, height]);
  calculationMap.getView().setCenter(getCenter(schlag.extent));
  calculationMap.once('rendercomplete', onRenderComplete);
  calculationMap.getLayers().item(0).changed(); // update style
}

watch(schlagInfo, calculateGradientClasses);

export function useGradient() {
  return { gradients };
}
