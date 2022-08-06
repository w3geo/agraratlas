import 'ol/ol.css';
import { Map, View } from 'ol';
import { defaults } from 'ol/control';
import ScaleLine from 'ol/control/ScaleLine';
import Link from 'ol/interaction/Link';
import { useGeographic } from 'ol/proj';
import { apply, renderTransparent } from 'ol-mapbox-style';
import { getCenter } from 'ol/extent';

renderTransparent(true);

const initialExtent = [9.33583, 46.08870, 17.42424, 49.36705];

useGeographic();

const map = new Map({
  controls: defaults({ attributionOptions: { collapsible: false } }),
  view: new View({
    maxResolution: 78271.51696402048,
    extent: initialExtent,
    center: getCenter(initialExtent),
    zoom: 0,
  }),
});
map.addInteraction(new Link());
map.addControl(new ScaleLine());

const mapReady = apply(map, './map/style.json').then(() => {
  map.getLayers().getArray().forEach((layer) => {
    layer.getSource().tileOptions.transition = undefined;
  });
});

/**
 * @returns {{ map: Map, mapReady: Promise<void> }}
 */
export function useMap() {
  return { map, mapReady };
}
