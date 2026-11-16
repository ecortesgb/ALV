-- 019: el servidor avisa al instante. Los cambios de estas tablas salen por tiempo real;
-- cada aparato recibe solo las filas que sus políticas RLS le dejan leer.
alter table public.miembros_evento replica identity full;
do $$
declare t text;
begin
  foreach t in array array['partidas', 'datos_privados', 'acciones', 'miembros_evento', 'eventos', 'figuras_jugador'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
