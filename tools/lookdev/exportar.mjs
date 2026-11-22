// Exporta la figura de prueba y la Plataforma ALV (modo azotea) a GLB con Chromium sin ventana.
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const [url, out] = process.argv.slice(2);
// Ruta del Chromium sin ventana: variable CHROME (por ejemplo el de Playwright).
const chrome = process.env.CHROME || "chrome";
const p = spawn(chrome, ["--headless=new", "--remote-debugging-port=9334", `--user-data-dir=${mkdtempSync(join(tmpdir(), "glb-"))}`, "--window-size=900,1100", "--use-angle=swiftshader", "about:blank"], { stdio: "ignore" });
const dormir = ms => new Promise(r => setTimeout(r, ms));
let lista; for (let i = 0; i < 40; i++) { try { lista = await (await fetch("http://127.0.0.1:9334/json")).json(); if (lista.length) break; } catch {} await dormir(250); }
const ws = new WebSocket(lista.find(t => t.type === "page").webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let n = 0; const pend = new Map(); ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const cdp = (method, params = {}) => new Promise(r => { const id = ++n; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
await cdp("Page.enable"); await cdp("Page.navigate", { url }); await dormir(9000);
const js = `(async () => {
  postMessage({ origen: "alv", tipo: "figuras", lista: [{ id: "prueba", semilla: 1 }] }, location.origin);
  await new Promise(r => setTimeout(r, 2500));
  await new Promise((ok, mal) => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js"; s.onload = ok; s.onerror = mal; document.head.appendChild(s); });
  const scene = window.__cine.scene, raiz = new THREE.Group();
  const util = o => o.isMesh && !o.userData.sinSombra && !(o.material && (o.material.isShadowMaterial || o.material.blending === THREE.AdditiveBlending)) && !o.userData.cascara;
  scene.updateMatrixWorld(true);
  scene.traverse(o => {
    if (!o.isMesh || !util(o) || !o.visible) return;
    let v = o.parent, ok = true; while (v) { if (v.visible === false) ok = false; v = v.parent; } if (!ok) return;
    const geo = o.geometry; if (!geo.attributes.position) return;
    if (o.isInstancedMesh) { const m = new THREE.Matrix4(); for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); const c = new THREE.Mesh(geo, o.material.clone()); const col = new THREE.Color(); if (o.instanceColor) { o.getColorAt(i, col); c.material.color.copy(col); } c.applyMatrix4(new THREE.Matrix4().multiplyMatrices(o.matrixWorld, m)); c.name = "stud"; raiz.add(c); } return; }
    const c = new THREE.Mesh(geo, o.material); c.name = o.name || (o.material && o.material.name) || "pieza"; o.matrixWorld.decompose(c.position, c.quaternion, c.scale); raiz.add(c);
  });
  const glb = await new Promise(r => new THREE.GLTFExporter().parse(raiz, r, { binary: true, onlyVisible: true, maxTextureSize: 1024 }));
  let s = ""; const u = new Uint8Array(glb); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return { piezas: raiz.children.length, b64: btoa(s) };
})()`;
const r = await cdp("Runtime.evaluate", { expression: js, awaitPromise: true, returnByValue: true });
const v = r.result?.result?.value;
if (!v) { console.log(JSON.stringify(r).slice(0, 800)); } else { writeFileSync(out, Buffer.from(v.b64, "base64")); console.log("piezas", v.piezas, "bytes", Buffer.from(v.b64, "base64").length); }
ws.close(); p.kill();
