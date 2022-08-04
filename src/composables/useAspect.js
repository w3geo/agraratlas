import { Map, View } from 'ol';
import { getSource } from 'ol-mapbox-style';
import { getCenter, getHeight, getWidth } from 'ol/extent';
import TileLayer from 'ol/layer/Tile';
import XYZSource from 'ol/source/XYZ';
import VectorTileLayer from 'ol/layer/VectorTile';
import { Style, Fill } from 'ol/style';
import { ref, watch } from 'vue';
import { toLonLat } from 'ol/proj';
import useLayers from './useLayers';
import useMap from './useMap';

const aspectClassesByRGB = {
  '255,255,191': 'Hangneigung 0 - <10%',
  '254,228,160': 'Hangneigung 10 - <15%',
  '254,201,128': 'Hangneigung 15 - <18%',
  '253,174,97': 'Hangneigung 18 - <25%',
  '240,124,74': 'Hangneigung 25 - <35%',
  '227,75,51': 'Hangneigung 35 - <50%',
  '215,25,28': 'Hangneigung >=50%',
};

/** @type {import('vue').Ref<Object<string, number>>} */
let aspectClasses;

/** @type {import('vue').Ref<string>} */
const aspectClass = ref();

const { map, mapReady } = useMap();
const { schlagInfo } = useLayers();
const style = new Style({
  fill: new Fill({ color: 'black' }),
});

/** @type {Map} */
let calculationMap;
/** @type {VectorTileLayer} */
let calculationLayer;
function createCalculationMap() {
  calculationLayer = new VectorTileLayer({
    source: getSource(map, 'agrargis'),
    style: (feature) => (feature.getId() === schlagInfo.value.id ? style : undefined),
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
    layers: [calculationLayer, aspectLayer],
    controls: [],
    interactions: [],
    pixelRatio: 1,
    view: new View({ zoom: 17 }),
  });
}

const unwatch = watch(mapReady, () => {
  createCalculationMap();
  unwatch();
});

function calculateAspectClasses() {
  calculationLayer.changed(); // update style
  calculationMap.getView().setCenter(toLonLat(getCenter(schlagInfo.value.extent)));

  const width = Math.ceil(getWidth(schlagInfo.value.extent));
  const height = Math.ceil(getHeight(schlagInfo.value.extent));
  const target = document.createElement('div');
  calculationMap.setTarget(target);
  calculationMap.setSize([width, height]);

  calculationMap.once('rendercomplete', () => {
    const canvas = target.querySelector('canvas');
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
        a[aspectClassesByRGB[b]] = buckets[b] / total;
      }
      return a;
    }, {}) : {};
  });
}

export default function useAspect() {
  if (!aspectClasses) {
    aspectClasses = ref([]);
    watch(schlagInfo, (value, oldValue) => {
      if (value && value.id !== oldValue?.id) {
        calculateAspectClasses();
      }
    });
  }
  return { aspectClasses, aspectClass };
}
