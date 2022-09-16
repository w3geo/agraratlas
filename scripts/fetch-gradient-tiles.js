/* eslint-disable import/extensions */
import { createXYZ } from 'ol/tilegrid.js';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { transformExtent } from 'ol/proj.js';
import { INITIAL_EXTENT } from '../src/constants.js';

const urlTemplate = 'https://inspire.lfrz.gv.at/000504/ows?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=bdfl_6_{layer}&STYLES=&WIDTH=512&HEIGHT=512&SRS=EPSG:3857&BBOX={bbox-epsg-3857}';
const layers = ['neigungsklassen', 'neigungsklassen_1', 'neigungsklassen_2', 'neigungsklassen_3', 'neigungsklassen_4', 'neigungsklassen_5', 'neigungsklassen_6'];
const extent = transformExtent(INITIAL_EXTENT, 'EPSG:4326', 'EPSG:3857');

(async () => {
  const urlTemplates = layers.map((key) => urlTemplate.replace('{layer}', key));

  const tilegrid = createXYZ({ tileSize: 512 });
  for (let z = 9; z <= 14; z += 1) {
    const range = tilegrid.getTileRangeForExtentAndZ(extent, z);
    for (let x = range.minX; x <= range.maxX; x += 1) {
      const dirname = `./public/map/tiles/${z}/${x}/`;
      for (let y = range.minY; y <= range.maxY; y += 1) {
        if (!existsSync(dirname)) {
          mkdirSync(dirname, { recursive: true });
        }
        const promises = [];
        for (let i = 0, ii = urlTemplates.length; i < ii; i += 1) {
          const filename = `${dirname}${y}-${layers[i]}.png`;
          if (existsSync(filename)) {
            continue;
          }
          const url = urlTemplates[i]
            .replace('{bbox-epsg-3857}', tilegrid.getTileCoordExtent([z, x, y]).join(','));
          promises.push(
            fetch(url).then((response) => response.arrayBuffer()).then((arrayBuffer) => {
              writeFileSync(filename, Buffer.from(arrayBuffer));
              console.log(filename); // eslint-disable-line no-console
            }).catch((e) => console.log(e.message)), // eslint-disable-line no-console
          );
          await Promise.all(promises); // eslint-disable-line no-await-in-loop
        }
      }
    }
  }
})();
