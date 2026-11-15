/* ============ Motor LDraw ============ */
// Toda la geometría sale de piezas oficiales de LDraw.org (CC BY 4.0). Nada se dibuja a mano.
// LDraw: LDU, Y hacia abajo, frente en −Z. Escena: 1 unidad = 40 LDU (16 mm), Y arriba, frente en +Z.
const LD=40,LDU=0.4;
const STD_TABLA=[
 ["Figura completa","100 LDU","40.0","L"],["Cabeza 3626c (diámetro)","26","10.4","L"],["Torso 973 abajo · alto · fondo","38 · 32 · 20","15.2 · 12.8 · 8.0","L"],
 ["Brazos 3818/3819 en el torso","±15.552, 9","±6.2, 3.6","L"],["Inclinación del brazo","9.782°","","L"],["Mano 3820 en el puño","±5, 18.9, −9.9 a 45°","","L"],
 ["Agarre de la mano","barra 3.18 mm, 14.5°","","L"],["Cadera 3815","y = 32","12.8","L"],["Eje de las piernas 3816/3817","y = 44","17.6","L"]];
const FUENTE={L:"LDraw"};
function alturaMM(c){return c.piernasTipo==="cortas"?(100-16)*LDU:100*LDU}
const LDCOL={"0":"#1b2a34","15":"#f4f4f4","71":"#a0a5a9","72":"#6c6e68","4":"#c91a09","14":"#f2cd37","1":"#0055bf","2":"#237841","25":"#fe8a18","19":"#e4cd9e","70":"#582a12","28":"#958a73","320":"#720e0f","84":"#aa7d55","78":"#f6d7b3","92":"#cc702a","26":"#923978","5":"#c870a0","22":"#81007b","6":"#583927","7":"#9ba19d","8":"#6d6e5c","9":"#b4d2e3","11":"#55a5af","12":"#f2705e","13":"#fc97ac","18":"#fbe696","27":"#bbe90b","29":"#e4adc8","191":"#f8bb3d","226":"#fff03a","272":"#0a3463","288":"#184632","308":"#352100","326":"#e2f99a","379":"#6074a1","450":"#b67b50","462":"#ffa70b","484":"#a95500","503":"#e6e3da","10":"#4b9f4a","73":"#5a93db","85":"#3f3691","86":"#7c503a","89":"#4c61db","110":"#4354a3","112":"#6874ca","115":"#c7d23c","118":"#b3d7d1","120":"#d9e4a7","125":"#f9ba61","151":"#e6e3e0","179":"#898788","183":"#f2f3f2","212":"#9fc3e9","216":"#8f4c2a","232":"#7dbfdd","313":"#3592c3","321":"#078bc9","322":"#36aebf","323":"#adc3c0","330":"#9b9a5a","335":"#d67572","351":"#f785b1","353":"#ff6d77","366":"#fa9c1c","373":"#845e84","378":"#a0bcac"};
if(window.LDRAW_COLORES)Object.assign(LDCOL,window.LDRAW_COLORES); // tabla oficial completa (LDConfig.ldr)
const LD_GEO={};
function geoLD(id){ // malla con normales suavizadas por ángulo (35°) y grupos por color LDraw
 if(LD_GEO[id])return LD_GEO[id];const d=window.LDRAW_PIEZAS&&LDRAW_PIEZAS[id];if(!d)return null;
 const pb=Uint8Array.from(atob(d.p),c=>c.charCodeAt(0)),ib=Uint8Array.from(atob(d.i),c=>c.charCodeAt(0));
 const P=new Int16Array(pb.buffer),I=d.i32?new Uint32Array(ib.buffer):new Uint16Array(ib.buffer);
 const nT=I.length/3,fn=new Float32Array(nT*3),pos=new Float32Array(nT*9),nor=new Float32Array(nT*9);
 const V=k=>[P[k*3]/64/LD,-P[k*3+1]/64/LD,-P[k*3+2]/64/LD];const porV=new Map();
 for(let t=0;t<nT;t++){const a=V(I[t*3]),b=V(I[t*3+1]),c=V(I[t*3+2]);const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
  let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;fn[t*3]=nx/l;fn[t*3+1]=ny/l;fn[t*3+2]=nz/l;
  [a,b,c].forEach((p,k)=>{pos.set(p,t*9+k*3);const vi=I[t*3+k];let L=porV.get(vi);if(!L)porV.set(vi,L=[]);L.push(t)})}
 const cs=Math.cos(35*Math.PI/180);
 for(let t=0;t<nT;t++)for(let k=0;k<3;k++){const L=porV.get(I[t*3+k]);let x=0,y=0,z=0;for(const o of L){const dt=fn[t*3]*fn[o*3]+fn[t*3+1]*fn[o*3+1]+fn[t*3+2]*fn[o*3+2];if(dt>cs){x+=fn[o*3];y+=fn[o*3+1];z+=fn[o*3+2]}}const l=Math.hypot(x,y,z)||1;nor.set([x/l,y/l,z/l],t*9+k*3)}
 const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(pos,3));g.setAttribute("normal",new THREE.BufferAttribute(nor,3));
 d.g.forEach(([st,n,col],k)=>g.addGroup(st,n,k));g.userData.colores=d.g.map(x=>x[2]);g.computeBoundingBox();return LD_GEO[id]=g}
function mallaLD(id,matPrincipal,part,extra){const g=geoLD(id);if(!g)return null;const mats=g.userData.colores.map(c=>c==="16"?matPrincipal:plast(LDCOL[c]||"#888888"));
 const m=mk(g,mats.length===1?mats[0]:mats,part);m.userData.compartida=true;m.userData.ld=id;if(extra)Object.assign(m.userData,extra);return m}
// Divide una pieza en dos materiales por altura LDraw (botas: lo que queda debajo de yLD)
function geoLDcorte(id,yLD){const k=id+":"+yLD;if(LD_GEO[k])return LD_GEO[k];const g=geoLD(id);const P=g.attributes.position.array,N=g.attributes.normal.array,n=P.length/9;
 const arriba=[],abajo=[];for(let t=0;t<n;t++){const yc=(P[t*9+1]+P[t*9+4]+P[t*9+7])/3;(yc< -yLD/LD?abajo:arriba).push(t)}
 const pos=new Float32Array(n*9),nor=new Float32Array(n*9);let o=0;[arriba,abajo].forEach(L=>L.forEach(t=>{pos.set(P.subarray(t*9,t*9+9),o*9);nor.set(N.subarray(t*9,t*9+9),o*9);o++}));
 const h=new THREE.BufferGeometry();h.setAttribute("position",new THREE.BufferAttribute(pos,3));h.setAttribute("normal",new THREE.BufferAttribute(nor,3));h.addGroup(0,arriba.length*3,0);h.addGroup(arriba.length*3,abajo.length*3,1);h.computeBoundingBox();
 return LD_GEO[k]=h}
// Transformación LDraw (posición en LDU + matriz 3x3 por filas) → matriz de la escena
const FLIP=new THREE.Matrix4().makeScale(1,-1,-1);
function ldM(x,y,z,r){r=r||[1,0,0,0,1,0,0,0,1];const m=new THREE.Matrix4().set(r[0],r[1],r[2],x/LD,r[3],r[4],r[5],y/LD,r[6],r[7],r[8],z/LD,0,0,0,1);return FLIP.clone().multiply(m).multiply(FLIP)}
function grupoLD(parent,M){const g=new THREE.Group();M.decompose(g.position,g.quaternion,g.scale);parent.add(g);return g}
const rotZ=a=>{const c=Math.cos(a*Math.PI/180),s=Math.sin(a*Math.PI/180);return [c,-s,0,s,c,0,0,0,1]};
// Reglas de ensamble, copiadas de los encabezados !HELP de cada pieza LDraw
const ENSAMBLE={
 cabeza:[0,-24,0],                         // 3626c y todo lo que va en la cabeza (pelo, cascos)
 brazoDer:{p:[-15.552,9,0],z:9.782},        // 3818: elevación en X y luego 9.782° en Z
 brazoIzq:{p:[15.552,9,0],z:-9.782},        // 3819
 mano:{p:[5,18.9,-9.9],r:[1,0,0,0,0.7071,-0.7071,0,0.7071,0.7071]}, // 3820 en el hueco del puño (x con el signo del brazo)
 agarre:{p:[0,-0.8229,-9.8948],r:[1,0,0,0,0.968148,-0.25038,0,0.25038,0.968148]}, // centro del agarre, eje a 14.5°
 cadera:[0,32,0],cortas:[0,32,0],           // 3815 / 41879a
 piernas:[0,44,0],                          // 3816/3817 sobre el eje de la cadera
 capa:[0,0,0]                               // 522 entre cuello y torso
};

/* ---- Estampados ajustados a la superficie real ---- */
// Perfil exterior de una pieza de revolución (radio por altura), medido sobre sus vértices
const _perfil={};
function perfilLD(id,y0,y1,n){const k=id+y0+y1+n;if(_perfil[k])return _perfil[k];const p=geoLD(id).attributes.position;const bins=new Float32Array(n+1);
 for(let i=0;i<p.count;i++){const yl=-p.getY(i)*LD;if(yl<y0-0.6||yl>y1+0.6)continue;const r=Math.hypot(p.getX(i),p.getZ(i))*LD;const b=Math.round((yl-y0)/(y1-y0)*n);if(b>=0&&b<=n&&r>bins[b])bins[b]=r}
 for(let b=0;b<=n;b++)if(!bins[b])bins[b]=bins[b-1]||13;return _perfil[k]=bins}
// Cara: banda frontal de 180° que sigue el contorno exacto de la cabeza (de y 1.5 a 19.5 LDU bajo la tapa)
function cascaraCara(offset){const y0=1.5,y1=19.5,n=36,r=perfilLD("3626c",y0,y1,n);const pts=[];for(let b=n;b>=0;b--)pts.push(new THREE.Vector2((r[b]+offset)/LD,-(y0+(y1-y0)*b/n)/LD));
 return new THREE.LatheGeometry(pts,64,-Math.PI/2,Math.PI)}
// Torso: contorno real del frente (z = −10 LDU) o de la espalda (z = +10 LDU)
const _cara={};
function caraTorso(lado){ // lado 1 = frente (+Z en la escena), −1 = espalda
 if(_cara[lado])return _cara[lado];const p=geoLD("973").attributes.position,zt=lado*10/LD;const pts=[];
 for(let i=0;i<p.count;i++)if(Math.abs(p.getZ(i)-zt)<0.002&&p.getY(i)<=0.001)pts.push([p.getX(i),p.getY(i)]);
 pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[],hi=[];
 for(const q of pts){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],q)<=0)lo.pop();lo.push(q)}
 for(let i=pts.length-1;i>=0;i--){const q=pts[i];while(hi.length>=2&&cr(hi[hi.length-2],hi[hi.length-1],q)<=0)hi.pop();hi.push(q)}
 const h=lo.slice(0,-1).concat(hi.slice(0,-1));let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;h.forEach(([x,y])=>{x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)});
 const sh=new THREE.Shape();h.forEach(([x,y],i)=>i?sh.lineTo(x,y):sh.moveTo(x,y));sh.closePath();
 return _cara[lado]={sh,x0,x1,y0,y1,z:zt,n:pts.length}}
function decalTorso(cvs,glow,lado){const f=caraTorso(lado);const g=new THREE.ShapeGeometry(f.sh);const pos=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)-f.x0)/(f.x1-f.x0),(pos.getY(i)-f.y0)/(f.y1-f.y0));
 const m=mk(g,decalMat(cvs,glow),"torso",false);m.userData.decal=true;m.position.z=f.z+lado*0.0015;if(lado<0)m.rotation.y=Math.PI;return m}
// Estampado redondo para el escudo 3876 (cara frontal en z LDraw mínimo)
function decalEscudo(cvs){const p=geoLD("3876").attributes.position;let zf=-1e9,rmax=0;for(let i=0;i<p.count;i++){const r=Math.hypot(p.getX(i),p.getY(i));if(r>rmax)rmax=r;if(p.getZ(i)>zf)zf=p.getZ(i)}
 const m=mk(new THREE.CircleGeometry(rmax*0.985,64),decalMat(cvs),"mano",false);m.userData.decal=true;m.position.z=zf+0.002;return m}
