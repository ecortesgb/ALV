-- 040 · Resultados por jugador, copas de la noche y ranking (Ranking y Logros, etapa 1; Maestro v1.54, 14.3).
-- APLICADA en la base remota el 2026-11-23 con autorización de Elías («Sí, aplícala»), registrada como
-- 20261123153027 040_resultados_partida. Antes: prueba en transacción deshecha (supabase/pruebas/040_remota_prueba.sql)
-- y prueba local PGlite 23/23. Después, verificado con SELECT: 2 tablas nuevas con RLS y su política de lectura, las 4
-- funciones públicas solo para authenticated (anon no), privado.guardar_resultados y privado.visibles_ranking sin permiso
-- para nadie, anon sin lectura de resultados_partida, terminar_partida_sala con 'fisico' y resultados; mismos datos
-- (1 usuario, 1 perfil). Asesor de 35 a 39 avisos RPC: los 4 esperados.
--
-- 1) public.resultados_partida: una fila por cuenta registrada (no invitados, T7) al terminar cada partida. La escribe
--    solo terminar_partida_sala. Lo que no depende del aparato sale del arranque guardado en `acciones` (rondas
--    planeadas, modalidad, equipos, Drunk, herramienta) y de quién terminó antes de tiempo. El lugar competitivo, los
--    Puntos ALV y el MVP los calcula el servidor con las reglas D1, D9 y T1–T9. La XP y las monedas NO cambian (D0, D3).
-- 2) terminar_partida_sala: igual que en la 036 (mismo cálculo de XP, tope y monedas), acepta también 'fisico' (modos de
--    juego) y al final guarda los resultados. Si guardar resultados falla, la partida se cierra igual.
-- 3) public.copas_noche + guardar_copas(): los ganadores de la noche quedan guardados y la partida «copas» se termina
--    sin dar XP ni monedas.
-- 4) fijar_ranking_global(): opción «Aparecer en el ranking Global» (T8), guardada en preferencias_cuenta.
-- 5) ranking_jugadores() y ranking_grupos(): Global o Amigos Legendarios Verdaderos (D5, D8), con o sin temporada
--    (mes en hora de México, D2). Devuelven apodo, figura, nivel y totales; nunca fecha de nacimiento, género, invitados
--    ni filas de otros.
-- Riesgo aceptado (T15): los puntos de cada jugador los manda el aparato que cierra la partida, como hoy el lugar y la XP.

-- ============ Ayudante: entero dentro de un rango, o null ============
create function privado.entero(x jsonb, lo int, hi int) returns int
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(x) = 'number' and (x #>> '{}')::numeric between lo and hi
              then round((x #>> '{}')::numeric)::int end $$;

-- ============ 1) Resultados por jugador ============
create table public.resultados_partida (
  partida       uuid not null references public.partidas (id) on delete cascade,
  jugador       uuid not null references public.perfiles (id) on delete cascade,
  evento        uuid,
  juego         text not null check (juego ~ '^[a-z0-9-]{1,40}$'),
  modalidad     text not null default 'individual' check (modalidad in ('individual', 'parejas', 'equipos', 'sexos')),
  -- Ids de todos los integrantes del grupo (también invitados) ordenados y unidos con «+». Null en individual.
  grupo         text check (grupo is null or length(grupo) <= 400),
  puntos        int,                                  -- puntos del juego de este jugador (pueden faltar en aparatos viejos)
  puntos_grupo  int,
  lugar         smallint not null check (lugar between 1 and 8),   -- lugar competitivo de su unidad (1, 1, 3 en empates)
  unidades      smallint not null check (unidades between 1 and 8), -- jugadores o grupos que compitieron
  cuenta        boolean not null,                     -- si la partida da Puntos ALV (T2, T6, T9)
  puntos_alv    smallint not null default 0 check (puntos_alv between 0 and 3),
  mvp           boolean not null default false,
  rondas        smallint not null check (rondas between 0 and 40),
  rondas_plan   smallint check (rondas_plan between 1 and 40),
  retos         smallint not null default 0 check (retos between 0 and 40),
  datos         jsonb not null default '{}'::jsonb check (jsonb_typeof(datos) = 'object' and pg_column_size(datos) <= 1000),
  creada        timestamptz not null default now(),
  primary key (partida, jugador)
);
create index resultados_partida_jugador on public.resultados_partida (jugador, creada);
create index resultados_partida_creada on public.resultados_partida (creada);
alter table public.resultados_partida enable row level security;
revoke all on public.resultados_partida from public, anon, authenticated;
grant select on public.resultados_partida to authenticated;
create policy resultados_partida_leer on public.resultados_partida for select to authenticated using (jugador = (select auth.uid()));

-- Juegos por categoría (D10). Verdad o reto cuenta como azar solo con dados o ruleta.
create function privado.es_azar(p_juego text, p_datos jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select p_juego in ('ruleta', 'dados-hot') or (p_juego = 'verdad-reto' and (p_datos ->> 'herramienta') in ('dados', 'ruleta')) $$;
create function privado.es_deduccion(p_juego text) returns boolean
language sql immutable set search_path = '' as $$ select p_juego in ('impostor', 'mas-probable', 'conoces') $$;

-- Guarda los resultados de una partida. Solo la llama terminar_partida_sala (ya validó partida, anfitrión y juego).
create function privado.guardar_resultados(p_partida uuid, p_evento uuid, p_juego text, p_resultados jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_arr jsonb; v_cfg jsonb; v_plan int; v_mod text; v_drunk boolean; v_herr text; v_temprano boolean;
  v_rondas int; v_registrados int; v_unidades int; v_premiados int; v_cuenta boolean; v_con_puntos boolean; v_n int;
begin
  -- Arranque de la partida: la acción «arranque» que mandó el anfitrión o el coanfitrión.
  select a.datos into v_arr from public.acciones a join public.eventos e on e.id = p_evento
    where a.partida = p_partida and coalesce(a.datos ->> '_tipo', a.tipo) = 'control' and a.datos ->> 'que' = 'arranque'
      and a.jugador in (e.anfitrion, e.coanfitrion)
    order by a.n limit 1;
  v_cfg := case when jsonb_typeof(v_arr -> 'cfg') = 'object' then v_arr -> 'cfg' else '{}'::jsonb end;
  v_plan := privado.entero(v_arr -> 'rondas', 1, 40);
  v_mod := case when (v_cfg ->> 'modalidad') in ('parejas', 'equipos', 'sexos') then v_cfg ->> 'modalidad' else 'individual' end;
  v_drunk := coalesce(v_cfg -> 'drunk' = 'true'::jsonb, false);
  v_herr := case when (v_cfg #>> '{verdadReto,herramienta}') ~ '^[a-z]{1,20}$' then v_cfg #>> '{verdadReto,herramienta}' end;
  -- Terminada antes de tiempo = el anfitrión (o el coanfitrión) mandó «terminar».
  select exists (select 1 from public.acciones a join public.eventos e on e.id = p_evento
    where a.partida = p_partida and coalesce(a.datos ->> '_tipo', a.tipo) = 'control' and a.datos ->> 'que' = 'terminar'
      and a.jugador in (e.anfitrion, e.coanfitrion)) into v_temprano;

  create temp table if not exists _res (j uuid primary key, pts int, lug int, ron int, ret int, d jsonb, eq text, reg boolean,
    grp text, valor numeric, ulugar int, mvp boolean) on commit drop;
  truncate _res;

  insert into _res (j, pts, lug, ron, ret, d, reg)
  select distinct on (s.j) s.j, s.pts, s.lug, s.ron, s.ret, s.d, not coalesce(p.invitado, true)
  from (
    select case when x ->> 'jugador' ~ '^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$' then (x ->> 'jugador')::uuid end j,
           privado.entero(x -> 'puntos', -999, 999) pts, privado.entero(x -> 'lugar', 1, 8) lug,
           privado.entero(x -> 'rondas', 0, 40) ron, coalesce(privado.entero(x -> 'retos', 0, 40), 0) ret,
           case when jsonb_typeof(x -> 'datos') = 'object' then x -> 'datos' else '{}'::jsonb end d
    from jsonb_array_elements(p_resultados) x
  ) s
  join public.miembros_evento m on m.evento = p_evento and m.jugador = s.j
  left join public.perfiles p on p.id = s.j
  where s.j is not null;

  get diagnostics v_n = row_count;
  if v_n = 0 then return 0; end if;

  -- Grupo de cada quien, del arranque (solo en parejas, equipos o ALVersus).
  if v_mod <> 'individual' and jsonb_typeof(v_cfg -> 'jugadores') = 'array' then
    update _res r set eq = c.eq from (
      select y ->> 'id' id, nullif(left(y ->> 'equipo', 40), '') eq from jsonb_array_elements(v_cfg -> 'jugadores') y
    ) c where c.id = r.j::text;
  end if;
  update _res r set grp = g.k from (
    select eq, string_agg(j::text, '+' order by j::text) k from _res where eq is not null group by eq
  ) g where g.eq = r.eq;

  -- Valor para ordenar: puntos (propios o del grupo). Si falta algún puntaje (aparato viejo), el lugar que mandó.
  v_con_puntos := not exists (select 1 from _res where pts is null);
  if v_con_puntos then
    update _res r set valor = coalesce((select sum(x.pts) from _res x where x.eq = r.eq), r.pts);
  else
    update _res r set valor = -coalesce(r.lug, 8);
  end if;

  -- Lugar por unidad (jugador o grupo), con empates 1, 1, 3 (T1). Las unidades sin grupo son jugadores sueltos.
  with u as (select coalesce(eq, j::text) k, max(valor) v from _res group by 1),
       l as (select k, rank() over (order by v desc) lugar from u)
  update _res r set ulugar = l.lugar from l where l.k = coalesce(r.eq, r.j::text);
  select count(distinct coalesce(eq, j::text)) into v_unidades from _res;
  v_premiados := case when v_unidades >= 6 then 3 when v_unidades >= 4 then 2 else 1 end;   -- T3: misma regla que la XP

  select coalesce(max(ron), 0), count(*) filter (where reg) into v_rondas, v_registrados from _res;
  -- T2, T6, T9: cuenta si no es Bienvenida, hay 2+ cuentas registradas, se jugó al menos 1 ronda y, si se terminó
  -- antes de tiempo, al menos la mitad de lo planeado y un mínimo de 3. Una partida que acaba sola (El impostor al
  -- atrapar a todos) cuenta completa.
  v_cuenta := p_juego <> 'bienvenida' and v_registrados >= 2 and v_rondas >= 1
              and (not v_temprano or v_rondas >= greatest(3, ceil(coalesce(v_plan, 6) / 2.0)));

  -- MVP (D1, T14): el de más puntos; en grupos, entre los integrantes de los grupos en 1.º. Empates: compartido.
  -- En individual, lugar 1 ya es «el de más puntos»; en grupos, son los integrantes de los grupos en 1.º.
  update _res set mvp = false;
  if v_con_puntos then
    update _res r set mvp = true
    where r.ulugar = 1 and r.pts > 0 and r.pts = (select max(x.pts) from _res x where x.ulugar = 1);
  end if;

  insert into public.resultados_partida (partida, jugador, evento, juego, modalidad, grupo, puntos, puntos_grupo, lugar, unidades,
    cuenta, puntos_alv, mvp, rondas, rondas_plan, retos, datos)
  select p_partida, r.j, p_evento, p_juego, v_mod, r.grp, r.pts,
         case when r.eq is not null and v_con_puntos then r.valor::int end,
         least(r.ulugar, 8), v_unidades, v_cuenta,
         case when v_cuenta and r.ulugar <= v_premiados then 4 - r.ulugar else 0 end,
         r.mvp, coalesce(r.ron, v_rondas), v_plan, least(r.ret, 40),
         jsonb_strip_nulls(jsonb_build_object(
           'impostor',     case when jsonb_typeof(r.d -> 'impostor') = 'boolean' then r.d -> 'impostor' end,
           'atrapado',     case when jsonb_typeof(r.d -> 'atrapado') = 'boolean' then r.d -> 'atrapado' end,
           'votoImpostor', privado.entero(r.d -> 'votoImpostor', 0, 40),
           'votosRecibidos', privado.entero(r.d -> 'votosRecibidos', 0, 40),
           'reto',         privado.entero(r.d -> 'reto', 0, 40),
           'peorLugar',    privado.entero(r.d -> 'peorLugar', 1, 8),
           'tomo',         case when v_drunk then privado.entero(r.d -> 'tomo', 0, 40) end,   -- D7: solo con Drunk
           'drunk',        case when v_drunk then true end,
           'herramienta',  v_herr))
  from _res r where r.reg
  on conflict (partida, jugador) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function privado.guardar_resultados(uuid, uuid, text, jsonb) from public, anon, authenticated;

-- ============ 2) terminar_partida_sala (igual que la 036 + 'fisico' + resultados) ============
create or replace function public.terminar_partida_sala(p_partida uuid, p_juego text, p_jugadores integer, p_resultados jsonb)
returns void language plpgsql security definer set search_path to '' as $$
declare
  v_evento uuid; r jsonb; v_j uuid; v_rondas int; v_retos int; v_lugar int; v_xp int; v_hoy int;
  v_juegos text[] := array['bienvenida', 'verdad-reto', 'conoces', 'mimica', 'prohibida', 'impostor', 'reto-lugar',
                           'lista', 'reloj', 'yo-nunca', 'mas-probable', 'que-prefieres', 'ruleta', 'dados-hot', 'fisico'];
begin
  if (select auth.uid()) is null then raise exception 'sin sesión'; end if;
  select p.evento into v_evento from public.partidas p where p.id = p_partida and p.terminada is null;
  if v_evento is null then raise exception 'partida no válida'; end if;
  if not privado.es_anfitrion(v_evento) then raise exception 'sin permiso'; end if;
  if p_juego is null or not (p_juego = any (v_juegos)) then raise exception 'juego no válido'; end if;
  if p_jugadores is null or p_jugadores not between 2 and 8 then raise exception 'jugadores no válidos'; end if;
  if jsonb_typeof(p_resultados) <> 'array' or jsonb_array_length(p_resultados) > 8 then raise exception 'resultados no válidos'; end if;

  update public.partidas set terminada = now() where id = p_partida;

  for r in select value from jsonb_array_elements(p_resultados) loop
    begin
      v_j := (r ->> 'jugador')::uuid;
      v_rondas := (r ->> 'rondas')::int; v_retos := (r ->> 'retos')::int; v_lugar := (r ->> 'lugar')::int;
    exception when others then continue;
    end;
    if not exists (select 1 from public.miembros_evento m where m.evento = v_evento and m.jugador = v_j) then continue; end if;
    if v_rondas is null or v_rondas not between 0 and 40 then continue; end if;
    if v_lugar is null or v_lugar not between 1 and p_jugadores then continue; end if;
    if v_retos is null or v_retos < 0 or v_retos > ceil(v_rondas::numeric / p_jugadores) then continue; end if;
    v_xp := privado.xp_de_partida(v_rondas, v_retos, v_lugar, p_jugadores);
    if v_xp <= 0 then continue; end if;
    -- Monedas (036): aunque la XP del día ya esté en su tope.
    perform privado.dar_monedas_partida(v_j, v_lugar, p_jugadores, p_partida, p_juego);
    perform pg_advisory_xact_lock(hashtext('xp:' || v_j::text));
    select coalesce(sum(m.xp), 0) into v_hoy from public.movimientos_xp m
      where m.jugador = v_j and m.tipo = 'ganada' and m.creado >= date_trunc('day', now());
    v_xp := least(v_xp, greatest(0, 600 - v_hoy));
    if v_xp <= 0 then continue; end if;
    insert into public.movimientos_xp (jugador, tipo, xp, evento, partida, xp_de_evento, motivo)
      values (v_j, 'ganada', v_xp, v_evento, p_partida, v_xp, 'partida:' || p_juego);
  end loop;

  -- Resultados (040). Un error aquí no deshace la XP ni las monedas de arriba.
  begin
    perform privado.guardar_resultados(p_partida, v_evento, p_juego, p_resultados);
  exception when others then
    raise warning 'guardar_resultados: %', sqlerrm;
  end;
end $$;

-- ============ 3) Copas de la noche ============
-- Una fila por jugador ganador, para que borrar una cuenta borre también sus filas (on delete cascade).
create table public.copas_noche (
  evento     uuid not null references public.eventos (id) on delete cascade,
  partida    uuid not null references public.partidas (id) on delete cascade,
  categoria  text not null check (categoria in ('individual', 'parejas', 'equipos', 'alversus')),
  lugar      smallint not null check (lugar between 1 and 8),
  grupo      smallint not null default 0 check (grupo between 0 and 8),   -- en grupos empatados, cuál de ellos
  nombre     text check (nombre is null or length(nombre) <= 60),
  jugador    uuid not null references public.perfiles (id) on delete cascade,
  puntos     int not null check (puntos between -9999 and 9999),
  creada     timestamptz not null default now(),
  primary key (evento, categoria, grupo, jugador)
);
alter table public.copas_noche enable row level security;
revoke all on public.copas_noche from public, anon, authenticated;
grant select on public.copas_noche to authenticated;
create policy copas_noche_leer on public.copas_noche for select to authenticated using (privado.es_miembro(evento));

-- La llama el anfitrión al entregar las copas: guarda los ganadores y termina la partida «copas» (sin XP ni monedas).
-- p_copas: { individual: [{id, lugar, puntos}], parejas|equipos|alversus: [{nombre, jugadores: [ids], puntos}] }
create function public.guardar_copas(p_partida uuid, p_copas jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare v_evento uuid; v_cat text; g jsonb; i int; v_n int := 0; x jsonb;
begin
  if (select auth.uid()) is null then raise exception 'sin sesión'; end if;
  select p.evento into v_evento from public.partidas p where p.id = p_partida and p.terminada is null and p.juego = 'copas';
  if v_evento is null then raise exception 'partida no válida'; end if;
  if not privado.es_anfitrion(v_evento) then raise exception 'sin permiso'; end if;
  if p_copas is null or jsonb_typeof(p_copas) <> 'object' or pg_column_size(p_copas) > 8000 then raise exception 'copas no válidas'; end if;

  delete from public.copas_noche where evento = v_evento;
  if jsonb_typeof(p_copas -> 'individual') = 'array' then
    for x in select value from jsonb_array_elements(p_copas -> 'individual') limit 8 loop
      if x ->> 'id' !~ '^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$' then continue; end if;
      if privado.entero(x -> 'lugar', 1, 3) is null or privado.entero(x -> 'puntos', -9999, 9999) is null then continue; end if;
      insert into public.copas_noche (evento, partida, categoria, lugar, jugador, puntos)
        select v_evento, p_partida, 'individual', privado.entero(x -> 'lugar', 1, 3), m.jugador, privado.entero(x -> 'puntos', -9999, 9999)
        from public.miembros_evento m where m.evento = v_evento and m.jugador = (x ->> 'id')::uuid
        on conflict do nothing;
      get diagnostics i = row_count; v_n := v_n + i;
    end loop;
  end if;
  foreach v_cat in array array['parejas', 'equipos', 'alversus'] loop
    if jsonb_typeof(p_copas -> v_cat) <> 'array' then continue; end if;
    i := 0;
    for g in select value from jsonb_array_elements(p_copas -> v_cat) limit 8 loop
      i := i + 1;
      if jsonb_typeof(g -> 'jugadores') <> 'array' or privado.entero(g -> 'puntos', -9999, 9999) is null then continue; end if;
      insert into public.copas_noche (evento, partida, categoria, lugar, grupo, nombre, jugador, puntos)
        select v_evento, p_partida, v_cat, 1, i, left(g ->> 'nombre', 60), m.jugador, privado.entero(g -> 'puntos', -9999, 9999)
        from jsonb_array_elements_text(g -> 'jugadores') t(id)
        join public.miembros_evento m on m.evento = v_evento and m.jugador::text = t.id
        on conflict do nothing;
    end loop;
  end loop;
  select count(*) into v_n from public.copas_noche where evento = v_evento;
  update public.partidas set terminada = now() where id = p_partida;
  return v_n;
end $$;
revoke all on function public.guardar_copas(uuid, jsonb) from public, anon;
grant execute on function public.guardar_copas(uuid, jsonb) to authenticated;

-- ============ 4) Privacidad del ranking (T8) ============
create function public.fijar_ranking_global(p_visible boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_res jsonb;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if p_visible is null then raise exception 'valor no válido'; end if;
  insert into public.preferencias_cuenta as pc (jugador, datos, actualizado)
    values (v_uid, jsonb_build_object('rankingGlobal', p_visible), now())
    on conflict (jugador) do update set datos = pc.datos || excluded.datos, actualizado = now()
    returning pc.datos into v_res;
  return v_res;
end $$;
revoke all on function public.fijar_ranking_global(boolean) from public, anon;
grant execute on function public.fijar_ranking_global(boolean) to authenticated;

-- ============ 5) Ranking ============
-- Temporada actual: el mes calendario en hora de México (D2).
create function privado.temporada_actual() returns tstzrange
language sql stable set search_path = '' as $$
  select tstzrange(date_trunc('month', now() at time zone 'America/Mexico_City') at time zone 'America/Mexico_City',
                   (date_trunc('month', now() at time zone 'America/Mexico_City') + interval '1 month') at time zone 'America/Mexico_City', '[)') $$;

-- Quiénes salen en el ranking: cuentas registradas. «amigos» = yo y con quien compartí sala (D5).
-- «global» = todos los que no apagaron «Aparecer en el ranking Global» (T8); yo siempre me veo.
create function privado.visibles_ranking(p_filtro text) returns table (id uuid)
language sql stable security definer set search_path = '' as $$
  select p.id from public.perfiles p
  where not p.invitado and (
    p.id = (select auth.uid())
    or (p_filtro = 'amigos' and exists (
          select 1 from public.miembros_evento a join public.miembros_evento b on a.evento = b.evento
          where a.jugador = (select auth.uid()) and b.jugador = p.id))
    or (p_filtro = 'global' and coalesce((select pc.datos -> 'rankingGlobal' = 'false'::jsonb from public.preferencias_cuenta pc where pc.jugador = p.id), false) = false)
  ) $$;
revoke all on function privado.visibles_ranking(text) from public, anon, authenticated;

create function public.ranking_jugadores(p_filtro text, p_temporada boolean default false)
returns table (posicion int, id uuid, nombre text, nivel int, figura jsonb, puntos_alv int, victorias int, partidas int,
               mvp int, racha int, juegos int, victorias_azar int, victorias_deduccion int)
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_t tstzrange := privado.temporada_actual();
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if p_filtro is null or p_filtro not in ('amigos', 'global') then raise exception 'filtro no válido'; end if;
  return query
  with vis as (select v.id from privado.visibles_ranking(p_filtro) v),
  r as (select rp.* from public.resultados_partida rp join vis on vis.id = rp.jugador
        where not coalesce(p_temporada, false) or rp.creada <@ v_t),
  agg as (select r.jugador, sum(r.puntos_alv)::int pa,
            count(*) filter (where r.cuenta and r.lugar = 1)::int vic, count(*)::int pj,
            count(*) filter (where r.cuenta and r.mvp)::int mv, count(distinct r.juego)::int jg,
            count(*) filter (where r.cuenta and r.lugar = 1 and privado.es_azar(r.juego, r.datos))::int va,
            count(*) filter (where r.cuenta and r.lugar = 1 and privado.es_deduccion(r.juego))::int vd
          from r group by r.jugador),
  -- Racha (T12): victorias seguidas entre partidas que cuentan.
  ra as (select b.jugador, max(b.n)::int racha from (
           select a.jugador, count(*) n from (
             select r.jugador, r.lugar = 1 gano,
                    row_number() over (partition by r.jugador order by r.creada) - row_number() over (partition by r.jugador, r.lugar = 1 order by r.creada) g
             from r where r.cuenta) a
           where a.gano group by a.jugador, a.g) b group by b.jugador),
  t as (select vis.id, coalesce(agg.pa, 0) pa, coalesce(agg.vic, 0) vic, coalesce(agg.pj, 0) pj, coalesce(agg.mv, 0) mv,
               coalesce(ra.racha, 0) rc, coalesce(agg.jg, 0) jg, coalesce(agg.va, 0) va, coalesce(agg.vd, 0) vd,
               rank() over (order by coalesce(agg.pa, 0) desc, coalesce(agg.vic, 0) desc)::int pos
        from vis left join agg on agg.jugador = vis.id left join ra on ra.jugador = vis.id)
  select t.pos, t.id, p.nombre, public.nivel_por_xp(s.acumulada),
         (select f.figura from public.figuras_jugador f where f.jugador = t.id and f.activa limit 1),
         t.pa, t.vic, t.pj, t.mv, t.rc, t.jg, t.va, t.vd
  from t join public.perfiles p on p.id = t.id cross join lateral privado.saldos_de(t.id) s
  where t.pos <= 100 or t.id = v_uid
  order by t.pos, p.nombre;
end $$;
revoke all on function public.ranking_jugadores(text, boolean) from public, anon;
grant execute on function public.ranking_jugadores(text, boolean) to authenticated;

-- Parejas o equipos reconocidos por sus integrantes (D4). Los bandos de ALVersus no tienen ranking (T5); los grupos con
-- invitados o con alguien fuera del filtro no salen (T7, T8).
create function public.ranking_grupos(p_modalidad text, p_filtro text, p_temporada boolean default false)
returns table (posicion int, integrantes uuid[], nombres text[], puntos_alv int, victorias int, partidas int, porcentaje int, racha int)
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_t tstzrange := privado.temporada_actual();
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if p_modalidad is null or p_modalidad not in ('parejas', 'equipos') then raise exception 'modalidad no válida'; end if;
  if p_filtro is null or p_filtro not in ('amigos', 'global') then raise exception 'filtro no válido'; end if;
  return query
  with vis as (select v.id from privado.visibles_ranking(p_filtro) v),
  -- Una fila por partida y grupo.
  pg as (select distinct on (rp.partida, rp.grupo) rp.partida, rp.grupo, rp.lugar, rp.puntos_alv, rp.cuenta, rp.creada
         from public.resultados_partida rp
         where rp.modalidad = p_modalidad and rp.grupo is not null
           and (not coalesce(p_temporada, false) or rp.creada <@ v_t)),
  -- Grupos cuyos integrantes son todos cuentas registradas y visibles.
  ok as (select g.grupo, array_agg(x.id::uuid order by x.id) ids from (select distinct pg.grupo from pg) g
           cross join lateral unnest(string_to_array(g.grupo, '+')) x(id)
         group by g.grupo
         having bool_and(exists (select 1 from vis where vis.id::text = x.id))),
  agg as (select pg.grupo, sum(pg.puntos_alv)::int pa, count(*) filter (where pg.cuenta and pg.lugar = 1)::int vic,
            count(*) filter (where pg.cuenta)::int pc, count(*)::int pj
          from pg join ok on ok.grupo = pg.grupo group by pg.grupo),
  ra as (select b.grupo, max(b.n)::int racha from (
           select a.grupo, count(*) n from (
             select pg.grupo, pg.lugar = 1 gano,
                    row_number() over (partition by pg.grupo order by pg.creada) - row_number() over (partition by pg.grupo, pg.lugar = 1 order by pg.creada) g
             from pg join ok on ok.grupo = pg.grupo where pg.cuenta) a
           where a.gano group by a.grupo, a.g) b group by b.grupo)
  select rank() over (order by agg.pa desc, agg.vic desc)::int, ok.ids,
         (select array_agg(p.nombre order by p.id) from public.perfiles p where p.id = any (ok.ids)),
         agg.pa, agg.vic, agg.pj, case when agg.pc > 0 then round(100.0 * agg.vic / agg.pc)::int else 0 end, coalesce(ra.racha, 0)
  from agg join ok on ok.grupo = agg.grupo left join ra on ra.grupo = agg.grupo
  order by 1 limit 100;
end $$;
revoke all on function public.ranking_grupos(text, text, boolean) from public, anon;
grant execute on function public.ranking_grupos(text, text, boolean) to authenticated;
