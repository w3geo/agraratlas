import {
  readdir, readFile, writeFile, stat,
} from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import esMain from 'es-main';
import { extractInspireIdTemplate } from './extract-inspire-id.js';

const DATA_DIR = 'data';
const PACKAGE_JSON = 'package.json';
const STYLE_JSON = 'public/map/style.json';

/**
 * Parse filename to extract year and revision
 * @param {string} filename - e.g., "invekos_schlaege_2025-2_polygon.geojson"
 * @returns {{year: number, revision: number, type: string} | null}
 */
function parseInvekosFilename(filename) {
  const schlaegMatch = filename.match(/^invekos_schlaege_(\d{4})-(\d)_polygon\.geojson$/);
  if (schlaegMatch) {
    return {
      year: parseInt(schlaegMatch[1], 10),
      revision: parseInt(schlaegMatch[2], 10),
      type: 'schlaege',
    };
  }

  const schlaegeBioMatch = filename.match(/^invekos_schlaege_(\d{4})_bio_polygon\.geojson$/);
  if (schlaegeBioMatch) {
    return {
      year: parseInt(schlaegeBioMatch[1], 10),
      revision: 0,
      type: 'schlaege_bio',
    };
  }

  const hofstellenMatch = filename.match(/^invekos_hofstellen_(\d{4})-(\d)\.geojson$/);
  if (hofstellenMatch) {
    return {
      year: parseInt(hofstellenMatch[1], 10),
      revision: parseInt(hofstellenMatch[2], 10),
      type: 'hofstellen',
    };
  }

  const referenzenPolygonMatch = filename.match(/^invekos_referenzen_(\d{4})-(\d)_polygon\.geojson$/);
  if (referenzenPolygonMatch) {
    return {
      year: parseInt(referenzenPolygonMatch[1], 10),
      revision: parseInt(referenzenPolygonMatch[2], 10),
      type: 'referenzen_polygon',
    };
  }

  const referenzenPointMatch = filename.match(/^invekos_referenzen_(\d{4})-(\d)_point\.geojson$/);
  if (referenzenPointMatch) {
    return {
      year: parseInt(referenzenPointMatch[1], 10),
      revision: parseInt(referenzenPointMatch[2], 10),
      type: 'referenzen_point',
    };
  }

  return null;
}

/**
 * Find the newest file for each type
 * @returns {Promise<{schlaege: string,
 * hofstellen: string, referenzen_polygon: string, referenzen_point: string}>}
 */
async function findNewestInvekosFiles() {
  const files = await readdir(DATA_DIR);
  const parsedFiles = files
    .map((filename) => ({ filename, parsed: parseInvekosFilename(filename) }))
    .filter(({ parsed }) => parsed !== null);

  const newest = {
    schlaege: null,
    hofstellen: null,
    referenzen_polygon: null,
    referenzen_point: null,
    schlaege_bio: null,
  };

  parsedFiles.forEach(({ filename, parsed }) => {
    const key = parsed.type;
    if (
      !newest[key]
      || parsed.year > newest[key].year
      || (parsed.year === newest[key].year && parsed.revision > newest[key].revision)
    ) {
      newest[key] = { filename, ...parsed };
    }
  });

  return newest;
}

/**
 * Update package.json scripts
 */
async function updatePackageJson(
  schlaege,
  hofstellen,
  referenzenPolygon,
  referenzenPoint,
  schlaegeBio,
) {
  const packagePath = PACKAGE_JSON;
  const packageContent = await readFile(packagePath, 'utf-8');
  const packageJson = JSON.parse(packageContent);

  // Update data:vector:prepare script
  packageJson.scripts['data:vector:prepare'] = `node scripts/inspireid-to-localid.js -i data/${schlaege.filename} -o data/invekos_schlaege_polygon.geojson && node scripts/inspireid-to-localid.js -i data/${hofstellen.filename} -o data/invekos_hofstellen.geojson`;

  // Update data:vector:12-14 script
  const script1214 = packageJson.scripts['data:vector:12-14'];
  const updated1214 = script1214
    .replace(
      /invekos_schlaege_\d{4}_bio_polygon\.geojson/g,
      schlaegeBio.filename,
    );
  packageJson.scripts['data:vector:12-14'] = updated1214;

  // Update data:vector:15 script
  const script15 = packageJson.scripts['data:vector:15'];
  const updated15 = script15
    .replace(
      /invekos_referenzen_\d{4}-\d_polygon\.geojson/g,
      referenzenPolygon.filename,
    )
    .replace(
      /invekos_referenzen_\d{4}-\d_point\.geojson/g,
      referenzenPoint.filename,
    )
    .replace(
      /invekos_schlaege_\d{4}_bio_polygon\.geojson/g,
      schlaegeBio.filename,
    );
  packageJson.scripts['data:vector:15'] = updated15;

  await writeFile(packagePath, JSON.stringify(packageJson, null, 2));
  console.log(`✓ Updated ${packagePath}`); // eslint-disable-line no-console
}

/**
 * Update style.json metadata
 */
async function updateStyleJson(schlaege, hofstellen, schlaegeBio) {
  const stylePath = STYLE_JSON;
  const styleContent = await readFile(stylePath, 'utf-8');
  const styleJson = JSON.parse(styleContent);

  // Extract inspire_id templates
  const schlaegePath = join(DATA_DIR, schlaege.filename);
  const hofstellenPath = join(DATA_DIR, hofstellen.filename);

  const schlaegStats = await stat(schlaegePath);
  const hofstellenStats = await stat(hofstellenPath);

  const schlaegTemplate = await extractInspireIdTemplate(schlaegePath);
  const hofstellenTemplate = await extractInspireIdTemplate(hofstellenPath);

  // Update metadata
  styleJson.metadata.sources.invekos_schlaege_polygon = {
    lastModified: schlaegStats.mtime.toISOString(),
    collectionId: `i009501:invekos_schlaege_${schlaege.year}_${schlaege.revision}_polygon`,
    featureUrlTemplate: `https://gis.lfrz.gv.at/api/geodata/i009501/ogc/features/v1/collections/i009501:invekos_schlaege_${schlaege.year}_${schlaege.revision}_polygon/items?filter=inspire_id='${schlaegTemplate.template}'`,
  };

  styleJson.metadata.sources.invekos_hofstellen = {
    lastModified: hofstellenStats.mtime.toISOString(),
    collectionId: `i009501:invekos_hofstellen_${hofstellen.year}_${hofstellen.revision}`,
    featureUrlTemplate: `https://gis.lfrz.gv.at/api/geodata/i009501/ogc/features/v1/collections/i009501:invekos_hofstellen_${hofstellen.year}_${hofstellen.revision}/items?filter=inspire_id='${hofstellenTemplate.template}'`,
  };

  // Update Bio-Schläge label in layers
  const bioLayer = styleJson.layers.find((l) => l.id === 'invekos_schlaege_polygon-bio');
  if (bioLayer && bioLayer.metadata) {
    bioLayer.metadata.label = `ÖPUL Bio-Schläge MFA ${schlaegeBio.year}`;
  }

  await writeFile(stylePath, JSON.stringify(styleJson, null, 2));
  console.log(`✓ Updated ${stylePath}`); // eslint-disable-line no-console
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('Finding newest INVEKOS data files...'); // eslint-disable-line no-console

    const newest = await findNewestInvekosFiles();

    if (
      !newest.schlaege
      || !newest.hofstellen
      || !newest.referenzen_polygon
      || !newest.referenzen_point
      || !newest.schlaege_bio
    ) {
      console.error('ERROR: Could not find all required INVEKOS files'); // eslint-disable-line no-console
      console.error('Found:', newest); // eslint-disable-line no-console
      process.exit(1);
    }

    console.log('\nFound newest files:'); // eslint-disable-line no-console
    console.log(`  Schläge: ${newest.schlaege.filename} (${newest.schlaege.year}-${newest.schlaege.revision})`); // eslint-disable-line no-console
    console.log(`  Hofstellen: ${newest.hofstellen.filename} (${newest.hofstellen.year}-${newest.hofstellen.revision})`); // eslint-disable-line no-console
    console.log(`  Referenzen Polygon: ${newest.referenzen_polygon.filename} (${newest.referenzen_polygon.year}-${newest.referenzen_polygon.revision})`); // eslint-disable-line no-console
    console.log(`  Referenzen Point: ${newest.referenzen_point.filename} (${newest.referenzen_point.year}-${newest.referenzen_point.revision})`); // eslint-disable-line no-console
    console.log(`  Schläge Bio: ${newest.schlaege_bio.filename} (${newest.schlaege_bio.year})`); // eslint-disable-line no-console

    // Verify files exist
    Object.values(newest).forEach((value) => {
      const filePath = join(DATA_DIR, value.filename);
      if (!existsSync(filePath)) {
        console.error(`ERROR: File not found: ${filePath}`); // eslint-disable-line no-console
        process.exit(1);
      }
    });

    console.log('\nUpdating configuration files...'); // eslint-disable-line no-console
    await updatePackageJson(
      newest.schlaege,
      newest.hofstellen,
      newest.referenzen_polygon,
      newest.referenzen_point,
      newest.schlaege_bio,
    );
    await updateStyleJson(newest.schlaege, newest.hofstellen, newest.schlaege_bio);

    console.log('\n✓ Update complete!'); // eslint-disable-line no-console
    console.log('\nNext steps:'); // eslint-disable-line no-console
    console.log('  1. Review the changes in package.json and public/map/style.json'); // eslint-disable-line no-console
    console.log('  2. Run: npm run data:vector'); // eslint-disable-line no-console
  } catch (error) {
    console.error('ERROR:', error.message); // eslint-disable-line no-console
    process.exit(1);
  }
}

export default main;

if (esMain(import.meta)) {
  main();
}
