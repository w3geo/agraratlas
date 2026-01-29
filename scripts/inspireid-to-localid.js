import { createReadStream, createWriteStream, existsSync } from 'fs';
import { Transform } from 'stream';
import esMain from 'es-main';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { extractInspireIdTemplate } from './extract-inspire-id.js';

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

class RegexTransform extends Transform {
  constructor() {
    super();
    this.tail = '';
    // Match "inspire_id": "url"
    // Capture group 1 is the URL
    this.regex = /"inspire_id"\s*:\s*"([^"]+)"/g;
  }

  _transform(chunk, encoding, callback) {
    const data = this.tail + chunk.toString();

    // Ensure we don't process the very end of the string if it looks like it could be
    // the start of our pattern by using a safe cut-off index.
    const safeEndInfo = this.findSafeEnd(data);
    const textToProcess = data.slice(0, safeEndInfo);
    this.tail = data.slice(safeEndInfo);

    const processed = textToProcess.replace(this.regex, (match, url) => {
      const parts = url.split('/');
      // The localID is usually the second to last part
      // e.g. .../elu.ExistingLandUseObject/123456/MFA-2025
      const localID = parts[parts.length - 2];
      return `"localID": "${localID}"`;
    });

    this.push(processed);
    callback();
  }

  // eslint-disable-next-line class-methods-use-this
  findSafeEnd(data) {
    const tailLength = 1000;
    if (data.length <= tailLength) return 0; // Too short to process safely, keep all as tail
    return data.length - tailLength;
  }

  _flush(callback) {
    // Process the remaining tail
    if (this.tail) {
      const processed = this.tail.replace(this.regex, (match, url) => {
        const parts = url.split('/');
        const localID = parts[parts.length - 2];
        return `"localID": "${localID}"`;
      });
      this.push(processed);
    }
    callback();
  }
}

const main = async () => {
  if (!existsSync(infile)) {
    console.error(`Input file ${infile} does not exist.`); // eslint-disable-line no-console
    process.exit(1);
  }

  // Extract and log the inspire_id template
  try {
    const { template } = await extractInspireIdTemplate(infile);
    console.log(`${infile} inspire_id:`, template); // eslint-disable-line no-console
  } catch (err) {
    console.error(`Failed to extract inspire_id template from ${infile}:`, err.message); // eslint-disable-line no-console
    process.exit(1);
  }

  const readStream = createReadStream(infile);
  const writeStream = createWriteStream(outfile);

  const transform = new RegexTransform();

  readStream
    .pipe(transform)
    .pipe(writeStream)
    .on('finish', () => {
      console.log(`Successfully converted ${infile} -> ${outfile}`); // eslint-disable-line no-console
    })
    .on('error', (err) => {
      console.error('Pipeline failed.', err); // eslint-disable-line no-console
      process.exit(1);
    });
};

export default main;

if (esMain(import.meta)) {
  main();
}
