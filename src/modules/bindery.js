// Scriptorium workshop; two independent models with replayable revisions 0...3.
import * as T from 'three';import {newBuilder,bevelBox,lathe} from '../lib/kit.js';import {box,boxUV,rod} from '../lib/geo.js';
const hide='parchmenter_skin_stretcher',sewing='bindery_sewing_frame';
function toolkit(M,v){const skin=M.wax.clone();skin.color.setHex(0xdbbd8c);skin.map=null;skin.normalScale.set(.22,.22);skin.roughness=.91;skin.name='scraped_parchment';const paper=M.linen.clone();paper.color.setHex(0xf1dcaa);paper.name='folded_vellum';const b=newBuilder(new Proxy({skin,paper},{get:(o,k)=>o[k]??M[k]})),opt=v===3;
 const cub=(m,p,w,h,d)=>b.add(m,v?bevelBox(w,h,d,.005,1):box(w,h,d),p);const stick=(m,a,c,r,n=8)=>b.add(m,rod(a,c,r,opt?n:24));const line=(m,pts,r,n=6)=>b.add(m,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p))),opt?n:20,r,opt?5:10,false));
 const finish=id=>{let g=b.build(id),bb=new T.Box3().setFromObject(g),mid=bb.getCenter(new T.Vector3());for(let o of g.children)o.geometry.translate(-mid.x,-bb.min.y,-mid.z);return g;};return {b,opt,cub,stick,line,finish};}
export function buildHide(M,v=3){const {b,opt,cub,stick,line,finish}=toolkit(M,v),cy=1.19,R=.806;
 for(let x of [-.79,.79]){cub('darkWood',[x,.045,0],.14,.09,v?.76:.4);cub('oak',[x,.664,0],.092,1.245,.094);if(v){for(let z of [-.31,.31])stick('oak',[x,.092,z],[x,.465,0],.032,10);}}cub('darkWood',[0,.233,0],1.57,.077,.062);
 let rim=new T.TorusGeometry(R,.045,opt?9:16,opt?72:128);b.add('oak',rim,[0,cy,0]);
 const polar=(a,r)=>[r*Math.cos(a),cy+r*Math.sin(a)];
 const cnt=v?48:12;let outline=[];function P(a){let r=v?.564+.065*Math.cos(2*a)-.055*Math.cos(4*a)+.066*Math.cos(6*a)+.024*Math.sin(3*a):.56;return polar(a,r);}
 for(let i=0;i<cnt;i++)outline.push(P(2*Math.PI*i/cnt));const sh=new T.Shape(outline.map(([x,y])=>new T.Vector2(x,y)));
 let anchors=[];if(v>=2){for(let i=0;i<18;i++){let a=2*Math.PI*i/18,[x,y]=P(a),d=.026;let X=x-d*Math.cos(a),Y=y-d*Math.sin(a);let hole=new T.Path();hole.absarc(X,Y,.008,0,2*Math.PI,true);sh.holes.push(hole);anchors.push([a,X,Y]);}}
 let shell=new T.ExtrudeGeometry(sh,{depth:.007,bevelEnabled:false,curveSegments:opt?6:16});shell.translate(0,0,-.0035);b.add('skin',boxUV(shell));
 if(v>=1){for(let i=0;i<8;i++){let a=Math.PI*(i+.5)/4;let g=new T.TorusGeometry(.047,.006,opt?5:10,opt?14:28);g.rotateY(Math.PI/2);g.rotateZ(a+Math.PI/2);let [x,y]=polar(a,R);b.add('leather',g,[x,y,0]);}}
 const ties=v>=2?anchors:Array.from({length:8},(_,i)=>{let a=i*Math.PI/4;return [a,...P(a)];});for(let [a,x,y] of ties){if(v>=2){for(let side of [-1,1]){let [xx,yy]=polar(a+side*.028,R+.027);let [mx,my]=polar(a+side*.016,R-.07);line('linen',[[x,y,side*.004],[mx,my,side*.022],[xx,yy,side*.026]],.005,5);}let [a1,b1]=polar(a-.028,R+.027),[a2,b2]=polar(a+.028,R+.027);line('linen',[[a1,b1,-.026],[(a1+a2)/2,(b1+b2)/2,.002],[a2,b2,.026]],.005,5);}else{let [xx,yy]=polar(a,R);stick('linen',[x,y,0],[xx,yy,0],.006,8);}}
 if(v>=2){for(let x of [-.79,.79])stick('iron',[x,cy,-.081],[x,cy,.085],.022,10);}
 return finish(hide);}
export function buildSewing(M,v=3){const {b,opt,cub,stick,line,finish}=toolkit(M,v);
 for(let x of [-.237,.237])cub('darkWood',[x,.025,0],.067,.05,.384);cub('oak',[0,.064,0],.656,.056,.411);
 for(let x of [-.275,.275]){let prof=v?[[0,.085],[.035,.085],[.036,.114],[.026,.144],[.022,.459],[.02,.519],[.014,.54],[0,.543]]:[[0,.085],[.025,.085],[.025,.53],[0,.53]];b.add('darkWood',lathe(prof,opt?16:36),[x,0,-.089]);}
 cub('oak',[0,.448,-.089],.635,.046,.067);
 if(v){for(let x of [-.275,.275]){for(let y of [.407,.476]){let ring=lathe([[.023,0],[.041,0],[.046,.01],[.04,.022],[.023,.022],[.023,0]],opt?8:24);b.add('oak',ring,[x,y,-.089]);}if(v>=2){let pts=[];for(let j=0;j<40;j++){let a=j/39*4*Math.PI;pts.push([x+.02*Math.cos(a),.499+.029*j/39,-.089+.02*Math.sin(a)]);}line('darkWood',pts,.0024,32);}}}
 // Each gathering has its own rounded fold and its own slight fore-edge offset.
 const n=v>=2?11:3;for(let j=0;j<n;j++){let y=.094+j*.0065,z=.02+.004*Math.sin(j*2),x=.002*Math.cos(j*1.7);cub('paper',[x,y+.003,z],.343,.006,.211);stick('paper',[x-.172,y+.003,z-.103],[x+.172,y+.003,z-.103],.004,8);}
 const count=v?5:3;for(let i=0;i<count;i++){let x=-.137+i*.274/(count-1);stick('linen',[x,.087,-.089],[x,.424,-.089],.0045,7);if(v>=2){const yz=[[.421,-.089],[.424,-.119],[.432,-.126],[.465,-.126],[.475,-.118],[.475,-.06],[.467,-.052],[.433,-.052],[.424,-.059]];b.add('linen',new T.TubeGeometry(new T.CatmullRomCurve3(yz.map(([y,z])=>new T.Vector3(x,y,z)),true),opt?24:60,.0038,opt?6:12,true));for(let j=0;j<4;j++){let y=.108+j*.014;line('leather',[[x-.013,y,-.085],[x-.006,y+.002,-.097],[x+.006,y+.004,-.098],[x+.013,y+.007,-.085]],.0025,5);}}}
 if(v>=2){const thread=[[.136,.161,-.086],[.18,.159,-.043],[.195,.10,.024],[.229,.098,.061],[.216,.096,.125],[.183,.096,.132]];line('linen',thread,.002,15);stick('iron',[.139,.095,.112],[.185,.097,.135],.0018,6);}
 const g=finish(sewing);for(const o of g.children)o.geometry.rotateY(Math.PI);return g;}
export const binderyModules=[{id:hide,name:'Parchmenter’s hoop stretcher',category:'bindery',description:'Freestanding braced hoop with a pierced, scraped skin tensioned by eighteen paired laces.',build:buildHide},{id:sewing,name:'Bookbinder’s sewing frame',category:'bindery',description:'Oak frame holding eleven folded gatherings against five raised cords, with tension nuts and a trailing thread.',build:buildSewing}];
