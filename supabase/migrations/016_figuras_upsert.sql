-- 016 · El upsert de la app (supabase-js, onConflict jugador,capsula) actualiza todas las columnas que manda,
-- también jugador y capsula. Sin este permiso falla con «permission denied». Sigue seguro:
-- la política figuras_editar exige jugador = auth.uid() antes y después, y capsula tiene check 1–3.
-- «activa» sigue fuera: solo la cambia activar_capsula().
grant update (jugador, capsula) on public.figuras_jugador to authenticated;
