-- ALV · La XP de cada partida la calcula el servidor (punto 2 de «Pendiente de la app»).
-- Antes el celular mandaba la XP ya calculada. Ahora manda los hechos (juego, rondas, retos, lugar, jugadores);
-- la base revisa que tengan sentido y calcula con la misma fórmula que src/engine/economia.ts (xpDePartida).
-- Límite que queda: los hechos todavía los reporta el celular. Se cierra del todo cuando la partida corra
-- en la sala compartida (lobby con varios celulares), donde el servidor ve cada acción.

create function public.registrar_partida(p_juego text, p_rondas int, p_retos int, p_lugar int, p_jugadores int, p_evento uuid default null)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_juegos text[] := array['bienvenida', 'verdad-reto', 'conoces', 'mimica', 'prohibida', 'impostor', 'reto-lugar',
                           'lista', 'reloj', 'yo-nunca', 'mas-probable', 'que-prefieres', 'ruleta', 'dados-hot'];
  v_xp int; v_premiados int; v_hoy int; v_ultima timestamptz;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if p_juego is null or not (p_juego = any (v_juegos)) then raise exception 'juego no válido'; end if;
  if p_jugadores is null or p_jugadores not between 2 and 8 then raise exception 'jugadores no válidos'; end if;
  if p_rondas is null or p_rondas not between 0 and 40 then raise exception 'rondas no válidas'; end if;
  if p_lugar is null or p_lugar not between 1 and p_jugadores then raise exception 'lugar no válido'; end if;
  -- Un reto cumplido es un turno propio: no puede haber más que los turnos que le tocaron.
  if p_retos is null or p_retos < 0 or p_retos > ceil(p_rondas::numeric / p_jugadores) then raise exception 'retos no válidos'; end if;
  if p_evento is not null then
    if not privado.es_miembro(p_evento) then raise exception 'sin permiso'; end if;
    if exists (select 1 from public.eventos e where e.id = p_evento and e.cerrado) then raise exception 'evento cerrado'; end if;
  end if;

  -- Menos de 5 rondas no cuenta (igual que la app).
  if p_rondas < 5 then return 0; end if;

  v_premiados := case when p_jugadores >= 6 then 3 when p_jugadores >= 4 then 2 else 1 end;
  v_xp := 20 + 2 * least(p_rondas, 10) + 3 * p_retos
          + case when p_lugar <= v_premiados then (array[15, 10, 5])[p_lugar] else 0 end;

  perform pg_advisory_xact_lock(hashtext('xp:' || v_uid::text));
  -- Una partida de 5 rondas o más no termina en menos de un minuto.
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

-- XP extra del anfitrión (Maestro 12.3.1): de 1 a 200 por entrega y máximo 200 al día por jugador.
create function public.registrar_xp_extra(p_xp int, p_motivo text, p_evento uuid default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_extra_hoy int; v_hoy int;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if p_xp is null or p_xp not between 1 and 200 then raise exception 'xp no válida'; end if;
  if p_evento is not null then
    if not privado.es_miembro(p_evento) then raise exception 'sin permiso'; end if;
    if exists (select 1 from public.eventos e where e.id = p_evento and e.cerrado) then raise exception 'evento cerrado'; end if;
  end if;
  perform pg_advisory_xact_lock(hashtext('xp:' || v_uid::text));
  select coalesce(sum(m.xp) filter (where m.motivo like 'extra:%'), 0), coalesce(sum(m.xp), 0)
    into v_extra_hoy, v_hoy from public.movimientos_xp m
    where m.jugador = v_uid and m.tipo = 'ganada' and m.creado >= date_trunc('day', now());
  if v_extra_hoy + p_xp > 200 then raise exception 'tope de xp extra'; end if;
  if v_hoy + p_xp > 600 then raise exception 'tope diario alcanzado'; end if;
  insert into public.movimientos_xp (jugador, tipo, xp, evento, xp_de_evento, motivo)
    values (v_uid, 'ganada', p_xp, p_evento, case when p_evento is null then 0 else p_xp end,
            'extra:' || left(regexp_replace(trim(coalesce(p_motivo, '')), '\s+', ' ', 'g'), 50));
end $$;

revoke execute on function public.registrar_partida(text, int, int, int, int, uuid) from public, anon;
grant execute on function public.registrar_partida(text, int, int, int, int, uuid) to authenticated;
revoke execute on function public.registrar_xp_extra(int, text, uuid) from public, anon;
grant execute on function public.registrar_xp_extra(int, text, uuid) to authenticated;

-- La función anterior aceptaba cualquier XP de 0 a 200: ya nadie puede llamarla.
revoke execute on function public.registrar_xp_partida(uuid, text, integer, text) from authenticated;
