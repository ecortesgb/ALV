// Copia de Supabase en la laptop para el Modo Fiesta con cuentas, XP y tienda (Elías, 27 nov).
// Se corre UNA vez con internet, con Docker abierto. Copia la base de producción (cuentas, perfiles, figuras, XP,
// monedas, colección, tienda) a un Supabase local en Docker. Lo que pase en la fiesta se queda en la laptop.
//
//   $env:ALV_DB_URL = "postgresql://postgres.XXXX:CONTRASEÑA@aws-...pooler.supabase.com:5432/postgres"
//   npm run fiesta:supabase
//   Remove-Item Env:ALV_DB_URL
//
// La conexión se lee de la variable ALV_DB_URL y no se guarda en ningún archivo. La copia (con datos personales de
// las cuentas) queda en fiesta-supabase/ (fuera del repo, en .gitignore). Para borrarla: npm run fiesta:supabase -- --borrar
//
// Sin argumentos: arranca la copia (si ya existe) o la crea. --rehacer: borra la copia local y la vuelve a llenar.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TRABAJO = join(RAIZ, "fiesta-supabase");
const SB = join(TRABAJO, "supabase");
const COPIA = join(TRABAJO, "copia");
const PROYECTO = "alv-fiesta";
const CONTENEDOR = `supabase_db_${PROYECTO}`;
const args = process.argv.slice(2);
const win = process.platform === "win32";

const correr = (cmd, a, opc = {}) => execFileSync(cmd, a, { stdio: "inherit", shell: win, cwd: RAIZ, ...opc });
const leer = (cmd, a) => execFileSync(cmd, a, { encoding: "utf8", shell: win, cwd: RAIZ, stdio: ["ignore", "pipe", "inherit"] });
const supabase = (...a) => correr("npx", ["--yes", "supabase@latest", ...a, "--workdir", TRABAJO]);

if (args.includes("--borrar")) {
  try { supabase("stop", "--no-backup"); } catch { /* ya estaba detenido */ }
  rmSync(TRABAJO, { recursive: true, force: true });
  console.log("Copia local borrada.");
  process.exit(0);
}

try { leer("docker", ["info", "--format", "{{.ServerVersion}}"]); } catch {
  console.error("Docker no responde. Abre Docker Desktop y vuelve a correr esto.");
  process.exit(1);
}

// 1. Carpeta de trabajo: la configuración y las funciones del repo, SIN migraciones (la base llega completa de producción).
const nueva = !existsSync(join(COPIA, "datos.sql")) || args.includes("--rehacer");
if (!existsSync(SB)) {
  mkdirSync(SB, { recursive: true });
  const conf = readFileSync(join(RAIZ, "supabase", "config.toml"), "utf8").replace(/^project_id\s*=.*$/m, `project_id = "${PROYECTO}"`);
  writeFileSync(join(SB, "config.toml"), conf);
  if (existsSync(join(RAIZ, "supabase", "functions"))) cpSync(join(RAIZ, "supabase", "functions"), join(SB, "functions"), { recursive: true });
}

// 2. Copia de producción (solo con internet).
if (nueva) {
  const url = process.env.ALV_DB_URL ?? "";
  if (!/^postgres(ql)?:\/\//.test(url)) {
    console.error("Falta la conexión a la base de producción en ALV_DB_URL (Supabase → Connect → Session pooler).");
    process.exit(1);
  }
  mkdirSync(COPIA, { recursive: true });
  console.log("1/4 Copiando roles, estructura y datos de producción…");
  supabase("db", "dump", "--db-url", url, "-f", join(COPIA, "roles.sql"), "--role-only");
  supabase("db", "dump", "--db-url", url, "-f", join(COPIA, "esquema.sql"));
  supabase("db", "dump", "--db-url", url, "-f", join(COPIA, "datos.sql"), "--use-copy", "--data-only");
}

// 3. Arranca el Supabase local (la primera vez baja las imágenes de Docker: varios GB).
console.log("2/4 Arrancando Supabase en Docker…");
if (nueva) { try { supabase("stop", "--no-backup"); } catch { /* no estaba */ } }
supabase("start");

// 4. Carga la copia en la base local.
if (nueva) {
  console.log("3/4 Cargando la copia en la base local…");
  for (const f of ["roles.sql", "esquema.sql", "datos.sql"]) correr("docker", ["cp", join(COPIA, f), `${CONTENEDOR}:/tmp/${f}`]);
  const psql = (...a) => correr("docker", ["exec", CONTENEDOR, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=0", ...a]);
  psql("-f", "/tmp/roles.sql");
  psql("--single-transaction", "-v", "ON_ERROR_STOP=1", "-f", "/tmp/esquema.sql", "-c", "SET session_replication_role = replica", "-f", "/tmp/datos.sql");
  // Que el API vea las tablas y funciones nuevas.
  psql("-c", "NOTIFY pgrst, 'reload schema'");
}

// 5. Llave publicable del Supabase local para armar la app.
console.log("4/4 Leyendo la llave local…");
const estado = leer("npx", ["--yes", "supabase@latest", "status", "-o", "env", "--workdir", TRABAJO]);
const llave = /PUBLISHABLE_KEY="?(sb_publishable_[^"\s]+)/.exec(estado)?.[1];
if (!llave) { console.error("No encontré la llave publicable del Supabase local (actualiza el CLI de Supabase)."); process.exit(1); }
writeFileSync(join(TRABAJO, "llave-publicable.txt"), llave);
const n = leer("docker", ["exec", CONTENEDOR, "psql", "-U", "postgres", "-d", "postgres", "-tAc", "select count(*) from auth.users"]).trim();
console.log(`\nListo. Cuentas copiadas: ${n}. Supabase local en el puerto 54321.`);
console.log("Ahora arma la app con la copia:  npm run fiesta:armar\n");
