import { createReadStream, createWriteStream, existsSync } from 'fs';
import esMain from 'es-main';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { chain } from 'stream-chain';
import streamJson from 'stream-json';
import Pick from 'stream-json/filters/Pick.js';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import { Writable } from 'stream';

const { parser } = streamJson;
const { pick } = Pick;
const { streamArray } = StreamArray;

const { argv } = yargs(hideBin(process.argv))
  .option('infile', {
    alias: 'i',
    type: 'string',
    description: 'Input JSON file',
    demandOption: true,
  })
  .option('outfile', {
    alias: 'o',
    type: 'string',
    description: 'Output JSON file',
    demandOption: true,
  })
  .help();

const { infile } = argv;
const { outfile } = argv;

const main = () => {
  if (!existsSync(infile)) {
    console.error(`Input file ${infile} does not exist.`); // eslint-disable-line no-console
    process.exit(1);
  }

  const outputStream = createWriteStream(outfile);
  outputStream.write('{"type": "FeatureCollection","features":[');

  let isFirst = true;

  const pipeline = chain([
    createReadStream(infile),
    parser(),
    pick({ filter: 'features' }),
    streamArray(),
    new Writable({
      objectMode: true,
      write({ value }, encoding, callback) {
        const inspireIdParts = value.properties.inspire_id.split('/');
        const localID = inspireIdParts[inspireIdParts.length - 2];
        if (isFirst) {
          inspireIdParts[inspireIdParts.length - 2] = '{localID}';
          console.log(`${infile} inspire_id:`, inspireIdParts.join('/')); // eslint-disable-line no-console
        }

        value.properties.localID = localID;
        delete value.properties.inspire_id;
        if (!isFirst) {
          outputStream.write(',\n');
        }
        isFirst = false;
        outputStream.write(JSON.stringify(value));
        callback();
      },
    }),
  ]);

  pipeline.on('end', () => {
    outputStream.write(']}');
    outputStream.end();
  });

  pipeline.on('error', (err) => {
    console.error('Pipeline failed.', err); // eslint-disable-line no-console
    process.exit(1);
  });
};

export default main;

if (esMain(import.meta)) {
  main();
}
