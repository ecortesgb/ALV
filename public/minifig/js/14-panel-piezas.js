/* ============ Panel de piezas: personalizar sin separar ============ */
const SEC_NOMBRE={cabello:"Pelo y cascos",cabeza:"Cara",torso:"Torso",piernas:"Piernas",objeto:"Objeto"};
const GRUPOS=[{k:"todos",n:"Todo"},{k:"heroes",n:"Superhéroes",sub:null},{k:"peliculas",n:"Películas",sub:null},{k:"oficios",n:"Oficios",sub:null},{k:"basicas",n:"Piezas básicas"}];
function grupoDe(fr){const c=coleccion(fr);const g=c?c.grupo:"";return g==="Superhéroes"?"heroes":g==="Películas"?"peliculas":g==="Oficios"?"oficios":"otros"}
let pzSec=0,pzGrupo="todos",pzSub=null;
function basicas(sl){const c=actual,base={};sl.keys.forEach(k=>base[k]=c[k]==null?null:c[k]);const it=(o,n)=>{const v=Object.assign({},base,o);return {v,de:n,key:JSON.stringify(v),fr:"BASICAS"}};
 const L={cabello:[CABELLO,"cabello"],cabeza:[ROSTROS,"rostro"],torso:[TORSOS,"estampado"],piernas:[PIERNAS_TIPO,"piernasTipo"],objeto:[ACCES,"accesorio"]}[sl.k];
 return L?Object.entries(L[0]).map(([k,n])=>it({[L[1]]:k},n)):[]}
function detalle(sl,v){return sl.k==="cabello"?(CABELLO[v.cabello]||""):sl.k==="cabeza"?(ROSTROS[v.rostro]||""):sl.k==="torso"?(TORSOS[v.estampado]||""):sl.k==="piernas"?(PIERNAS_TIPO[v.piernasTipo]||""):(ACCES[v.accesorio]||"")}
function muestras(sl,v){const c=sl.k==="cabello"?[v.pelo]:sl.k==="cabeza"?[v.piel]:sl.k==="torso"?[v.torso,v.c1,v.brazos||v.torso]:sl.k==="piernas"?[v.cadera,v.piernas,v.botas||v.piernas]:[COLOR_ACC[v.accesorio]||"#555"];
 return c.filter(Boolean).map(h=>`<i style="background:${esc(h)}"></i>`).join("")}
function itemsPz(){const sl=SLOTS[pzSec];let it=[];
 if(pzGrupo!=="basicas")it=variantes(sl).filter(x=>pzGrupo==="todos"||(grupoDe(x.fr)===pzGrupo&&(!pzSub||x.fr===pzSub)));
 if(pzGrupo==="todos"||pzGrupo==="basicas")it=it.concat(basicas(sl).filter(b=>!it.some(x=>x.key===b.key)));return it}
function pintarPiezas(){const panel=document.getElementById("panelPz");if(!panel||panel.hidden)return;
 const sec=document.getElementById("pzSec");sec.innerHTML="";SLOTS.forEach((sl,i)=>{const b=document.createElement("button");b.textContent=SEC_NOMBRE[sl.k];b.setAttribute("aria-pressed",i===pzSec);b.onclick=()=>{pzSec=i;slotAct=i;pintarFlechas();pintarPiezas()};sec.appendChild(b)});
 const gr=document.getElementById("pzGrupos");gr.innerHTML="";GRUPOS.forEach(g=>{const b=document.createElement("button");b.className="tab";b.textContent=g.n;b.setAttribute("aria-pressed",g.k===pzGrupo);b.onclick=()=>{pzGrupo=g.k;pzSub=null;pintarPiezas()};gr.appendChild(b)});
 const sub=document.getElementById("pzSub");sub.innerHTML="";const G=GRUPOS.find(g=>g.k===pzGrupo);if(G&&G.k!=="todos"&&G.k!=="basicas")G.sub=BIB.colecciones.filter(c=>grupoDe(c.id)===G.k).map(c=>c.id);if(G&&G.sub&&G.sub.length>1){[null,...G.sub].forEach(f=>{const b=document.createElement("button");b.className="tab";b.textContent=f?nomFranq(f):"Todas";b.setAttribute("aria-pressed",f===pzSub);b.onclick=()=>{pzSub=f;pintarPiezas()};sub.appendChild(b)})}
 const sl=SLOTS[pzSec],act=claveDe(sl,actual),list=document.getElementById("pzList");list.innerHTML="";const it=itemsPz();
 if(!it.length){list.innerHTML='<p class="hint" style="padding:0 4px">No hay piezas de este grupo en esta sección todavía.</p>';return}
 it.forEach(x=>{const b=document.createElement("button");b.className="pz-item";b.setAttribute("aria-current",x.key===act);
  b.innerHTML=`<span class="pz-sw">${muestras(sl,x.v)}</span><span><b>${esc(x.fr==="BASICAS"?x.de:x.de)}</b><small>${esc(x.fr==="BASICAS"?"Pieza básica":nomFranq(x.fr)+" · "+detalle(sl,x.v))}</small></span>`;
  b.onclick=()=>{aplicarVar(sl,x);slotAct=pzSec;cambio();pintarEditor();pintarFlechas();pintarPiezas()};list.appendChild(b)})}
function verPanel(p){const pz=p==="pz";document.getElementById("panelPer").hidden=pz;document.getElementById("panelPz").hidden=!pz;document.getElementById("vPer").setAttribute("aria-selected",!pz);document.getElementById("vPz").setAttribute("aria-selected",pz);if(pz)pintarPiezas()}
document.getElementById("vPer").onclick=()=>verPanel("per");document.getElementById("vPz").onclick=()=>verPanel("pz");
