import 'ol/ol.css';
import { Map, View, Feature } from 'ol';
import { Point } from 'ol/geom';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { OSM, Vector as VectorSource } from 'ol/source';
import { useGeographic } from 'ol/proj';

let map;

function createMap() {
  useGeographic();
  map = new Map({
    layers: [
      new TileLayer({
        source: new OSM(),
      }),
      new VectorLayer({
        source: new VectorSource({
          features: [
            new Feature({
              geometry: new Point([0, 0]),
            }),
          ],
        }),
      }),
    ],
    view: new View({
      center: [0, 0],
      zoom: 2,
    }),
  });
}

export default () => {
  if (!map) {
    createMap();
  }
  return { map };
};
