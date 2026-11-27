-- NO APLICAR: reemplazada por la 052 (premios por nivel con personajes, Elías 27 nov 2026). Se conserva como historia.
-- 035 · Premios por nivel: subir de nivel regala piezas del personalizador (Maestro 6A.11 C1, decisión de Elías 2026-11-18).
-- ESCRITA, NO APLICADA: requiere autorización expresa de Elías (D-002), prueba en transacción deshecha con usuarios
-- simulados y el asesor de seguridad. Qué pieza da cada nivel es PROPUESTA (src/content/premiosNivel.ts; una prueba
-- compara las dos listas).
-- 1) piezas_figura.nivel: nivel con el que se regala la pieza (null = no es premio de nivel).
-- 2) piezas_jugador.origen admite 'nivel'.
-- 3) reclamar_premios_nivel(): da al jugador las piezas de premio de su nivel o menor que todavía no tiene y las devuelve.
--    El nivel lo calcula el servidor con su XP acumulada; el cliente no puede pedir piezas de más.

alter table public.piezas_figura add column if not exists nivel smallint check (nivel between 2 and 100);

alter table public.piezas_jugador drop constraint if exists piezas_jugador_origen_check;
alter table public.piezas_jugador add constraint piezas_jugador_origen_check check (origen in ('xp', 'reto', 'regalo', 'sobre', 'monedas', 'nivel')); -- 'sobre' y 'monedas' de la 036

-- generado: premios
update public.piezas_figura p set nivel = v.nivel from (values
  ('HAIR_010', 2), ('MOM_velocidad', 3), ('NECK_001', 4), ('HELM_005', 5), ('PRINT_013', 6), ('ACC_002', 7),
  ('HAIR_017', 8), ('MOM_fuego', 10), ('PRINT_003', 12), ('HELM_012', 15), ('PRINT_001', 20)
) as v(id, nivel) where p.id = v.id;
-- fin generado

create function public.reclamar_premios_nivel() returns table (pieza text, nivel smallint)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_nivel int;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  perform pg_advisory_xact_lock(hashtext('xp:' || v_uid::text));
  v_nivel := public.nivel_por_xp((select s.acumulada from privado.saldos_de(v_uid) s));
  return query
    with nuevas as (
      insert into public.piezas_jugador (jugador, pieza, origen)
      select v_uid, f.id, 'nivel' from public.piezas_figura f
      where f.activo and f.nivel is not null and f.nivel <= v_nivel
        and not exists (select 1 from public.piezas_jugador j where j.jugador = v_uid and j.pieza = f.id)
      returning piezas_jugador.pieza
    )
    select n.pieza, f.nivel from nuevas n join public.piezas_figura f on f.id = n.pieza order by f.nivel;
end;
$$;
revoke all on function public.reclamar_premios_nivel() from public, anon;
grant execute on function public.reclamar_premios_nivel() to authenticated;
