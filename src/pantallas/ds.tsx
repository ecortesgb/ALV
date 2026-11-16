// #/ds: página interna con los 13 componentes y sus estados, para compararlos con la página aprobada del Design System.
// No tiene enlace en la app. Se carga aparte (lazy): sus estilos no llegan a las pantallas de hoy.
import { useState, type ReactNode } from "react";
import {
  BarraAnfitrion, Boton, Cartel, Chip, Escaner, Etiqueta, FondoCiudad, Onomatopeya, Panel, Pestanas,
  RaizDS, Reloj, RuedaSospechosos, TarjetaJuego, TarjetaJugador,
} from "../ds";

/** Silueta de muestra (las maquetas van con siluetas; en la app va la figura 3D). */
function Silueta({ color = "#151a35", cara = false }: { color?: string; cara?: boolean }) {
  return (
    <svg viewBox={cara ? "33 8 54 54" : "0 0 120 200"} aria-hidden="true" style={{ display: "block" }}>
      <g fill={color} stroke="#0a1030" strokeWidth="3.4" strokeLinejoin="round">
        <rect x="40" y="130" width="19" height="52" rx="3" /><rect x="61" y="130" width="19" height="52" rx="3" />
        <rect x="24" y="68" width="15" height="44" rx="7" /><rect x="81" y="68" width="15" height="44" rx="7" />
        <path d="M40 66 L80 66 L88 122 L32 122 Z" /><rect x="52" y="56" width="16" height="12" />
        <rect x="37" y="20" width="46" height="42" rx="15" />
      </g>
    </svg>
  );
}

function Muestra({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12, padding: "20px 0", borderBottom: "1px solid rgba(95,180,255,.25)" }}>
      <h2 className="dsp ol" style={{ margin: 0, fontSize: 26 }}>{titulo}</h2>
      {nota && <p className="txt" style={{ margin: 0 }}>{nota}</p>}
      <div className="fila" style={{ alignItems: "flex-start", minWidth: 0 }}>{children}</div>
    </section>
  );
}

const PESTANAS = [
  { id: "todos", texto: "Todos" }, { id: "empezar", texto: "Para empezar" }, { id: "reir", texto: "Para reír" },
  { id: "secretos", texto: "Para soltar secretos" }, { id: "miente", texto: "¿Quién miente?" }, { id: "competir", texto: "A competir" },
  { id: "pareja", texto: "En pareja" },
];
const GENTE = ["Ana", "Beto", "Caro", "Dani", "Fer"];
const COLORES = ["#2ec4b6", "#ff9f1c", "#9b5de5", "#06d6a0", "#ef476f"];

export default function PaginaDS() {
  const [tab, setTab] = useState("miente");
  const [chips, setChips] = useState<string[]>(["picante"]);
  const [pausa, setPausa] = useState(false);
  const [toques, setToques] = useState(0);
  const [habla, setHabla] = useState(2);
  const chip = (id: string) => setChips(c => (c.includes(id) ? c.filter(x => x !== id) : [...c, id]));
  return (
    <RaizDS className="demo" style={{ position: "fixed", inset: 0, overflow: "auto", zIndex: 50 }}>
      <div style={{ maxWidth: 980, margin: "0 auto", paddingBottom: 60 }}>
        <div className="fila" style={{ justifyContent: "space-between" }}>
          <Etiqueta texto="Design System · ALV Cine Cómic Nocturno" grande />
          <a href="#/inicio" style={{ color: "var(--texto-suave)", fontWeight: 700 }}>Volver a la app</a>
        </div>
        <p className="txt">Página interna de la Fase 6. Los 13 componentes con sus estados, hechos con los tokens copiados de la fuente aprobada. Toques registrados: {toques}.</p>

        <Muestra titulo="1 · Botón" nota="Seis colores. Normal, encima, presionado, bloqueado y cargando. Jugar late.">
          <div className="col" style={{ width: "100%" }}>
            <Boton principal color="amarillo" icono="play" texto="Jugar" sub="Sala, TV o este celular" onClick={() => setToques(t => t + 1)} />
            <div className="fila">
              <Boton color="azul" icono="shirt" texto="Personalizar" onClick={() => setToques(t => t + 1)} />
              <Boton color="morado" icono="bag" texto="Tienda" aviso="NUEVO" />
              <Boton color="verde" icono="trophy" texto="Ranking" />
              <Boton color="naranja" icono="medal" texto="Logros" aviso="2" />
              <Boton color="rojo" icono="skip" texto="Saltar" />
            </div>
            <div className="fila">
              <span className="nota">Normal</span><Boton color="azul" icono="shirt" texto="Personalizar" />
              <span className="nota">Encima</span><Boton color="azul" icono="shirt" texto="Personalizar" muestra="encima" />
              <span className="nota">Presionado</span><Boton color="azul" icono="shirt" texto="Personalizar" muestra="presionado" />
              <span className="nota">Bloqueado</span><Boton color="azul" icono="shirt" texto="Personalizar" desactivado />
              <span className="nota">Cargando</span><Boton color="azul" icono="gear" texto="Guardando" cargando />
            </div>
          </div>
        </Muestra>

        <Muestra titulo="2 · Etiqueta" nota="Etiqueta amarilla de sección y cartel rojo del juego (solo en la TV).">
          <Etiqueta texto="Jugar" icono="play" grande /><Etiqueta texto="Ronda 2 de 5" /><Etiqueta texto="Anfitrión" icono="star" />
          <Cartel titulo="El impostor" sub="FBI · Farsantes Bajo Investigación" />
        </Muestra>

        <Muestra titulo="3 · Pestañas" nota="La elegida en amarillo. Tócalas.">
          <div style={{ width: "100%", minWidth: 0 }}><Pestanas nombre="Filtro del catálogo" pestanas={PESTANAS} activa={tab} onCambio={setTab} /></div>
        </Muestra>

        <Muestra titulo="4 · Chip" nota="Datos de contexto. Los de abajo son filtros: tócalos para elegirlos.">
          <Chip icono="users" texto="6 jugadores" /><Chip icono="star" texto="Fogata · FBI" /><Chip icono="clock" texto="15 min" />
          {[["tranquilo", "Tranquilo"], ["picante", "Picante"], ["sinfiltro", "Sin filtro"]].map(([id, t]) => (
            <Chip key={id} icono="bolt" texto={t!} seleccionado={chips.includes(id!)} onClick={() => chip(id!)} />
          ))}
        </Muestra>

        <Muestra titulo="5 · Panel" nota="Superficie base de toda caja.">
          <Panel style={{ padding: "1em 1.2em", maxWidth: "22em" }}>
            <span className="dsp ol" style={{ fontSize: "1.5em" }}>Habla Caro · luego tú</span>
            <p className="txt">Panel azul con borde de tinta, borde interior claro y sombra dura.</p>
          </Panel>
        </Muestra>

        <Muestra titulo="6 · Tarjeta del jugador" nota="Celular sin XP para gastar; laptop y TV con ella. Números con siglas.">
          <div style={{ width: "100%", maxWidth: 375 }}>
            <TarjetaJugador retrato={<Silueta cara color="#e9b98c" />} apodo="Elías" nivel={12} xp={{ actual: 2340, siguiente: 3000 }} onPerfil={() => setToques(t => t + 1)} onAjustes={() => setToques(t => t + 1)} />
          </div>
          <RaizDS ancho style={{ width: "100%" }}>
            <TarjetaJugador retrato={<Silueta cara color="#e9b98c" />} apodo="Elías" nivel={12} titulo="Leyenda de la fogata" xp={{ actual: 2340, siguiente: 3000 }} xpParaGastar={1280}
              numeros={{ PJ: 48, PG: 17, RC: 31, MVP: 6, IMP: 9, RAC: 4 }} onAjustes={() => setToques(t => t + 1)} />
          </RaizDS>
        </Muestra>

        <Muestra titulo="7 · Tarjeta de juego" nota="Normal, enfocada, nueva y bloqueada (se puede tocar para leer por qué).">
          <div className="d-strip" style={{ overflow: "visible", flexWrap: "wrap" }}>
            <TarjetaJuego nombre="Lista relámpago" sigla="LOL" jugadores="2–12" duracion="10 min" color="var(--fila-empezar)" indice={0} />
            <TarjetaJuego nombre="El impostor" sigla="FBI" jugadores="3–10" duracion="15 min" color="var(--fila-miente)" enfocada indice={1} />
            <TarjetaJuego nombre="Dibuja y adivina" sigla="WTF" jugadores="3–10" duracion="15 min" color="var(--fila-reir)" nueva indice={2} />
            <TarjetaJuego nombre="Dados HOT" sigla="FAP" jugadores="Solo tu pareja" duracion="10 min" color="var(--fila-pareja)" bloqueada="Solo con adulto" indice={3} />
          </div>
        </Muestra>

        <Muestra titulo="8 · Barra del anfitrión" nota="Solo en el celular de quien tiene el control. Pausar cambia a Seguir.">
          <div style={{ width: "min(100%, 360px)" }}>
            <BarraAnfitrion pausada={pausa} onPausar={() => setPausa(p => !p)} momento={{ texto: "Revelar ya", icono: "eye", onClick: () => setToques(t => t + 1) }} />
          </div>
        </Muestra>

        <Muestra titulo="9 · Reloj" nota="Amarillo mientras hay tiempo, rojo en los últimos 10 segundos, tenue en pausa.">
          <Reloj segundos={42} total={45} /><Reloj segundos={8} total={45} /><Reloj segundos={30} total={45} pausado />
        </Muestra>

        <Muestra titulo="10 · Escáner" nota="Mantén el dedo (o la barra espaciadora) sobre el de la izquierda. El de la derecha está fijo encendido.">
          <div style={{ width: "15em" }}><Escaner secreto="Pozole" detalle="Comida mexicana" /></div>
          <div style={{ width: "15em" }}><Escaner secreto="Pozole" detalle="Comida mexicana" muestra /></div>
        </Muestra>

        <Muestra titulo="11 · Onomatopeya" nota="Una por pantalla.">
          <Onomatopeya texto="¡ALV!" /><Onomatopeya texto="¡SHHH!" color="var(--rosa-sfx)" giro={-6} /><Onomatopeya texto="¿QUIÉN FUE?" giro={-5} />
        </Muestra>

        <Muestra titulo="12 · Fondo de ciudad" nota="Ciudad gótica de noche; siempre la misma.">
          <div className="d-fondo" style={{ width: "100%" }}><FondoCiudad /></div>
        </Muestra>

        <Muestra titulo="13 · Rueda de sospechosos" nota="TV de El impostor. Toca el botón para pasar el turno de quien habla.">
          <div style={{ width: "100%", display: "grid", gap: 10 }}>
            <RuedaSospechosos habla={`p${habla}`} personas={GENTE.map((n, i) => ({
              id: `p${i}`, nombre: n, figura: <Silueta color={COLORES[i]} />, evidencia: i < habla ? ["Maíz", "Caldo", "Rojo", "Fiesta"][i] : undefined,
            }))} />
            <div><Boton color="morado" icono="chev" texto="Siguiente en hablar" onClick={() => setHabla(h => (h + 1) % GENTE.length)} /></div>
          </div>
        </Muestra>
      </div>
    </RaizDS>
  );
}
