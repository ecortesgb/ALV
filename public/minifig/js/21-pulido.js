/* ============ Personalizador (fase 7): pulido ============ */
// 1) Miniaturas: solo se dibujan las que se ven y quedan guardadas en el equipo (IndexedDB).
// 2) Calidad automática: en celular o si va lento, baja resolución y quita la sombra suave (SSAO).
// 3) Sonidos sintetizados (sin archivos) con botón de silencio.
// 4) Accesibilidad: teclado en las cuadrículas, avisos para lector de pantalla, menos movimiento.
const PULIDO={render:0,cache:0,lazy:0};
const prefs=(()=>{let p={};try{p=JSON.parse(localStorage.getItem("minifig-prefs")||"{}")}catch(e){}return{sonido:p.sonido!==false,calidad:p.calidad||"auto"}})();
function guardarPrefs(){try{localStorage.setItem("minifig-prefs",JSON.stringify(prefs))}catch(e){}}
const MENOS_MOV=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
// celular = pantalla táctil sin mouse (una laptop con pantalla táctil no cuenta) o pantalla angosta
const ES_MOVIL=(window.matchMedia&&matchMedia("(pointer:coarse) and (hover:none)").matches)||innerWidth<820;
document.documentElement.lang="es";

/* ---------- 1. Miniaturas ---------- */
const VER_MINI="v1";   // subir si cambia cómo se dibujan las miniaturas
const IDB={db:null,abriendo:null};
function idbAbrir(){if(IDB.db)return Promise.resolve(IDB.db);if(IDB.abriendo)return IDB.abriendo;
 IDB.abriendo=new Promise(ok=>{try{const r=indexedDB.open("minifig-miniaturas",1);r.onupgradeneeded=()=>r.result.createObjectStore("m");
  r.onsuccess=()=>{IDB.db=r.result;ok(IDB.db)};r.onerror=()=>ok(null)}catch(e){ok(null)}});return IDB.abriendo}
async function idbGet(k){const db=await idbAbrir();if(!db)return null;return new Promise(ok=>{try{const q=db.transaction("m").objectStore("m").get(k);q.onsuccess=()=>ok(q.result||null);q.onerror=()=>ok(null)}catch(e){ok(null)}})}
async function idbPut(k,v){const db=await idbAbrir();if(!db)return;try{db.transaction("m","readwrite").objectStore("m").put(v,k)}catch(e){}}
// huella corta de la clave (la clave real es el JSON completo de la figura)
function huella(s){let h1=0x811c9dc5,h2=0x1b873593;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h1=Math.imul(h1^c,16777619);h2=Math.imul(h2^c,2246822519)}return (h1>>>0).toString(36)+(h2>>>0).toString(36)+s.length.toString(36)}
const clavePersistente=k=>huella(VER_MINI+"|"+(BIB.version||"")+"|"+k);
// lo que se dibuja se guarda también en el equipo
[MINIS,thumbs].forEach(mapa=>{const set0=mapa.set.bind(mapa);mapa.set=(k,v)=>{if(!mapa.has(k)){PULIDO.render++;idbPut(clavePersistente(k),v)}return set0(k,v)}});
// pedir una miniatura solo cuando su imagen está (casi) a la vista
const io=("IntersectionObserver" in window)?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);const f=e.target._pedir;e.target._pedir=null;if(f)f()}}),{rootMargin:"250px"}):null;
function cuandoSeVea(img,fn){if(!io){fn();return}PULIDO.lazy++;img._pedir=fn;io.observe(img)}
function envolverMini(orig,mapa,clave){return function(...a){const img=a[a.length-1],k=clave(...a);
 if(mapa.has(k)){img.src=mapa.get(k);return}
 cuandoSeVea(img,async()=>{const u=await idbGet(clavePersistente(k));if(u){Map.prototype.set.call(mapa,k,u);PULIDO.cache++;img.src=u;return}orig(...a)})}}
pedirMini=envolverMini(pedirMini,MINIS,(sec,c)=>sec+"|"+JSON.stringify(c));
pedirThumb=envolverMini(pedirThumb,thumbs,c=>firma(c));
// las fotos y miniaturas no deben llevar los efectos de poder del visor
const _snap0=snap;snap=function(...a){const ocultos=[];
 const ocultar=o=>{if(o&&o.visible){o.visible=false;ocultos.push(o)}};
 if(typeof efectos!=="undefined"&&efectos)efectos.items.forEach(it=>[it.pts,it.mesh,...(it.rayos||[])].forEach(ocultar));
 if(typeof EFM!=="undefined"&&EFM.pts)[EFM.pts,EFM.rayo,EFM.nucleo,EFM.anillo].forEach(ocultar);
 try{return _snap0(...a)}finally{ocultos.forEach(o=>o.visible=true)}};

/* ---------- 2. Calidad ---------- */
const DPR=window.devicePixelRatio||1;let calidadActual=null,ajustesEl=null;
function aplicarCalidad(c){calidadActual=c;POST.activo=c==="alta";renderer.setPixelRatio(c==="alta"?Math.min(2,DPR):Math.min(1.25,DPR));resize();pintarAjustes()}
if(ES_MOVIL)key.shadow.mapSize.set(1024,1024);          // sombra más ligera en celular
aplicarCalidad(prefs.calidad==="auto"?(ES_MOVIL?"rapida":"alta"):prefs.calidad);
// en "auto" se mide la fluidez; si va a menos de 32 cuadros por segundo dos veces seguidas, pasa a rápida
(function medir(){let n=0,t0=performance.now(),lentos=0;
 (function cuadro(){n++;const t=performance.now();if(t-t0>=2000){const fps=n*1000/(t-t0);n=0;t0=t;
   if(prefs.calidad==="auto"&&calidadActual==="alta"&&!document.hidden&&fps<32){if(++lentos>=2){aplicarCalidad("rapida");if(typeof toast==="function")toast("Calidad rápida: así se mueve más fluido.")}}else lentos=0}
  requestAnimationFrame(cuadro)})()})();

/* ---------- 3. Sonido ---------- */
let AC=null;
function audio(){if(!prefs.sonido)return null;try{if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();if(AC.state==="suspended")AC.resume();return AC}catch(e){return null}}
function tono(f0,f1,dur,tipo,vol,ret){const a=audio();if(!a)return;const t=a.currentTime+(ret||0),o=a.createOscillator(),g=a.createGain();
 o.type=tipo||"square";o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur);
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol||0.06,t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g).connect(a.destination);o.start(t);o.stop(t+dur+0.02)}
function ruido(dur,vol,filtro){const a=audio();if(!a)return;const b=a.createBuffer(1,Math.floor(a.sampleRate*dur),a.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
 const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();s.buffer=b;f.type="bandpass";f.frequency.value=filtro||1200;g.gain.value=vol||0.12;s.connect(f).connect(g).connect(a.destination);s.start()}
const SONIDOS={
 tap:()=>tono(900,null,0.045,"square",0.035),
 elegir:()=>{tono(660,null,0.06,"square",0.045);tono(990,null,0.08,"square",0.045,0.05)},
 guardar:()=>[523,659,784,1047].forEach((f,i)=>tono(f,null,0.12,"triangle",0.07,i*0.08)),
 deshacer:()=>tono(700,260,0.14,"sawtooth",0.04),
 aviso:()=>tono(220,180,0.18,"square",0.04),
 rayo:()=>{ruido(0.35,0.12,2400);tono(1400,180,0.3,"sawtooth",0.03)},
 estallido:()=>{ruido(0.45,0.2,500);tono(160,60,0.35,"sine",0.12)},
 chorro:()=>ruido(0.5,0.1,900),aura:()=>[880,1175,1568].forEach((f,i)=>tono(f,null,0.25,"sine",0.04,i*0.07)),
 anillo:()=>{tono(120,50,0.4,"sine",0.18);ruido(0.3,0.1,300)},estela:()=>ruido(0.4,0.12,3000),proyectil:()=>{tono(300,900,0.25,"sawtooth",0.04);ruido(0.3,0.08,700)},
};
function sonar(t){if(!prefs.sonido)return;try{(SONIDOS[t]||SONIDOS.tap)()}catch(e){}}
document.getElementById("pers").addEventListener("click",e=>{const b=e.target.closest("button");if(!b||b.disabled)return;
 if(b.closest(".pr-ajustes")||b.id==="edGuardar"||b.id==="prGuardar"||b.id==="edDes")return;   // tienen su propio sonido
 sonar(b.matches(".pieza,.panel,.cap,[data-col]")?"elegir":"tap")},true);
const _prGuardarEn0=prGuardarEn;prGuardarEn=function(...a){sonar("guardar");return _prGuardarEn0(...a)};
const _edDeshacer0=edDeshacer;edDeshacer=function(){if(PR.ed&&PR.ed.hist.length)sonar("deshacer");return _edDeshacer0()};
// al reproducir un momento de una vez, suena según su efecto
const _prMomento0=prMomento;prMomento=function(nombre,opc){const r=_prMomento0(nombre,opc);const i=Momentos.info(nombre),d=Momentos.efecto(nombre);
 if(i&&!i.bucle&&opc&&opc.cual)setTimeout(()=>sonar(d?d.forma:"tap"),280);return r};
// los avisos de "quitamos…" o de algo que no se puede, con su sonido
const _prEstado0=prEstado;prEstado=function(t){_prEstado0(t);if(t&&/^(Quitamos|No |Esta pieza no|Ese traje no|Máximo)/.test(t))sonar("aviso")};

/* ---------- Ajustes en la barra de abajo: sonido y calidad ---------- */
const barraPers=document.querySelector("#pers .cm-barra");
ajustesEl=document.createElement("span");ajustesEl.className="pr-ajustes";barraPers.insertBefore(ajustesEl,barraPers.firstChild);
const NOM_CAL={auto:"automática",alta:"alta",rapida:"rápida"};
function pintarAjustes(){const ajustes=ajustesEl;if(!ajustes)return;ajustes.innerHTML=`<button id="ajSonido" aria-pressed="${prefs.sonido}">Sonido: ${prefs.sonido?"sí":"no"}</button><button id="ajCal" title="Calidad del 3D">Calidad: ${NOM_CAL[prefs.calidad]}${prefs.calidad==="auto"&&calidadActual?" ("+NOM_CAL[calidadActual]+")":""}</button>`;
 ajustes.querySelector("#ajSonido").onclick=()=>{prefs.sonido=!prefs.sonido;guardarPrefs();pintarAjustes();sonar("tap")};
 ajustes.querySelector("#ajCal").onclick=()=>{const o=["auto","alta","rapida"];prefs.calidad=o[(o.indexOf(prefs.calidad)+1)%3];guardarPrefs();aplicarCalidad(prefs.calidad==="auto"?(ES_MOVIL?"rapida":"alta"):prefs.calidad)}}
pintarAjustes();

/* ---------- 4. Accesibilidad ---------- */
const estadoEl=document.getElementById("prEstado");estadoEl.setAttribute("role","status");estadoEl.setAttribute("aria-live","polite");
const visorEl=document.getElementById("prVisor");visorEl.setAttribute("role","img");
const _prMostrar0=prMostrar;prMostrar=function(f){_prMostrar0(f);visorEl.setAttribute("aria-label",f?`Vista 3D de ${f.nombre||"tu figura"}`:"Cápsula vacía")};
// Teclado: con el personalizador abierto, las flechas mueven el foco entre viñetas y ya no tocan el taller de atrás
function vecino(b,key){const grupo=b.closest(".cm-grid,.caps,.cm-chips,.pr-moms,.pr-prog,.pr-tabs-av,.cm-sw");if(!grupo)return null;
 const bs=[...grupo.querySelectorAll("button:not([disabled])")].filter(x=>x.closest(".cm-grid,.caps,.cm-chips,.pr-moms,.pr-prog,.pr-tabs-av,.cm-sw")===grupo);const i=bs.indexOf(b);if(i<0)return null;
 if(key==="ArrowRight")return bs[i+1]||null;if(key==="ArrowLeft")return bs[i-1]||null;
 const r=b.getBoundingClientRect(),cx=r.left+r.width/2,abajo=key==="ArrowDown";
 const fila=bs.filter(x=>{const q=x.getBoundingClientRect();return abajo?q.top>r.top+r.height/2:q.bottom<r.top+r.height/2});
 if(!fila.length)return null;const y=abajo?Math.min(...fila.map(x=>x.getBoundingClientRect().top)):Math.max(...fila.map(x=>x.getBoundingClientRect().top));
 return fila.filter(x=>Math.abs(x.getBoundingClientRect().top-y)<4).sort((p,q)=>Math.abs(p.getBoundingClientRect().left+p.getBoundingClientRect().width/2-cx)-Math.abs(q.getBoundingClientRect().left+q.getBoundingClientRect().width/2-cx))[0]}
document.addEventListener("keydown",e=>{if(!PR.on)return;const t=e.target;if(t&&(t.tagName==="INPUT"||t.tagName==="SELECT"||t.tagName==="TEXTAREA"))return;
 if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"," ","Enter"].includes(e.key)){
  e.stopPropagation();   // el taller de atrás (js/10) también escucha flechas y espacio
  if(e.key.startsWith("Arrow")&&t&&t.tagName==="BUTTON"){const n=vecino(t,e.key);if(n){n.focus();n.scrollIntoView({block:"nearest"});e.preventDefault()}}}},true);
// Menos movimiento: sin giro automático ni acercamientos animados
if(MENOS_MOV){const _prEntrar0=prEntrar;prEntrar=function(){_prEntrar0();controls.autoRotate=false};
 const _prEnfocar0=prEnfocar;prEnfocar=function(...a){_prEnfocar0(...a);if(camTween)camTween.dur=1}}
