// Quién está en línea y el chat (app/hubVivo.ts). La franja va abajo en el HUB; el chat se abre como panel.
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icono } from "../ds";
import { abrirChat, enviarChat, useFigurasDe, useHubVivo } from "../app/hubVivo";
import { useSesion } from "../app/sesion";
import { MAX_TEXTO, type EnLinea } from "../servicios/hubVivo";
import type { FiguraV2 } from "../content/personaje";
import { Retrato } from "./comun";
import "./vivo.css";

const MAX_CARAS = 5;
const hora = (t: number) => new Date(t).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });

/** Cara de quien está en línea: su figura si se puede leer; si no, su inicial. Siempre con punto verde. */
function Cara({ p, figura, size }: { p: EnLinea; figura: FiguraV2 | null; size: number }) {
  return (
    <span className="vv-cara" title={p.nombre}>
      {figura ? <Retrato id={p.id} figura={figura} nombre={p.nombre} size={size} /> : <span className="vv-inicial dsp" style={{ width: size, height: size }}>{p.nombre.slice(0, 1).toUpperCase()}</span>}
      <i className="vv-punto" aria-hidden="true" />
    </span>
  );
}

/** Franja «En línea»: caras, cuántos hay y el botón del chat con mensajes sin leer. */
export function FranjaEnLinea({ className = "" }: { className?: string }) {
  const v = useHubVivo();
  const figs = useFigurasDe(v.enLinea.map(p => p.id));
  const caras = v.enLinea.slice(0, MAX_CARAS), mas = v.enLinea.length - caras.length;
  return (
    <>
      <div className={"vv-franja " + className}>
        <button type="button" className="vv-gente" onClick={() => abrirChat(true)} aria-label={`${v.enLinea.length} en línea. Abrir el chat`}>
          <span className="vv-titulo dsp"><i className="vv-punto vv-punto-t" aria-hidden="true" />{v.enLinea.length} en línea</span>
          <span className="vv-caras">
            {caras.map(p => <Cara key={p.id} p={p} figura={figs.get(p.id) ?? null} size={40} />)}
            {mas > 0 && <span className="vv-mas dsp">+{mas}</span>}
          </span>
        </button>
        <button type="button" className="vv-chat-btn" onClick={() => abrirChat(true)} aria-label={v.sinLeer ? `Chat, ${v.sinLeer} sin leer` : "Chat"}>
          <Icono id="users" />
          <svg viewBox="0 0 24 24" aria-hidden="true" className="vv-burbuja"><path d="M4 5h16v11H9l-5 4z" /></svg>
          {v.sinLeer > 0 && <span className="vv-badge dsp">{v.sinLeer > 9 ? "9+" : v.sinLeer}</span>}
        </button>
      </div>
      {v.abierto && <PanelChat />}
    </>
  );
}

/** Panel del chat: mensajes de quienes están conectados ahora (no se guardan). */
export function PanelChat() {
  const v = useHubVivo();
  const s = useSesion();
  const figs = useFigurasDe(v.enLinea.map(p => p.id));
  const [texto, setTexto] = useState(""), [aviso, setAviso] = useState<string | null>(null);
  const lista = useRef<HTMLOListElement>(null), campo = useRef<HTMLInputElement>(null);
  useEffect(() => { lista.current?.scrollTo({ top: lista.current.scrollHeight }); }, [v.mensajes.length]);
  useEffect(() => { campo.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") abrirChat(false); };
    addEventListener("keydown", tecla); return () => removeEventListener("keydown", tecla);
  }, []);
  const mandar = (e?: FormEvent) => {
    e?.preventDefault();
    const r = enviarChat(texto);
    setAviso(r);
    if (!r) setTexto("");
  };
  return (
    <div className="vv-capa" role="presentation" onClick={e => { if (e.target === e.currentTarget) abrirChat(false); }}>
      <section className="vv-panel" role="dialog" aria-modal="true" aria-label="Chat de ALV">
        <header className="vv-cab">
          <span className="dsp">Chat</span>
          <small><i className="vv-punto vv-punto-t" aria-hidden="true" />{v.enLinea.length} en línea</small>
          <button type="button" className="vv-cerrar" onClick={() => abrirChat(false)} aria-label="Cerrar el chat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
        </header>
        <div className="vv-conectados">
          {v.enLinea.map(p => <span key={p.id} className="vv-conectado"><Cara p={p} figura={figs.get(p.id) ?? null} size={34} /><small>{p.id === s.uid ? "Tú" : p.nombre}</small></span>)}
        </div>
        <ol ref={lista} className="vv-mensajes" aria-live="polite">
          {v.mensajes.length === 0 && <li className="vv-vacio">Nadie ha escrito todavía. Los mensajes solo los ven quienes están conectados y no se guardan.</li>}
          {v.mensajes.map(m => (
            <li key={m.id} className={m.de === s.uid ? "yo" : ""}>
              <b>{m.de === s.uid ? "Tú" : m.nombre}</b><span>{m.texto}</span><time>{hora(m.t)}</time>
            </li>
          ))}
        </ol>
        <form className="vv-escribir" onSubmit={mandar}>
          <input ref={campo} value={texto} onChange={e => setTexto(e.target.value)} maxLength={MAX_TEXTO} placeholder="Escribe un mensaje…" aria-label="Mensaje" autoComplete="off" enterKeyHint="send" />
          <button type="submit" className="vv-enviar" aria-label="Enviar" disabled={!texto.trim()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 21 3l-6.5 18-3-7.5z" /></svg></button>
        </form>
        {aviso && <small className="vv-aviso" role="status">{aviso}</small>}
      </section>
    </div>
  );
}
