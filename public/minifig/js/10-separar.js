/* ============ Separar, unir, flechas y mezclar ============ */
const SLOTS=[{k:"cabello",n:"Cabello",g:"CABELLO",keys:["cabello","pelo"]},{k:"cabeza",n:"Cabeza",g:"CABEZA",keys:["piel","rostro","facial"]},{k:"torso",n:"Torso",g:"TORSO",keys:["torso","estampado","c1","c2","c3","texto","brazos","manos","capa","imgTorso"]},{k:"piernas",n:"Piernas",g:"PIERNAS",keys:["cadera","piernas","botas","piernasTipo"]},{k:"objeto",n:"Objeto",g:"OBJETO",keys:["accesorio"]}];
let separado=false,sepVal=0,slotAct=2;
function variantes(sl){const m=new Map();lista.forEach(c=>{if(c.franquicia==="MEZCLAS")return;const v={};sl.keys.forEach(k=>v[k]=c[k]==null?null:c[k]);const key=JSON.stringify(v);if(!m.has(key))m.set(key,{v,de:c.nombre,key,fr:c.franquicia})});return [...m.values()]}
function claveDe(sl,c){const v={};sl.keys.forEach(k=>v[k]=c[k]==null?null:c[k]);return JSON.stringify(v)}
function nombreVar(sl,x){if(!x)return "Personalizado";if(sl.k==="objeto")return ACCES[x.v.accesorio]||"Nada";if(sl.k==="cabello"&&x.v.cabello==="ninguno")return "Sin cabello";return `${sl.n} de ${x.de}`}
function aplicarVar(sl,x){sl.keys.forEach(k=>{const v=x.v[k];actual[k]=Array.isArray(v)?v.slice():v})}
function ciclar(i,dir){const sl=SLOTS[i],vs=variantes(sl);if(!vs.length)return;let at=vs.findIndex(x=>x.key===claveDe(sl,actual));at=at<0?(dir>0?-1:0):at;aplicarVar(sl,vs[(at+dir+vs.length)%vs.length]);slotAct=i;cambio();pintarEditor();pintarFlechas()}
function alternar(){separado=!separado;document.getElementById("bSeparar").textContent=separado?"Unir":"Separar";pintarFlechas()}
let nMezcla=0;
function mezclar(){if(actual.franquicia!=="MEZCLAS"){const c=P(JSON.parse(JSON.stringify(actual)));c.franquicia="MEZCLAS";c.equipo="";nMezcla=lista.filter(x=>x.franquicia==="MEZCLAS").length+1;c.nombre="Mezcla "+nMezcla;c.id=nuevoId(c.nombre);lista.push(c);actual=c;franq="MEZCLAS";pintarTabs()}
 SLOTS.forEach(sl=>{const vs=variantes(sl);if(vs.length)aplicarVar(sl,vs[Math.floor(Math.random()*vs.length)])});
 if(!separado){separado=true;setTimeout(()=>{if(separado)alternar()},650)}cambio();pintarEditor();pintarCat();pintarFlechas()}
const flechasEl=document.getElementById("flechas");
function pintarFlechas(){flechasEl.innerHTML="";SLOTS.forEach((sl,i)=>{const vs=variantes(sl);const at=vs.find(x=>x.key===claveDe(sl,actual));const d=document.createElement("div");d.className="fila"+(i===slotAct?" activa":"");d.dataset.i=i;
  d.innerHTML=`<button class="ar" aria-label="${sl.n} anterior">‹</button><span class="hueco"></span><button class="ar" aria-label="${sl.n} siguiente">›</button><span class="lb">${esc(nombreVar(sl,at))}</span>`;
  const [a,b]=d.querySelectorAll(".ar");a.onclick=()=>ciclar(i,-1);b.onclick=()=>ciclar(i,1);flechasEl.appendChild(d)});
 document.getElementById("ghost").textContent=separado?SLOTS[slotAct].g:"ARMADO"}
const _v=new THREE.Vector3();
function anclas(f){const J=f.userData.j,out=[];f.updateMatrixWorld(true);
 const w=(o,dy)=>{o.getWorldPosition(_v);_v.y+=dy||0;return _v.clone()};
 out.push(w(J.hairG,0.5));out.push(w(J.head,0.28));out.push(w(J.torso,0.38));out.push(w(J.legsG,0.5));out.push(w(J.handR,0));return out}
function moverFlechas(){if(!fig)return;const r=stage.getBoundingClientRect();const pts=anclas(fig);const filas=flechasEl.children;
 // ancho de la figura en pantalla, para poner las flechas a los lados
 const a=new THREE.Vector3(-0.75,1.2,0).project(camera),b=new THREE.Vector3(0.75,1.2,0).project(camera);const ancho=Math.max(110,Math.abs(b.x-a.x)*r.width/2+40);
 pts.forEach((p,i)=>{const el=filas[i];if(!el)return;const q=p.project(camera);el.style.left=((q.x+1)/2*r.width)+"px";el.style.top=((1-q.y)/2*r.height)+"px";
  el.querySelector(".hueco").style.width=(i===4?ancho*0.6:ancho)+"px";const ver=separado||i===slotAct;el.classList.toggle("oculta",!ver);el.classList.toggle("activa",i===slotAct);el.style.zIndex=i===slotAct?2:1})}
// Desarmado real: cada pieza sale en la dirección de su conexión.
// Cabeza hacia arriba del tubo del cuello; cabello hacia arriba del stud; brazos hacia fuera sobre el eje del hombro;
// manos fuera del puño sobre su poste; cadera hacia abajo del torso; piernas hacia abajo del eje de la cadera.
const _d=new THREE.Vector3();
function mover(o,dir,dist){if(!o)return;if(!o.userData.base)o.userData.base=o.position.clone();o.position.copy(o.userData.base).addScaledVector(dir,dist)}
function aplicarSeparacion(f,e){const J=f.userData.j;if(!J.legsG)return;const k=e<0?0:e;
 J.root.position.y+=0.72*k; // todo sube lo mismo que bajan las piernas: nada atraviesa el piso
 J.legsG.position.y=-0.3*k;J.head.position.y=J.headY+0.36*k;J.hairG.position.y=0.4*k;
 if(J.piernasArt){mover(J.legL,_d.set(0,-1,0),0.28*k);mover(J.legR,_d.set(0,-1,0),0.28*k)}
 if(J.mountR){mover(J.mountR,_d.set(1,0,0).applyQuaternion(J.mountR.quaternion),0.32*k);mover(J.mountL,_d.set(-1,0,0).applyQuaternion(J.mountL.quaternion),0.32*k)}
 if(J.handFR){mover(J.handFR,_d.set(0,0,1).applyQuaternion(J.handFR.quaternion),0.3*k);mover(J.handFL,_d.set(0,0,1).applyQuaternion(J.handFL.quaternion),0.3*k)}
 J.legsG.rotation.y=Math.sin(clock.getElapsedTime()*1.3)*0.1*k;J.head.rotation.y+=Math.sin(clock.getElapsedTime()*1.1+1)*0.25*k}
/* ---- Exportación LDraw (.ldr): abre en BrickLink Studio, LeoCAD y LDCad ---- */
function colorLD(hex){const a=new THREE.Color(hex);let mejor="16",d=1e9;for(const [code,h] of Object.entries(LDCOL)){const b=new THREE.Color(h);const dd=(a.r-b.r)**2+(a.g-b.g)**2+(a.b-b.b)**2;if(dd<d){d=dd;mejor=code}}return mejor}
function m3(a,b){return [0,1,2].flatMap(r=>[0,1,2].map(c=>a[r*3]*b[c]+a[r*3+1]*b[3+c]+a[r*3+2]*b[6+c]))}
function t3(R,p){return [R[0]*p[0]+R[1]*p[1]+R[2]*p[2],R[3]*p[0]+R[4]*p[1]+R[5]*p[2],R[6]*p[0]+R[7]*p[1]+R[8]*p[2]]}
function ldr(c){const L=[`0 ${c.nombre}`,`0 Name: ${slug(c.nombre)}.ldr`,"0 Author: Taller de Minifiguras (piezas LDraw.org, CC BY 4.0)","0 !LDRAW_ORG Unofficial_Model",""];
 const f=v=>+v.toFixed(4);const linea=(col,p,R,id)=>L.push(["1",col,...p.map(f),...R.map(f),id+".dat"].join(" "));const I=[1,0,0,0,1,0,0,0,1];
 const tipo=c.piernasTipo||"normal";
 linea(colorLD(c.torso),[0,0,0],I,"973");
 if(tipo==="cortas")linea(colorLD(c.piernas),ENSAMBLE.cadera,I,"41879a");
 else if(tipo==="normal"){linea(colorLD(c.cadera),ENSAMBLE.cadera,I,"3815");linea(colorLD(c.piernas),ENSAMBLE.piernas,I,"3816");linea(colorLD(c.piernas),ENSAMBLE.piernas,I,"3817")}
 linea(colorLD(c.piel),ENSAMBLE.cabeza,I,"3626c");
 if((c.cabello||"").startsWith("ld-"))linea(colorLD(c.pelo),ENSAMBLE.cabeza,I,c.cabello.slice(3));
 [["3818","brazoDer",-1],["3819","brazoIzq",1]].forEach(([id,k,s])=>{const E=ENSAMBLE[k],R=rotZ(E.z);linea(colorLD(c.brazos||c.torso),E.p,R,id);
  const pm=[s*ENSAMBLE.mano.p[0],ENSAMBLE.mano.p[1],ENSAMBLE.mano.p[2]];const Rm=m3(R,ENSAMBLE.mano.r),Pm=t3(R,pm).map((v,i)=>v+E.p[i]);linea(colorLD(c.manos||c.piel),Pm,Rm,"3820");
  if(s>0&&LD_ACC[c.accesorio]){const Ra=m3(Rm,ENSAMBLE.agarre.r),Pa=t3(Rm,ENSAMBLE.agarre.p).map((v,i)=>v+Pm[i]);linea(colorLD(colorAcc(c.accesorio)),Pa,Ra,LD_ACC[c.accesorio])}});
 L.push("","0 // Estampados, caras y piezas dibujadas en el Taller no existen en LDraw y se omiten.");return L.join("\r\n")+"\r\n"}
document.getElementById("bSeparar").onclick=alternar;
document.getElementById("bMezclar").onclick=mezclar;
window.addEventListener("keydown",e=>{const t=e.target;if(t&&(t.tagName==="INPUT"||t.tagName==="SELECT"||t.tagName==="TEXTAREA"))return;
 if(e.key==="ArrowLeft"){ciclar(slotAct,-1);e.preventDefault()}else if(e.key==="ArrowRight"){ciclar(slotAct,1);e.preventDefault()}
 else if(e.key==="ArrowUp"){slotAct=(slotAct+SLOTS.length-1)%SLOTS.length;pintarFlechas();e.preventDefault()}else if(e.key==="ArrowDown"){slotAct=(slotAct+1)%SLOTS.length;pintarFlechas();e.preventDefault()}
 else if((e.key===" "||e.key==="Enter")&&!(t&&t.tagName==="BUTTON")){alternar();e.preventDefault()}});
function loop(){requestAnimationFrame(loop);controls.update();
 // separar/unir con un pequeño rebote al encajar
 const obj=separado?1:0,dv=obj-sepVal;sepVal+=dv*0.16;if(!separado&&sepVal<0.02&&sepVal>-0.06)sepVal+=(0-sepVal)*0.3;
 const z=1/(1+0.55*Math.max(0,sepVal));if(Math.abs(camera.zoom-z)>1e-4){camera.zoom=z;camera.updateProjectionMatrix()}
 if(fig){animar(fig,pose,clock.getElapsedTime());aplicarSeparacion(fig,sepVal);actualizarEfectos(clock.getElapsedTime());if(!modoActual)moverFlechas()}
 if(POST.ok&&POST.activo){ajustarAO(POST.ssao,camera);POST.composer.render()}else renderer.render(scene,camera)}
