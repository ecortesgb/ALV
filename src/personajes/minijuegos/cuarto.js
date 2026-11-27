// Cuarto de Físico (prototipo, zona aparte): los personajes caminan, corren, saltan, golpean, reciben golpe y caen.
// Lógica pura que corre en la TV; los celulares mandan el mando (palanca y botones). La escena 3D solo lee `anim`.
// Unidades de la escena de ALV (una minifigura mide ~2.7). Sin DOM ni 3D: lo prueba minijuegos.test.ts.
const GESTO_MS = { saludo: 2000, festejo: 2300, derrota: 2300, especial: 2000 };
export const CONFIG_CUARTO = {
    forma: "caja", ancho: 18, fondo: 11, radio: 7.5,
    caminar: 2.6, correr: 6.2, umbralCorrer: 0.8, giro: 12,
    salto: 7.5, gravedad: 22, radioCuerpo: 0.55,
    golpeMs: 600, impactoMs: 220, alcance: 1.5, cono: Math.PI / 3,
    heridoMs: 900, empuje: 3.2, golpesKo: 3, ventanaKoMs: 6000, koMs: 4300,
    aterrizarMs: 260, reaparecerMs: 1400, caducaMandoMs: 500,
    vueloAlto: 3, vueloPaso: 1.6, vueloTecho: 7, vueloVel: 7.5,
};
export function crearCuarto(cfg = {}) {
    return { cfg: { ...CONFIG_CUARTO, ...cfg }, cuerpos: new Map(), t: 0 };
}
/** Entra un personaje (o vuelve a entrar). `escala` = qué tan grande es respecto a una minifigura (Hulk ~1.8). */
export function entrar(e, id, escala = 1) {
    const n = e.cuerpos.size, ang = n * 2.399; // ángulo áureo: no caen encimados
    const r = Math.min(3, 1 + n * 0.6);
    const c = {
        id, x: Math.cos(ang) * r, z: Math.sin(ang) * r * 0.6, y: 0, vy: 0, rot: 0,
        anim: "reposo", hasta: 0, golpeo: false, recibidos: [], empujeX: 0, empujeZ: 0,
        radio: e.cfg.radioCuerpo * Math.max(1, escala * 0.8), enPiso: true, cayendo: false, mando: { x: 0, z: 0 }, animDesde: e.t, mandoT: e.t, vuela: false, metaY: 0,
    };
    e.cuerpos.set(id, c);
    return c;
}
export function salir(e, id) { e.cuerpos.delete(id); }
/** Alarga (o acorta) el poder que está haciendo al largo de su clip: la TV lo sabe hasta que baja el GLB de poderes.
 *  Entre 0.4 y 6 s desde que empezó. Si ya no está en un poder, no hace nada. */
export function alargar(e, id, ms) {
    const c = e.cuerpos.get(id);
    if (!c || (c.anim !== "poder" && c.anim !== "poder2") || !Number.isFinite(ms))
        return;
    c.hasta = c.animDesde + Math.min(6000, Math.max(400, ms));
}
/** Lo que manda el celular. La palanca se acota a un círculo de radio 1; los botones son «se tocó» (se gastan). */
export function mandar(e, id, m) {
    const c = e.cuerpos.get(id);
    if (!c)
        return;
    let x = Number.isFinite(m.x) ? m.x : 0, z = Number.isFinite(m.z) ? m.z : 0;
    const l = Math.hypot(x, z);
    if (l > 1) {
        x /= l;
        z /= l;
    }
    c.mando = { x, z, saltar: c.mando.saltar || !!m.saltar, golpe: c.mando.golpe || !!m.golpe, festejo: c.mando.festejo || !!m.festejo, poder: c.mando.poder || !!m.poder, poder2: c.mando.poder2 || !!m.poder2, volar: c.mando.volar || !!m.volar,
        gesto: m.gesto && Object.hasOwn(GESTO_MS, m.gesto) ? m.gesto : c.mando.gesto };
    c.mandoT = e.t;
}
/** Deja de volar: cae con gravedad y aterriza como de un salto. */
function aterrizarVuelo(e, c, ev) {
    c.vuela = false;
    c.metaY = 0;
    c.vy = 0;
    poner(e, c, "caer");
    ev.push({ tipo: "aterriza", id: c.id });
}
const ocupado = (c) => c.anim === "golpe" || c.anim === "herido" || c.anim === "ko" || c.anim === "festejo" || c.anim === "poder" || c.anim === "poder2" || c.anim === "aterrizar"
    || c.anim === "saludo" || c.anim === "derrota" || c.anim === "especial";
const angulo = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function poner(e, c, a, ms = 0) {
    if (c.anim !== a)
        c.animDesde = e.t;
    c.anim = a;
    c.hasta = ms ? e.t + ms : 0;
}
function dentroDelPiso(cfg, x, z) {
    return cfg.forma === "plataforma" ? Math.hypot(x, z) <= cfg.radio : true;
}
/** Avanza dt milisegundos. Devuelve lo que pasó (para sonidos y avisos en la TV). */
export function pasoCuarto(e, dt) {
    const cfg = e.cfg, s = dt / 1000, ev = [];
    e.t += dt;
    for (const c of e.cuerpos.values()) {
        if (e.t - c.mandoT > cfg.caducaMandoMs) {
            c.mando.x = 0;
            c.mando.z = 0;
        }
        const m = c.mando;
        c.mando = { x: m.x, z: m.z }; // los botones se gastan en este paso
        // Fin de lo que estaba haciendo.
        if (c.hasta && e.t >= c.hasta) {
            if (c.anim === "ko" || c.anim === "herido")
                c.recibidos = c.anim === "ko" ? [] : c.recibidos;
            c.golpeo = false;
            poner(e, c, "reposo");
        }
        // Caída por la orilla de la plataforma: cae, y reaparece en el centro.
        if (c.cayendo) {
            c.vy -= cfg.gravedad * s;
            c.y += c.vy * s;
            if (c.y < -14) {
                c.cayendo = false;
                c.x = 0;
                c.z = 0;
                c.y = 6;
                c.vy = 0;
                c.enPiso = false;
                poner(e, c, "caer");
            }
            continue;
        }
        const libre = !ocupado(c);
        const fuerza = Math.hypot(m.x, m.z);
        // Vuelo: el botón de su poder de volar despega (desde el piso) o aterriza. En el aire: palanca a cualquier lado,
        // A sube y B baja; si baja hasta el piso, aterriza. No golpea ni hace gestos en el aire.
        if (m.volar && c.vuela)
            aterrizarVuelo(e, c, ev);
        else if (m.volar && libre && c.enPiso) {
            c.vuela = true;
            c.enPiso = false;
            c.vy = 0;
            c.metaY = cfg.vueloAlto;
            poner(e, c, "volar");
            ev.push({ tipo: "despega", id: c.id });
        }
        if (c.vuela) {
            if (m.saltar)
                c.metaY = Math.min(cfg.vueloTecho, c.metaY + cfg.vueloPaso);
            if (m.golpe) {
                c.metaY -= cfg.vueloPaso;
                if (c.metaY < 0.5)
                    aterrizarVuelo(e, c, ev);
            }
        }
        if (c.vuela) {
            c.y += (c.metaY - c.y) * Math.min(1, 4 * s);
            let vx = 0, vz = 0;
            if (fuerza > 0.08) {
                vx = (m.x / fuerza) * cfg.vueloVel * Math.min(1, fuerza);
                vz = (m.z / fuerza) * cfg.vueloVel * Math.min(1, fuerza);
                const d = angulo(Math.atan2(vx, vz) - c.rot);
                c.rot = angulo(c.rot + d * Math.min(1, cfg.giro * s));
            }
            c.x += vx * s + c.empujeX * s;
            c.z += vz * s + c.empujeZ * s;
            const freno = Math.exp(-6 * s);
            c.empujeX *= freno;
            c.empujeZ *= freno;
            continue;
        }
        // Golpe: arranca el ataque; el impacto se revisa a mitad del clip.
        if (m.golpe && libre && c.enPiso) {
            poner(e, c, "golpe", cfg.golpeMs);
            c.golpeo = false;
        }
        // Gesto de la rueda (o el festejo de antes): se queda quieto mientras lo hace.
        const gesto = m.gesto ?? (m.festejo ? "festejo" : undefined);
        if (gesto && libre && c.enPiso)
            poner(e, c, gesto, GESTO_MS[gesto]);
        // Poder (gatillo RT): el movimiento especial del personaje (rayos de Cíclope, pecho de Iron Man...). Solo animación.
        if (m.poder && libre && c.enPiso) {
            poner(e, c, "poder", 2000);
            ev.push({ tipo: "poder", id: c.id });
        }
        // Segundo poder (botón X), si el personaje lo trae. La TV alarga los dos al largo real del clip (alargar).
        else if (m.poder2 && libre && c.enPiso) {
            poner(e, c, "poder2", 2000);
            ev.push({ tipo: "poder", id: c.id, n: 2 });
        }
        if (m.saltar && libre && c.enPiso) {
            c.vy = cfg.salto;
            c.enPiso = false;
            poner(e, c, "saltar");
            ev.push({ tipo: "salto", id: c.id });
        }
        // Moverse (también en el aire; no mientras golpea, está herido o tirado).
        let vx = 0, vz = 0;
        if (!ocupado(c) && fuerza > 0.08) {
            const v = fuerza >= cfg.umbralCorrer ? cfg.correr : cfg.caminar * Math.min(1, fuerza / cfg.umbralCorrer + 0.35);
            vx = (m.x / fuerza) * v;
            vz = (m.z / fuerza) * v;
            const meta = Math.atan2(vx, vz), d = angulo(meta - c.rot);
            c.rot = angulo(c.rot + d * Math.min(1, cfg.giro * s));
            if (c.enPiso)
                poner(e, c, v >= cfg.correr ? "correr" : "caminar");
        }
        else if (c.enPiso && (c.anim === "caminar" || c.anim === "correr"))
            poner(e, c, "reposo");
        // Empuje de un golpe recibido (se apaga solo).
        vx += c.empujeX;
        vz += c.empujeZ;
        const freno = Math.exp(-6 * s);
        c.empujeX *= freno;
        c.empujeZ *= freno;
        c.x += vx * s;
        c.z += vz * s;
        // Vertical.
        if (!c.enPiso) {
            c.vy -= cfg.gravedad * s;
            c.y += c.vy * s;
            if (c.vy < 0 && c.anim === "saltar" && c.y < 1.2)
                poner(e, c, "caer");
            if (c.y <= 0) {
                if (dentroDelPiso(cfg, c.x, c.z)) {
                    c.y = 0;
                    c.vy = 0;
                    c.enPiso = true;
                    if (!ocupado(c))
                        poner(e, c, "aterrizar", cfg.aterrizarMs);
                }
                else {
                    c.cayendo = true;
                    poner(e, c, "caer");
                    ev.push({ tipo: "cae", id: c.id });
                } // saltó hacia fuera (Codex O6)
            }
        }
        // Orilla de la plataforma (las paredes de la caja se resuelven al final, después de separar cuerpos).
        if (cfg.forma === "plataforma" && c.enPiso && !dentroDelPiso(cfg, c.x, c.z)) {
            c.enPiso = false;
            c.cayendo = true;
            c.vy = 0;
            poner(e, c, "caer");
            ev.push({ tipo: "cae", id: c.id });
        }
    }
    // Impactos de los golpes (Codex O8): primero se juntan todos desde la misma foto del cuarto y después se aplican
    // juntos; así dos golpes simultáneos pegan los dos, sin importar quién entró primero.
    const impactos = [];
    for (const c of e.cuerpos.values()) {
        if (c.anim !== "golpe" || c.golpeo || e.t - c.animDesde < cfg.impactoMs)
            continue;
        c.golpeo = true;
        for (const o of e.cuerpos.values()) {
            if (o === c || o.anim === "ko" || o.cayendo)
                continue;
            const dx = o.x - c.x, dz = o.z - c.z, d = Math.hypot(dx, dz);
            if (d > cfg.alcance + o.radio || Math.abs(o.y - c.y) > 1.5)
                continue;
            if (Math.abs(angulo(Math.atan2(dx, dz) - c.rot)) > cfg.cono)
                continue;
            impactos.push({ c, o, ux: d > 1e-3 ? dx / d : Math.sin(c.rot), uz: d > 1e-3 ? dz / d : Math.cos(c.rot) });
        }
    }
    for (const { c, o, ux, uz } of impactos) {
        if (o.anim === "ko")
            continue; // ya lo tumbó otro golpe de esta misma foto
        o.recibidos = o.recibidos.filter(t => e.t - t < cfg.ventanaKoMs).concat(e.t);
        o.empujeX = ux * cfg.empuje;
        o.empujeZ = uz * cfg.empuje;
        o.rot = Math.atan2(-ux, -uz); // voltea hacia quien le pegó
        ev.push({ tipo: "golpe", de: c.id, a: o.id });
        if (o.vuela) {
            o.vuela = false;
            o.metaY = 0;
            o.vy = 0;
        } // lo bajan de un golpe
        if (o.recibidos.length >= cfg.golpesKo) {
            poner(e, o, "ko", cfg.koMs);
            ev.push({ tipo: "ko", id: o.id });
        }
        else
            poner(e, o, "herido", cfg.heridoMs);
    }
    // Que no se encimen (se empujan por igual).
    const lista = [...e.cuerpos.values()].filter(c => !c.cayendo);
    for (let i = 0; i < lista.length; i++)
        for (let j = i + 1; j < lista.length; j++) {
            const a = lista[i], b = lista[j];
            const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = a.radio + b.radio;
            if (d >= min || Math.abs(a.y - b.y) > 1.5)
                continue;
            const ux = d > 1e-4 ? dx / d : 1, uz = d > 1e-4 ? dz / d : 0, k = (min - d) / 2;
            a.x -= ux * k;
            a.z -= uz * k;
            b.x += ux * k;
            b.z += uz * k;
        }
    // Paredes de la caja al final: separar cuerpos ya no puede sacar a nadie del cuarto (Codex O6).
    if (cfg.forma === "caja")
        for (const c of e.cuerpos.values()) {
            const ax = cfg.ancho / 2 - c.radio, az = cfg.fondo / 2 - c.radio;
            c.x = Math.max(-ax, Math.min(ax, c.x));
            c.z = Math.max(-az, Math.min(az, c.z));
        }
    return ev;
}
