// Cloister wash court. Both props can be regenerated in four measurable stages.
import * as T from 'three';import {newBuilder,lathe} from '../lib/kit.js';import {boxUV,rod} from '../lib/geo.js';
const fountain='cloister_lavabo_canopy',bird='refectory_bird_aquamanile';
function lens(rx,ry,rz,n){return new T.SphereGeometry(1,n,Math.max(6,n>>1)).scale(rx,ry,rz);}
function spiral(b,k,pts,r,segments,sides){b.add(k,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(a=>new T.Vector3(...a))),segments,r,sides,false));}
function done(b,id){let g=b.build(id),bb=new T.Box3().setFromObject(g),mid=bb.getCenter(new T.Vector3());for(let o of g.children)o.geometry.translate(-mid.x,-bb.min.y,-mid.z);return g;}
export function buildLavabo(M,rev=3){const b=newBuilder(M),opt=rev===3;function turn(k,p,n,x=0,z=0){b.add(k,lathe(p,n),[x,0,z]);}
 turn('grindstone',[[0,0],[1.54,0],[1.54,.095],[1.49,.12],[0,.12]],8);turn('dressed',[[0,.12],[1.41,.12],[1.41,.206],[1.39,.224],[0,.224]],8);
 const radius=1.20,N=6;for(let i=0;i<N;i++){let ang=(i+.5)*Math.PI/3,x=radius*Math.sin(ang),z=radius*Math.cos(ang);
 let prof=rev?[[0,.224],[.154,.224],[.154,.31],[.132,.325],[.128,.39],[.091,.416],[.081,2.00],[.102,2.07],[.135,2.093],[.154,2.16],[.154,2.21],[0,2.21]]:[[0,.224],[.11,.224],[.11,2.21],[0,2.21]];turn('dressed',prof,8,x,z);
 if(rev){let w=radius*.5+.018,bot=2.16,top=2.658;let sh=new T.Shape();sh.moveTo(-w,bot);sh.lineTo(-w,top);sh.lineTo(w,top);sh.lineTo(w,bot);sh.lineTo(w-.115,bot);sh.quadraticCurveTo(w-.135,2.405,0,2.563);sh.quadraticCurveTo(-w+.135,2.405,-w+.115,bot);sh.closePath();let g=new T.ExtrudeGeometry(sh,{depth:.140,bevelEnabled:false,curveSegments:opt?10:24});g.translate(0,0,-.070);let a=ang+Math.PI/6;b.add('dressed',boxUV(g),[radius*.8660254*Math.sin(a),0,radius*.8660254*Math.cos(a)],a);}}
 // Roof has a closed underside and a distinct drip edge. Hexagon vertices match column axes.
 const roof=lathe([[0,rev?2.64:2.21],[1.46,rev?2.64:2.21],[1.48,rev?2.69:2.26],[.11,3.37],[0,3.415]],6);roof.rotateY(Math.PI/6);b.add('roof',roof);
 turn('marble',[[0,.224],[.38,.224],[.38,.286],[.24,.32],[.188,.386],[.17,.68],[.222,.72],[.32,.748],[.53,.80],[.699,.946],[.711,.988],[.699,1.014],[.652,1.014],[.623,.96],[.49,.865],[.27,.811],[0,.804]],opt?40:72);
 turn('dressed',[[0,.805],[.162,.805],[.16,.864],[.118,.892],[.104,1.32],[.135,1.35],[.142,1.42],[.101,1.466],[0,1.51]],8);
 if(rev>=2){turn('water',[[0,.908],[.544,.908],[.544,.914],[0,.914]],opt?40:72);for(let i=0;i<4;i++){let a=i*Math.PI/2,at=(r,y)=>[r*Math.sin(a),y,r*Math.cos(a)];spiral(b,'gilt',[at(.088,1.326),at(.169,1.322),at(.216,1.302),at(.226,1.266)],.018,opt?8:18,opt?8:16);spiral(b,'water',[at(.226,1.264),at(.232,1.214),at(.238,1.13),at(.243,.915)],.007,opt?5:16,opt?5:12);}
 for(let i=0;i<6;i++){let a=(i+.5)*Math.PI/3;b.add('gilt',rod([1.455*Math.sin(a),2.691,1.455*Math.cos(a)],[.085*Math.sin(a),3.393,.085*Math.cos(a)],.013,opt?6:16));}turn('gilt',[[0,3.397],[.059,3.397],[.062,3.421],[.038,3.451],[.024,3.498],[.042,3.53],[.03,3.566],[0,3.614]],opt?12:32);}
 const group=done(b,fountain);for(let mesh of group.children)mesh.geometry.rotateY(Math.PI/7);return group;}
export function buildBird(M,rev=3){let bronze=M.gilt.clone();bronze.color.setHex(0xb79765);bronze.name='cast_bronze_ewer';const b=newBuilder({bronze,gilt:M.gilt,iron:M.iron,void:M.void});const opt=rev===3,n=opt?24:48;
 // Low flared foot and a flattened ovoid vessel, with a recurved carrying handle on its back.
 b.add('bronze',lathe([[0,0],[.089,0],[.093,.008],[.085,.017],[.064,.023],[.059,.056],[.072,.063],[0,.063]],opt?24:48));b.add('bronze',lens(.098,.102,.140,n),[0,.142,0]);
 const sections=rev?[[.057,.16,.067],[.081,.187,.063],[.105,.208,.045],[.126,.231,.03],[.129,.253,.026],[.125,.279,.033],[.13,.30,.038],[.143,.316,.03],[.16,.326,.013]]:[[.062,.16,.063],[.135,.28,.035],[.155,.307,.016]];
 function loft(ss,mat='bronze'){
 const ring=opt?24:40, pos=[],norm=[],uv=[],ix=[];
 for(let k=0;k<ss.length;k++){const [z,y,r]=ss[k],prev=ss[Math.max(0,k-1)],next=ss[Math.min(ss.length-1,k+1)],dy=next[1]-prev[1],dz=next[0]-prev[0],dr=next[2]-prev[2];for(let j=0;j<=ring;j++){let a=j*2*Math.PI/ring,c=Math.cos(a),s=Math.sin(a);pos.push(r*c,y,z+r*.82*s);let tangent=new T.Vector3(-r*s,0,r*.82*c);let up=new T.Vector3(dr*c,dy,dz+dr*.82*s);norm.push(...up.cross(tangent).normalize().toArray());uv.push(j/ring,k*.028);if(k<ss.length-1&&j<ring){let h=k*(ring+1)+j;ix.push(h,h+ring+1,h+ring+2,h,h+ring+2,h+1);}}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);b.add(mat,g);}
 loft(sections);b.add('bronze',lens(.040,.040,.045,n),[0,.302,.143]);
 // A hollow slightly rising beak: profile turns back down inside its mouth.
 const g=lathe([[.019,0],[.023,.011],[.015,.047],[.012,.062],[.008,.064],[.007,.052],[.012,.018],[0,.015]],opt?18:40);g.rotateX(1.40);b.add('bronze',g,[0,.302,.176]);
 for(let side of [-1,1]){let wing=lens(.019,.065,.105,n);wing.rotateX(-.24);b.add('bronze',wing,[side*.082,.152,-.007]);}
 spiral(b,'bronze',[[0,.179,-.102],[0,.22,-.149],[0,.27,-.151],[0,.297,-.102],[0,.266,-.052],[0,.225,-.032]],.014,opt?20:48,opt?9:20);
 if(rev>=1){let tail=lens(.051,.013,.077,n);tail.rotateX(.29);b.add('bronze',tail,[0,.183,-.13]);b.add('gilt',lathe([[.022,0],[.029,.002],[.03,.014],[.026,.019],[.018,.018],[.018,.005],[.022,0]],opt?18:40),[0,.238,.005]);b.add('void',lathe([[0,0],[.019,0],[.019,.002],[0,.002]],opt?18:40),[0,.252,.005]);}
 if(rev>=2){for(let s of [-1,1]){b.add('gilt',lens(.006,.010,.009,opt?12:30),[s*.036,.312,.157]);b.add('iron',lens(.003,.005,.005,opt?10:24),[s*.041,.312,.158]);for(let j=0;j<5;j++){let q=j/4;spiral(b,'gilt',[[s*.100,.16+.027*q,.045-.018*q],[s*.101,.151+.023*q,.011-.018*q],[s*.099,.132+.022*q,-.035-.022*q],[s*.094,.139+.021*q,-.061-.019*q]],.002,opt?7:20,opt?5:10);}}}
 return done(b,bird);}
export const lavaboModules=[{id:fountain,name:'Cloister lavabo pavilion',category:'cloister',description:'Hexagonal vaulted arcade, ribbed slate canopy and a marble washing basin with four running brass spouts.',build:buildLavabo},{id:bird,name:'Bird-form bronze aquamanile',category:'refectory',description:'Bird-shaped bronze hand-washing ewer with a hollow beak, feathered wings, dorsal filling mouth and arched handle.',build:buildBird}];
