// Pantry: staved dash churn and a bench-mounted rotary quern. Stage 0..3.
import * as T from 'three';import {newBuilder,lathe,bevelBox} from '../lib/kit.js';import {box,boxUV,rod} from '../lib/geo.js';
const churn='dairy_dash_churn',quern='pantry_rotary_quern';
function done(b,id){let g=b.build(id),bb=new T.Box3().setFromObject(g),mid=bb.getCenter(new T.Vector3());for(let o of g.children)o.geometry.translate(-mid.x,-bb.min.y,-mid.z);return g;}
export function buildChurn(M,v=3){const b=newBuilder(M),opt=v===3;const n=v?16:8;
 // Individual tapered staves: inside, outside and end grain belong to the same solid wedge.
 for(let j=0;j<n;j++){let sides=[],a0=(j+.016)*2*Math.PI/n,a1=(j+.984)*2*Math.PI/n;for(let [y,r] of [[0,.181],[.045,.187],[.385,.211],[.705,.161],[.738,.156]]){let row=[];for(let [a,off] of [[a0,0],[a1,0],[a1,-.018],[a0,-.018]])row.push([Math.sin(a)*(r+off),y,Math.cos(a)*(r+off)]);sides.push(row);}let p=[];function tri(a,b,c){p.push(...a,...b,...c);}for(let i=1;i<sides.length;i++){let l=sides[i-1],u=sides[i];for(let k=0;k<4;k++){let q=(k+1)%4;tri(l[k],l[q],u[q]);tri(l[k],u[q],u[k]);}}for(let i of [0,4]){let a=sides[i];if(i===0){tri(a[0],a[2],a[1]);tri(a[0],a[3],a[2]);}else{tri(a[0],a[1],a[2]);tri(a[0],a[2],a[3]);}}let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.computeVertexNormals();let stave=boxUV(g),uv=stave.attributes.uv;for(let k=0;k<uv.count;k++){let U=uv.getX(k),V=uv.getY(k);uv.setXY(k,V+j*.23,U*.65);}b.add('oak',stave);}
 function ring(mat,y0,r0,y1,r1,w){b.add(mat,lathe([[r0-w,y0],[r0,y0],[r1,y1],[r1-w,y1],[r0-w,y0]],opt?32:64));}
 for(let [y,r,y1,r1] of [[.060,.190,.088,.192],[.363,.212,.391,.213],[.664,.17,.688,.166]])ring('iron',y,r,y1,r1,.008);
 ring('darkWood',.726,.157,.754,.162,.132);ring('oak',.752,.155,.766,.151,.123);
 b.add('darkWood',lathe(v?[[0,.63],[.017,.63],[.016,1.11],[.022,1.127],[.026,1.173],[.021,1.19],[0,1.194]]:[[0,.64],[.017,.64],[.017,1.17],[0,1.17]],opt?14:40));
 if(v){ring('iron',.753,.041,.767,.04,.013);b.add('darkWood',lathe([[0,.003],[.174,.003],[.174,.016],[0,.016]],opt?28:56));}
 if(v>=2){for(let a of [-.31,2.81]){let pts=[];for(let k=0;k<=12;k++){let t=k/12*Math.PI;pts.push(new T.Vector3(.097*Math.sin(a)+.037*Math.sin(t)*Math.cos(a),.764+.038*Math.sin(t),.097*Math.cos(a)+.032*Math.cos(t)));}b.add('iron',new T.TubeGeometry(new T.CatmullRomCurve3(pts),opt?12:34,.005,opt?6:12,false));}
 for(let [y,r] of [[.073,.194],[.378,.215],[.676,.173]])for(let i=0;i<6;i++){let a=i*Math.PI/3;let g=new T.SphereGeometry(.005,opt?8:20,opt?5:12);b.add('iron',g,[r*Math.sin(a),y,r*Math.cos(a)]);} }
 return done(b,churn);}
export function buildQuern(M,v=3){const b=newBuilder(M),opt=v===3;const B=(m,p,w,h,d)=>b.add(m,v?bevelBox(w,h,d,.009,1):box(w,h,d),p);const stick=(m,a,c,r,n=10)=>b.add(m,rod(a,c,r,opt?n:32));
 for(let x of [-.258,.258])for(let z of [-.229,.229])B('darkWood',[x,.195,z],.088,.39,.084);B('oak',[0,.421,0],.681,.072,.637);
 if(v){for(let z of [-.23,.23])B('oak',[0,.189,z],.574,.061,.062);for(let x of [-.26,.26])B('darkWood',[x,.347,0],.084,.073,.532);}
 b.add('grindstone',lathe([[0,.457],[.266,.457],[.29,.474],[.294,.528],[.289,.547],[.265,.55],[0,.55]],opt?40:80));
 // A dished runner: the eye is a geometric bore through the crown rather than a dark painted spot.
 b.add('hearth',lathe([[.043,.55],[.264,.55],[.281,.567],[.28,.614],[.256,.635],[.17,.663],[.115,.686],[.08,.681],[.046,.641],[.043,.618],[.043,.55]],opt?40:80));
 let x=.205,z=.067;stick('darkWood',[x,.628,z],[x+.033,.917,z+.011],.021,12);if(v){b.add('iron',lathe([[.018,0],[.032,0],[.033,.01],[.027,.024],[.018,.025],[.018,0]],opt?14:40),[x,.632,z]);}
 if(v>=2){stick('iron',[0,.548,0],[0,.626,0],.012,10);for(let j=0;j<8;j++){let a=j*Math.PI/4+.28,y=.478+(j%2)*.006;let pts=[];for(let k=0;k<4;k++){let u=k/3,th=a+.11*u;pts.push(new T.Vector3(.294*Math.sin(th),y+.025*u,.294*Math.cos(th)));}b.add('grindstone',new T.TubeGeometry(new T.CatmullRomCurve3(pts),opt?4:14,.003,opt?5:10,false));}
 // Small bowl on the lower slatted shelf. Open rim and different scale prevent confusion with the mill.
 for(let i=-2;i<=2;i++)B('oak',[i*.096,.187,.075],.093,.032,.634);const pour=(m,a,c,w,h)=>{const A=new T.Vector3(...a),C=new T.Vector3(...c),dir=C.clone().sub(A);let g=bevelBox(w,h,dir.length(),.003);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),dir.normalize()));b.add(m,g,A.lerp(C,.5).toArray());};pour('oak',[0,.536,.27],[0,.475,.405],.088,.016);for(let x of [-.041,.041])pour('darkWood',[x,.548,.27],[x,.486,.405],.010,.034);
 b.add('clay',lathe([[0,.204],[.062,.204],[.077,.212],[.108,.251],[.129,.292],[.126,.303],[.116,.302],[.092,.253],[.066,.224],[0,.222]],opt?24:64),[0,0,.314]);
 for(let x of [-.257,.257])for(let z of [-.229,.229])stick('darkWood',[x,.45,z],[x,.459,z],.009,8);}
 return done(b,quern);}
export const provisionModules=[{id:churn,name:'Staved dash butter churn',category:'dairy',description:'Tapered sixteen-stave churn with three iron hoops, twin lid loops and a turned dash handle.',build:buildChurn},{id:quern,name:'Rotary hand quern on bench',category:'pantry',description:'Stone handmill with bored runner stone, off-centre handle and a collection bowl beneath the work surface.',build:buildQuern}];
