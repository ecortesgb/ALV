/* ============ Three.js: escena con luz de videojuego ============ */
const stage=document.getElementById("stage");
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000,0);
stage.appendChild(renderer.domElement);
const scene=new THREE.Scene();
// Mapa de entorno: un "estudio" con paneles de luz, para reflejos de plástico ABS.
(function(){const pm=new THREE.PMREMGenerator(renderer);const env=new THREE.Scene();
 const room=new THREE.Mesh(new THREE.BoxGeometry(20,12,20),new THREE.MeshBasicMaterial({color:0x2a3350,side:THREE.BackSide}));env.add(room);
 const panel=(w,h,x,y,z,ry,rx,k,col)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(col||0xffffff).multiplyScalar(k),side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.set(rx||0,ry||0,0);env.add(m)};
 // Estudio tipo videojuego: cuarto oscuro con softboxes alargados que dejan reflejos limpios en el plástico.
 room.material.color.set(0x0a0d18);
 panel(7,1.4,0,5.9,1,0,Math.PI/2,5);            // techo
 panel(1.2,6,-9.9,2.5,3,Math.PI/2,0,4.2);       // tira izquierda (luz principal)
 panel(1.0,6,-9.9,2.5,-2,Math.PI/2,0,2.0);
 panel(1.0,6,9.9,2.5,-4,-Math.PI/2,0,3.0,0x9fc4ff); // contra azul
 panel(6,1.2,0,1.2,-9.9,0,0,1.6,0xbcd6ff);
 panel(4,2.4,1.5,2.2,9.9,Math.PI,0,1.3,0xfff0dc); // relleno frontal
 scene.environment=pm.fromScene(env,0.02).texture;pm.dispose();})();
// Fondo del escenario (en las exportaciones se quita para dejar transparencia)
const fondoTex=(function(){const c=document.createElement("canvas");c.width=c.height=512;const g=c.getContext("2d");const r=g.createRadialGradient(256,200,20,256,256,380);r.addColorStop(0,"#33508f");r.addColorStop(.45,"#1a2747");r.addColorStop(1,"#0b101c");g.fillStyle=r;g.fillRect(0,0,512,512);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t})();
scene.background=fondoTex;
scene.add(new THREE.HemisphereLight(0xc4d6ff,0x2a2018,0.4));
const key=new THREE.DirectionalLight(0xfff0dc,2.5);key.position.set(-3.5,6,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);
Object.assign(key.shadow.camera,{left:-1.8,right:1.8,top:3.2,bottom:-0.6,near:1,far:20});key.shadow.bias=-0.0002;key.shadow.normalBias=0.02;key.shadow.radius=3;scene.add(key);
const rim=new THREE.DirectionalLight(0x8fbaff,2.1);rim.position.set(4.5,4,-5);scene.add(rim);
const rim2=new THREE.DirectionalLight(0xffe2c4,0.9);rim2.position.set(-5,3,-4);scene.add(rim2);
const fill=new THREE.DirectionalLight(0xffd6a8,0.5);fill.position.set(4,1.5,4);scene.add(fill);
// Pedestal (solo en el escenario, nunca en las exportaciones)
const deco=new THREE.Group();scene.add(deco);
(function(){const base=new THREE.Mesh(new THREE.CylinderGeometry(1.25,1.35,0.22,64),new THREE.MeshPhysicalMaterial({color:0x1b2440,roughness:.35,clearcoat:.6}));base.position.y=-0.11;base.receiveShadow=true;deco.add(base);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1.29,0.025,12,96),new THREE.MeshBasicMaterial({color:0xffcf1f}));ring.rotation.x=Math.PI/2;ring.position.y=-0.02;deco.add(ring);
 const sh=new THREE.Mesh(new THREE.CircleGeometry(1.24,64),new THREE.ShadowMaterial({opacity:.45}));sh.rotation.x=-Math.PI/2;sh.position.y=0.002;sh.receiveShadow=true;deco.add(sh);
 for(let i=0;i<14;i++){const a=i/14*Math.PI*2;const s=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.05,20),base.material);s.position.set(Math.cos(a)*1.05,0.02,Math.sin(a)*1.05);deco.add(s)}})();

const camera=new THREE.PerspectiveCamera(30,1,0.5,30);camera.position.set(3.2,2.1,7.2);
const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.target.set(0,1.2,0);controls.enableDamping=true;controls.minDistance=3;controls.maxDistance=14;controls.maxPolarAngle=Math.PI*0.62;controls.update();
/* ---- Postproceso: oclusión ambiental (SSAO), brillo suave (bloom) y gamma ---- */
const POST={ok:false,activo:true};
function ajustarAO(pass,cam){pass.camera=cam;const sm=pass.ssaoMaterial,dm=pass.depthRenderMaterial,persp=cam.isPerspectiveCamera?1:0;
 [sm,dm].forEach(m=>{if(m.defines&&m.defines.PERSPECTIVE_CAMERA!==persp){m.defines.PERSPECTIVE_CAMERA=persp;m.needsUpdate=true}});
 sm.uniforms.cameraNear.value=cam.near;sm.uniforms.cameraFar.value=cam.far;dm.uniforms.cameraNear.value=cam.near;dm.uniforms.cameraFar.value=cam.far;
 sm.uniforms.cameraProjectionMatrix.value.copy(cam.projectionMatrix);sm.uniforms.cameraProjectionMatrixInverse&&sm.uniforms.cameraProjectionMatrixInverse.value.copy(cam.projectionMatrixInverse);
 sm.uniforms.cameraInverseProjectionMatrix&&sm.uniforms.cameraInverseProjectionMatrix.value.copy(cam.projectionMatrixInverse);
 const k=cam.far-cam.near;pass.kernelRadius=0.07;pass.minDistance=0.00004*30/k;pass.maxDistance=0.004*30/k}
try{if(THREE.EffectComposer&&THREE.SSAOPass&&THREE.UnrealBloomPass&&THREE.GammaCorrectionShader){
 POST.composer=new THREE.EffectComposer(renderer);POST.ssao=new THREE.SSAOPass(scene,camera,16,16);POST.ssao.kernelSize=32;POST.composer.addPass(POST.ssao);
 POST.bloom=new THREE.UnrealBloomPass(new THREE.Vector2(16,16),0.18,0.45,0.9);POST.composer.addPass(POST.bloom);
 POST.composer.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));
 if(THREE.FXAAShader){POST.fxaa=new THREE.ShaderPass(THREE.FXAAShader);POST.composer.addPass(POST.fxaa)}
 POST.aoComp=new THREE.EffectComposer(renderer);POST.aoPass=new THREE.SSAOPass(scene,camera,16,16);POST.aoPass.output=THREE.SSAOPass.OUTPUT.Blur;POST.aoComp.addPass(POST.aoPass);
 POST.ok=true}}catch(e){console.warn("Sin postproceso",e);POST.ok=false}
function resize(){const r=(renderer.domElement.parentElement||stage).getBoundingClientRect();if(r.width<2||r.height<2)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();
 if(POST.ok){const pr=renderer.getPixelRatio();POST.composer.setPixelRatio(pr);POST.composer.setSize(r.width,r.height);if(POST.fxaa)POST.fxaa.material.uniforms.resolution.value.set(1/(r.width*pr),1/(r.height*pr))}}
new ResizeObserver(resize).observe(stage);
