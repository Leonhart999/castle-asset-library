// A two-place bakery peel horse. Sockets hold the handles; the paddles show above the rack.
import * as T from 'three';import {newBuilder,bevelBox} from '../lib/kit.js';import {box,boxUV,rod} from '../lib/geo.js';
const id='bakery_peel_horse';
export function buildHorse(M,rev=3){const b=newBuilder(M),opt=rev===3;
function plank(m,p,w,h,d){b.add(m,rev?bevelBox(w,h,d,.005,1):box(w,h,d),p);}
for(let x of [-.37,.37]){plank('darkWood',[x,.05,0],.102,.1,rev?.53:.36);plank('oak',[x,.49,-.06],.065,.92,.07);}
for(let [y,z,h] of [[.172,0,.09],[.903,-.061,.063]])plank('oak',[0,y,z],.82,h,.12);
if(rev){for(let x of [-.37,.37])for(let s of [-1,1])b.add('darkWood',rod([x,.09,s*.213],[x,.452,-.062],.026,opt?10:32));}
for(let [i,x] of [[0,-.18],[1,.175]]){let H=i?1.28:1.41, W=i?.146:.178;
 b.push([x,.219,.01],i?.16:-.14,-.036,i?-.038:.033);
 b.add('darkWood',rod([0,0,0],[0,H+.051,0],.021,opt?12:32));
 // Lofted paddle with eased shoulder, thin cutting edge, and rounded nose.
 const path=rev?[[.018,0],[.045,.055],[W*.82,.13],[W,.2],[W,.36],[W*.88,.435],[W*.53,.468],[.012,.481]]:[[.02,0],[W,.13],[W,.43],[.02,.46]];
 const p=[],faces=[];for(const [w,y] of path){let t=.012*(1-.62*y/.481);faces.push([[-w,H+y,-t],[w,H+y,-t],[w,H+y,t],[-w,H+y,t]]);}
 const tri=(a,c,d)=>p.push(...a,...c,...d);for(let j=1;j<faces.length;j++)for(let k=0;k<4;k++){let h=(k+1)%4,a=faces[j-1],c=faces[j];tri(a[k],c[k],c[h]);tri(a[k],c[h],a[h]);}for(let j of [0,faces.length-1]){let a=faces[j];if(j===0){tri(a[0],a[1],a[2]);tri(a[0],a[2],a[3]);}else{tri(a[0],a[2],a[1]);tri(a[0],a[3],a[2]);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.computeVertexNormals();b.add('oak',boxUV(g));
 if(rev>=2){for(let j=0;j<6;j++){const y=H+.004+j*.01;b.add('linen',rod([0,y,0],[0,y+.009,0],.024,opt?12:36));}for(let y of [.17,.26])b.add('darkWood',rod([0,H+y,-.014],[0,H+y,.016],.008,opt?7:28));}
 b.pop();}
 if(rev>=2){for(const x of [-.202,.199]){for(let s of [-1,1])b.add('darkWood',rod([x+s*.044,.904,-.052],[x+s*.044,.925,.085],.012,opt?8:28));}for(const x of [-.37,.37])for(const y of [.17,.904])b.add('iron',rod([x,y,-.065],[x,y,.065],.01,opt?8:24));}
 const g=b.build(id),bb=new T.Box3().setFromObject(g),mid=bb.getCenter(new T.Vector3());for(const o of g.children)o.geometry.translate(-mid.x,-bb.min.y,-mid.z);return g;}
export const peelModules=[{id,name:'Bakery peel horse',category:'bakery',description:'A freestanding trestle with two distinct oak oven peels, tapered blades and bound necks.',build:buildHorse}];
