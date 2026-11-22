// Outer court and mews. Stage 0 blockout; 1 structure; 2 finish; 3 mesh budget.
import * as T from 'three';import {newBuilder,lathe,bevelBox} from '../lib/kit.js';import {boxUV,rod} from '../lib/geo.js';
const dovecote='courtyard_post_dovecote',perch='mews_block_perch';
function done(b,id){let g=b.build(id),bb=new T.Box3().setFromObject(g),mid=bb.getCenter(new T.Vector3());for(let m of g.children)m.geometry.translate(-mid.x,-bb.min.y,-mid.z);return g;}
function beam(b,m,a,c,w,d){let A=new T.Vector3(...a),C=new T.Vector3(...c),V=C.clone().sub(A);let g=bevelBox(w,V.length(),d,.006,1);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),V.normalize()));b.add(m,g,A.lerp(C,.5).toArray());}
function path(b,m,points,r,n,rad,loop=false){b.add(m,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),loop),n,r,rad,loop));}
export function buildDove(M,v=3){const b=newBuilder(M),opt=v===3;
 function turn(m,p,n){b.add(m,lathe(p,n));}
 turn('grindstone',[[0,0],[.338,0],[.338,.093],[.303,.118],[.216,.159],[.216,.251],[.196,.273],[0,.273]],8);
 turn('oak',v?[[0,.265],[.14,.265],[.144,.311],[.106,.351],[.098,1.49],[.132,1.555],[.144,1.623],[0,1.623]]:[[0,.265],[.11,.265],[.11,1.623],[0,1.623]],8);
 const R=.56,base=1.622,top=2.35;
 turn('darkWood',[[0,base-.058],[.599,base-.058],[.614,base-.018],[.598,base],[0,base]],6);
 for(let i=0;i<6;i++){let a=(i+.5)*Math.PI/3,at=(r,y,u=0)=>[r*Math.sin(a)+u*Math.cos(a),y,r*Math.cos(a)-u*Math.sin(a)],edge=R/2,plane=R*Math.cos(Math.PI/6);
 if(v)beam(b,'oak',at(.08,1.206),at(.448,base-.047),.066,.07);
 let sh=new T.Shape();sh.moveTo(-edge,0);sh.lineTo(edge,0);sh.lineTo(edge,top-base);sh.lineTo(-edge,top-base);sh.closePath();
 for(let row=0;row<(v?2:1);row++){let y=.093+row*.297,w=.072;let h=new T.Path();h.moveTo(-w,y);h.lineTo(-w,y+.063);h.absarc(0,y+.063,w,Math.PI,0,true);h.lineTo(w,y);h.closePath();sh.holes.push(h);if(v>=2){b.add('darkWood',bevelBox(.194,.025,.116,.005),at(plane+.033,base+y-.01),a);}}
 let wall=new T.ExtrudeGeometry(sh,{depth:.035,bevelEnabled:false,curveSegments:opt?8:20});wall.translate(0,0,-.035);b.add('oak',boxUV(wall),at(plane,base),a);
 if(v>=2){b.add('darkWood',bevelBox(.034,.714,.023,.003),at(plane-.001,base+.362,-edge+.02),a); // staggered partitions prevent seeing daylight through the rear holes
 let d=.18;for(let row=0;row<2;row++){b.add('darkWood',bevelBox(.27,.255,.016,.002),at(plane-d,base+.18+row*.30),a);b.add('oak',bevelBox(.26,.014,d,.003),at(plane-d/2,base+.077+row*.297),a);}}
 }
 turn('darkWood',[[0,top-.02],[.611,top-.02],[.64,top+.012],[.64,top+.04],[0,top+.04]],6);
 turn('roof',[[0,top+.033],[.684,top+.033],[.686,top+.06],[.073,2.834],[0,2.875]],6);
 if(v>=2){for(let i=0;i<6;i++){let a=i*Math.PI/3;line('darkWood',.679,top+.061,.027,2.861,a);}turn('gilt',[[0,2.852],[.045,2.852],[.048,2.879],[.029,2.906],[.039,2.932],[.026,2.961],[0,2.989]],opt?12:32);}
 function line(m,r1,y1,r2,y2,a){b.add(m,rod([r1*Math.sin(a),y1,r1*Math.cos(a)],[r2*Math.sin(a),y2,r2*Math.cos(a)],.013,opt?6:16));}
 return done(b,dovecote);}
export function buildPerch(M,v=3){const turf=M.straw.clone();turf.color.setHex(0x657749);turf.name='woven_rush_pad';let b=newBuilder({oak:M.oak,darkWood:M.darkWood,iron:M.iron,leather:M.leather,linen:M.linen,turf}),opt=v===3;
 const prof=v?[[0,0],[.222,0],[.24,.024],[.237,.066],[.20,.08],[.148,.112],[.128,.151],[.114,.202],[.087,.233],[.079,.332],[.085,.371],[.135,.412],[.163,.442],[.16,.47],[0,.47]]:[[0,0],[.205,0],[.197,.09],[.10,.13],[.091,.37],[.16,.428],[.16,.47],[0,.47]];b.add('oak',lathe(prof,opt?36:72));
 b.add('turf',lathe([[0,.458],[.152,.458],[.164,.47],[.166,.491],[.158,.509],[.135,.516],[0,.519]],opt?32:72));
 if(v){b.add('iron',lathe([[.080,.287],[.091,.289],[.092,.31],[.084,.317],[.079,.31]],opt?30:64));b.add('darkWood',lathe([[.15,.438],[.167,.44],[.17,.457],[.165,.469],[.158,.472]],opt?30:64));}
 if(v>=2){let ring=new T.TorusGeometry(.041,.006,opt?6:12,opt?28:64);b.add('iron',ring,[0,.277,.105]);b.add('iron',rod([0,.307,.081],[0,.307,.119],.008,opt?8:32));
 // One continuous loose leash. A flat ground coil terminates at the foot, one end threaded through the swivel ring.
 let pts=[[-.017,.295,.11],[.002,.267,.127],[.059,.22,.153],[.126,.145,.161],[.203,.074,.13],[.275,.018,.077],[.317,.011,.062]];for(let j=0;j<48;j++){let t=j/47,a=-Math.PI/2+t*Math.PI*3.75,r=.145-.098*t;pts.push([.36+r*Math.cos(a),.011+.002*Math.sin(a),.159+r*.70*Math.sin(a)]);}path(b,'leather',pts,.007,opt?82:192,opt?6:14);
 for(let i=0;i<4;i++){let rr=.035+i*.034,g=new T.TorusGeometry(rr,.0025,opt?5:10,opt?24:56);g.rotateX(Math.PI/2);b.add('turf',g,[0,.517-.007*rr/.14,0]);}
 for(let i=0;i<12;i++){let a=i*Math.PI/6,at=(r,y)=>[r*Math.sin(a),y,r*Math.cos(a)];path(b,'linen',[at(.161,.484),at(.168,.474),at(.168,.456),at(.161,.448)],.0028,opt?5:14,opt?4:8);}}
 return done(b,perch);}
export const mewsModules=[{id:dovecote,name:'Post-mounted courtyard dovecote',category:'courtyard',description:'Hexagonal nest house on a braced oak post with twelve arched entrances and individual landing shelves.',build:buildDove},{id:perch,name:'Rush-capped block perch',category:'mews',description:'Turned wooden block with a woven cap, swivel ring and a loose leather leash coiled at the foot.',build:buildPerch}];
