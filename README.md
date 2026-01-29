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

## Run the development server

    npm run dev

## Build the application for deployment

    npm run build

Note that this will take a while, because not only the application, but also the data (vector tiles!) will be copied to the `dist/` folder.

To deploy the application, copy the contents of the `dist/` folder of your S3 or http server.

## Deploy a release

Continuous deployment to the production server takes place when a release tag (i.e. prefixed with 'v') is pushed. The easiest way to achieve this is to use `npm version`. These three steps will cut a release and deploy it to the production server:

    git pull origin main
    npm version patch # oder "minor" oder "major" statt "patch"
    git push --follow-tags

Note that this only deploys code, not data. The production data needs to be copied to the production S3 storage manually. Note that the `dist/map/tiles/agraratlas.pmtiles` file is accessed by the DigitalOcean Serverless function at "https://faas-fra1-afec6ce7.doserverless.co/api/v1/web/fn-997f03fd-18dd-45cd-b6ed-f08a54019dc9/protomaps/tiles, to deliver all vector tiles and their metadata.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
