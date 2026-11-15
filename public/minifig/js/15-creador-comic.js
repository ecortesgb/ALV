/* ============ Creador estilo cómic (como el editor de LEGO Marvel Super Heroes 2) ============ */
const CASCOS_IDS=["ld-3624","ld-4485","ld-3833","ld-3898","ld-6131","ld-3878","ld-30381","ld-30133","ld-3896","ld-3844","ld-53450","ld-55704","ld-3842a","ld-30172"];
const PELOS=Object.fromEntries(Object.entries(LD_PELO).filter(([k])=>!CASCOS_IDS.includes(k)));
const CASCOS=Object.fromEntries(Object.entries(LD_PELO).filter(([k])=>CASCOS_IDS.includes(k)));
const CUELLO={ninguno:"Nada","ld-3838":"Tanques de aire","ld-2524":"Mochila","ld-4498":"Carcaj de flechas","ld-2587":"Armadura","ld-3840":"Chaleco","ld-15423":"Chaleco antibalas","ld-10052":"Barba larga","ld-95348":"Funda de espada","ld-61976":"Morral","ld-30091":"Tanque de buceo"};
const PODERES={vuelo:"Vuelo",fuerza:"Súper fuerza",velocidad:"Súper velocidad",telarana:"Telarañas",fuego:"Fuego",hielo:"Hielo",electricidad:"Electricidad",magia:"Magia",laser:"Rayos oculares",telequinesis:"Telequinesis",invisibilidad:"Invisibilidad",escudo:"Campo de fuerza"};
const PODER_COLOR={vuelo:"#7fd0ff",fuerza:"#ff9f1c",velocidad:"#ffe14d",telarana:"#ffffff",fuego:"#ff5a1f",hielo:"#9fe8ff",electricidad:"#7ab8ff",magia:"#c86bff",laser:"#ff2a2a",telequinesis:"#e07bff",invisibilidad:"#b8c4d6",escudo:"#5ff0ff"};
const RASGOS={"inmune-fuego":"Inmune al fuego","inmune-frio":"Inmune al frío","inmune-electricidad":"Inmune a la electricidad","agua":"Respira bajo el agua","nocturna":"Visión nocturna","regeneracion":"Regeneración","acero":"Piel de acero","tesoros":"Detecta tesoros","doble-salto":"Doble salto","grande":"Tamaño grande","pequeno":"Tamaño pequeño"};
const PALETA=["#f4f4f4","#a0a5a9","#6c6e68","#1b2a34","#f2cd37","#f6d7b3","#e4cd9e","#aa7d55","#7a4b25","#582a12","#c91a09","#720e0f","#fe8a18","#f8bb3d","#fff03a","#bbe90b","#4b9f4a","#237841","#184632","#9fc3e9","#5a93db","#0055bf","#0a3463","#55a5af","#c870a0","#923978","#81007b","#3f3691","#fc97ac","#e3b341"];

/* ---- Datos nuevos del personaje ---- */
const _P0=P;P=function(o){return _P0(Object.assign({poderes:[],rasgos:[],cuello:"ninguno",cuelloColor:"#6c6e68",accColor:null,cinturon:null,reposo:"quieto"},o))};

/* ---- Piezas extra sobre la figura (cuello, cinturón, color del objeto, tamaño) ---- */
const _build0=build;
build=function(c){const fig=_build0(c);const J=fig.userData.j;
 if(c.cuello&&c.cuello!=="ninguno"){const m=mallaLD(c.cuello.slice(3),plast(c.cuelloColor||"#6c6e68",{roughness:.4}),"cuello");if(m){const g=grupoLD(J.torso,ldM(0,0,0));g.add(m)}}
 if(c.cinturon&&c.piernasTipo!=="cortas"){const m=mallaLD("27145",plast(c.cinturon),"piernas");if(m){const g=grupoLD(J.legsG,ldM(0,32,0));g.add(m)}}
 if(c.accColor)J.handR.traverse(o=>{if(o.isMesh&&!o.userData.decal&&o.userData.part==="mano"){const ms=Array.isArray(o.material)?o.material:[o.material];o.material=ms.length===1?plast(c.accColor):ms.map((m,i)=>i===0?plast(c.accColor):m)}});
 const r=c.rasgos||[];J.escala=r.includes("grande")?1.25:r.includes("pequeno")?0.8:1;return fig};

/* ---- Efectos de poderes (solo en el visor) ---- */
let efectos=null;
function puntos(n,color,tam){const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(new Float32Array(n*3),3));
 const m=new THREE.PointsMaterial({color:new THREE.Color(color),size:tam||0.06,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending,map:chispa()});const p=new THREE.Points(g,m);p.frustumCulled=false;return p}
let _chispa=null;function chispa(){if(_chispa)return _chispa;const c=cv(64,64),g=c.getContext("2d");const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,"#fff");r.addColorStop(.35,"#ffffffaa");r.addColorStop(1,"#fff0");g.fillStyle=r;g.fillRect(0,0,64,64);return _chispa=new THREE.CanvasTexture(c)}
function crearEfectos(f,c){const lista=(c.poderes||[]).slice(0,4);const ef={f,items:[],t0:performance.now()};
 lista.forEach(p=>{const it={p,col:PODER_COLOR[p]};
  if(["fuego","hielo","electricidad","magia","telequinesis","velocidad","telarana","vuelo"].includes(p)){it.pts=puntos(p==="electricidad"?90:70,it.col,p==="velocidad"?0.05:0.07);it.seed=Array.from({length:it.pts.geometry.attributes.position.count},()=>[Math.random(),Math.random(),Math.random()]);scene.add(it.pts)}
  if(p==="fuerza"||p==="escudo"){const geo=p==="fuerza"?new THREE.RingGeometry(0.3,0.36,48):new THREE.SphereGeometry(1.45,32,24);
   const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:new THREE.Color(it.col),transparent:true,opacity:p==="escudo"?.12:.6,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));if(p==="fuerza")m.rotation.x=-Math.PI/2;it.mesh=m;scene.add(m)}
  if(p==="laser"){it.rayos=[-1,1].map(s=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,1.6,8),new THREE.MeshBasicMaterial({color:0xff3030,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false}));m.rotation.x=Math.PI/2;m.userData.s=s;scene.add(m);return m})}
  ef.items.push(it)});
 if(lista.includes("invisibilidad"))f.traverse(o=>{if(o.isMesh){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{m.transparent=true;m.userData.invis=true})}});
 return ef}
function quitarEfectos(){if(!efectos)return;efectos.items.forEach(it=>{[it.pts,it.mesh,...(it.rayos||[])].forEach(o=>{if(o){scene.remove(o);o.geometry.dispose();o.material.dispose()}})});efectos=null}
const _w=new THREE.Vector3(),_w2=new THREE.Vector3();
function actualizarEfectos(t){if(!efectos||!fig)return;const J=fig.userData.j;const vol=(actual.poderes||[]).includes("vuelo");
 if(J.escala&&J.escala!==1)J.root.scale.setScalar(J.escala);
 if(vol&&!J.momento){J.root.position.y+=0.35+Math.sin(t*2)*0.06}   // en un momento, la altura la pone el momento
 const kfx=J.fx==null?1:J.fx;
 fig.updateMatrixWorld(true);
 const mano=(J.handR?J.handR.getWorldPosition(_w):_w.set(0.4,1,0.3)).clone(),manoL=(J.handL?J.handL.getWorldPosition(_w2):_w2.set(-0.4,1,0.3)).clone();
 const cabeza=J.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,-0.25,0));const pecho=J.torso.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,-0.4,0));const pies=J.root.getWorldPosition(new THREE.Vector3());
 efectos.items.forEach(it=>{const p=it.p;
  if(it.pts){const a=it.pts.geometry.attributes.position;for(let i=0;i<a.count;i++){const [r1,r2,r3]=it.seed[i];const ph=(t*0.6+r1)%1;let x,y,z;
    if(p==="fuego"){const o=i%2?mano:manoL;x=o.x+(r2-.5)*0.15*(1-ph);y=o.y+ph*0.6;z=o.z+(r3-.5)*0.15}
    else if(p==="hielo"){const o=i%2?mano:manoL;const a2=r2*6.28+t;x=o.x+Math.cos(a2)*0.12*ph;y=o.y-ph*0.4+0.05;z=o.z+Math.sin(a2)*0.12*ph+ph*0.2}
    else if(p==="electricidad"){const a2=r1*6.28;const h=r2*2.4;x=Math.cos(a2)*0.55+(Math.random()-.5)*0.08;y=pies.y+h;z=Math.sin(a2)*0.4+(Math.random()-.5)*0.08;if(Math.random()<.15)y=-99}
    else if(p==="magia"){const a2=r1*6.28+t*2.5;const rr=0.18+r2*0.08;x=mano.x+Math.cos(a2)*rr;y=mano.y+Math.sin(a2*0.5+r3)*0.1+0.1;z=mano.z+Math.sin(a2)*rr}
    else if(p==="telequinesis"){const a2=r1*6.28+t*1.2;x=cabeza.x+Math.cos(a2)*0.5;y=cabeza.y+0.2+Math.sin(t*2+r2*6)*0.12;z=cabeza.z+Math.sin(a2)*0.5}
    else if(p==="velocidad"){x=(r2-.5)*0.8;y=pies.y+0.1+r3*2.2;z=-ph*1.6-0.3}
    else if(p==="telarana"){x=mano.x+(r2-.5)*0.02;y=mano.y+(r3-.5)*0.02+ph*0.1;z=mano.z+ph*1.4}
    else if(p==="vuelo"){x=(r2-.5)*0.4;y=pies.y-ph*0.4;z=(r3-.5)*0.3}
    a.setXYZ(i,x,y,z)}a.needsUpdate=true;it.pts.material.opacity=(p==="electricidad"?0.6+Math.random()*0.4:0.9)*kfx}
  if(it.mesh){if(p==="fuerza"){const k=(t*0.8)%1;it.mesh.position.set(pies.x,pies.y+0.01,pies.z);it.mesh.scale.setScalar(0.6+k*4);it.mesh.material.opacity=0.6*(1-k)*kfx}
   else{it.mesh.position.copy(pecho);it.mesh.material.opacity=(0.1+Math.sin(t*3)*0.04)*(J.momento?0.4+1.6*kfx:1)}}
  if(it.rayos)it.rayos.forEach(m=>{const s=m.userData.s;const q=J.head.getWorldQuaternion(new THREE.Quaternion());const off=new THREE.Vector3(s*0.1,-0.27,0.33+0.8).applyQuaternion(q);m.position.copy(J.head.getWorldPosition(new THREE.Vector3())).add(off);m.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2));m.material.opacity=(0.6+Math.sin(t*20)*0.25)*kfx;m.visible=kfx>0.02})});
 if((actual.poderes||[]).includes("invisibilidad"))fig.traverse(o=>{if(o.isMesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m.userData.invis)m.opacity=J.opac!=null?J.opac:0.35+Math.sin(t*2)*0.15})})}

/* ---- Miniaturas de piezas (render real de la pieza) ---- */
const MINIS=new Map();let colaM=[],corriendoM=false;
const VER_PARTES={pelo:["piel","rostro","cabello"],cascos:["piel","rostro","cabello"],cabeza:["piel","rostro","facial"],accesorios:["piel","rostro","facial","cabello"],cuello:["cuello","torso"],manos:["torso"],cuerpo:["torso"],brazos:["torso"],capas:["torso","capa"],cadera:["piernas"],piernas:["piernas"],armas:["mano"]};
function pedirMini(sec,c,img){const k=sec+"|"+JSON.stringify(c);if(MINIS.has(k)){img.src=MINIS.get(k);return}colaM.push({sec,c,img,k});if(!corriendoM)procesarM()}
async function procesarM(){corriendoM=true;while(colaM.length){const {sec,c,img,k}=colaM.shift();if(!img.isConnected)continue;if(!MINIS.has(k)){
  const url=conFigura(c,f=>{animar(f,"quieto",0);const vis=VER_PARTES[sec]||["piel","torso","piernas","cabello","rostro"];let caja=new THREE.Box3();
   f.updateMatrixWorld(true);f.traverse(o=>{if(o.isMesh){const ok=vis.includes(o.userData.part)&&!(sec==="manos"&&o.userData.sub!=="mano"&&o.userData.part==="torso"&&false);o.visible=ok;if(ok&&!o.userData.decal)caja.expandByObject(o)}});
   if(sec==="manos")f.traverse(o=>{if(o.isMesh)o.visible=o.userData.sub==="mano"||(o.userData.part==="torso"&&!o.userData.decal&&o.userData.ld!=="973")});
   if(caja.isEmpty())caja.set(new THREE.Vector3(-0.5,0,-0.5),new THREE.Vector3(0.5,2.5,0.5));
   const cen=caja.getCenter(new THREE.Vector3()),tam=caja.getSize(new THREE.Vector3()).length();const cam=new THREE.PerspectiveCamera(24,1,0.1,50);
   const dir=new THREE.Vector3(sec==="capas"?-0.5:0.45,0.3,sec==="capas"?-1:1).normalize();cam.position.copy(cen).addScaledVector(dir,tam/(2*Math.tan(12*Math.PI/180))*0.95);cam.lookAt(cen);
   return snap(cam,180,180,false).toDataURL("image/png")});MINIS.set(k,url)}
  if(img.isConnected)img.src=MINIS.get(k);await espera()}corriendoM=false}

/* ---- Navegación del libro ---- */
const CM={pila:["inicio"],nivelesALV:false,deshacer:null};
const SECCIONES=[
 {k:"pelo",n:"Pelo"},{k:"cabeza",n:"Cabeza"},{k:"cuello",n:"Cuello"},{k:"cascos",n:"Cascos"},{k:"accesorios",n:"Accesorios"},{k:"manos",n:"Manos"},
 {k:"cuerpo",n:"Cuerpo"},{k:"brazos",n:"Brazos"},{k:"capas",n:"Capas"},{k:"cadera",n:"Cadera"},{k:"piernas",n:"Piernas"}];
// Qué opciones tiene cada sección y qué color cambia
function opcionesDe(sec){const c=actual,v=(o)=>Object.assign(JSON.parse(JSON.stringify(c)),o);
 switch(sec){
  case"pelo":return [["ninguno","Sin pelo"],...Object.entries(PELOS)].map(([k,n])=>({k,n,c:v({cabello:k}),on:c.cabello===k,set:{cabello:k}}));
  case"cascos":return [["ninguno","Sin casco"],...Object.entries(CASCOS)].map(([k,n])=>({k,n,c:v({cabello:k}),on:c.cabello===k,set:{cabello:k}}));
  case"cabeza":return Object.entries(ROSTROS).map(([k,n])=>({k,n,c:v({rostro:k}),on:c.rostro===k,set:{rostro:k}}));
  case"accesorios":return Object.entries(FACIAL).map(([k,n])=>({k,n,c:v({facial:[k]}),on:(c.facial||[]).includes(k),toggle:"facial"}));
  case"cuello":return Object.entries(CUELLO).map(([k,n])=>({k,n,c:v({cuello:k}),on:(c.cuello||"ninguno")===k,set:{cuello:k}}));
  case"manos":return [["piel","Como la piel",null],["guantes","Guantes",c.manos||"#1b2a34"]].map(([k,n,col])=>({k,n,c:v({manos:col}),on:k==="piel"?!c.manos:!!c.manos,set:{manos:col}}));
  case"cuerpo":return Object.entries(TORSOS).map(([k,n])=>({k,n,c:v({estampado:k,capa:null,cuello:"ninguno"}),on:c.estampado===k,set:{estampado:k}}));
  case"brazos":return [["torso","Como el cuerpo",null],["propio","Color propio",c.brazos||"#1b2a34"]].map(([k,n,col])=>({k,n,c:v({brazos:col}),on:k==="torso"?!c.brazos:!!c.brazos,set:{brazos:col}}));
  case"capas":return [["no","Sin capa",null],["si","Capa de tela",c.capa||"#c91a09"]].map(([k,n,col])=>({k,n,c:v({capa:col}),on:k==="no"?!c.capa:!!c.capa,set:{capa:col}}));
  case"cadera":return [["normal","Cadera y piernas","normal",null],["cortas","Piernas cortas","cortas",null],["cinturon","Con cinturón","normal",c.cinturon||"#582a12"]].map(([k,n,t,cin])=>({k,n,c:v({piernasTipo:t,cinturon:cin}),on:k==="cinturon"?(!!c.cinturon&&c.piernasTipo!=="cortas"):k==="cortas"?c.piernasTipo==="cortas":(c.piernasTipo!=="cortas"&&!c.cinturon),set:{piernasTipo:t,cinturon:cin}}));
  case"piernas":return [["lisas","Lisas",null],["botas","Con botas",c.botas||"#1b2a34"]].map(([k,n,b])=>({k,n,c:v({botas:b}),on:k==="botas"?!!c.botas:!c.botas,set:{botas:b}}));
  case"armas":return Object.entries(ACCES).map(([k,n])=>({k,n,c:v({accesorio:k}),on:c.accesorio===k,set:{accesorio:k,accColor:null}}));
 }return[]}
const COLOR_DE={pelo:[["pelo","Color"]],cascos:[["pelo","Color"]],cabeza:[["piel","Piel"]],cuello:[["cuelloColor","Color"]],manos:[["manos","Guantes"]],cuerpo:[["torso","Base"],["c1","Estampado 1"],["c2","Estampado 2"],["c3","Estampado 3"]],brazos:[["brazos","Brazos"]],capas:[["capa","Capa"]],cadera:[["cadera","Cadera"],["cinturon","Cinturón"]],piernas:[["piernas","Piernas"],["botas","Botas"]],armas:[["accColor","Objeto"]]};
let cmColorKey=null;
function bloqueado(o){if(!CM.nivelesALV)return false;const dueño=lista.find(x=>x.franquicia!=="MEZCLAS"&&(x.cabello===o.k||x.estampado===o.k||x.accesorio===o.k||x.rostro===o.k));return !!(dueño&&dueño.nivel>actual.nivel&&!o.on)}
function cmIr(v){CM.pila.push(v);cmColorKey=null;cmPintar()}
function cmAtras(){if(CM.pila.length>1)CM.pila.pop();cmColorKey=null;cmPintar()}
function cmAplicar(o){if(bloqueado(o)){cmEstado(`BLOQUEADO · se desbloquea con un personaje de nivel más alto`);return}
 if(o.toggle){const s=new Set(actual[o.toggle]||[]);s.has(o.k)?s.delete(o.k):s.add(o.k);actual[o.toggle]=[...s]}else Object.assign(actual,o.set);
 cambio();pintarEditor();cmPintar()}
function cmEstado(t){const el=document.getElementById("cmEstado");el.textContent=t||"";}
function panelHTML(id,titulo,img,extra){return `<button class="panel ${extra||""}" data-ir="${id}"><img alt="" data-mini="${id}"><span class="etq">${titulo}</span></button>`}
function cmPintar(){const v=CM.pila[CM.pila.length-1],cont=document.getElementById("cmContenido"),tit=document.getElementById("cmTitulo");
 document.getElementById("cmNombre").textContent=(actual.nombre||"Personaje").toUpperCase();document.getElementById("cmAtras").hidden=CM.pila.length<=1;cmEstado("");
 if(v==="inicio"){tit.textContent="CREADOR";cont.className="cm-grid cm-6";
  cont.innerHTML=[["apariencia","Apariencia"],["habilidades","Habilidades"],["armas","Armas"],["rasgos","Rasgos pasivos"],["varios","Varios"],["aleatorio","Aleatorio"]].map(([k,n],i)=>panelHTML(k,n,null,i===0?"sel":"")).join("");
  cont.querySelectorAll("[data-ir]").forEach(b=>{b.onclick=()=>{const k=b.dataset.ir;if(k==="aleatorio")cmAleatorio();else cmIr(k)};b.onmouseenter=()=>{cont.querySelectorAll(".panel").forEach(x=>x.classList.remove("sel"));b.classList.add("sel")}});
  const mini={apariencia:["cabeza",Object.assign({},actual)],habilidades:["todo",Object.assign({},actual)],armas:["armas",Object.assign({},actual,{accesorio:actual.accesorio!=="ninguno"?actual.accesorio:"espada"})],rasgos:["todo",lista.find(x=>x.id==="hulk")||actual],varios:["cuello",Object.assign({},actual,{cuello:"ld-2524"})],aleatorio:["todo",lista[Math.floor(Math.random()*lista.length)]]};
  cont.querySelectorAll("img[data-mini]").forEach(im=>{const [s,c]=mini[im.dataset.mini];pedirMini(s,c,im)});return}
 if(v==="apariencia"){tit.textContent="APARIENCIA";cont.className="cm-grid cm-11";cont.innerHTML=SECCIONES.map((s,i)=>panelHTML(s.k,s.n,null,i===0?"sel":"")).join("");
  cont.querySelectorAll("[data-ir]").forEach(b=>{b.onclick=()=>cmIr(b.dataset.ir);b.onmouseenter=()=>{cont.querySelectorAll(".panel").forEach(x=>x.classList.remove("sel"));b.classList.add("sel")}});
  cont.querySelectorAll("img[data-mini]").forEach(im=>pedirMini(im.dataset.mini,Object.assign({},actual),im));return}
 if(v==="habilidades"||v==="rasgos"){const D=v==="habilidades"?PODERES:RASGOS,key=v==="habilidades"?"poderes":"rasgos",max=v==="habilidades"?4:6;tit.textContent=v==="habilidades"?"HABILIDADES":"RASGOS PASIVOS";cont.className="cm-grid cm-piezas";
  cont.innerHTML=Object.entries(D).map(([k,n])=>{const on=(actual[key]||[]).includes(k);return `<button class="pieza poder ${on?"on":""}" data-k="${k}" style="--c:${PODER_COLOR[k]||"#ffd21a"}"><span class="boom">${esc(n)}</span>${on?'<i class="marca"></i>':""}</button>`}).join("");
  cont.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{const s=new Set(actual[key]||[]);if(s.has(b.dataset.k))s.delete(b.dataset.k);else{if(s.size>=max){cmEstado(`Máximo ${max}. Quita uno para agregar otro.`);return}s.add(b.dataset.k)}
   if(b.dataset.k==="grande")s.delete("pequeno");if(b.dataset.k==="pequeno")s.delete("grande");actual[key]=[...s];cambio();cmPintar()});
  cmEstado(v==="habilidades"?`Elige hasta ${max} poderes. Se ven en el visor.`:"Rasgos que el personaje lleva a ALV.");return}
 if(v==="varios"){tit.textContent="VARIOS";cont.className="cm-varios";
  cont.innerHTML=`<label>Nombre<input id="cmNom" type="text" value="${esc(actual.nombre)}"></label>
   <label>Colección<input id="cmFr" type="text" list="dl_fr" value="${esc(actual.franquicia)}"></label>
   <label>Equipo en ALV<select id="cmEq">${sel(EQUIPOS,actual.equipo)}</select></label>
   <label>Nivel<input id="cmNv" type="number" min="1" max="20" value="${actual.nivel}"></label>
   <div class="cm-sub">Animación en reposo</div><div class="cm-chips">${Object.entries(POSES).filter(([k])=>k!=="manual").map(([k,n])=>`<button data-pose="${k}" aria-pressed="${(actual.reposo||"quieto")===k}">${n}</button>`).join("")}</div>
   <label class="cm-check"><input type="checkbox" id="cmNiv" ${CM.nivelesALV?"checked":""}> Bloquear piezas de personajes con más nivel (como en ALV)</label>
   <div class="cm-sub">Guardar</div><div class="cm-chips"><button id="cmFoto">Foto PNG</button><button id="cmPiezas">Piezas para ALV</button><button id="cmTaller">Abrir el taller</button></div>`;
  const up=(k,val)=>{actual[k]=val;cambio(true)};
  document.getElementById("cmNom").oninput=e=>{up("nombre",e.target.value);document.getElementById("cmNombre").textContent=e.target.value.toUpperCase()};
  document.getElementById("cmFr").onchange=e=>up("franquicia",e.target.value||"GENERIC");document.getElementById("cmEq").onchange=e=>up("equipo",e.target.value);document.getElementById("cmNv").onchange=e=>up("nivel",Math.max(1,+e.target.value||1));
  cont.querySelectorAll("[data-pose]").forEach(b=>b.onclick=()=>{actual.reposo=b.dataset.pose;pose=actual.reposo;guardar();pintarPoses();cmPintar()});
  document.getElementById("cmNiv").onchange=e=>{CM.nivelesALV=e.target.checked};
  document.getElementById("cmFoto").onclick=()=>document.getElementById("bFoto").click();document.getElementById("cmPiezas").onclick=()=>document.getElementById("bPiezas").click();document.getElementById("cmTaller").onclick=()=>modoComic(false);return}
 // Cuadrícula de piezas de una sección (o armas)
 const sec=v,ops=opcionesDe(sec),nombre=(SECCIONES.find(s=>s.k===sec)||{n:"Armas"}).n;tit.textContent=nombre.toUpperCase();cont.className="cm-grid cm-piezas";
 cont.innerHTML=ops.map((o,i)=>{const lock=bloqueado(o);return `<button class="pieza ${o.on?"on":""} ${lock?"lock":""}" data-i="${i}" title="${esc(o.n)}"><img alt="" data-i="${i}"><span class="nom">${esc(o.n)}</span>${o.on?'<i class="marca"></i>':""}</button>`}).join("");
 cont.querySelectorAll("button[data-i]").forEach(b=>{const o=ops[+b.dataset.i];b.onclick=()=>cmAplicar(o);b.onmouseenter=()=>cmEstado(bloqueado(o)?"BLOQUEADO":o.n.toUpperCase())});
 cont.querySelectorAll("img[data-i]").forEach(im=>pedirMini(sec,ops[+im.dataset.i].c,im));
 // Colores de la sección
 const cols=COLOR_DE[sec]||[];if(cols.length){if(!cmColorKey||!cols.some(x=>x[0]===cmColorKey))cmColorKey=cols[0][0];
  const pal=document.createElement("div");pal.className="cm-paleta";pal.innerHTML=(cols.length>1?`<div class="cm-chips">${cols.map(([k,n])=>`<button data-ck="${k}" aria-pressed="${k===cmColorKey}">${n}</button>`).join("")}</div>`:"")+
   `<div class="cm-sw">${PALETA.map(h=>`<button style="background:${h}" data-col="${h}" aria-label="${h}" aria-pressed="${(actual[cmColorKey]||"").toLowerCase()===h}"></button>`).join("")}<label class="cm-otro" title="Otro color"><input type="color" id="cmCol" value="${actual[cmColorKey]||"#888888"}">+</label></div>`;
  cont.appendChild(pal);pal.querySelectorAll("[data-ck]").forEach(b=>b.onclick=()=>{cmColorKey=b.dataset.ck;cmPintar()});
  const ponColor=h=>{actual[cmColorKey]=h;if(cmColorKey==="botas"&&!actual.botas)actual.botas=h;cambio();pintarEditor();cmPintar()};
  pal.querySelectorAll("[data-col]").forEach(b=>b.onclick=()=>ponColor(b.dataset.col));document.getElementById("cmCol").onchange=e=>ponColor(e.target.value)}}
function cmAleatorio(){CM.deshacer=JSON.parse(JSON.stringify(actual));const r=o=>{const k=Object.keys(o);return k[Math.floor(Math.random()*k.length)]};const col=()=>PALETA[Math.floor(Math.random()*PALETA.length)];
 Object.assign(actual,{cabello:Math.random()<.7?r(PELOS):r(CASCOS),pelo:col(),rostro:r(ROSTROS),facial:Math.random()<.4?[r(FACIAL)]:[],estampado:r(TORSOS),torso:col(),c1:col(),c2:col(),c3:col(),brazos:Math.random()<.5?null:col(),manos:Math.random()<.7?null:col(),cadera:col(),piernas:col(),botas:Math.random()<.5?col():null,accesorio:r(ACCES),capa:Math.random()<.3?col():null,cuello:Math.random()<.3?r(CUELLO):"ninguno",cuelloColor:col(),poderes:[r(PODERES)]});
 if(actual.rostro.startsWith("mascara"))actual.rostro="sonrisa";cambio();pintarEditor();cmPintar();cmEstado("Personaje al azar listo.");
 const b=document.createElement("button");b.className="cm-deshacer";b.textContent="Deshacer";b.onclick=()=>{if(CM.deshacer){Object.assign(actual,CM.deshacer);CM.deshacer=null;cambio();pintarEditor();cmPintar()}};document.getElementById("cmEstado").appendChild(b)}
function cmPersonaje(d){const i=lista.indexOf(actual);actual=lista[(i+d+lista.length)%lista.length];franq=actual.franquicia;pose=actual.reposo||"quieto";rehacer();pintarTabs();pintarCat();pintarEditor();pintarPoses();cmPintar()}
// Mover el visor 3D entre el libro y el taller
let modoActual=null;
function modoComic(on){modoActual=on;document.getElementById("comic").hidden=!on;const destino=on?document.getElementById("cmVisor"):stage;destino.insertBefore(renderer.domElement,destino.firstChild);resize();if(on)cmPintar()}
document.getElementById("cmAtras").onclick=cmAtras;document.getElementById("cmPrev").onclick=()=>cmPersonaje(-1);document.getElementById("cmNext").onclick=()=>cmPersonaje(1);
document.getElementById("cmSalir").onclick=()=>modoComic(false);document.getElementById("bComic").onclick=()=>modoComic(true);
document.getElementById("cmZoom").oninput=e=>{const k=+e.target.value;camera.zoom=k;camera.updateProjectionMatrix()};
window.addEventListener("keydown",e=>{if(modoActual!==true)return;const t=e.target;if(t&&(t.tagName==="INPUT"||t.tagName==="SELECT"))return;if(e.key==="Escape"||e.key==="Backspace"){cmAtras();e.preventDefault()}else if(e.key==="t"||e.key==="T"){modoComic(false)}});
new ResizeObserver(()=>{if(modoActual)resize()}).observe(document.getElementById("cmVisor"));
