-- 014 · Más gestos en el lobby en línea: festejar, aplaudir, robot, caminar y mirar.
alter table public.miembros_evento drop constraint if exists miembros_evento_gesto_check;
alter table public.miembros_evento add constraint miembros_evento_gesto_check
  check (gesto in ('saludar', 'bailar', 'chocar', 'empujar', 'festejar', 'aplaudir', 'robot', 'caminar', 'mirar'));

create or replace function public.marcar_en_sala(p_evento uuid, p_listo boolean default null, p_gesto text default null, p_a uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := auth.uid();
begin
  if v_yo is null then raise exception 'sin sesión'; end if;
  if not exists (
    select 1 from public.miembros_evento m join public.eventos e on e.id = m.evento
    where m.evento = p_evento and m.jugador = v_yo and not e.cerrado
  ) then raise exception 'no estás en esta sala'; end if;

  if p_gesto is not null then
    if p_gesto not in ('saludar', 'bailar', 'chocar', 'empujar', 'festejar', 'aplaudir', 'robot', 'caminar', 'mirar') then raise exception 'gesto no válido'; end if;
    if p_gesto in ('chocar', 'empujar') then
      if p_a is null or p_a = v_yo or not exists (select 1 from public.miembros_evento where evento = p_evento and jugador = p_a)
        then raise exception 'ese jugador no está en la sala'; end if;
    else
      p_a := null;
    end if;
    update public.miembros_evento set gesto = p_gesto, gesto_a = p_a, gesto_n = gesto_n + 1
    where evento = p_evento and jugador = v_yo;
  end if;

  if p_listo is not null then
    update public.miembros_evento set listo = p_listo where evento = p_evento and jugador = v_yo;
  end if;
end;
$$;
