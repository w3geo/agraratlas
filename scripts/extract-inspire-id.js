import { createReadStream } from 'fs';
import { chain } from 'stream-chain';
import streamJson from 'stream-json';
import Pick from 'stream-json/filters/Pick.js';
import StreamArray from 'stream-json/streamers/StreamArray.js';

const { parser } = streamJson;
const { pick } = Pick;
const { streamArray } = StreamArray;

/**
 * Extracts the inspire_id template from the first feature in a GeoJSON file
 * @param {string} filePath - Path to the GeoJSON file
 * @returns {Promise<string>} The inspire_id template with {localID} placeholder
 */
export async function extractInspireIdTemplate(filePath) {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const pipeline = chain([
      createReadStream(filePath),
      parser(),
      pick({ filter: 'features' }),
      streamArray(),
    ]);

    pipeline.on('data', ({ value }) => {
      if (!resolved && value.properties && value.properties.inspire_id) {
        const inspireIdParts = value.properties.inspire_id.split('/');
        const localID = inspireIdParts[inspireIdParts.length - 2];
        inspireIdParts[inspireIdParts.length - 2] = '{localID}';
        resolved = true;
        resolve({
          template: inspireIdParts.join('/'),
          localID,
        });
        pipeline.destroy();
      }
    });

    pipeline.on('end', () => {
      if (!resolved) {
        reject(new Error('No features with inspire_id found'));
      }
    });

    pipeline.on('error', (err) => {
      reject(err);
    });
  });
}
