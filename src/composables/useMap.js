import 'ol/ol.css';
import { Map, View } from 'ol';
import { Control, defaults } from 'ol/control';
import ScaleLine from 'ol/control/ScaleLine';
import Link from 'ol/interaction/Link';
import { useGeographic } from 'ol/proj';
import {
  apply, applyStyle, getSource, renderTransparent,
} from 'ol-mapbox-style';
import { getCenter } from 'ol/extent';
import { ref } from 'vue';
import VectorTileLayer from 'ol/layer/VectorTile';

/**
 * @typedef {Object} MapView
 * @property {number} zoom
 * @property {import("ol/coordinate").Coordinate} center
 */

/**
 * @type {import('vue').Ref<MapView>}
 */
export const mapView = ref({ zoom: 0, center: [0, 0] });

renderTransparent(true);

const initialExtent = [9.33583, 46.08870, 17.42424, 49.36705];

useGeographic();

export const map = new Map({
  controls: defaults({ attributionOptions: { collapsible: false } }),
  view: new View({
    maxResolution: 78271.51696402048,
    extent: initialExtent,
    center: getCenter(initialExtent),
    zoom: 0,
  }),
});
const gps = document.createElement('div');
gps.title = 'Auf meinen Standort zentrieren';
gps.className = 'ol-control ol-unselectable ol-gps';
gps.innerHTML = '<button><i class="mdi mdi-crosshairs-gps"></i></button>';
gps.addEventListener('click', () => {
  navigator.geolocation.getCurrentPosition((position) => map.getView().animate({
    center: [position.coords.longitude, position.coords.latitude],
    zoom: 18,
  }));
});
map.addControl(new Control({
  element: gps,
}));
map.addControl(new ScaleLine());
map.addInteraction(new Link());
map.on('moveend', () => {
  const view = map.getView();
  mapView.value = {
    zoom: view.getZoom(),
    center: view.getCenter(),
    extent: view.calculateExtent(),
  };
});

export const mapReady = apply(map, './map/style.json').then(() => {
  const { layers, sources } = map.get('mapbox-style');
  layers.forEach((layer) => {
    if (layer.metadata?.group === 'base') {
      getSource(map, layer.source).tileOptions.transition = undefined;
    }
  });
  Object.keys(sources).forEach((source) => {
    if (source.startsWith('neigungsklassen')) {
      getSource(map, source).interpolate_ = false; // eslint-disable-line
    }
  });
});

/**
 * @type {Promise<import("ol/style/Style.js").StyleFunction>}
 */
export const filterStyle = mapReady.then(async () => {
  const style = JSON.parse(JSON.stringify(map.get('mapbox-style')));
  style.layers.forEach((l) => {
    if (l.metadata?.group === 'any') {
      l.layout = { ...l.layout, visibility: 'none' };
    } else if (l.metadata?.group === 'one') {
      l.layout = { ...l.layout, visibility: 'visible' };
    } else {
      l.layout = { ...l.layout, visibility: 'none' };
    }
  });
  const filterLayer = new VectorTileLayer();
  await applyStyle(filterLayer, style, 'agrargis', './map/style.json');
  return filterLayer.getStyle();
});

/**
 * @returns {{ map: Map, mapReady: Promise<void> }}
 */
export function useMap() {
  return { map, mapReady, mapView };
}
