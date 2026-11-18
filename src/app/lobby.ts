// El lobby único de la fase de prueba (8 personas): quien abre ALV ve si hay uno abierto y entra con un toque.
// Solo el anfitrión (cuentas administradoras; hoy solo ecortes7) lo abre. Sin servidor (demostración) cualquiera puede.
import { useEffect, useState } from "react";
import { enlace } from "../servicios/enlace";
import { hayNube } from "../servicios/cliente";
import { soyAdmin } from "../servicios/admin";

/** Código del lobby abierto que se está anunciando, o null. */
export function useLobby(): string | null {
  const [codigo, setCodigo] = useState<string | null>(null);
  useEffect(() => enlace.buscarLobby(setCodigo), []);
  return codigo;
}

/** ¿Esta cuenta puede abrir el lobby? */
export function usePuedeAbrir(uid: string): boolean {
  const [si, setSi] = useState(!hayNube);
  useEffect(() => {
    if (!hayNube) { setSi(true); return; }
    let vivo = true;
    void soyAdmin().then(x => { if (vivo) setSi(x); });
    return () => { vivo = false; };
  }, [uid]);
  return si;
}
