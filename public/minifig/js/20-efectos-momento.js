/* ============ Efectos dirigidos de los momentos ============ */
// Dibuja el efecto de cada momento desde su origen real (mano, ojos, pies…) según Momentos.efecto().
// Va encima del efecto general del poder (js/15), que baja de intensidad mientras hay un efecto dirigido.
const EFM={pts:null,seed:[],rayo:null,anillo:null,N:170};
const TAM_EFM={rayo:0.06,chorro:0.16,estallido:0.18,aura:0.11,anillo:0.11,estela:0.1,proyectil:0.15};   // tamaño de partícula por forma
function efmCrear(){if(EFM.pts)return;
 const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(new Float32Array(EFM.N*3),3));
 EFM.pts=new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:0.075,transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending,map:chispa()}));
 EFM.pts.frustumCulled=false;scene.add(EFM.pts);
 EFM.seed=Array.from({length:EFM.N},()=>[Math.random(),Math.random(),Math.random(),Math.random()]);
 const mb=()=>new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
 EFM.rayo=new THREE.Mesh(new THREE.CylinderGeometry(0.028,0.028,1,10,1,true),mb());EFM.rayo.frustumCulled=false;scene.add(EFM.rayo);
 EFM.nucleo=new THREE.Mesh(new THREE.CylinderGeometry(0.011,0.011,1,8,1,true),mb());EFM.nucleo.frustumCulled=false;scene.add(EFM.nucleo);
 EFM.anillo=new THREE.Mesh(new THREE.RingGeometry(0.28,0.36,56),mb());EFM.anillo.rotation.x=-Math.PI/2;EFM.anillo.frustumCulled=false;scene.add(EFM.anillo);
 efmOcultar()}
function efmOcultar(){if(!EFM.pts)return;EFM.pts.visible=EFM.rayo.visible=EFM.nucleo.visible=EFM.anillo.visible=false}
const _o1=new THREE.Vector3(),_o2=new THREE.Vector3(),_q=new THREE.Quaternion(),_Y=new THREE.Vector3(0,1,0);
// Puntos de origen en el mundo
function efmOrigenes(J,origen){const w=o=>o.getWorldPosition(new THREE.Vector3());
 switch(origen){
  case"manoObj":return[w(J.handR)];case"manoLib":return[w(J.handL)];case"ambas":return[w(J.handR),w(J.handL)];
  case"ojos":{const q=J.head.getWorldQuaternion(new THREE.Quaternion()),h=w(J.head);return[-1,1].map(s=>h.clone().add(new THREE.Vector3(s*0.1,-0.27,0.33).applyQuaternion(q)))}
  case"cabeza":return[w(J.head).add(new THREE.Vector3(0,0.12,0))];
  case"pies":{const p=w(J.root);p.y=Math.max(0.01,p.y);return[p]}
  default:return[w(J.torso).add(new THREE.Vector3(0,-0.4,0))]}}
function efmDir(J,dir,origen){if(dir==="arriba")return new THREE.Vector3(0,1,0);if(dir==="abajo")return new THREE.Vector3(0,-1,0);
 const src=origen==="ojos"?J.head:J.root;return new THREE.Vector3(0,0,1).applyQuaternion(src.getWorldQuaternion(_q)).normalize()}
function efmColor(d){return d.color||((actual&&actual.poderes||[]).map(p=>PODER_COLOR[p]).find(Boolean))||"#ffd21a"}

function efectoMomento(t){if(!fig||!fig.userData.j){efmOcultar();return}const J=fig.userData.j;
 const d=J.momento&&window.Momentos?Momentos.efecto(J.momento):null;if(!d){efmOcultar();return}
 efmCrear();fig.updateMatrixWorld(true);
 const k=J.fxDir==null?1:J.fxDir,tl=Math.max(0,t-(window.MOM_T0||0)),col=efmColor(d),O=efmOrigenes(J,d.origen),D=efmDir(J,d.dir,d.origen);
 const a=EFM.pts.geometry.attributes.position,N=EFM.N,S=EFM.seed;
 EFM.pts.material.color.set(col);EFM.pts.material.opacity=Math.min(1,k*1.15);EFM.pts.visible=k>0.02;
 EFM.pts.material.size=TAM_EFM[d.forma]||0.08;
 EFM.rayo.visible=EFM.nucleo.visible=EFM.anillo.visible=false;
 const fw=new THREE.Vector3(0,0,1).applyQuaternion(J.root.getWorldQuaternion(_q)),lado=new THREE.Vector3().crossVectors(_Y,fw).normalize();
 const pon=(i,v)=>a.setXYZ(i,v.x,v.y,v.z),lejos=i=>a.setXYZ(i,0,-99,0);
 switch(d.forma){
  case"rayo":{const L=2.4*Math.min(1,k*1.3);
   const o=O[0];[EFM.rayo,EFM.nucleo].forEach((m,j)=>{m.visible=k>0.05;m.material.color.set(j?"#ffffff":col);m.material.opacity=(j?0.95:0.55+Math.random()*0.35)*Math.min(1,k*1.5);
    m.scale.set(1+(j?0:Math.random()*0.6),L,1+(j?0:Math.random()*0.6));m.quaternion.setFromUnitVectors(_Y,D);m.position.copy(o).addScaledVector(D,L/2)});
   if(O[1]){// dos ojos: el núcleo va del segundo ojo
    EFM.nucleo.material.color.set(col);EFM.nucleo.scale.set(2.4,L,2.4);EFM.nucleo.position.copy(O[1]).addScaledVector(D,L/2)}
   for(let i=0;i<N;i++){const [r1,r2,r3]=S[i],u=(r1+tl*1.7)%1,o2=O[i%O.length];
    if(i<N*0.7){_o1.copy(o2).addScaledVector(D,u*L).add(new THREE.Vector3((r2-.5)*0.09,(r3-.5)*0.09,(r2-r3)*0.09))}
    else{_o1.copy(o2).add(new THREE.Vector3((r2-.5)*0.25*u,(r3-.5)*0.25*u,(r1-.5)*0.25*u))}pon(i,_o1)}break}
  case"chorro":{for(let i=0;i<N;i++){const [r1,r2,r3]=S[i],ph=(tl*1.3+r1)%1,o=O[i%O.length];
    _o1.copy(o).addScaledVector(D,ph*(d.dir==="abajo"?0.7:1.1)).addScaledVector(lado,(r2-.5)*0.28*ph).add(new THREE.Vector3(0,0,(r3-.5)*0.28*ph));pon(i,_o1)}break}
  case"estallido":{const ph0=(tl*0.85)%1;for(let i=0;i<N;i++){const [r1,r2,r3,r4]=S[i],ph=(ph0+r4*0.25)%1,o=O[i%O.length];
    const th=r1*Math.PI*2,fi=Math.acos(2*r2-1),R=(0.08+ph*0.9)*(0.6+r3*0.6);
    _o1.set(Math.sin(fi)*Math.cos(th),Math.cos(fi),Math.sin(fi)*Math.sin(th)).multiplyScalar(R).add(o);pon(i,_o1)}
   EFM.pts.material.opacity=Math.min(1,k*1.15)*(1-ph0*0.6);break}
  case"aura":{const R=d.radio;for(let i=0;i<N;i++){const [r1,r2,r3]=S[i],o=O[i%O.length],ang=r1*6.283+tl*(1.8+r2*1.5)*(i%2?1:-1),rr=R*(0.75+r3*0.5);
    _o1.set(Math.cos(ang)*rr,(r2-.5)*R*1.6+Math.sin(tl*2+r1*6)*R*0.25,Math.sin(ang)*rr).add(o);pon(i,_o1)}break}
  case"anillo":{const ph=(tl*0.9)%1,o=O[0];EFM.anillo.visible=k>0.05;EFM.anillo.material.color.set(col);EFM.anillo.position.set(o.x,0.02,o.z);
    EFM.anillo.scale.setScalar(0.6+ph*4.2);EFM.anillo.material.opacity=Math.min(1,k*1.3)*(1-ph);
    for(let i=0;i<N;i++){const [r1,r2,r3]=S[i],ang=r1*6.283,rr=(0.2+ph*1.3)*(0.8+r2*0.4);_o1.set(o.x+Math.cos(ang)*rr,0.03+r3*0.25*(1-ph),o.z+Math.sin(ang)*rr);pon(i,_o1)}
    EFM.pts.material.opacity=Math.min(1,k*1.15)*(1-ph);break}
  case"estela":{const o=O[0];for(let i=0;i<N;i++){const [r1,r2,r3]=S[i],ph=(tl*1.6+r1)%1;
    _o1.copy(o).addScaledVector(lado,(r2-.5)*0.5).add(new THREE.Vector3(0,(r3-.5)*(d.origen==="pies"?0.3:1.4)+(d.origen==="pies"?0.15:0),0)).addScaledVector(fw,-ph*1.4);pon(i,_o1)}break}
  case"proyectil":{const vuelo=Math.max(0,tl-0.42)*3.2,o=O[0];const c=_o2.copy(o).addScaledVector(D,vuelo);
    EFM.pts.material.opacity=Math.min(1,k*1.2)*(vuelo>2.6?Math.max(0,1-(vuelo-2.6)):1);
    for(let i=0;i<N;i++){const [r1,r2,r3,r4]=S[i];
     if(i<N*0.6){_o1.set((r1-.5),(r2-.5),(r3-.5)).normalize().multiplyScalar(0.13*r4).add(c)}
     else{const cola=r4*Math.min(vuelo,0.8);_o1.copy(c).addScaledVector(D,-cola).add(new THREE.Vector3((r1-.5)*0.12,(r2-.5)*0.12,(r3-.5)*0.12))}pon(i,_o1)}break}
  default:for(let i=0;i<N;i++)lejos(i)}
 a.needsUpdate=true}

// Engancha los efectos dirigidos al bucle: el efecto general baja a 35 % cuando el momento tiene uno propio
const _actualizarEfectos0=actualizarEfectos;
actualizarEfectos=function(t){const J=fig&&fig.userData.j;
 if(J){J.fxDir=J.fx;if(J.momento&&window.Momentos&&Momentos.efecto(J.momento)&&J.fx!=null)J.fx=J.fx*0.35}
 _actualizarEfectos0(t);
 // con efecto dirigido, los rayos generales (láser de frente) se apagan para no encimarse
 if(J&&J.momento&&efectos&&window.Momentos&&Momentos.efecto(J.momento))efectos.items.forEach(it=>{if(it.rayos)it.rayos.forEach(m=>m.visible=false)});
 efectoMomento(t)};
