// Ajustes y Administración ahora son la pantalla Configuración (pantallas/config/Configuracion.tsx, 2026-11-22).
// Se conservan estos nombres para las rutas #/ajustes y #/admin.
import { Configuracion } from "./config/Configuracion";

export function Ajustes() { return <Configuracion />; }
export function Admin() { return <Configuracion forzar="admin" />; }
