// Precarga del HUB (Elías, 27 nov: «¿por qué tarda tanto en cargar el personaje?»).
// En cuanto hay sesión, mientras se ve la pantalla de inicio, se adelanta lo que la figura del HUB necesita y antes
// se pedía en fila al entrar: el catálogo de personajes (permiso, service worker e índice), los scripts del motor
// de personajes y los GLB de la figura activa. Nada de esto cambia cómo se cargan los modelos: los GLB se piden por
// el mismo service worker, que los guarda en la caché del aparato, y la escena los toma de ahí.
import { catalogoParaEscena, modoCorteV3, paraEscena } from "../personajes/integracion";
import { figuraActiva, leerCapsulas } from "./figura3d";

/** Scripts que la escena pide en fila para la figura nueva (tools/minifig/escena.js, motorV3). Con prefetch quedan
 *  en la caché del navegador y la escena ya no espera cada viaje. */
const SCRIPTS_MOTOR = [
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
  "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js",
  "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/meshopt_decoder.js",
  "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/SkeletonUtils.js",
];
const LOCALES = ["personajes/logicas.js", "personajes/motor-personajes.js", "personajes/efectos.js"];

let hecha = "";

/** Arranca la precarga una vez por cuenta y por página. No espera nada ni falla hacia afuera. */
export function precargarHub(uid: string): void {
  if (!uid || hecha === uid || typeof document === "undefined" || !modoCorteV3()) return;
  hecha = uid;
  const base = import.meta.env.BASE_URL;
  for (const href of [...SCRIPTS_MOTOR, ...LOCALES.map(r => base + r)]) {
    if (document.head.querySelector(`link[rel="prefetch"][href="${href}"]`)) continue;
    const l = document.createElement("link");
    l.rel = "prefetch"; l.as = "script"; l.href = href;
    document.head.appendChild(l);
  }
  void catalogoParaEscena().then(cat => {
    if (!cat) return;
    const figura = figuraActiva(leerCapsulas(uid));
    const plano = figura ? paraEscena({ id: "precarga", figura }, cat).plano3 : undefined;
    if (!plano) return;
    // Solo lo que la figura necesita para aparecer: cuerpo y piezas (poderes y sets se piden al usarlos).
    const glbs = new Set([plano.glb, ...plano.piezas.map(p => p.glb)].filter(Boolean));
    // Solo si la página ya está bajo el service worker (fuentePrivada lo confirma antes de dar catálogo).
    if (!navigator.serviceWorker?.controller) return;
    for (const u of glbs) void fetch(u).then(r => r.arrayBuffer()).catch(() => { /* la escena lo vuelve a pedir */ });
  }).catch(() => { /* sin catálogo: la escena usa el respaldo como siempre */ });
}
