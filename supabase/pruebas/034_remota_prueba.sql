begin;
-- 034 · XP de acuerdo con lo jugado y nunca 0 (Maestro 6A.11 C7, decisión de Elías 2026-11-18).
-- Aplicada con autorización de Elías el 2026-11-18 («migra que la xp siempre se dé en cualquier plantilla»).
-- Antes: una partida de menos de 5 rondas daba 0 XP, en las dos rutas que acreditan XP:
--   · privado.xp_de_partida (008), que usa terminar_partida_sala (sala con anfitrión);
--   · public.registrar_partida (006), que usa cada jugador en un solo aparato (servicios/cuenta.ts).
-- Ahora cualquier juego con al menos una ronda da XP con la misma fórmula (20 por terminar + 2 por ronda hasta 10
-- rondas + 3 por reto + lugar). Sin rondas jugadas sigue en 0. Se conservan los topes: 600 XP por día y, en
-- registrar_partida, una partida por minuto. registrar_partida ahora llama a privado.xp_de_partida (una sola fórmula).
-- En src/engine/economia.ts, `minRondasParaContar` pasa a 1 (las fórmulas deben ser iguales).

create or replace function privado.xp_de_partida(p_rondas int, p_retos int, p_lugar int, p_jugadores int) returns int
language sql immutable set search_path = '' as $$
  select case when p_rondas < 1 then 0 else
    20 + 2 * least(p_rondas, 10) + 3 * p_retos
    + case when p_lugar <= (case when p_jugadores >= 6 then 3 when p_jugadores >= 4 then 2 else 1 end)
           then (array[15, 10, 5])[p_lugar] else 0 end
  end;
$$;
revoke execute on function privado.xp_de_partida(int, int, int, int) from public, anon, authenticated;

create or replace function public.registrar_partida(p_juego text, p_rondas int, p_retos int, p_lugar int, p_jugadores int, p_evento uuid default null)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_juegos text[] := array['bienvenida', 'verdad-reto', 'conoces', 'mimica', 'prohibida', 'impostor', 'reto-lugar',
                           'lista', 'reloj', 'yo-nunca', 'mas-probable', 'que-prefieres', 'ruleta', 'dados-hot'];
  v_xp int; v_hoy int; v_ultima timestamptz;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if p_juego is null or not (p_juego = any (v_juegos)) then raise exception 'juego no válido'; end if;
  if p_jugadores is null or p_jugadores not between 2 and 8 then raise exception 'jugadores no válidos'; end if;
  if p_rondas is null or p_rondas not between 0 and 40 then raise exception 'rondas no válidas'; end if;
  if p_lugar is null or p_lugar not between 1 and p_jugadores then raise exception 'lugar no válido'; end if;
  if p_retos is null or p_retos < 0 or p_retos > ceil(p_rondas::numeric / p_jugadores) then raise exception 'retos no válidos'; end if;
  if p_evento is not null then
    if not privado.es_miembro(p_evento) then raise exception 'sin permiso'; end if;
    if exists (select 1 from public.eventos e where e.id = p_evento and e.cerrado) then raise exception 'evento cerrado'; end if;
  end if;

  v_xp := privado.xp_de_partida(p_rondas, p_retos, p_lugar, p_jugadores);
  if v_xp <= 0 then return 0; end if;

  perform pg_advisory_xact_lock(hashtext('xp:' || v_uid::text));
  select max(m.creado) into v_ultima from public.movimientos_xp m
    where m.jugador = v_uid and m.tipo = 'ganada' and m.motivo like 'partida:%';
  if v_ultima is not null and v_ultima > now() - interval '60 seconds' then raise exception 'muy pronto'; end if;
  select coalesce(sum(m.xp), 0) into v_hoy from public.movimientos_xp m
    where m.jugador = v_uid and m.tipo = 'ganada' and m.creado >= date_trunc('day', now());
  if v_hoy + v_xp > 600 then raise exception 'tope diario alcanzado'; end if;

  insert into public.movimientos_xp (jugador, tipo, xp, evento, xp_de_evento, motivo)
    values (v_uid, 'ganada', v_xp, p_evento, case when p_evento is null then 0 else v_xp end, 'partida:' || p_juego);
  return v_xp;
end $$;
revoke execute on function public.registrar_partida(text, int, int, int, int, uuid) from public, anon;
grant execute on function public.registrar_partida(text, int, int, int, int, uuid) to authenticated;
create temp table _r (k text, v text) on commit drop;
grant all on _r to authenticated, anon;
insert into _r select 'f0', privado.xp_de_partida(0,0,1,4)::text;
insert into _r select 'f1', privado.xp_de_partida(1,0,1,4)::text;
insert into _r select 'f1_ultimo', privado.xp_de_partida(1,0,4,4)::text;
insert into _r select 'f5', privado.xp_de_partida(5,1,2,4)::text;
insert into _r select 'f12', privado.xp_de_partida(12,2,1,6)::text;
select set_config('request.jwt.claims', json_build_object('sub', (select id from public.perfiles where lower(nombre)='ecortes7'), 'role','authenticated')::text, true);
set local role authenticated;
insert into _r select 'registrar_1ronda', public.registrar_partida('impostor', 1, 0, 2, 4)::text;
insert into _r select 'privado_auth', (select has_function_privilege('privado.xp_de_partida(int,int,int,int)','execute'))::text;
reset role;
insert into _r select 'anon_registrar', has_function_privilege('anon','public.registrar_partida(text,int,int,int,int,uuid)','execute')::text;
insert into _r select 'auth_registrar', has_function_privilege('authenticated','public.registrar_partida(text,int,int,int,int,uuid)','execute')::text;
insert into _r select 'secdef', (select prosecdef::text from pg_proc where oid='public.registrar_partida(text,int,int,int,int,uuid)'::regprocedure);
select json_agg(json_build_array(k,v)) from _r;
rollback;
