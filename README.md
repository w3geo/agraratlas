# AgrarGIS

## Installation

After cloning the repository, run

    npm install

to install the project's dependencies.

## Prepare data

This project requires vector tiles and styles for its maps. Vector tiles are created with [Tippecanoe](https://github.com/felt/tippecanoe/), which needs to be installed on the system that creates the tiles. Styles need sprites, which are built from the icons provided in `public/map/icons/`.

1. Download the vector layers as zip from the URL provided by Manuel Illmeyer
2. Unzip the content of the zip to the `data/` folder
3. Run

       npm run data
    
   to build the vector tiles and download the GeoTIFF for the raster data.

## Data updates

See [scripts/README-update-invekos.md](scripts/README-update-invekos.md) for instructions on how to update INVEKOS data.

When done, commit/push the changes to `package.json` and `public/map/style.json`. To update only the new vector tiles on the server, run `npm run build` and deploy `dist/map/tiles/agraratlas.pmtiles`.

## Schlag bbox index

The data preparation step produces `invekos_schlaege_polygon.index.bin`, a compact
lookup table mapping each Schlag `localID` to its bounding box. It is served
alongside the vector tiles at `map/tiles/invekos_schlaege_polygon.index.bin` and is
intended to be consumed by separate applications (e.g. to zoom to a Schlag by its
`localID` without querying a feature service).

The file is a single little-endian binary blob with three sections. Entries are
sorted ascending by `localID` so lookups can use a binary search:

| Section    | Type              | Description                                        |
| ---------- | ----------------- | -------------------------------------------------- |
| count      | `uint32`          | Number of entries `N`                              |
| localIDs   | `uint32[N]`       | Schlag `localID`s, sorted ascending                |
| bboxes     | `float32[N * 4]`  | `[minX, minY, maxX, maxY]` per entry, same order   |

The bboxes are in EPSG:4326 (lon/lat), stored as `float32` (rounded to nearest),
which is accurate to ~0.3 m at these coordinate magnitudes. A `localID` must fit in
a `uint32`; the encoder skips any that do not.

Example reader:

```js
const buf = await (await fetch(url)).arrayBuffer();
const count = new Uint32Array(buf, 0, 1)[0];
const localIDs = new Uint32Array(buf, 4, count);
const bboxes = new Float32Array(buf, 4 + count * 4, count * 4);

function lookup(id) {
  let lo = 0;
  let hi = count - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const value = localIDs[mid];
    if (value === id) return bboxes.subarray(mid * 4, mid * 4 + 4); // [minX, minY, maxX, maxY]
    if (value < id) lo = mid + 1;
    else hi = mid - 1;
  }
  return null;
}
```

## Run the development server

    npm run dev

## Build the application for deployment

    npm run build

Note that this will take a while, because not only the application, but also the data (vector tiles!) will be copied to the `dist/` folder.

To deploy the application, copy the contents of the `dist/` folder of your S3 or http server.

## Environment variables

Environment variables are described in `.env.example`. Copy that file to `.env` and adjust the values as needed.

## Deploy a release

Continuous deployment to the production server takes place when a release tag (i.e. prefixed with 'v') is pushed. The easiest way to achieve this is to use `npm version`. These three steps will cut a release and deploy it to the production server:

    git pull origin main
    npm version patch # oder "minor" oder "major" statt "patch"
    git push --follow-tags

Note that this only deploys code, not data. The production data needs to be copied to the production S3 storage manually. Note that the `dist/map/tiles/agraratlas.pmtiles` file is accessed by the DigitalOcean Serverless function at "https://faas-fra1-afec6ce7.doserverless.co/api/v1/web/fn-997f03fd-18dd-45cd-b6ed-f08a54019dc9/protomaps/tiles, to deliver all vector tiles and their metadata.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
