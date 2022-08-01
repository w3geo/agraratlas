import 'ol/ol.css';
import { Map, View } from 'ol';
import ScaleLine from 'ol/control/ScaleLine';
import Link from 'ol/interaction/Link';
import { Tile as TileLayer } from 'ol/layer';
import { XYZ } from 'ol/source';
import { useGeographic } from 'ol/proj';
import { ref } from 'vue';
import { apply } from 'ol-mapbox-style';
import { getCenter } from 'ol/extent';
import LayerGroup from 'ol/layer/Group';

const extent = [9.33583, 46.08870, 17.42424, 49.36705];

const basemapAttribution = 'Grundkarte: <a href="https://basemap.at/">basemap.at</a>';

const basemap = new TileLayer({
  maxZoom: 16,
  source: new XYZ({
    url: 'https://maps.wien.gv.at/basemap/geolandbasemap/normal/google3857/{z}/{y}/{x}.png',
    maxZoom: 19,
    attributions: [basemapAttribution],
    attributionsCollapsible: false,
  }),
});

const basemapOrtho = new TileLayer({
  minZoom: 16,
  source: new XYZ({
    url: 'https://maps.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/{z}/{y}/{x}.jpeg',
    maxZoom: 19,
    attributions: [basemapAttribution],
    attributionsCollapsible: false,
  }),
});

let map;

function createMap(mapReady) {
  useGeographic();
  map = new Map({
    layers: [
      new LayerGroup({ layers: [basemap, basemapOrtho] }),
    ],
    view: new View({
      maxResolution: 78271.51696402048,
      extent,
      center: getCenter(extent),
      zoom: 0,
    }),
  });
  map.addInteraction(new Link());
  map.addControl(new ScaleLine());
  apply(map, './map/style.json').then(() => {
    mapReady.value = true;
  });
}

/**
 * @returns {{map: Map, mapReady: import("vue").Ref<boolean>}}
 */
export default function useMap() {
  const mapReady = ref(!!map);
  if (!map) {
    createMap(mapReady);
  }
  return { map, mapReady };
}
