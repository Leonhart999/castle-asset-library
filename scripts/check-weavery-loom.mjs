// Sanity-check the four reproducible stages and the independently serialized GLB.
import fs from 'node:fs';
import * as T from 'three';
import {buildLoom} from '../src/modules/weavery_loom.js';
import {buildPress} from '../src/modules/dairy_press.js';
const [id,build]=process.argv[2]==='dairy'?['dairy_lever_cheese_press',buildPress]:['weavery_tapestry_loom',buildLoom];
const M=new Proxy({}, {get:(o,k)=>o[k]??=new T.MeshStandardMaterial({name:k})});
const checks=[];
for(let stage=0;stage<4;stage++){
 const g=build(M,stage),box=new T.Box3().setFromObject(g),sz=box.getSize(new T.Vector3()).toArray();let triangles=0,vertices=0,degenerate=0;
 g.traverse(o=>{if(!o.isMesh)return;const geo=o.geometry,ix=geo.index,pos=geo.attributes.position;vertices+=pos.count;triangles+=ix.count/3;for(const attr of Object.values(geo.attributes))if(!attr.array.every(Number.isFinite))throw Error('Non-finite '+o.name);for(let i=0;i<ix.count;i+=3){let p=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(pos,ix.getX(i+j)));if(p[1].sub(p[0]).cross(p[2].sub(p[0])).lengthSq()<1e-14)degenerate++;}});
 if(degenerate||Math.abs(box.min.y)>.00001)throw Error('bad geometry'); checks.push({stage,triangles,vertices,meshes:g.children.length,size_m:sz.map(x=>+x.toFixed(3)),degenerate});
}
const glb=fs.readFileSync('library/models/glb/'+id+'.glb');if(glb.toString('ascii',0,4)!=='glTF'||glb.readUInt32LE(8)!==glb.length)throw Error('Invalid GLB');const json=JSON.parse(glb.toString('utf8',20,20+glb.readUInt32LE(12)));const tris=json.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+json.accessors[p.indices].count/3,0);if(tris!==checks[3].triangles||!json.images.every(i=>i.bufferView!==undefined)||checks[3].triangles>=checks[2].triangles)throw Error('Export or optimization mismatch');console.log(JSON.stringify({id,checks,glb_bytes:glb.length,embedded_images:json.images.length},null,2));
