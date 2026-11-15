/* ============ Personalizador (fase 1): inicio, elegir personaje, aleatorio y cápsulas ============ */
// Trabaja solo con figuras por capas (MinifigCore, versión 2). El modelo plano del Taller
// (desdeFigura) se usa únicamente para dibujar; nunca se guarda en las cápsulas.
const PR={on:false,pila:[],destino:0,sel:0,col:null,ficha:null,variante:"personaje",azar:{f:null,prev:[],estilo:"todo"},previo:null,confirmar:null,vista:null};
let CAPS=null;
const ESTILOS_AZAR=[["todo","Todo"],["fem","Femenino"],["masc","Masculino"],["neutro","Neutro"]];
function almacenLocal(){try{localStorage.setItem("_minifig_t","1");localStorage.removeItem("_minifig_t");return localStorage}catch(e){return Capsulas.memoria()}}
function prCaps(){if(!CAPS)CAPS=Capsulas.crear(almacenLocal(),{clave:"minifig-capsulas-v1",n:3});return CAPS}
const prPlano=(f,meta)=>desdeFigura(f,meta);
const prPersonaje=id=>BIB.personajes.find(p=>p.id===id)||null;

// Lo que se ve en el visor grande: una figura v2, o nada (cápsula vacía)
function prMostrar(f){PR.vista=f||null;const vac=document.getElementById("prVacia");
 if(!f){vac.hidden=false;if(fig)fig.visible=false;document.getElementById("prNombre").textContent="CÁPSULA VACÍA";return}
 vac.hidden=true;actual=prPlano(f);pose=PR.mom?"mom:"+PR.mom.nombre:"quieto";rehacer();document.getElementById("prNombre").textContent=(f.nombre||"Mi figura").toUpperCase()}

function prAbrir(){if(PR.on)return;if(modoActual===true)modoComic(false);
 PR.on=true;PR.previo=actual;modoActual="pers";document.getElementById("pers").hidden=false;
 const v=document.getElementById("prVisor");v.insertBefore(renderer.domElement,v.firstChild);resize();
 controls.autoRotateSpeed=1.1;controls.minDistance=1.4;
 const C=prCaps();PR.sel=C.activa()==null?0:C.activa();PR.pila=[C.vacias()?"inicio":"capsulas"];PR.destino=Math.max(0,C.primeraVacia());
 prEntrar()}
function prCerrar(dest){if(!PR.on)return;prPararMomento();PR.on=false;document.getElementById("pers").hidden=true;controls.autoRotate=false;controls.minDistance=3;
 camera.position.set(3.2,2.1,7.2);controls.target.set(0,1.2,0);
 actual=PR.previo||actual;if(fig)fig.visible=true;rehacer();modoActual=null;modoComic(dest==="creador")}

function prIr(v){PR.pila.push(v);prEntrar()}
function prAtras(){if(PR.pila.length<=1)return;
 if(prVer()==="editor"&&PR.ed&&PR.ed.cambios&&PR.confirmar!=="salir"){PR.confirmar="salir";prEstado("Tienes cambios sin guardar. Toca Atrás otra vez para salir sin guardar.");return}
 PR.pila.pop();prEntrar()}
function prVer(){return PR.pila[PR.pila.length-1]}
// Al entrar a una pantalla, el visor muestra lo que corresponde
function prEntrar(){PR.confirmar=null;const v=prVer(),C=prCaps();prPararMomento();
 controls.autoRotate=v!=="editor";
 if(v==="editor"){prMostrar(PR.ed.f);prPintar();prEnfocar(PASOS[PR.ed.paso].foco);return}
 if(typeof prEnfocar==="function")prEnfocar("todo");
 if(v==="capsulas"){const s=C.slot(PR.sel);prMostrar(s&&s.figura);if(s)prMomento(momentosDe(s.figura).espera)}   // en la cápsula, la figura hace su espera
 else if(v==="aleatorio"){if(!PR.azar.f)prNuevaAzar(false);else prMostrar(PR.azar.f)}
 else if(v==="ficha")prMostrar(prVarianteFicha());
 else if(v==="inicio"){const s=C.slot(PR.destino);prMostrar(s?s.figura:prBase())}
 prPintar()}
function prEstado(t){const el=document.getElementById("prEstado");el.textContent=t||""}
function prBase(){const C=prCaps(),s=C.slot(PR.destino)||(C.activa()!=null?C.slot(C.activa()):null);return s?s.figura:MinifigCore.nueva({nombre:"Mi figura"})}

function prGuardarEn(i,f){const C=prCaps();C.guardar(i,f,f.nombre);PR.sel=i;PR.pila=["capsulas"];PR.azar={f:null,prev:[],estilo:PR.azar.estilo};prEntrar();prEstado(`Guardado en la cápsula ${i+1}.`)}

/* ---- Pantallas ---- */
function prPintar(){const v=prVer(),cont=document.getElementById("prContenido"),tit=document.getElementById("prTitulo"),C=prCaps();
 document.getElementById("prAtras").hidden=PR.pila.length<=1;prEstado("");
 document.getElementById("prBarra").hidden=v!=="editor";document.getElementById("prPie").hidden=v!=="editor";
 if(v==="editor")return pintarEditor2(cont);
 const destino=`Para la cápsula ${PR.destino+1}`;

 if(v==="inicio"){tit.textContent="¿QUÉ HACEMOS?";cont.className="cm-grid cm-6 pr-inicio";
  const ops=[["personajes","Elegir personaje"],["personalizar","Personalizar"],["aleatorio","Aleatorio"],["capsulas","Mis figuras"]];
  cont.innerHTML=ops.map(([k,n],i)=>`<button class="panel ${i===0?"sel":""}" data-ir="${k}"><img alt=""><span class="etq">${n}</span></button>`).join("");
  const imgs=cont.querySelectorAll("img"),act=C.activa()!=null?C.slot(C.activa()):null;
  pedirThumb(CATALOGO[0],imgs[0]);pedirThumb(prPlano(MinifigCore.nueva()),imgs[1]);
  pedirThumb(prPlano(MinifigCore.aleatorio(BIB,{semilla:7})),imgs[2]);pedirThumb(act?prPlano(act.figura):prPlano(MinifigCore.nueva()),imgs[3]);
  cont.querySelectorAll("[data-ir]").forEach(b=>{b.onmouseenter=()=>{cont.querySelectorAll(".panel").forEach(x=>x.classList.remove("sel"));b.classList.add("sel")};
   b.onclick=()=>{const k=b.dataset.ir;if(k==="personalizar")return prEditar(prBase());if(k==="capsulas"){PR.pila=["capsulas"];return prEntrar()}prIr(k)}});
  prEstado(C.vacias()?"Arma tu primera figura.":destino);return}

 if(v==="personajes"){tit.textContent="ELIGE PERSONAJE";cont.className="pr-col";
  const cols=BIB.colecciones.filter(c=>BIB.personajes.some(p=>p.coleccion===c.id));if(!PR.col||!cols.some(c=>c.id===PR.col))PR.col=cols[0]&&cols[0].id;
  const pers=BIB.personajes.map((p,i)=>({p,c:CATALOGO[i]})).filter(x=>x.p.coleccion===PR.col);
  cont.innerHTML=`<div class="cm-chips pr-tabs">${cols.map(c=>`<button data-col="${esc(c.id)}" aria-pressed="${c.id===PR.col}">${esc(c.nombre)}</button>`).join("")}</div>
   <div class="cm-grid cm-piezas">${pers.map(x=>`<button class="pieza" data-id="${esc(x.p.id)}" title="${esc(x.p.nombre)}"><img alt=""><span class="nom">${esc(x.p.nombre)}</span></button>`).join("")}</div>`;
  cont.querySelectorAll("[data-col]").forEach(b=>b.onclick=()=>{PR.col=b.dataset.col;prPintar()});
  cont.querySelectorAll("img").forEach((im,i)=>pedirThumb(pers[i].c,im));
  cont.querySelectorAll("[data-id]").forEach(b=>{b.onclick=()=>{PR.ficha=b.dataset.id;PR.variante="personaje";prIr("ficha")};b.onmouseenter=()=>prEstado(b.title.toUpperCase())});
  prEstado(destino);return}

 if(v==="ficha"){const p=prPersonaje(PR.ficha);if(!p){prAtras();return}const col=BIB.colecciones.find(c=>c.id===p.coleccion);
  const f=prVarianteFicha(),paq=f.momentos&&f.momentos.paquete?MinifigCore.PAQUETES[f.momentos.paquete]:null;
  const tieneBase=!!(C.slot(PR.destino)||C.activa()!=null);
  tit.textContent=p.nombre.toUpperCase();cont.className="cm-varios";
  cont.innerHTML=`<div class="cm-sub">${esc(col?col.nombre:p.coleccion)}${paq?" · Poder: "+esc(paq.nombre):""}</div>
   <div class="cm-chips"><button data-var="personaje" aria-pressed="${PR.variante==="personaje"}">Usar así</button><button data-var="traje" aria-pressed="${PR.variante==="traje"}">Solo su traje</button><button data-var="pers">Personalizar</button></div>
   <p class="pr-nota">${PR.variante==="traje"?(tieneBase?"Su traje va encima de tu figura: conservas tu piel, cara y pelo (salvo que el traje los tape).":"Aún no tienes figura, así que el traje va sobre una base amarilla."):"El personaje completo, tal como viene."}</p>
   <div class="cm-chips"><button class="pr-ok" id="prGuardar">Guardar en la cápsula ${PR.destino+1}</button></div>`;
  cont.querySelectorAll("[data-var]").forEach(b=>b.onclick=()=>{if(b.dataset.var==="pers")return prEditar(prVarianteFicha());PR.variante=b.dataset.var;prMostrar(prVarianteFicha());prPintar()});
  document.getElementById("prGuardar").onclick=()=>prGuardarEn(PR.destino,prVarianteFicha());return}

 if(v==="aleatorio"){tit.textContent="ALEATORIO";cont.className="cm-varios";
  cont.innerHTML=`<div class="cm-sub">Estilo</div><div class="cm-chips">${ESTILOS_AZAR.map(([k,n])=>`<button data-est="${k}" aria-pressed="${PR.azar.estilo===k}">${n}</button>`).join("")}</div>
   <p class="pr-nota">El estilo solo ordena qué sale más seguido; nada queda prohibido.</p>
   <div class="cm-chips"><button id="prOtra">Otra</button><button id="prDeshacer" ${PR.azar.prev.length?"":"disabled"}>Deshacer</button><button id="prAzarEd">Personalizar esta</button><button class="pr-ok" id="prGuardar">Guardar en la cápsula ${PR.destino+1}</button></div>`;
  cont.querySelectorAll("[data-est]").forEach(b=>b.onclick=()=>{PR.azar.estilo=b.dataset.est;prNuevaAzar(true);prPintar()});
  document.getElementById("prOtra").onclick=()=>{prNuevaAzar(true);prPintar()};
  document.getElementById("prDeshacer").onclick=()=>{if(!PR.azar.prev.length)return;PR.azar.f=PR.azar.prev.pop();prMostrar(PR.azar.f);prPintar()};
  document.getElementById("prAzarEd").onclick=()=>prEditar(PR.azar.f);
  document.getElementById("prGuardar").onclick=()=>prGuardarEn(PR.destino,PR.azar.f);return}

 if(v==="capsulas"){tit.textContent="MIS FIGURAS";cont.className="pr-col";const E=C.estado(),s=E.slots[PR.sel];
  cont.innerHTML=`<div class="caps">${E.slots.map((x,i)=>`<button class="cap ${x?"":"vacia"} ${i===PR.sel?"sel":""}" data-cap="${i}" aria-label="Cápsula ${i+1}${x?": "+esc(x.nombre):" vacía"}">
    <img alt="">${E.activa===i?'<span class="cap-act">EN JUEGO</span>':""}<span class="etq">${x?esc(x.nombre):"Vacía"}</span></button>`).join("")}</div>
   <div class="cm-varios pr-acc">${s?`<label>Nombre<input id="prNom" type="text" maxlength="40" value="${esc(s.nombre)}"></label>
    <div class="cm-chips">${E.activa===PR.sel?'<button disabled aria-pressed="true">Es la que entra al juego</button>':'<button id="prUsar">Usar en el juego</button>'}
     <button id="prEditar">Editar</button><button id="prCambiar">Cambiar</button><button id="prDup" ${C.primeraVacia()<0?"disabled":""}>Duplicar</button>
     <button id="prVaciar" class="${PR.confirmar==="vaciar"?"pr-peligro":""}">${PR.confirmar==="vaciar"?"¿Seguro? Toca otra vez":"Vaciar"}</button></div>`
    :`<div class="cm-sub">Esta cápsula espera una figura</div><div class="cm-chips"><button data-nuevo="personajes">Elegir personaje</button><button data-nuevo="aleatorio">Aleatorio</button><button data-nuevo="personalizar">Personalizar</button></div>`}</div>`;
  const imgs=cont.querySelectorAll(".cap img");E.slots.forEach((x,i)=>pedirThumb(prPlano(x?x.figura:MinifigCore.nueva()),imgs[i]));
  cont.querySelectorAll("[data-cap]").forEach(b=>b.onclick=()=>{PR.sel=+b.dataset.cap;prEntrar()});
  cont.querySelectorAll("[data-nuevo]").forEach(b=>b.onclick=()=>{if(b.dataset.nuevo==="personalizar"){PR.destino=PR.sel;return prEditar(MinifigCore.nueva({nombre:"Mi figura"}))}PR.destino=PR.sel;PR.pila=["capsulas",b.dataset.nuevo];if(b.dataset.nuevo==="aleatorio")PR.azar={f:null,prev:[],estilo:PR.azar.estilo};prEntrar()});
  if(s){document.getElementById("prNom").onchange=e=>{C.renombrar(PR.sel,e.target.value);prPintar()};
   const u=document.getElementById("prUsar");if(u)u.onclick=()=>{C.usar(PR.sel);prPintar();prEstado(`La cápsula ${PR.sel+1} es la que entra al juego.`)};
   document.getElementById("prEditar").onclick=()=>prEditar(s.figura,PR.sel);
   document.getElementById("prCambiar").onclick=()=>{PR.destino=PR.sel;PR.pila=["capsulas","inicio"];prEntrar()};
   document.getElementById("prDup").onclick=()=>{const j=C.duplicar(PR.sel);if(j<0)return prEstado("No hay cápsulas vacías.");PR.sel=j;prEntrar();prEstado(`Copiada en la cápsula ${j+1}.`)};
   document.getElementById("prVaciar").onclick=()=>{if(PR.confirmar!=="vaciar"){PR.confirmar="vaciar";prPintar();return}C.vaciar(PR.sel);prEntrar();prEstado("Cápsula vaciada.")}}
  else prEstado("Toca una opción para llenarla.");
  if(s&&!PR.confirmar)prEstado(E.activa===PR.sel?"Esta figura entra a las partidas.":"Toca «Usar en el juego» para llevarla a las partidas.");return}}

function prVarianteFicha(){const p=prPersonaje(PR.ficha);if(!p)return MinifigCore.nueva();
 const f=MinifigCore.desdePersonaje(p,BIB,{modo:"personaje"});if(PR.variante!=="traje")return f;
 // vestirTraje quita el casco o la máscara propios si el traje trae los suyos
 const g=MinifigCore.vestirTraje(prBase(),p.id,BIB).figura;g.momentos=f.momentos;g.nombre=(prBase().nombre&&prBase().nombre!=="Mi figura"?prBase().nombre+" como ":"")+p.nombre;return g}
function prNuevaAzar(guardarPrevio){if(guardarPrevio&&PR.azar.f){PR.azar.prev.push(PR.azar.f);if(PR.azar.prev.length>20)PR.azar.prev.shift()}
 PR.azar.f=MinifigCore.aleatorio(BIB,{semilla:Math.floor(Math.random()*2**31),estilo:PR.azar.estilo});prMostrar(PR.azar.f)}

document.getElementById("prAtras").onclick=prAtras;
document.getElementById("prTaller").onclick=()=>prCerrar("taller");
document.getElementById("prCreador").onclick=()=>prCerrar("creador");
document.getElementById("bPers").onclick=prAbrir;
window.addEventListener("keydown",e=>{if(!PR.on)return;const t=e.target;if(t&&(t.tagName==="INPUT"||t.tagName==="SELECT"))return;
 if(e.key==="Escape"||e.key==="Backspace"){prAtras();e.preventDefault()}else if(e.key==="t"||e.key==="T")prCerrar("taller")});
new ResizeObserver(()=>{if(PR.on)resize()}).observe(document.getElementById("prVisor"));
