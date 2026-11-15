-- 015 · Figuras 3D por cápsulas (modelo por capas versión 2 de Minifig Studio).
-- Cada jugador tiene hasta 3 cápsulas y una sola activa. La figura es el JSON de minifig-core (version = 2).
-- Leer: el dueño y quien comparte sala con él (igual que personajes). Escribir: solo el dueño.
-- La tabla vieja public.personajes se queda mientras ALV pasa al 3D.

create table public.figuras_jugador (
  jugador     uuid        not null references public.perfiles(id) on delete cascade,
  capsula     smallint    not null check (capsula between 1 and 3),
  nombre      text        not null default '' check (char_length(nombre) <= 24),
  figura      jsonb       not null check (
                jsonb_typeof(figura) = 'object'
                and figura ->> 'version' = '2'
                and pg_column_size(figura) <= 32768
              ),
  activa      boolean     not null default false,
  actualizado timestamptz not null default now(),
  primary key (jugador, capsula)
);

-- Una sola cápsula activa por jugador.
create unique index figuras_jugador_una_activa on public.figuras_jugador (jugador) where activa;

alter table public.figuras_jugador enable row level security;

revoke all on public.figuras_jugador from public, anon, authenticated;
grant select, insert, delete on public.figuras_jugador to authenticated;
grant update (nombre, figura, actualizado) on public.figuras_jugador to authenticated;

create policy figuras_leer on public.figuras_jugador for select to authenticated
  using (jugador = (select auth.uid()) or privado.comparten_evento(jugador));
create policy figuras_crear on public.figuras_jugador for insert to authenticated
  with check (jugador = (select auth.uid()));
create policy figuras_editar on public.figuras_jugador for update to authenticated
  using (jugador = (select auth.uid())) with check (jugador = (select auth.uid()));
create policy figuras_borrar on public.figuras_jugador for delete to authenticated
  using (jugador = (select auth.uid()));

-- Cambiar la cápsula activa. Solo esta función toca "activa" (el jugador no tiene permiso de update sobre esa columna).
create function public.activar_capsula(p_capsula smallint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := auth.uid();
begin
  if v_yo is null then raise exception 'sin sesión'; end if;
  if p_capsula is null or p_capsula not between 1 and 3 then raise exception 'cápsula no válida'; end if;
  if not exists (select 1 from public.figuras_jugador where jugador = v_yo and capsula = p_capsula)
    then raise exception 'esa cápsula está vacía'; end if;
  update public.figuras_jugador set activa = false where jugador = v_yo and activa and capsula <> p_capsula;
  update public.figuras_jugador set activa = true where jugador = v_yo and capsula = p_capsula;
end;
$$;

revoke execute on function public.activar_capsula(smallint) from public, anon, authenticated;
grant execute on function public.activar_capsula(smallint) to authenticated;
