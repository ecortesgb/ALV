-- 018: las acciones llevan número del servidor (se aplican en ese orden) y se aceptan las de control.
-- 'control' (pausar, reanudar, saltar, revelar, siguiente, terminar, ruleta, xp-reto, pasar-control)
-- solo la inserta quien tiene el control de la sala. 'pista' es de El impostor.

alter table public.acciones add column if not exists n bigint generated always as identity;
create index if not exists acciones_partida_n on public.acciones (partida, n);

alter table public.acciones drop constraint if exists acciones_tipo_check;
alter table public.acciones add constraint acciones_tipo_check
  check (tipo = any (array['contestar', 'carta', 'mision', 'pista', 'control']));

drop policy if exists acciones_crear on public.acciones;
create policy acciones_crear on public.acciones for insert to authenticated
  with check (
    jugador = (select auth.uid())
    and exists (
      select 1 from public.partidas p
      where p.id = acciones.partida and p.terminada is null and privado.es_miembro(p.evento)
        and (acciones.tipo <> 'control' or privado.es_anfitrion(p.evento))
    )
  );
