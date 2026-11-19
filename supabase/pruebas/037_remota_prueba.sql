-- Prueba de la 037 en la base remota. La 037 va DENTRO de este bloque, que termina SIEMPRE con una excepción:
-- nada queda guardado (ni la 037, ni los usuarios simulados, ni sus figuras, monedas o comodines).
-- Autorizada por Elías el 2026-11-19 («Sí, pruébala»).
-- Resultado 2026-11-19: antes «pieza bloqueada»; después 70 piezas y 0 activas, solo «comodines» a la venta, guarda PRINT_004
-- y PRINT_021, las 3 figuras reales pasan el guardián, desbloquear «pieza no válida», básico y épico «sobre no válido»,
-- monedas 150 → 150, comodines 3 cartas (quedan 0), A lee 0 activas de 70, anon «permission denied». Después la base quedó
-- igual (70 activas, 5 sobres activos, 1 usuario, 3 figuras, 0 movimientos) y el asesor sin cambios.
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); u uuid; r text := ''; n int; j jsonb; m int; m2 int; yo text := current_user;
  fig jsonb := '{"version":2,"identidad":{"rostro":"FACE_001","detalles":[]},"ropa":{"torso":{"estampado":"PRINT_004"}},"accesorios":{},"momentos":{}}';
begin
  foreach u in array array[a, b] loop
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
      values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prueba_' || left(u::text, 8) || '@jugadores.alv.invalid', '', now(), now());
  end loop;
  insert into public.perfiles (id, nombre) select x, 'prueba_' || left(x::text, 6) from unnest(array[a, b]) x on conflict (id) do nothing;
  update public.perfiles set mayor_18 = true where id in (a, b);

  -- Antes de la 037: el guardián bloquea la pieza legendaria
  begin insert into public.figuras_jugador (jugador, capsula, nombre, figura) values (b, 1, 'prueba', fig); r := r || 'FALLA: antes guardó bloqueada';
  exception when others then r := r || 'antes: ' || sqlerrm; end;

  -- ===== 037 (mismo texto que supabase/migrations/037_piezas_libres.sql) =====
  update public.piezas_figura set activo = false where activo;
  update public.sobres_tienda set activo = false where piezas > 0 and activo;
  -- ==========================================================================

  select count(*) into n from public.piezas_figura; r := r || ' | piezas ' || n;
  select count(*) into n from public.piezas_figura where activo; r := r || ', activas ' || n;
  r := r || ' | sobres activos: ' || (select string_agg(id, ',' order by id) from public.sobres_tienda where activo);

  -- Después: se guarda la pieza legendaria (insertar y actualizar)
  insert into public.figuras_jugador (jugador, capsula, nombre, figura) values (b, 1, 'prueba', fig);
  update public.figuras_jugador set figura = jsonb_set(fig, '{ropa,torso,estampado}', '"PRINT_021"') where jugador = b and capsula = 1;
  r := r || ' | después: guarda PRINT_004 y PRINT_021';
  -- Las figuras reales siguen pasando el guardián (se reescriben iguales, dentro de la transacción deshecha)
  update public.figuras_jugador set figura = figura where jugador not in (a, b);
  get diagnostics n = row_count; r := r || ' | figuras reales revalidadas ' || n;

  -- A como jugador: bienvenida, sin cobro por piezas ni sobres de piezas, comodines sí
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select e.monedas into m from public.estado_tienda() e; r := r || ' | A monedas ' || m;
  begin perform public.desbloquear_pieza('PRINT_004'); r := r || ' | FALLA desbloqueó';
  exception when others then r := r || ' | desbloquear: ' || sqlerrm; end;
  begin perform public.abrir_sobre('basico', gen_random_uuid()); r := r || ' | FALLA abrió básico';
  exception when others then r := r || ' | básico: ' || sqlerrm; end;
  begin perform public.abrir_sobre('epico', gen_random_uuid()); r := r || ' | FALLA abrió épico';
  exception when others then r := r || ' | épico: ' || sqlerrm; end;
  select e.monedas into m2 from public.estado_tienda() e; r := r || ' | monedas tras intentos ' || m2;
  j := public.abrir_sobre('comodines', gen_random_uuid());
  r := r || ' | comodines: ' || jsonb_array_length(j -> 'cartas') || ' cartas, quedan ' || (j ->> 'monedas');
  select count(*) into n from public.piezas_figura where activo; r := r || ' | A lee activas ' || n;
  select count(*) into n from public.piezas_figura; r := r || ' de ' || n;
  begin insert into public.figuras_jugador (jugador, capsula, nombre, figura) values (a, 1, 'mia', fig); r := r || ' | A guarda su figura con PRINT_004';
  exception when others then r := r || ' | A guarda: ' || sqlerrm; end;

  -- Anónimo
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'anon', true);
  begin select count(*) into n from public.piezas_figura; r := r || ' | FALLA anon lee piezas';
  exception when others then r := r || ' | anon piezas: ' || sqlerrm; end;

  perform set_config('role', yo, true);
  raise exception 'RESULTADO (se deshace): %', r;
end $$;
