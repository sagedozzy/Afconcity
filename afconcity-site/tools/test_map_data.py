"""Offline map regressions: python3 tools/test_map_data.py."""
import json
import math
import unittest
from import_osm import DATA, area, dist, generate, project

BASE = json.loads((DATA/'world-base.json').read_text())
SNAP = json.loads((DATA/'fumba-osm-snapshot.json').read_text())
WORLD = json.loads((DATA/'world.json').read_text())


class MapDataTests(unittest.TestCase):
    def test_rebuild_is_reproducible(self):
        self.assertEqual(generate(BASE, SNAP), WORLD)

    def test_footprints_are_source_geometry(self):
        source = {f['id']: f for f in SNAP['features']}
        matched = [b for b in WORLD['blds'] if len(b)>7]
        self.assertEqual(len(matched), WORLD['meta']['mappedFootprints'])
        self.assertGreater(len(matched), 250)
        self.assertEqual(len(WORLD['blds']), len(BASE['blds']))
        for b in matched:
            p = b[7]
            self.assertGreater(area(p), 4)
            self.assertEqual(set(map(tuple, p)), set(tuple(project(*q)) for q in source[b[8]['osm']]['coordinates']))
            self.assertTrue(all(math.isfinite(v) for q in p for v in q))
            self.assertEqual(len(p), len(set(map(tuple, p))))

    def test_legacy_routes_are_not_silently_deleted(self):
        segs=[(a,b) for r in WORLD['roads'] for a,b in zip(r['p'],r['p'][1:])]
        for r in BASE['roads']:
            for a,b in zip(r['p'],r['p'][1:]):
                for t in (0,.25,.5,.75,1):
                    p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]
                    self.assertLessEqual(min(dist(p,c,d) for c,d in segs),3.001)

    def test_roads_are_finite_and_have_provenance(self):
        ids={f['id'] for f in SNAP['features'] if 'highway' in f['tags']}
        self.assertEqual(sum(r['source']=='osm' for r in WORLD['roads']),WORLD['meta']['mappedRoads'])
        for r in WORLD['roads']:
            self.assertIn(r['c'],'TRSFK')
            self.assertGreaterEqual(len(r['p']),2)
            self.assertTrue(all(math.isfinite(v) for p in r['p'] for v in p))
            self.assertTrue(all(a!=b for a,b in zip(r['p'],r['p'][1:])))
            if r['source']=='osm':self.assertIn(r['osm'],ids)


if __name__=='__main__':unittest.main()
