/* ============ Construcción de la minifigura ============ */
function build(c){
 const fig=new THREE.Group();fig.userData.j={};const J=fig.userData.j;
 const M={piel:plast(c.piel),torso:plast(c.torso),brazos:plast(c.brazos||c.torso),manos:plast(c.manos||c.piel),cadera:plast(c.cadera),piernas:plast(c.piernas),botas:plast(c.botas||c.piernas)};
 // Lado izquierdo de la figura (s>0, derecha de la imagen) con color propio solo si el modo avanzado lo pide
 M.brazosI=c.brazosIzq?plast(c.brazosIzq):M.brazos;M.manosI=c.manosIzq?plast(c.manosIzq):M.manos;M.piernasI=c.piernasIzq?plast(c.piernasIzq):M.piernas;
 const root=new THREE.Group();fig.add(root);J.root=root;
 // Piezas LDraw de este personaje (las estampadas sustituyen a las lisas); si alguna no está cargada se usa la lisa
 const DEF={cabeza:"3626c",torso:"973",brazoDer:"3818",brazoIzq:"3819",mano:"3820",cadera:"3815",piernaDer:"3816",piernaIzq:"3817",cortas:"41879a"};
 const L={};Object.keys(DEF).forEach(k=>{const v=c.ld&&c.ld[k];L[k]=v&&window.LDRAW_PIEZAS&&LDRAW_PIEZAS[v]?v:DEF[k]});
 const tipo=c.piernasTipo==="cortas"?"cortas":"normal";
 const base=new THREE.Group();base.position.y=(tipo==="cortas"?32+24:72)/LD;root.add(base); // origen LDraw del torso; la planta de los pies queda en y = 0
 // ---- Cadera y piernas
 const legsG=new THREE.Group();base.add(legsG);J.legsG=legsG;J.piernasArt=tipo==="normal";J.legL=new THREE.Group();J.legR=new THREE.Group();
 if(tipo==="cortas"){const h=grupoLD(legsG,ldM(...ENSAMBLE.cortas));const m=mk(geoLDcorte(L.cortas,16),[M.piernas,c.botas?M.botas:M.piernas],"piernas");m.userData.compartida=true;h.add(m)}
 else{const h=grupoLD(legsG,ldM(...ENSAMBLE.cadera));h.add(mallaLD(L.cadera,M.cadera,"piernas"));
  [[L.piernaDer,-1],[L.piernaIzq,1]].forEach(([id,s])=>{const p=grupoLD(legsG,ldM(...ENSAMBLE.piernas));const mp=s>0?M.piernasI:M.piernas;const m=mk(geoLDcorte(id,20),[mp,c.botas?M.botas:mp],"piernas");m.userData.compartida=true;m.userData.ld=id;p.add(m);if(s>0)J.legR=p;else J.legL=p});
  J.pivotY=(72-44)/LD}
 // ---- Torso 973 con estampado al frente
 const torso=grupoLD(base,ldM(0,0,0));J.torso=torso;torso.add(mallaLD(L.torso,M.torso,"torso"));
 if(c.estampado!=="liso"||c.imgTorso){const pr=drawTorso(c);torso.add(decalTorso(pr.cvs,pr.glow,1))}
 // ---- Brazos 3818/3819, manos 3820 en el puño, agarre para objetos
 [[L.brazoDer,"brazoDer",-1],[L.brazoIzq,"brazoIzq",1]].forEach(([id,k,s])=>{const E=ENSAMBLE[k];
  const mount=grupoLD(torso,ldM(E.p[0],E.p[1],E.p[2],rotZ(E.z)));const joint=new THREE.Group();mount.add(joint);joint.add(mallaLD(id,s>0?M.brazosI:M.brazos,"torso"));
  const hf=grupoLD(joint,ldM(s*ENSAMBLE.mano.p[0],ENSAMBLE.mano.p[1],ENSAMBLE.mano.p[2],ENSAMBLE.mano.r));
  const ax=new THREE.Group();ax.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,-1));hf.add(ax); // giro sobre el poste de la mano
  const wj=new THREE.Group();ax.add(wj);const inner=new THREE.Group();inner.quaternion.copy(ax.quaternion).invert();wj.add(inner);
  inner.add(mallaLD(L.mano,s>0?M.manosI:M.manos,"torso",{sub:"mano"}));const agarre=grupoLD(inner,ldM(...ENSAMBLE.agarre.p,ENSAMBLE.agarre.r));
  if(s>0){J.armR=joint;J.wristR=wj;J.handR=agarre;J.mountR=mount;J.handFR=hf}else{J.armL=joint;J.wristL=wj;J.handL=agarre;J.mountL=mount;J.handFL=hf}});
 // ---- Capa 522
 if(c.capa){const g=grupoLD(torso,ldM(...ENSAMBLE.capa));const m=mallaLD("522",plast(c.capa,{clearcoat:.15,roughness:.6,side:THREE.DoubleSide}),"capa");g.add(m);J.cape=g}
 // ---- Cabeza 3626c (gira sobre el cuello) con cara ajustada a su contorno
 const head=grupoLD(torso,ldM(...ENSAMBLE.cabeza));J.head=head;J.headY=head.position.y;head.add(mallaLD(L.cabeza,M.piel,"piel"));
 if(c.rostro!=="ninguno"){const f=mk(cascaraCara(0.06),decalMat(drawFace(c.rostro,c)),"rostro",false);f.userData.decal=true;head.add(f)}
 const fc=drawFacial(c.facial||[],c);if(fc){const f=mk(cascaraCara(0.12),decalMat(fc),"facial",false);f.userData.decal=true;head.add(f)}
 // ---- Pelo, casco o sombrero: pieza LDraw en el mismo origen que la cabeza
 const hairG=new THREE.Group();head.add(hairG);J.hairG=hairG;J.sy=1;
 if((c.cabello||"").startsWith("ld-")){const m=mallaLD(c.cabello.slice(3),plast(c.pelo,{roughness:.36,clearcoat:.5}),"cabello");if(m)hairG.add(m)}
 // ---- Objeto en la mano del lado derecho de la imagen (+x), montado en el centro del agarre.
 // El segundo objeto (accesorioIzq, modo avanzado) va en la otra mano (lado izquierdo de la imagen).
 ponerObjetoEnMano(c.accesorio,null,J.handR);
 if(c.accesorioIzq&&c.accesorioIzq!=="ninguno")ponerObjetoEnMano(c.accesorioIzq,c.accColorIzq,J.handL);
 return fig}
function ponerObjetoEnMano(clave,color,mano){const id=LD_ACC[clave]||((clave||"").startsWith("ld-")?clave.slice(3):null);if(!id||!mano)return;
 const m=mallaLD(id,plast(color||COLOR_ACC[clave]||"#a0a5a9"),"mano");if(!m)return;
 // Cómo se toma cada objeto: giro sobre la barra, volteado y deslizado a lo largo de la barra (LDU)
 const cfg=COMO_SE_TOMA[clave]||{};const g=new THREE.Group();g.rotation.order="YXZ";g.rotation.y=(cfg.giro||0)*Math.PI/180;if(cfg.voltear)g.rotation.x=Math.PI;
 const inner=new THREE.Group();inner.position.set(0,-(cfg.deslizar||0)/LD,-(cfg.z||0)/LD);g.add(inner);inner.add(m);
 if(clave==="escudo-capitan")inner.add(decalEscudo(dibujoEscudo()));mano.add(g)}
function dibujoEscudo(){const t=cvHD(512,512),q=t.getContext("2d");[["#c8102e",256],["#f4f4f4",205],["#c8102e",155],["#1d3f8f",105]].forEach(([col,r])=>{q.fillStyle=col;q.beginPath();q.arc(256,256,r,0,7);q.fill()});star(q,256,256,100,"#f4f4f4");return t}
const COMO_SE_TOMA={"escudo-redondo":{giro:90},"escudo-capitan":{giro:90},"escudo-triangular":{giro:90},"escudo-ovalado":{giro:90},mazo:{voltear:true},escoba:{deslizar:-60}};
function colorAcc(a){return COLOR_ACC[a]||"#a0a5a9"}
