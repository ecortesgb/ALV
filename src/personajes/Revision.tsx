// Modo revisión (galeria.html?revisar=1, solo desarrollo): Elías revisa los personajes del catálogo uno por uno y los
// aprueba o rechaza. Diseño decidido por Codex (encargo 2026-11-26-modo-revision-r1): diseño A (computadora: 3D a la
// izquierda y panel a la derecha; celular: 3D arriba y barra de decisión abajo), animaciones explícitas con Propia /
// Respaldo / No disponible, «Cara de cerca» con expresiones por separado, firma SHA256 del GLB y de las animaciones,
// avance al decidir con interruptor, rechazo con nota, decisiones reversibles, filtros, exportar e importar.
// No toca el catálogo ni las fichas: solo registra la decisión en este navegador y en el archivo exportado.
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { deCatalogo } from "./figura";
import { nombreSaga, tarjetas } from "./galeriaDatos";
import { resolver, resolverClips, type Catalogo } from "./plano";
import {
  NOTA_MAX, combinar, conBorrador, contar, decidir, elegirEnFiltro, estadoDe, exportar, filtrarRev, guardarRevision, leerExportado,
  leerRevision, porVerificar, quitar, restaurar, sha256, siguientePendiente, textoAnimaciones, usarDelArchivo,
  type Decision, type EstadoRev, type Firma, type FiltroRev, type Revisado, type Revision as Rev,
} from "./revisionDatos";
import type { Id, Logica } from "./tipos";
import { Vista3D } from "./Vista3D";
import "./revision-personajes.css";

const NOMBRE_LOGICA: Record<Logica, string> = { reposo: "Reposo", entrada: "Entrada", saludo: "Saludo", victoria: "Victoria", derrota: "Derrota", especial: "Especial" };
const ORDEN_LOGICAS: Logica[] = ["reposo", "saludo", "victoria", "derrota", "especial", "entrada"];
const TXT_ESTADO: Record<EstadoRev, string> = { "sin-revisar": "Sin revisar", "revisar-de-nuevo": "Revisar de nuevo", aprobado: "Aprobado", rechazado: "Rechazado" };
const escribiendo = (e: KeyboardEvent) => { const t = e.target as HTMLElement | null; return !!t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.isContentEditable); };

export function Revision({ catalogo, escenaUrl }: { catalogo: Catalogo; escenaUrl: string }) {
  const lista = useMemo(() => tarjetas(catalogo), [catalogo]);
  const ids = useMemo(() => lista.map(t => t.id), [lista]);
  const nombres = useMemo(() => new Map(lista.map(t => [t.id, t.nombre])), [lista]);
  const [rev, setRev] = useState<Rev>(() => leerRevision());
  const [guardaOk, setGuardaOk] = useState(true);
  const [firmas, setFirmas] = useState<Map<Id, Firma>>(new Map());
  const filtrados = useMemo(() => filtrarRev(ids, rev.filtro, rev, firmas), [ids, rev, firmas]);
  const [id, setId] = useState<Id | null>(() => {
    const r = leerRevision();
    return r.ultimo && ids.includes(r.ultimo) ? r.ultimo : siguientePendiente(ids, null, r, new Map()) ?? ids[0] ?? null;
  });
  const en = id ? catalogo.get(id) : null;
  const ficha = en?.ficha ?? null;
  const reg = id ? rev.personajes[id] : undefined;
  const firma = id ? firmas.get(id) ?? null : null;
  const estado = estadoDe(reg, firma);
  const conteo = contar(ids, rev, firmas);

  // Guardar cada cambio (y avisar si el navegador no deja).
  const cambiarRev = (r: Rev) => { setRev(r); setGuardaOk(guardarRevision(r)); };
  const revRef = useRef(rev);
  revRef.current = rev;

  // Firmas de TODOS los ya revisados, una por una en segundo plano: hasta comprobarlas, conteos, filtros y exportación
  // son provisionales (un GLB que cambió tiene que salir en «Revisar de nuevo»; Codex, modo-revision-verif).
  const fallidas = useRef(new Set<Id>());
  const [, setVueltaFirmas] = useState(0);
  const porComprobar = porVerificar(rev, firmas, ids);
  const faltan = porComprobar.filter(x => !fallidas.current.has(x));
  const fallaron = porComprobar.filter(x => fallidas.current.has(x));
  const reintentarFirmas = () => { fallidas.current.clear(); setVueltaFirmas(n => n + 1); };
  const firmaDe = async (x: Id): Promise<Firma> => {
    const e = catalogo.get(x)!;
    const r = await fetch(new URL(e.ficha.glb, e.base).href);
    if (!r.ok) throw new Error("HTTP " + r.status);
    return { glb: await sha256(await r.arrayBuffer()), anim: await sha256(textoAnimaciones(e.ficha)) };
  };
  const siguienteAVerificar = faltan.find(x => x !== id) ?? null;
  useEffect(() => {
    if (!siguienteAVerificar) return;
    let vivo = true;
    firmaDe(siguienteAVerificar).then(f => { if (vivo) setFirmas(m => new Map(m).set(siguienteAVerificar, f)); },
      () => { fallidas.current.add(siguienteAVerificar); if (vivo) setFirmas(m => new Map(m)); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siguienteAVerificar]);
  // Mientras quede alguna sin comprobar (o que falló), todo es provisional y no se exporta (Codex, verif2).
  const provisional = porComprobar.length > 0;
  useEffect(() => { if (id && rev.ultimo !== id) cambiarRev({ ...rev, ultimo: id }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  // Firma del personaje que se ve: SHA256 del GLB (ya descargado para verlo) y de sus animaciones declaradas.
  const [errFirma, setErrFirma] = useState<string | null>(null);
  const [reintento, setReintento] = useState(0);
  useEffect(() => {
    if (!id || !en || firmas.has(id)) return;
    let vivo = true;
    setErrFirma(null);
    (async () => {
      const f = await firmaDe(id);
      if (vivo) setFirmas(m => new Map(m).set(id, f));
    })().catch(e => { if (vivo) setErrFirma("No se pudo leer el archivo del personaje (" + String(e.message ?? e) + ")."); });
    return () => { vivo = false; };
  }, [id, en, firmas, reintento]);

  // Visor: plano, armado y animaciones.
  const plano = useMemo(() => (en ? resolver("rev", deCatalogo(en.ficha), catalogo) : null), [en, catalogo]);
  const [armadoDe, setArmadoDe] = useState<Id | null>(null);
  // Al cambiar de personaje la escena también se restablece (sin cara de cerca ni expresión fija).
  useEffect(() => { setArmadoDe(null); setSonando("reposo"); setCara(false); setExpr(null); setNExpr(0); mandar({ tipo: "restablecer" }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);
  const listoParaDecidir = !!id && armadoDe === id && !!firma;
  const [momento, setMomento] = useState<{ cual: string; n: number } | null>(null);
  const [sonando, setSonando] = useState<string>("reposo");
  const tocar = (cual: string) => { setSonando(cual); setMomento(m => ({ cual, n: (m?.n ?? 0) + 1 })); };
  const resueltos = useMemo(() => (ficha ? resolverClips(ficha) : {}), [ficha]);
  const [verVida, setVerVida] = useState(false);
  const [orden, setOrden] = useState<{ n: number; msg: Record<string, unknown> } | null>(null);
  const mandar = (msg: Record<string, unknown>) => setOrden(o => ({ n: (o?.n ?? 0) + 1, msg }));
  const [giro, setGiro] = useState<{ n: number; cuanto: number } | null>(null);
  const girar = (cuanto: number) => setGiro(g => ({ n: (g?.n ?? 0) + 1, cuanto }));
  const [cara, setCara] = useState(false);
  const [nExpr, setNExpr] = useState(0);
  const [expr, setExpr] = useState<number | null>(null);
  const alternarCara = () => {
    const a = !cara;
    setCara(a); setExpr(null); setSonando("reposo");
    mandar({ tipo: "enfocar", zona: a ? "cabeza" : "cuerpo" }); // «cuerpo» también suelta la expresión fija en la escena
    if (a) setTimeout(() => mandar({ tipo: "cara", n: null }), 50);
  };
  const ponerExpr = (n: number | null) => { setExpr(n); mandar({ tipo: "cara", n }); };
  const restablecer = () => { setCara(false); setExpr(null); setSonando("reposo"); mandar({ tipo: "restablecer" }); tocar("reposo"); };
  const alMensaje = useCallback((d: Record<string, unknown>) => { if (d.tipo === "caras" && typeof d.n === "number") setNExpr(d.n); }, []);

  // Navegación.
  const pos = id ? ids.indexOf(id) : -1;
  const idx = id ? filtrados.indexOf(id) : -1;
  const ir = (nuevo: Id | null) => { if (nuevo) { setId(nuevo); setNotaAbierta(false); } };
  // Se navega dentro del filtro; con el filtro vacío no hay a dónde ir (Codex, modo-revision-verif).
  const anterior = () => { const l = filtrados; if (l.length) ir(l[(Math.max(0, idx) - 1 + l.length) % l.length] ?? null); };
  const siguiente = () => { const l = filtrados; if (l.length) ir(l[(idx + 1) % l.length] ?? null); };
  // Si el personaje visible sale de la lista filtrada (cambió el filtro, una firma lo pasó a «Revisar de nuevo», se
  // decidió con «Avanzar» apagado…), pasa al que le seguía en la lista, o a ninguno si quedó vacía (Codex, verif2).
  const antesFiltrados = useRef<Id[]>(filtrados);
  useEffect(() => {
    const previa = antesFiltrados.current;
    antesFiltrados.current = filtrados;
    if (id && filtrados.includes(id)) return;
    const i = id ? previa.indexOf(id) : -1;
    const despues = i >= 0 ? previa.slice(i + 1).find(x => filtrados.includes(x)) : undefined;
    const sel = despues ?? elegirEnFiltro(filtrados, null);
    if (sel !== id) setId(sel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrados]);

  // Decisión, nota y deshacer.
  const [notaAbierta, setNotaAbierta] = useState(false);
  const [pideNota, setPideNota] = useState(false);
  const notaRef = useRef<HTMLTextAreaElement>(null);
  const nota = reg?.borrador ?? reg?.actual?.nota ?? "";
  const [aviso, setAviso] = useState<{ texto: string; deshacer?: () => void } | null>(null);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 5000); return () => clearTimeout(t); }, [aviso]);
  const registrar = (d: Decision, texto: string) => {
    if (!id || !firma || !listoParaDecidir) return;
    const previo = rev.personajes[id], quien = id, nombre = nombres.get(quien) ?? quien;
    const r = decidir(rev, quien, d, texto, firma);
    cambiarRev(r);
    setNotaAbierta(false); setPideNota(false);
    // Deshacer revierte SOLO esta decisión; lo que se hizo después en otros personajes se queda.
    const volver = () => { cambiarRev(restaurar(revRef.current, quien, previo)); setId(quien); setAviso(null); };
    setAviso({ texto: `${d === "aprobado" ? "✓ Aprobado" : "✕ Rechazado"}: ${nombre}`, deshacer: volver });
    if (r.avanzar) { const sig = siguientePendiente(ids, quien, r, firmas); if (sig) setId(sig); else setAviso({ texto: "No quedan pendientes", deshacer: volver }); }
  };
  const aprobar = () => registrar("aprobado", nota);
  const rechazar = () => {
    if (!nota.trim()) { setNotaAbierta(true); setPideNota(true); setTimeout(() => notaRef.current?.focus(), 0); return; }
    registrar("rechazado", nota);
  };
  const editarNota = (ev: ChangeEvent<HTMLTextAreaElement>) => { if (id) cambiarRev(conBorrador(rev, id, ev.target.value)); };
  const abrirNota = () => { setNotaAbierta(true); setTimeout(() => notaRef.current?.focus(), 0); };

  // Atajos: A, R, N y ← → (no mientras se escribe).
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (escribiendo(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "a") { e.preventDefault(); aprobar(); }
      else if (k === "r") { e.preventDefault(); rechazar(); }
      else if (k === "n") { e.preventDefault(); abrirNota(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); anterior(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); siguiente(); }
    };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  });

  // Exportar e importar.
  const archivo = useRef<HTMLInputElement>(null);
  const [conflictos, setConflictos] = useState<{ ids: Id[]; del: Record<Id, Revisado> } | null>(null);
  const exportarArchivo = () => {
    const datos = exportar(ids, rev, firmas, nombres);
    const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "revision-personajes.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importarArchivo = async (ev: ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0]; ev.target.value = "";
    if (!f) return;
    let datos: unknown;
    try { datos = JSON.parse(await f.text()); } catch { setAviso({ texto: "Ese archivo no es JSON." }); return; }
    const l = leerExportado(datos);
    if (!l.ok) { setAviso({ texto: l.error }); return; }
    const c = combinar(rev, l.personajes);
    cambiarRev(c.revision);
    setAviso({ texto: `Importado: ${c.agregados} decisiones nuevas${c.conflictos.length ? `, ${c.conflictos.length} en conflicto` : ""}` });
    if (c.conflictos.length) setConflictos({ ids: c.conflictos, del: l.personajes });
  };

  const cabecera = (
    <>
      <header className="rv-top">
          <h1 className="rv-titulo">Revisión de personajes</h1>
          <div className="rv-contador">
            <b>{pos >= 0 ? `${pos + 1} de ${ids.length}` : `— de ${ids.length}`}</b>
            <span>{conteo.aprobados} aprobados · {conteo.rechazados} rechazados · {conteo.pendientes} pendientes{faltan.length ? ` (comprobando ${faltan.length} firmas…)` : ""}</span>
          {fallaron.length > 0 && <span className="rv-firmas-mal">No se pudieron comprobar {fallaron.length} firmas <button type="button" onClick={reintentarFirmas}>Reintentar</button></span>}
          </div>
        </header>
  
        <div className="rv-filtros" role="group" aria-label="Filtro">
          {(["pendientes", "aprobados", "rechazados", "todos"] as FiltroRev[]).map(f => (
            <button key={f} type="button" className={"rv-chip" + (rev.filtro === f ? " on" : "")} aria-pressed={rev.filtro === f} onClick={() => cambiarRev({ ...rev, filtro: f })}>
              {f === "pendientes" ? `Pendientes (${conteo.sinRevisar} sin revisar · ${conteo.deNuevo} de nuevo)` : f === "aprobados" ? `Aprobados (${conteo.aprobados})` : f === "rechazados" ? `Rechazados (${conteo.rechazados})` : `Todos (${conteo.total})`}
            </button>
          ))}
          <label className="rv-avanzar"><input type="checkbox" checked={rev.avanzar} onChange={e => cambiarRev({ ...rev, avanzar: e.target.checked })} /> Avanzar al decidir</label>
        </div>
    </>
  );
  // Filtro vacío (o catálogo vacío): se queda la cabecera para cambiar de filtro; sin navegación ni decisiones.
  if (!id || !ficha) return <div className="rv">{cabecera}<p className="rv-vacio">{ids.length ? "No hay personajes en este filtro." : "No hay personajes en el catálogo."}</p></div>;
  const decidirBloqueado = !listoParaDecidir;
  const porQue = errFirma ?? (armadoDe !== id ? "Cargando el personaje…" : !firma ? "Calculando la firma del archivo…" : "");
  const vida = ficha.animaciones.vida;
  const notasProd = ficha.calidad.notas;

  const decisiones = (
    <div className="rv-decide" role="group" aria-label="Decisión">
      <button type="button" className="rv-nav" onClick={anterior} aria-label="Anterior">‹</button>
      <button type="button" className="rv-rechazar" onClick={rechazar} disabled={decidirBloqueado}><span aria-hidden="true">✕</span> Rechazar</button>
      <button type="button" className="rv-aprobar" onClick={aprobar} disabled={decidirBloqueado}><span aria-hidden="true">✓</span> Aprobar</button>
      <button type="button" className="rv-nav" onClick={siguiente} aria-label="Siguiente">›</button>
    </div>
  );

  return (
    <div className="rv">
      {cabecera}

      <section className="rv-visor" aria-label={"Personaje en 3D: " + ficha.nombre}>
        <Vista3D url={escenaUrl} plano={plano} alLlegar={null} className="rv-vista" momento={momento} giro={giro} orden={orden} onMensaje={alMensaje}
          onArmado={ok => { if (ok) setArmadoDe(id); }} />
        <div className="rv-controles-visor">
          <button type="button" onClick={() => girar(-0.4)} aria-label="Girar a la izquierda">⟲</button>
          <button type="button" onClick={() => girar(0.4)} aria-label="Girar a la derecha">⟳</button>
          <button type="button" className={cara ? "on" : ""} aria-pressed={cara} onClick={alternarCara}>{cara ? "Ver cuerpo" : "Cara de cerca"}</button>
          <button type="button" onClick={restablecer}>Restablecer vista</button>
        </div>
      </section>

      <section className="rv-panel" aria-label="Revisión">
        <div className="rv-ficha">
          <h2>{ficha.nombre}</h2>
          <p>{nombreSaga(ficha.saga)} · {ficha.familia === "bigfig" ? "Grande" : "Minifigura"} · <code>{ficha.id}</code></p>
          <p className={"rv-estado e-" + estado}>{TXT_ESTADO[estado]}{reg?.actual && estado !== "revisar-de-nuevo" ? ` · ${new Date(reg.actual.fecha).toLocaleDateString("es-MX")}` : ""}</p>
          {estado === "revisar-de-nuevo" && <p className="rv-aviso-de-nuevo">El archivo o sus animaciones cambiaron desde la última decisión ({reg?.actual?.estado}). Revísalo otra vez.</p>}
          {notasProd && <p className="rv-notas-prod"><b>Notas de producción:</b> {notasProd}</p>}
        </div>

        <div className="rv-anims" role="group" aria-label="Animaciones">
          {ORDEN_LOGICAS.map(l => {
            const clip = resueltos[l], propio = ficha.animaciones.mapa[l] === clip;
            const tipo = !clip ? "No disponible" : propio ? "Propia" : "Respaldo";
            return (
              <button key={l} type="button" className={"rv-anim" + (sonando === l ? " on" : "") + (!clip ? " no" : "")} disabled={!clip || cara} aria-pressed={sonando === l} onClick={() => tocar(l)}>
                <b>{NOMBRE_LOGICA[l]}</b><small>{tipo}{clip ? " · " + clip : ""}</small>
              </button>
            );
          })}
          <button type="button" className={"rv-anim" + (verVida ? " on" : "") + (!vida.length ? " no" : "")} disabled={!vida.length || cara} aria-expanded={verVida} onClick={() => setVerVida(v => !v)}>
            <b>Vida {verVida ? "▴" : "▾"}</b><small>{vida.length ? `${vida.length} clips` : "No disponible"}</small>
          </button>
        </div>
        {verVida && !cara && (
          <div className="rv-anims rv-vida" role="group" aria-label="Clips de vida">
            {vida.map(v => <button key={v} type="button" className={"rv-anim" + (sonando === v ? " on" : "")} aria-pressed={sonando === v} onClick={() => tocar(v)}><b>{v}</b></button>)}
          </div>
        )}
        {cara && (
          <div className="rv-anims rv-vida" role="group" aria-label="Expresiones de la cara">
            <button type="button" className={"rv-anim" + (expr === null ? " on" : "")} aria-pressed={expr === null} onClick={() => ponerExpr(null)}><b>Todas</b></button>
            {Array.from({ length: nExpr }, (_, i) => <button key={i} type="button" className={"rv-anim" + (expr === i ? " on" : "")} aria-pressed={expr === i} onClick={() => ponerExpr(i)}><b>Expresión {i + 1}</b></button>)}
            {nExpr <= 1 && <span className="rv-nota-chica">{nExpr ? "Cara fija (una sola expresión)." : "Sin expresiones separadas."}</span>}
          </div>
        )}

        <div className="rv-nota">
          <button type="button" className="rv-boton-nota" onClick={() => (notaAbierta ? setNotaAbierta(false) : abrirNota())} aria-expanded={notaAbierta}>{nota ? "Editar nota" : "Nota"}</button>
          {reg?.actual && <button type="button" className="rv-boton-nota" onClick={() => cambiarRev(quitar(rev, id))}>Quitar decisión</button>}
          {notaAbierta && (
            <div className="rv-hoja-nota">
              <label htmlFor="rv-nota-texto">{pideNota ? "¿Qué hay que corregir?" : "Nota para producción"}</label>
              <textarea id="rv-nota-texto" ref={notaRef} maxLength={NOTA_MAX} value={nota} onChange={editarNota} rows={3} />
              <div className="rv-hoja-pie">
                <span>{nota.length}/{NOTA_MAX}</span>
                {pideNota ? <button type="button" className="rv-rechazar" disabled={!nota.trim() || decidirBloqueado} onClick={() => registrar("rechazado", nota)}>Guardar rechazo</button>
                  : <button type="button" className="rv-boton-nota" onClick={() => setNotaAbierta(false)}>Listo</button>}
              </div>
            </div>
          )}
        </div>

        {porQue && <p className="rv-espera" role="status">{porQue}{errFirma && <button type="button" onClick={() => setReintento(n => n + 1)}>Reintentar</button>}</p>}
        <div className="rv-decide-pc">{decisiones}</div>

        <div className="rv-archivo">
          <button type="button" onClick={exportarArchivo} disabled={provisional} title={provisional ? "Esperando a comprobar las firmas de lo ya revisado" : undefined}>Exportar revisión</button>
          <button type="button" onClick={() => archivo.current?.click()}>Importar revisión</button>
          <input ref={archivo} type="file" accept="application/json,.json" hidden onChange={importarArchivo} />
          <span className={guardaOk ? "rv-guardado" : "rv-guardado mal"} role="status">{guardaOk ? "Guardado en este navegador" : "No se pudo guardar; exporta tu revisión"}</span>
        </div>
        <p className="rv-atajos">Atajos: A aprobar · R rechazar · N nota · ← → anterior y siguiente</p>
      </section>

      <div className="rv-barra">{decisiones}</div>

      {aviso && (
        <div className="rv-toast" role="status">
          <span>{aviso.texto}</span>
          {aviso.deshacer && <button type="button" onClick={aviso.deshacer}>Deshacer</button>}
        </div>
      )}
      {conflictos && (
        <div className="rv-conflictos" role="dialog" aria-label="Decisiones en conflicto">
          <h3>El archivo trae decisiones distintas</h3>
          {conflictos.ids.map(c => {
            const mio = rev.personajes[c]?.actual, del = conflictos.del[c]?.actual;
            return (
              <div key={c} className="rv-conflicto">
                <b>{nombres.get(c) ?? c}</b>
                <span>Aquí: {mio ? `${mio.estado}${mio.nota ? " · " + mio.nota : ""}` : "—"}</span>
                <span>Archivo: {del ? `${del.estado}${del.nota ? " · " + del.nota : ""}` : "—"}</span>
                <button type="button" onClick={() => { cambiarRev(usarDelArchivo(rev, c, conflictos.del[c]!)); setConflictos(x => (x ? { ...x, ids: x.ids.filter(y => y !== c) } : x)); }}>Usar la del archivo</button>
                <button type="button" onClick={() => setConflictos(x => (x ? { ...x, ids: x.ids.filter(y => y !== c) } : x))}>Dejar la mía</button>
              </div>
            );
          })}
          {!conflictos.ids.length && <button type="button" onClick={() => setConflictos(null)}>Cerrar</button>}
        </div>
      )}
    </div>
  );
}
