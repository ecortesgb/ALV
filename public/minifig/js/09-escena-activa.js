/* ============ Escena activa ============ */
let fig=null;
function dispose(o){o.traverse(m=>{if(m.geometry&&!m.userData.compartida)m.geometry.dispose();const ms=Array.isArray(m.material)?m.material:m.material?[m.material]:[];ms.forEach(x=>{["map","emissiveMap"].forEach(k=>x[k]&&x[k].dispose());x.dispose()})})}
function rehacer(){if(fig){scene.remove(fig);dispose(fig)}fig=build(actual);scene.add(fig);if(typeof quitarEfectos==="function"){quitarEfectos();efectos=crearEfectos(fig,actual)}
 document.getElementById("nm").innerHTML=`${esc(actual.nombre)}<small>${esc(nomFranq(actual.franquicia))}${actual.equipo?" · "+esc(EQUIPOS[actual.equipo]||actual.equipo):""} · Nivel ${actual.nivel} · ${alturaMM(actual).toFixed(1)} mm</small>`;pintarFlechas();if(typeof pintarPiezas==="function")pintarPiezas()}
const clock=new THREE.Clock();
