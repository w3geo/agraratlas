import 'ol/ol.css';
import { Map, View } from 'ol';
import { Control, defaults } from 'ol/control';
import ScaleLine from 'ol/control/ScaleLine';
import Link from 'ol/interaction/Link';
import { useGeographic } from 'ol/proj';
import { apply, getSource, renderTransparent } from 'ol-mapbox-style';
import { getCenter } from 'ol/extent';
import { ref } from 'vue';

export const mapLoading = ref(false);

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
map.on('loadstart', () => { mapLoading.value = true; });
map.on('loadend', () => { mapLoading.value = false; });

export const mapReady = apply(map, './map/style.json').then(() => {
  map.get('mapbox-style').layers.forEach((layer) => {
    if (layer.metadata?.group === 'base') {
      getSource(map, layer.source).tileOptions.transition = undefined;
    }
  });
});

/**
 * @returns {{ map: Map, mapReady: Promise<void> }}
 */
export function useMap() {
  return { map, mapReady, mapLoading };
}
