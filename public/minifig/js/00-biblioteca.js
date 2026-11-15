/* ============ Biblioteca central: piezas, estampados, personajes y colecciones ============ */
// La biblioteca es la fuente de verdad. Cada pieza tiene un ID estable (HAIR_012) y su número LDraw.
// Los personajes solo guardan referencias a IDs más color: nunca geometría.
// Este archivo no usa el DOM para poder correr también en Node (herramientas/generar_biblioteca.js).
var BIB={version:null,piezas:[],estampados:[],personajes:[],colecciones:[],porId:{},porClave:{}};
var LEGADO_COL={MARVEL:"marvel",DC:"dc",HARRY_POTTER:"harry-potter",GENERIC:"oficios"};

async function cargarBiblioteca(base){
 base=base||"biblioteca/";
 const leer=n=>fetch(base+n,{cache:"no-cache"}).then(r=>{if(!r.ok)throw new Error(`No se pudo leer ${n} (${r.status})`);return r.json()});
 const [pz,es,pe,co]=await Promise.all(["piezas.json","estampados.json","personajes.json","colecciones.json"].map(leer));
 usarBiblioteca(pz,es,pe,co);return BIB}
function usarBiblioteca(pz,es,pe,co){BIB.version=pz.version;BIB.piezas=pz.piezas;BIB.estampados=es.estampados;BIB.personajes=pe.personajes;BIB.colecciones=co.colecciones;indexarBiblioteca()}
function indexarBiblioteca(){BIB.porId={};BIB.porClave={};BIB.piezas.concat(BIB.estampados).forEach(p=>{BIB.porId[p.id]=p;BIB.porClave[p.categoria+":"+p.clave]=p})}
function idDePieza(cat,clave){const p=BIB.porClave[cat+":"+clave];return p?p.id:null}
function claveDePieza(id){const p=BIB.porId[id];return p?p.clave:null}
function coleccion(id){return BIB.colecciones.find(c=>c.id===id)||null}

// Piezas LDraw estampadas o distintas de las lisas, por espacio del cuerpo
function ldDe(S){const ld={},pz=id=>BIB.porId[id]||{};const pon=(k,v,def)=>{if(v&&v!==def)ld[k]=v};
 pon("cabeza",pz((S.cabeza||{}).id).ldraw,"3626c");pon("torso",pz((S.torso||{}).id).ldraw,"973");
 if(S.brazos){pon("brazoDer",pz(S.brazos.derecho).ldraw,"3818");pon("brazoIzq",pz(S.brazos.izquierdo).ldraw,"3819")}
 const pl=pz((S.piernas||{}).id);if(pl.tipo==="cortas")pon("cortas",pl.ldraw,"41879a");else if(pl.ldraw_par){pon("piernaDer",pl.ldraw_par[0],"3816");pon("piernaIzq",pl.ldraw_par[1],"3817")}
 pon("cadera",pz((S.cadera||{}).id).ldraw,"3815");return Object.keys(ld).length?ld:null}
// Personaje de la biblioteca → modelo plano que usa el Taller
function desdeBiblioteca(p){const S=p.piezas||{},alv=(p.extensiones&&p.extensiones.alv)||{};
 const t=S.torso||{},col=t.colores||[];const cabello=S.cabello?claveDePieza(S.cabello.id):"ninguno";const obj=S.objeto?claveDePieza(S.objeto.id):"ninguno";
 return P({id:p.id,nombre:p.nombre,franquicia:p.coleccion,equipo:alv.equipo||"",nivel:alv.nivel||1,
  piel:(S.cabeza||{}).color||PIEL,rostro:S.cara?claveDePieza(S.cara.id):"ninguno",facial:(S.detalles||[]).map(claveDePieza).filter(Boolean),
  cabello:cabello||"ninguno",pelo:S.cabello?S.cabello.color:"#582a12",
  cuello:S.cuello?claveDePieza(S.cuello.id):"ninguno",cuelloColor:S.cuello?S.cuello.color:"#6c6e68",
  torso:t.color||"#f4f4f4",estampado:t.estampado?claveDePieza(t.estampado):"liso",c1:col[0]||"#c91a09",c2:col[1]||"#ffffff",c3:col[2]||"#6b4a2b",texto:t.texto||"",imgTorso:t.imagen||null,
  brazos:S.brazos&&S.brazos.color!==t.color?S.brazos.color:null,manos:S.manos&&S.manos.color!==(S.cabeza||{}).color?S.manos.color:null,
  cadera:(S.cadera||{}).color||"#6c6e68",cinturon:S.cadera&&S.cadera.cinturon?S.cadera.cinturon.color:null,
  piernasTipo:S.piernas&&S.piernas.id&&(BIB.porId[S.piernas.id]||{}).tipo==="cortas"?"cortas":"normal",ld:ldDe(S),origen:p.origen||null,piernas:(S.piernas||{}).color||"#6c6e68",botas:(S.piernas||{}).botas||null,
  capa:S.capa?S.capa.color:null,accesorio:obj||"ninguno",accColor:S.objeto&&S.objeto.color!==COLOR_ACC[obj]?S.objeto.color:null,
  poderes:alv.poderes||[],rasgos:alv.rasgos||[],reposo:alv.reposo||"quieto",_podIni:1,
  // lado izquierdo distinto y segundo objeto (modo avanzado); null = igual que el derecho
  brazosIzq:(S.brazos||{}).color_izq||null,manosIzq:(S.manos||{}).color_izq||null,piernasIzq:(S.piernas||{}).color_izq||null,
  accesorioIzq:S.objeto_izq?(claveDePieza(S.objeto_izq.id)||"ninguno"):"ninguno",accColorIzq:S.objeto_izq?S.objeto_izq.color||null:null})}

// Figura por capas (minifig-core, versión 2) → modelo plano que dibuja el Taller.
// meta: {id, nombre, coleccion} opcionales. Devuelve también qué quedó oculto y los avisos.
function desdeFigura(f,meta){const R=MinifigCore.resolver(f,BIB);const m=meta||{};
 const c=desdeBiblioteca({id:m.id||"figura",nombre:m.nombre||f.nombre,coleccion:m.coleccion||"MEZCLAS",piezas:R.piezas,extensiones:f.extensiones,origen:{tipo:"figura"}});
 c.poderes=R.poderes;c._figura=f;c._ocultos=R.ocultos;c._avisos=R.avisos;c._momentos=R.momentos;return c}

// Modelo plano del Taller → personaje de la biblioteca
function haciaBiblioteca(c){const I=(cat,clave)=>idDePieza(cat,clave),ld=c.ld||{};
 const pelo=c.cabello&&c.cabello!=="ninguno"?(I("cabello",c.cabello)||I("casco",c.cabello)):null;
 const S={
  cabeza:{id:I("cabeza",ld.cabeza||"3626c"),color:c.piel},
  cara:c.rostro&&c.rostro!=="ninguno"?{id:I("cara",c.rostro)}:null,
  detalles:(c.facial||[]).map(k=>I("detalle",k)).filter(Boolean),
  cabello:pelo?{id:pelo,color:c.pelo}:null,
  cuello:c.cuello&&c.cuello!=="ninguno"?{id:I("cuello",c.cuello),color:c.cuelloColor}:null,
  torso:{id:I("torso",ld.torso||"973"),color:c.torso,estampado:c.estampado&&c.estampado!=="liso"?I("estampado-torso",c.estampado):null,colores:[c.c1,c.c2,c.c3],texto:c.texto||"",imagen:c.imgTorso||null},
  brazos:{derecho:I("brazo",ld.brazoDer||"3818"),izquierdo:I("brazo",ld.brazoIzq||"3819"),color:c.brazos||c.torso},
  manos:{id:I("mano","3820"),color:c.manos||c.piel},
  cadera:c.piernasTipo==="cortas"?{id:I("piernas",ld.cortas||"cortas"),color:c.piernas}:{id:I("cadera",ld.cadera||"3815"),color:c.cadera,cinturon:c.cinturon?{id:I("cinturon","27145"),color:c.cinturon}:null},
  piernas:c.piernasTipo==="cortas"?{id:I("piernas",ld.cortas||"cortas"),color:c.piernas,botas:c.botas||null}:{id:I("piernas",ld.piernaDer?ld.piernaDer+"|"+ld.piernaIzq:"normales"),color:c.piernas,botas:c.botas||null},
  capa:c.capa?{id:I("capa","522"),color:c.capa}:null,
  objeto:c.accesorio&&c.accesorio!=="ninguno"?{id:I("objeto",c.accesorio),color:c.accColor||COLOR_ACC[c.accesorio]}:null};
 return {id:c.id,nombre:c.nombre,coleccion:LEGADO_COL[c.franquicia]||c.franquicia||"oficios",piezas:S,
  extensiones:{alv:{equipo:c.equipo||"",nivel:c.nivel||1,poderes:c.poderes||[],rasgos:c.rasgos||[],reposo:c.reposo||"quieto"}},
  origen:c.origen||{tipo:"taller"},actualizado:new Date().toISOString().slice(0,10)}}

if(typeof module!=="undefined")module.exports={BIB,usarBiblioteca,desdeBiblioteca,desdeFigura,haciaBiblioteca,idDePieza,claveDePieza};
