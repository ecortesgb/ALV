// Comprar un personaje bloqueado desde el personalizador o el taller del lobby (Elías, 28 nov): al tocar un traje con
// candado sale la compra ahí mismo en vez de mandar a la Tienda. El precio y el cobro los decide el servidor
// (comprar_personajes); aquí solo se pregunta y se avisa.
import { useRef } from "react";
import { comprarPersonajes, useTienda } from "../servicios/tienda";
import { sonar } from "../app/sonido";
import { sesionAhora } from "../app/sesion";
import { aviso, confirmar } from "./comun";

export function useComprarEnTaller(): (id: string, nombre: string) => void {
  const { demo, catalogoPersonajes, monedas } = useTienda();
  const ocupado = useRef(false);
  return (id, nombre) => {
    if (ocupado.current) return;
    const oferta = catalogoPersonajes?.find(c => c.id === id);
    if (!oferta) { aviso("Este personaje todavía no está a la venta."); return; }
    ocupado.current = true;
    void (async () => {
      try {
        const falta = oferta.precio - monedas;
        // El saldo de la tienda puede no haberse leído aún (0): entonces decide el servidor.
        if (monedas > 0 && falta > 0) {
          await confirmar({ titulo: `${nombre} cuesta ${oferta.precio} monedas`, texto: `Te faltan ${falta} monedas. Gana más jugando partidas.`, si: "Entendido", no: null });
          return;
        }
        if (!(await confirmar({ titulo: `¿Desbloquear a ${nombre}?`, texto: `Cuesta ${oferta.precio.toLocaleString("es-MX")} monedas${monedas > 0 ? ` (tienes ${monedas.toLocaleString("es-MX")})` : ""}. Se queda en tu colección para siempre.`, si: `Comprar · ${oferta.precio}`, no: "Ahora no" }))) return;
        const r = await comprarPersonajes("carta", id, oferta.precio, demo ? catalogoPersonajes ?? [] : []);
        if (typeof r === "string") { aviso(r); return; }
        sonar("exito");
        marcarVisto(sesionAhora().uid, id);
        aviso(`¡${nombre} ya es tuyo! Tócalo para ponértelo.`);
      } catch {
        aviso("No se pudo completar la compra. Revisa tu conexión.");
      } finally { ocupado.current = false; }
    })();
  };
}

/** Lo comprado aquí ya se vio: el aviso de novedades del personalizador no lo repite. */
function marcarVisto(uid: string, id: string) {
  try {
    const clave = `alv-taller-visto-${uid}`;
    const v = JSON.parse(localStorage.getItem(clave) ?? "null") as { p: string[]; a: string[] } | null;
    if (v && !v.p.includes(id)) localStorage.setItem(clave, JSON.stringify({ ...v, p: [...v.p, id] }));
  } catch { /* sin almacenamiento */ }
}
