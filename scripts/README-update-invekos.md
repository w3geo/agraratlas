# INVEKOS Data Update Script

This script automates the process of updating INVEKOS data references in `package.json` and `public/map/style.json` when new data files are added to the `data/` folder.

## Usage

1. **Add new INVEKOS data files** to the `data/` folder.
   
   Examples:
   ```
   data/invekos_schlaege_2025-2_polygon.geojson
   data/invekos_hofstellen_2025-2.geojson
   data/invekos_referenzen_2025-2_polygon.geojson
   data/invekos_referenzen_2025-2_point.geojson
   data/invekos_schlaege_2025_bio_polygon.geojson
   ```

2. **Run the update script**:
   ```bash
   npm run update-invekos
   ```

3. **Review the changes**:
   - Check `package.json` for updated script references.
   - Check `public/map/style.json` for updated metadata (including `lastModified` dates and collection IDs).
   - Commit the changes.

4. **Generate new tiles**:
   ```bash
   npm run data:vector
   ```

## File naming convention

The script expects files to follow these naming patterns:

- **Schläge**: `invekos_schlaege_{YYYY}-{R}_polygon.geojson`
- **Hofstellen**: `invekos_hofstellen_{YYYY}-{R}.geojson`
- **Referenzen Polygon**: `invekos_referenzen_{YYYY}-{R}_polygon.geojson`
- **Referenzen Point**: `invekos_referenzen_{YYYY}-{R}_point.geojson`
- **Bio Schläge**: `invekos_schlaege_{YYYY}_bio_polygon.geojson`

Where:
- `{YYYY}` is the 4-digit year (e.g., 2025)
- `{R}` is the revision number (e.g., 1, 2)
