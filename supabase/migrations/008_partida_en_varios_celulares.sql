-- ALV · Partida en varios celulares (punto 4 de «Pendiente de la app").
-- El motor corre en la pantalla del anfitrión. Él publica lo público (lo ven todos los de la sala)
-- y el dato secreto de cada jugador (solo lo lee su dueño, por RLS de datos_privados).
-- Los celulares mandan sus respuestas a «acciones» (ya existía, con su RLS). Al terminar,
-- el servidor calcula la XP de cada jugador con su cuenta, con la misma fórmula y los mismos topes.

-- La fórmula de XP en un solo lugar (igual a xpDePartida en src/engine/economia.ts).
create function privado.xp_de_partida(p_rondas int, p_retos int, p_lugar int, p_jugadores int) returns int
language sql immutable set search_path = '' as $$
  select case when p_rondas < 5 then 0 else
    20 + 2 * least(p_rondas, 10) + 3 * p_retos
    + case when p_lugar <= (case when p_jugadores >= 6 then 3 when p_jugadores >= 4 then 2 else 1 end)
           then (array[15, 10, 5])[p_lugar] else 0 end
  end;
$$;
revoke execute on function privado.xp_de_partida(int, int, int, int) from public, anon, authenticated;

-- El anfitrión publica el estado público y los secretos. Solo avanza: una versión vieja no pisa a una nueva.
create function public.publicar_partida(p_partida uuid, p_version int, p_estado jsonb, p_privados jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_evento uuid; v_k text; v_v jsonb;
begin
  if (select auth.uid()) is null then raise exception 'sin sesión'; end if;
  select p.evento into v_evento from public.partidas p where p.id = p_partida and p.terminada is null;
  if v_evento is null then raise exception 'partida no válida'; end if;
  if not privado.es_anfitrion(v_evento) then raise exception 'sin permiso'; end if;
  if p_version is null or p_version < 1 then raise exception 'versión no válida'; end if;
  if jsonb_typeof(p_estado) <> 'object' or pg_column_size(p_estado) > 50000 then raise exception 'estado no válido'; end if;
  if jsonb_typeof(p_privados) <> 'object' then raise exception 'privados no válidos'; end if;

  update public.partidas set estado_publico = p_estado, version = p_version
    where id = p_partida and (version < p_version or estado_publico = '{}'::jsonb);
  if not found then return; end if;

  -- Cada secreto va solo a un miembro de la sala; lo de quien ya no está, se borra.
  delete from public.datos_privados d where d.partida = p_partida
    and not (d.jugador::text in (select jsonb_object_keys(p_privados)));
  for v_k, v_v in select key, value from jsonb_each(p_privados) loop
    if v_k !~ '^[0-9a-f-]{36}$' then continue; end if;
    if not exists (select 1 from public.miembros_evento m where m.evento = v_evento and m.jugador = v_k::uuid) then continue; end if;
    if pg_column_size(v_v) > 4000 then continue; end if;
    insert into public.datos_privados (partida, jugador, datos) values (p_partida, v_k::uuid, v_v)
      on conflict (partida, jugador) do update set datos = excluded.datos;
  end loop;
end $$;

-- Fin de la partida: se marca terminada y cada jugador con cuenta recibe su XP, calculada aquí.
-- p_resultados: [{ "jugador": uuid, "rondas": int, "retos": int, "lugar": int }]
create function public.terminar_partida_sala(p_partida uuid, p_juego text, p_jugadores int, p_resultados jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_evento uuid; r jsonb; v_j uuid; v_rondas int; v_retos int; v_lugar int; v_xp int; v_hoy int;
  v_juegos text[] := array['bienvenida', 'verdad-reto', 'conoces', 'mimica', 'prohibida', 'impostor', 'reto-lugar',
                           'lista', 'reloj', 'yo-nunca', 'mas-probable', 'que-prefieres', 'ruleta', 'dados-hot'];
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
    perform pg_advisory_xact_lock(hashtext('xp:' || v_j::text));
    select coalesce(sum(m.xp), 0) into v_hoy from public.movimientos_xp m
      where m.jugador = v_j and m.tipo = 'ganada' and m.creado >= date_trunc('day', now());
    v_xp := least(v_xp, greatest(0, 600 - v_hoy));
    if v_xp <= 0 then continue; end if;
    insert into public.movimientos_xp (jugador, tipo, xp, evento, partida, xp_de_evento, motivo)
      values (v_j, 'ganada', v_xp, v_evento, p_partida, v_xp, 'partida:' || p_juego);
  end loop;
end $$;

revoke execute on function public.publicar_partida(uuid, int, jsonb, jsonb) from public, anon;
grant execute on function public.publicar_partida(uuid, int, jsonb, jsonb) to authenticated;
revoke execute on function public.terminar_partida_sala(uuid, text, int, jsonb) from public, anon;
grant execute on function public.terminar_partida_sala(uuid, text, int, jsonb) to authenticated;
