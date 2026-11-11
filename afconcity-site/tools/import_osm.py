"""Rebuild the local map from the checked-in, ODbL-licensed OSM snapshot.

No runtime map API, account, tile download, or API key is needed. To update the
snapshot, pass an OSM API XML export with --xml FILE, then review the map diff.
Unknown building heights and road widths remain artistic estimates.
"""
import argparse
import copy
import json
import math
import pathlib
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / 'osm2'
GEO = dict(lat=-6.30612, lon=39.26962, ang=-0.9424777960769379,
           kx=110650.6, kz=110574)
EXTENT = (-1900, -1500, 1200, 900)


def project(lon, lat):
    ex, ez = (lon-GEO['lon'])*GEO['kx'], (GEO['lat']-lat)*GEO['kz']
    c, s = math.cos(GEO['ang']), math.sin(GEO['ang'])
    return [round(ex*c-ez*s, 2), round(ex*s+ez*c, 2)]


def dist(p, a, b):
    dx, dz = b[0]-a[0], b[1]-a[1]
    t = max(0, min(1, ((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz or 1)))
    return math.hypot(p[0]-a[0]-t*dx, p[1]-a[1]-t*dz)


def area(p):
    return sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(p,p[1:]+p[:1]))/2


def obb(p):
    """Smallest edge-aligned rectangle; angle is clockwise in local x/z."""
    best = None
    for a,b in zip(p,p[1:]+p[:1]):
        ang = math.atan2(b[1]-a[1], b[0]-a[0]); c,s=math.cos(ang),math.sin(ang)
        u=[q[0]*c+q[1]*s for q in p]; v=[-q[0]*s+q[1]*c for q in p]
        w,d=max(u)-min(u),max(v)-min(v); uc,vc=(max(u)+min(u))/2,(max(v)+min(v))/2
        candidate=(w*d,[round(uc*c-vc*s,2),round(uc*s+vc*c,2),round(w,2),round(d,2),round(ang,6)])
        if best is None or candidate[0]<best[0]: best=candidate
    return best[1]


def clip(a,b):
    dx,dz=b[0]-a[0],b[1]-a[1]; lo,hi=0,1
    for p,q in [(-dx,a[0]-EXTENT[0]),(dx,EXTENT[2]-a[0]),(-dz,a[1]-EXTENT[1]),(dz,EXTENT[3]-a[1])]:
        if p==0:
            if q<0:return None
        elif p<0:lo=max(lo,q/p)
        else:hi=min(hi,q/p)
    if lo>=hi:return None
    return [[round(a[0]+dx*t,2),round(a[1]+dz*t,2)] for t in (lo,hi)]


def snapshot(xml):
    root=ET.parse(xml).getroot()
    nodes={n.attrib['id']:[float(n.attrib['lon']),float(n.attrib['lat'])] for n in root.findall('node')}
    features=[]
    allowed={'highway','surface','width','lanes','sidewalk','access','building','building:levels','height','roof:shape','name'}
    for way in root.findall('way'):
        tags={t.attrib['k']:t.attrib['v'] for t in way.findall('tag') if t.attrib['k'] in allowed}
        if not ('highway' in tags or 'building' in tags):continue
        refs=[n.attrib['ref'] for n in way.findall('nd')]
        if not all(n in nodes for n in refs):continue
        coords=[nodes[n] for n in refs]
        if not any(EXTENT[0]<p[0]<EXTENT[2] and EXTENT[1]<p[1]<EXTENT[3] for p in map(lambda q:project(*q),coords)):continue
        features.append(dict(id=int(way.attrib['id']),version=int(way.attrib['version']),timestamp=way.attrib['timestamp'],tags=tags,coordinates=coords))
    return dict(source='https://api.openstreetmap.org/api/0.6/map?bbox=39.255,-6.318,39.285,-6.288',
                retrieved='2026-11-11',attribution='© OpenStreetMap contributors',license='ODbL-1.0',
                copyright='https://www.openstreetmap.org/copyright',features=features)


def generate(base, snap):
    world=copy.deepcopy(base); mapped=[]; footprints=[]
    for f in snap['features']:
        tags=f['tags']; p=[project(*q) for q in f['coordinates']]
        if 'building' in tags and p[0]==p[-1] and len(p)>=4:
            p=p[:-1]
            if abs(area(p))<4:continue
            if area(p)<0:p.reverse()
            footprints.append((f,p,obb(p)))
        if 'highway' not in tags or tags.get('access')=='private':continue
        cls={'tertiary':'T','secondary':'T','primary':'T','unclassified':'T','residential':'R','living_street':'R','service':'S','track':'K','path':'F','footway':'F','pedestrian':'F'}.get(tags['highway'])
        if not cls:continue
        paths=[]; path=[]
        for a,b in zip(p,p[1:]):
            seg=clip(a,b)
            if not seg:
                if len(path)>1:paths.append(path)
                path=[];continue
            if path and path[-1]!=seg[0]:
                if len(path)>1:paths.append(path)
                path=[]
            if not path:path=[seg[0]]
            if seg[1]!=path[-1]:path.append(seg[1])
        if len(path)>1:paths.append(path)
        for path in paths:
            road=dict(c=cls,p=path,osm=f['id'],source='osm',surface=tags.get('surface','unknown'))
            if 'sidewalk' in tags:road['sidewalk']=tags['sidewalk']
            try:
                width=float(tags['width'].removesuffix(' m')) if hasattr(str,'removesuffix') else float(tags['width'].replace(' m',''))
                if 1<=width<=30:road['w']=width
            except (KeyError,ValueError):pass
            mapped.append(road)
    # Keep legacy segments where the new extract has no equivalent. This avoids
    # deleting playable routes merely because OSM's local coverage is incomplete.
    segs=[(a,b) for r in mapped for a,b in zip(r['p'],r['p'][1:])]
    roads=mapped[:]; seen=set()
    for road in base['roads']:
        path=[]
        for a,b in zip(road['p'],road['p'][1:]):
            probes=[[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t] for t in (0,.25,.5,.75,1)]
            covered=all(min((dist(p,c,d) for c,d in segs),default=1e9)<=3 for p in probes)
            key=tuple(sorted((tuple(a),tuple(b))))
            if covered or key in seen:
                if len(path)>1:roads.append(dict(c=road['c'],p=path,source='legacy'))
                path=[];continue
            seen.add(key)
            if not path:path=[a]
            path.append(b)
        if len(path)>1:roads.append(dict(c=road['c'],p=path,source='legacy'))
    world['roads']=roads
    # Match existing buildings conservatively; do not introduce new obstacles at
    # mission venues or replace buildings using only a nearby unrelated centroid.
    candidates=[]
    for f,p,b in footprints:
        for i,old in enumerate(base['blds']):
            delta=math.hypot(b[0]-old[0],b[1]-old[1]); ratio=abs(area(p))/(old[2]*old[3])
            if delta<=max(3,math.hypot(old[2],old[3])*.16) and .5<ratio<1.6:
                candidates.append((delta,i,f,p,b))
    used=set(); ids=set()
    for delta,i,f,p,b in sorted(candidates,key=lambda q:q[0]):
        if i in used or f['id'] in ids:continue
        used.add(i);ids.add(f['id']);old=base['blds'][i]
        meta={'osm':f['id'],'heightEstimated':True}
        try:
            h=float(f['tags']['height'].replace(' m',''))
            if 2<=h<=150:meta.update(height=h,heightEstimated=False)
        except (KeyError,ValueError):pass
        world['blds'][i]=b+old[5:7]+[p,meta]
    world['meta']={'projection':GEO,'snapshot':snap['retrieved'],'license':'ODbL-1.0',
                   'mappedFootprints':len(used),'mappedRoads':len(mapped),
                   'note':'OSM footprint positions; estimated heights and facades. Legacy roads retained where OSM coverage is absent. Gameplay venues and future projects remain fictional layouts.'}
    world['src']=base['src']+'; OpenStreetMap extract '+snap['retrieved']+' (ODbL-1.0)'
    return world


def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--xml',type=pathlib.Path);args=ap.parse_args()
    if args.xml:
        (DATA/'fumba-osm-snapshot.json').write_text(json.dumps(snapshot(args.xml),ensure_ascii=False,separators=(',',':'))+'\n')
    world=generate(json.loads((DATA/'world-base.json').read_text()),json.loads((DATA/'fumba-osm-snapshot.json').read_text()))
    (DATA/'world.json').write_text(json.dumps(world,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps(world['meta'],indent=2))


if __name__=='__main__':main()
