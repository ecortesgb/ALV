-- 054 · ALVacío (minijuego de la plataforma) con XP desde la sala de ALV (Elías, 27 nov 2026: «se agrega a ALV PARTY
-- como mini juego con experiencia, monedas y puntos»). Igual que la 049 (mismas validaciones, tope de 600 XP al día,
-- monedas y resultados) y además acepta 'mj-plataforma'. Sin tablas ni permisos nuevos.
-- Si otra migración posterior redefine terminar_partida_sala, debe conservar los 6 ids mj-*.

create or replace function public.terminar_partida_sala(p_partida uuid, p_juego text, p_jugadores integer, p_resultados jsonb)
returns void language plpgsql security definer set search_path to '' as $$
declare
  v_evento uuid; r jsonb; v_j uuid; v_rondas int; v_retos int; v_lugar int; v_xp int; v_hoy int;
  v_juegos text[] := array['bienvenida', 'verdad-reto', 'conoces', 'mimica', 'prohibida', 'impostor', 'reto-lugar',
                           'lista', 'reloj', 'yo-nunca', 'mas-probable', 'que-prefieres', 'ruleta', 'dados-hot', 'fisico',
                           'mj-bala', 'mj-desenfunda', 'mj-martillazo', 'mj-alto-total', 'mj-paracaidas', 'mj-plataforma'];
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
