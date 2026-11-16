// Tienda: las compras las decide y cobra el servidor.
import { cliente, cuentaActiva } from "./cliente";

/** Traduce el motivo que da la base a un mensaje claro; lo demás queda genérico. */
function motivoCompra(msg: string): string {
  if (msg.includes("saldo insuficiente")) return "No te alcanza la XP disponible.";
  if (msg.includes("nivel insuficiente")) return "Todavía no tienes el nivel para esto.";
  if (msg.includes("ya lo tienes")) return "Ya lo tienes.";
  if (msg.includes("ya tienes todo")) return "Ya tienes todo lo que puede dar este sobre.";
  return "No se pudo comprar. Intenta otra vez.";
}

/** Compra un accesorio en la cuenta. Devuelve null si salió bien, o el motivo. */
export async function comprarAccesorioNube(articulo: string): Promise<string | null> {
  if (!cliente || !cuentaActiva()) return "No hay cuenta abierta.";
  try {
    const { error } = await cliente.rpc("comprar_accesorio", { p_articulo: articulo });
    if (error) { console.error("comprarAccesorioNube", error.message); return motivoCompra(error.message); }
    return null;
  } catch (e) { console.error("comprarAccesorioNube", e); return "No se pudo comprar. Intenta otra vez."; }
}

/** Abre un sobre en el servidor: él decide las cartas. */
export async function comprarSobreNube(sobre: string): Promise<{ ok: true; cartas: { id: string; rareza: string }[] } | { ok: false; motivo: string }> {
  if (!cliente || !cuentaActiva()) return { ok: false, motivo: "No hay cuenta abierta." };
  try {
    const { data, error } = await cliente.rpc("comprar_sobre", { p_sobre: sobre });
    if (error) { console.error("comprarSobreNube", error.message); return { ok: false, motivo: motivoCompra(error.message) }; }
    return { ok: true, cartas: ((data ?? []) as { articulo: string; rareza: string }[]).map(c => ({ id: c.articulo, rareza: c.rareza })) };
  } catch (e) { console.error("comprarSobreNube", e); return { ok: false, motivo: "No se pudo comprar. Intenta otra vez." }; }
}
