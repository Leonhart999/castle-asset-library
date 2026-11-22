// Spinning room: two independent exhibits. Revision 0–3 metrics are reproducible.
import * as T from 'three';import {newBuilder,lathe,bevelBox} from '../lib/kit.js';import {box,rod} from '../lib/geo.js';
const wheel='spinning_great_wheel',distaff='spinning_flax_distaff';
function tools(M,s){const b=newBuilder(M),opt=s===3;
 function stick(m,a,c,r,n=10){b.add(m,rod(a,c,r,opt?n:32));}
 function bar(m,a,c,w,d){let A=new T.Vector3(...a),C=new T.Vector3(...c),v=C.clone().sub(A);let g=s?bevelBox(w,v.length(),d,.007,1):box(w,v.length(),d);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()));b.add(m,g,A.lerp(C,.5).toArray());}
 function cord(m,pts,r,n,k,closed=false){b.add(m,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p)),closed),n,r,k,closed));}
 function finish(id){let g=b.build(id),bb=new T.Box3().setFromObject(g),mid=bb.getCenter(new T.Vector3());for(const o of g.children)o.geometry.translate(-mid.x,-bb.min.y,-mid.z);return g;}
 return {b,opt,stick,bar,cord,finish};}
export function greatWheel(M,s=3){const {b,opt,stick,bar,cord,finish}=tools(M,s),cx=-.365,cy=1.036,R=.551,z=.161;
 bar('oak',[-.769,.493,0],[.925,.636,0],.12,.163);for(const [x,h] of [[-.58,.496],[.72,.612]])for(let side of [-1,1])bar('darkWood',[x+(s?(x<0?-.10:.08):0),.015,side*(s?.287:.12)],[x,h,side*.047],.072,.073);
 bar('oak',[cx,.506,-.085],[cx,1.138,-.085],.089,.092);
 for(let i=0;i<(s?12:6);i++){let a=2*Math.PI*i/(s?12:6),start=[cx+.054*Math.sin(a),cy+.054*Math.cos(a),z],end=[cx+(R-.016)*Math.sin(a),cy+(R-.016)*Math.cos(a),z];stick('oak',start,end,.014,opt?8:24);if(s>=2){let pt=t=>start.map((v,k)=>v+(end[k]-v)*t);stick('darkWood',pt(.14),pt(.21),.018,8);}}
 function ring(r,t,dx=0){b.add('darkWood',new T.TorusGeometry(r,t,opt?8:16,opt?64:112),[cx,cy,z+dx]);}
 ring(R,.024);if(s){ring(R+.002,.013,.019);ring(R+.002,.013,-.019);}
 stick('darkWood',[cx,cy,-.149],[cx,cy,.217],.054,18);stick('iron',[cx,cy,.212],[cx,cy,.241],.026,12);
 const hx=.811,hy=.833,hr=.038;for(let v of [-.074,.241])bar('oak',[hx,.625,v],[hx,.849,v],.058,.053);
 stick('iron',[hx,hy,-.159],[hx,hy,.376],.011,10);stick('darkWood',[hx,hy,.13],[hx,hy,.193],hr,20);
 if(s>=2){let cop=lathe([[0,0],[.016,0],[.032,.027],[.034,.056],[.029,.08],[.012,.108],[0,.113]],opt?14:36);cop.rotateX(Math.PI/2);b.add('linen',cop,[hx,hy,.264]);
 // An external tangent belt: the small whorl and the wheel share one Z plane.
 let dx=hx-cx,dy=hy-cy,ang=Math.atan2(dy,dx),span=Math.acos((R+.023-hr)/Math.hypot(dx,dy));let pts=[];function arc(x,y,r,a,q,n){for(let i=0;i<=n;i++){let u=a+(q-a)*i/n;pts.push([x+r*Math.cos(u),y+r*Math.sin(u),z]);}}
 arc(cx,cy,R+.023,ang+span,ang+2*Math.PI-span,opt?36:68);arc(hx,hy,hr+.003,ang-span,ang+span,opt?10:22);
 // Linear segments on the tangent runs avoid spline overshoot around the small pulley.
 for(let i=0;i<pts.length;i++)stick('linen',pts[i],pts[(i+1)%pts.length],.004,opt?5:12);
 for(let x of [-.58,.72])stick('darkWood',[x,.18,-.235],[x,.18,.235],.024,8);}
 return finish(wheel);}
export function flaxDistaff(M,s=3){const flax=M.linen.clone();flax.name='unbleached_flax_stricks';flax.color.setHex(0xd7bd80);const {b,opt,stick,bar,cord,finish}=tools(new Proxy({flax},{get:(o,k)=>o[k]??M[k]}),s);const y=.665;
 b.add('darkWood',lathe([[0,.086],[.099,.086],[.105,.112],[.076,.153],[.041,.179],[.032,.612],[.047,.654],[.04,.681],[.026,.698],[0,.698]],opt?18:40));
 for(let i=0;i<3;i++){let a=i*2*Math.PI/3;bar('oak',[.287*Math.sin(a),.013,.287*Math.cos(a)],[.029*Math.sin(a),.13,.029*Math.cos(a)],.064,.057);}
 stick('oak',[0,y,0],[0,1.527,0],.02,12);
 if(s){for(let i=0;i<6;i++){let a=i*Math.PI/3,at=(r,h)=>[Math.sin(a)*r,h,Math.cos(a)*r];cord('oak',[at(.018,1.068),at(.064,1.25),at(.082,1.39),at(.044,1.525)],.007,opt?9:22,opt?6:12);}}
 // A ridged bundle, not a sphere: broad overlapping flax stricks are bound against the staff.
 const count=s>=2?16:5;for(let i=0;i<count;i++){let a=i*2*Math.PI/count;let wav=.012*Math.sin(i*2.7);let profile=[[0,0],[.013,.024],[.047,.14],[.063,.27],[.042,.384],[.015,.438],[0,.48+wav]];
 let f=lathe(profile,opt?12:32);let p=f.attributes.position;for(let k=0;k<p.count;k++){let h=p.getY(k);p.setX(k,p.getX(k)+(.018+.038*Math.sin(Math.PI*h/.49))*Math.cos(a+h*.62));p.setZ(k,p.getZ(k)+(.018+.038*Math.sin(Math.PI*h/.49))*Math.sin(a+h*.62));}f.computeVertexNormals();b.add('flax',f,[0,1.078+wav,0]);}
 if(s>=2){for(let [h,r] of [[1.178,.085],[1.341,.122],[1.462,.089]]){let pts=[];for(let i=0;i<=40;i++){let a=i*Math.PI*2/40;pts.push([r*Math.sin(a),h+.01*Math.cos(a),r*Math.cos(a)]);}cord('fabric',pts.slice(0,-1),.008,opt?32:66,opt?6:12,true);}
 // Drop spindle hangs by a drafting thread, its clay whorl below the wound yarn.
 const x=.197,z=.111;stick('darkWood',[x,.423,z],[x,.788,z],.009,10);b.add('clay',lathe([[0,0],[.025,0],[.041,.011],[.044,.022],[.03,.034],[0,.036]],opt?16:40),[x,.474,z]);b.add('linen',lathe([[0,0],[.016,0],[.031,.035],[.033,.07],[.021,.122],[.009,.147],[0,.149]],opt?16:36),[x,.513,z]);cord('linen',[[.065,1.155,.035],[.115,1.075,.058],[.161,.912,.084],[x,.785,z]],.0035,opt?8:22,opt?5:10);}
 return finish(distaff);}
export const spinModules=[{id:wheel,name:'Great spindle wheel',category:'spinning',description:'Walking wheel with a tall grooved rim, twelve spokes, a tangent drive cord and a separate spindle whorl.',build:greatWheel},{id:distaff,name:'Loaded floor distaff with drop spindle',category:'spinning',description:'Tripod flax staff with forked crown, bound stricks of fibre and a suspended clay-whorl spindle.',build:flaxDistaff}];
