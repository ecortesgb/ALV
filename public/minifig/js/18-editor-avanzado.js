/* ============ Personalizador (fase 4): modo avanzado ============ */
// Mismo objeto que el básico (PR.ed.f): el interruptor solo cambia la vista.
// Los cambios por pieza van a la capa "manual" (MinifigCore.ajustar), así funcionan también encima de un traje.
// Lados: "derecho/izquierdo" son los de la figura (su derecha queda a tu izquierda en pantalla).
// Ojo: el objeto de accesorios.mano_der se dibuja en la mano IZQUIERDA de la figura (J.handR del render),
// por eso aquí "Mano derecha" usa el espacio mano_izq y viceversa.
const AV_TABS=[
 {k:"cabeza",n:"Cabeza",foco:"cabeza"},{k:"torso",n:"Torso",foco:"torso"},{k:"brazos",n:"Brazos",foco:"torso"},{k:"manos",n:"Manos",foco:"mano"},
 {k:"cadera",n:"Cadera",foco:"piernas"},{k:"piernas",n:"Piernas",foco:"piernas"},{k:"espalda",n:"Espalda",foco:"torso"},{k:"objetos",n:"Objetos",foco:"todo"},
 {k:"momentos",n:"Momentos",foco:"todo"},{k:"guardar",n:"Guardar",foco:"todo"}];
const AV_MANOS=[{n:"Mano derecha",esp:"mano_izq",clave:"mano_der"},{n:"Mano izquierda",esp:"mano_der",clave:"mano_izq"}];
const NOM_MOMENTO={espera:"En espera",victoria:"Al ganar",derrota:"Al perder",punto:"Al anotar"};

function edModo(m){const E=PR.ed;if(E.modo===m)return;prPararMomento();E.modo=m;E.trajes=false;E.pregunta=null;if(!E.tab)E.tab="cabeza";
 prPintar();prEnfocar(m==="avanzado"?AV_TABS.find(t=>t.k===E.tab).foco:PASOS[E.paso].foco);document.getElementById("prContenido").scrollTop=0;
 prEstado(m==="avanzado"?"Modo avanzado: pieza por pieza. Nada de lo que hiciste se pierde.":"Modo básico. Tus ajustes avanzados siguen guardados.")}
function avTab(k){prPararMomento();const E=PR.ed;E.tab=k;E.trajes=false;prPintar();prEnfocar(AV_TABS.find(t=>t.k===k).foco);document.getElementById("prContenido").scrollTop=0}
function avAjustar(clave,valores,msg){edPoner(MinifigCore.ajustar(PR.ed.f,clave,valores).figura,msg,AV_TABS.find(t=>t.k===PR.ed.tab).foco)}
// En el núcleo el color del lado derecho es la base de los dos lados: antes de cambiarlo,
// el izquierdo se fija con el color que ya tenía para que no cambie también.
function avLado(der,izq,izqActual,h){let g=PR.ed.f;if(!(g.manual||{})[izq])g=MinifigCore.ajustar(g,izq,{color:izqActual}).figura;
 edPoner(MinifigCore.ajustar(g,der,{color:h}).figura,"",AV_TABS.find(t=>t.k===PR.ed.tab).foco)}
function avAccesorio(esp,pieza){const f=PR.ed.f;
 if(!pieza&&trajeVisible(f)){const g=edCon(x=>{x.accesorios[esp]=null;x.traje.quitar=Array.from(new Set((x.traje.quitar||[]).concat(QUITAR_DE[esp]||[])))});return edPoner(g,"","todo")}
 const r=MinifigCore.ponerAccesorio(f,esp,pieza,BIB,"avanzado");if(r.error)return prEstado(r.error);edPoner(r.figura,(r.avisos||[]).join(". "))}
// Opciones de un espacio de accesorio. Con "Ver todo" aparecen también las de otros espacios, con aviso.
function avOpciones(esp){return MinifigCore.opcionesPara(esp,BIB,"avanzado",!!PR.ed.verTodo).filter(o=>(BIB.porId[o.id]||{}).categoria!=="cara"&&(BIB.porId[o.id]||{}).categoria!=="detalle")}
const verTodoBloque=()=>({tipo:"chips",titulo:"Piezas",ops:[{n:"Solo las que caben",on:!PR.ed.verTodo,act:()=>{PR.ed.verTodo=false;prPintar()}},{n:"Ver todo (con aviso)",on:!!PR.ed.verTodo,act:()=>{PR.ed.verTodo=true;prPintar()}}]});
function colorDe(p){return p.color_defecto||(p.categoria==="capa"?"#c91a09":p.categoria==="objeto"?"#a0a5a9":"#6c6e68")}

function bloquesAvanzado(tab){const E=PR.ed,f=E.f,R=MinifigCore.resolver(f,BIB),S=R.piezas,I=f.identidad,A=f.accesorios,Mn=f.manual||{},B=[];
 const reset=(clave,txt)=>({n:txt,on:!Mn[clave],act:()=>avAjustar(clave,null)});
 switch(tab){
  case"cabeza":{
   B.push({tipo:"colores",titulo:"Piel (cualquier color)",paleta:MinifigCore.TONOS.map(t=>t.hex).concat(["#9fc3e9","#4b9f4a","#c91a09","#a0a5a9"]),actual:I.piel,set:h=>edPoner(edCon(g=>g.identidad.piel=h))});
   B.push({tipo:"grid",titulo:"Pieza de cabeza",sec:"cabeza",ops:edPiezas("cabeza").map(p=>({n:p.nombre,on:(I.cabeza||"HEAD_001")===p.id,vista:edCon(g=>g.identidad.cabeza=p.id==="HEAD_001"?null:p.id),act:()=>edPoner(edCon(g=>g.identidad.cabeza=p.id==="HEAD_001"?null:p.id))}))});
   B.push({tipo:"grid",titulo:"Rostro",sec:"cabeza",ops:edOrden(edPiezas("cara").filter(p=>p.ocupa!=="cara")).map(p=>({n:p.nombre,on:I.rostro===p.id,vista:edCon(g=>g.identidad.rostro=p.id),act:()=>edPoner(edCon(g=>g.identidad.rostro=p.id))}))});
   B.push({tipo:"grid",titulo:"Detalles (varios a la vez; si se enciman, avisa)",sec:"cabeza",ops:edPiezas("detalle").map(p=>({n:p.nombre,on:(I.detalles||[]).includes(p.id),vista:MinifigCore.ponerDetalle(f,p.id,BIB,"avanzado").figura,
    act:()=>{const r=MinifigCore.ponerDetalle(f,p.id,BIB,"avanzado");edPoner(r.figura,(r.avisos||[]).join(". "))}}))});
   const col=(I.cabello&&I.cabello.color)||"#582a12";
   B.push({tipo:"grid",titulo:"Cabello",sec:"pelo",ops:[{n:"Sin pelo",on:!I.cabello,vista:edCon(g=>g.identidad.cabello=null),act:()=>edPoner(edCon(g=>g.identidad.cabello=null))}]
    .concat(edOrden(edPiezas("cabello")).map(p=>({n:p.nombre,on:!!I.cabello&&I.cabello.id===p.id,vista:edCon(g=>g.identidad.cabello={id:p.id,color:col}),act:()=>edPoner(edCon(g=>g.identidad.cabello={id:p.id,color:col}))})))});
   if(I.cabello)B.push({tipo:"colores",titulo:"Color de pelo (cualquiera)",paleta:MinifigCore.COLORES_PELO.concat(["#c91a09","#0055bf","#923978","#4b9f4a"]),actual:I.cabello.color,set:h=>edPoner(edCon(g=>g.identidad.cabello.color=h))});
   B.push(verTodoBloque());
   B.push({tipo:"grid",titulo:"Casco, gorro o sombrero",sec:"cascos",ops:[{n:"Nada",on:!A.cabeza,vista:edCon(g=>g.accesorios.cabeza=null),act:()=>avAccesorio("cabeza",null)}]
    .concat(avOpciones("cabeza").map(o=>{const p=BIB.porId[o.id],pz={id:o.id,color:(A.cabeza&&A.cabeza.color)||colorDe(p)};return{n:(o.aviso?"⚠ ":"")+o.nombre,on:!!A.cabeza&&A.cabeza.id===o.id,vista:edCon(g=>g.accesorios.cabeza=pz),act:()=>avAccesorio("cabeza",pz)}}))});
   if(A.cabeza)B.push({tipo:"colores",titulo:"Color del casco",actual:A.cabeza.color,set:h=>edPoner(edCon(g=>g.accesorios.cabeza.color=h))});
   B.push({tipo:"grid",titulo:"Máscara",sec:"cabeza",ops:[{n:"Sin máscara",on:!A.cara,vista:edCon(g=>g.accesorios.cara=null),act:()=>avAccesorio("cara",null)}]
    .concat(edPiezas("cara").filter(p=>p.ocupa==="cara").map(p=>{const pz={id:p.id,color:(A.cara&&A.cara.color)||COLOR_MASCARA[p.id]||"#c91a09"};return{n:p.nombre,on:!!A.cara&&A.cara.id===p.id,vista:edCon(g=>g.accesorios.cara=pz),act:()=>avAccesorio("cara",pz)}}))});
   if(A.cara)B.push({tipo:"colores",titulo:"Color de la máscara",actual:A.cara.color,set:h=>edPoner(edCon(g=>g.accesorios.cara.color=h))});
   break}
  case"torso":{
   const t=S.torso,ajT=v=>avAjustar("torso",v);
   if(Mn.torso)B.push({tipo:"chips",ops:[reset("torso","Volver al torso del básico")]});
   B.push({tipo:"grid",titulo:"Estampado",sec:"cuerpo",ops:[{id:null,nombre:"Liso"}].concat(edPiezas("estampado-torso")).map(p=>({n:p.nombre,on:(t.estampado||null)===p.id,
    vista:MinifigCore.ajustar(f,"torso",{estampado:p.id}).figura,act:()=>ajT({estampado:p.id})}))});
   B.push({tipo:"colores",titulo:"Color base",actual:t.color,set:h=>ajT({color:h})});
   if(t.estampado)[0,1,2].forEach(i=>B.push({tipo:"colores",titulo:`Color ${i+1} del estampado`,actual:(t.colores||[])[i],set:h=>{const c=(t.colores||["#ffffff","#1b2a34","#6b4a2b"]).slice();c[i]=h;ajT({colores:c})}}));
   B.push({tipo:"texto",titulo:"Texto (número o letra, hasta 3)",valor:t.texto||"",max:3,set:v=>ajT({texto:v})});
   break}
  case"brazos":{
   const auto=S.brazos.color;
   B.push({tipo:"nota",texto:"Lados de la figura: su derecho queda a tu izquierda en pantalla."});
   B.push({tipo:"chips",titulo:"Mangas (para los dos)",ops:[["larga","Largas"],["corta","Cortas"],["sin","Sin mangas"]].map(([k,n])=>({n,on:(f.ropa.mangas||(BIB.porId[f.ropa.torso.estampado]||{}).mangas||"larga")===k,act:()=>edPoner(edCon(g=>{g.ropa.mangas=k;g.ropa.brazos=null}))}))});
   const bi=S.brazos.color_izq||auto;
   B.push({tipo:"colores",titulo:"Brazo derecho",actual:auto,set:h=>avLado("brazo_der","brazo_izq",bi,h)});
   B.push({tipo:"colores",titulo:"Brazo izquierdo",actual:bi,set:h=>avAjustar("brazo_izq",{color:h})});
   if(Mn.brazo_der||Mn.brazo_izq)B.push({tipo:"chips",ops:[{n:"Los dos como la manga",act:()=>edPoner(edCon(g=>{delete g.manual.brazo_der;delete g.manual.brazo_izq}))}]});
   break}
  case"manos":{
   B.push({tipo:"nota",texto:"Lados de la figura: su derecha queda a tu izquierda en pantalla."});
   const mi=S.manos.color_izq||S.manos.color;
   B.push({tipo:"colores",titulo:"Mano derecha",actual:S.manos.color,set:h=>avLado("mano_der","mano_izq",mi,h)});
   B.push({tipo:"colores",titulo:"Mano izquierda",actual:mi,set:h=>avAjustar("mano_izq",{color:h})});
   if(Mn.mano_der||Mn.mano_izq)B.push({tipo:"chips",ops:[{n:"Las dos como el básico",act:()=>edPoner(edCon(g=>{delete g.manual.mano_der;delete g.manual.mano_izq}))}]});
   break}
  case"cadera":{
   if(f.ropa.piernas.tipo==="cortas"){B.push({tipo:"nota",texto:"Con piernas cortas, cadera y piernas son una sola pieza: cámbialas en Piernas."});break}
   const c=S.cadera;
   B.push({tipo:"grid",titulo:"Pieza",sec:"cadera",ops:edPiezas("cadera").map(p=>({n:p.nombre+" ("+p.ldraw+")",on:c.id===p.id,vista:MinifigCore.ajustar(f,"cadera",{id:p.id}).figura,act:()=>avAjustar("cadera",{id:p.id})}))});
   B.push({tipo:"colores",titulo:"Color de la cadera",actual:c.color,set:h=>avAjustar("cadera",{color:h})});
   B.push({tipo:"chips",titulo:"Cinturón",ops:[{n:"Sin cinturón",on:!c.cinturon,act:()=>avAjustar("cadera",{cinturon:null})},{n:"Con cinturón",on:!!c.cinturon,act:()=>avAjustar("cadera",{cinturon:{id:"BELT_001",color:(c.cinturon&&c.cinturon.color)||"#582a12"}})}]});
   if(c.cinturon)B.push({tipo:"colores",titulo:"Color del cinturón",actual:c.cinturon.color,set:h=>avAjustar("cadera",{cinturon:{id:"BELT_001",color:h}})});
   if(Mn.cadera)B.push({tipo:"chips",ops:[reset("cadera","Volver a la cadera del básico")]});
   break}
  case"piernas":{
   const P=S.piernas,cortas=f.ropa.piernas.tipo==="cortas";
   B.push({tipo:"chips",titulo:"Tipo",ops:[["normal","Articuladas"],["cortas","Cortas"]].map(([k,n])=>({n,on:f.ropa.piernas.tipo===k,act:()=>{const r=MinifigCore.cambiarConjunto(f,"piernas",{piernas:{tipo:k,id:null}},"conservar");edPoner(r.figura)}}))});
   if(!cortas)B.push({tipo:"grid",titulo:"Pieza",sec:"piernas",ops:edPiezas("piernas").filter(p=>p.tipo!=="cortas").map(p=>({n:p.nombre,on:P.id===p.id,vista:MinifigCore.ajustar(f,"piernas",{id:p.id}).figura,act:()=>avAjustar("piernas",{id:p.id})}))});
   B.push({tipo:"nota",texto:cortas?"Las piernas cortas son una sola pieza: un solo color.":"Lados de la figura: su pierna derecha queda a tu izquierda en pantalla."});
   B.push({tipo:"colores",titulo:cortas?"Color":"Pierna derecha",actual:P.color,set:h=>cortas?avAjustar("pierna_der",{color:h}):avLado("pierna_der","pierna_izq",P.color_izq||P.color,h)});
   if(!cortas)B.push({tipo:"colores",titulo:"Pierna izquierda",actual:P.color_izq||P.color,set:h=>avAjustar("pierna_izq",{color:h})});
   if(Mn.pierna_der||Mn.pierna_izq)B.push({tipo:"chips",ops:[{n:"Las dos como el básico",act:()=>edPoner(edCon(g=>{delete g.manual.pierna_der;delete g.manual.pierna_izq}))}]});
   B.push({tipo:"chips",titulo:"Botas",ops:[{n:"Sin botas",on:!P.botas,act:()=>avAjustar("piernas",{botas:null})},{n:"Con botas",on:!!P.botas,act:()=>avAjustar("piernas",{botas:P.botas||"#1b2a34"})}]});
   if(P.botas)B.push({tipo:"colores",titulo:"Color de botas",actual:P.botas,set:h=>avAjustar("piernas",{botas:h})});
   break}
  case"espalda":{
   B.push(verTodoBloque());
   B.push({tipo:"grid",titulo:"Espalda y cuello: solo una pieza",sec:"cuello",ops:[{n:"Nada",on:!A.espalda,vista:edCon(g=>g.accesorios.espalda=null),act:()=>avAccesorio("espalda",null)}]
    .concat(avOpciones("espalda").map(o=>{const p=BIB.porId[o.id],pz={id:o.id,color:A.espalda&&(BIB.porId[A.espalda.id]||{}).categoria===p.categoria?A.espalda.color:colorDe(p)};
     return{n:(o.aviso?"⚠ ":"")+o.nombre,on:!!A.espalda&&A.espalda.id===o.id,sec:p.categoria==="capa"?"capas":"cuello",vista:edCon(g=>g.accesorios.espalda=pz),act:()=>avAccesorio("espalda",pz)}}))});
   if(A.espalda)B.push({tipo:"colores",titulo:"Color",actual:A.espalda.color,set:h=>edPoner(edCon(g=>g.accesorios.espalda.color=h))});
   break}
  case"objetos":{
   B.push(verTodoBloque());
   AV_MANOS.forEach(M=>{const ac=A[M.esp];
    B.push({tipo:"grid",titulo:M.n,sec:"armas",ops:[{n:"Nada",on:!ac,vista:edCon(g=>g.accesorios[M.esp]=null),act:()=>avAccesorio(M.esp,null)}]
     .concat(avOpciones(M.esp).map(o=>{const p=BIB.porId[o.id],pz={id:o.id,color:colorDe(p)};return{n:(o.aviso?"⚠ ":"")+o.nombre,on:!!ac&&ac.id===o.id,vista:edCon(g=>g.accesorios[M.esp]=pz),act:()=>avAccesorio(M.esp,pz)}}))});
    if(ac)B.push({tipo:"colores",titulo:`Color (${M.n.toLowerCase()})`,actual:ac.color,set:h=>edPoner(edCon(g=>g.accesorios[M.esp].color=h))})});
   break}
  case"momentos":{
   const P=MinifigCore.PAQUETES,M=f.momentos||{};
   B.push({tipo:"nota",texto:"Arma cada momento por separado. El paquete de poder (paso 8 del básico) los llena todos de golpe; aquí cambias uno sin tocar los demás. Al elegir uno se reproduce."});
   B.push(bloqueMomentos(f));
   MinifigCore.MOMENTOS.forEach(m=>{const vals=Momentos.lista(m).map(i=>i.id);
    B.push({tipo:"chips",titulo:NOM_MOMENTO[m],ops:vals.map(v=>({n:nomMomento(v),on:R.momentos[m]===v,act:()=>{edPoner(edCon(g=>{g.momentos=Object.assign({paquete:null},g.momentos,{[m]:v})}),"","todo");prMomento(v,{cual:m,repetir:true})}}))})});
   break}
  case"guardar":B.push({tipo:"guardar"});break}
 return B}

// Dibujo de la vista avanzada (lo llama pintarEditor2)
function pintarAvanzado(cont){const E=PR.ed,tab=AV_TABS.find(t=>t.k===E.tab)||AV_TABS[0];
 document.getElementById("prTitulo").textContent=E.trajes?"TRAJES":"AVANZADO · "+tab.n.toUpperCase();
 const pie=document.getElementById("prPie");
 if(E.trajes){pie.innerHTML=`<button class="pr-sig" id="edVolver">‹ Volver a ${esc(tab.n)}</button>`;document.getElementById("edVolver").onclick=()=>avTab(tab.k)}
 else{pie.innerHTML=`<button class="pr-sig" id="avGuardar">Guardar figura ›</button>`;document.getElementById("avGuardar").onclick=()=>avTab("guardar")}
 cont.className="pr-col";cont.innerHTML="";
 (E.trajes?bloquesDe("trajes"):bloquesAvanzado(tab.k)).forEach(B=>cont.appendChild(bloqueDOM(B)))}
