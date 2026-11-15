/* ============ Interfaz ============ */
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
const nomFranq=f=>{const c=coleccion(f);return c?c.nombre:({MEZCLAS:"Mezclas",BASICAS:"Pieza básica"})[f]||f};
function franquicias(){const s=BIB.colecciones.map(c=>c.id);lista.forEach(c=>{if(!s.includes(c.franquicia))s.push(c.franquicia)});return s}
function pintarTabs(){const el=document.getElementById("tabs");el.innerHTML="";franquicias().forEach(f=>{const b=document.createElement("button");b.className="tab";b.textContent=`${nomFranq(f)} ${lista.filter(c=>c.franquicia===f).length}`;b.setAttribute("aria-pressed",f===franq);b.onclick=()=>{franq=f;pintarTabs();pintarCat()};el.appendChild(b)})}
function pintarCat(){const el=document.getElementById("cat");el.innerHTML="";lista.filter(c=>c.franquicia===franq).forEach(c=>{const b=document.createElement("button");b.className="card";b.setAttribute("aria-current",c===actual);
  const im=document.createElement("img");im.className="th";im.alt="";b.appendChild(im);b.insertAdjacentHTML("beforeend",`${esc(c.nombre)}<small>${c.equipo?esc(EQUIPOS[c.equipo]||c.equipo)+" · ":""}Nv ${c.nivel}</small>`);
  b.onclick=()=>{actual=c;rehacer();pintarCat();pintarEditor()};el.appendChild(b);pedirThumb(c,im)})}
function sel(opts,val){return Object.entries(opts).map(([k,v])=>`<option value="${esc(k)}"${k===val?" selected":""}>${esc(v)}</option>`).join("")}
function colorIn(k,v,label){return `<input type="color" id="c_${k}" data-k="${k}" value="${v||"#000000"}" title="${esc(label)}" aria-label="${esc(label)}">`}
function opcional(k,v,label){return `<span class="cols"><input type="checkbox" id="t_${k}" data-opt="${k}"${v?" checked":""} aria-label="Usar ${esc(label)}">${colorIn(k,v||"#888888",label)}</span>`}
function pintarEditor(){const c=actual,ed=document.getElementById("editor");
 ed.innerHTML=`
 <div class="sec"><h3><b></b>Ficha</h3>
  <div class="f"><label for="i_nombre">Nombre</label><input type="text" id="i_nombre" data-k="nombre" value="${esc(c.nombre)}"></div>
  <div class="f"><label for="i_franquicia">Franquicia</label><input type="text" id="i_franquicia" data-k="franquicia" list="dl_fr" value="${esc(c.franquicia)}"><datalist id="dl_fr">${franquicias().map(f=>`<option value="${esc(f)}">`).join("")}</datalist></div>
  <div class="f"><label for="i_equipo">Equipo ALV</label><select id="i_equipo" data-k="equipo">${sel(EQUIPOS,c.equipo)}</select></div>
  <div class="f"><label for="i_nivel">Nivel</label><input type="number" id="i_nivel" data-k="nivel" min="1" max="20" value="${c.nivel}"></div>
 </div>
 <div class="sec"><h3><b></b>Cabeza</h3>
  <div class="f"><label>Piel</label><span class="cols">${colorIn("piel",c.piel,"Color de piel")}<button class="btn" id="b_piel" style="padding:4px 8px">Amarillo clásico</button></span></div>
  <div class="f"><label for="i_rostro">Cara</label><select id="i_rostro" data-k="rostro">${sel(ROSTROS,c.rostro)}</select></div>
  <div class="f" style="align-items:start"><label>Detalles</label><div class="chips" id="facial">${Object.entries(FACIAL).map(([k,v])=>`<button data-f="${k}" aria-pressed="${(c.facial||[]).includes(k)}">${esc(v)}</button>`).join("")}</div></div>
  <div class="f"><label for="i_cabello">Cabello</label><select id="i_cabello" data-k="cabello">${sel(CABELLO,c.cabello)}</select></div>
  <div class="f"><label>Colores</label><span class="cols">${colorIn("pelo",c.pelo,"Color del cabello o casco")}</span></div>
 </div>
 <div class="sec"><h3><b></b>Torso</h3>
  <div class="f"><label>Base</label><span class="cols">${colorIn("torso",c.torso,"Color del torso")}</span></div>
  <div class="f"><label for="i_estampado">Estampado</label><select id="i_estampado" data-k="estampado">${sel(TORSOS,c.estampado)}</select></div>
  <div class="f"><label>Colores</label><span class="cols">${colorIn("c1",c.c1,"Color 1 del estampado")}${colorIn("c2",c.c2,"Color 2 del estampado")}${colorIn("c3",c.c3,"Color 3 del estampado")}</span></div>
  <div class="f"><label for="i_texto">Letra / número</label><input type="text" id="i_texto" data-k="texto" maxlength="2" value="${esc(c.texto)}"></div>
  <div class="f"><label>Brazos</label>${opcional("brazos",c.brazos,"color de brazos distinto")}</div>
  <div class="f"><label>Manos</label>${opcional("manos",c.manos,"guantes")}</div>
  <div class="f"><label for="f_img">Imagen propia</label><span class="cols"><input type="file" id="f_img" accept="image/png,image/webp,image/jpeg" style="max-width:150px">${c.imgTorso?'<button class="btn" id="b_noimg" style="padding:4px 8px">Quitar</button>':""}</span></div>
  <p class="hint">La imagen propia se pega al pecho encima del estampado. Usa PNG con fondo transparente.</p>
 </div>
 <div class="sec"><h3><b></b>Piernas</h3>
  <div class="f"><label for="i_piernasTipo">Tipo</label><select id="i_piernasTipo" data-k="piernasTipo">${sel(PIERNAS_TIPO,c.piernasTipo||"normal")}</select></div>
  <div class="f"><label>Cadera</label><span class="cols">${colorIn("cadera",c.cadera,"Color de cadera")}</span></div>
  <div class="f"><label>Piernas</label><span class="cols">${colorIn("piernas",c.piernas,"Color de piernas")}</span></div>
  <div class="f"><label>Botas</label>${opcional("botas",c.botas,"botas")}</div>
 </div>
 <div class="sec"><h3><b></b>Extras</h3>
  <div class="f"><label for="i_accesorio">En la mano</label><select id="i_accesorio" data-k="accesorio">${sel(ACCES,c.accesorio)}</select></div>
  <div class="f"><label>Capa</label>${opcional("capa",c.capa,"capa")}</div>
 </div>
 <div class="sec"><h3><b></b>Articulaciones</h3>
  ${ART.map(([k,l,mn,mx])=>`<div class="f"><label for="j_${k}">${l}</label><span class="cols"><input type="range" id="j_${k}" data-j="${k}" min="${mn}" max="${mx}" value="${manual[k]}" style="flex:1;min-width:0"><output id="o_${k}" style="width:38px;text-align:right;font-variant-numeric:tabular-nums">${manual[k]}°</output></span></div>`).join("")}
  <div class="row"><button class="btn" id="b_jcero">Pose de fábrica</button></div>
  <p class="hint">Solo existen los 7 giros de la pieza real: cabeza sobre el cuello, brazos sobre el eje del hombro (inclinado 9.782° como el costado del torso), manos sobre la muñeca y cada pierna sobre la cadera (±90°). Torso, cadera y cuello no se doblan.</p>
 </div>
 <div class="sec"><h3><b></b>Estándar de la pieza</h3>
  <p class="hint" style="margin:0 0 8px">Geometría oficial de <a href="https://library.ldraw.org" target="_blank" rel="noopener" style="color:var(--accent)">LDraw.org</a> (CC BY 4.0), armada con las reglas de cada pieza. 1 LDU = 0.4 mm. Altura de esta figura: <b>${alturaMM(c).toFixed(1)} mm</b>.</p>
  <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">${STD_TABLA.map(([n,l,m,f])=>`<tr><td style="padding:4px 4px 4px 0;color:var(--muted)">${n}</td><td style="padding:4px;white-space:nowrap;font-variant-numeric:tabular-nums">${m?m+" mm":l}</td><td style="padding:4px 0;white-space:nowrap;color:${f==="E"?"#ff9f43":f==="M"?"#3ecf8e":"#6fb1ff"}">${FUENTE[f]}</td></tr>`).join("")}</table></div>
 </div>
 <div class="sec"><h3><b></b>Cómo llega a ALV</h3>
  <p class="hint">«Piezas para ALV» baja un ZIP con <code>ALV_ASSETS/FRANQUICIA/TIPO/</code>, cada pieza recortada, la figura completa de frente y espalda, el JSON del personaje, las líneas para <code>piezas-equipo.json</code> y los comandos de <code>tools/preparar_pieza.py</code>. «Generar todos» hace lo mismo con toda la pestaña.</p>
 </div>`;
 ed.querySelectorAll("[data-k]").forEach(el=>{const k=el.dataset.k;const ev=el.tagName==="SELECT"?"change":"input";el.addEventListener(ev,()=>{let v=el.value;if(k==="nivel")v=Math.max(1,Number(v)||1);
   if(k.startsWith("c")||["piel","pelo","pelo2","torso","cadera","piernas","brazos","manos","botas","capa"].includes(k)){const t=document.getElementById("t_"+k);if(t&&!t.checked)return}
   actual[k]=v;cambio(k==="nombre"||k==="nivel"||k==="equipo"||k==="franquicia")})});
 ed.querySelectorAll("[data-opt]").forEach(el=>el.addEventListener("change",()=>{const k=el.dataset.opt;actual[k]=el.checked?document.getElementById("c_"+k).value:null;cambio()}));
 ed.querySelectorAll("#facial button").forEach(b=>b.onclick=()=>{const f=b.dataset.f,arr=new Set(actual.facial||[]);arr.has(f)?arr.delete(f):arr.add(f);actual.facial=[...arr];b.setAttribute("aria-pressed",arr.has(f));cambio()});
 ed.querySelectorAll("[data-j]").forEach(el=>el.addEventListener("input",()=>{manual[el.dataset.j]=Number(el.value);document.getElementById("o_"+el.dataset.j).textContent=el.value+"°";if(pose!=="manual"){pose="manual";pintarPoses()}}));
 document.getElementById("b_jcero").onclick=()=>{Object.keys(manual).forEach(k=>manual[k]=0);pose="manual";pintarPoses();pintarEditor()};


 document.getElementById("b_piel").onclick=()=>{actual.piel=PIEL;document.getElementById("c_piel").value=PIEL;cambio()};
 const ni=document.getElementById("b_noimg");if(ni)ni.onclick=()=>{actual.imgTorso=null;cambio();pintarEditor()};
 document.getElementById("f_img").onchange=e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const s=Math.min(1,512/Math.max(im.width,im.height));const c2=cv(Math.round(im.width*s),Math.round(im.height*s));c2.getContext("2d").drawImage(im,0,0,c2.width,c2.height);const url=c2.toDataURL("image/png");const im2=new Image();im2.onload=()=>{imgCache[url]=im2;actual.imgTorso=url;cambio();pintarEditor()};im2.src=url};im.src=r.result};r.readAsDataURL(file)};
}
let tCat=0;function cambio(meta){rehacer();guardar();if(meta){franq=actual.franquicia;pintarTabs()}clearTimeout(tCat);tCat=setTimeout(pintarCat,400)}
function pintarPoses(){const el=document.getElementById("poses");el.innerHTML="";Object.entries(POSES).forEach(([k,v])=>{const b=document.createElement("button");b.className="chip";b.textContent=v;b.setAttribute("aria-pressed",k===pose);b.onclick=()=>{pose=k;clock.start();pintarPoses()};el.appendChild(b)})}
document.querySelectorAll("[data-cam]").forEach(b=>b.onclick=()=>{const v=b.dataset.cam;const p={frente:[0,1.4,7.6],tres:[3.2,2.1,7.2],espalda:[0,1.6,-7.6]}[v];camera.position.set(...p);controls.target.set(0,1.2,0);controls.update()});
function toast(t){const el=document.createElement("div");el.className="toast";el.textContent=t;document.body.appendChild(el);setTimeout(()=>el.remove(),2600)}
function nuevoId(base){let id=slug(base),n=2;while(lista.some(c=>c.id===id))id=slug(base)+"-"+n++;return id}
document.getElementById("bNuevo").onclick=()=>{const c=P({nombre:"Nuevo personaje",franquicia:franq});c.id=nuevoId(c.nombre);lista.push(c);actual=c;rehacer();guardar();pintarTabs();pintarCat();pintarEditor()};
document.getElementById("bDup").onclick=()=>{const c=P(JSON.parse(JSON.stringify(actual)));c.nombre=actual.nombre+" (copia)";c.id=nuevoId(c.nombre);lista.push(c);actual=c;rehacer();guardar();pintarTabs();pintarCat();pintarEditor()};
const pick=o=>{const k=Object.keys(o);return k[Math.floor(Math.random()*k.length)]};const rcol=()=>"#"+new THREE.Color().setHSL(Math.random(),0.55+Math.random()*0.35,0.3+Math.random()*0.35).getHexString();
document.getElementById("bAzar").onclick=()=>{const pieles=[PIEL,"#f3d2b3","#e8b48a","#c68a5a","#8d5a36","#5a3a24"];const c=P({nombre:"Personaje "+(lista.length+1),franquicia:franq==="MARVEL"||franq==="HARRY_POTTER"?"GENERIC":franq,piel:pieles[Math.floor(Math.random()*pieles.length)],
  rostro:pick(ROSTROS),cabello:pick(CABELLO),pelo:rcol(),torso:rcol(),estampado:pick(TORSOS),c1:rcol(),c2:rcol(),c3:rcol(),cadera:rcol(),piernas:rcol(),accesorio:Math.random()<.6?pick(ACCES):"ninguno",facial:Math.random()<.4?[pick(FACIAL)]:[]});
 if(c.rostro.startsWith("mascara"))c.rostro="sonrisa";c.piernas=c.cadera;c.id=nuevoId(c.nombre);lista.push(c);actual=c;franq=c.franquicia;rehacer();guardar();pintarTabs();pintarCat();pintarEditor()};
let confirmaBorrar=0;
document.getElementById("bBorrar").onclick=e=>{const b=e.currentTarget;if(Date.now()-confirmaBorrar>3000){confirmaBorrar=Date.now();b.textContent="¿Seguro? Toca otra vez";setTimeout(()=>b.textContent="Borrar",3000);return}
 b.textContent="Borrar";if(lista.length<=1)return;const i=lista.indexOf(actual);lista.splice(i,1);actual=lista.find(c=>c.franquicia===franq)||lista[0];franq=actual.franquicia;rehacer();guardar();pintarTabs();pintarCat();pintarEditor()};
let confirmaReset=0;
document.getElementById("bReset").onclick=e=>{const b=e.currentTarget;if(Date.now()-confirmaReset>3000){confirmaReset=Date.now();b.textContent="Se pierden tus cambios. ¿Seguro?";setTimeout(()=>b.textContent="Restaurar catálogo",3000);return}
 b.textContent="Restaurar catálogo";lista=JSON.parse(JSON.stringify(CATALOGO));actual=lista[0];franq=actual.franquicia;rehacer();guardar();pintarTabs();pintarCat();pintarEditor()};
// Exporta en el formato de la biblioteca central (biblioteca/personajes.json)
document.getElementById("bJson").onclick=()=>guardarArchivo("personajes.json",new Blob([JSON.stringify({version:BIB.version||1,actualizado:new Date().toISOString().slice(0,10),personajes:lista.filter(c=>c.franquicia!=="MEZCLAS").map(haciaBiblioteca)},null,1)],{type:"application/json"}));
document.getElementById("fJson").onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{const d=JSON.parse(t);const crudo=Array.isArray(d)?d:d.personajes||d.lista||[d];const arr=crudo.map(x=>x.piezas?desdeBiblioteca(x):migrar(x));arr.forEach(c=>{c.id=nuevoId(c.id||c.nombre);lista.push(c)});actual=arr[0]||actual;franq=actual.franquicia;precargarImgs();rehacer();guardar();pintarTabs();pintarCat();pintarEditor();toast(`Importados: ${arr.length}`)}catch(err){toast("Ese archivo no es un JSON de personajes")}})};
document.getElementById("bFoto").onclick=async()=>{const cam=camera.clone();const c=snap(cam,1200,1560);await guardarArchivo(`${slug(actual.nombre)}.png`,await toBlob(c))};
document.getElementById("bPiezas").onclick=async()=>{try{const b=await exportar([actual]);await guardarArchivo(`ALV_${slug(actual.nombre)}.zip`,b)}catch(e){ocupado(null);toast("Falló la exportación: "+e.message)}};
document.getElementById("bTodos").onclick=async()=>{const sub=lista.filter(c=>c.franquicia===franq);try{const b=await exportar(sub);await guardarArchivo(`ALV_ASSETS_${franq}.zip`,b)}catch(e){ocupado(null);toast("Falló la exportación: "+e.message)}};
function precargarImgs(){lista.forEach(c=>{if(c.imgTorso&&!imgCache[c.imgTorso]){const im=new Image();im.onload=()=>{imgCache[c.imgTorso]=im;if(c===actual)rehacer()};im.src=c.imgTorso}})}
