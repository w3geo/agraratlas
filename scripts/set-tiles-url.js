import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import esMain from 'es-main';

const __dirname = new URL('.', import.meta.url).pathname;

const main = () => {
  if (!process.env.TILES_URL) {
    return;
  }

  const styleFile = join('__dirname', '..', 'dist', 'map', 'style.json');
  const style = JSON.parse(readFileSync(styleFile, 'utf8'));
  if (style.sources.agrargis) {
    style.sources.agrargis.url = process.env.TILES_URL;
  }
  writeFileSync(styleFile, JSON.stringify(style, null, 2), 'utf8');
};

export default main;

if (esMain(import.meta)) {
  main();
}
