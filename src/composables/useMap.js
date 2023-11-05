import 'ol/ol.css';
import { Map, View } from 'ol';
import { Control, defaults } from 'ol/control';
import ScaleLine from 'ol/control/ScaleLine';
import Link from 'ol/interaction/Link';
import { useGeographic } from 'ol/proj';
import {
  apply, applyStyle, getLayer, getSource, renderTransparent,
  MapboxVectorLayer,
} from 'ol-mapbox-style';
import { getCenter } from 'ol/extent';
import { shallowRef } from 'vue';
import VectorTileLayer from 'ol/layer/VectorTile';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
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
proj4.defs('EPSG:31287', '+proj=lcc +lat_0=47.5 +lon_0=13.3333333333333 +lat_1=49 +lat_2=46 +x_0=400000 +y_0=400000 +ellps=bessel +towgs84=577.326,90.129,463.919,5.137,1.474,5.297,2.4232 +units=m +no_defs +type=crs');
register(proj4);

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

map.addLayer(new MapboxVectorLayer({
  declutter: true,
  visible: false,
  minZoom: 14,
  styleUrl: 'https://kataster.bev.gv.at/styles/kataster/style_basic.json',
}));

export const mapReady = apply(map, './map/style.json').then(() => {
  const { layers } = map.get('mapbox-style');
  layers.forEach((layer) => {
    getSource(map, layer.source).tileOptions.transition = undefined;
  });
  getLayer(map, 'neigungsklassen').setSource(null);
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
