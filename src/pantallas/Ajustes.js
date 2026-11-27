import { jsx as _jsx } from "react/jsx-runtime";
// Ajustes y Administración ahora son la pantalla Configuración (pantallas/config/Configuracion.tsx, 2026-11-22).
// Se conservan estos nombres para las rutas #/ajustes y #/admin.
import { Configuracion } from "./config/Configuracion";
export function Ajustes() { return _jsx(Configuracion, {}); }
export function Admin() { return _jsx(Configuracion, { forzar: "admin" }); }
