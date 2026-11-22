// Pottery court, with independent stages for wheel and updraft kiln.
import * as T from 'three';import {newBuilder,bevelBox,lathe} from '../lib/kit.js';import {box,boxUV,rod} from '../lib/geo.js';
const wheel='pottery_kick_wheel',kiln='pottery_updraft_kiln';
function finish(b,id){let g=b.build(id),bb=new T.Box3().setFromObject(g),mid=bb.getCenter(new T.Vector3());for(let m of g.children)m.geometry.translate(-mid.x,-bb.min.y,-mid.z);return g;}
export function kickWheel(M,s=3){const b=newBuilder(M),opt=s===3;const turn=(m,p,n,x=0,z=0)=>b.add(m,lathe(p,opt?n:72),[x,0,z]);const B=(m,p,w,h,d)=>b.add(m,s?bevelBox(w,h,d,.005,1):box(w,h,d),p);
 for(let x of [-.465,.465])B('darkWood',[x,.043,.02],.099,.086,1.10);for(let z of [-.446,.367])B('oak',[0,.104,z],.97,.09,.095);
 const cz=-.08;turn('iron',[[0,.102],[.056,.102],[.052,.14],[.031,.16],[.028,.84],[0,.84]],16,0,cz);B('darkWood',[0,.111,cz],.87,.08,.067);
 turn('oak',[[0,.168],[.363,.168],[.393,.181],[.396,.238],[.377,.25],[0,.25]],40,0,cz);
 if(s){turn('iron',[[.39,.184],[.400,.184],[.400,.207],[.39,.207],[.39,.184]],40,0,cz);}
 for(let x of [-.466,.466])for(let z of [-.42,.30])B('oak',[x,.398,z],.084,.65,.084);
 B('darkWood',[0,.699,cz],1.01,.077,.128);for(let x of [-.466,.466])B('oak',[x,.683,-.055],.085,.096,.80);
 // The seat sits behind the axis but clear of the revolving head.
 for(let z of [.334,.454])B('oak',[0,.726,z],1.025,.065,.117);
 turn('darkWood',[[0,.744],[.068,.744],[.078,.785],[.227,.793],[.236,.806],[.234,.838],[0,.838]],36,0,cz);
 if(s){for(let x of [-.465,.465]){B('darkWood',[x,.327,-.057],.060,.077,.737);B('darkWood',[x,.665,.378],.071,.059,.272);}turn('iron',[[.028,.733],[.055,.733],[.056,.75],[.029,.759],[.028,.733]],20,0,cz);}
 if(s>=2){turn('clay',[[0,.839],[.061,.839],[.078,.85],[.097,.884],[.113,.946],[.107,.985],[.085,1.011],[.073,1.028],[.075,1.043],[.068,1.047],[.061,1.041],[.062,1.024],[.074,1.002],[.093,.979],[.098,.948],[.083,.896],[.055,.86],[0,.859]],36,0,cz);
 for(let r of [.16,.205]){let g=new T.TorusGeometry(r,.0028,opt?5:12,opt?36:80);g.rotateX(Math.PI/2);b.add('clay',g,[0,.839,cz]);}for(let a of [0,1,2,3,4,5]){let theta=a*Math.PI/3;b.add('darkWood',rod([.325*Math.sin(theta),.243,cz+.325*Math.cos(theta)],[.325*Math.sin(theta),.253,cz+.325*Math.cos(theta)],.012,opt?7:22));}
 for(let x of [-.465,.465])for(let z of [.334,.454])b.add('darkWood',rod([x,.751,z],[x,.760,z],.009,opt?7:22));}
 return finish(b,wheel);}
export function updraft(M,s=3){let brick=M.clay.clone();brick.name='kiln_fired_brick';brick.color.setHex(0x995b44);const b=newBuilder(new Proxy({brick},{get:(o,k)=>o[k]??M[k]})),opt=s===3;
 const rows=s?13:7,rad=y=>.86*(1-.53*Math.pow(Math.min(1,y/1.47),2.65)),H=1.47;
 // The firemouth is clipped into each annular course; paired jambs and a voussoir ring frame a true void.
 function block(m,a0,a1,y0,y1){const n=opt?2:5,p=[];function pt(a,y,d){const r=rad(y)-d;return [r*Math.sin(a),y,r*Math.cos(a)];}function quad(a,c,d,e){p.push(...a,...c,...d,...a,...d,...e);}for(let i=0;i<n;i++){let a=a0+(a1-a0)*i/n,c=a0+(a1-a0)*(i+1)/n;for(const d of [0,.125]){let A=pt(a,y0,d),B=pt(c,y0,d),C=pt(c,y1,d),D=pt(a,y1,d);if(d)quad(B,A,D,C);else quad(A,B,C,D);}quad(pt(a,y1,0),pt(c,y1,0),pt(c,y1,.125),pt(a,y1,.125));quad(pt(c,y0,0),pt(a,y0,0),pt(a,y0,.125),pt(c,y0,.125));}for(let [a,sign] of [[a0,1],[a1,-1]]){let A=pt(a,y0,0),B=pt(a,y1,0),C=pt(a,y1,.125),D=pt(a,y0,.125);if(sign===1)quad(A,B,C,D);else quad(D,C,B,A);}let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.computeVertexNormals();b.add(m,boxUV(g));}
 for(let j=0;j<rows;j++){let y=j*H/rows,h=H/rows-.004,mid=y+h/2,N=s?22:12;let w=mid<.35?.26:mid<.61?Math.sqrt(.26**2-(mid-.35)**2):0;const gap=Math.asin(w/rad(mid));for(let k=-N;k<N;k++){let a=(k+(j%2)/2)*2*Math.PI/N+.002,c=a+2*Math.PI/N-.004;for(let [l,r] of [[-Math.PI,-gap],[gap,Math.PI]]){let A=Math.max(a,l),C=Math.min(c,r);if(C-A>.002)block(j%4===0?'brick':'clay',A,C,y,y+h);}}}
 b.add('hearth',lathe([[0,0],[.85,0],[.85,.036],[0,.036]],opt?36:72));
 b.add('brick',lathe([[.30,H-.006],[.432,H-.006],[.44,H+.033],[.421,H+.065],[.347,H+.067],[.326,H+.193],[.25,H+.194],[.27,H+.047],[.30,H-.006]],opt?36:72));
 if(s){for(let side of [-1,1])for(let j=0;j<3;j++)b.add('grindstone',bevelBox(.099,.113,.18,.006),[side*.306,.058+j*.114,.807]);
 for(let i=0;i<11;i++){let a=i*Math.PI/11+.009,c=(i+1)*Math.PI/11-.009,sh=new T.Shape();[[.256,a],[.35,a],[.35,c],[.256,c]].forEach(([r,t],k)=>sh[k?'lineTo':'moveTo'](r*Math.cos(t),.344+r*Math.sin(t)));sh.closePath();let g=new T.ExtrudeGeometry(sh,{depth:.18,bevelEnabled:false});b.add('grindstone',boxUV(g),[0,0,.713]);}}
 if(s>=2){const shelf=new T.Shape();shelf.absarc(0,0,.702,0,2*Math.PI,false);for(let i=0;i<8;i++){let a=i*Math.PI/4,hole=new T.Path();hole.absarc(.43*Math.sin(a),.43*Math.cos(a),.074,0,Math.PI*2,true);shelf.holes.push(hole);}let centre=new T.Path();centre.absarc(0,0,.092,0,Math.PI*2,true);shelf.holes.push(centre);let slab=new T.ExtrudeGeometry(shelf,{depth:.054,bevelEnabled:false,curveSegments:opt?10:24});slab.rotateX(-Math.PI/2);b.add('brick',boxUV(slab),[0,.688,0]);for(let j=-1;j<=1;j++)b.add('darkWood',rod([j*.094,.083,.33],[j*.11,.084,.937-Math.abs(j)*.045],.045,opt?10:32));for(let y of [.82,1.17]){let g=new T.TorusGeometry(rad(y)+.006,.013,opt?6:14,opt?48:96);g.rotateX(Math.PI/2);b.add('iron',g,[0,y,0]);}for(let x of [-.26,.26])b.add('hearth',bevelBox(.13,.052,.44,.006),[x,.026,.965]);}
 return finish(b,kiln);}
export const potteryModules=[{id:wheel,name:'Potter’s tread wheel',category:'pottery',description:'Seated kick wheel with weighted flywheel, central bearing and an open clay vessel on the throwing head.',build:kickWheel},{id:kiln,name:'Updraft pottery kiln',category:'pottery',description:'Tapered masonry kiln with a genuine stoke opening, arch stones, chimney throat and resting billets.',build:updraft}];
