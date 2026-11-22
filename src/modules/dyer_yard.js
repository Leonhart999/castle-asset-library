// Dyer’s yard: two independent props, deterministic revision 0..3.
import * as T from 'three';
import {newBuilder,bevelBox,lathe} from '../lib/kit.js';import {box,boxUV,rod} from '../lib/geo.js';
const rack='dyer_skein_horse', kettle='dyer_set_pot';
function kit(M,rev,extra={}){const b=newBuilder(new Proxy(extra,{get:(o,k)=>o[k]??M[k]}));const V=a=>new T.Vector3(...a);return {b,
 board(m,a,c,w,d){let v=V(c).sub(V(a)),g=rev?bevelBox(w,v.length(),d,.006,1):box(w,v.length(),d);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()));b.add(m,g,V(a).lerp(V(c),.5).toArray());},
 pin(m,a,c,r,n){b.add(m,rod(a,c,r,rev===3?n:32));},
 finish(id){let g=b.build(id),bb=new T.Box3().setFromObject(g),ctr=bb.getCenter(new T.Vector3());for(let o of g.children)o.geometry.translate(-ctr.x,-bb.min.y,-ctr.z);return g;}};}
function tint(src,name,color){let m=src.clone();m.name=name;m.color.set(color);return m;}
export function skeins(M,rev=3){const {b,pin,board,finish}=kit(M,rev,{red:tint(M.linen,'madder_yarn',0xaf5537),gold:tint(M.linen,'weld_yarn',0xc6a34f),blue:tint(M.linen,'woad_yarn',0x416780)});
 for(const x of [-.875,.875]){if(rev){for(let s of [-1,1])board('oak',[x,.014,s*.366],[x,1.483,-s*.038],.085,.077);board('darkWood',[x,.40,-.269],[x,.40,.269],.049,.057);}else board('oak',[x,.02,0],[x,1.46,0],.085,.077);}
 pin('darkWood',[-1.02,1.394,0],[1.02,1.394,0],.045,18);
 if(rev){board('darkWood',[-.91,.402,0],[.91,.402,0],.061,.067);for(let x of [-.875,.875])pin('iron',[x-.06,1.39,0],[x+.06,1.39,0],.013,8);}
 // Each strand travels up the back, over the pole, down the front and around a free bottom bight.
 const materials=['blue','red','gold'];let idx=0;
 for(let cx of [-.57,-.014,.494]){let n=rev>=2?15:5, bottom=[.50,.655,.56][idx],m=rev>=2?materials[idx]:'linen';for(let j=0;j<n;j++){
 let u=j/(n-1)-.5, R=.056+.011*Math.cos(u*6), bot=bottom+.068*u*u+.014*Math.sin(j*1.2),spread=.31;
 let pts=[];for(let i=0;i<12;i++){let a=Math.PI*i/11;pts.push(new T.Vector3(cx+u*spread,1.394+R*Math.sin(a),R*Math.cos(a)));}
 for(let i=0;i<11;i++){let a=Math.PI*i/10;pts.push(new T.Vector3(cx+u*.16+.016*Math.cos(cx*5),bot-.078*Math.sin(a),-.07*Math.cos(a)+.018));}
 // add intermediate twists, avoiding straight cords with identical profiles.
 pts.splice(12,0,new T.Vector3(cx+u*.22+.02,bot*.42+1.394*.58,-.053+.034*Math.sin(u*3)));
 pts.push(new T.Vector3(cx+u*.21-.013,bot*.58+1.394*.42,.062+.035*Math.sin(u*3)));
 let curve=new T.CatmullRomCurve3(pts,true,'centripetal');b.add(m,new T.TubeGeometry(curve,rev===3?36:100,rev>=2?.009:.017,rev===3?5:9,true));}
 if(rev>=2){for(let j=0;j<2;j++){let pts=[];for(let k=0;k<12;k++){let a=2*Math.PI*k/12;pts.push(new T.Vector3(cx+.104*Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**.68,bottom+.106+j*.009+.004*Math.sin(a),.015+.083*Math.sign(Math.sin(a))*Math.abs(Math.sin(a))**.58));}b.add('linen',new T.TubeGeometry(new T.CatmullRomCurve3(pts,true),rev===3?24:48,.004,rev===3?5:9,true));}}
 idx++;}return finish(rack);}
export function dyePot(M,rev=3){const dye=tint(M.wine,'madder_bath',0x642e24);dye.roughness=.24;const copper=tint(M.gilt,'dark_hammered_copper',0xa96543);copper.metalness=.77;
 const {b,pin,board,finish}=kit(M,rev,{dye,copper});
 function turn(m,prof,n=32){b.add(m,lathe(prof,rev===3?n:64));}
 // Fired masonry pedestal. The lower front opening is a real recess rather than a black decal.
 const rad=.633;const layers=rev?4:2,N=rev?14:10,dh=.69/layers;
 for(let h=0;h<layers;h++)for(let i=0;i<N;i++){
 const a=2*Math.PI*(i+(h%2)*.5)/N, gap=Math.abs(Math.atan2(Math.sin(a),Math.cos(a)));if(h<layers-1&&gap<.46)continue;
 const da=Math.PI/N-.008, shape=new T.Shape();let ring=[[-da,rad],[0,rad+.001],[da,rad],[da,.475],[0,.475],[-da,.475]];ring.forEach(([d,r],k)=>shape[k?'lineTo':'moveTo'](Math.sin(a+d)*r,-Math.cos(a+d)*r));shape.closePath();let g=new T.ExtrudeGeometry(shape,{depth:dh-.005,bevelEnabled:false});g.rotateX(-Math.PI/2);b.add(h===layers-1?'grindstone':'hearth',boxUV(g),[0,h*dh,0]);}
 turn('copper',[[0,.467],[.315,.467],[.44,.547],[.515,.682],[.524,.835],[.522,.863],[.513,.872],[.499,.858],[.497,.827],[.489,.699],[.422,.567],[.30,.489],[0,.489]],40);
 turn('dye',[[0,.781],[.494,.781],[.494,.786],[0,.786]],40);
 if(rev>=1){turn('copper',[[.509,.838],[.535,.839],[.539,.852],[.534,.866],[.514,.869],[.509,.838]],40);for(let x of [-.508,.508]){let g=new T.TorusGeometry(.082,.013,rev===3?7:12,rev===3?24:48);g.rotateY(Math.PI/2);b.add('iron',g,[x,.78,0]);}}
 if(rev>=2){turn('hearth',[[0,0],[.563,0],[.564,.027],[.53,.042],[0,.042]],28);for(let j=0;j<3;j++){let x=(j-1)*.10;pin('darkWood',[x,.055,.19],[x+.038,.072,.537-j*.031],.038,10);}board('darkWood',[-.18,.656,.025],[.74,.95,.003],.048,.038);board('oak',[-.32,.613,.029],[-.14,.672,.024],.112,.025);for(let x of [-.513,.513])for(let z of [-.075,.075])pin('iron',[x*.98,.802,z],[x*1.028,.802,z],.018,8);}
 return finish(kettle);}
export const dyerModules=[{id:rack,name:'Dyer’s skein horse',category:'dyer',description:'A braced trestle carrying three loose hanks of madder, woad and weld coloured yarn.',build:skeins},{id:kettle,name:'Masonry-set dye kettle',category:'dyer',description:'A rolled-rim copper dyepot seated in a circular masonry furnace with an open stokehole and a stirring paddle.',build:dyePot}];
