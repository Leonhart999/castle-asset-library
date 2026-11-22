// Upright two-beam tapestry loom. Revision 0 = blockout; 1 = joinery and stance;
// 2 = warp, weaving and locking furniture; 3 = budget tiny round sections by radius.
import * as T from 'three';
import {newBuilder,bevelBox} from '../lib/kit.js';
import {box,rod} from '../lib/geo.js';
const id='weavery_tapestry_loom';
export function buildLoom(M,rev=3){
 const b=newBuilder(M), final=rev>=3;
 function timber(key,p,w,h,d){b.add(key,rev>=1?bevelBox(w,h,d,.009,1):box(w,h,d),p);}
 function stick(key,a,c,r,segments=24){b.add(key,rod(a,c,r,final?(r<.008?5:r<.025?8:segments):24));}
 function brace(a,c,w,d){let A=new T.Vector3(...a), C=new T.Vector3(...c), delta=C.clone().sub(A);let g=bevelBox(w,delta.length(),d,.006,1);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize())); b.add('oak',g,A.lerp(C,.5).toArray());}
 for(const s of [-1,1]){let x=s*.79;
  timber('oak',[x,.068,0],.18,.136,rev?1.02:.65);
  timber('oak',[x,1.13,0],.137,2.18,.155);
  if(rev>=1){for(const z of [-.39,.39])brace([x,.12,z],[x,.65,0],.078,.08);}
 }
 timber('darkWood',[0,.242,-.014],1.65,.105,.09);
 for(const [y,r] of [[.546,.091],[2.022,.079]])stick('darkWood',[-.94,y,0],[.94,y,0],r,24);
 // A continuous woven face curves with the rolled cloth at the breast beam.
 const y0=.547, y1=1.379, half=.613;
 function depth(y,x){return .08+.014*(y1-y)/(y1-y0)+.005*Math.cos(x*13)*Math.sin(Math.PI*(y-y0)/(y1-y0));}
 function panel(key,x0,x1,a,c){const p=[],uv=[];for(const [x,y] of [[x0,a],[x1,a],[x1,c],[x0,a],[x1,c],[x0,c]]){p.push(x,y,depth(y,x));uv.push(x,y);}let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals(); b.add(key,g);}
 // One material per *woven region*, no stacked decals or coplanar ornament.
 const n=rev>=2?39:1, rows=rev>=2?29:1;
 const clothKeys=rev>=2?['fabric','azure','linen']:['fabric'];
 for(let j=0;j<rows;j++)for(let i=0;i<n;i++){
  const side=Math.min(i,n-1-i), band=(j===3||j===6||j===22||j===25), inset=j>=8&&j<=20;
  const diamond=Math.abs(((i+2)%12)-6)+Math.abs(j-14);
  let k=side<1||j<2||j>26?1:side===2||band?2:inset&&diamond===5?2:inset&&diamond<5?1:0;
  panel(clothKeys[rev>=2?k:0],-half+2*half*i/n,-half+2*half*(i+1)/n,y0+(y1-y0)*j/rows,y0+(y1-y0)*(j+1)/rows);
 }
 // Woven cloth has two visible faces, unlike the opaque frame.
 const count=rev>=2?57:15;
 for(let i=0;i<count;i++){let x=half*(2*i/(count-1)-1);stick('linen',[x,y1,depth(y1,x)],[x,2.024,.079],rev>=2?.0028:.004);}
 if(rev>=1){for (const x of [-.905,.905])for (const y of [.546,2.022])stick('iron',[x-.019,y,0],[x+.019,y,0],y<1?.097:.085,20);}
 if(rev>=2){
  // Beam pin and contrasting locking key, plus the heddle rod behind the warp.
  stick('oak',[.918,.30,.005],[.918,.81,.005],.018);
  stick('darkWood',[-.736,1.61,-.024],[.736,1.61,-.024],.025,14);
  for(let i=0;i<19;i++){let x=-.60+i*.066;stick('linen',[x,1.628,-.026],[x,1.594,.08],.003);}
  for (const x of [-.79,.79])for(const y of [.246,.606])stick('darkWood',[x,y,.062],[x,y,.087],.017);
  for(let i=0;i<2;i++){let x=(i?1:-1)*.689;stick('linen',[x,1.61,-.024],[x,2.015,-.071],.004);}
 }
 const group=b.build(id);for(const child of group.children){if(clothKeys.some(k=>M[k]===child.material)){child.material=child.material.clone();child.material.side=T.DoubleSide;}}
 return group;
}
export const weaveryModules=[{id,name:'High-warp tapestry loom',category:'weavery',description:'Freestanding oak loom with braced sled feet, exposed linen warp and a partially woven madder-and-indigo lozenge hanging.',build:buildLoom}];
