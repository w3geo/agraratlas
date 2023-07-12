import { getSource } from 'ol-mapbox-style';
import { ref, watch } from 'vue';
import { getPointResolution, transformExtent } from 'ol/proj';
import { MVT } from 'ol/format';
import { Map, View } from 'ol';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import { Style, Fill } from 'ol/style';
import {
  getBottomLeft, getCenter, getHeight, getTopRight, getWidth,
} from 'ol/extent';
import { map, mapReady } from './useMap';
import { topics } from './useTopics';
import { schlagInfo } from './useSchlag';
import { SCHLAEGE_LAYER } from '../constants';

/** @type {import("vue").Ref<number>} */
export const heavySoilHectars = ref(0);

const blackFill = new Style({
  fill: new Fill({
    color: 'black',
  }),
});
const soilLayer = new VectorTileLayer({
  renderMode: 'vector',
  style(feature) {
    return feature.get('layer') === 'schwerer_boden' ? blackFill : null;
  },
});
let soilImageData;
soilLayer.on('postrender', (e) => {
  soilImageData = e.context
    .getImageData(0, 0, e.context.canvas.width, e.context.canvas.height).data;
  e.context.clearRect(0, 0, e.context.canvas.width, e.context.canvas.height);
});
const schlagLayer = new VectorTileLayer({
  renderMode: 'vector',
  style(feature) {
    return feature.get('layer') === SCHLAEGE_LAYER && feature.getId() === schlagInfo.value?.id ? blackFill : null;
  },
});
let schlagImageData;
schlagLayer.on('postrender', (e) => {
  schlagImageData = e.context
    .getImageData(0, 0, e.context.canvas.width, e.context.canvas.height).data;
});

const resolution = 5;

const soilMap = new Map({
  pixelRatio: 1,
  controls: [],
  interactions: [],
  target: document.createElement('div'),
  layers: [soilLayer, schlagLayer],
  view: new View({
    resolutions: [resolution],
  }),
});

async function calculateHeavySoilArea() {
  schlagLayer.changed();
  heavySoilHectars.value = 0;
  if (!topics.find((t) => t.id === 'schwerer_boden')?.visible) {
    return;
  }
  if (!schlagInfo.value || schlagInfo.value.loading) {
    return;
  }

  const extent = transformExtent(schlagInfo.value.extent, 'EPSG:4326', 'EPSG:3857');
  const bl = getBottomLeft(extent).map((x) => Math.floor(x / resolution) * resolution);
  const tr = getTopRight(extent).map((y) => Math.ceil(y / resolution) * resolution);
  const adjustedExtent = [...bl, ...tr];
  soilMap.setSize([
    Math.ceil(getWidth(adjustedExtent) / resolution),
    Math.ceil(getHeight(adjustedExtent) / resolution),
  ]);
  soilMap.once('rendercomplete', () => {
    const pixelResolution = resolution * getPointResolution('EPSG:3857', 1, getCenter(adjustedExtent));
    let schlagArea = 0;
    let heavySoilArea = 0;
    for (let i = 0, ii = schlagImageData.length; i < ii; i += 4) {
      const schlagAlpha = schlagImageData[i + 3];
      const soilAlpha = soilImageData[i + 3];
      if (schlagAlpha > 0) {
        schlagArea += pixelResolution * pixelResolution * (schlagAlpha / 255);
        if (soilAlpha > 0) {
          heavySoilArea += pixelResolution * pixelResolution
            * (Math.min(schlagAlpha, soilAlpha) / 255);
        }
      }
    }
    const calibrationFactor = (schlagInfo.value.sl_flaeche_brutto_ha * 10000) / schlagArea;
    heavySoilHectars.value = (heavySoilArea * calibrationFactor) / 10000;
  });
  soilMap.getView().fit(transformExtent(adjustedExtent, 'EPSG:3857', 'EPSG:4326'));
}

mapReady.then(() => {
  const templateSource = getSource(map, 'agrargis');
  const source = new VectorTileSource({
    format: new MVT({
      layers: ['schwerer_boden', SCHLAEGE_LAYER],
    }),
    minZoom: 15,
    maxZoom: 15,
    tileUrlFunction: templateSource.getTileUrlFunction(),
  });
  soilLayer.setSource(source);
  schlagLayer.setSource(source);
});

watch([schlagInfo, topics], calculateHeavySoilArea);

export function useHeavySoil() {
  return { heavySoilHectars };
}
