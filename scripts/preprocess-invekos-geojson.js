import { createReadStream, createWriteStream, existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import { createInterface } from 'readline';
import esMain from 'es-main';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const { argv } = yargs(hideBin(process.argv))
  .option('infile', {
    alias: 'i',
    type: 'string',
    description: 'Input GeoJSON file',
    demandOption: true,
  })
  .option('outfile', {
    alias: 'o',
    type: 'string',
    description: 'Output GeoJSON file',
    demandOption: true,
  })
  .option('index', {
    type: 'string',
    description: 'Optional output binary file for the localID bbox index',
  })
  .help();

const { infile, outfile, index } = argv;

// Each feature is written on its own line by the upstream SQL export, and the
// "geometry" property (with its "coordinates" array) is always the last
// property of the feature object. Coordinates arrays never contain "}", so we
// can locate them cheaply with a bounded regex instead of a full JSON parse,
// which is far too slow/memory-hungry for multi-gigabyte polygon files.
const INSPIRE_ID_REGEX = /"inspire_id"\s*:\s*"([^"]+)"/;
const COORDINATES_REGEX = /"coordinates"\s*:\s*(\[[^}]*\])\s*\}\s*\}/;
const NUMBER_REGEX = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

function getLocalIDFromInspireId(inspireId) {
  if (typeof inspireId !== 'string') return null;

  const parts = inspireId.split('/');
  if (parts.length < 2) return null;

  return parts[parts.length - 2] || null;
}

function computeBBoxFromCoordinatesText(coordinatesText) {
  const numbers = coordinatesText.match(NUMBER_REGEX);
  if (!numbers) return null;

  const bbox = [Infinity, Infinity, -Infinity, -Infinity];

  numbers.forEach((numberText, coordinateIndex) => {
    const value = Number(numberText);
    if (coordinateIndex % 2 === 0) {
      if (value < bbox[0]) bbox[0] = value;
      if (value > bbox[2]) bbox[2] = value;
    } else {
      if (value < bbox[1]) bbox[1] = value;
      if (value > bbox[3]) bbox[3] = value;
    }
  });

  if (!Number.isFinite(bbox[0])) return null;

  return bbox;
}

function processLine(line, indexEntries) {
  const inspireMatch = line.match(INSPIRE_ID_REGEX);
  if (!inspireMatch) return line;

  const localID = getLocalIDFromInspireId(inspireMatch[1]);
  const transformedLine = line.replace(INSPIRE_ID_REGEX, `"localID": "${localID}"`);

  if (indexEntries && localID) {
    const coordinatesMatch = line.match(COORDINATES_REGEX);
    if (coordinatesMatch) {
      const bbox = computeBBoxFromCoordinatesText(coordinatesMatch[1]);
      if (bbox) {
        indexEntries[localID] = bbox;
      }
    }
  }

  return transformedLine;
}

// Binary layout (little-endian), sorted ascending by localID for binary search:
//   uint32            count
//   uint32[count]     localIDs
//   float32[count*4]  bboxes (minX, minY, maxX, maxY) in the same order
// localIDs must fit in a Uint32; entries that don't are skipped with a warning.
// Bboxes are stored as float32 (rounded to nearest), which is accurate to
// ~0.3m at these coordinate magnitudes.
function encodeIndex(indexEntries) {
  const entries = [];
  const skipped = [];
  Object.keys(indexEntries).forEach((key) => {
    const localID = Number(key);
    if (!Number.isInteger(localID) || localID < 0 || localID > 0xffffffff) {
      skipped.push(key);
      return;
    }
    entries.push([localID, indexEntries[key]]);
  });
  if (skipped.length > 0) {
    const examples = skipped.slice(0, 5).join(', ');
    console.warn(`Skipped ${skipped.length} localID(s) that do not fit in a Uint32 (e.g. ${examples})`); // eslint-disable-line no-console
  }
  entries.sort((a, b) => a[0] - b[0]);

  const count = entries.length;
  const buffer = new ArrayBuffer(4 + count * 4 + count * 16);
  new Uint32Array(buffer, 0, 1)[0] = count;
  const localIDs = new Uint32Array(buffer, 4, count);
  const bboxes = new Float32Array(buffer, 4 + count * 4, count * 4);
  entries.forEach(([localID, bbox], i) => {
    localIDs[i] = localID;
    bboxes.set(bbox, i * 4);
  });

  return Buffer.from(buffer);
}

async function processFile(inputFile, outputFile, indexFile) {
  const indexEntries = indexFile ? {} : null;
  const readStream = createReadStream(inputFile, { encoding: 'utf8' });
  const writeStream = createWriteStream(outputFile);
  const rl = createInterface({ input: readStream, crlfDelay: Infinity });

  let featureCount = 0;
  let waitingForDrain = false;

  await new Promise((resolve, reject) => {
    rl.on('line', (line) => {
      const outputLine = processLine(line, indexEntries);

      featureCount += 1;
      if (featureCount % 200000 === 0) {
        console.log(`${inputFile}: processed ${featureCount} lines`); // eslint-disable-line no-console
      }

      const canContinue = writeStream.write(`${outputLine}\n`);
      if (!canContinue && !waitingForDrain) {
        waitingForDrain = true;
        rl.pause();
        writeStream.once('drain', () => {
          waitingForDrain = false;
          rl.resume();
        });
      }
    });

    rl.on('close', () => {
      writeStream.end((err) => (err ? reject(err) : resolve()));
    });

    rl.on('error', reject);
    writeStream.on('error', reject);
  });

  if (indexFile) {
    await writeFile(indexFile, encodeIndex(indexEntries));
  }
}

async function main() {
  if (!existsSync(infile)) {
    console.error(`Input file ${infile} does not exist.`); // eslint-disable-line no-console
    process.exit(1);
  }

  try {
    await processFile(infile, outfile, index);
    if (index) {
      console.log(`Successfully wrote index ${index}`); // eslint-disable-line no-console
    }
    console.log(`Successfully converted ${infile} -> ${outfile}`); // eslint-disable-line no-console
  } catch (err) {
    console.error('Failed to process output files.', err); // eslint-disable-line no-console
    process.exit(1);
  }
}

export default main;

if (esMain(import.meta)) {
  main();
}
