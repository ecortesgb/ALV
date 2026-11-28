// Pantalla de carga de ALV PARTY (Elías, 27 nov 2026): mini tutorial del minijuego antes de empezar, igual que la de
// los juegos de mesa (Elías, 28 nov: «el tutorial debe ser igual que los de los demás juegos»).
// Proyectar se decide en el lobby: si la sala tiene Pantalla, el juego se abre ahí y cada celular queda como mando.
// El anfitrión avisa por la difusión de la sala («party-<sala>»); la Pantalla y los celulares del lobby lo oyen,
// enseñan el tutorial y abren su parte. Lo que llega se valida (leerAvisoParty); nunca decide nada del juego.
import { useEffect, useState } from "react";
import { useSesion } from "../../app/sesion";
import { AMBIENTES_PARTY, CATEGORIAS_PARTY, MODALIDADES_PARTY, miniDe, urlsParty, leerAvisoParty, type AvisoParty } from "../../content/party";
import { PantallaCarga, type TarjetaCarga } from "../../juegos/general/ComoJugar";
import { personajeDeFigura } from "../../personajes/integracion";
import { abrirDifusion } from "../../servicios/difusion";
import "./party.css";

const BASE = () => new URL(import.meta.env.BASE_URL, location.href).href;

/** El anfitrión avisa a la sala que empieza un minijuego. */
export function avisarParty(salaId: string, aviso: AvisoParty) {
  const d = abrirDifusion(`party-${salaId}`);
  d.enviar("abrir", { ...aviso });
  setTimeout(() => d.cerrar(), 5000);
}

/** Oye los avisos de minijuego de la sala. */
export function useAvisoParty(salaId: string | undefined): [AvisoParty | null, () => void] {
  const [aviso, setAviso] = useState<AvisoParty | null>(null);
  useEffect(() => {
    if (!salaId) return;
    const d = abrirDifusion(`party-${salaId}`, (e, datos) => { if (e === "abrir") { const a = leerAvisoParty(datos); if (a) setAviso(a); } });
    return d.cerrar;
  }, [salaId]);
  return [aviso, () => setAviso(null)];
}

/** Tarjetas de la carga: de qué se trata, los 3 pasos (con los botones del mando) y el escenario. */
export function tarjetasParty(aviso: AvisoParty): TarjetaCarga[] {
  const m = miniDe(aviso.juego)!;
  const cat = CATEGORIAS_PARTY.find(c => c.id === m.categoria);
  const amb = AMBIENTES_PARTY.find(a => a.id === aviso.ambiente);
  const mod = aviso.modalidad ? MODALIDADES_PARTY.find(x => x.id === aviso.modalidad) : undefined;
  const botones = m.botones.map(b => ({ src: `${import.meta.env.BASE_URL}arte/ui/mando/x-${b}.webp`, nombre: b === "stick" ? "Stick" : b.toUpperCase() }));
  return [
    { grupo: "juego", titulo: m.nombre, texto: m.descripcion, imagen: m.portada, consejo: mod ? `${mod.nombre}: ${mod.texto}` : cat?.texto },
    ...m.tutorial.map((t, i): TarjetaCarga => ({ grupo: "juego", titulo: `Paso ${i + 1}`, texto: t, imagen: m.portada, ...(i === 0 || i === 1 ? { botones } : {}) })),
    ...(amb ? [{ grupo: "escenario" as const, titulo: amb.nombre, texto: amb.texto, imagen: amb.arte }] : []),
  ];
}

/**
 * La misma pantalla de carga de los juegos de mesa (PantallaCarga). En el celular, «¡Iniciar!» u «Omitir» abren el
 * mando (o la TV si este aparato muestra el juego); en la Pantalla se abre sola al pasar todas las tarjetas.
 */
export function CargaParty({ aviso, rol, nombre, figura, alCancelar }: { aviso: AvisoParty; rol: "tv" | "mando"; nombre?: string; figura?: unknown; alCancelar?: () => void }) {
  const m = miniDe(aviso.juego)!;
  const destino = urlsParty(aviso, aviso.sala, BASE(), nombre, personajeDeFigura(figura))[rol];
  const abrir = () => location.assign(destino);
  // En una TV del lobby nadie toca: se abre sola. Si este aparato muestra el juego y nadie toca, también.
  const solo = rol === "tv";
  const cancelar = alCancelar && <button type="button" className="pf-atras" onClick={alCancelar}><span aria-hidden="true">◀</span>Cambiar</button>;
  return (
    <div className="D pt-carga">
      <PantallaCarga nombre={m.nombre} color={m.color} tarjetas={tarjetasParty(aviso)} arte={m.portada} modo={rol === "mando" || alCancelar ? "celular" : "tv"}
        alCerrar={abrir} alVuelta={solo ? abrir : undefined} menu={cancelar}
        notaTv={`Entren con su celular a la sala ${aviso.sala}. El juego se abre al terminar.`} />
    </div>
  );
}

/** Para el lobby (celulares) y la Pantalla: si el anfitrión empieza un minijuego, enseña el tutorial y abre su parte. */
export function EscuchaParty({ salaId, rol, figura }: { salaId: string | undefined; rol: "tv" | "mando"; figura?: unknown }) {
  const ses = useSesion();
  const [aviso, quitar] = useAvisoParty(salaId);
  return aviso ? <CargaParty aviso={aviso} rol={rol} nombre={ses.nombre} figura={figura} alCancelar={quitar} /> : null;
}
