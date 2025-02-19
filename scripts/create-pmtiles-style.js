import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import esMain from 'es-main';

const __dirname = new URL('.', import.meta.url).pathname;

const main = () => {
  const path = join(__dirname, '..', 'dist', 'map');
  const styleFile = join(path, 'style.json');
  const appStyleFile = join(path, 'style-pmtiles.json');
  const style = JSON.parse(readFileSync(styleFile, 'utf8'));
  if (style.sources.agrargis) {
    style.sources.agrargis.url = process.env.TILEJSON_URL || 'pmtiles://map/tiles/agraratlas.pmtiles';
  }
  writeFileSync(appStyleFile, JSON.stringify(style, null, 2), 'utf8');
};

export default main;

if (esMain(import.meta)) {
  main();
}
