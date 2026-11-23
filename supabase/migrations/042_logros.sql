-- 042 · Logros (Ranking y Logros, etapa 1; Maestro v1.54, 14.3).
-- APLICADA en la base remota el 2026-11-23 con autorización de Elías («Sí, aplícala»), registrada como
-- 20261123160453 042_logros. Antes: prueba local PGlite 14/14 y prueba remota en transacción deshecha
-- (supabase/pruebas/042_remota_prueba.sql). Después, verificado con SELECT: 18 logros, 0 ganados, RLS y política de
-- lectura en las 2 tablas, 2 disparadores, las 4 funciones públicas solo para authenticated, las privadas sin permiso,
-- anon sin lectura del catálogo, authenticated sin insertar; mismos datos. Asesor de 39 a 43 avisos RPC (los 4 esperados).
-- Necesita la 040 (resultados_partida y copas_noche). La 041 (torneos) va aparte.
--
-- 1) public.logros: catálogo. Los 18 logros visibles de la etapa 1 (plan §8.1, sin «Campeón», que espera los torneos).
-- 2) public.logros_jugador: los que ganó cada cuenta, con fecha, si ya vio el aviso y si lo destacó (hasta 3, v1.21).
-- 3) privado.progreso_logros(jugador): avance real de cada logro, calculado solo con resultados_partida, copas_noche y
--    miembros_evento. privado.revisar_logros(jugador) entrega los que ya se cumplieron.
-- 4) Disparadores: al guardar un resultado o una copa se revisan los logros de esa cuenta. Un error al revisar nunca
--    impide guardar el resultado.
-- 5) Lecturas: mi_progreso_logros(), mis_logros_nuevos() (marca vistos), logros_recientes_sala(evento) para la TV y
--    destacar_logro(clave, si).
-- D0: los logros NO dan XP ni monedas. Nada de esta migración escribe en movimientos_xp ni movimientos_monedas.

-- ============ 1) Catálogo ============
create table public.logros (
  clave        text primary key check (clave ~ '^[a-z0-9-]{1,40}$'),
  categoria    text not null check (categoria in ('coleccion', 'minijuego', 'colectivo', 'oculto', 'progresion')),
  juego        text check (juego is null or juego ~ '^[a-z0-9-]{1,40}$'),
  rareza       text not null check (rareza in ('comun', 'rara', 'epica', 'legendaria')),
  oculto       boolean not null default false,
  nombre       text not null check (length(nombre) between 1 and 60),
  descripcion  text not null check (length(descripcion) between 1 and 200),
  pista        text check (pista is null or length(pista) <= 120),
  meta         int not null check (meta between 1 and 10000),
  recompensa   text check (recompensa is null or length(recompensa) <= 60),
  orden        int not null default 0,
  activo       boolean not null default true
);
alter table public.logros enable row level security;
revoke all on public.logros from public, anon, authenticated;
grant select on public.logros to authenticated;
-- Los ocultos se leen por las funciones (mi_progreso_logros), que esconden nombre y descripción hasta ganarlos.
create policy logros_leer on public.logros for select to authenticated using (activo and not oculto);

insert into public.logros (clave, categoria, juego, rareza, nombre, descripcion, meta, recompensa, orden) values
  ('primeros-pasos',   'coleccion', null,          'comun',      'Primeros pasos',         'Termina tu primera partida.',                     1,   'Insignia común', 10),
  ('primera-victoria', 'coleccion', null,          'comun',      'Primera sangre',         'Gana tu primera partida.',                        1,   'Insignia común', 20),
  ('noche-completa',   'coleccion', null,          'comun',      'Noche completa',         'Juega 5 partidas en una misma noche.',            5,   'Insignia común', 30),
  ('polifacetico',     'coleccion', null,          'rara',       'Polifacético',           'Prueba 10 juegos distintos.',                     10,  'Insignia rara', 40),
  ('estratega',        'coleccion', null,          'rara',       'El estratega',           'Gana 10 partidas de deducción.',                  10,  'Insignia rara', 50),
  ('suertudo',         'coleccion', null,          'rara',       'Hijo de la suerte',      'Gana 10 partidas de azar.',                       10,  'Insignia rara', 60),
  ('mvp',              'coleccion', null,          'rara',       'MVP',                    'Sé el MVP de 5 partidas.',                        5,   'Insignia rara', 70),
  ('imparable',        'coleccion', null,          'epica',      'Imparable',              'Gana 5 partidas seguidas.',                       5,   'Insignia épica', 80),
  ('veterano',         'coleccion', null,          'epica',      'El veterano',            'Termina 100 partidas.',                           100, 'Insignia épica', 90),
  ('ya-eres-parte',    'colectivo', null,          'comun',      'Ya eres parte',          'Juega con 5 personas distintas.',                 5,   'Insignia común', 110),
  ('casa-llena',       'colectivo', null,          'rara',       'Casa llena',             'Termina una partida con 8 jugadores.',            1,   'Insignia rara', 120),
  ('popular',          'colectivo', null,          'epica',      'Popular',                'Juega con 15 personas distintas.',                15,  'Insignia épica', 130),
  ('dupla',            'colectivo', null,          'rara',       'La dupla perfecta',      'Gana 5 partidas con la misma pareja.',            5,   'Insignia rara', 140),
  ('los-de-siempre',   'colectivo', null,          'epica',      'Los de siempre',         'Juega 20 partidas con el mismo equipo.',          20,  'Insignia épica', 150),
  ('campeon-noche',    'colectivo', null,          'rara',       'Campeón de la noche',    'Gana la copa individual de una noche.',           1,   'Insignia rara', 160),
  ('cara-de-poker',    'minijuego', 'impostor',    'rara',       'Cara de póker',          'Gana una partida siendo el impostor.',            1,   'Insignia rara', 210),
  ('detective',        'minijuego', 'impostor',    'comun',      'Detective',              'Vota por el impostor 5 veces.',                   5,   'Insignia común', 220),
  ('valiente',         'minijuego', 'verdad-reto', 'comun',      'Valiente',               'Elige reto 10 veces en Verdad o reto.',           10,  'Insignia común', 230);

-- ============ 2) Logros de cada cuenta ============
create table public.logros_jugador (
  jugador    uuid not null references public.perfiles (id) on delete cascade,
  logro      text not null references public.logros (clave) on delete cascade,
  creado     timestamptz not null default now(),
  visto      boolean not null default false,
  destacado  boolean not null default false,
  primary key (jugador, logro)
);
alter table public.logros_jugador enable row level security;
revoke all on public.logros_jugador from public, anon, authenticated;
grant select on public.logros_jugador to authenticated;
create policy logros_jugador_leer on public.logros_jugador for select to authenticated using (jugador = (select auth.uid()));

-- ============ 3) Progreso y entrega ============
create function privado.progreso_logros(p_jugador uuid) returns table (clave text, va int)
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
    ('cara-de-poker',    (select count(*) from gano where juego = 'impostor' and datos -> 'impostor' = 'true'::jsonb)),
    ('detective',        (select coalesce(sum((datos ->> 'votoImpostor')::int), 0) from r where juego = 'impostor' and jsonb_typeof(datos -> 'votoImpostor') = 'number')),
    ('valiente',         (select coalesce(sum((datos ->> 'reto')::int), 0) from r where juego = 'verdad-reto' and jsonb_typeof(datos -> 'reto') = 'number'))
  ) x(clave, va) $$;
revoke all on function privado.progreso_logros(uuid) from public, anon, authenticated;

-- Entrega los logros activos ya cumplidos que la cuenta todavía no tenía. Devuelve cuántos entregó.
create function privado.revisar_logros(p_jugador uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if p_jugador is null or exists (select 1 from public.perfiles p where p.id = p_jugador and p.invitado) then return 0; end if;
  insert into public.logros_jugador (jugador, logro)
    select p_jugador, l.clave from privado.progreso_logros(p_jugador) g join public.logros l on l.clave = g.clave
    where l.activo and g.va >= l.meta
    on conflict (jugador, logro) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function privado.revisar_logros(uuid) from public, anon, authenticated;

-- ============ 4) Disparadores ============
create function privado.tras_resultado() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    perform privado.revisar_logros(new.jugador);
  exception when others then
    raise warning 'revisar_logros: %', sqlerrm;
  end;
  return null;
end $$;
revoke all on function privado.tras_resultado() from public, anon, authenticated;
create trigger logros_tras_resultado after insert on public.resultados_partida for each row execute function privado.tras_resultado();
create trigger logros_tras_copa after insert on public.copas_noche for each row execute function privado.tras_resultado();

-- ============ 5) Lecturas ============
-- Avance de todos los logros de la cuenta. Los ocultos que no ha ganado salen sin nombre ni descripción (etapa 2).
create function public.mi_progreso_logros()
returns table (clave text, categoria text, juego text, rareza text, oculto boolean, nombre text, descripcion text, pista text,
               meta int, va int, recompensa text, ganado timestamptz, destacado boolean, orden int)
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  return query
    select l.clave, l.categoria, l.juego, l.rareza, l.oculto,
           case when l.oculto and lj.logro is null then null else l.nombre end,
           case when l.oculto and lj.logro is null then null else l.descripcion end,
           l.pista, l.meta, least(coalesce(g.va, 0), l.meta), l.recompensa, lj.creado, coalesce(lj.destacado, false), l.orden
    from public.logros l
    left join privado.progreso_logros(v_uid) g on g.clave = l.clave
    left join public.logros_jugador lj on lj.jugador = v_uid and lj.logro = l.clave
    where l.activo
    order by l.orden;
end $$;
revoke all on function public.mi_progreso_logros() from public, anon;
grant execute on function public.mi_progreso_logros() to authenticated;

-- Los logros que la cuenta ganó y todavía no vio en el aviso. Los marca vistos.
create function public.mis_logros_nuevos()
returns table (clave text, nombre text, rareza text, oculto boolean, recompensa text, creado timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  perform privado.revisar_logros(v_uid);
  return query
    with n as (update public.logros_jugador lj set visto = true where lj.jugador = v_uid and not lj.visto returning lj.logro, lj.creado)
    select l.clave, l.nombre, l.rareza, l.oculto, l.recompensa, n.creado from n join public.logros l on l.clave = n.logro
    order by n.creado, l.orden limit 20;
end $$;
revoke all on function public.mis_logros_nuevos() from public, anon;
grant execute on function public.mis_logros_nuevos() to authenticated;

-- Para la TV: lo que ganaron en los últimos 10 minutos los miembros de la sala. Solo miembros de la sala.
create function public.logros_recientes_sala(p_evento uuid)
returns table (jugador uuid, apodo text, clave text, nombre text, rareza text, creado timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'sin sesión'; end if;
  if not privado.es_miembro(p_evento) then raise exception 'sin permiso'; end if;
  return query
    select lj.jugador, p.nombre, l.clave, l.nombre, l.rareza, lj.creado
    from public.logros_jugador lj
    join public.miembros_evento m on m.evento = p_evento and m.jugador = lj.jugador
    join public.logros l on l.clave = lj.logro
    join public.perfiles p on p.id = lj.jugador
    where lj.creado > now() - interval '10 minutes'
    order by lj.creado limit 30;
end $$;
revoke all on function public.logros_recientes_sala(uuid) from public, anon;
grant execute on function public.logros_recientes_sala(uuid) to authenticated;

-- Hasta 3 logros destacados (Maestro v1.21 (3)).
create function public.destacar_logro(p_clave text, p_si boolean) returns int
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_n int;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if p_si is null then raise exception 'valor no válido'; end if;
  if not exists (select 1 from public.logros_jugador lj where lj.jugador = v_uid and lj.logro = p_clave) then raise exception 'logro no ganado'; end if;
  if p_si and not exists (select 1 from public.logros_jugador lj where lj.jugador = v_uid and lj.logro = p_clave and lj.destacado) then
    select count(*) into v_n from public.logros_jugador lj where lj.jugador = v_uid and lj.destacado;
    if v_n >= 3 then raise exception 'máximo 3 destacados'; end if;
  end if;
  update public.logros_jugador set destacado = p_si where jugador = v_uid and logro = p_clave;
  select count(*) into v_n from public.logros_jugador lj where lj.jugador = v_uid and lj.destacado;
  return v_n;
end $$;
revoke all on function public.destacar_logro(text, boolean) from public, anon;
grant execute on function public.destacar_logro(text, boolean) to authenticated;
