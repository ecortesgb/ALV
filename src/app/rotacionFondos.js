// Rota los fondos en orden y guarda el último índice por clave en el aparato; Elías 2026-11-26.
export function siguienteFondo(clave, fondos) {
    if (fondos.length === 0)
        return null;
    const claveRecortada = clave.trim();
    if (!claveRecortada)
        return fondos[0];
    const llave = "alv-fondo-turno-" + claveRecortada;
    let indice = 0;
    try {
        const guardado = globalThis.localStorage.getItem(llave);
        if (guardado !== null && guardado.length > 0 && !/[^0-9]/.test(guardado)) {
            indice = Number((BigInt(guardado) + 1n) % BigInt(fondos.length));
        }
    }
    catch {
        // Sin almacenamiento disponible se empieza por el primer fondo.
    }
    try {
        globalThis.localStorage.setItem(llave, String(indice));
    }
    catch {
        // Un fallo al guardar no impide entregar el fondo.
    }
    return fondos[indice];
}
