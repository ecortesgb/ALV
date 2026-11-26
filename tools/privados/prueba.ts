// Prueba de la entrega privada en un navegador real (solo desarrollo; no entra al build).
// Necesita `npx vite` con VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY de un stack LOCAL con la 045 y una entrega.
// Entra con una cuenta, activa la fuente privada (service worker con alcance en la raíz del servidor de desarrollo),
// muestra las fotos del índice con <img> y baja cada GLB comprobando su huella. La galería del sistema nuevo se abre
// en otra pestaña con el enlace «Abrir galería» (esta página no importa ni incrusta la zona de personajes: candado de
// src/personajes/separacion.test.ts hasta la fase 5); esta pestaña debe quedar abierta, porque le da la sesión al
// service worker.
import { cliente } from "../../src/servicios/cliente";
import { fuentePrivada } from "../../src/servicios/personajesPrivados";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const estado = (t: string) => { $("estado").textContent = t; };
const correo = (nick: string) => `${nick.trim().toLowerCase()}@jugadores.alv.invalid`;

async function activar() {
  if (!cliente) { estado("Sin VITE_SUPABASE_URL: arranca vite con el stack local."); return; }
  const { data } = await cliente.auth.getSession();
  if (!data.session) { estado("Sin sesión."); $("fotos").replaceChildren(); return; }
  const fuente = await fuentePrivada({ cliente, base: location.origin + "/" });
  const controlado = !!navigator.serviceWorker?.controller;
  if (!fuente) { estado(`Sesión de ${data.session.user.email?.split("@")[0]}: SIN acceso a personajes privados (fuente = null). SW controla: ${controlado}`); return; }
  const r = await fetch(fuente + "indice.json");
  if (!r.ok) { estado(`Sesión de ${data.session.user.email?.split("@")[0]} · fuente ${fuente} · índice: ${r.status} (${r.headers.get("X-ALV-Motivo")})`); return; }
  const ind = (await r.json()) as { personajes: { id: string; ruta: string; ficha: { glb: string; fotos?: { tarjeta?: string } } }[]; huellas: Record<string, string> };
  const fotos = $("fotos"); fotos.replaceChildren();
  const glbs: string[] = [];
  for (const p of ind.personajes) {
    if (p.ficha.fotos?.tarjeta) { const img = new Image(120, 160); img.alt = p.id; img.src = fuente + p.ruta + p.ficha.fotos.tarjeta; fotos.append(img); }
    const g = await fetch(fuente + p.ruta + p.ficha.glb);
    const sha = g.ok ? [...new Uint8Array(await crypto.subtle.digest("SHA-256", await g.arrayBuffer()))].map(b => b.toString(16).padStart(2, "0")).join("") : "";
    glbs.push(`${p.id}: ${g.status}${g.ok ? (sha === ind.huellas[p.ruta + p.ficha.glb] ? " huella OK" : " HUELLA DISTINTA") : ""}`);
  }
  const enlace = $<HTMLAnchorElement>("abrir");
  enlace.href = "/tools/personajes/galeria.html?vista=galeria&yo=prueba-privados&fuente=" + encodeURIComponent(fuente);
  enlace.hidden = false;
  estado(`Sesión de ${data.session.user.email?.split("@")[0]} · fuente ${fuente} · índice: ${ind.personajes.length} personajes · SW controla: ${controlado}
GLB: ${glbs.join(" · ")}`);
}

$("entrar").addEventListener("click", async () => {
  if (!cliente) return;
  const { error } = await cliente.auth.signInWithPassword({ email: correo($<HTMLInputElement>("apodo").value), password: $<HTMLInputElement>("clave").value });
  $<HTMLInputElement>("clave").value = "";
  if (error) { estado("No se pudo entrar."); return; }
  location.reload(); // la fuente se prepara una vez por página
});
$("salir").addEventListener("click", async () => { await cliente?.auth.signOut(); location.reload(); });
(window as unknown as { __privados: unknown }).__privados = { activar };
void activar();
