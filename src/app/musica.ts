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
let enCarga = false;
let desbloqueado = false;
let actual: { src: string; el: HTMLAudioElement } | null = null;
const elementos = new Map<string, HTMLAudioElement>();
const fundidos = new Map<HTMLAudioElement, number>();

const volumenMeta = () => { const p = preferencias(); return p.musica ? (p.volumenMusica / 100) * TOPE : 0; };

function elemento(src: string) {
  let el = elementos.get(src);
  if (!el) { el = new Audio(BASE + src); el.loop = true; el.preload = "auto"; el.volume = 0; elementos.set(src, el); }
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
  const src = PISTAS[escena];
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

let instalada = false;
export function instalarMusica() {
  if (instalada || !hayMusica || typeof window === "undefined") return;
  instalada = true;
  escenaRuta = escenaDeRuta(location.hash);
  const desbloquear = () => {
    if (desbloqueado) return;
    desbloqueado = true;
    removeEventListener("pointerdown", desbloquear); removeEventListener("keydown", desbloquear);
    actualizar();
  };
  addEventListener("pointerdown", desbloquear); addEventListener("keydown", desbloquear);
  addEventListener("hashchange", () => { escenaRuta = escenaDeRuta(location.hash); actualizar(); });
  document.addEventListener("visibilitychange", actualizar);
  suscribirPreferencias(actualizar);
}
