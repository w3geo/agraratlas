# INVEKOS Data Update Script

This script automates the process of updating INVEKOS data references when new data files are added to the `data/` folder.

## What it does

When new INVEKOS data is released, the script:

1. **Finds the newest data files** by scanning the `data/` folder for:
   - `invekos_schlaege_{year}-{revision}_polygon.geojson`
   - `invekos_hofstellen_{year}-{revision}.geojson`
   - `invekos_referenzen_{year}-{revision}_polygon.geojson`
   - `invekos_referenzen_{year}-{revision}_point.geojson`

2. **Extracts inspire_id templates** from the first feature in each file

3. **Updates package.json** scripts:
   - `data:vector:prepare` - References to schlaege and hofstellen files
   - `data:vector:15` - References to referenzen files

4. **Updates public/map/style.json** metadata:
   - `invekos_schlaege_polygon` - collectionId, featureUrlTemplate, lastModified
   - `invekos_hofstellen` - collectionId, featureUrlTemplate, lastModified

## Usage

1. **Add new INVEKOS data files** to the `data/` folder:
   ```bash
   # Example: new data files for 2025 revision 2
   data/invekos_schlaege_2025-2_polygon.geojson
   data/invekos_hofstellen_2025-2.geojson
   data/invekos_referenzen_2025-2_polygon.geojson
   data/invekos_referenzen_2025-2_point.geojson
   ```

2. **Run the update script**:
   ```bash
   npm run update-invekos
   ```

3. **Review the changes**:
   - Check `package.json` for updated script references
   - Check `public/map/style.json` for updated metadata
   - Commit the changes

4. **Generate new tiles**:
   ```bash
   npm run data:vector
   ```

## File naming convention

The script expects files to follow these naming patterns:

- **Schläge**: `invekos_schlaege_{YYYY}-{R}_polygon.geojson`
  - Example: `invekos_schlaege_2025-2_polygon.geojson`
  
- **Hofstellen**: `invekos_hofstellen_{YYYY}-{R}.geojson`
  - Example: `invekos_hofstellen_2025-2.geojson`
  
- **Referenzen Polygon**: `invekos_referenzen_{YYYY}-{R}_polygon.geojson`
  - Example: `invekos_referenzen_2025-2_polygon.geojson`
  
- **Referenzen Point**: `invekos_referenzen_{YYYY}-{R}_point.geojson`
  - Example: `invekos_referenzen_2025-2_point.geojson`

Where:
- `{YYYY}` is the 4-digit year (e.g., 2025)
- `{R}` is the revision number (1-9)

## How it works

### Script files

- **scripts/extract-inspire-id.js**
  - Shared utility that extracts the inspire_id template from a GeoJSON file
  - Reads the first feature and replaces the localID with `{localID}` placeholder
  - Used by both `update-invekos-config.js` and `inspireid-to-localid.js`

- **scripts/update-invekos-config.js**
  - Main update script
  - Scans `data/` folder for INVEKOS files
  - Finds the newest version for each type (highest year, then highest revision)
  - Updates configuration files

- **scripts/inspireid-to-localid.js**
  - Converts inspire_id to localID in GeoJSON features
  - Now uses `extract-inspire-id.js` for consistent inspire_id detection
  - Called by `data:vector:prepare` script

### Example output

```
Finding newest INVEKOS data files...

Found newest files:
  Schläge: invekos_schlaege_2025-2_polygon.geojson (2025-2)
  Hofstellen: invekos_hofstellen_2025-2.geojson (2025-2)
  Referenzen Polygon: invekos_referenzen_2025-2_polygon.geojson (2025-2)
  Referenzen Point: invekos_referenzen_2025-2_point.geojson (2025-2)

Updating configuration files...
✓ Updated package.json
✓ Updated public/map/style.json

✓ Update complete!

Next steps:
  1. Review the changes in package.json and public/map/style.json
  2. Run: npm run data:vector
```

## Error handling

The script will exit with an error if:
- Required INVEKOS files are not found
- Files referenced in the data folder don't exist
- inspire_id cannot be extracted from a file
- Configuration files cannot be read or written

## Technical details

### inspire_id template extraction

The script extracts the inspire_id from the first feature and creates a template:

```javascript
// Original inspire_id:
"https://data.inspire.gv.at/0095/c6e594ce-e151-4ad5-8525-942208f956e8/elu.ExistingLandUseObject/12345/MFA-2025"

// Extracted template:
"https://data.inspire.gv.at/0095/c6e594ce-e151-4ad5-8525-942208f956e8/elu.ExistingLandUseObject/{localID}/MFA-2025"
```

This template is then used in the featureUrlTemplate in `style.json`:

```json
{
  "featureUrlTemplate": "https://gis.lfrz.gv.at/api/geodata/i009501/ogc/features/v1/collections/i009501:invekos_schlaege_2025_2_polygon/items?filter=inspire_id='https://data.inspire.gv.at/0095/c6e594ce-e151-4ad5-8525-942208f956e8/elu.ExistingLandUseObject/{localID}/MFA-2025'"
}
```
