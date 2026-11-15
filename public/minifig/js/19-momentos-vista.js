/* ============ Personalizador (fase 5): vista previa de momentos ============ */
// Reproduce en el visor los momentos de la figura (nucleo/momentos.js). Un momento de una vez se repite
// con una pausa; "Ver los 4" los encadena: espera → al anotar → al ganar → al perder → espera en bucle.
const MOM_ORDEN=["espera","punto","victoria","derrota"];
const MOM_NOM={espera:"En espera",victoria:"Al ganar",derrota:"Al perder",punto:"Al anotar"};
let tMom=0;
function momentosDe(f){return MinifigCore.resolver(f,BIB).momentos}
function nomMomento(id){const i=Momentos.info(id);return i?i.nombre:id}
function prPararMomento(){clearTimeout(tMom);PR.mom=null;window.MOM_T0=0;pose="quieto"}
function prMomento(nombre,opc){clearTimeout(tMom);const o=opc||{};PR.mom={nombre,cual:o.cual||null,seq:o.seq||null};
 window.MOM_T0=clock.getElapsedTime();pose="mom:"+nombre;
 const i=Momentos.info(nombre);if(o.alAcabar&&i&&!i.bucle)tMom=setTimeout(o.alAcabar,(i.dur+0.9)*1000);
 else if(o.repetir&&i&&!i.bucle)tMom=setTimeout(()=>prMomento(nombre,o),(i.dur+1.1)*1000);
 else if(o.alAcabar&&i&&i.bucle)tMom=setTimeout(o.alAcabar,(o.espera||3)*1000);
 if(o.cual)prEstado(`${MOM_NOM[o.cual]}: ${nomMomento(nombre)}`);marcarMomento()}
// Encadena los 4 momentos de la figura
function prVerLos4(f){const M=momentosDe(f);let i=0;
 const sig=()=>{const cual=MOM_ORDEN[i];if(!cual){prMomento(M.espera,{cual:"espera",seq:true});return}i++;prMomento(M[cual],{cual,seq:true,alAcabar:sig,espera:2.5})};sig()}
// marca en los botones cuál se está viendo, sin repintar toda la página
function marcarMomento(){document.querySelectorAll("[data-mom]").forEach(b=>b.setAttribute("aria-pressed",String(!!PR.mom&&!PR.mom.seq&&b.dataset.mom===PR.mom.cual)));
 const b4=document.querySelector("[data-mom4]");if(b4)b4.setAttribute("aria-pressed",String(!!PR.mom&&!!PR.mom.seq))}
// Bloque para el editor: botones ▶ por momento
function bloqueMomentos(f){return{tipo:"momentos",f}}
function bloqueMomentosDOM(B){const d=document.createElement("div");d.className="pr-bloque";const M=momentosDe(B.f);
 d.innerHTML=`<div class="cm-sub">Vista previa</div><div class="pr-moms">${MOM_ORDEN.map(m=>`<button data-mom="${m}"><b>▶ ${MOM_NOM[m]}</b><small>${esc(nomMomento(M[m]))}</small></button>`).join("")}</div>
  <div class="cm-chips"><button data-mom4>▶ Ver los 4 seguidos</button><button data-momstop>■ Parar</button></div>`;
 d.querySelectorAll("[data-mom]").forEach(b=>b.onclick=()=>{prEnfocar("todo");prMomento(M[b.dataset.mom],{cual:b.dataset.mom,repetir:true})});
 d.querySelector("[data-mom4]").onclick=()=>{prEnfocar("todo");prVerLos4(B.f)};
 d.querySelector("[data-momstop]").onclick=()=>{prPararMomento();marcarMomento();prEstado("")};
 setTimeout(marcarMomento,0);return d}
