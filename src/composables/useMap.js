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
import { shallowRef } from 'vue';
import VectorTileLayer from 'ol/layer/VectorTile';
import { INITIAL_EXTENT } from '../constants';

/**
 * @typedef {Object} MapView
 * @property {number} zoom
 * @property {import("ol/coordinate").Coordinate} center
 */

/**
 * @type {import('vue').ShallowRef<MapView>}
 */
export const mapView = shallowRef({});

renderTransparent(true);

useGeographic();

export const map = new Map({
  controls: defaults({ attributionOptions: { collapsible: false } }),
  view: new View({
    maxResolution: 78271.51696402048,
    extent: INITIAL_EXTENT,
    showFullExtent: true,
    center: getCenter(INITIAL_EXTENT),
    zoom: 0,
  }),
  moveTolerance: 3,
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
map.addInteraction(new Link({ params: ['x', 'y', 'z', 'r'] }));
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
  getSource(map, 'agrargis').overlaps_ = false; // eslint-disable-line
});

/**
 * @type {Promise<import("ol/style/Style.js").StyleFunction>}
 */
export const filterStyle = mapReady.then(async () => {
  const style = JSON.parse(JSON.stringify(map.get('mapbox-style')));
  style.layers.forEach((l) => {
    if (l.metadata?.group === 'one') {
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
