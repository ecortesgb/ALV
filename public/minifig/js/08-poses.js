/* ============ Poses y articulaciones reales ============ */
// Una minifigura real solo tiene 7 giros: cabeza (vertical), 2 brazos (eje del hombro), 2 manos (eje de la muñeca) y 2 piernas (eje de la cadera, cada una sola).
// Torso, cadera y cuello no se doblan. Las piernas se limitan a ±90°.
const ART=[["cabeza","Cabeza",-180,180],["brazoObj","Brazo izq. (con objeto)",-180,180],["brazoLib","Brazo der.",-180,180],["manoObj","Mano izq.",-180,180],["manoLib","Mano der.",-180,180],["piernaIzq","Pierna izq.",-90,90],["piernaDer","Pierna der.",-90,90]];
const manual={cabeza:0,brazoObj:0,brazoLib:0,manoObj:0,manoLib:0,piernaIzq:0,piernaDer:0};
const rad=g=>g*Math.PI/180,clampL=v=>Math.max(-Math.PI/2,Math.min(Math.PI/2,v));
function animar(fig,p,t){const J=fig.userData.j;if(!J)return;const R=J.root;R.position.set(0,0,0);R.rotation.set(0,0,0);
 const v={cabeza:0,brazoObj:0,brazoLib:0,manoObj:0,manoLib:0,piernaIzq:0,piernaDer:0};let glow=false;const sn=Math.sin;
 if(J.cape)J.cape.rotation.set(0.06+sn(t*1.6)*0.04,0,0);
 J.momento=null;J.fx=1;J.opac=null;
 // Momento del juego (nucleo/momentos.js): pose + intensidad del efecto. El tiempo cuenta desde MOM_T0.
 if(typeof p==="string"&&p.startsWith("mom:")&&window.Momentos){const r=Momentos.pose(p.slice(4),t-(window.MOM_T0||0));
  ["cabeza","brazoObj","brazoLib","manoObj","manoLib","piernaIzq","piernaDer"].forEach(k=>v[k]=r[k]);R.position.set(0,r.y,r.z);R.rotation.set(r.rotX,r.rotY,0);
  J.momento=p.slice(4);J.fx=r.fx;J.opac=r.opacidad==null?null:r.opacidad;if(J.cape)J.cape.rotation.x=0.06+Math.min(0.9,Math.abs(r.y)*0.8+Math.abs(r.rotX));p=null}
 switch(p){
 case"quieto":v.cabeza=sn(t*0.7)*0.35;v.brazoObj=sn(t*1.4)*0.05;v.brazoLib=-sn(t*1.4)*0.05;R.position.y=Math.abs(sn(t*1.4))*0.006;break;
 case"saludar":v.brazoLib=-2.7+sn(t*8)*0.22;v.manoLib=sn(t*8)*0.7;v.cabeza=-0.25;break;
 case"caminar":{const w=sn(t*6);v.piernaIzq=w*0.55;v.piernaDer=-w*0.55;v.brazoObj=-w*0.5;v.brazoLib=w*0.5;R.position.y=Math.abs(Math.cos(t*6))*0.05;if(J.cape)J.cape.rotation.x=0.25+Math.abs(w)*0.1}break;
 case"correr":{const w=sn(t*10);v.piernaIzq=w*0.95;v.piernaDer=-w*0.95;v.brazoObj=-w*1.2;v.brazoLib=w*1.2;R.position.y=Math.abs(Math.cos(t*10))*0.12;R.rotation.x=0.12;if(J.cape)J.cape.rotation.x=0.7+Math.abs(w)*0.2}break;
 case"festejar":{const j=Math.abs(sn(t*5));R.position.y=j*0.4;v.brazoObj=-2.95+sn(t*10)*0.15;v.brazoLib=-2.95-sn(t*10)*0.15;v.manoObj=sn(t*10)*0.5;v.manoLib=-sn(t*10)*0.5;v.piernaIzq=-j*0.3;v.piernaDer=-j*0.3;if(J.cape)J.cape.rotation.x=0.3+j*0.5}break;
 case"bailar":R.rotation.y=sn(t*3)*0.5;R.position.y=Math.abs(sn(t*6))*0.06;v.brazoObj=-1.5-sn(t*6)*1.2;v.brazoLib=-1.5+sn(t*6)*1.2;v.cabeza=sn(t*6)*0.45;v.piernaIzq=sn(t*6)*0.35;v.piernaDer=-sn(t*6)*0.35;break;
 case"golpe":{const k=Math.max(0,sn(t*5));v.brazoLib=-1.57*k;v.brazoObj=-0.6*(1-k);R.rotation.y=0.3*k;v.piernaIzq=0.3;v.piernaDer=-0.35}break;
 case"hechizo":v.brazoObj=-1.55+sn(t*3)*0.12;v.manoObj=sn(t*2)*0.35;v.cabeza=0.15;R.rotation.y=0.12;glow=true;break;
 case"sentado":v.piernaIzq=-Math.PI/2;v.piernaDer=-Math.PI/2;v.brazoObj=-0.35;v.brazoLib=-0.35;v.cabeza=sn(t*0.7)*0.3;if(J.pivotY)R.position.y=-(J.pivotY-8/LD);break;
 case"girar":R.rotation.y=t*1.6;break;
 case"manual":Object.keys(v).forEach(k=>v[k]=rad(manual[k]));glow=true;break;
 }
 // aplicar solo a los ejes reales
 J.head.rotation.set(0,v.cabeza,0);
 J.armR.rotation.set(v.brazoObj,0,0);J.armL.rotation.set(v.brazoLib,0,0);
 J.wristR.rotation.set(0,v.manoObj,0);J.wristL.rotation.set(0,v.manoLib,0);
 if(J.piernasArt){J.legR.rotation.set(clampL(v.piernaIzq),0,0);J.legL.rotation.set(clampL(v.piernaDer),0,0)}
 J.handR.traverse(o=>{if(o.userData.glow)o.visible=glow})}
