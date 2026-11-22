// Hall musicians' instruments. Freestanding harp in XY; table psaltery in XZ.
import * as T from 'three';import {newBuilder,bevelBox} from '../lib/kit.js';import {boxUV,rod} from '../lib/geo.js';
const harp='minstrel_pillar_harp',psaltery='minstrel_table_psaltery';
function shape(pts){let s=new T.Shape();pts.forEach(([x,y],i)=>s[i?'lineTo':'moveTo'](x,y));s.closePath();return s;}
function profile(s,d,q=1){let g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:false,curveSegments:q});g.translate(0,0,-d/2);return boxUV(g);}
function finish(b,id){let g=b.build(id),bb=new T.Box3().setFromObject(g),ctr=bb.getCenter(new T.Vector3());for(const m of g.children)m.geometry.translate(-ctr.x,-bb.min.y,-ctr.z);return g;}
function line(b,m,a,c,r,n){b.add(m,rod(a,c,r,n));}
function ellipseRing(b,mat,p,rx,ry,r,n,wire){let g=new T.TorusGeometry(1,r/ry,wire,n);g.scale(rx,ry,ry);b.add(mat,g,p);}
export function buildHarp(M,v=3){const b=newBuilder(M),opt=v===3;
 // Soundbox widens toward heel; separate front panel shares the shell outline.
 const outer=[[-.363,.056],[-.237,.047],[.315,.786],[.277,.838],[.203,.81],[-.388,.159]];
 const shell=shape(outer),face=shape(outer);if(v>=2)for(let t of [.18,.48,.78]){let x=-.32+.564*t,y=.122+.687*t;for(let panel of [shell,face]){let cut=new T.Path();cut.absellipse(x,y,.009,.016,0,2*Math.PI,true,0);panel.holes.push(cut);}}b.add('darkWood',profile(shell,.166,opt?12:28));b.add('oak',profile(face,.014,opt?12:28),[0,0,.089]);
 let pillar=new T.Shape();pillar.moveTo(-.348,.099);pillar.lineTo(-.401,.13);if(v){pillar.bezierCurveTo(-.423,.48,-.442,.871,-.365,1.139);pillar.quadraticCurveTo(-.338,1.196,-.308,1.19);pillar.lineTo(-.308,1.115);pillar.bezierCurveTo(-.344,.86,-.339,.53,-.302,.153);}else{pillar.lineTo(-.396,1.164);pillar.lineTo(-.31,1.164);pillar.lineTo(-.30,.153);}pillar.closePath();b.add('darkWood',profile(pillar,.107,opt?12:32));
 let N=42;function yneck(t){return 1.154-.33*t+(v?.068*Math.sin(t*2*Math.PI)*Math.sin(t*Math.PI):0);}
 let pts=[];for(let i=0;i<=N;i++)pts.push([-.35+.649*i/N,yneck(i/N)+.047]);for(let i=N;i>=0;i--)pts.push([-.35+.649*i/N,yneck(i/N)-.043]);b.add('oak',profile(shape(pts),.116));
 const count=v>=2?21:8;for(let j=0;j<count;j++){let t=.069+.839*j/(count-1),x=-.35+.649*t,up=yneck(t),lo=.132+(x+.34)*1.148;line(b,'linen',[x,lo,.102],[x,up,.067],.0023,opt?5:20);
 if(v>=2){line(b,'gilt',[x,up,-.065],[x,up,.07],.007,opt?8:24);line(b,'darkWood',[x-.009,up,-.074],[x+.009,up,-.074],.006,opt?7:20);line(b,'gilt',[x,lo,.094],[x,lo,.106],.004,opt?6:16);}}
 if(v){for(let z of [-.095,.095])b.add('darkWood',bevelBox(.261,.046,.087,.008),[-.29,.024,z]);}
 if(v>=2){for(let s of [-1,1])for(let j=0;j<3;j++){let y=.214+j*.315,x=-.365-.018*Math.sin(j*Math.PI*.5);let poly=shape([[x-.014,y],[x,y+.036],[x+.014,y],[x,y-.036]]);b.add('gilt',profile(poly,.003),[0,0,s*.054]);}for(let t of [.18,.48,.78]){let x=-.32+.564*t,y=.122+.687*t;ellipseRing(b,'gilt',[x,y,.098],.011,.018,.002,opt?12:36,opt?5:10);}}
 return finish(b,harp);}
export function buildPsaltery(M,v=3){const b=newBuilder(M),opt=v===3;const outline=[[-.42,-.242],[.42,-.242],[.288,.196],[.244,.235],[-.244,.235],[-.288,.196]];
 // Map drawing y to world -Z by rotating the lid into the horizontal plane.
 function deck(mat,cont,y,d,holes=[]){let s=shape(cont);for(const [x,z,r] of holes){let h=new T.Path();h.absarc(x,z,r,0,Math.PI*2,true);s.holes.push(h);}let g=profile(s,d,opt?18:46);g.rotateX(-Math.PI/2);b.add(mat,g,[0,y+d/2,0]);}
 deck('darkWood',outline,.021,.015);for(let i=0;i<outline.length;i++){let a=outline[i],c=outline[(i+1)%outline.length],dx=c[0]-a[0],dy=c[1]-a[1],L=Math.hypot(dx,dy);let g=bevelBox(L,.061,.016,.003);g.rotateY(Math.atan2(dy,dx));b.add('darkWood',g,[(a[0]+c[0])/2,.065,-(a[1]+c[1])/2]);}
 deck('oak',outline,.091,.012,v?[[-.13,.008,.052],[.13,.008,.052]]:[]);
 for(let x of [-.22,.22])b.add('darkWood',bevelBox(.07,.023,.335,.004),[x,.0115,0]);
 if(v){for(let x of [-.13,.13]){let g=new T.TorusGeometry(.053,.003,opt?5:10,opt?32:72);g.rotateX(Math.PI/2);b.add('gilt',g,[x,.105,-.008]);for(let i=0;i<6;i++){let a=i*Math.PI/3,cx=x+.017*Math.sin(a),cz=-.008+.017*Math.cos(a);let petal=new T.TorusGeometry(.017,.0024,opt?5:10,opt?16:42);petal.scale(.63,1.58,1);petal.rotateZ(-a);petal.rotateX(Math.PI/2);b.add('oak',petal,[cx,.101,cz]);}}}
 function half(z){return .41-(.242-z)*.29;}
 for(let sign of [-1,1]){let a=[sign*(half(-.175)-.042),.116,-.175],c=[sign*(half(.194)-.042),.116,.194];let g=bevelBox(.022,.025,Math.hypot(a[0]-c[0],a[2]-c[2]),.003);g.rotateY(Math.atan2(c[0]-a[0],c[2]-a[2]));b.add('darkWood',g,[(a[0]+c[0])/2,.114,(a[2]+c[2])/2]);}
 const count=v>=2?15:7;for(let j=0;j<count;j++){let z=-.163+j*.348/(count-1),h=half(z)-.018;line(b,'gilt',[-h,.127,z],[h,.127,z],.0016,opt?5:20);if(v>=2)for(let s of [-1,1]){line(b,'iron',[s*h,.102,z],[s*h,.133,z],.0055,opt?7:20);line(b,'gilt',[s*h,.129,z-.006],[s*h,.129,z+.006],.0035,opt?6:20);}}
 return finish(b,psaltery);}
export const musicModules=[{id:harp,name:'Bowed-pillar hall harp',category:'music',description:'Standing timber harp with 21 individual strings, bronze pins, curved pillar and diamond inlay.',build:buildHarp},{id:psaltery,name:'Double-rosette table psaltery',category:'music',description:'Trapezoidal plucked zither with fifteen brass strings, open rosettes and low bridge rails.',build:buildPsaltery}];
