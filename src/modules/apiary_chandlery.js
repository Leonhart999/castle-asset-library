// Abbey garden and chandlery. All dimensions are metres; pass stage 0..3 for a reproducible iteration.
import * as T from 'three';import {newBuilder,lathe,bevelBox} from '../lib/kit.js';import {box,rod} from '../lib/geo.js';
function shop(M,stage){const b=newBuilder(M), opt=stage===3;return {b,opt,
 block(k,p,w,h,d){b.add(k,stage?bevelBox(w,h,d,.006,1):box(w,h,d),p);},
 rod(k,a,c,r,n=10){b.add(k,rod(a,c,r,opt?n:24));},
 line(k,points,r,n,s=6,closed=false){let path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed);b.add(k,new T.TubeGeometry(path,n,r,s,closed));},
 finish(id){let g=b.build(id),bb=new T.Box3().setFromObject(g),mid=bb.getCenter(new T.Vector3());for(let mesh of g.children)mesh.geometry.translate(-mid.x,-bb.min.y,-mid.z);return g;}};}
const hive='apiary_straw_skep',candles='chandlery_taper_carousel';
export function buildSkep(M,stage=3){const {b,opt,block,rod:stick,line,finish}=shop(M,stage);const y0=.354;
 for(let x of [-.218,.218])for(let z of [-.195,.195])block('oak',[x,.151,z],.067,.302,.064);
 for(let i=-2;i<=2;i++)block('oak',[i*.113,.326,0],.111,.048,.603);
 if(stage){for(let x of [-.218,.218])block('darkWood',[x,.280,0],.077,.054,.49);for(let z of [-.195,.195])block('darkWood',[0,.18,z],.49,.05,.051);}
 const R=t=>.257*Math.cos(Math.PI*.5*Math.pow(t,1.72))**.75;const n=stage?16:9,step=.455/n;
 // Concentric packed courses with their own relief; notch the lowest courses at the flight entrance.
 for(let i=0;i<n;i++){let t=i/n,r=R(t),y=y0+step*(i+.51),gap=i===0?.20:i===1?.15:0;let arc=2*Math.PI-2*gap;let g=new T.TorusGeometry(r,step*.61,opt?7:12,opt?44:80,arc);g.rotateX(Math.PI/2);g.rotateY(-gap-Math.PI/2);b.add('straw',g,[0,y,0]);if(gap){for(let s of [-1,1]){let plug=new T.CircleGeometry(step*.61,opt?7:12);plug.rotateY(s<0?Math.PI/2-gap:-Math.PI/2+gap);b.add('straw',plug,[s*r*Math.sin(gap),y,r*Math.cos(gap)]);}}}
 if(stage){const radius=t=>Math.max(.0001,R(Math.max(0,t-.45/n))-.013);for(let [lo,hi,gap] of [[0,2/n,.21],[2/n,1,0]]){let pts=[];for(let j=0;j<=16;j++){let t=lo+(hi-lo)*j/16;pts.push(new T.Vector2(radius(t),y0+.455*t));}b.add('straw',new T.LatheGeometry(pts,opt?36:72,gap,Math.PI*2-2*gap));}}
 b.add('straw',lathe([[0,0],[.089,0],[.068,.025],[.035,.040],[0,.042]],opt?24:48),[0,y0+.428,0]);
 if(stage>=2){for(let i=0;i<n-1;i+=2){let count=Math.max(6,Math.round(19*(R(i/n)/.257)));for(let j=0;j<count;j++){
 let a=j*2*Math.PI/count+(i%4)*.075;if(i===0&&Math.cos(a)>.94)continue;let pts=[];for(let k=0;k<5;k++){let f=k/4,u=(i+.25+1.72*f)/n,angle=a+.068*f;let r=R(Math.max(0,u-.5/n))+.003+.013*Math.sin(Math.PI*f);pts.push([r*Math.sin(angle),y0+.455*u,r*Math.cos(angle)]);}line('linen',pts,.0036,opt?4:10,opt?4:7);}}
 // A low landing board meets the opening under the first two coils.
 block('darkWood',[0,.348,.287],.139,.014,.156);
 for(let x of [-.218,.218])for(let z of [-.195,.195])stick('darkWood',[x,.345,z],[x,.351,z],.008,8);}
 return finish(hive);}
export function buildCarousel(M,stage=3){const {b,opt,block,rod:stick,line,finish}=shop(M,stage);
 block('darkWood',[0,.040,0],.71,.080,.126);for(let z of [-.207,.207])block('darkWood',[0,.04,z],.128,.08,.287);
 const base=stage?[[0,0],[.098,0],[.098,.07],[.069,.10],[.055,.18],[.043,1.21],[.053,1.25],[.065,1.27],[.063,1.30],[.034,1.32],[0,1.32]]:[[0,0],[.053,0],[.053,1.3],[0,1.3]];b.add('oak',lathe(base,opt?18:40),[0,.08,0]);
 const top=1.31,N=stage?6:4;for(let i=0;i<N;i++){let a=2*Math.PI*i/N;let at=(r,y,q=0)=>[r*Math.sin(a)+q*Math.cos(a),y,r*Math.cos(a)-q*Math.sin(a)];stick('darkWood',at(.024,top),at(.407,top+.023),.017,10);
 if(stage)stick('oak',at(.044,top-.174),at(.29,top+.009),.012,8);
 const stations=stage>=2?[.21,.35]:[.31];for(let j=0;j<stations.length;j++){
 let r=stations[j],sag=top+.017*r/.4+.018,yTop=sag-.044,d=(.266+.025*Math.sin(2*i+j));
 for(let sign of [-1,1]){let foot=yTop-d-.017*(sign===1);let pt=at(r,foot,sign*.029);
 const prof=stage>=2?[[0,0],[.009,0],[.013,.006],[.014,.026],[.012,d*.59],[.009,d*.9],[.006,d],[.002,d+.008],[0,d+.008]]:[[0,0],[.013,0],[.009,d],[0,d]];b.add('wax',lathe(prof,opt?10:32),pt);
 if(stage>=2){let end=at(r,foot+d+.008,sign*.029);line('linen',[end,at(r,sag-.017,sign*.021),at(r,sag,0)],.0028,opt?6:16,opt?4:7);}}
 }}
 if(stage>=2){b.add('iron',lathe([[0,0],[.378,0],[.394,.011],[.414,.043],[.406,.045],[.385,.018],[.365,.012],[0,.012]],opt?40:72),[0,.656,0]);for(let i=0;i<7;i++){let a=i*2.41,r=.16+.031*(i%5);b.add('wax',lathe([[0,0],[.013+i%3*.006,0],[.018,.004],[.008,.008],[0,.008]],opt?10:24),[Math.sin(a)*r,.668,Math.cos(a)*r]);}b.add('iron',lathe([[.045,0],[.060,0],[.06,.04],[.045,.045]],opt?16:36),[0,.618,0]);}
 return finish(candles);}
export const apiaryModules=[{id:hive,name:'Coiled straw skep on stool',category:'apiary',description:'Raised oak hive stool with a coiled straw dome, hand-sewn binding and a notched flight entrance.',build:buildSkep},{id:candles,name:'Chandler’s hanging taper carousel',category:'chandlery',description:'Six radial arms support paired hand-dipped tapers above a shallow iron drip tray.',build:buildCarousel}];
