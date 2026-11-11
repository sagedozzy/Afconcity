# AfconCity map data

This is a game map, not a survey or a navigation product. The local coordinate
system is metres, rotated around latitude -6.30612, longitude 39.26962. The
projection parameters are recorded in `world.json` under `meta.projection`.

## Sources and licence

- `world-base.json` preserves the map already used by the game. Its recorded
  provenance is Overture Maps 2026-09-23: OpenStreetMap, Google Open Buildings
  and Microsoft building footprints. This release does not independently
  re-fetch or verify that older Overture snapshot.
- `fumba-osm-snapshot.json` contains selected road and building ways from the
  OpenStreetMap API extract fetched on 2026-11-11. Each feature retains its OSM
  way ID, version, timestamp and geographic coordinates. Contributor account
  fields are omitted. The request URL is recorded in the snapshot.
- `world.json` is the derived database used by the game. Rebuild it offline with
  `python3 tools/import_osm.py`. To import a new XML extract, use
  `python3 tools/import_osm.py --xml path/to/export.osm`, then run the map tests
  and review the resulting diff before release.

These databases are made available under the Open Database License (ODbL) 1.0:
https://opendatacommons.org/licenses/odbl/1-0/ . Attribution: © OpenStreetMap
contributors, via OpenStreetMap and Overture Maps Foundation. Original Google
Open Buildings data is licensed under CC BY 4.0; Microsoft ML building data is
ODbL. Source and attribution information:

- https://www.openstreetmap.org/copyright
- https://docs.overturemaps.org/attribution/
- https://sites.research.google/gr/open-buildings/
- https://github.com/microsoft/GlobalMLBuildingFootprints

The production build provides the database, snapshot and these credits at
`/map-data/`. No Google Maps/Earth imagery, tiles or 3D meshes are included.

## What is accurate, estimated, or fictional

306 existing building records now use matched OSM polygon footprints, rather
than their previous rectangular approximations. The same polygons drive 3D
walls, map silhouettes, pedestrian/vehicle collision and camera obstruction.
Matches are conservative: buildings are not added blindly to mission sites.
Unmatched buildings retain the previous approximation. Heights and facade/roof
designs are estimates unless explicitly tagged in OSM; this extract supplies
very little height information. A footprint is not a complete 3D building model.

71 road paths use OSM centreline geometry and supplied surface tags. Widths
remain class-based estimates unless tagged. Legacy road segments remain where
the new extract lacks equivalent coverage within 3 m; their source is `legacy`.
Stadium access roads remain explicitly tagged `concept` in the game code.
Sidewalks and street furniture are game interpretations, not surveyed assets.

Coastline and land cover are unchanged from the existing dataset. Terrain is
still an artistic surface, not a surveyed elevation model. Future projects,
stadium interiors and gameplay venues retain approximate positions and designs.
Their labels do not establish what is built today. Exact relocation of these
projects needs georeferenced plans or owner-supplied coordinates, particularly
where development has changed faster than the public map.

## Validation

`python3 tools/test_map_data.py` checks reproducibility, source coordinates,
valid roads and preservation of existing route coverage.

`python3 tools/test_map_geometry.py --three /path/to/three.r128.min.js` runs the
actual projection, collision, camera-ray, road-query, navigation and building
geometry code with the game's pinned Three.js r128. It uses Node or macOS
JavaScriptCore; it does not connect to production services.

On the development machine, building meshes fell from 397,458 to 232,043
triangles (41.6% fewer). This measures building geometry, not overall FPS.
Distance culling removes facade details sooner on Fast graphics. Spatial road
queries inspect nearby cells instead of scanning every segment; the test also
checks 5,000 queries against a full scan, including junctions and large radii.

Saved world coordinates, mission locations, currency and backend schema are
unchanged. New footprint collision boundaries can differ slightly from the old
rectangles; the existing unstick system handles a save inside a new wall.
