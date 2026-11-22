// Herb court. Two independently registered, staged props; reproducible placement, no random seeds.
import * as T from 'three';import {newBuilder,bevelBox,lathe} from '../lib/kit.js';import {box,boxUV,rod} from '../lib/geo.js';
const rack='herbarium_drying_tree',bed='physic_garden_wattle_bed';
function kit(M,s){let mat=(src,name,color)=>{let m=src.clone();m.name=name;m.color.setHex(color);m.map=null;m.side=T.DoubleSide;return m;};let b=newBuilder(new Proxy({sage:mat(M.linen,'sage_leaf',0x85966b),herb:mat(M.linen,'green_leaf',0x53683d),bud:mat(M.fabric,'dried_flower',0x876992),soil:mat(M.hearth,'garden_earth',0x504132)},{get:(o,k)=>o[k]??M[k]})),opt=s===3;
 const stick=(m,a,c,r,n=8)=>b.add(m,rod(a,c,r,opt?n:20));const B=(m,p,w,h,d)=>b.add(m,s?bevelBox(w,h,d,.005,1):box(w,h,d),p);
 function leaf(m,a,d,w,tilt){const A=new T.Vector3(...a),D=new T.Vector3(...d),side=new T.Vector3(Math.cos(tilt),0,Math.sin(tilt)),ridge=new T.Vector3(-Math.sin(tilt)*w*.19,w*.26,Math.cos(tilt)*w*.19);let verts=[],uv=[];function p(t,q){let v=A.clone().addScaledVector(D,t).addScaledVector(side,q*w*Math.sin(t*Math.PI)).addScaledVector(ridge,(1-Math.abs(q))*Math.sin(t*Math.PI));v.y+=Math.sin(t*Math.PI)*D.length()*.16;return v.toArray();}const seg=opt?5:9;for(let i=0;i<seg;i++)for(let j=-1;j<1;j++)for(let [u,v] of [[i,j],[i+1,j],[i+1,j+1],[i,j],[i+1,j+1],[i,j+1]]){verts.push(...p(u/seg,v));uv.push(u/seg,(v+1)/2);}let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();b.add(m,g);}
 const finish=id=>{let g=b.build(id),bb=new T.Box3().setFromObject(g),mid=bb.getCenter(new T.Vector3());for(let o of g.children)o.geometry.translate(-mid.x,-bb.min.y,-mid.z);return g;};return {b,opt,B,stick,leaf,finish};}
export function herbTree(M,s=3){const {b,opt,B,stick,leaf,finish}=kit(M,s);B('oak',[0,.043,0],.70,.086,.108);for(let z of [-.207,.207])B('oak',[0,.043,z],.111,.086,.31);
 b.add('darkWood',lathe([[0,.075],[.073,.075],[.072,.172],[.047,.206],[.041,1.47],[.058,1.51],[.043,1.54],[.024,1.55],[0,1.55]],opt?18:40));
 const H=1.36,R=.43,N=s?8:4;let ring=new T.TorusGeometry(R,.021,opt?7:14,opt?56:96);ring.rotateX(Math.PI/2);b.add('oak',ring,[0,H,0]);
 for(let i=0;i<N;i++){let a=i*2*Math.PI/N,at=(r,y)=>[r*Math.sin(a),y,r*Math.cos(a)];if(i%2===0||!s)stick('oak',at(0,H+.005),at(R,H),.015,10);
 if(s&&i%2===0)stick('linen',at(.027,1.516),at(R,H+.012),.005,6);
 let [X,,Z]=at(R,H),Y=H-.094,h=.214+.070*(.5+.5*Math.sin(i*7));stick('linen',[X,H+.015,Z],[X,Y,Z],.005,6);
 let branches=s>=2?5:2;for(let j=0;j<branches;j++){let angle=a+j*2*Math.PI/branches+.37,dx=.071*Math.cos(angle),dz=.071*Math.sin(angle),dy=-h*(.85+.15*Math.cos(j));stick('herb',[X,Y+.019,Z],[X+dx,Y+dy,Z+dz],.0035,5);
 for(let q=1;q<=(s>=2?4:2);q++){let t=.16+q*.155,root=[X+dx*t,Y+dy*t,Z+dz*t];for(const side of [-1,1]){let u=angle+side*.85;leaf(i%2?'sage':'herb',root,[.042*Math.cos(u),-.052,.042*Math.sin(u)],i%2?.012:.018,u+Math.PI/2);}}
 if(s>=2&&i%3===1){let g=new T.SphereGeometry(1,opt?7:16,opt?5:12);g.scale(.011,.024,.011);b.add('bud',g,[X+dx,Y+dy-.005,Z+dz]);}}
 if(s>=2){let tie=new T.TorusGeometry(.023,.003,opt?5:10,opt?14:28);tie.rotateY(a+Math.PI/2);b.add('linen',tie,[X,H,Z]);let g=new T.TorusGeometry(.014,.003,opt?5:9,opt?12:24);g.rotateX(Math.PI/2);b.add('linen',g,[X,Y-.018,Z]);}}
 return finish(rack);}
export function wattleBed(M,s=3){const {b,opt,stick,leaf,finish}=kit(M,s);let R=.515,N=s?17:10,layers=s?8:4;let dirt=lathe([[0,.006],[.49,.006],[.502,.158],[.491,.183],[.41,.194],[.22,.202],[0,.203]],opt?34:72);b.add('soil',dirt);
 for(let i=0;i<N;i++){let a=i*2*Math.PI/N,r=R+.003*Math.cos(3*a);stick('darkWood',[R*.97*Math.sin(a),0,R*.97*Math.cos(a)],[r*Math.sin(a),.252+.011*Math.sin(5*a),r*Math.cos(a)],.013,8);}
 // Two staggered reed courses per weave repeat. Odd number of stakes flips the side on each revolution.
 const pts=[];for(let i=0;i<=layers*N*3;i++){let turns=i/(N*3),a=turns*2*Math.PI,r=R-.006+.03*Math.cos(N*a/2);pts.push(new T.Vector3(r*Math.sin(a),.013+.027*turns,r*Math.cos(a)));}b.add('oak',new T.TubeGeometry(new T.CatmullRomCurve3(pts),opt?layers*N*3:layers*N*6,.014,opt?6:12,false));
 const plants=s>=2?9:3;for(let i=0;i<plants;i++){let a=i*2.399963,r=.121*Math.sqrt(i),x=Math.sin(a)*r,z=Math.cos(a)*r,Y=.19;let n=s>=2?8:4;
 for(let j=0;j<n;j++){let u=j*2*Math.PI/n+i,dist=.098+.03*Math.sin(j*3+i),height=.101+.061*Math.cos(i*2+j);leaf(i%3?'herb':'sage',[x,Y,z],[dist*Math.cos(u),height,dist*Math.sin(u)],.028+(i%3)*.004,u+Math.PI/2);}
 if(s>=2&&i%3===1){stick('herb',[x,Y,z],[x+.014,Y+.22,z],.0035,5);for(let k=0;k<6;k++){let u=k*2.4,g=new T.SphereGeometry(1,opt?7:16,opt?4:10);g.scale(.009,.017,.009);b.add('bud',g,[x+.014+.011*Math.sin(u),Y+.158+k*.013,z+.011*Math.cos(u)]);stick('herb',[x+.014,Y+.149+k*.010,z],[x+.014+.011*Math.sin(u),Y+.158+k*.013,z+.011*Math.cos(u)],.0025,5);}}}
 return finish(bed);}
export const herbCourtModules=[{id:rack,name:'Herbalist’s radial drying tree',category:'herbarium',description:'Freestanding drying crown with cord stays and eight suspended, tied herb bunches.',build:herbTree},{id:bed,name:'Wattle-edged physic garden bed',category:'garden',description:'A low round garden bed with continuous basketry, seventeen stakes and nine leaf rosettes.',build:wattleBed}];
