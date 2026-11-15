/* ============ Estado ============ */
const KEY="alv-taller-minifig-v2"+(new URLSearchParams(location.search).get("bib")?":"+new URLSearchParams(location.search).get("bib"):""),KEY_V1="alv-taller-minifig-v1";
let lista=[], actual=null, franq="MARVEL", pose="quieto";
function cargar(){try{const s=JSON.parse(localStorage.getItem(KEY)||"null");if(s&&Array.isArray(s.lista)&&s.lista.length){lista=s.lista.map(migrar);CATALOGO.forEach(k=>{if(!lista.some(c=>c.id===k.id))lista.push(JSON.parse(JSON.stringify(k)))});return}
  const v1=JSON.parse(localStorage.getItem(KEY_V1)||"null");const base=JSON.parse(JSON.stringify(CATALOGO));
  if(v1&&Array.isArray(v1.lista)){const propios=v1.lista.filter(c=>!CATALOGO.some(k=>k.id===c.id)).map(migrar);lista=base.concat(propios);return}}catch(e){}lista=JSON.parse(JSON.stringify(CATALOGO));}
let tGuardar=0;function guardar(){clearTimeout(tGuardar);tGuardar=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify({lista}))}catch(e){}},300)}
const slug=s=>(s||"").normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]","g"),"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"personaje";
