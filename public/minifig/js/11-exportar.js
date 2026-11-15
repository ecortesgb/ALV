/* ============ Fotos y exportaciones ============ */
const TIPOS=[{paso:"piel",dir:"HEADS",parts:["piel"]},{paso:"rostro",dir:"FACES",parts:["rostro"]},{paso:"facial",dir:"FACIAL",parts:["facial"]},{paso:"cabello",dir:"HAIR",parts:["cabello"]},{paso:"torso",dir:"TORSOS",parts:["torso"]},{paso:"piernas",dir:"LEGS",parts:["piernas"]},{paso:"mano",dir:"ACCESSORIES",parts:["mano"]},{paso:"capa",dir:"ACCESSORIES",parts:["capa"]}];
// Cámara del lienzo de ALV (400 × 520): 9.525 px por mm, eje en x = 200, planta de los pies en y = 489.
const ALV={px_mm:9.525,cx:200,pies:489,w:400,h:520};
function orto(vista){const k=ALV.px_mm*16,hw=ALV.w/2/k,hh=ALV.h/2/k,cy=(ALV.pies-ALV.h/2)/k,ox=(ALV.cx-ALV.w/2)/k;const c=new THREE.OrthographicCamera(-hw,hw,hh,-hh,0.1,50);const z=vista==="espalda"?-10:10;c.position.set(-ox,cy,z);c.lookAt(-ox,cy,0);return c}
function snap(cam,w,h,conAO){const pr=renderer.getPixelRatio(),sz=renderer.getSize(new THREE.Vector2()),bg=scene.background;deco.visible=false;scene.background=null;renderer.setPixelRatio(1);renderer.setSize(w,h,false);
 if(cam.isPerspectiveCamera){cam.aspect=w/h;cam.updateProjectionMatrix()}renderer.render(scene,cam);const out=cv(w,h),og=out.getContext("2d");og.drawImage(renderer.domElement,0,0,w,h);
 if(conAO!==false&&POST.ok){try{POST.aoComp.setPixelRatio(1);POST.aoComp.setSize(w,h);ajustarAO(POST.aoPass,cam);POST.aoComp.render();
  const ao=cv(w,h);ao.getContext("2d").drawImage(renderer.domElement,0,0,w,h);const tmp=cv(w,h),tg=tmp.getContext("2d");tg.drawImage(out,0,0);tg.globalCompositeOperation="multiply";tg.globalAlpha=0.85;tg.drawImage(ao,0,0);tg.globalAlpha=1;tg.globalCompositeOperation="destination-in";tg.drawImage(out,0,0);og.clearRect(0,0,w,h);og.drawImage(tmp,0,0)}catch(e){console.warn("AO export",e)}}
 renderer.setPixelRatio(pr);renderer.setSize(sz.x,sz.y,false);deco.visible=true;scene.background=bg;camera.aspect=sz.x/Math.max(1,sz.y);camera.updateProjectionMatrix();return out}
function recortar(c){const g=c.getContext("2d"),d=g.getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=-1,y1=-1;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){if(d[(y*c.width+x)*4+3]>8){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}
 if(x1<0)return null;const p=4,o=cv(x1-x0+1+2*p,y1-y0+1+2*p);o.getContext("2d").drawImage(c,x0,y0,x1-x0+1,y1-y0+1,p,p,x1-x0+1,y1-y0+1);return o}
function conFigura(c,fn){const vis=fig?fig.visible:false;if(fig)fig.visible=false;const f=build(c);scene.add(f);try{return fn(f)}finally{scene.remove(f);dispose(f);if(fig)fig.visible=vis}}
function soloParte(f,parts){f.traverse(o=>{if(o.isMesh)o.visible=parts.includes(o.userData.part)&&!o.userData.glow})}
const toBlob=c=>new Promise(r=>c.toBlob(r,"image/png"));
function idPieza(c,paso){return `${c.equipo||"generico"}-${paso}-${slug(c.id||c.nombre)}`}
async function piezasDe(c,zip,base){const lines=[],cmds=[];const fr=(c.franquicia||"GENERIC").toUpperCase().replace(/[^A-Z0-9_]+/g,"_");
 const parts=conFigura(c,f=>{const res=[];
  // Personaje completo de frente (lienzo 400x520 x2, sin recortar) y espalda
  res.push({path:`${fr}/PERSONAJES/${slug(c.nombre)}_front.png`,cv:snap(orto("frente"),800,1040)});
  res.push({path:`${fr}/PERSONAJES/${slug(c.nombre)}_back.png`,cv:snap(orto("espalda"),800,1040)});
  TIPOS.forEach(t=>{let has=false;f.traverse(o=>{if(o.isMesh&&t.parts.includes(o.userData.part))has=true});if(!has)return;soloParte(f,t.parts);
   const front=recortar(snap(orto("frente"),1200,1560));if(!front)return;const id=idPieza(c,t.paso);res.push({path:`${fr}/${t.dir}/${id}.png`,cv:front,t,id});
   if(t.paso==="torso"||t.paso==="cabello"){const back=recortar(snap(orto("espalda"),1200,1560));if(back)res.push({path:`${fr}/${t.dir}/${id}_back.png`,cv:back})}});
  // STL en milímetros de cada pieza sólida (las impresiones de cara y pecho son calcomanías y no van)
  if(THREE.STLExporter){const ex=new THREE.STLExporter();f.updateMatrixWorld(true);
   [["piel","cabeza"],["cabello","cabello"],["torso","torso-con-brazos"],["piernas","cadera-y-piernas"],["mano","objeto"],["facial","barba"]].forEach(([part,nom])=>{const g=new THREE.Group();
    f.traverse(o=>{if(o.isMesh&&o.userData.part===part&&!o.userData.decal&&o.material&&!(o.material.transparent&&o.material.opacity<1)){const geo=o.geometry.clone();geo.applyMatrix4(o.matrixWorld);geo.scale(16,16,16);g.add(new THREE.Mesh(geo))}});
    if(g.children.length){const dv=ex.parse(g,{binary:true});res.push({path:`${fr}/STL/${slug(c.nombre)}_${nom}.stl`,bin:dv.buffer});g.children.forEach(m=>m.geometry.dispose())}})}
  return res});
 for(const p of parts){zip.file(`${base}${p.path}`,p.bin?p.bin:await toBlob(p.cv));
  if(p.t&&["rostro","facial","cabello","torso","piernas","mano"].includes(p.t.paso)){cmds.push(`python tools/preparar_pieza.py "ALV_ASSETS/${p.path}" ${p.t.paso} ${p.id}`);
   if(c.equipo)lines.push({id:p.id,nombre:`${({rostro:"Cara",facial:"Detalles",cabello:"Cabello",torso:"Traje",piernas:"Piernas",mano:"Objeto"})[p.t.paso]} de ${c.nombre}`,paso:p.t.paso,equipo:c.equipo,nivel:Number(c.nivel)||1,personaje:c.nombre})}}
 zip.file(`${base}${fr}/PERSONAJES/${slug(c.nombre)}.json`,JSON.stringify(c,null,2));
 zip.file(`${base}${fr}/PERSONAJES/${slug(c.nombre)}.ldr`,ldr(c));
 return {lines,cmds}}
let downloads=null;
async function initDownloads(){try{if(window.claude&&claude.use){downloads=await Promise.race([claude.use("downloads"),new Promise(r=>setTimeout(()=>r(null),10000))])}}catch(e){downloads=null}}
async function guardarArchivo(nombre,blob){
 if(downloads){try{await downloads.save({filename:nombre,data:blob});toast("Listo: "+nombre)}catch(e){toast(e&&e.code==="declined"?"Descarga cancelada":"No se pudo guardar: "+(e&&e.message||e))}return}
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=nombre;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000);toast("Descargando "+nombre)}
function ocupado(txt){let el=document.querySelector(".busy");if(!txt){el&&el.remove();return}if(!el){el=document.createElement("div");el.className="busy";stage.appendChild(el)}el.textContent=txt}
const espera=()=>new Promise(r=>setTimeout(r,30));
async function exportar(lista_){const zip=new JSZip();const allLines=[],allCmds=[];let i=0;
 for(const c of lista_){i++;ocupado(`Armando piezas ${i}/${lista_.length} · ${c.nombre}`);await espera();const r=await piezasDe(c,zip,"ALV_ASSETS/");allLines.push(...r.lines);allCmds.push(...r.cmds)}
 zip.file("ALV_ASSETS/piezas-equipo.json",JSON.stringify(allLines,null,2));
 zip.file("ALV_ASSETS/comandos_preparar.txt",["# Corre esto desde la carpeta app/ de ALV, con ALV_ASSETS copiada ahí mismo.","# Cada línea recorta la pieza y la acomoda en la zona de su tipo (400x520).",...allCmds,"","# Luego pega el contenido de piezas-equipo.json en src/content/piezas-equipo.json"].join("\n"));
 zip.file("ALV_ASSETS/LEEME.txt","Piezas generadas con el Taller de Minifiguras.\n\nCarpetas: FRANQUICIA/TIPO. HEADS = cabeza sin cara, FACES = solo la cara, FACIAL = lentes/barba/marcas, HAIR = cabello y cascos, TORSOS = torso con brazos y manos (_back = espalda), LEGS = cadera y piernas, ACCESSORIES = objeto en la mano y capa, PERSONAJES = figura completa de frente/espalda en 800x1040 (lienzo ALV x2) y su JSON, STL = cada pieza sólida en milímetros (forma exterior, sin los encastres internos).\n\nLas piezas sueltas van recortadas a su contorno: tools/preparar_pieza.py las acomoda solas en su zona.\n");
 ocupado("Comprimiendo…");const blob=await zip.generateAsync({type:"blob"});ocupado(null);return blob}
