// Gravity-loaded dairy lever press; the basket is an open staved hoop, not a sealed barrel.
import * as T from 'three';
import {newBuilder,bevelBox,lathe} from '../lib/kit.js';
import {box,rod,boxUV} from '../lib/geo.js';
const id='dairy_lever_cheese_press';
export function buildPress(M,rev=3){const b=newBuilder(M), detailed=rev>=2, opt=rev===3;
 const board=(m,p,w,h,d,rz=0,ry=0)=>b.add(m,rev?bevelBox(w,h,d,.007,1):box(w,h,d),p,ry,0,rz);
 function beam(m,a,c,w,d){let A=new T.Vector3(...a),C=new T.Vector3(...c),u=C.clone().sub(A);let g=rev?bevelBox(w,u.length(),d,.006,1):box(w,u.length(),d);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),u.normalize()));b.add(m,g,A.lerp(C,.5).toArray());}
 const pin=(m,a,c,r)=>b.add(m,rod(a,c,r,opt?(r<.018?7:14):32));
 const cx=-.19,cy=.66;
 for(let x of [-.64,.47]){board('darkWood',[x,.065,0],.14,.13,.72);for(let z of [-.238,.238])board('oak',[x,.365,z],.107,.55,.105);}
 board('oak',[-.085,.615,0],1.44,.09,.63);
 for(let z of [-.228,.228]){
  board('oak',[-.63,1.065,z],.13,.99,.093);
  if(rev){beam('oak',[-.52,.232,z],[.32,.59,z],.066,.068);beam('darkWood',[-.63,1.12,z],[-.32,.677,z],.055,.065);}
 }
 pin('iron',[-.63,1.41,-.30],[-.63,1.41,.30],.035);
 // Broad lever over a fitted follower. Counterweight stays well clear of the floor and table.
 beam('darkWood',[-.721,1.407,0],[1.101,1.443,0],.087,.142);
 const profile=(mat,arr,x,y,z,n)=>b.add(mat,lathe(arr,opt?n:48),[x,y,z]);
 profile('oak',[[0,0],[.222,0],[.227,.024],[.22,.036],[0,.036]],cx,cy,0,28);
 const N=rev?18:12;
 for(let i=0;i<N;i++){let a=i*Math.PI*2/N;board('oak',[cx+.195*Math.sin(a),.842,.195*Math.cos(a)],.391*Math.sin(Math.PI/N)*.95,.304,.025,0,a);}
 for(const h of [.726,.922])profile('iron',[[.198,0],[.213,0],[.213,.025],[.198,.025],[.198,0]],cx,h,0,32);
 profile('darkWood',[[0,0],[.181,0],[.181,.048],[0,.048]],cx,.958,0,28);
 board('oak',[cx,1.185,0],.112,.36,.105);
 for(let z of [-.12,.12])pin('linen',[1.023,1.44,0],[1.021,.939,z],.014);
 const weight=new T.IcosahedronGeometry(.20,rev?1:0);weight.scale(1.18,.77,.89);b.add('grindstone',boxUV(weight),[1.02,.893,0]);
 if(detailed){
  for(const z of [-.115,.115])pin('linen',[1.02,.946,z],[1.02,.764,.42*z],.014);
  pin('linen',[1.02,.764,-.053],[1.02,.764,.053],.014);
  for(let i=0;i<4;i++)pin('linen',[.993+i*.016,1.489,-.064],[.993+i*.016,1.489,.064],.009);
  for(let z of [-.282,.282])for(let h of [.62,1.056])pin('darkWood',[-.63,h,z-.012],[-.63,h,z+.012],.018);
  for(let x of [-.63,.475])for(let z of [-.24,.24])pin('darkWood',[x,.614,z],[x,.664,z],.013);
  // Two ceramic whey bowls nested beneath the free side of the work surface.
  board('oak',[.224,.192,.015],.47,.05,.43);
  for(let h of [.217,.251])profile('clay',[[0,0],[.067,0],[.086,.017],[.119,.098],[.115,.105],[.105,.099],[.073,.028],[0,.02]],.24,h,.04,24);
  for(let z of [-.19,.19])beam('darkWood',[.46,.13,z],[.22,.174,z],.044,.043);
 }
 // Centre even the overhanging lever at the horizontal scene origin.
 const g=b.build(id);const bounds=new T.Box3().setFromObject(g);const mid=bounds.getCenter(new T.Vector3());for(const o of g.children)o.geometry.translate(-mid.x,-bounds.min.y,-mid.z);return g;
}
export const dairyModules=[{id,name:'Weighted lever cheese press',category:'dairy',description:'Twin-cheek timber press with a staved cheese mould, fitted follower, suspended fieldstone and nested whey bowls.',build:buildPress}];
