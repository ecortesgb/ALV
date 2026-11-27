// Música de fondo (pistas de Elías en public/audio/). Una pista por escena: pantalla de carga, HUB y menús, partidas.
// Encendido y volumen salen de las preferencias (Configuración → Mi experiencia). Los navegadores no dejan sonar nada
// hasta que la persona toca la pantalla: la música arranca con el primer toque o tecla.
import { preferencias, suscribirPreferencias } from "./preferencias";

export type EscenaMusica = "carga" | "hub" | "partida";
const BASE = import.meta.env.BASE_URL;
/** partida: null hasta que haya una pista propia o con permiso (la que llegó el 2026-11-22 tiene derechos de terceros). */
const PISTAS: Record<EscenaMusica, string | null> = {
  carga: "audio/musica-carga.mp3",
  hub: "audio/musica-hub.mp3",
  partida: null,
};
export const hayMusica = Object.values(PISTAS).some(Boolean);

/** El volumen 100 de la app es 60 % del volumen real: la música va de fondo, debajo de los efectos. */
const TOPE = 0.6, FUNDIDO_MS = 700;
let escenaRuta: EscenaMusica = "hub";
/** Canción del tema de tu personaje (temas.ts): suena en vez de la del HUB en las pantallas de RUTAS_TEMA. */
let pistaTema: string | null = null;
let enRutaTema = false;
let enCarga = false;
let desbloqueado = false;
let actual: { src: string; el: HTMLAudioElement } | null = null;
const elementos = new Map<string, HTMLAudioElement>();
const fundidos = new Map<HTMLAudioElement, number>();

const volumenMeta = () => { const p = preferencias(); return p.musica ? (p.volumenMusica / 100) * TOPE : 0; };

function elemento(src: string) {
  let el = elementos.get(src);
  if (!el) { el = new Audio(src.startsWith("blob:") ? src : BASE + src); el.loop = true; el.preload = "auto"; el.volume = 0; elementos.set(src, el); }
  return el;
}

function fundir(el: HTMLAudioElement, hasta: number, alTerminar?: () => void) {
  cancelAnimationFrame(fundidos.get(el) ?? 0);
  const desde = el.volume, t0 = performance.now();
  const paso = (t: number) => {
    const k = Math.min(1, (t - t0) / FUNDIDO_MS);
    el.volume = Math.max(0, Math.min(1, desde + (hasta - desde) * k));
    if (k < 1) fundidos.set(el, requestAnimationFrame(paso)); else { fundidos.delete(el); alTerminar?.(); }
  };
  fundidos.set(el, requestAnimationFrame(paso));
}

function actualizar() {
  const escena = enCarga ? "carga" : escenaRuta;
  const src = escena === "hub" && enRutaTema && pistaTema ? pistaTema : PISTAS[escena];
  const vol = volumenMeta();
  const debeSonar = desbloqueado && !!src && vol > 0 && document.visibilityState === "visible";
  if (actual && (!debeSonar || actual.src !== src)) {
    const viejo = actual.el; actual = null;
    fundir(viejo, 0, () => viejo.pause());
  }
  if (!debeSonar || !src) return;
  if (!actual) {
    const el = elemento(src);
    actual = { src, el };
    void el.play().catch(() => { /* el navegador todavía no deja sonar */ });
  }
  fundir(actual.el, vol);
}

/** La pantalla de carga avisa cuando está a la vista (tiene su propia pista). */
export function pantallaDeCarga(visible: boolean) { enCarga = visible; actualizar(); }

/** Escena según la ruta: partidas en el juego de un solo aparato y en la Pantalla; lo demás es HUB y menús. */
export function escenaDeRuta(hash: string): EscenaMusica {
  const r = hash.replace(/^#\/?/, "").split(/[/?]/)[0];
  return r === "juego" || r === "tv" ? "partida" : "hub";
}

/** Pantallas donde suena la canción de tu personaje: HUB, taller, colección y perfil. En el lobby no (cada celular
 *  sonaría distinto) ni en partida. */
const RUTAS_TEMA = new Set(["", "inicio", "hub", "personalizar", "editor", "coleccion", "figura", "perfil"]);
export function rutaConTema(hash: string): boolean {
  return RUTAS_TEMA.has(hash.replace(/^#\/?/, "").split(/[/?]/)[0] ?? "");
}

/** Pone (o quita con null) la canción del tema de tu personaje. */
export function ponerPistaTema(src: string | null) { if (pistaTema === src) return; pistaTema = src; actualizar(); }

/** Fragmento de la canción del ganador en la TV: suena `ms` y se apaga con fundido. Respeta música apagada y volumen. */
let fanfarria: HTMLAudioElement | null = null;
export function tocarFanfarria(src: string, ms = 8000) {
  const vol = volumenMeta();
  if (vol <= 0 || typeof Audio === "undefined") return;
  if (fanfarria) { fanfarria.pause(); fanfarria = null; }
  const el = new Audio(src); el.volume = 0; fanfarria = el;
  void el.play().then(() => {
    fundir(el, vol);
    setTimeout(() => fundir(el, 0, () => { el.pause(); if (fanfarria === el) fanfarria = null; }), Math.max(0, ms - FUNDIDO_MS));
  }).catch(() => { /* el navegador no deja sonar sin un toque */ });
}

/** Voz corta de un personaje (p. ej. al hacer «Especial»). Suena sobre la música y la baja mientras habla. Sigue el
 *  interruptor y el volumen de la música (es audio del personaje, como su canción). Devuelve false si no sonó. */
let voz: HTMLAudioElement | null = null;
export function tocarVoz(src: string): boolean {
  const p = preferencias();
  if (!p.musica || p.volumenMusica <= 0 || typeof Audio === "undefined") return false;
  if (voz) voz.pause();
  const el = new Audio(src); el.volume = Math.min(1, p.volumenMusica / 100); voz = el;
  const fondo = actual?.el;
  const volver = () => { if (voz === el) voz = null; if (fondo && actual?.el === fondo) fundir(fondo, volumenMeta()); };
  el.addEventListener("ended", volver, { once: true });
  void el.play().then(() => { if (fondo) fundir(fondo, volumenMeta() * 0.25); }).catch(volver);
  return true;
}

let instalada = false;
export function instalarMusica() {
  if (instalada || !hayMusica || typeof window === "undefined") return;
  instalada = true;
  escenaRuta = escenaDeRuta(location.hash);
  enRutaTema = rutaConTema(location.hash);
  // El primer toque abre el sonido. Los siguientes reintentan si una pista nueva (la del tema de tu personaje llega
  // después) quedó en pausa porque el navegador (iPhone sobre todo) solo deja sonar dentro de un toque.
  const desbloquear = () => {
    if (!desbloqueado) { desbloqueado = true; actualizar(); return; }
    if (actual?.el.paused && volumenMeta() > 0) void actual.el.play().catch(() => { /* sigue sin permiso */ });
  };
  addEventListener("pointerdown", desbloquear); addEventListener("keydown", desbloquear);
  addEventListener("hashchange", () => { escenaRuta = escenaDeRuta(location.hash); enRutaTema = rutaConTema(location.hash); actualizar(); });
  document.addEventListener("visibilitychange", actualizar);
  suscribirPreferencias(actualizar);
}
