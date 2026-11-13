-- ALV · Salir de una sala (evento) desde el celular. El anfitrión no sale: él cierra la sala con cerrar_evento.
create function public.salir_evento(p_evento uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if exists (select 1 from public.eventos e where e.id = p_evento and e.anfitrion = v_uid) then
    raise exception 'el anfitrión cierra la sala';
  end if;
  delete from public.miembros_evento m where m.evento = p_evento and m.jugador = v_uid;
end $$;
revoke execute on function public.salir_evento(uuid) from public, anon;
grant execute on function public.salir_evento(uuid) to authenticated;
