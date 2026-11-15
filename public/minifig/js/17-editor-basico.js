/* ============ Personalizador (fase 2): editor básico en 9 pasos ============ */
// Edita una figura v2 con las funciones de MinifigCore (nunca toca el modelo plano).
// Cada paso es una lista de bloques: viñetas con miniatura, chips, paletas o notas.
const PASOS=[
 {k:"piel",n:"Piel",foco:"cabeza"},{k:"rostro",n:"Rostro",foco:"cabeza"},{k:"cabello",n:"Cabello",foco:"cabeza"},
 {k:"torso",n:"Torso",foco:"torso"},{k:"piernas",n:"Piernas",foco:"piernas"},{k:"cabeza",n:"Cabeza y cara",foco:"cabeza"},
 {k:"accesorios",n:"Accesorios",foco:"todo"},{k:"poderes",n:"Poderes",foco:"todo"},{k:"guardar",n:"Guardar",foco:"todo"}];
const ESTILOS_ED=[["fem","Femenino"],["masc","Masculino"],["todo","Neutro / Ver todo"]];
const COLOR_MASCARA={FACE_012:"#c91a09",FACE_013:"#1b2a34",FACE_014:"#1d3f8f",FACE_015:"#c91a09"};
const QUITAR_DE={cabeza:"casco",cara:"mascara",espalda:"espalda",mano_der:"objeto"};
const clonF=o=>JSON.parse(JSON.stringify(o));
const edPiezas=cat=>BIB.piezas.concat(BIB.estampados).filter(p=>p.categoria===cat);
const nomPz=id=>(BIB.porId[id]||{}).nombre||id;

/* ---- Abrir, cambiar, deshacer ---- */
function prEditar(f,destino){PR.ed={f:clonF(f),hist:[],paso:0,cambios:false,pregunta:null,visto:new Set([0]),modo:"basico",tab:"cabeza",verTodo:false};if(destino!=null)PR.destino=destino;prIr("editor")}
function edPoner(g,msg,foco){const E=PR.ed;if(!g)return;if(E.trajes)foco="todo";else if(!foco&&E.modo==="avanzado")foco=(AV_TABS.find(t=>t.k===E.tab)||{}).foco;E.hist.push(E.f);if(E.hist.length>40)E.hist.shift();E.f=g;E.cambios=true;E.pregunta=null;
 prMostrar(g);prPintar();if(msg)prEstado(msg);prEnfocar(foco||PASOS[E.paso].foco,true)}
function edDeshacer(){const E=PR.ed;if(!E.hist.length)return;E.f=E.hist.pop();E.pregunta=null;prMostrar(E.f);prPintar();prEstado("Deshecho.")}
function edCon(fn){const g=clonF(PR.ed.f);fn(g);return g}
const trajeVisible=f=>!!(f.traje&&f.traje.id&&f.traje.encima!==false);
function edTrajes(on){prPararMomento();const E=PR.ed;E.trajes=on;E.pregunta=null;prPintar();prEnfocar("todo");document.getElementById("prContenido").scrollTop=0}
function edVestir(id){const r=MinifigCore.vestirTraje(PR.ed.f,id,BIB);if(r.error)return prEstado(r.error);
 const p=BIB.personajes.find(x=>x.id===id);edPoner(r.figura,[`Traje de ${p.nombre} puesto: tu piel, cara y pelo siguen debajo.`].concat(r.avisos).join(" "),"todo")}
function edQuitarTraje(){edPoner(MinifigCore.quitarTraje(PR.ed.f).figura,"Traje quitado: volviste a tu identidad y tu ropa.","todo")}
function edPaso(i){prPararMomento();const E=PR.ed;E.trajes=false;E.paso=Math.max(0,Math.min(PASOS.length-1,i));E.visto.add(E.paso);E.pregunta=null;prPintar();prEnfocar(PASOS[E.paso].foco);document.getElementById("prContenido").scrollTop=0}
// Torso o piernas completos. Si hay traje puesto, primero pasa a ser ropa propia.
function edConjunto(grupo,vals,decision){const E=PR.ed,f=E.f;let base=f,dec=decision;
 if(trajeVisible(f)){base=MinifigCore.soltarTraje(f,BIB).figura;if(!dec&&!MinifigCore.editadoEnAvanzado(f,grupo))dec="reemplazar"}
 const r=MinifigCore.cambiarConjunto(base,grupo,vals,dec);
 if(r.pregunta){E.pregunta={grupo,vals,texto:r.pregunta.texto,opciones:r.pregunta.opciones};prPintar();return}
 edPoner(r.figura,trajeVisible(f)?"El traje ahora es tu ropa: ya puedes cambiarlo.":"")}
function edAccesorio(esp,pieza,foco){const f=PR.ed.f;
 if(!pieza&&f.traje&&f.traje.id){const g=edCon(x=>{x.accesorios[esp]=null;const q=QUITAR_DE[esp];x.traje.quitar=Array.from(new Set((x.traje.quitar||[]).concat(q)))});return edPoner(g,"",foco)}
 const r=MinifigCore.ponerAccesorio(f,esp,pieza,BIB,"basico");if(r.error)return prEstado(r.error);edPoner(r.figura,(r.avisos||[]).join(". "),foco)}
function edDetalle(id){const r=MinifigCore.ponerDetalle(PR.ed.f,id,BIB,"basico");edPoner(r.figura,(r.avisos||[]).join(". "),"cabeza")}

/* ---- Cámara: acercamiento corto a la parte que se edita ---- */
const PARTES_FOCO={cabeza:["piel","rostro","facial","cabello"],torso:["torso"],piernas:["piernas"],mano:["mano"]};
const CAM_DIR=new THREE.Vector3(3.2,0.9,7.2).normalize();let camTween=null,tVolverCam=0;
function prEnfocar(parte,temporal){if(!fig)return;clearTimeout(tVolverCam);let tgt=new THREE.Vector3(0,1.2,0),dist=7.9;
 const vis=PARTES_FOCO[parte];
 if(vis){fig.updateMatrixWorld(true);const caja=new THREE.Box3();fig.traverse(o=>{if(o.isMesh&&vis.includes(o.userData.part)&&!o.userData.decal)caja.expandByObject(o)});
  if(!caja.isEmpty()){tgt=caja.getCenter(new THREE.Vector3());dist=Math.max(1.7,caja.getSize(new THREE.Vector3()).length()/(2*Math.tan(camera.fov*Math.PI/360))*1.15)}}
 camTween={t0:performance.now(),dur:320,p0:camera.position.clone(),q0:controls.target.clone(),p1:tgt.clone().addScaledVector(CAM_DIR,dist),q1:tgt};requestAnimationFrame(pasoCam);
 const b=document.getElementById("prCompleto");b.hidden=!vis;
 if(vis&&temporal)tVolverCam=setTimeout(()=>{if(PR.on&&prVer()==="editor")prEnfocar("todo")},3500)}
function pasoCam(){if(!camTween)return;const T=camTween,k=Math.min(1,(performance.now()-T.t0)/T.dur),e=1-Math.pow(1-k,3);
 camera.position.lerpVectors(T.p0,T.p1,e);controls.target.lerpVectors(T.q0,T.q1,e);if(k<1)requestAnimationFrame(pasoCam);else camTween=null}

/* ---- Bloques de cada paso ---- */
function edOrden(lista){return MinifigCore.ordenarPorEstilo(lista.map(p=>p.id),PR.ed.f.identidad.estilo,BIB).map(id=>lista.find(p=>p.id===id))}
function bloquesDe(paso){const E=PR.ed,f=E.f,R=MinifigCore.resolver(f,BIB),I=f.identidad,Ro=f.ropa,A=f.accesorios,B=[];
 const traje=trajeVisible(f)?(BIB.personajes.find(p=>p.id===f.traje.id)||{}).nombre:null;
 const opcTraje={tipo:"chips",ops:[{n:"Quitar el traje",act:edQuitarTraje},{n:"Ver trajes",act:()=>edTrajes(true)}]};
 const estilo={tipo:"chips",titulo:"Mostrar primero",ops:ESTILOS_ED.map(([k,n])=>({n,on:(I.estilo||"neutro")===k||(k==="todo"&&(!I.estilo||I.estilo==="neutro"||I.estilo==="todo")),act:()=>{E.f.identidad.estilo=k;prPintar()}}))};
 const oculto=q=>R.ocultos.includes(q);
 switch(paso){
  case"piel":
   B.push({tipo:"grid",sec:"cabeza",ops:MinifigCore.TONOS.map(t=>({n:t.nombre,on:I.piel===t.hex,vista:edCon(g=>g.identidad.piel=t.hex),act:()=>edPoner(edCon(g=>g.identidad.piel=t.hex))}))});
   B.push({tipo:"nota",texto:"Las manos y los brazos descubiertos siguen a la piel."});break;
  case"rostro":
   B.push(estilo);
   if(oculto("rostro"))B.push({tipo:"nota",texto:"Tu rostro está guardado debajo de la máscara. Se ve al quitarla (paso Cabeza y cara)."});
   B.push({tipo:"grid",titulo:"Expresión",sec:"cabeza",ops:edOrden(edPiezas("cara").filter(p=>p.ocupa!=="cara")).map(p=>({n:p.nombre,on:I.rostro===p.id,vista:edCon(g=>g.identidad.rostro=p.id),act:()=>edPoner(edCon(g=>g.identidad.rostro=p.id))}))});
   const dets=edPiezas("detalle").filter(p=>p.ocupa!=="barba");
   B.push({tipo:"grid",titulo:"Lentes y detalles (toca otra vez para quitar)",sec:"cabeza",ops:[{n:"Ninguno",on:!(I.detalles||[]).some(id=>dets.some(d=>d.id===id)),vista:edCon(g=>g.identidad.detalles=g.identidad.detalles.filter(id=>!dets.some(d=>d.id===id))),act:()=>edPoner(edCon(g=>g.identidad.detalles=g.identidad.detalles.filter(id=>!dets.some(d=>d.id===id))))}]
    .concat(dets.map(p=>({n:p.nombre,on:(I.detalles||[]).includes(p.id),vista:MinifigCore.ponerDetalle(f,p.id,BIB,"basico").figura,act:()=>edDetalle(p.id)})))});break;
  case"cabello":{
   B.push(estilo);const col=(I.cabello&&I.cabello.color)||"#582a12";
   const conPelo=(g,id)=>{g.identidad.cabello=id?{id,color:col}:null;if(id)g.accesorios.cabeza=null};
   if(A.cabeza)B.push({tipo:"nota",texto:"Llevas casco o gorro: el pelo está guardado debajo. Si eliges un peinado, quitamos el casco."});
   else if(oculto("cabello"))B.push({tipo:"nota",texto:"El traje tapa el pelo; tu peinado queda guardado debajo."});
   B.push({tipo:"grid",sec:"pelo",ops:[{n:"Sin pelo",on:!I.cabello,vista:edCon(g=>conPelo(g,null)),act:()=>edPoner(edCon(g=>conPelo(g,null)))}]
    .concat(edOrden(edPiezas("cabello")).map(p=>({n:p.nombre,on:!!I.cabello&&I.cabello.id===p.id,vista:edCon(g=>conPelo(g,p.id)),act:()=>edPoner(edCon(g=>conPelo(g,p.id)),A.cabeza?"Quitamos el casco para que se vea el pelo.":"")})))});
   if(I.cabello)B.push({tipo:"colores",titulo:"Color de pelo",paleta:MinifigCore.COLORES_PELO,actual:I.cabello.color,set:h=>edPoner(edCon(g=>g.identidad.cabello.color=h))});
   break}
  case"torso":{
   if(traje)B.push({tipo:"nota",texto:`Llevas el traje de ${traje}. Si cambias algo aquí, el traje pasa a ser tu ropa y lo puedes editar. Si prefieres tu propia ropa, quita el traje.`},opcTraje);
   if(MinifigCore.editadoEnAvanzado(f,"torso"))B.push({tipo:"nota",texto:"Torso personalizado en el modo avanzado (torso, brazos o manos). Si eliges otra prenda aquí, te preguntamos antes de cambiar nada."});
   B.push(estilo);const t=Ro.torso;
   const opsT=[{id:null,nombre:"Liso"}].concat(edOrden(edPiezas("estampado-torso")));
   B.push({tipo:"grid",titulo:"Prenda",sec:"cuerpo",ops:opsT.map(p=>({n:p.nombre,on:!traje&&(t.estampado||null)===p.id,
    vista:edCon(g=>{g.traje.id=null;g.ropa.torso.estampado=p.id;g.ropa.mangas=null}),act:()=>edConjunto("torso",{torso:{estampado:p.id},mangas:null})}))});
   const mangaAuto=(BIB.porId[t.estampado]||{}).mangas||"larga";
   B.push({tipo:"chips",titulo:"Mangas",ops:[["larga","Largas"],["corta","Cortas"],["sin","Sin mangas"]].map(([k,n])=>({n,on:(Ro.mangas||mangaAuto)===k,act:()=>edConjunto("torso",{mangas:k===mangaAuto?null:k,brazos:null})}))});
   B.push({tipo:"chips",titulo:"Manos",ops:[{n:"Como la piel",on:!Ro.guantes,act:()=>edConjunto("torso",{guantes:null})},{n:"Guantes",on:!!Ro.guantes,act:()=>edConjunto("torso",{guantes:Ro.guantes||"#1b2a34"})}]});
   B.push({tipo:"colores",titulo:"Color principal",actual:t.color,set:h=>edConjunto("torso",{torso:{color:h}})});
   if(t.estampado)B.push({tipo:"colores",titulo:"Color del estampado",actual:(t.colores||[])[0],set:h=>edConjunto("torso",{torso:{colores:[h,(t.colores||[])[1]||"#1b2a34",(t.colores||[])[2]||"#6b4a2b"]}})});
   if(Ro.guantes)B.push({tipo:"colores",titulo:"Color de guantes",actual:Ro.guantes,set:h=>edConjunto("torso",{guantes:h})});
   break}
  case"piernas":{
   if(traje)B.push({tipo:"nota",texto:`Llevas el traje de ${traje}. Si cambias algo aquí, el traje pasa a ser tu ropa. Si prefieres tu propia ropa, quita el traje.`},opcTraje);
   if(MinifigCore.editadoEnAvanzado(f,"piernas"))B.push({tipo:"nota",texto:"Piernas personalizadas en el modo avanzado. Si cambias algo aquí, te preguntamos antes."});
   const P=Ro.piernas;
   B.push({tipo:"grid",titulo:"Tipo",sec:"piernas",ops:[["normal","Pantalón"],["cortas","Piernas cortas"]].map(([k,n])=>({n,on:!traje&&P.tipo===k,vista:edCon(g=>{g.traje.id=null;g.ropa.piernas.tipo=k;g.ropa.piernas.id=null}),act:()=>edConjunto("piernas",{piernas:{tipo:k,id:null}})}))});
   B.push({tipo:"colores",titulo:"Color",actual:P.color,set:h=>edConjunto("piernas",{piernas:{color:h},cadera:{color:h}})});
   B.push({tipo:"chips",titulo:"Botas",ops:[{n:"Sin botas",on:!P.botas,act:()=>edConjunto("piernas",{piernas:{botas:null}})},{n:"Con botas",on:!!P.botas,act:()=>edConjunto("piernas",{piernas:{botas:P.botas||"#1b2a34"}})}]});
   if(P.botas)B.push({tipo:"colores",titulo:"Color de botas",actual:P.botas,set:h=>edConjunto("piernas",{piernas:{botas:h}})});
   break}
  case"cabeza":{
   const casco=A.cabeza,masc=A.cara,ponC=p=>({id:p.id,color:(casco&&casco.color)||"#1b2a34"});
   B.push({tipo:"grid",titulo:"Casco, gorro o sombrero",sec:"cascos",ops:[{n:"Nada",on:!casco,vista:edCon(g=>g.accesorios.cabeza=null),act:()=>edAccesorio("cabeza",null,"cabeza")}]
    .concat(edPiezas("casco").map(p=>({n:p.nombre,on:!!casco&&casco.id===p.id,vista:edCon(g=>g.accesorios.cabeza=ponC(p)),act:()=>edAccesorio("cabeza",ponC(p),"cabeza")})))});
   if(casco)B.push({tipo:"colores",titulo:"Color del casco",actual:casco.color,set:h=>edPoner(edCon(g=>g.accesorios.cabeza.color=h))});
   B.push({tipo:"grid",titulo:"Máscara",sec:"cabeza",ops:[{n:"Sin máscara",on:!masc,vista:edCon(g=>g.accesorios.cara=null),act:()=>edAccesorio("cara",null,"cabeza")}]
    .concat(edPiezas("cara").filter(p=>p.ocupa==="cara").map(p=>{const pz={id:p.id,color:COLOR_MASCARA[p.id]||"#c91a09"};return{n:p.nombre,on:!!masc&&masc.id===p.id,vista:edCon(g=>g.accesorios.cara=pz),act:()=>edAccesorio("cara",pz,"cabeza")}}))});
   const barbas=edPiezas("detalle").filter(p=>p.ocupa==="barba");
   B.push({tipo:"grid",titulo:"Barba y bigote",sec:"cabeza",ops:[{n:"Sin barba",on:!(I.detalles||[]).some(id=>barbas.some(b=>b.id===id)),vista:edCon(g=>g.identidad.detalles=g.identidad.detalles.filter(id=>!barbas.some(b=>b.id===id))),act:()=>edPoner(edCon(g=>g.identidad.detalles=g.identidad.detalles.filter(id=>!barbas.some(b=>b.id===id))))}]
    .concat(barbas.map(p=>({n:p.nombre,on:(I.detalles||[]).includes(p.id),vista:MinifigCore.ponerDetalle(f,p.id,BIB,"basico").figura,act:()=>edDetalle(p.id)})))});
   if(masc&&oculto("rostro"))B.push({tipo:"nota",texto:"La máscara tapa tu rostro y tu barba; quedan guardados debajo."});
   break}
  case"accesorios":{
   const esp=A.espalda,obj=A.mano_der;
   const espaldas=edPiezas("capa").concat(edPiezas("cuello"));const ponE=p=>({id:p.id,color:esp&&(BIB.porId[esp.id]||{}).categoria===p.categoria?esp.color:(p.categoria==="capa"?"#c91a09":"#6c6e68")});
   B.push({tipo:"grid",titulo:"Espalda (capa, mochila…): solo una",sec:"cuello",foco:"torso",ops:[{n:"Nada",on:!esp,vista:edCon(g=>g.accesorios.espalda=null),act:()=>edAccesorio("espalda",null,"torso")}]
    .concat(espaldas.map(p=>({n:p.nombre,on:!!esp&&esp.id===p.id,sec:p.categoria==="capa"?"capas":"cuello",vista:edCon(g=>g.accesorios.espalda=ponE(p)),act:()=>edAccesorio("espalda",ponE(p),"torso")})))});
   if(esp)B.push({tipo:"colores",titulo:"Color de la espalda",actual:esp.color,set:h=>edPoner(edCon(g=>g.accesorios.espalda.color=h),"","torso")});
   const ponO=p=>({id:p.id,color:p.color_defecto||"#a0a5a9"});
   B.push({tipo:"grid",titulo:"En la mano",sec:"armas",ops:[{n:"Nada",on:!obj,vista:edCon(g=>g.accesorios.mano_der=null),act:()=>edAccesorio("mano_der",null,"mano")}]
    .concat(edPiezas("objeto").map(p=>({n:p.nombre,on:!!obj&&obj.id===p.id,vista:edCon(g=>g.accesorios.mano_der=ponO(p)),act:()=>edAccesorio("mano_der",ponO(p),"mano")})))});
   break}
  case"poderes":{
   const M=f.momentos||{},paq=M.paquete,P=MinifigCore.PAQUETES;
   const ponP=k=>{edPoner(edCon(g=>{g.momentos=k?Object.assign({paquete:k},{espera:P[k].espera,victoria:P[k].victoria,derrota:P[k].derrota,punto:P[k].punto}):{paquete:null,espera:"respirar",victoria:"salto-puno",derrota:"cabeza-baja",punto:"puno-arriba"}}),"","todo");prVerLos4(PR.ed.f)};
   B.push({tipo:"poderes",ops:[{k:null,n:"Sin poder",c:"#dddddd"}].concat(Object.entries(P).map(([k,p])=>({k,n:p.nombre,c:PODER_COLOR[p.poderes[0]]||"#ffd21a"}))).map(o=>({n:o.n,c:o.c,on:(paq||null)===o.k,act:()=>ponP(o.k)}))});
   const sel=paq&&P[paq];
   B.push(bloqueMomentos(f));
   B.push({tipo:"nota",texto:sel?`${sel.nombre} llena los 4 momentos del juego. Toca uno para verlo, o «Ver los 4 seguidos».`:"Un poder llena los 4 momentos del juego (en espera, al ganar, al perder y al anotar). Sin poder, la figura hace gestos normales."});
   break}
  case"guardar":B.push({tipo:"guardar"});break;
  case"trajes":{
   const p=f.traje&&f.traje.id?BIB.personajes.find(x=>x.id===f.traje.id):null;
   if(p){const T=MinifigCore.trajeDe(p,BIB),tr=f.traje,q=tr.quitar||[],u=tr.usar||{};
    const cambiaT=fn=>edPoner(edCon(g=>fn(g.traje)),"","todo");
    const quita=k=>cambiaT(t=>{const s=new Set(t.quitar||[]);s.has(k)?s.delete(k):s.add(k);t.quitar=[...s]});
    B.push({tipo:"nota",texto:`Llevas el traje de ${p.nombre}. Debajo siguen tu piel, tu cara y tu pelo${tr.encima===false?" (ahora se ve tu ropa: el traje está guardado)":""}.`});
    B.push({tipo:"chips",titulo:"Traje encima",ops:[{n:"Sí, se ve el traje",on:tr.encima!==false,act:()=>cambiaT(t=>t.encima=true)},{n:"No, ver mi ropa",on:tr.encima===false,act:()=>cambiaT(t=>t.encima=false)}]});
    const usar=[];if(T.pelo&&!T.casco)usar.push({n:"Usar su pelo",on:!!u.pelo,act:()=>cambiaT(t=>t.usar=Object.assign({},t.usar,{pelo:!u.pelo}))});
    if(T.rostro)usar.push({n:"Usar su rostro",on:!!u.rostro,act:()=>cambiaT(t=>t.usar=Object.assign({},t.usar,{rostro:!u.rostro}))});
    if(usar.length&&tr.encima!==false)B.push({tipo:"chips",titulo:"Del personaje (si no, usas lo tuyo)",ops:usar});
    const partes=[];if(T.mascara)partes.push(["mascara","Máscara"]);if(T.casco)partes.push(["casco","Casco"]);if(T.espalda)partes.push(["espalda",(BIB.porId[T.espalda.id]||{}).categoria==="capa"?"Capa":"Espalda"]);if(T.objeto)partes.push(["objeto","Objeto"]);
    if(partes.length&&tr.encima!==false)B.push({tipo:"chips",titulo:"Partes del traje que se ven (toca para quitar o poner)",ops:partes.map(([k,n])=>({n,on:!q.includes(k),act:()=>quita(k)}))});
    B.push({tipo:"chips",ops:[{n:"Quitar traje · volver a mi identidad",act:edQuitarTraje}]})}
   else B.push({tipo:"nota",texto:"Elige un traje: se pone encima de tu figura y conservas tu piel, tu cara y tu pelo (salvo que el traje los tape)."});
   const cols=BIB.colecciones.filter(c=>BIB.personajes.some(x=>x.coleccion===c.id));if(!E.colT||!cols.some(c=>c.id===E.colT))E.colT=(p&&p.coleccion)||(cols[0]&&cols[0].id);
   B.push({tipo:"chips",titulo:"Colección",ops:cols.map(c=>({n:c.nombre,on:c.id===E.colT,act:()=>{E.colT=c.id;prPintar()}}))});
   B.push({tipo:"grid",sec:"traje",ops:BIB.personajes.filter(x=>x.coleccion===E.colT).map(x=>({n:x.nombre,on:!!p&&p.id===x.id,vista:MinifigCore.vestirTraje(f,x.id,BIB).figura,act:()=>p&&p.id===x.id?null:edVestir(x.id)}))});
   break}}
 return B}

/* ---- Dibujo del editor ---- */
function pintarEditor2(cont){const E=PR.ed,p=PASOS[E.paso],C=prCaps();
 const av=E.modo==="avanzado";
 document.getElementById("prTitulo").textContent=E.trajes?"TRAJES":`${E.paso+1} · ${p.n.toUpperCase()}`;
 const barra=document.getElementById("prBarra");barra.hidden=false;
 const R=MinifigCore.resolver(E.f,BIB),NOM_OC={rostro:"rostro",detalles:"lentes y detalles",cabello:"pelo"};
 const tp=trajeVisible(E.f)?(BIB.personajes.find(x=>x.id===E.f.traje.id)||{}).nombre:null;
 barra.innerHTML=`<div class="pr-modo"><div class="pr-switch" role="group" aria-label="Modo"><button id="edBas" aria-pressed="${!av}">Básico</button><button id="edAvz" aria-pressed="${av}">Avanzado</button></div>
  <button class="pr-mini pr-traje" id="edTrajes" aria-pressed="${!!E.trajes}">Trajes</button>
  <span class="sp"></span><button class="pr-mini" id="edDes" ${E.hist.length?"":"disabled"}>Deshacer</button><button class="pr-mini pr-ok" id="edGuardarYa">Guardar</button></div>
  ${av?`<div class="cm-chips pr-tabs-av">${AV_TABS.map(t=>`<button data-tab="${t.k}" aria-pressed="${t.k===E.tab&&!E.trajes}">${t.n}</button>`).join("")}</div>`
   :`<div class="pr-prog">${PASOS.map((x,i)=>`<button data-paso="${i}" title="${x.n}" ${i===E.paso&&!E.trajes?'aria-current="step"':""} class="${E.visto.has(i)&&(i!==E.paso||E.trajes)?"hecho":""}">${i+1}</button>`).join("")}</div>`}
  ${R.ocultos.length?`<div class="pr-ocultos">${tp?"Traje de "+esc(tp)+" · o":"O"}culto, no borrado: ${R.ocultos.map(k=>NOM_OC[k]||k).join(", ")}</div>`:""}`;
 document.getElementById("edTrajes").onclick=()=>edTrajes(!E.trajes);
 barra.querySelectorAll("[data-paso]").forEach(b=>b.onclick=()=>edPaso(+b.dataset.paso));
 document.getElementById("edAvz").onclick=()=>edModo("avanzado");document.getElementById("edBas").onclick=()=>edModo("basico");
 barra.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>avTab(b.dataset.tab));
 document.getElementById("edDes").onclick=edDeshacer;document.getElementById("edGuardarYa").onclick=()=>edPaso(PASOS.length-1);
 const pie=document.getElementById("prPie");pie.hidden=false;
 if(av)return pintarAvanzado(cont);
 if(E.trajes){pie.innerHTML=`<button class="pr-sig" id="edVolver">‹ Volver al paso ${E.paso+1}: ${esc(p.n)}</button>`;document.getElementById("edVolver").onclick=()=>edPaso(E.paso)}
 else{pie.innerHTML=`<button id="edAnt" ${E.paso?"":"disabled"}>‹ Anterior</button>${E.paso<PASOS.length-1?'<button class="pr-sig" id="edSig">Siguiente ›</button>':""}`;
  document.getElementById("edAnt").onclick=()=>edPaso(E.paso-1);const sg=document.getElementById("edSig");if(sg)sg.onclick=()=>edPaso(E.paso+1)}
 cont.className="pr-col";cont.innerHTML="";
 if(E.pregunta){const q=document.createElement("div");q.className="cm-varios pr-pregunta";
  q.innerHTML=`<div class="cm-sub">${esc(E.pregunta.texto)}</div><div class="cm-chips">${E.pregunta.opciones.map(o=>`<button data-dec="${o.id}">${esc(o.texto)}</button>`).join("")}</div>`;
  q.querySelectorAll("[data-dec]").forEach(b=>b.onclick=()=>edConjunto(E.pregunta.grupo,E.pregunta.vals,b.dataset.dec));cont.appendChild(q)}
 bloquesDe(E.trajes?"trajes":p.k).forEach(B=>cont.appendChild(bloqueDOM(B)))}
function bloqueDOM(B){const d=document.createElement("div");d.className="pr-bloque";
 const tit=B.titulo?`<div class="cm-sub">${esc(B.titulo)}</div>`:"";
 if(B.tipo==="momentos")return bloqueMomentosDOM(B);
 if(B.tipo==="texto"){d.innerHTML=tit+`<input class="pr-texto" type="text" maxlength="${B.max||10}" value="${esc(B.valor||"")}" aria-label="${esc(B.titulo||"Texto")}">`;
  d.querySelector("input").onchange=e=>B.set(e.target.value.slice(0,B.max||10));return d}
 if(B.tipo==="nota"){d.innerHTML=`<p class="pr-nota pr-aviso">${esc(B.texto)}</p>`;return d}
 if(B.tipo==="chips"){d.innerHTML=tit+`<div class="cm-chips">${B.ops.map((o,i)=>`<button data-i="${i}" aria-pressed="${!!o.on}">${esc(o.n)}</button>`).join("")}</div>`;
  d.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>B.ops[+b.dataset.i].act());return d}
 if(B.tipo==="colores"){const pal=B.paleta||MinifigCore.PALETA,ac=(B.actual||"").toLowerCase();
  d.innerHTML=tit+`<div class="cm-sw">${pal.map(h=>`<button style="background:${h}" data-col="${h}" aria-label="Color ${h}" aria-pressed="${ac===h.toLowerCase()}"></button>`).join("")}<label class="cm-otro" title="Otro color"><input type="color" value="${/^#[0-9a-f]{6}$/i.test(ac)?ac:"#888888"}">+</label></div>`;
  d.querySelectorAll("[data-col]").forEach(b=>b.onclick=()=>B.set(b.dataset.col));d.querySelector("input").onchange=e=>B.set(e.target.value);return d}
 if(B.tipo==="poderes"){d.innerHTML=tit+`<div class="cm-grid cm-piezas">${B.ops.map((o,i)=>`<button class="pieza poder ${o.on?"on":""}" data-i="${i}" style="--c:${o.c}"><span class="boom">${esc(o.n)}</span>${o.on?'<i class="marca"></i>':""}</button>`).join("")}</div>`;
  d.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>B.ops[+b.dataset.i].act());return d}
 if(B.tipo==="grid"){d.innerHTML=tit+`<div class="cm-grid cm-piezas">${B.ops.map((o,i)=>`<button class="pieza ${o.on?"on":""}" data-i="${i}" title="${esc(o.n)}" aria-pressed="${!!o.on}"><img alt=""><span class="nom">${esc(o.n)}</span>${o.on?'<i class="marca"></i>':""}</button>`).join("")}</div>`;
  d.querySelectorAll("button[data-i]").forEach(b=>{const o=B.ops[+b.dataset.i];b.onclick=()=>o.act();b.onmouseenter=()=>prEstado(o.n.toUpperCase())});
  // la cola de miniaturas descarta imágenes que aún no están en la página: pedirlas después de insertarlas
  setTimeout(()=>d.querySelectorAll("img").forEach((im,i)=>{const o=B.ops[i];if(o.vista&&im.isConnected)pedirMini(o.sec||B.sec,prPlano(o.vista),im)}),0);return d}
 if(B.tipo==="guardar"){const E=PR.ed,C=prCaps(),S=C.estado().slots;
  d.className="cm-varios";d.innerHTML=`<label>Nombre<input id="edNom" type="text" maxlength="40" value="${esc(E.f.nombre||"Mi figura")}"></label>
   <div class="cm-sub">¿En qué cápsula?</div><div class="cm-chips">${S.map((s,i)=>`<button data-cap="${i}" aria-pressed="${PR.destino===i}">${i+1} · ${s?esc(s.nombre):"vacía"}</button>`).join("")}</div>
   <p class="pr-nota">${S[PR.destino]?"Esta cápsula ya tiene una figura: se reemplaza.":"La cápsula está vacía."}</p>
   <div class="cm-chips"><button class="pr-ok" id="edGuardar">Guardar en la cápsula ${PR.destino+1}</button></div>`;
  d.querySelector("#edNom").oninput=e=>{E.f.nombre=e.target.value;E.cambios=true;document.getElementById("prNombre").textContent=(e.target.value||"Mi figura").toUpperCase()};
  d.querySelectorAll("[data-cap]").forEach(b=>b.onclick=()=>{PR.destino=+b.dataset.cap;prPintar()});
  d.querySelector("#edGuardar").onclick=()=>{E.cambios=false;prGuardarEn(PR.destino,E.f)};return d}
 return d}
document.getElementById("prCompleto").onclick=()=>prEnfocar("todo");
