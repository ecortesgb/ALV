-- Reversión de la 046 (corte de figuras a v3). NO CORRER sin autorización expresa de Elías (D-002).
-- Probada en local (PGlite, supabase/pruebas/046_local_pglite.mjs). Antes: avisar que las figuras v3 se retiran (quedan
-- guardadas en privado.figuras_jugador_v3_retiradas) y exportarlas también FUERA del repo.
-- Las cachés locales de los aparatos que tengan v3 no pueden volver a subirlas: el CHECK restaurado solo acepta version 2.

-- TODO en UNA transacción (en el editor SQL: begin; … commit;). App: al revertir se vuelve a publicar la versión que guarda
-- v2 (la última publicada antes del cambio «v3 directo»; anotar su commit en ALV_PLAN_FASE5.md al aplicar la 046).

-- 1) Detener TODAS las escrituras mientras se revierte (Codex, paso5-r1): bloqueo de las tablas antes de copiar, y fuera
--    los permisos de la tabla, los de columna (015/016) y activar_capsula().
lock table public.figuras_jugador, public.retos_figura in access exclusive mode;
revoke insert, update, delete on public.figuras_jugador from authenticated;
revoke update (nombre, figura, actualizado, jugador, capsula) on public.figuras_jugador from authenticated;
revoke execute on function public.activar_capsula(smallint) from authenticated;

-- 2) Exportar las v3 (respaldo dentro de la base)
create table if not exists privado.figuras_jugador_v3_retiradas (
  jugador uuid not null, capsula smallint not null, nombre text not null, figura jsonb not null,
  activa boolean not null, actualizado timestamptz not null, retirado timestamptz not null default now()
);
alter table privado.figuras_jugador_v3_retiradas enable row level security;
revoke all on table privado.figuras_jugador_v3_retiradas from public, anon, authenticated;
insert into privado.figuras_jugador_v3_retiradas (jugador, capsula, nombre, figura, activa, actualizado)
  select jugador, capsula, nombre, figura, activa, actualizado from public.figuras_jugador;

-- 3) Retirarlas
delete from public.figuras_jugador;

-- 4) CHECK de siempre (015)
alter table public.figuras_jugador drop constraint figuras_jugador_figura_v3;
alter table public.figuras_jugador add constraint figuras_jugador_figura_check check (
  jsonb_typeof(figura) = 'object' and figura ->> 'version' = '2' and pg_column_size(figura) <= 32768);

-- 5) Guardián de piezas como en la 033
create or replace function privado.validar_piezas_figura() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from unnest(privado.ids_de_figura(new.figura)) as i(id)
    join public.piezas_figura p on p.id = i.id and p.activo
    where not exists (select 1 from public.piezas_jugador j where j.jugador = new.jugador and j.pieza = i.id)
  ) then
    raise exception 'pieza bloqueada';
  end if;
  return new;
end;
$$;
revoke execute on function privado.validar_piezas_figura() from public, anon, authenticated;

-- 6) Retos que estaban activos antes del corte
update public.retos_figura r set activo = true from privado.retos_figura_corte_v3 c where c.id = r.id;

-- 7) Las figuras v2 de vuelta (con su activa)
insert into public.figuras_jugador (jugador, capsula, nombre, figura, activa, actualizado)
  select v.jugador, v.capsula, v.nombre, v.figura, v.activa, v.actualizado from privado.figuras_jugador_v2 v
  where exists (select 1 from public.perfiles p where p.id = v.jugador);

-- 8) Reabrir escrituras con los permisos de la 015 y la 016
grant insert, delete on public.figuras_jugador to authenticated;
grant update (nombre, figura, actualizado, jugador, capsula) on public.figuras_jugador to authenticated;
grant execute on function public.activar_capsula(smallint) to authenticated;

-- Las tablas privado.figuras_jugador_v2, privado.retos_figura_corte_v3 y privado.figuras_jugador_v3_retiradas se quedan
-- (respaldo). Para un corte nuevo después de esta reversión, borrar antes privado.figuras_jugador_v2 y
-- privado.retos_figura_corte_v3 (la 046 las crea).
