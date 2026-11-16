-- 020 (alcance de D1, Maestro v1.25): ALV es solo para mayores de 18.
-- Nadie abre ni entra a una sala sin tener registrada una fecha de nacimiento de mayor de edad.
-- Se revisa en la base, no en el formulario: una solicitud manipulada recibe el mismo rechazo.
create or replace function privado.exigir_mayor() returns trigger
language plpgsql security definer set search_path to '' as $$
declare v_j uuid := coalesce(to_jsonb(new) ->> 'jugador', to_jsonb(new) ->> 'anfitrion')::uuid;
begin
  if not exists (select 1 from public.perfiles p where p.id = v_j and p.mayor_18 is true) then
    raise exception 'solo mayores de 18';
  end if;
  return new;
end $$;
revoke all on function privado.exigir_mayor() from public, anon, authenticated;

drop trigger if exists eventos_solo_mayores on public.eventos;
create trigger eventos_solo_mayores before insert on public.eventos
  for each row execute function privado.exigir_mayor();
drop trigger if exists miembros_solo_mayores on public.miembros_evento;
create trigger miembros_solo_mayores before insert on public.miembros_evento
  for each row execute function privado.exigir_mayor();
