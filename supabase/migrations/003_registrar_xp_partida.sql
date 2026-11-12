-- ALV · XP de cada partida a la cuenta (aplicada desde otro hilo el 12 de noviembre; se guarda aquí tal cual).
-- La base valida sesión, rango (0 a 200), tope diario de 600 y que el evento esté abierto si se indica.
create or replace function public.registrar_xp_partida(p_evento uuid, p_juego text, p_xp integer, p_motivo text default 'partida')
returns void
language plpgsql
security definer
set search_path = public, privado, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
  v_hoy integer;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if p_xp is null or p_xp < 0 or p_xp > 200 then raise exception 'xp no válida'; end if;
  if p_juego is null or char_length(trim(p_juego)) not between 1 and 60 then raise exception 'juego no válido'; end if;
  if p_evento is not null then
    if not privado.es_miembro(p_evento) then raise exception 'sin permiso'; end if;
    if exists (select 1 from public.eventos e where e.id = p_evento and e.cerrado) then raise exception 'evento cerrado'; end if;
  end if;
  perform pg_advisory_xact_lock(hashtext('xp:' || v_uid::text));
  select coalesce(sum(m.xp), 0) into v_hoy from public.movimientos_xp m
    where m.jugador = v_uid and m.tipo = 'ganada' and m.creado >= date_trunc('day', now());
  if v_hoy + p_xp > 600 then raise exception 'tope diario alcanzado'; end if;
  insert into public.movimientos_xp (jugador, tipo, xp, evento, xp_de_evento, motivo)
    values (v_uid, 'ganada', p_xp, p_evento, case when p_evento is null then 0 else p_xp end, left(trim(coalesce(p_motivo, 'partida')), 60));
end;
$$;

revoke all on function public.registrar_xp_partida(uuid, text, integer, text) from public, anon;
grant execute on function public.registrar_xp_partida(uuid, text, integer, text) to authenticated;
