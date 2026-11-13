-- 009 · Registro con fecha de nacimiento y género.
-- La fecha y el género son privados: viven en su propia tabla, que solo lee su dueño.
-- (perfiles la leen los demás jugadores de la sala, por eso no van ahí.)
-- Nadie los escribe directo: solo la función guardar_registro, que valida todo dentro.
-- mayor_18 deja de ser editable por el jugador: lo calcula el servidor con la fecha de nacimiento.

create table public.datos_cuenta (
  jugador uuid primary key references public.perfiles (id) on delete cascade,
  nacimiento date not null,
  genero text not null check (genero in ('hombre', 'mujer', 'otro')),
  creado timestamptz not null default now()
);

alter table public.datos_cuenta enable row level security;
revoke all on public.datos_cuenta from anon, authenticated;
grant select on public.datos_cuenta to authenticated;
create policy datos_cuenta_leer on public.datos_cuenta for select to authenticated using (jugador = (select auth.uid()));
-- Sin políticas de crear, editar ni borrar: solo la función de abajo escribe.

-- Antes cada jugador podía marcarse mayor de edad. Ahora solo puede cambiar su nombre.
revoke update on public.perfiles from authenticated;
grant update (nombre) on public.perfiles to authenticated;

/**
 * Guarda la fecha de nacimiento y el género del jugador con sesión.
 * La fecha se fija una sola vez (no se puede cambiar después para saltarse la edad); el género sí se puede cambiar.
 * Devuelve si es mayor de 18.
 */
create or replace function public.guardar_registro(p_nacimiento date, p_genero text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := auth.uid();
  v_nac date;
  v_mayor boolean;
begin
  if v_yo is null then raise exception 'sin sesión'; end if;
  if p_genero is null or p_genero not in ('hombre', 'mujer', 'otro') then raise exception 'género no válido'; end if;
  if p_nacimiento is null or p_nacimiento < date '1900-01-01' or p_nacimiento > (current_date - interval '6 years') then
    raise exception 'fecha no válida';
  end if;
  if not exists (select 1 from public.perfiles where id = v_yo) then raise exception 'sin perfil'; end if;

  insert into public.datos_cuenta (jugador, nacimiento, genero) values (v_yo, p_nacimiento, p_genero)
  on conflict (jugador) do update set genero = excluded.genero;

  select nacimiento into v_nac from public.datos_cuenta where jugador = v_yo;
  v_mayor := v_nac <= (current_date - interval '18 years');
  update public.perfiles set mayor_18 = v_mayor where id = v_yo;
  return v_mayor;
end;
$$;

revoke execute on function public.guardar_registro(date, text) from public, anon;
grant execute on function public.guardar_registro(date, text) to authenticated;
