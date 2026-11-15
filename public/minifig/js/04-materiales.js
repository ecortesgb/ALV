/* ============ Geometría y materiales ============ */
const lin=c=>new THREE.Color(c).convertSRGBToLinear();
// Plástico ABS: base satinada con capa de barniz muy lisa, como en los juegos.
const plast=(c,o)=>new THREE.MeshPhysicalMaterial(Object.assign({color:lin(c),roughness:.34,metalness:0,clearcoat:1,clearcoatRoughness:.07,reflectivity:.5,envMapIntensity:1.1},o||{}));
const ANISO=renderer.capabilities.getMaxAnisotropy();
function canvasTex(cv){const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.anisotropy=ANISO;return t}
// Lienzo de impresión al doble de resolución; se dibuja con las mismas coordenadas.
function cvHD(w,h){const c=document.createElement("canvas");c.width=w*2;c.height=h*2;c.getContext("2d").setTransform(2,0,0,2,0,0);return c}
function decalMat(cv,glow){const m=new THREE.MeshPhysicalMaterial({map:canvasTex(cv),transparent:true,roughness:.32,clearcoat:1,clearcoatRoughness:.07,reflectivity:.5,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
 if(glow){m.emissive=new THREE.Color(0xffffff);m.emissiveMap=canvasTex(glow);m.emissiveIntensity=1.6}return m}
function rrect(w,h,r){const s=new THREE.Shape(),x=-w/2,y=-h/2;r=Math.min(r,w/2,h/2);s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s}
function rbox(w,h,d,b){b=b||0.035;const g=new THREE.ExtrudeGeometry(rrect(w-2*b,h-2*b,b*1.2),{depth:Math.max(.001,d-2*b),bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:3,curveSegments:6});g.translate(0,0,-(d-2*b)/2);return g}
function mk(geo,mat,part,cast){const m=new THREE.Mesh(geo,mat);m.userData.part=part;m.castShadow=cast!==false;m.receiveShadow=true;return m}
function cv(w,h){const c=document.createElement("canvas");c.width=w;c.height=h;return c}
