-- 041 · Torneos, versión simple (Ranking y Logros, etapa 1; Maestro v1.54, 14.3 y T13).
-- APLICADA en la base remota el 2026-11-23 con autorización de Elías («Sí, aplícala»), registrada como
-- 20261123163418 041_torneos (después de la 042, que necesita). Antes: prueba local PGlite 9/9 y prueba remota en
-- transacción deshecha (supabase/pruebas/041_remota_prueba.sql). Después, verificado con SELECT: 19 logros, 0 torneos,
-- RLS en las 2 tablas sin lectura directa para authenticated, disparador logros_tras_campeon, las 4 funciones públicas
-- solo para authenticated, cerrar_torneos sin permiso, progreso_logros con «campeon»; mismos datos. Asesor: 43 → 47 avisos
-- RPC (los 4 esperados) y 2 avisos informativos nuevos de «RLS sin política» en torneos y torneo_campeones (a propósito:
-- solo se leen por las funciones).
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
language plpgsql security definer set search_path = '' as $$
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
end $$;
revoke all on function privado.cerrar_torneos() from public, anon, authenticated;

-- ============ Administración ============
create function public.admin_crear_torneo(p_nombre text, p_modalidad text, p_inicio timestamptz, p_fin timestamptz, p_premio text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
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
end $$;
revoke all on function public.admin_crear_torneo(text, text, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.admin_crear_torneo(text, text, timestamptz, timestamptz, text) to authenticated;

create function public.admin_cancelar_torneo(p_torneo uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'sin sesión'; end if;
  if not public.soy_admin() then raise exception 'sin permiso'; end if;
  update public.torneos set cancelado = true where id = p_torneo and not cerrado;
  if not found then raise exception 'torneo no válido'; end if;
end $$;
revoke all on function public.admin_cancelar_torneo(uuid) from public, anon;
grant execute on function public.admin_cancelar_torneo(uuid) to authenticated;

-- ============ Lecturas ============
-- Torneos próximos, activos y terminados en los últimos 14 días, con campeones si ya cerró.
create function public.torneos_vigentes()
returns table (id uuid, nombre text, modalidad text, inicio timestamptz, fin timestamptz, premio text, estado text,
               participantes int, campeones text[])
language plpgsql security definer set search_path = '' as $$
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
end $$;
revoke all on function public.torneos_vigentes() from public, anon;
grant execute on function public.torneos_vigentes() to authenticated;

-- Tabla de posiciones de un torneo. Respeta «Aparecer en el ranking Global» (T8): quien lo apagó no sale (salvo uno mismo).
create function public.tabla_torneo(p_torneo uuid)
returns table (posicion int, id uuid, nombre text, nivel int, figura jsonb, puntos_alv int, victorias int, partidas int)
language plpgsql security definer set search_path = '' as $$
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
end $$;
revoke all on function public.tabla_torneo(uuid) from public, anon;
grant execute on function public.tabla_torneo(uuid) to authenticated;

-- ============ Logro «Campeón» (plan §8.1) ============
insert into public.logros (clave, categoria, juego, rareza, nombre, descripcion, meta, recompensa, orden) values
  ('campeon', 'colectivo', null, 'legendaria', 'Campeón', 'Gana un torneo.', 1, 'Insignia legendaria', 170);

create or replace function privado.progreso_logros(p_jugador uuid) returns table (clave text, va int)
language sql stable security definer set search_path = '' as $$
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
  ) x(clave, va) $$;

create trigger logros_tras_campeon after insert on public.torneo_campeones for each row execute function privado.tras_resultado();
