-- 017: la semilla y el arranque de la partida dejan de ser legibles por los miembros de la sala.
-- Antes: partidas.semilla la leía cualquier miembro y con el motor (público) se calculaba el impostor.
-- Ahora: semilla y configuración viven en arranques_partida, que solo lee quien tiene el control.
-- Las partidas se crean solo con crear_partida_sala (cierra la anterior si quedó abierta).

create table if not exists public.arranques_partida (
  partida uuid primary key references public.partidas(id) on delete cascade,
  semilla integer not null,
  config jsonb not null check (jsonb_typeof(config) = 'object' and pg_column_size(config) <= 8000),
  creado timestamptz not null default now()
);
alter table public.arranques_partida enable row level security;
revoke all on public.arranques_partida from anon, authenticated;
grant select on public.arranques_partida to authenticated;

create policy arranques_leer on public.arranques_partida for select to authenticated
  using (exists (select 1 from public.partidas p where p.id = arranques_partida.partida and privado.es_anfitrion(p.evento)));

create or replace function public.crear_partida_sala(p_evento uuid, p_juego text, p_semilla integer, p_config jsonb)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'sin sesión'; end if;
  if not privado.es_anfitrion(p_evento) then raise exception 'sin permiso'; end if;
  if not exists (select 1 from public.eventos e where e.id = p_evento and not e.cerrado) then raise exception 'sala cerrada'; end if;
  if p_juego is null or p_juego !~ '^[a-z0-9-]{1,40}$' then raise exception 'juego no válido'; end if;
  if p_semilla is null or p_semilla < 1 then raise exception 'semilla no válida'; end if;
  if p_config is null or jsonb_typeof(p_config) <> 'object' or pg_column_size(p_config) > 8000 then raise exception 'configuración no válida'; end if;
  update public.partidas set terminada = now() where evento = p_evento and terminada is null;
  insert into public.partidas (evento, juego, semilla) values (p_evento, p_juego, 0) returning id into v_id;
  insert into public.arranques_partida (partida, semilla, config) values (v_id, p_semilla, p_config);
  return v_id;
end $$;
revoke all on function public.crear_partida_sala(uuid, text, integer, jsonb) from public, anon;
grant execute on function public.crear_partida_sala(uuid, text, integer, jsonb) to authenticated;

-- Los miembros ya no leen la columna semilla ni crean partidas a mano.
revoke select, insert, update on public.partidas from authenticated;
grant select (id, evento, juego, estado_publico, version, creada, terminada) on public.partidas to authenticated;
