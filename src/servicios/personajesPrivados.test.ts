// Pruebas de la entrega privada: el service worker (public/sw-privados.js) cargado en un entorno simulado, y el
// módulo de la página. Bucket y servidor falsos en memoria; nada sale a la red.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { basePrivada, fuentePrivada, mensajeSesion } from "./personajesPrivados";

const ORIGEN = "https://ecortesgb.github.io";
const ALCANCE = ORIGEN + "/ALV/";
const SUPA = "https://abcdefghijklmnop.supabase.co";
const CUENTA_A = "11111111-1111-4111-8111-111111111111";
const CUENTA_B = "22222222-2222-4222-8222-222222222222";
const SELLO = "20261126T101500Z";
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

/** Puertas para frenar a propósito una lectura de caché o una confirmación de permiso (carreras de Codex r3). */
const puertas: { match?: Promise<void>; rpc?: Promise<void>; borrar?: Promise<void> } = {};
const abrirPuerta = () => { let abrir!: () => void; const p = new Promise<void>(r => { abrir = r; }); return { p, abrir }; };

class CacheFalsa {
  m = new Map<string, Response>();
  private k(x: RequestInfo) { return typeof x === "string" ? new URL(x, ALCANCE).href : (x as Request).url; }
  async match(x: RequestInfo) { const pu = puertas.match; if (pu) { puertas.match = undefined; await pu; } return this.m.get(this.k(x))?.clone(); }
  async put(x: RequestInfo, r: Response) { this.m.set(this.k(x), r.clone()); }
  async delete(x: RequestInfo) { return this.m.delete(this.k(x)); }
  async keys() { return [...this.m.keys()].map(u => new Request(u)); }
}

interface Servidor { permitidos: Set<string>; objetos: Map<string, Uint8Array>; indice: string; retraso?: Promise<void>;
  /** Ventana abierta que contesta «pide-sesion» por su puerto. */
  ventana?: (puerto: MessagePort) => void;
  /** Cuenta que ya marcaba la caché antes de despertar el service worker. */
  marca?: string }

function montar(srv: Servidor) {
  const almacen = new Map<string, CacheFalsa>();
  if (srv.marca) { const c = new CacheFalsa(); c.m.set(new URL("/__alv__/cuenta", ALCANCE).href, new Response(srv.marca)); almacen.set("alv-privados-v1", c); }
  const caches = {
    open: async (n: string) => { if (!almacen.has(n)) almacen.set(n, new CacheFalsa()); return almacen.get(n)!; },
    delete: async (n: string) => { const pu = puertas.borrar; if (pu) { puertas.borrar = undefined; await pu; } return almacen.delete(n); },
  };
  const oyentes: Record<string, (e: unknown) => void> = {};
  const pedidos: { url: string; auth: string | null }[] = [];
  const fetchFalso = async (url: string, init?: RequestInit) => {
    const auth = new Headers(init?.headers).get("Authorization");
    pedidos.push({ url, auth });
    const token = auth?.replace("Bearer ", "") ?? "";
    if (token === "vencido") return new Response("", { status: 401 });
    if (token === "vencido-lento" && url.includes("/storage/")) { if (srv.retraso) await srv.retraso; return new Response("", { status: 401 }); }
    if (url.endsWith("/rest/v1/rpc/puedo_ver_personajes")) {
      const pu = puertas.rpc; if (pu) { puertas.rpc = undefined; await pu; }
      return new Response(JSON.stringify(srv.permitidos.has(token)));
    }
    if (!srv.permitidos.has(token)) return new Response('{"statusCode":"404","error":"not_found"}', { status: 400 });
    const ruta = url.split("/object/authenticated/personajes-privados/")[1] ?? "";
    if (srv.retraso && ruta.startsWith("objetos/")) await srv.retraso;
    if (ruta === `indices/${SELLO}.json`) return new Response(srv.indice);
    const o = srv.objetos.get(ruta);
    return o ? new Response(o) : new Response('{"statusCode":"404"}', { status: 400 });
  };
  const self = {
    registration: { scope: ALCANCE }, location: { origin: ORIGEN },
    addEventListener: (t: string, f: (e: unknown) => void) => { oyentes[t] = f; },
    skipWaiting() {}, clients: { claim: async () => {}, matchAll: async () => srv.ventana
      ? [{ postMessage: (_m: unknown, puertos: MessagePort[]) => srv.ventana!(puertos[0]!) }] : [] },
  };
  runInNewContext(readFileSync("public/sw-privados.js", "utf8"), {
    self, caches, fetch: fetchFalso, crypto: globalThis.crypto, Response, Request, Headers, URL, MessageChannel,
    setTimeout, console, decodeURIComponent, Promise, JSON, Object, Set, Map, Uint8Array, Date,
  });
  const mensajeSinEsperar = (data: unknown, source: unknown = { id: "ventana" }) => {
    let p: Promise<unknown> = Promise.resolve();
    oyentes.message!({ data, source, waitUntil: (x: Promise<unknown>) => { p = x; } });
    return p;
  };
  const mensaje = async (data: unknown, source?: unknown) => { await mensajeSinEsperar(data, source); };
  const pedirSinEsperar = (ruta: string) => {
    let r = null as Promise<Response> | null;
    oyentes.fetch!({ request: { method: "GET", url: ALCANCE + ruta }, respondWith: (x: Promise<Response>) => { r = x; } });
    return r ?? Promise.resolve(null);
  };
  const pedir = async (ruta: string) => await pedirSinEsperar(ruta);
  const enCache = (h: string) => [...(almacen.get("alv-privados-v1")?.m.keys() ?? [])].some(k => k.includes(h));
  return { mensaje, mensajeSinEsperar, pedir, pedirSinEsperar, pedidos, almacen, enCache };
}

const glb = new TextEncoder().encode("glTF-falso-hulk");
const foto = new TextEncoder().encode("webp-falsa");
const hGlb = sha(glb), hFoto = sha(foto);
const objetos = () => new Map([[`objetos/${hGlb}.glb`, glb], [`objetos/${hFoto}.webp`, foto]]);
const indice = JSON.stringify({ version: 1, personajes: [], huellas: {
  "catalogo/hulk/hulk.glb": hGlb, "catalogo/hulk/hulk-tarjeta.webp": hFoto, "../malo.glb": hGlb, "catalogo/x/x.glb": "no-es-sha" } });
const sesion = (token: string, cuenta = CUENTA_A) => ({ tipo: "sesion", url: SUPA, llave: "sb_publishable_x", token, cuenta });
const P = `privado/${SELLO}/`;

describe("service worker de personajes privados", () => {
  it("sin sesión no sirve nada y no atiende rutas fuera de privado/", async () => {
    const sw = montar({ permitidos: new Set(["bueno"]), objetos: objetos(), indice });
    expect((await sw.pedir(P + "indice.json"))!.status).toBe(403);
    expect(await sw.pedir("index.html")).toBeNull();
    expect(await sw.pedir("assets/x.js")).toBeNull();
    expect(sw.pedidos.length).toBe(0);
  });

  it("con permiso sirve índice y archivos por su huella, con el JWT solo en el encabezado", async () => {
    const sw = montar({ permitidos: new Set(["bueno"]), objetos: objetos(), indice });
    await sw.mensaje(sesion("bueno"));
    expect((await sw.pedir(P + "indice.json"))!.status).toBe(200);
    const g = await sw.pedir(P + "catalogo/hulk/hulk.glb");
    expect(g!.status).toBe(200);
    expect(g!.headers.get("Content-Type")).toBe("model/gltf-binary");
    expect(new Uint8Array(await g!.arrayBuffer())).toEqual(glb);
    expect(sw.pedidos.every(p => p.auth === "Bearer bueno" && !p.url.includes("bueno"))).toBe(true);
    expect(sw.pedidos.some(p => p.url.endsWith(`/objetos/${hGlb}.glb`))).toBe(true);
    const n = sw.pedidos.length; // la segunda vez sale de la caché y el permiso sigue vigente: sin pedidos
    expect((await sw.pedir(P + "catalogo/hulk/hulk.glb"))!.status).toBe(200);
    expect(sw.pedidos.length).toBe(n);
  });

  it("rechaza sello falso, rutas fuera del índice, con .. o con huella inválida", async () => {
    const sw = montar({ permitidos: new Set(["bueno"]), objetos: objetos(), indice });
    await sw.mensaje(sesion("bueno"));
    for (const r of ["privado/2026/indice.json", P + "../malo.glb", P + "catalogo/x/x.glb", P + "catalogo/otro/otro.glb",
                     P + "catalogo/hulk/hulk.exe", P + "catalogo%2F..%2F..%2Fx.glb"])
      expect((await sw.pedir(r))!.status).toBe(404);
  });

  it("una cuenta con sesión pero sin permiso no recibe nada (ni el índice)", async () => {
    const sw = montar({ permitidos: new Set(["bueno"]), objetos: objetos(), indice });
    await sw.mensaje(sesion("registrada-sin-permiso", CUENTA_B));
    expect((await sw.pedir(P + "indice.json"))!.status).toBe(403);
    expect((await sw.pedir(P + "catalogo/hulk/hulk.glb"))!.status).toBe(403);
    expect(sw.pedidos.filter(p => p.url.includes("/storage/")).length).toBe(0);
  });

  it("perder el permiso corta también lo que ya estaba en caché (Codex O1)", async () => {
    const srv: Servidor = { permitidos: new Set(["bueno"]), objetos: objetos(), indice };
    const sw = montar(srv);
    await sw.mensaje(sesion("bueno"));
    await sw.pedir(P + "catalogo/hulk/hulk.glb");
    expect(sw.enCache(hGlb)).toBe(true);
    srv.permitidos.clear(); // Elías le quitó el acceso
    // Dentro de la vigencia (2 min) la caché aún se sirve con el mismo token...
    expect((await sw.pedir(P + "catalogo/hulk/hulk.glb"))!.status).toBe(200);
    // ...pero al renovarse el token (cada hora, o al volver a la app) se confirma otra vez y se corta.
    await sw.mensaje(sesion("bueno-renovado"));
    expect((await sw.pedir(P + "catalogo/hulk/hulk.glb"))!.status).toBe(403);
    expect(sw.almacen.size).toBe(0);
  });

  it("cambiar de cuenta o cerrar sesión borra la caché", async () => {
    const sw = montar({ permitidos: new Set(["bueno", "otro"]), objetos: objetos(), indice });
    await sw.mensaje(sesion("bueno"));
    await sw.pedir(P + "catalogo/hulk/hulk.glb");
    expect(sw.enCache(hGlb)).toBe(true);
    await sw.mensaje(sesion("otro", CUENTA_B));
    expect(sw.enCache(hGlb)).toBe(false);
    await sw.mensaje({ tipo: "salir" });
    expect(sw.almacen.size).toBe(0);
  });

  it("una descarga que termina después de cerrar sesión se descarta (Codex O2)", async () => {
    let soltar!: () => void;
    const srv: Servidor = { permitidos: new Set(["bueno"]), objetos: objetos(), indice, retraso: new Promise<void>(r => { soltar = r; }) };
    const sw = montar(srv);
    await sw.mensaje(sesion("bueno"));
    await sw.pedir(P + "indice.json");
    const enCurso = sw.pedir(P + "catalogo/hulk/hulk.glb");
    await new Promise(r => setTimeout(r, 5));
    await sw.mensaje({ tipo: "salir" });
    soltar();
    expect((await enCurso)!.status).toBe(403);
    expect(sw.almacen.size).toBe(0);
  });

  it("una confirmación vieja no autoriza después de renovar el token (Codex r3, O1)", async () => {
    const srv: Servidor = { permitidos: new Set(["viejo", "nuevo"]), objetos: objetos(), indice };
    const sw = montar(srv);
    await sw.mensaje(sesion("viejo"));
    const puerta = abrirPuerta(); puertas.rpc = puerta.p; // la confirmación con el token viejo se queda colgada
    const enCurso = sw.pedirSinEsperar(P + "catalogo/hulk/hulk.glb");
    await new Promise(r => setTimeout(r, 5));
    srv.permitidos.clear();                // le quitan el permiso…
    await sw.mensaje(sesion("nuevo"));     // …y se renueva el token
    puerta.abrir();                        // llega la respuesta vieja («true»)
    expect((await enCurso)!.status).toBe(403);
    expect((await sw.pedir(P + "catalogo/hulk/hulk.glb"))!.status).toBe(403);
    expect(sw.pedidos.some(p => p.url.endsWith("puedo_ver_personajes") && p.auth === "Bearer nuevo")).toBe(true);
  });

  it("salir mientras se procesa una sesión no deja que esa sesión reviva (Codex r3, O2)", async () => {
    const sw = montar({ permitidos: new Set(["bueno"]), objetos: objetos(), indice });
    const puerta = abrirPuerta(); puertas.match = puerta.p; // fijarUna se queda leyendo la caché
    const fijando = sw.mensajeSinEsperar(sesion("bueno"));
    await new Promise(r => setTimeout(r, 5));
    const saliendo = sw.mensajeSinEsperar({ tipo: "salir" }); // invalida al instante; el borrado va en fila
    puerta.abrir();
    await fijando; await saliendo;
    const r = await sw.pedir(P + "catalogo/hulk/hulk.glb");
    expect(r!.status).toBe(403);
    expect(sw.pedidos.filter(p => p.url.includes("/storage/")).length).toBe(0);
  });

  it("salir mientras se lee la caché no entrega lo leído (Codex r3, O2)", async () => {
    const sw = montar({ permitidos: new Set(["bueno"]), objetos: objetos(), indice });
    await sw.mensaje(sesion("bueno"));
    expect((await sw.pedir(P + "catalogo/hulk/hulk.glb"))!.status).toBe(200); // ya en caché
    const puerta = abrirPuerta(); puertas.match = puerta.p;
    const enCurso = sw.pedirSinEsperar(P + "catalogo/hulk/hulk.glb");
    await new Promise(r => setTimeout(r, 5));
    await sw.mensaje({ tipo: "salir" });
    puerta.abrir();
    expect((await enCurso)!.status).toBe(403);
  });

  it("una lectura de caché en curso no se entrega si el token se renueva sin permiso (Codex r4, O1)", async () => {
    const srv: Servidor = { permitidos: new Set(["bueno"]), objetos: objetos(), indice };
    const sw = montar(srv);
    await sw.mensaje(sesion("bueno"));
    expect((await sw.pedir(P + "catalogo/hulk/hulk.glb"))!.status).toBe(200); // ya en caché, permiso vigente
    const puerta = abrirPuerta(); puertas.match = puerta.p;
    const enCurso = sw.pedirSinEsperar(P + "catalogo/hulk/hulk.glb");
    await new Promise(r => setTimeout(r, 5));
    await sw.mensaje(sesion("nuevo"));  // token renovado; «nuevo» no tiene permiso
    puerta.abrir();
    expect((await enCurso)!.status).toBe(403);
    expect(sw.pedidos.some(p => p.url.endsWith("puedo_ver_personajes") && p.auth === "Bearer nuevo")).toBe(true);
  });

  it("una sesión repetida en la fila tampoco revive después de salir (Codex r4, O2)", async () => {
    const sw = montar({ permitidos: new Set(["bueno"]), objetos: objetos(), indice });
    const puerta = abrirPuerta(); puertas.match = puerta.p; // la primera sesión se queda leyendo la caché
    const primera = sw.mensajeSinEsperar(sesion("bueno"));
    await new Promise(r => setTimeout(r, 5));
    const segunda = sw.mensajeSinEsperar(sesion("bueno")); // encolada antes de salir
    const saliendo = sw.mensajeSinEsperar({ tipo: "salir" });
    puerta.abrir();
    await primera; await segunda; await saliendo;
    expect((await sw.pedir(P + "indice.json"))!.status).toBe(403);
    expect(sw.pedidos.filter(p => p.url.includes("/storage/")).length).toBe(0);
  });

  it("salir mientras se borra la caché por cambio de cuenta no deja entrar a la cuenta nueva (Codex r5, O2)", async () => {
    const sw = montar({ permitidos: new Set(["a", "b"]), objetos: objetos(), indice });
    await sw.mensaje(sesion("a", CUENTA_A));
    const puerta = abrirPuerta(); puertas.borrar = puerta.p; // el borrado por cambio de cuenta se queda colgado
    const cambio = sw.mensajeSinEsperar(sesion("b", CUENTA_B));
    await new Promise(r => setTimeout(r, 5));
    const saliendo = sw.mensajeSinEsperar({ tipo: "salir" });
    puerta.abrir();
    await cambio; await saliendo;
    expect((await sw.pedir(P + "indice.json"))!.status).toBe(403);
    expect(sw.pedidos.filter(p => p.url.includes("/storage/")).length).toBe(0);
  });

  it("llega otra cuenta sin permiso y se pide un GLB al instante: no sale con el permiso anterior (Codex r6, O2)", async () => {
    const sw = montar({ permitidos: new Set(["a"]), objetos: objetos(), indice });
    await sw.mensaje(sesion("a", CUENTA_A));
    expect((await sw.pedir(P + "catalogo/hulk/hulk.glb"))!.status).toBe(200);
    const cambio = sw.mensajeSinEsperar(sesion("b", CUENTA_B)); // B no tiene permiso
    const r = await sw.pedir(P + "catalogo/hulk/hulk.glb");      // sin esperar a que termine el cambio
    await cambio;
    expect(r!.status).toBe(403);
  });

  it("una respuesta de sesión atrasada no reemplaza un token más nuevo (Codex r6, O9)", async () => {
    let contestar!: () => void;
    const srv: Servidor = { permitidos: new Set(["viejo", "fresco"]), objetos: objetos(), indice,
      ventana: puerto => { contestar = () => puerto.postMessage(sesion("viejo")); } };
    const sw = montar(srv); // despierta sin sesión: la pedirá a la ventana
    const enCurso = sw.pedirSinEsperar(P + "indice.json");
    await new Promise(r => setTimeout(r, 5));
    await sw.mensaje(sesion("fresco")); // mientras tanto llega la sesión nueva
    contestar();                        // y después la respuesta vieja
    expect((await enCurso)!.status).toBe(200);
    const n = sw.pedidos.length;
    await sw.pedir(P + "catalogo/hulk/hulk.glb");
    const nuevos = sw.pedidos.slice(n);
    expect(nuevos.length).toBeGreaterThan(0);
    expect(nuevos.every(p => p.auth === "Bearer fresco")).toBe(true);
  });

  it("un 401 atrasado de una descarga vieja no tira la sesión más nueva", async () => {
    let soltar!: () => void;
    const srv: Servidor = { permitidos: new Set(["vencido-lento", "fresco"]), objetos: objetos(), indice,
      retraso: new Promise<void>(r => { soltar = r; }) };
    const sw = montar(srv);
    await sw.mensaje(sesion("vencido-lento"));
    const enCurso = sw.pedirSinEsperar(P + "catalogo/hulk/hulk.glb"); // su descarga recibirá 401 tarde
    await new Promise(r => setTimeout(r, 5));
    await sw.mensaje(sesion("fresco"));
    soltar();
    expect((await enCurso)!.status).toBe(200);
    const ultimo = sw.pedidos.filter(p => p.url.includes("/storage/")).at(-1)!;
    expect(ultimo.auth).toBe("Bearer fresco");
  });

  it("dos sesiones de cuentas distintas mientras despierta: gana la última (Codex r7b, O2)", async () => {
    const CUENTA_C = "33333333-3333-4333-8333-333333333333";
    const puerta = abrirPuerta(); puertas.match = puerta.p; // la lectura inicial de la marca se queda colgada
    const sw = montar({ permitidos: new Set(["a"]), objetos: objetos(), indice, marca: CUENTA_C });
    const a = sw.mensajeSinEsperar(sesion("a", CUENTA_A));
    const b = sw.mensajeSinEsperar(sesion("b", CUENTA_B)); // B llega después y no tiene permiso
    puerta.abrir();
    await a; await b;
    const r = await sw.pedir(P + "catalogo/hulk/hulk.glb");
    expect(r!.status).toBe(403);
    expect(sw.pedidos.some(p => p.url.includes("/storage/") && p.auth === "Bearer a")).toBe(false);
  });

  it("perder y recuperar el permiso deja la caché marcada con su cuenta (Codex r7b, D2)", async () => {
    const srv: Servidor = { permitidos: new Set(["a1"]), objetos: objetos(), indice };
    const sw = montar(srv);
    await sw.mensaje(sesion("a1", CUENTA_A));
    expect((await sw.pedir(P + "catalogo/hulk/hulk.glb"))!.status).toBe(200);
    srv.permitidos.clear();
    await sw.mensaje(sesion("a2", CUENTA_A)); // token renovado, ya sin permiso
    expect((await sw.pedir(P + "catalogo/hulk/hulk.glb"))!.status).toBe(403);
    srv.permitidos.add("a2");                   // se lo devuelven
    await sw.mensaje(sesion("a2", CUENTA_A));
    expect((await sw.pedir(P + "catalogo/hulk/hulk.glb"))!.status).toBe(200);
    await new Promise(r => setTimeout(r, 5));   // que termine la fila (marca en disco)
    const caja = sw.almacen.get("alv-privados-v1")!;
    expect(await (await caja.match("/__alv__/cuenta"))?.text()).toBe(CUENTA_A);
  });

  it("salir mientras se lee la marca al despertar: al volver a entrar se escribe la marca (Codex r8, D2)", async () => {
    const puerta = abrirPuerta(); puertas.match = puerta.p;
    const sw = montar({ permitidos: new Set(["a"]), objetos: objetos(), indice, marca: CUENTA_A });
    await sw.mensaje({ tipo: "salir" });
    puerta.abrir();
    await new Promise(r => setTimeout(r, 5));
    await sw.mensaje(sesion("a", CUENTA_A));
    expect((await sw.pedir(P + "catalogo/hulk/hulk.glb"))!.status).toBe(200);
    await new Promise(r => setTimeout(r, 5));
    const caja = sw.almacen.get("alv-privados-v1")!;
    expect(await (await caja.match("/__alv__/cuenta"))?.text()).toBe(CUENTA_A);
  });

  it("al despertar, una caché sin marca de cuenta se borra entera", async () => {
    const sw = montar({ permitidos: new Set(), objetos: objetos(), indice });
    await new Promise(r => setTimeout(r, 5));
    expect(sw.almacen.has("alv-privados-v1")).toBe(false);
  });

  it("no guarda bytes que no coinciden con la huella", async () => {
    const malos = new Map([[`objetos/${hGlb}.glb`, new TextEncoder().encode("otra-cosa")]]);
    const sw = montar({ permitidos: new Set(["bueno"]), objetos: malos, indice });
    await sw.mensaje(sesion("bueno"));
    expect((await sw.pedir(P + "catalogo/hulk/hulk.glb"))!.status).toBe(502);
    expect(sw.enCache(hGlb)).toBe(false);
  });

  it("ignora sesiones mal formadas o sin remitente", async () => {
    const sw = montar({ permitidos: new Set(["bueno"]), objetos: objetos(), indice });
    await sw.mensaje({ ...sesion("bueno"), url: "https://malo.example.com" });
    await sw.mensaje({ ...sesion("bueno"), cuenta: "x" });
    await sw.mensaje(sesion("bueno"), null);
    expect((await sw.pedir(P + "indice.json"))!.status).toBe(403);
    expect(sw.pedidos.length).toBe(0);
  });
});

describe("módulo de la página", () => {
  it("arma el mensaje de sesión solo con todo completo", () => {
    expect(mensajeSesion(null, SUPA, "k")).toBeNull();
    const s = { access_token: "t", user: { id: CUENTA_A } } as never;
    expect(mensajeSesion(s, SUPA + "/", "k")).toEqual({ tipo: "sesion", url: SUPA, llave: "k", token: "t", cuenta: CUENTA_A });
    expect(mensajeSesion(s, "", "k")).toBeNull();
  });
  it("un null no queda guardado: «reintentar» vuelve a probar sin recargar", async () => {
    let sesionActual: unknown = null;
    const cliente = {
      auth: { getSession: async () => ({ data: { session: sesionActual } }), onAuthStateChange: () => ({}) },
      rpc: async () => ({ data: SELLO, error: null }),
    } as never;
    const sw = { register: async () => ({}), ready: Promise.resolve({}), controller: { postMessage() {} },
      addEventListener() {} } as never;
    const e = { cliente, url: SUPA, llave: "sb_publishable_x", sw, seguro: true, base: ALCANCE };
    expect(await fuentePrivada(e)).toBeNull();                 // sin sesión todavía
    sesionActual = { access_token: "t", user: { id: CUENTA_A } };
    expect(await fuentePrivada(e)).toBe(ALCANCE + `privado/${SELLO}/`); // ya con sesión
    expect(await fuentePrivada(e)).toBe(ALCANCE + `privado/${SELLO}/`); // y se queda
  });
  it("la base privada es del mismo origen, bajo el alcance y fija por entrega", () => {
    expect(basePrivada(ALCANCE, SELLO)).toBe(ALCANCE + `privado/${SELLO}/`);
    expect(basePrivada(ALCANCE + "index.html#/hub", SELLO)).toBe(ALCANCE + `privado/${SELLO}/`);
    expect(basePrivada(ALCANCE, "../x")).toBeNull();
  });
});
