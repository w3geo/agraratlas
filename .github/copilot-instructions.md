# AgrarGIS AI Instructions

## 1. Project Overview
- **Type**: Vue 3 application with Vuetify and OpenLayers.
- **Purpose**: Agricultural map visualization (Agraratlas) using vector tiles.
- **Key Libraries**: `ol` (OpenLayers), `ol-mapbox-style`, `pmtiles-protocol`, `vuetify`.

## 2. Architecture & Data Flow
- **Map Engine**: OpenLayers is the rendering engine, but styling is driven by Mapbox Style specifications via `ol-mapbox-style`.
- **Data Source**: Massive use of PMTiles (Protomaps).
    - **Source**: GeoJSON files in `data/`.
    - **Processing**: `tippecanoe` converts GeoJSON to PMTiles via intricate npm scripts.
    - **Output**: `public/map/tiles/agraratlas.pmtiles`.
- **State Management**:
    - Decentralized state using Vue Composables (`src/composables/`).
    - **Key Composables**:
        - `useMap.js`: Singleton OpenLayers map instance, `mapView` state, and `mapReady` promise.
        - `useTopics.js`: Manages map layers/topics visibility.
        - `useSchlag.js`: Manages agricultural plot ("Schlag") selection and info.
        - `usePanelControl.js`: Manages UI panel visibility.

## 3. Developer Workflows
### Data Preparation (Critical)
The map depends on generated tiles. Data processing is handled via npm scripts in `package.json`:
- `npm run data`: Run full pipeline (Vector + Raster).
- `npm run data:vector`: Generates vector tiles from `data/*.geojson`.
    - **Sequence**: Prepare -> Generate tiles for zoom levels (0-8, 8-11, 12-14, 15) -> Join tiles.
    - **Tools**: Requires `tippecanoe`, `tile-join` (from felt/tippecanoe), `mapshaper` installed on the system.
- `npm run create-pmtiles-style`: Generates the `style-pmtiles.json` used by the app.

### Development
- `npm run dev`: Starts Vite server.
    - Automatically copies `public/map/style.json` to `dist/map`.
    - Runs `create-pmtiles-style` before starting.

### Deployment
- `npm run build`: Specialized build that also runs style generation.
- **Versioning**: `npm version patch/minor/major` handles release tagging.

## 4. Coding Conventions
- **Composables**: Prefer extracting logic to composables. Components should mainly handle UI and bind to composables.
- **Map Interaction**:
    - **Do not** instantiate new Maps. Import `map` from `useMap.js`.
    - Wait for `mapReady` export from `useMap.js` before performing operations requiring loaded styles.
    - Use `ol-mapbox-style` functions (`apply`, `getLayer`, `getSource`) to manipulate map style at runtime.
- **Styling**:
    - UI: Vuetify components.
    - Map: `public/map/style.json` (Mapbox Style Spec).
- **Files**:
    - `src/views/Map.vue`: Main layout component.
    - `src/components/The*.vue`: Single-instance UI panels overlaying the map.

## 5. Important Paths
- `src/composables/useMap.js`: Entry point for map logic.
- `src/constants.js`: Configuration constants.
- `scripts/`: Helper scripts for data and style generation.
- `data/`: Raw GeoJSON inputs (used for tile generation).
