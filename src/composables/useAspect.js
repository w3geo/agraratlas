import { Map, View } from 'ol';
import { getSource } from 'ol-mapbox-style';
import { getCenter, getHeight, getWidth } from 'ol/extent';
import TileLayer from 'ol/layer/Tile';
import XYZSource from 'ol/source/XYZ';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import MVT from 'ol/format/MVT';
import { Style, Fill } from 'ol/style';
import { ref, watch } from 'vue';
import { transformExtent } from 'ol/proj';
import { schlagInfo } from './useSchlag';
import { map, mapReady } from './useMap';

const aspectClassesByRGB = {
  '255,255,191': 'Neigung 0 - <10%',
  '254,228,160': 'Neigung 10 - <15%',
  '254,201,128': 'Neigung 15 - <18%',
  '253,174,97': 'Neigung 18 - <25%',
  '240,124,74': 'Neigung 25 - <35%',
  '227,75,51': 'Neigung 35 - <50%',
  '215,25,28': 'Neigung >=50%',
};

/** @type {import('vue').Ref<Object<string, number>>} */
const aspectClasses = ref({});

/** @type {Map} */
let calculationMap;

mapReady.then(() => {
  const style = new Style({
    fill: new Fill({ color: 'black' }),
  });
  const source = getSource(map, 'agrargis');
  const calculationLayer = new VectorTileLayer({
    renderMode: 'vector',
    source: new VectorTileSource({
      tileUrlFunction: source.getTileUrlFunction(),
      tileGrid: source.getTileGrid(),
      format: new MVT({ layers: ['invekos_schlaege_2022_polygon'] }),
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
  aspectClasses.value = {};

  const schlag = schlagInfo.value;

  onRenderComplete = () => {
    const canvas = calculationMap.getTargetElement().querySelector('canvas');
    const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    const buckets = {};
    for (let i = 0, ii = imageData.data.length; i < ii; i += 4) {
      const key = imageData.data.slice(i, i + 3).join(',');
      if (key in aspectClassesByRGB) {
        buckets[key] = (buckets[key] || 0) + 1;
      }
    }
    const total = Object.values(buckets).reduce((a, b) => a + b, 0);
    aspectClasses.value = total ? Object.keys(aspectClassesByRGB).reduce((a, b) => {
      if (buckets[b]) {
        const area = (buckets[b] / total) * schlag.sl_flaeche_brutto_ha;
        if (area >= 0.01) {
          a[aspectClassesByRGB[b]] = area;
        }
      }
      return a;
    }, {}) : {};
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

/**
 * @returns {{
 *   aspectClasses: import('vue').Ref<Object<string, number>>
 * }}
 */
export function useAspect() {
  return { aspectClasses };
}
