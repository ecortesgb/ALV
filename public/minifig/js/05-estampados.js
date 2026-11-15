/* ============ Dibujos impresos (canvas) ============ */
function eye(x,y,sx,sy,g){g.fillStyle="#141414";g.beginPath();g.ellipse(x,y,sx,sy,0,0,7);g.fill();g.fillStyle="#fff";g.beginPath();g.arc(x-sx*.3,y-sy*.35,sx*.32,0,7);g.fill()}
function stroke(g,w,c,f){g.lineWidth=w;g.strokeStyle=c||"#141414";g.lineCap="round";g.lineJoin="round";g.beginPath();f();g.stroke()}
function drawFace(id,c){const W=512,H=256,cvs=cvHD(W,H),g=cvs.getContext("2d");const L=208,R=304,EY=104,MY=168;
 if(id==="ninguno")return cvs;
 if(id==="mascara-arana"){g.fillStyle=c.piel;g.fillRect(0,0,W,H);g.globalAlpha=.85;for(let i=-6;i<=6;i++)stroke(g,3,"#1a0a0a",()=>{g.moveTo(256,120);g.lineTo(256+i*70,i%2?-10:270)});for(let r=40;r<260;r+=42)stroke(g,3,"#1a0a0a",()=>{g.ellipse(256,120,r*1.15,r*.8,0,0,7)});g.globalAlpha=1;
  [[L-8,1],[R+8,-1]].forEach(([x,s])=>{g.fillStyle="#141414";g.beginPath();g.ellipse(x,108,40,30,s*.45,0,7);g.fill();g.fillStyle="#f8f8f8";g.beginPath();g.ellipse(x,108,33,23,s*.45,0,7);g.fill()});return cvs}
 if(id==="mascara-pantera"){g.fillStyle=c.piel;g.fillRect(0,0,W,H);stroke(g,4,"#b9bfca",()=>{g.moveTo(256,20);g.lineTo(256,90);g.moveTo(256,90);g.lineTo(150,60);g.moveTo(256,90);g.lineTo(362,60);g.moveTo(256,200);g.lineTo(200,240);g.moveTo(256,200);g.lineTo(312,240)});
  [[L,1],[R,-1]].forEach(([x,s])=>{g.fillStyle="#f2f2f2";g.beginPath();g.moveTo(x-34*s,98);g.lineTo(x+30*s,118);g.lineTo(x-26*s,124);g.closePath();g.fill()});return cvs}
 if(id==="mascara-capitan"){g.fillStyle="#f4f4f4";g.font="bold 64px Arial Black,Arial";g.textAlign="center";g.textBaseline="middle";g.fillText("A",256,34);
  g.fillStyle=PIEL;g.beginPath();g.moveTo(150,74);g.quadraticCurveTo(256,58,362,74);g.lineTo(372,256);g.lineTo(140,256);g.closePath();g.fill();
  eye(L,EY+6,13,18,g);eye(R,EY+6,13,18,g);stroke(g,7,"#141414",()=>{g.moveTo(L-22,EY-16);g.lineTo(L+22,EY-12);g.moveTo(R-22,EY-12);g.lineTo(R+22,EY-16)});stroke(g,7,"#141414",()=>{g.moveTo(222,MY);g.quadraticCurveTo(262,MY+12,292,MY-8)});return cvs}
 if(id==="mascara-ironman"){g.fillStyle="#e3b341";g.beginPath();g.moveTo(170,20);g.lineTo(342,20);g.lineTo(336,170);g.quadraticCurveTo(300,250,256,252);g.quadraticCurveTo(212,250,176,170);g.closePath();g.fill();
  stroke(g,5,"#9c7a22",()=>{g.moveTo(196,200);g.lineTo(316,200);g.moveTo(256,200);g.lineTo(256,250)});g.fillStyle="#e8f8ff";[[L,1],[R,-1]].forEach(([x,s])=>{g.beginPath();g.moveTo(x-34*s,96);g.lineTo(x+30*s,104);g.lineTo(x+26*s,118);g.lineTo(x-30*s,112);g.closePath();g.fill()});return cvs}
 const fem=id.endsWith("mujer");
 // cejas
 const brow={enojado:[[-1,.35]],determinado:[[-1,.22]],preocupado:[[1,.3]],sorpresa:[[0,0]]}[id];
 [L,R].forEach((x,i)=>{const s=i?-1:1;let ang=0;if(brow)ang=brow[0][1]*(brow[0][0]===-1?1:-1);const yb=id==="sorpresa"?62:72;
  stroke(g,fem?5:8,"#141414",()=>{g.moveTo(x-24,yb+ang*20*s*-1+ (brow&&brow[0][0]===-1? (s>0?-6:-6):0));g.lineTo(x+24,yb+ang*20*s*1)})});
 // ojos
 if(id==="guino"){eye(L,EY,13,18,g);stroke(g,7,"#141414",()=>{g.arc(R,EY+8,15,Math.PI*1.1,Math.PI*1.9)})}
 else if(id==="carcajada"){stroke(g,7,"#141414",()=>{g.arc(L,EY+8,15,Math.PI*1.1,Math.PI*1.9)});stroke(g,7,"#141414",()=>{g.arc(R,EY+8,15,Math.PI*1.1,Math.PI*1.9)})}
 else if(id==="sorpresa"){eye(L,EY,15,21,g);eye(R,EY,15,21,g)}
 else{eye(L,EY,13,18,g);eye(R,EY,13,18,g)}
 if(fem){[L,R].forEach((x,i)=>{const s=i?1:-1;stroke(g,4,"#141414",()=>{g.moveTo(x+s*12,EY-12);g.lineTo(x+s*22,EY-20);g.moveTo(x+s*14,EY-4);g.lineTo(x+s*24,EY-8)})})}
 // boca
 const lip=fem?"#b3263a":"#141414";
 if(id==="sonrisa"||id==="sonrisa-mujer")stroke(g,7,lip,()=>{g.arc(256,MY-28,40,Math.PI*.22,Math.PI*.78)});
 else if(id==="sonrisa-grande"||id==="carcajada"){g.fillStyle="#141414";g.beginPath();g.moveTo(206,MY-6);g.quadraticCurveTo(256,MY+56,306,MY-6);g.closePath();g.fill();g.fillStyle="#fff";g.beginPath();g.moveTo(214,MY-2);g.lineTo(298,MY-2);g.quadraticCurveTo(290,MY+12,256,MY+12);g.quadraticCurveTo(222,MY+12,214,MY-2);g.fill();if(id==="carcajada"){g.fillStyle="#c84a4a";g.beginPath();g.ellipse(256,MY+26,22,9,0,0,7);g.fill()}}
 else if(id==="serio")stroke(g,7,"#141414",()=>{g.moveTo(228,MY);g.lineTo(284,MY)});
 else if(id==="determinado"||id==="segura-mujer")stroke(g,7,lip,()=>{g.moveTo(222,MY-2);g.quadraticCurveTo(262,MY+10,292,MY-10)});
 else if(id==="enojado"){g.fillStyle="#141414";g.beginPath();g.ellipse(256,MY+6,40,20,0,0,7);g.fill();g.fillStyle="#fff";g.fillRect(222,MY-6,68,9);g.fillRect(226,MY+12,60,8)}
 else if(id==="sorpresa"){g.fillStyle="#141414";g.beginPath();g.ellipse(256,MY+4,16,22,0,0,7);g.fill()}
 else if(id==="guino")stroke(g,7,"#141414",()=>{g.moveTo(222,MY-8);g.quadraticCurveTo(256,MY+22,296,MY-14)});
 else if(id==="preocupado")stroke(g,7,"#141414",()=>{g.moveTo(226,MY+6);g.quadraticCurveTo(256,MY-14,286,MY+6)});
 return cvs}
function drawFacial(list,c){const W=512,H=256,cvs=cvHD(W,H),g=cvs.getContext("2d");const L=208,R=304,EY=104,MY=168;let any=false;
 list.forEach(f=>{any=true;
  if(f==="lentes-redondos"){stroke(g,6,"#222",()=>{g.arc(L,EY,30,0,7);g.moveTo(R+30,EY);g.arc(R,EY,30,0,7);g.moveTo(L+30,EY-4);g.quadraticCurveTo(256,EY-16,R-30,EY-4)})}
  if(f==="lentes-cuadrados"){stroke(g,6,"#222",()=>{g.rect(L-32,EY-22,64,44);g.rect(R-32,EY-22,64,44);g.moveTo(L+32,EY-6);g.lineTo(R-32,EY-6)})}
  if(f==="lentes-sol"){g.fillStyle="#111";[L,R].forEach(x=>{g.beginPath();g.ellipse(x,EY,34,24,0,0,7);g.fill()});stroke(g,6,"#111",()=>{g.moveTo(L+30,EY-8);g.lineTo(R-30,EY-8)});g.fillStyle="#ffffff55";[L,R].forEach(x=>{g.beginPath();g.ellipse(x-12,EY-8,8,5,-.5,0,7);g.fill()})}
  if(f==="rayo"){stroke(g,5,"#a3222a",()=>{g.moveTo(232,24);g.lineTo(220,44);g.lineTo(236,46);g.lineTo(222,68)})}
  if(f==="barba"){g.fillStyle=c.pelo;g.globalAlpha=.85;g.beginPath();g.moveTo(170,130);g.quadraticCurveTo(176,236,256,240);g.quadraticCurveTo(336,236,342,130);g.quadraticCurveTo(330,200,256,204);g.quadraticCurveTo(182,200,170,130);g.fill();g.globalAlpha=1}
  if(f==="candado"){g.fillStyle=c.pelo;g.beginPath();g.moveTo(222,150);g.quadraticCurveTo(256,140,290,150);g.lineTo(286,160);g.quadraticCurveTo(256,152,226,160);g.fill();g.beginPath();g.moveTo(236,188);g.lineTo(276,188);g.lineTo(266,238);g.lineTo(246,238);g.fill()}
  if(f==="bigote"){g.fillStyle=c.pelo;g.beginPath();g.moveTo(256,146);g.bezierCurveTo(226,128,200,150,196,170);g.bezierCurveTo(220,160,240,160,256,156);g.bezierCurveTo(272,160,292,160,316,170);g.bezierCurveTo(312,150,286,128,256,146);g.fill()}
  if(f==="pecas"){g.fillStyle="#b5652a";[[188,140],[200,152],[176,154],[312,140],[324,152],[336,154]].forEach(([x,y])=>{g.beginPath();g.arc(x,y,4,0,7);g.fill()})}
  if(f==="mejillas"){g.fillStyle="#ff6f8f55";[L-14,R+14].forEach(x=>{g.beginPath();g.ellipse(x,146,22,12,0,0,7);g.fill()})}
  if(f==="parche"){g.fillStyle="#111";g.beginPath();g.ellipse(R,EY,30,26,0,0,7);g.fill();stroke(g,5,"#111",()=>{g.moveTo(140,40);g.lineTo(R,EY);g.lineTo(380,150)})}
 });return any?cvs:null}
function star(g,x,y,r,col,n){n=n||5;g.fillStyle=col;g.beginPath();for(let i=0;i<n*2;i++){const a=-Math.PI/2+i*Math.PI/n,rr=i%2?r*.42:r;g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}g.closePath();g.fill()}
function poly(g,col,pts){g.fillStyle=col;g.beginPath();pts.forEach(p=>g.lineTo(p[0],p[1]));g.closePath();g.fill()}
function shade(hex,k){const c=new THREE.Color(hex);c.multiplyScalar(k);return "#"+c.getHexString()}
function drawTorso(c){const cvs=cvHD(512,512),g=cvs.getContext("2d");let gl=null;const glow=()=>{if(!gl){gl=cvHD(512,512)}return gl.getContext("2d")};const T=c.torso;
 switch(c.estampado){
 case"capitan":for(let i=0;i<10;i++){g.fillStyle=i%2?c.c2:c.c1;g.fillRect(20+i*48,290,48,150)}star(g,256,165,78,c.c2);g.fillStyle=c.c3;g.fillRect(0,440,512,40);g.fillStyle="#d9b25a";g.fillRect(236,442,40,36);break;
 case"ironman":poly(g,c.c1,[[176,280],[336,280],[300,480],[212,480]]);poly(g,c.c1,[[60,0],[170,0],[140,90],[80,110]]);poly(g,c.c1,[[452,0],[342,0],[372,90],[432,110]]);stroke(g,6,shade(T,.6),()=>{g.moveTo(256,230);g.lineTo(256,280);g.moveTo(176,330);g.lineTo(336,330);g.moveTo(186,390);g.lineTo(326,390)});
  g.fillStyle="#5a5f6a";g.beginPath();g.arc(256,165,54,0,7);g.fill();g.fillStyle="#cfefff";g.beginPath();g.arc(256,165,38,0,7);g.fill();{const q=glow();const rg=q.createRadialGradient(256,165,4,256,165,46);rg.addColorStop(0,"#ffffff");rg.addColorStop(.6,"#62d6ff");rg.addColorStop(1,"#0000");q.fillStyle=rg;q.beginPath();q.arc(256,165,46,0,7);q.fill()}break;
 case"thor":stroke(g,8,shade(T,.6),()=>{g.moveTo(256,0);g.lineTo(256,430)});[110,200,290].forEach(y=>[150,362].forEach(x=>{g.fillStyle=shade(c.c1,.6);g.beginPath();g.arc(x,y,30,0,7);g.fill();g.fillStyle=c.c1;g.beginPath();g.arc(x,y,23,0,7);g.fill()}));g.fillStyle=c.c2;g.fillRect(0,430,512,46);g.fillStyle="#c9a24a";g.fillRect(226,432,60,42);break;
 case"arana":poly(g,c.c1,[[0,512],[0,170],[120,230],[150,512]]);poly(g,c.c1,[[512,512],[512,170],[392,230],[362,512]]);g.globalAlpha=.8;for(let i=-5;i<=5;i++)stroke(g,3,"#1a0a0a",()=>{g.moveTo(256,170);g.lineTo(256+i*95,-40)});for(let r=60;r<300;r+=55)stroke(g,3,"#1a0a0a",()=>{g.arc(256,170,r,Math.PI,0)});g.globalAlpha=1;
  g.fillStyle=c.c2;g.beginPath();g.ellipse(256,150,13,18,0,0,7);g.fill();g.beginPath();g.ellipse(256,190,17,26,0,0,7);g.fill();for(let i=0;i<4;i++)[1,-1].forEach(s=>stroke(g,6,c.c2,()=>{g.moveTo(256,170);g.lineTo(256+s*(40+i*6),130+i*28);g.lineTo(256+s*(56+i*4),118+i*44)}));break;
 case"hulk":stroke(g,7,c.c1,()=>{g.moveTo(110,90);g.quadraticCurveTo(180,200,256,150);g.quadraticCurveTo(332,200,402,90);g.moveTo(256,150);g.lineTo(256,470);[250,320,390].forEach(y=>{g.moveTo(196,y);g.lineTo(316,y)})});poly(g,"#5b2d82",[[0,470],[512,470],[512,512],[0,512]]);stroke(g,5,"#3f1f5c",()=>{g.moveTo(60,470);g.lineTo(90,440);g.lineTo(120,470);g.moveTo(380,470);g.lineTo(410,445);g.lineTo(440,470)});break;
 case"viuda":stroke(g,6,c.c2,()=>{g.moveTo(256,30);g.lineTo(256,420);g.moveTo(160,0);g.lineTo(200,90);g.moveTo(352,0);g.lineTo(312,90)});g.fillStyle="#2b2b31";g.fillRect(0,420,512,48);g.fillStyle=c.c1;g.beginPath();g.moveTo(232,424);g.lineTo(280,424);g.lineTo(256,444);g.lineTo(280,464);g.lineTo(232,464);g.lineTo(256,444);g.closePath();g.fill();break;
 case"pantera":stroke(g,6,c.c1,()=>{g.moveTo(130,20);g.lineTo(256,130);g.lineTo(382,20)});for(let y=170;y<460;y+=58)for(let x=100;x<430;x+=78)poly(g,shade(c.c1,.55),[[x,y],[x+30,y],[x+15,y+26]]);{const q=glow();stroke(q,5,c.c2,()=>{q.moveTo(150,40);q.lineTo(256,140);q.lineTo(362,40)})}break;
 case"strange":poly(g,c.c1,[[90,0],[180,0],[360,400],[280,420]]);poly(g,c.c1,[[422,0],[332,0],[152,400],[232,420]]);g.fillStyle=c.c2;g.fillRect(0,400,512,60);g.fillStyle=shade(c.c2,.7);g.fillRect(100,400,26,60);g.fillRect(386,400,26,60);g.fillStyle=c.c3;g.beginPath();g.arc(256,110,32,0,7);g.fill();g.fillStyle="#1d6b3a";g.beginPath();g.ellipse(256,110,16,10,0,0,7);g.fill();{const q=glow();q.fillStyle="#3cff88";q.beginPath();q.ellipse(256,110,15,9,0,0,7);q.fill()}break;
 case"hogwarts":poly(g,"#f4f4f4",[[176,0],[336,0],[256,170]]);poly(g,c.c3,[[200,60],[312,60],[300,512],[212,512]]);poly(g,"#f4f4f4",[[176,0],[236,0],[256,60],[206,90]]);poly(g,"#f4f4f4",[[336,0],[276,0],[256,60],[306,90]]);
  g.save();g.beginPath();g.moveTo(240,50);g.lineTo(272,50);g.lineTo(284,300);g.lineTo(256,330);g.lineTo(228,300);g.closePath();g.clip();g.fillStyle=c.c1;g.fillRect(200,40,120,300);g.strokeStyle=c.c2;g.lineWidth=9;for(let y=40;y<360;y+=34){g.beginPath();g.moveTo(200,y);g.lineTo(320,y+30);g.stroke()}g.restore();
  g.fillStyle=c.c1;g.beginPath();g.moveTo(378,150);g.lineTo(418,150);g.lineTo(418,180);g.quadraticCurveTo(398,205,378,180);g.closePath();g.fill();g.fillStyle=c.c2;g.fillRect(386,158,24,6);break;
 case"letra":g.fillStyle=c.c1;g.font="bold 230px Georgia,serif";g.textAlign="center";g.textBaseline="middle";g.fillText((c.texto||"R").slice(0,2),256,270);stroke(g,10,shade(T,.75),()=>{g.moveTo(130,0);g.quadraticCurveTo(256,80,382,0)});break;
 case"dumbledore":stroke(g,14,c.c2,()=>{g.moveTo(196,0);g.lineTo(226,512);g.moveTo(316,0);g.lineTo(286,512)});[[100,120],[150,300],[380,160],[420,330],[320,420],[110,430],[256,250],[200,170],[330,260]].forEach(([x,y],i)=>star(g,x,y,i%2?20:28,c.c1));break;
 case"camisa-corbata":poly(g,shade(T,.85),[[176,0],[246,0],[256,50],[206,80]]);poly(g,shade(T,.85),[[336,0],[266,0],[256,50],[306,80]]);poly(g,c.c1,[[240,40],[272,40],[290,330],[256,370],[222,330]]);poly(g,shade(c.c1,.7),[[238,30],[274,30],[266,62],[246,62]]);g.fillStyle=shade(T,.7);[150,250,350,440].forEach(y=>{g.beginPath();g.arc(330,y,5,0,7);g.fill()});break;
 case"bata":poly(g,c.c1,[[196,0],[316,0],[256,200]]);stroke(g,6,"#b9bfca",()=>{g.moveTo(176,0);g.lineTo(256,220);g.lineTo(256,512);g.moveTo(336,0);g.lineTo(256,220)});g.strokeStyle="#b9bfca";g.lineWidth=5;g.strokeRect(120,250,80,80);g.fillStyle=c.c2;g.fillRect(140,226,9,60);g.fillStyle="#3a7bd5";g.fillRect(158,232,9,54);break;
 case"chef":stroke(g,6,"#c9ced6",()=>{g.moveTo(170,0);g.quadraticCurveTo(256,50,342,0);g.moveTo(170,30);g.lineTo(330,512)});g.fillStyle=c.c1;[140,230,320,410].forEach(y=>[220,320].forEach(x=>{g.beginPath();g.arc(x+(y-140)*.12,y,10,0,7);g.fill()}));break;
 case"policia":poly(g,c.c1,[[240,40],[272,40],[286,300],[256,330],[226,300]]);stroke(g,5,shade(T,.6),()=>{g.rect(110,150,90,80);g.rect(312,150,90,80)});star(g,356,130,30,c.c2,6);g.fillStyle="#111";g.fillRect(0,440,512,40);g.fillStyle="#c9ced6";g.fillRect(236,442,40,36);break;
 case"bombero":g.fillStyle=c.c1;g.fillRect(0,300,512,44);g.fillRect(120,0,44,300);g.fillRect(348,0,44,300);g.fillStyle=c.c2;g.fillRect(0,314,512,14);g.fillRect(134,0,14,300);g.fillRect(362,0,14,300);break;
 case"obrero":poly(g,c.c1,[[40,512],[60,0],[200,0],[226,512]]);poly(g,c.c1,[[472,512],[452,0],[312,0],[286,512]]);g.fillStyle=c.c2;g.fillRect(40,290,186,24);g.fillRect(286,290,186,24);g.fillRect(40,380,186,24);g.fillRect(286,380,186,24);break;
 case"pirata":poly(g,c.c1,[[40,512],[60,0],[190,0],[210,512]]);poly(g,c.c1,[[472,512],[452,0],[322,0],[302,512]]);poly(g,c.piel,[[220,0],[292,0],[256,120]]);g.fillStyle=c.c2;g.fillRect(0,390,512,54);g.beginPath();g.moveTo(330,440);g.lineTo(370,512);g.lineTo(320,512);g.fill();break;
 case"futbol":poly(g,c.c1,[[196,0],[316,0],[256,80]]);g.fillStyle=c.c1;g.fillRect(0,0,40,512);g.fillRect(472,0,40,512);g.fillStyle=c.c2;g.font="bold 170px Arial Black,Arial,sans-serif";g.textAlign="center";g.textBaseline="middle";g.fillText((c.texto||"10").slice(0,2),256,300);break;
 case"batman":g.fillStyle=c.c1;g.beginPath();g.ellipse(256,170,96,58,0,0,7);g.fill();g.fillStyle=c.c2;g.beginPath();g.moveTo(256,150);g.lineTo(242,132);g.lineTo(246,152);g.quadraticCurveTo(210,138,176,150);g.quadraticCurveTo(196,166,190,196);g.quadraticCurveTo(214,182,232,196);g.quadraticCurveTo(244,184,256,204);g.quadraticCurveTo(268,184,280,196);g.quadraticCurveTo(298,182,322,196);g.quadraticCurveTo(316,166,336,150);g.quadraticCurveTo(302,138,266,152);g.lineTo(270,132);g.closePath();g.fill();g.fillStyle=c.c3;g.fillRect(0,438,512,40);g.fillStyle=shade(c.c3,.7);for(let x=40;x<512;x+=70)g.fillRect(x,444,26,28);break;
 case"superman":g.fillStyle=c.c1;g.beginPath();g.moveTo(170,110);g.lineTo(342,110);g.lineTo(372,150);g.lineTo(256,290);g.lineTo(140,150);g.closePath();g.fill();g.fillStyle=c.c2;g.beginPath();g.moveTo(184,122);g.lineTo(328,122);g.lineTo(352,152);g.lineTo(256,268);g.lineTo(160,152);g.closePath();g.fill();g.fillStyle=c.c1;g.font="bold 120px Georgia,serif";g.textAlign="center";g.textBaseline="middle";g.fillText("S",256,180);g.fillStyle=c.c2;g.fillRect(0,440,512,34);break;
 case"mujer-maravilla":g.fillStyle=c.c1;g.beginPath();g.moveTo(110,60);g.quadraticCurveTo(256,170,402,60);g.lineTo(402,96);g.quadraticCurveTo(256,206,110,96);g.closePath();g.fill();g.font="bold 90px Arial Black,Arial";g.textAlign="center";g.textBaseline="middle";g.fillText("W",256,150);g.fillRect(0,430,512,40);g.fillStyle=shade(c.c1,.7);g.beginPath();g.arc(256,450,22,0,7);g.fill();break;
 case"sudadera":stroke(g,8,shade(T,.7),()=>{g.moveTo(130,330);g.lineTo(150,470);g.lineTo(362,470);g.lineTo(382,330);g.quadraticCurveTo(256,300,130,330)});stroke(g,6,c.c1,()=>{g.moveTo(226,20);g.lineTo(220,160);g.moveTo(286,20);g.lineTo(292,160)});break;
 }
 if(c.imgTorso&&imgCache[c.imgTorso]){const im=imgCache[c.imgTorso];const s=Math.min(360/im.width,360/im.height);g.drawImage(im,256-im.width*s/2,250-im.height*s/2,im.width*s,im.height*s)}
 return {cvs,glow:gl}}
const imgCache={};
