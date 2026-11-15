/* ============ Arranque ============ */
// 1) Lee la biblioteca central y su geometría  2) agrega a los menús las piezas importadas  3) arma el catálogo
// ?bib=otra_carpeta/ permite abrir otra biblioteca (por ejemplo, una de prueba).
const CARPETA_BIB=(new URLSearchParams(location.search).get("bib")||"biblioteca/").replace(/([^/])$/,"$1/");
function cargarScript(src){return new Promise((ok,mal)=>{const s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=()=>mal(new Error("No se pudo cargar "+src));document.head.appendChild(s)})}
function integrarPiezasEnMenus(){BIB.piezas.forEach(p=>{const k=p.clave;
 if(p.categoria==="cabello"||p.categoria==="casco"){if(!(k in CABELLO)){CABELLO[k]=p.nombre;LD_PELO[k]=p.nombre;(p.categoria==="casco"?CASCOS:PELOS)[k]=p.nombre}}
 else if(p.categoria==="cuello"){if(!(k in CUELLO))CUELLO[k]=p.nombre}
 else if(p.categoria==="objeto"){if(!(k in ACCES)){ACCES[k]=p.nombre;LD_ACC[k]=p.ldraw;COLOR_ACC[k]=p.color_defecto||"#a0a5a9"}}})}
(async function arrancar(){
 try{await cargarBiblioteca(CARPETA_BIB);await cargarScript(CARPETA_BIB+"geometria/ldraw_piezas.js")}
 catch(e){document.body.insertAdjacentHTML("afterbegin",`<div class="toast" style="top:20px;bottom:auto">No se pudo leer la biblioteca: ${esc(e.message)}. Abre el Taller desde su servidor (ver README).</div>`);console.error(e);return}
 if(window.LDRAW_COLORES)Object.assign(LDCOL,window.LDRAW_COLORES);
 integrarPiezasEnMenus();
 CATALOGO=BIB.personajes.map(desdeBiblioteca);
 cargar();precargarImgs();lista=lista.map(c=>P(c));
 // los personajes de la biblioteca mandan: si cambian en el archivo, se actualizan aquí
 CATALOGO.forEach(k=>{const i=lista.findIndex(c=>c.id===k.id);if(i<0)lista.push(JSON.parse(JSON.stringify(k)));else if((k.origen||{}).tipo==="rebrickable")lista[i]=JSON.parse(JSON.stringify(k))});guardar();
 franq=BIB.colecciones[0]?BIB.colecciones[0].id:"oficios";
 actual=lista.find(c=>c.franquicia===franq)||lista[0];franq=actual.franquicia;pose=actual.reposo||"quieto";
 resize();rehacer();pintarTabs();pintarCat();pintarEditor();pintarPoses();loop();initDownloads();prAbrir();
})();
