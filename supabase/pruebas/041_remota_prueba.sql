-- Prueba de la 041 en la base remota. La 041 va DENTRO de este bloque, que termina SIEMPRE con una excepción:
-- nada queda guardado (ni tablas, funciones, disparador y logro nuevos, ni usuarios simulados, ni salas o torneos de prueba).
-- Autorizada por Elías el 2026-11-23 («Sí, pruébala»). Contiene el texto de 041_torneos.sql con $$ cambiado a $f$.
-- A = administrador simulado y anfitrión, B y C = jugadores, E = cuenta fuera de la sala.
-- Resultado 2026-11-23: 1) B no crea («sin permiso»), 90 días «fechas no válidas», nombre corto «nombre no válido».
-- 2) tabla de T1: 3 filas, B 3 PA y lugar 1 (la otra partida quedó fuera de fechas); tabla de parejas vacía. 3) los dos
-- torneos «activo» (participantes 0: dentro de una transacción la hora no avanza y la condición era «antes de ahora»;
-- corregido después a «hasta ahora», sin otro cambio). 4) al vencer: T1 «terminado», 1 campeón (B; la base llama
-- «Jugador» a las cuentas simuladas) y logro Campeón a B; leer otra vez no duplica. 5) B no cancela; cancelado
-- desaparece y su tabla da «torneo no válido». 6) C oculto del Global: C se ve, A no lo ve. 7) sin lectura directa de
-- torneos ni campeones; una cuenta de otra sala ve los 2 torneos; anónimo sin permiso. 8) 19 logros.
-- Después: misma huella (1 usuario, 1 perfil, 1 administrador, 0 salas, 34 tablas, 76 funciones, 19 disparadores,
-- progreso_logros con el mismo md5, 18 logros, sin public.torneos, última migración 20261123160453).
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid(); e uuid := gen_random_uuid();
  ev uuid; p uuid; u uuid; t1 uuid; t2 uuid; r text := ''; t text; t3 text; n int; n2 int; n3 int; i int; yo text := current_user;
begin
  execute $m$
-- 041 · Torneos, versión simple (Ranking y Logros, etapa 1; Maestro v1.54, 14.3 y T13). ESCRITA, NO APLICADA.
-- Antes de aplicar: prueba en transacción deshecha con usuarios simulados, asesor de seguridad y autorización expresa de
-- Elías (D-002). Necesita la 040 (resultados_partida) y la 042 (logros). Se numera 041 aunque se aplique después de la 042.
--
-- Un torneo lo abre el administrador con nombre, modalidad, inicio y fin. La tabla suma los Puntos ALV que cada cuenta
-- gana en partidas terminadas dentro de esas fechas (y de esa modalidad, si no es «todas»). No hay inscripción, rondas
-- ni llaves (eso sería etapa 3). El «Torneo de la noche» no vive aquí: sale de las copas de la sala, en la app.
-- Al pasar la fecha de fin, la primera lectura cierra el torneo y guarda a los campeones (empate: varios); eso entrega
-- el logro legendario «Campeón». Sin XP ni monedas automáticas (D0): el premio es texto que pone el administrador.

-- ============ Tablas ============
create table public.torneos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (length(trim(nombre)) between 3 and 60),
  modalidad   text not null default 'todas' check (modalidad in ('todas', 'individual', 'parejas', 'equipos')),
  inicio      timestamptz not null,
  fin         timestamptz not null,
  premio      text check (premio is null or length(premio) <= 80),
  creado_por  uuid references public.perfiles (id) on delete set null,
  creado      timestamptz not null default now(),
  cerrado     boolean not null default false,
  cancelado   boolean not null default false,
  check (fin > inicio and fin - inicio <= interval '62 days')
);
create index torneos_fechas on public.torneos (fin, inicio);
alter table public.torneos enable row level security;
revoke all on public.torneos from public, anon, authenticated;
-- Se leen por las funciones de abajo.

create table public.torneo_campeones (
  torneo   uuid not null references public.torneos (id) on delete cascade,
  jugador  uuid not null references public.perfiles (id) on delete cascade,
  puntos   int not null,
  creado   timestamptz not null default now(),
  primary key (torneo, jugador)
);
alter table public.torneo_campeones enable row level security;
revoke all on public.torneo_campeones from public, anon, authenticated;

-- ============ Cierre de torneos vencidos ============
-- Guarda como campeones a quienes tengan más Puntos ALV (más de 0). Empate: todos. Idempotente.
create function privado.cerrar_torneos() returns int
language plpgsql security definer set search_path = '' as $f$
declare t record; v_n int := 0;
begin
  for t in select * from public.torneos where not cerrado and not cancelado and fin <= now() for update skip locked loop
    insert into public.torneo_campeones (torneo, jugador, puntos)
      select t.id, x.jugador, x.pa from (
        select r.jugador, sum(r.puntos_alv)::int pa, rank() over (order by sum(r.puntos_alv) desc) pos
        from public.resultados_partida r join public.perfiles p on p.id = r.jugador and not p.invitado
        where r.creada >= t.inicio and r.creada < t.fin and (t.modalidad = 'todas' or r.modalidad = t.modalidad or (t.modalidad = 'equipos' and r.modalidad = 'sexos'))
        group by r.jugador) x
      where x.pos = 1 and x.pa > 0
      on conflict do nothing;
    update public.torneos set cerrado = true where id = t.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $f$;
revoke all on function privado.cerrar_torneos() from public, anon, authenticated;

-- ============ Administración ============
create function public.admin_crear_torneo(p_nombre text, p_modalidad text, p_inicio timestamptz, p_fin timestamptz, p_premio text default null)
returns uuid language plpgsql security definer set search_path = '' as $f$
declare v_id uuid; v_nombre text := trim(regexp_replace(coalesce(p_nombre, ''), '\s+', ' ', 'g'));
begin
  if (select auth.uid()) is null then raise exception 'sin sesión'; end if;
  if not public.soy_admin() then raise exception 'sin permiso'; end if;
  if length(v_nombre) not between 3 and 60 then raise exception 'nombre no válido'; end if;
  if p_modalidad is null or p_modalidad not in ('todas', 'individual', 'parejas', 'equipos') then raise exception 'modalidad no válida'; end if;
  if p_inicio is null or p_fin is null or p_fin <= p_inicio or p_fin - p_inicio > interval '62 days' then raise exception 'fechas no válidas'; end if;
  if p_fin <= now() then raise exception 'el torneo ya habría terminado'; end if;
  if p_premio is not null and length(p_premio) > 80 then raise exception 'premio no válido'; end if;
  insert into public.torneos (nombre, modalidad, inicio, fin, premio, creado_por)
    values (v_nombre, p_modalidad, p_inicio, p_fin, nullif(trim(p_premio), ''), (select auth.uid())) returning id into v_id;
  return v_id;
end $f$;
revoke all on function public.admin_crear_torneo(text, text, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.admin_crear_torneo(text, text, timestamptz, timestamptz, text) to authenticated;

create function public.admin_cancelar_torneo(p_torneo uuid) returns void
language plpgsql security definer set search_path = '' as $f$
begin
  if (select auth.uid()) is null then raise exception 'sin sesión'; end if;
  if not public.soy_admin() then raise exception 'sin permiso'; end if;
  update public.torneos set cancelado = true where id = p_torneo and not cerrado;
  if not found then raise exception 'torneo no válido'; end if;
end $f$;
revoke all on function public.admin_cancelar_torneo(uuid) from public, anon;
grant execute on function public.admin_cancelar_torneo(uuid) to authenticated;

-- ============ Lecturas ============
-- Torneos próximos, activos y terminados en los últimos 14 días, con campeones si ya cerró.
create function public.torneos_vigentes()
returns table (id uuid, nombre text, modalidad text, inicio timestamptz, fin timestamptz, premio text, estado text,
               participantes int, campeones text[])
language plpgsql security definer set search_path = '' as $f$
begin
  if (select auth.uid()) is null then raise exception 'sin sesión'; end if;
  perform privado.cerrar_torneos();
  return query
    select t.id, t.nombre, t.modalidad, t.inicio, t.fin, t.premio,
           case when t.cerrado then 'terminado' when now() < t.inicio then 'proximo' else 'activo' end,
           (select count(distinct r.jugador)::int from public.resultados_partida r join public.perfiles p on p.id = r.jugador and not p.invitado
            where r.creada >= t.inicio and r.creada < t.fin and r.creada <= now()
              and (t.modalidad = 'todas' or r.modalidad = t.modalidad or (t.modalidad = 'equipos' and r.modalidad = 'sexos'))),
           (select array_agg(p.nombre order by p.nombre) from public.torneo_campeones c join public.perfiles p on p.id = c.jugador where c.torneo = t.id)
    from public.torneos t
    where not t.cancelado and t.fin > now() - interval '14 days'
    order by (t.cerrado), t.fin;
end $f$;
revoke all on function public.torneos_vigentes() from public, anon;
grant execute on function public.torneos_vigentes() to authenticated;

-- Tabla de posiciones de un torneo. Respeta «Aparecer en el ranking Global» (T8): quien lo apagó no sale (salvo uno mismo).
create function public.tabla_torneo(p_torneo uuid)
returns table (posicion int, id uuid, nombre text, nivel int, figura jsonb, puntos_alv int, victorias int, partidas int)
language plpgsql security definer set search_path = '' as $f$
declare t public.torneos; v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  perform privado.cerrar_torneos();
  select * into t from public.torneos where torneos.id = p_torneo and not cancelado;
  if t.id is null then raise exception 'torneo no válido'; end if;
  return query
    with r as (select rp.* from public.resultados_partida rp
               join privado.visibles_ranking('global') v on v.id = rp.jugador
               where rp.creada >= t.inicio and rp.creada < t.fin
                 and (t.modalidad = 'todas' or rp.modalidad = t.modalidad or (t.modalidad = 'equipos' and rp.modalidad = 'sexos'))),
    agg as (select r.jugador, sum(r.puntos_alv)::int pa, count(*) filter (where r.cuenta and r.lugar = 1)::int vic, count(*)::int pj
            from r group by r.jugador)
    select rank() over (order by agg.pa desc, agg.vic desc)::int, agg.jugador, p.nombre, public.nivel_por_xp(s.acumulada),
           (select f.figura from public.figuras_jugador f where f.jugador = agg.jugador and f.activa limit 1), agg.pa, agg.vic, agg.pj
    from agg join public.perfiles p on p.id = agg.jugador cross join lateral privado.saldos_de(agg.jugador) s
    order by 1, p.nombre limit 100;
end $f$;
revoke all on function public.tabla_torneo(uuid) from public, anon;
grant execute on function public.tabla_torneo(uuid) to authenticated;

-- ============ Logro «Campeón» (plan §8.1) ============
insert into public.logros (clave, categoria, juego, rareza, nombre, descripcion, meta, recompensa, orden) values
  ('campeon', 'colectivo', null, 'legendaria', 'Campeón', 'Gana un torneo.', 1, 'Insignia legendaria', 170);

create or replace function privado.progreso_logros(p_jugador uuid) returns table (clave text, va int)
language sql stable security definer set search_path = '' as $f$
  with r as (select * from public.resultados_partida where jugador = p_jugador),
  gano as (select * from r where cuenta and lugar = 1),
  otros as (select distinct o.jugador from public.resultados_partida o join r on r.partida = o.partida where o.jugador <> p_jugador),
  racha as (select coalesce(max(n), 0) n from (
              select count(*) n from (
                select lugar = 1 g, row_number() over (order by creada) - row_number() over (partition by lugar = 1 order by creada) k
                from r where cuenta) a where g group by k) b)
  select x.clave, least(x.va, 100000)::int from (values
    ('primeros-pasos',   (select count(*) from r)),
    ('primera-victoria', (select count(*) from gano)),
    ('noche-completa',   (select coalesce(max(n), 0) from (select count(*) n from r where evento is not null group by evento) t)),
    ('polifacetico',     (select count(distinct juego) from r)),
    ('estratega',        (select count(*) from gano where privado.es_deduccion(juego))),
    ('suertudo',         (select count(*) from gano where privado.es_azar(juego, datos))),
    ('mvp',              (select count(*) from r where cuenta and mvp)),
    ('imparable',        (select n from racha)),
    ('veterano',         (select count(*) from r)),
    ('ya-eres-parte',    (select count(*) from otros)),
    ('casa-llena',       (select count(*) from r where unidades = 8 or (select count(*) from public.resultados_partida o where o.partida = r.partida) >= 8)),
    ('popular',          (select count(*) from otros)),
    ('dupla',            (select coalesce(max(n), 0) from (select count(*) n from gano where modalidad = 'parejas' and grupo is not null group by grupo) t)),
    ('los-de-siempre',   (select coalesce(max(n), 0) from (select count(*) n from r where modalidad = 'equipos' and grupo is not null group by grupo) t)),
    ('campeon-noche',    (select count(*) from public.copas_noche c where c.jugador = p_jugador and c.categoria = 'individual' and c.lugar = 1)),
    ('campeon',          (select count(*) from public.torneo_campeones c where c.jugador = p_jugador)),
    ('cara-de-poker',    (select count(*) from gano where juego = 'impostor' and datos -> 'impostor' = 'true'::jsonb)),
    ('detective',        (select coalesce(sum((datos ->> 'votoImpostor')::int), 0) from r where juego = 'impostor' and jsonb_typeof(datos -> 'votoImpostor') = 'number')),
    ('valiente',         (select coalesce(sum((datos ->> 'reto')::int), 0) from r where juego = 'verdad-reto' and jsonb_typeof(datos -> 'reto') = 'number'))
  ) x(clave, va) $f$;

create trigger logros_tras_campeon after insert on public.torneo_campeones for each row execute function privado.tras_resultado();

$m$;
  foreach u in array array[a, b, c, e] loop
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
      values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prueba_' || left(u::text, 8) || '@jugadores.alv.invalid', '', now(), now());
  end loop;
  insert into public.perfiles (id, nombre) select x, 'prueba_' || left(x::text, 6) from unnest(array[a, b, c, e]) x on conflict (id) do nothing;
  update public.perfiles set mayor_18 = true where id in (a, b, c, e);
  insert into privado.administradores (jugador) values (a);
  insert into public.eventos (codigo, nombre, anfitrion) values ('PRB041', 'Prueba 041', a) returning id into ev;
  insert into public.miembros_evento (evento, jugador) select ev, x from unnest(array[a, b, c]) x;

  -- 1) Solo el administrador abre torneos; validaciones
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  begin perform public.admin_crear_torneo('Copa', 'todas', now(), now() + interval '1 day'); r := r || 'FALLA: B creó';
  exception when others then r := r || '1) B crea: ' || sqlerrm; end;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  begin perform public.admin_crear_torneo('Copa ALV', 'todas', now(), now() + interval '90 days'); r := r || ' | FALLA: 90 días';
  exception when others then r := r || ', 90 días: ' || sqlerrm; end;
  begin perform public.admin_crear_torneo('X', 'todas', now(), now() + interval '1 day'); r := r || ' | FALLA: nombre';
  exception when others then r := r || ', nombre corto: ' || sqlerrm; end;
  t1 := public.admin_crear_torneo('ALV Champions', 'todas', now() - interval '1 hour', now() + interval '2 days', 'Insignia de campeón');
  t2 := public.admin_crear_torneo('Copa de parejas', 'parejas', now() - interval '1 hour', now() + interval '2 days');

  -- 2) Dos partidas que gana B; una queda fuera de fechas
  for i in 1..2 loop
    perform set_config('role', yo, true);
    insert into public.partidas (evento, juego, semilla) values (ev, 'que-prefieres', 0) returning id into p;
    insert into public.acciones (id, partida, jugador, tipo, datos) values ('arr-' || p, p, a, 'control', jsonb_build_object('que', 'arranque', 'rondas', 5, 'cfg', '{}'::jsonb));
    perform set_config('role', 'authenticated', true);
    perform public.terminar_partida_sala(p, 'que-prefieres', 3, jsonb_build_array(
      jsonb_build_object('jugador', a, 'rondas', 5, 'retos', 0, 'lugar', 3, 'puntos', 1),
      jsonb_build_object('jugador', b, 'rondas', 5, 'retos', 0, 'lugar', 1, 'puntos', 5),
      jsonb_build_object('jugador', c, 'rondas', 5, 'retos', 0, 'lugar', 2, 'puntos', 3)));
  end loop;
  perform set_config('role', yo, true);
  update public.resultados_partida set creada = now() - interval '5 hours' where partida = p;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*), max(x.puntos_alv) filter (where x.id = b), max(x.posicion) filter (where x.id = b) into n, n2, n3 from public.tabla_torneo(t1) x;
  r := r || ' | 2) tabla T1: ' || n || ' filas, B ' || n2 || ' PA, lugar ' || n3;
  select count(*) into n from public.tabla_torneo(t2); r := r || ', tabla de parejas ' || n;

  -- 3) Vigentes
  select string_agg(x.nombre || '=' || x.estado || '/' || x.participantes, ', ' order by x.nombre) into t from public.torneos_vigentes() x;
  r := r || ' | 3) vigentes: ' || coalesce(t, 'NADA');

  -- 4) Al vencer se cierra, guarda campeón y entrega «Campeón»; leer otra vez no duplica
  perform set_config('role', yo, true);
  update public.torneos set inicio = now() - interval '10 hours', fin = now() - interval '1 minute' where id = t1;
  perform set_config('role', 'authenticated', true);
  select x.estado, array_to_string(x.campeones, ',') into t, t3 from public.torneos_vigentes() x where x.id = t1;
  perform public.torneos_vigentes();
  perform set_config('role', yo, true);
  select count(*) into n from public.torneo_campeones where torneo = t1;
  select count(*) into n2 from public.logros_jugador where jugador = b and logro = 'campeon';
  r := r || ' | 4) T1 ' || t || ', campeones «' || coalesce(t3, '') || '» (' || n || ' fila), logro Campeón a B ' || n2;

  -- 5) Cancelar: solo admin; desaparece
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  begin perform public.admin_cancelar_torneo(t2); r := r || ' | FALLA: B canceló';
  exception when others then r := r || ' | 5) B cancela: ' || sqlerrm; end;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform public.admin_cancelar_torneo(t2);
  select count(*) into n from public.torneos_vigentes() x where x.id = t2; r := r || ', T2 visible ' || n;
  begin perform public.tabla_torneo(t2); r := r || ' | FALLA: tabla cancelado';
  exception when others then r := r || ', tabla: ' || sqlerrm; end;

  -- 6) Privacidad: C se oculta del Global; A no lo ve, C sí se ve
  t3 := null;
  t2 := public.admin_crear_torneo('Torneo privado', 'todas', now() - interval '10 hours', now() + interval '1 day');
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  perform public.fijar_ranking_global(false);
  select count(*) into n from public.tabla_torneo(t2) x where x.id = c;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select count(*) into n2 from public.tabla_torneo(t2) x where x.id = c;
  r := r || ' | 6) C se ve ' || n || ', A ve a C ' || n2;

  -- 7) Sin lectura directa; E (fuera) sí lee torneos (son de todos); anónimo nada
  perform set_config('request.jwt.claims', json_build_object('sub', e, 'role', 'authenticated')::text, true);
  begin perform count(*) from public.torneos; r := r || ' | FALLA: lectura directa';
  exception when others then r := r || ' | 7) lectura directa: ' || sqlerrm; end;
  begin perform count(*) from public.torneo_campeones; r := r || ' | FALLA: campeones directo';
  exception when others then r := r || ', campeones directo: ' || sqlerrm; end;
  select count(*) into n from public.torneos_vigentes(); r := r || ', E ve ' || n || ' torneos';
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'anon', true);
  begin perform public.torneos_vigentes(); r := r || ' | FALLA anon';
  exception when others then r := r || ', anon: ' || sqlerrm; end;
  begin perform public.admin_crear_torneo('Copa anon', 'todas', now(), now() + interval '1 day'); r := r || ' | FALLA anon crea';
  exception when others then r := r || ', anon crea: ' || sqlerrm; end;

  perform set_config('role', yo, true);
  select count(*) into n from public.logros; r := r || ' | 8) logros ' || n;
  raise exception 'PRUEBA 041 (todo se deshace): %', r;
end $$;
