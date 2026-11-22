// Bakery kneading trough. A hollow hand-hewn timber shell rather than intersecting boxes.
import * as T from 'three';
import { box,boxUV,rod } from '../lib/geo.js';
import {bevelBox,newBuilder} from '../lib/kit.js';
const id='bakery_kneading_trough';
// Closed transverse polygon walks down the outside and up the inside.
function shell(rev){const p=[],N=rev===3?14:rev?28:6,K=rev===3?8:rev?18:2;
 const rows=[];for(let i=0;i<=K;i++){let t=2*i/K-1, f=1-.19*Math.pow(t,4), row=[];
 for(let inner of [false,true])for(let j=0;j<=N;j++){let a=Math.PI*(inner?1-j/N:j/N);row.push([t*(inner?.842:.896),(rev?1.025:.97)-(inner?.286:.335)*f*Math.sin(a),(.319-(inner?.032:0))*f*Math.cos(a)]);}rows.push(row);}
 function tri(a,b,c){p.push(...a,...b,...c);}
 for(let i=0;i<K;i++)for(let j=0;j<rows[0].length;j++){const k=(j+1)%rows[0].length;tri(rows[i][j],rows[i+1][k],rows[i+1][j]);tri(rows[i][j],rows[i][k],rows[i+1][k]);}
 for(let end of [0,K])for(let inner of [false,true]){const row=rows[end].slice(inner?N+1:0,inner?undefined:N+1);const centre=[(row[0][0]),row[0][1],0];for(let j=0;j<N;j++){if(end===0)tri(centre,row[j+1],row[j]);else tri(centre,row[j],row[j+1]);}}
 // End panels across the top bridge the outer end face to the inset interior end face.
 for(let i of [0,K]){let r=rows[i],a=r[0],b=r[N],c=r[N+1],d=r[2*N+1];if(i===0){tri(a,d,c);tri(a,c,b);}else{tri(a,b,c);tri(a,c,d);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3)); g.computeVertexNormals();return boxUV(g);}
export function buildTrough(M,rev=3){const dough=M.wax.clone();dough.name='floured_dough';dough.color.setHex(0xf3deba);dough.roughness=.94;const b=newBuilder({...M,oak:M.oak,darkWood:M.darkWood,linen:M.linen,dough}),opt=rev===3;
 const block=(key,a,c,w,d)=>{const A=new T.Vector3(...a),C=new T.Vector3(...c),v=C.clone().sub(A);let g=rev?bevelBox(w,v.length(),d,.006,1):box(w,v.length(),d);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()));b.add(key,g,A.lerp(C,.5).toArray());};
 b.add('oak',shell(rev));for(let s of [-1,1]){const x=s*.565;for(let z of [-1,1])block('darkWood',[x,.018,z*(rev?.308:.185)],[x,.716,z*.151],.102,.092);if(rev){block('oak',[x,.29,-.255],[x,.29,.255],.065,.066);const sh=new T.Shape();sh.moveTo(-.225,.65);sh.lineTo(.225,.65);for(let j=0;j<=20;j++){let z=.225-.45*j/20;const f=1-.19*(x/.896)**4;sh.lineTo(z,1.025-.335*f*Math.sqrt(1-(z/(.319*f))**2)+.004);}sh.closePath();const cradle=new T.ExtrudeGeometry(sh,{depth:.09,bevelEnabled:false});cradle.rotateY(-Math.PI/2);b.add('oak',boxUV(cradle),[x+.045,0,0]);}}
 if(rev){block('darkWood',[-.65,.309,0],[.65,.309,0],.077,.082);for(const x of [-.604,.604])b.add('darkWood',rod([x,.288,-.055],[x,.335,.054],.011,opt?8:24));}
 if(rev>=2){for(let i=0;i<3;i++){let g=new T.SphereGeometry(1,opt?18:36,opt?10:24);const p=g.attributes.position;for(let k=0;k<p.count;k++){let x=p.getX(k),y=p.getY(k),z=p.getZ(k);let f=1+.053*Math.sin(4*x+2*z+i)*Math.cos(4*z-y);p.setXYZ(k,x*.147*f,y*.082*f,z*.128*f);}g.computeVertexNormals();b.add('dough',g,[.11+i*.232,.818+(.01*i),i%2?.063:-.027]);}
 // Cloth over the left rim follows a separate inner-to-outer path and drapes below the lip.
 const route=[[-.14,.805],[-.21,.84],[-.263,.913],[-.286,1.015],[-.30,1.034],[-.32,1.032],[-.332,1.009],[-.333,.945],[-.32,.837],[-.312,.751]];
 const p=[],uv=[],ns=opt?22:40;function v(i,j){let t=i/ns,u=j/(route.length-1),[z,y]=route[j];let x=-.741+t*.487+.009*Math.sin(u*4),f=1-.19*(x/.896)**4;let a=[.58,.81,1.10,1.48][j];if(j<4){const fi=1-.19*(x/.842)**4;return [x,1.025-.286*fi*Math.cos(a)+.012,.287*fi*Math.sin(a)-.008];}return [x,y+.011+.002*Math.sin(t*22+u),(-z)*f+(j>=6?.010+.007*Math.cos(t*28+u):0)];}
 for(let i=0;i<ns;i++)for(let j=0;j<route.length-1;j++)for(const [k,l] of [[i,j],[i+1,j],[i+1,j+1],[i,j],[i+1,j+1],[i,j+1]]){let q=v(k,l);p.push(...q);uv.push(q[0],l*.07);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();b.add('linen',g);
 }
 let g=b.build(id);for(const c of g.children)if(c.material===M.linen){c.material=c.material.clone();c.material.side=T.DoubleSide;}
 const bb=new T.Box3().setFromObject(g),mid=bb.getCenter(new T.Vector3());for(const c of g.children)c.geometry.translate(-mid.x,-bb.min.y,-mid.z);return g;}
export const bakeryModules=[{id,name:'Baker’s kneading trough',category:'bakery',description:'Hollow oak dough trough on splayed trestles, with a draped linen cloth and three pieces of dough.',build:buildTrough}];
