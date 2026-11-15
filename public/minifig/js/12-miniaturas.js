/* ============ Miniaturas ============ */
const thumbs=new Map();let colaT=[],corriendo=false;
function firma(c){return JSON.stringify(c)}
function pedirThumb(c,img){const k=firma(c);if(thumbs.has(k)){img.src=thumbs.get(k);return}colaT.push({c,img,k});if(!corriendo)procesarT()}
async function procesarT(){corriendo=true;while(colaT.length){const {c,img,k}=colaT.shift();if(!thumbs.has(k)){const cam=new THREE.PerspectiveCamera(26,400/520,0.1,50);cam.position.set(2.4,2.0,6.4);cam.lookAt(0,1.25,0);
  const u=conFigura(c,f=>{animar(f,"quieto",0);return snap(cam,240,312)}).toDataURL("image/png");thumbs.set(k,u)}img.src=thumbs.get(k);await espera()}corriendo=false}
