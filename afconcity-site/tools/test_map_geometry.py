"""Run the actual map/collision functions without a browser or production services.

python3 tools/test_map_geometry.py --three /path/to/three.r128.min.js
Uses Node, or JavaScriptCore on macOS. Three must be the game's pinned r128.
"""
import argparse
import json
import pathlib
import shutil
import subprocess
import tempfile

ROOT=pathlib.Path(__file__).resolve().parents[1]
ap=argparse.ArgumentParser(description=__doc__)
ap.add_argument('--three',required=True,type=pathlib.Path)
ap.add_argument('--engine')
args=ap.parse_args()
engine=args.engine or shutil.which('node') or '/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc'
core=(ROOT/'v3/js/00-core.js').read_text()
world=(ROOT/'v3/js/10-world.js').read_text()
people=(ROOT/'v3/js/20-people.js').read_text()
main=(ROOT/'v3/js/90-main.js').read_text()
geo=(ROOT/'v3/js/09-map-geometry.js').read_text()
data=(ROOT/'osm2/world.json').read_text()
tests=r'''
function assert(v, m) { if (!v) throw new Error(m); }
const testP = [[0,0],[8,0],[8,3],[3,3],[3,8],[0,8]];
const pc = addFootprintCollider(testP, 6);
assert(pointBlocked(1,1,.1), 'inside polygon is blocked');
assert(!pointBlocked(6,6,.1), 'concave courtyard must stay open');
assert(personBlocked(1,1,.4) && !personBlocked(6,6,.4), 'NPC footprint checks');
for (const pos of [{x:1,z:1},{x:8.1,z:1},{x:0,z:1},{x:3.1,z:5}]) {
  resolveCircle(pos,.4);
  assert(polygonContact(pos.x,pos.z,testP).d >= .399, 'walk/vehicle pushed outside wall');
}
assert(footprintRay(pc,-4,2,1,1,0,0,12,.35)<4, 'camera stops before wall');
assert(footprintRay(pc,-4,10,1,1,0,0,12,.35)===12, 'camera clears roof');
assert(footprintRay(pc,6,2,6,1,0,0,12,.35)===12, 'camera clears courtyard');
cgrid.clear();
for (const q of [[0,0],[-1440,-960],[740,400],[-1322,150]]) {
  const ll=toLatLon(q[0],q[1]), xy=fromLatLon(ll[0],ll[1]);
  assert(Math.hypot(xy.x-q[0],xy.z-q[1])<1e-6,'projection round trip');
}
WORLD.roads.forEach((r,ri)=>{const hw=roadSpec(r).w/2;for(let i=1;i<r.p.length;i++){
  const a=r.p[i-1],b=r.p[i];indexRoadSegment({ri,c:r.c,x0:a[0],z0:a[1],x1:b[0],z1:b[1],hw,minx:Math.min(a[0],b[0])-hw,maxx:Math.max(a[0],b[0])+hw,minz:Math.min(a[1],b[1])-hw,maxz:Math.max(a[1],b[1])+hw});
}});
let candidateCount=0;
for(let i=0;i<5000;i++){
  const x=-1900+rnd()*3100,z=-1500+rnd()*2400,pad=i%4===0?0:i%90,except=i%7===0?i%WORLD.roads.length:undefined;
  const brute=roadSegs.find(s=>s.ri!==except&&x>=s.minx-pad&&x<=s.maxx+pad&&z>=s.minz-pad&&z<=s.maxz+pad&&segDist(x,z,s.x0,s.z0,s.x1,s.z1)<s.hw+pad)||null;
  assert(nearRoad(x,z,pad,except)===brute,'indexed road query differs at '+x+','+z);
  candidateCount+=roadCandidates(x,z,pad).length;
}
buildNav();
const stopNodes=STOPS.map(s=>NAV.nodes.map((n,i)=>({i,d:Math.hypot(n.x-s.x,n.z-s.z)})).sort((a,b)=>a.d-b.d)[0].i);
const connected=new Set([stopNodes[0]]),queue=[stopNodes[0]];
while(queue.length){const n=queue.pop();for(const edge of NAV.nodes[n].adj)if(!connected.has(edge.to)){connected.add(edge.to);queue.push(edge.to);}}
assert(stopNodes.every(n=>connected.has(n)), 'all six transport stops share one connected road network');
buildBuildings();
footprints.push({x:64,z:64,w:8,d:22,ang:Math.PI/4},{x:-64,z:0,ellipse:true,rx:8,rz:12},{x:0,z:-64,circle:true,r:5});
preparePlantGrid();
for(const f of footprints){const x=f.poly?f.poly[0][0]:f.x,z=f.poly?f.poly[0][1]:f.z;assert([...plantCandidates(x,z,4)].includes(f),'plant index includes footprint edges');}
let triangles=0,meshes=0;
scene.traverse(o=>{if(o.isMesh){meshes++;const a=o.geometry.attributes.position.array;triangles+=a.length/9;assert([...a].every(Number.isFinite),'finite building geometry');}});
assert(triangles>10000&&meshes>1,'build all scenery');
assert(LODS.length===meshes,'every building chunk has distance culling');
print(JSON.stringify({pass:true,roadQueries:5000,totalRoadSegments:roadSegs.length,meanCandidates:+(candidateCount/5000).toFixed(2),buildingTriangles:triangles,buildingMeshes:meshes,footprintColliders:[...new Set([...cgrid.values()].flat())].filter(c=>c.t===2).length}));
'''
prefix='var print = typeof print === "function" ? print : console.log; if (typeof console === "undefined") globalThis.console = {log:print,warn:print,error:print};\n'
if pathlib.Path(engine).name=='node':prefix+='var THREE=require('+json.dumps(str(args.three.resolve()))+');\n'
else:prefix+='load('+json.dumps(str(args.three.resolve()))+');\n'
code=prefix+'const T=THREE; const matchMedia=()=>({matches:false});\n'
code+=core[core.index('const clamp'):core.index('function daysToKickoff')]
code+='const WORLD='+data+'; const GEO='+json.dumps(json.loads(data)['meta']['projection'])+';\n'
code+=next(line for line in core.splitlines() if line.startswith('function toLatLon'))+'\n'
code+=core[core.index('class Builder'):core.index('const windU')]
code+=core[core.index('const CELL ='):]
code+='const scene=new T.Scene(), TEX={plaster:null,tiles:null,mabati:null,door:null}; function nightable(){}\n'+geo+'\n'
code+=world[world.index('const ROAD ='):world.index('function upQuad')]
code+=world[world.index('function nearRoad'):world.index('function roadClassAt')]
code+=world[world.index('function shapeFrom'):world.index('function flatShape')]
code+=world[world.index('const WALL_COLS'):world.index('/* ---------- vegetation')]
code+=people[people.index('function personBlocked'):people.index('/* moving vehicles')]
vehicles=(ROOT/'v3/js/30-vehicles.js').read_text()
afcon=(ROOT/'v3/js/15-afconcity.js').read_text()
code+=core[core.index('const PLOT ='):core.index('const KITS =')]
code+=afcon[afcon.index('const AFCON_ROADS ='):afcon.index('function inPlot')]
code+=vehicles[vehicles.index('const NAV ='):vehicles.index('const navOk')]
code+=tests
with tempfile.TemporaryDirectory() as td:
    file=pathlib.Path(td)/'map-test.js';file.write_text(code)
    subprocess.run([engine,str(file)],check=True)
