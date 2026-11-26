-- Prueba de la 046 (corte de figuras a v3) y de su reversión en la BASE REMOTA, dentro de UNA transacción que termina con
-- ROLLBACK: nada queda guardado (ni la 046, ni la reversión, ni los usuarios simulados). NO CORRER sin autorización
-- expresa de Elías (D-002). Correr el archivo COMPLETO de una vez en el editor SQL; el resultado es la tabla final «_r».
-- Los bloques «046» y «reversión» son copia exacta de supabase/pendientes/ (lo comprueba src/personajes/corteV3sql.test.ts).
begin;

create temp table _r (paso int generated always as identity, texto text);
create temp table _antes as
  select (select count(*) from public.figuras_jugador) as figuras,
         (select count(*) from public.figuras_jugador where activa) as activas,
         (select string_agg(id, ',' order by id) from public.retos_figura where activo) as retos;

-- Usuarios simulados (se deshacen con el ROLLBACK)
create temp table _u as select gen_random_uuid() as a, gen_random_uuid() as b;
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
  select x, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prueba_' || left(x::text, 8) || '@jugadores.alv.invalid', '', now(), now()
  from _u, unnest(array[_u.a, _u.b]) x;
insert into public.perfiles (id, nombre) select x, 'prueba_' || left(x::text, 6) from _u, unnest(array[_u.a, _u.b]) x on conflict (id) do nothing;

-- ===== 046 (copia exacta de supabase/pendientes/046_figuras_v3_NO_APLICAR.sql) =====
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
-- RLS y activar_capsula() no cambian. Permisos: los jugadores ya no pueden BORRAR filas (6): la app del corte nunca borra por
-- espacio vacío, y así un cliente viejo abierto durante el corte no puede borrar figuras nuevas (Codex, v3-directo-r1).
--
-- TODO en UNA transacción (el aplicador de migraciones de Supabase ya la abre; en el editor SQL, envolver en begin; … commit;).
-- Lo primero es bloquear las tablas: ninguna escritura puede colarse entre la copia y el borrado (Codex, paso5-r1).

lock table public.figuras_jugador, public.retos_figura in access exclusive mode;

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
  and jsonb_typeof(figura -> 'familia') = 'string' and (figura ->> 'familia') ~ '^[a-z0-9][a-z0-9-]{1,59}$'
  and jsonb_typeof(figura -> 'origen') = 'object'
  and (
    figura #>> '{origen,tipo}' = 'creado'
    or (
      figura #>> '{origen,tipo}' = 'catalogo'
      and jsonb_typeof(figura #> '{origen,personaje}') = 'string' and (figura #>> '{origen,personaje}') ~ '^[a-z0-9][a-z0-9-]{1,59}$'
      and jsonb_typeof(figura #> '{origen,version}') = 'string' and (figura #>> '{origen,version}') ~ '^[a-z0-9][a-z0-9-]{1,59}$'
      and jsonb_typeof(figura #> '{origen,revision}') = 'number'
      and (figura #>> '{origen,revision}') ~ '^[0-9]{1,9}$'
    )
  )
  and jsonb_typeof(figura -> 'piezas') = 'object'
  and jsonb_typeof(figura -> 'momentos') = 'object'
  and jsonb_typeof(figura -> 'extensiones') = 'object'
  -- Tamaño: 8192 bytes del jsonb guardado (binario). La app limita la figura v3 a 8192 caracteres de JSON compacto
  -- (src/personajes/figura.ts, TOPE_JSON_CARACTERES): con acentos o muchos campos pueden no coincidir cerca del límite; si
  -- la base rechaza, el guardado se queda pendiente en el aparato (src/app/capsulasPendientes.ts). Las figuras reales pesan
  -- menos de 1 KB.
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

-- 6) Sin DELETE directo para los jugadores (la reversión lo devuelve)
revoke delete on public.figuras_jugador from authenticated;
-- ===== fin 046 =====

do $$
declare
  r text := '';
  a uuid := (select _u.a from _u); b uuid := (select _u.b from _u); n int; t text;
  v3 jsonb := '{"version":3,"familia":"minifig","origen":{"tipo":"catalogo","personaje":"iron-man","version":"base","revision":1},"piezas":{},"momentos":{"paquete":null,"espera":"respirar","victoria":"salto-puno","derrota":"cabeza-baja","punto":"puno-arriba"},"extensiones":{}}';
  como text := 'select set_config(''request.jwt.claims'', json_build_object(''sub'', %L, ''role'', ''authenticated'')::text, true)';
begin
  select count(*) into n from public.figuras_jugador; r := r || chr(10) || ('tras 046: filas ' || n);
  select count(*) into n from privado.figuras_jugador_v2; r := r || chr(10) || ('respaldo v2 ' || n || ' (antes ' || (select figuras from _antes) || ')');
  select count(*) into n from public.retos_figura where activo; r := r || chr(10) || ('retos activos ' || n || '; anotados ' || (select count(*) from privado.retos_figura_corte_v3));
  execute format(como, a); execute 'set local role authenticated';
  begin insert into public.figuras_jugador (jugador, capsula, figura) values (a, 1, '{"version":2}'); r := r || chr(10) || ('FALLA: entró una v2');
  exception when others then r := r || chr(10) || ('v2 rechazada: ' || sqlerrm); end;
  insert into public.figuras_jugador (jugador, capsula, nombre, figura) values (a, 1, 'prueba', v3);
  insert into public.figuras_jugador (jugador, capsula, nombre, figura) values (a, 2, 'prueba', jsonb_set(v3, '{origen}', '{"tipo":"creado"}'));
  r := r || chr(10) || ('v3 de catálogo y creada guardadas');
  begin insert into public.figuras_jugador (jugador, capsula, figura) values (a, 3, v3 - 'momentos'); r := r || chr(10) || ('FALLA: entró v3 sin momentos');
  exception when others then r := r || chr(10) || ('v3 sin momentos rechazada: ' || sqlerrm); end;
  begin insert into public.figuras_jugador (jugador, capsula, figura) values (a, 3, jsonb_set(v3, '{extensiones}', jsonb_build_object('x', repeat('x', 9000)))); r := r || chr(10) || ('FALLA: entró v3 de más de 8 KB');
  exception when others then r := r || chr(10) || ('v3 > 8 KB rechazada: ' || sqlerrm); end;
  begin delete from public.figuras_jugador where jugador = a; r := r || chr(10) || ('FALLA: A pudo borrar');
  exception when others then r := r || chr(10) || ('borrar directo rechazado: ' || sqlerrm); end;
  perform public.activar_capsula(2::smallint);
  select capsula into n from public.figuras_jugador where jugador = a and activa; r := r || chr(10) || ('activa tras activar_capsula(2): ' || n);
  begin perform * from public.reclamar_reto((select id from public.retos_figura limit 1), 1::smallint); r := r || chr(10) || ('FALLA: reto reclamado');
  exception when others then r := r || chr(10) || ('reto: ' || sqlerrm); end;
  execute 'reset role'; execute format(como, b); execute 'set local role authenticated';
  begin insert into public.figuras_jugador (jugador, capsula, figura) values (a, 3, v3); r := r || chr(10) || ('FALLA: B escribió por A');
  exception when others then r := r || chr(10) || ('B por A rechazado: ' || sqlerrm); end;
  begin perform 1 from privado.figuras_jugador_v2; r := r || chr(10) || ('FALLA: B lee el respaldo');
  exception when others then r := r || chr(10) || ('respaldo protegido: ' || sqlerrm); end;
  execute 'reset role';
  insert into _r (texto) select unnest(string_to_array(substr(r, 2), chr(10)));
end;
$$;

-- ===== reversión (copia exacta de supabase/pendientes/046_figuras_v3_reversion.sql) =====
-- Reversión de la 046 (corte de figuras a v3). NO CORRER sin autorización expresa de Elías (D-002).
-- Probada en local (PGlite, supabase/pruebas/046_local_pglite.mjs). Antes: avisar que las figuras v3 se retiran (quedan
-- guardadas en privado.figuras_jugador_v3_retiradas) y exportarlas también FUERA del repo.
-- Las cachés locales de los aparatos que tengan v3 no pueden volver a subirlas: el CHECK restaurado solo acepta version 2.

-- TODO en UNA transacción (en el editor SQL: begin; … commit;). App: al revertir se publica el MISMO commit del corte SIN la
-- variable VITE_CORTE_V3 (guarda v2 y trae la protección de reversión: cada cuenta se rehace desde la nube). NUNCA un commit
-- anterior a «v3 directo»: no la trae y subiría figuras retiradas. Ese commit se prueba con el corte apagado y se anota en
-- ALV_PLAN_FASE5.md ANTES de empezar el mantenimiento (Codex, v3-directo-verif).

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
-- ===== fin reversión =====

do $$
declare n int;
begin
  select count(*) into n from public.figuras_jugador; insert into _r (texto) values ('tras reversión: filas ' || n || ' (antes ' || (select figuras from _antes) || ')');
  select count(*) into n from public.figuras_jugador where activa; insert into _r (texto) values ('activas ' || n || ' (antes ' || (select activas from _antes) || ')');
  select count(*) into n from privado.figuras_jugador_v3_retiradas; insert into _r (texto) values ('v3 retiradas ' || n);
  insert into _r (texto) values ('retos activos iguales que antes: ' || ((select string_agg(id, ',' order by id) from public.retos_figura where activo) is not distinct from (select retos from _antes)));
end;
$$;

select paso, texto from _r order by paso;
rollback;
