-- 046 · Corte definitivo de las figuras a v3 (fase 5; decisión D7 de Codex, encargo 2026-11-26-fase5-r1; ajustes 10 y 11).
-- NO APLICAR sin autorización expresa de Elías (D-002). Escrita y probada en local (PGlite, supabase/pruebas/046_local_pglite.mjs).
-- Reversión: supabase/pendientes/046_figuras_v3_reversion.sql. Prueba remota en transacción deshecha: supabase/pruebas/046_remota_prueba.sql
-- (correrla también requiere autorización). Procedimiento completo: ALV_PLAN_FASE5.md, «Paquete SQL del corte».
--
-- Precondiciones (si falta una, NO se aplica):
--  · La app publicada ya guarda y lee figuras version 3 directamente en figuras_jugador (sin el puente extensiones.alv.v3)
--    y sabe mostrar a quien no tenga figura. Hoy NO es así: la app publicada solo usa v2 (ajuste 11: «no aplicar mientras
--    producción use solo v2»).
--  · Los personajes privados se pueden leer desde la app publicada (045 de alv-privacidad aplicada y conectada).
--  · Respaldo de figuras_jugador exportado FUERA del repo justo antes (procedimiento, paso 1).
--
-- Qué hace (sin convertir las v2: Elías decidió el 2026-11-25 que las figuras guardadas se borran sin migrar):
--  1) Copia figuras_jugador a privado.figuras_jugador_v2 (respaldo dentro de la base, para la reversión).
--  2) Desactiva los retos de figura (son de piezas v2) y anota cuáles estaban activos en privado.retos_figura_corte_v3.
--  3) Borra las filas de figuras_jugador.
--  4) CHECK nuevo: solo version 3 con su estructura (familia, origen, piezas, momentos, extensiones) y ≤ 8 KB. Escrito con
--     coalesce(…, false): un campo ausente da NULL y un CHECK con NULL deja pasar; así se rechaza.
--  5) El guardián de piezas (033) se queda solo para figuras v2: con v3 no hace nada (lectores v2 separados).
-- Tablas, adquisiciones (piezas_jugador), retos_jugador e historial no se tocan: se conservan para la reversión.
-- RLS, permisos y activar_capsula() no cambian.

-- 1) Respaldo dentro de la base
create table privado.figuras_jugador_v2 (
  jugador uuid not null, capsula smallint not null, nombre text not null, figura jsonb not null,
  activa boolean not null, actualizado timestamptz not null, respaldado timestamptz not null default now(),
  primary key (jugador, capsula)
);
alter table privado.figuras_jugador_v2 enable row level security;
revoke all on table privado.figuras_jugador_v2 from public, anon, authenticated;
insert into privado.figuras_jugador_v2 (jugador, capsula, nombre, figura, activa, actualizado)
  select jugador, capsula, nombre, figura, activa, actualizado from public.figuras_jugador;

-- 2) Retos de figura (condiciones sobre piezas v2): fuera, anotando cuáles estaban activos
create table privado.retos_figura_corte_v3 (id text primary key);
alter table privado.retos_figura_corte_v3 enable row level security;
revoke all on table privado.retos_figura_corte_v3 from public, anon, authenticated;
insert into privado.retos_figura_corte_v3 (id) select id from public.retos_figura where activo;
update public.retos_figura set activo = false where activo;

-- 3) Corte: las figuras v2 salen (quedan en el respaldo)
delete from public.figuras_jugador;

-- 4) Solo figuras v3
alter table public.figuras_jugador drop constraint figuras_jugador_figura_check;
alter table public.figuras_jugador add constraint figuras_jugador_figura_v3 check (coalesce(
  jsonb_typeof(figura) = 'object'
  and jsonb_typeof(figura -> 'version') = 'number' and figura ->> 'version' = '3'
  and (figura ->> 'familia') ~ '^[a-z0-9][a-z0-9-]{1,59}$'
  and jsonb_typeof(figura -> 'origen') = 'object'
  and (
    figura #>> '{origen,tipo}' = 'creado'
    or (
      figura #>> '{origen,tipo}' = 'catalogo'
      and (figura #>> '{origen,personaje}') ~ '^[a-z0-9][a-z0-9-]{1,59}$'
      and (figura #>> '{origen,version}') ~ '^[a-z0-9][a-z0-9-]{1,59}$'
      and jsonb_typeof(figura #> '{origen,revision}') = 'number'
      and (figura #>> '{origen,revision}') ~ '^[0-9]{1,9}$'
    )
  )
  and jsonb_typeof(figura -> 'piezas') = 'object'
  and jsonb_typeof(figura -> 'momentos') = 'object'
  and jsonb_typeof(figura -> 'extensiones') = 'object'
  and pg_column_size(figura) <= 8192,
  false));

-- 5) El guardián de piezas (033/037) solo mira figuras v2
create or replace function privado.validar_piezas_figura() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.figura ->> 'version' is distinct from '2' then return new; end if;
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
